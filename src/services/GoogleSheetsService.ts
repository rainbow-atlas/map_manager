export class GoogleSheetsService {
    private static instance: GoogleSheetsService;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    private constructor() {
        // Constructor is empty as we'll initialize auth when needed
        console.log('GoogleSheetsService: Initializing service');
    }

    public static getInstance(): GoogleSheetsService {
        if (!GoogleSheetsService.instance) {
            GoogleSheetsService.instance = new GoogleSheetsService();
        }
        return GoogleSheetsService.instance;
    }

    private async importPrivateKey(pem: string): Promise<CryptoKey> {
        // Remove header, footer, and any whitespace/newlines
        const pemContents = pem
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, '');

        // Convert base64 to ArrayBuffer
        const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

        return await crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256',
            },
            false,
            ['sign']
        );
    }

    private async signJwt(header: any, claim: any, privateKey: CryptoKey): Promise<string> {
        const encoder = new TextEncoder();
        const headerStr = JSON.stringify(header);
        const claimStr = JSON.stringify(claim);
        
        const headerB64 = btoa(headerStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const claimB64 = btoa(claimStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const dataToSign = encoder.encode(`${headerB64}.${claimB64}`);
        const signature = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            privateKey,
            dataToSign
        );

        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        return `${headerB64}.${claimB64}.${signatureB64}`;
    }

    private async getAccessToken(): Promise<string> {
        const now = Date.now();
        
        // If we have a valid token that's not expired (with 5 minute buffer), return it
        if (this.accessToken && this.tokenExpiry > now + 300000) {
            console.log('GoogleSheetsService: Using cached access token');
            return this.accessToken;
        }

        try {
            console.log('GoogleSheetsService: Getting new access token');
            const clientEmail = import.meta.env.VITE_GOOGLE_CLIENT_EMAIL;
            const privateKey = import.meta.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            const keyId = import.meta.env.VITE_GOOGLE_PRIVATE_KEY_ID;

            if (!clientEmail || !privateKey || !keyId) {
                console.error('GoogleSheetsService: Missing environment variables', {
                    hasClientEmail: !!clientEmail,
                    hasPrivateKey: !!privateKey,
                    hasKeyId: !!keyId
                });
                throw new Error('Missing required environment variables for Google Sheets authentication');
            }

            // Create a JWT claim
            const nowSeconds = Math.floor(now / 1000);
            const claim = {
                iss: clientEmail,
                scope: 'https://www.googleapis.com/auth/spreadsheets',
                aud: 'https://oauth2.googleapis.com/token',
                exp: nowSeconds + 3600,
                iat: nowSeconds,
            };

            // Create JWT header
            const header = {
                alg: 'RS256',
                typ: 'JWT',
                kid: keyId
            };

            // Import the private key and create a properly signed JWT
            const cryptoKey = await this.importPrivateKey(privateKey);
            const jwt = await this.signJwt(header, claim, cryptoKey);
            
            console.log('GoogleSheetsService: Requesting access token from Google');
            // Make the token request
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion': jwt,
                }),
            });

            const responseText = await response.text();
            if (!response.ok) {
                console.error('GoogleSheetsService: Token response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: responseText
                });
                throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${responseText}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('GoogleSheetsService: Failed to parse token response', responseText);
                throw new Error('Invalid JSON response from token endpoint');
            }

            console.log('GoogleSheetsService: Successfully received token response');
            
            const accessToken = data.access_token;
            if (!accessToken || typeof accessToken !== 'string') {
                console.error('GoogleSheetsService: Invalid token response', data);
                throw new Error('Invalid access token received');
            }

            this.accessToken = accessToken;
            this.tokenExpiry = now + (data.expires_in || 3600) * 1000;
            
            return this.accessToken;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('GoogleSheetsService: Authentication error:', error);
            throw new Error(`Failed to authenticate with Google Sheets: ${errorMessage}`);
        }
    }

    public async readSheet(spreadsheetId: string, range: string) {
        try {
            console.log('GoogleSheetsService: Reading sheet', { spreadsheetId, range });
            const token = await this.getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }
            );

            const responseText = await response.text();
            if (!response.ok) {
                console.error('GoogleSheetsService: Sheet read error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: responseText,
                    spreadsheetId,
                    range
                });
                throw new Error(`Failed to read from sheet: ${response.status} ${response.statusText} - ${responseText}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('GoogleSheetsService: Failed to parse sheet response', responseText);
                throw new Error('Invalid JSON response from sheets API');
            }

            console.log('GoogleSheetsService: Successfully read sheet data');
            return data.values;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('GoogleSheetsService: Sheet read error:', error);
            throw new Error(`Failed to read from Google Sheet: ${errorMessage}`);
        }
    }

    public async appendToSheet(spreadsheetId: string, range: string, values: any[][]) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ values }),
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheet append error:', errorText);
                throw new Error('Failed to append to sheet');
            }
            return await response.json();
        } catch (error) {
            console.error('Error appending to sheet:', error);
            throw new Error('Failed to append to Google Sheet');
        }
    }

    public async updateSheet(spreadsheetId: string, range: string, values: any[][]) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ values }),
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheet update error:', errorText);
                throw new Error('Failed to update sheet');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating sheet:', error);
            throw new Error('Failed to update Google Sheet');
        }
    }

    public async clearRange(spreadsheetId: string, range: string) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}/clear`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheet clear error:', errorText);
                throw new Error('Failed to clear range');
            }
            return await response.json();
        } catch (error) {
            console.error('Error clearing range:', error);
            throw new Error('Failed to clear range in Google Sheet');
        }
    }

    public async batchUpdate(spreadsheetId: string, ranges: string[], values: any[][][]) {
        try {
            const token = await this.getAccessToken();
            const data = ranges.map((range, index) => ({
                range,
                values: values[index],
            }));

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        valueInputOption: 'USER_ENTERED',
                        data,
                    }),
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheet batch update error:', errorText);
                throw new Error('Failed to perform batch update');
            }
            return await response.json();
        } catch (error) {
            console.error('Error performing batch update:', error);
            throw new Error('Failed to perform batch update in Google Sheet');
        }
    }
} 