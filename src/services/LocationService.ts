import { Location, LocationFormData } from '../types/Location';
import { google } from 'googleapis';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const LOCATIONS_RANGE = 'Sheet1!A1:O1000';
const CATEGORIES_RANGE = 'Categories!A2:A1000';

// Service account credentials
const SERVICE_ACCOUNT = {
    "type": "service_account",
    "project_id": "rainbowatlas",
    "private_key_id": "afe7d44f3b457623f3d4c71d963cb19ea64dce1e",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCt3iEtd2oOO0Jq\njfBSiOjgFIXefMsSQDKUUnkVqCQPy3e5zlrZCSlgR5sXGUga3YUAb2Av9AX3EjNn\nuiWWfO59xQTs4FjNY8+t62MZcBOtM1/KEvCrpTvFJO/DXNHuNaDl1mQRN2Ml79Gp\nmn/7bbc1fzYoPb58k8m4bTBUcq+TR/oVA5sZOA1R/OO5pOTgmilXIiHpQoDxq9FQ\nEJjL6GeAMY+yqhpqC2XnwsbkDhjclSBfCTocVBr3/NL1uXJ8o/+zQiZ1hensghea\nRJu75+bW1kewSYXQN2Sf3ZbtT0iMxY+nESKc8YdxX6spKQa8exr9095Uzdgrhoqy\n55Krc7f5AgMBAAECggEABgVMOKbrByv3Uw7FYhTycXisdmWeYkGoWWQDZDlYFFbw\nogBwEMDFNsZhVmWuTkXaT5yhDqVgg9YqGF8FDbFs+xx0h5+w24iSXhH/CBgONQrI\nzUvQxd+D0sIXw7gGCf2/662RS1pTu9zShxETT6Qp5QzvFb97m5SXi+QguWU7ng81\no++9l2JerTw8uWSVrkRVzmyLTRAMbnELw5qWi9nINkyBkwCP1ZidshufERP1ga2J\n+vX3P8opdsp1+BxiEDEb+O2AfOek7xuLNW4iZgAg5L2/+rvj2cGsfC7igI5shVNP\ntyJ7x/ToAXYTHqXJCy+rWvcUKNZpGs6ubjYSNA9Q4QKBgQDZunvEUwF/ESVA6kV7\n1VS3baf60ognfhusBJ+Xv2rvx+Q37XyCh8/OgQ9f6ScR5RdjhK5sTj83ARVcJCwg\nOOZ1bRdTV1GakVX8FRGjiKjvooaobYzKyJh5TDRYg44sQUX0/8eo/FB/WLNgla7E\n+SDkPuCBE9msGAmyTEoyjhNj6QKBgQDMbfcWzgng16cRopBeVb+fYWoXHWtNbfG3\njooAY2WhcspAFvvFYeeYLzGJD+ZjSoKPoLooAp7vMZ4thBAPirP68VApu+ieHx2r\no+F6dITeiKAe5o2gD/mWL2GJJxEu+TecjvSK/yW2aa0eapPx/q6nEKWvNytlenSE\nmW7TOed5kQKBgEkOP5UiXPAr6pobgXEJpcFec+y/U5wcvmA7tOkP+2u1YKg7cXnC\n5EFgIK6H5uokOnLUBEqm/qMQJACkyoGNVha0ogz+0YzRk05gK2j54+V0XUaKa6Fn\nKXIZ1b6VddD3neeVI4NaFhCEzLttvhStmxG6302wQWtzLV28J3FLJspxAoGAUjfv\n5pYbVvik0uzkz2wBU6KkPoOwgkWzr7V+P0W6vEIkob4cqHgF4ykn7Q4eBNUUyZtF\nA456SY1VJs00gGuykzy2lvJiTiYJktyodM2kGrQsYgEr+LI0GXkY60ZxHMlS2n6M\nT9LqYgEChXcr5Woe6EZDvMKdi4TClAn5jq59MGECgYBKAoC1l9FhXU0nm2pDxpUu\nkSXE/Z5CA0KpY/rlIbfm8b2sMRFAm1D9dgKfcYbMdSjmeA5a3ZdxoztM4uBg13XN\nWz8tCS0/SSc4gvoYoaNhLwpv0zFxGFRuyZ+cDU4PNRqvd6XqauY/dodhDRxl7rJD\nyFmGrSlSFVBzAwtUzbB9IQ==\n-----END PRIVATE KEY-----\n",
    "client_email": "rainbowapi@rainbowatlas.iam.gserviceaccount.com",
    "client_id": "113505988498880689780",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/rainbowapi%40rainbowatlas.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

// Add environment variable validation
if (!SHEET_ID) {
    console.error('Missing Sheet ID. Please check your .env file.');
}

export class LocationService {
    private static locations: Location[] = [];
    private static categories: string[] = [];
    private static auth: any = null;
    private static accessToken: string | null = null;
    private static tokenExpiryTime: number = 0;

    private static async getHeaders(): Promise<HeadersInit> {
        const token = await this.getAccessToken();
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    private static async getAccessToken(): Promise<string> {
        // Check if we have a valid token
        if (this.accessToken && Date.now() < this.tokenExpiryTime - 60000) { // Refresh 1 minute before expiry
            return this.accessToken;
        }

        try {
            // Initialize auth if not already done
            if (!this.auth) {
                this.auth = new google.auth.GoogleAuth({
                    credentials: SERVICE_ACCOUNT,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                });
            }

            const client = await this.auth.getClient();
            const token = await client.getAccessToken();
            
            // Store the token and set expiry time (1 hour from now)
            this.accessToken = token.token;
            this.tokenExpiryTime = Date.now() + 3600000; // 1 hour in milliseconds
            
            return this.accessToken;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh access token');
        }
    }

    static async initialize() {
        console.log('Initializing LocationService...');
        console.log('Sheet ID:', SHEET_ID);
        
        // Validate sheet ID format
        if (!SHEET_ID.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error('Invalid Sheet ID format. Please check your .env file.');
        }

        // Initialize the auth client
        this.auth = new google.auth.GoogleAuth({
            credentials: SERVICE_ACCOUNT,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        await Promise.all([
            this.fetchFromGoogleSheets(),
            this.fetchCategories()
        ]);
    }

    private static async fetchCategories() {
        try {
            console.log('Fetching categories from Google Sheets...');
            const headers = await this.getHeaders();
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!L1:L1000`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Categories response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.values) {
                this.categories = [...new Set(data.values.slice(1).flat())]
                    .filter((category): category is string => 
                        category !== null && 
                        typeof category === 'string' && 
                        category.trim() !== ''
                    )
                    .sort();
                console.log('Fetched categories:', this.categories);
            }

            if (!this.categories || this.categories.length === 0) {
                console.log('No categories found, using defaults');
                this.categories = ['Restaurant', 'Bar', 'Cafe', 'Shop', 'Community Center'];
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            this.categories = ['Restaurant', 'Bar', 'Cafe', 'Shop', 'Community Center'];
        }
    }

    private static async fetchFromGoogleSheets() {
        try {
            console.log('Fetching data from Google Sheets...');
            const headers = await this.getHeaders();
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${LOCATIONS_RANGE}`;
            console.log('Request URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                let errorMessage = 'Failed to fetch data from Google Sheets. ';
                if (response.status === 403) {
                    errorMessage += 'Please check that the Google Sheet is shared with the service account email.';
                } else if (response.status === 404) {
                    errorMessage += 'Sheet not found. Please check the Sheet ID.';
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Received data:', data);
            
            if (!data.values) {
                throw new Error('No data received from Google Sheets. Please check that the sheet is not empty.');
            }

            if (data.values.length <= 1) {
                throw new Error('Sheet appears to be empty (only headers found).');
            }

            const headers = data.values[0];
            console.log('Headers:', headers);

            const requiredColumns = ['ID', 'Name', 'Latitude', 'Longitude'];
            for (const column of requiredColumns) {
                if (!headers.includes(column)) {
                    throw new Error(`Required column "${column}" not found in sheet headers.`);
                }
            }

            this.locations = data.values.slice(1).map((row: any[], index: number) => {
                const location: any = {};
                headers.forEach((header: string, i: number) => {
                    let value = row[i] || '';
                    if (header === 'Latitude' || header === 'Longitude') {
                        value = value === '' ? 0 : parseFloat(value);
                        if (isNaN(value)) {
                            console.warn(`Invalid ${header} value in row ${index + 2}: "${row[i]}"`);
                            value = 0;
                        }
                    }
                    location[header] = value;
                });
                location.ID = (row[headers.indexOf('ID')] || (index + 1)).toString();
                return location as Location;
            });

            console.log('Processed locations:', this.locations);
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw error;
        }
    }

    static getAllLocations(): Location[] {
        return this.locations;
    }

    static getLocation(id: string): Location | undefined {
        return this.locations.find(loc => loc.ID === id);
    }

    static getCategories(): string[] {
        return this.categories;
    }

    static async addCategory(category: string): Promise<void> {
        console.log('Adding category:', category);
        if (!this.categories.includes(category)) {
            this.categories.push(category);
            this.categories.sort();
        }
    }

    private static async appendRow(values: any[]): Promise<void> {
        const headers = await this.getHeaders();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:O1:append?valueInputOption=USER_ENTERED`;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                values: [values]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to append row:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to save data to Google Sheets: ${response.status} ${response.statusText}`);
        }
    }

    private static async updateRow(rowIndex: number, values: any[]): Promise<void> {
        const headers = await this.getHeaders();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A${rowIndex}:O${rowIndex}?valueInputOption=USER_ENTERED`;

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                values: [values]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to update row:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to update data in Google Sheets: ${response.status} ${response.statusText}`);
        }
    }

    private static async clearRow(rowIndex: number): Promise<void> {
        const headers = await this.getHeaders();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A${rowIndex}:O${rowIndex}/clear`;

        const response = await fetch(url, {
            method: 'POST',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to clear row:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to delete data from Google Sheets: ${response.status} ${response.statusText}`);
        }
    }

    private static locationToRow(location: Location): any[] {
        return [
            location.ID,
            location.Name,
            location.Latitude,
            location.Longitude,
            location.Description,
            location.Website,
            location.Tags,
            location.Image,
            location.Address,
            location.Phone,
            location.Email,
            location.Category,
            location['Contact Person'],
            location['Last Checked'],
            location['Additional Info']
        ];
    }

    static async addLocation(location: LocationFormData): Promise<Location> {
        console.log('Adding location:', location);
        const newLocation: Location = {
            ...location,
            ID: (Math.max(...this.locations.map(l => parseInt(l.ID)), 0) + 1).toString()
        };

        try {
            await this.appendRow(this.locationToRow(newLocation));
            this.locations.push(newLocation);

            if (location.Category && !this.categories.includes(location.Category)) {
                await this.addCategory(location.Category);
            }

            return newLocation;
        } catch (error) {
            console.error('Error adding location:', error);
            throw new Error('Failed to add location to Google Sheets');
        }
    }

    static async updateLocation(id: string, location: LocationFormData): Promise<Location> {
        console.log('Updating location:', id, location);
        const index = this.locations.findIndex(loc => loc.ID === id);
        if (index === -1) throw new Error('Location not found');
        
        const updatedLocation: Location = { ...location, ID: id };

        try {
            const rowIndex = index + 2;
            await this.updateRow(rowIndex, this.locationToRow(updatedLocation));
            this.locations[index] = updatedLocation;

            if (location.Category && !this.categories.includes(location.Category)) {
                await this.addCategory(location.Category);
            }

            return updatedLocation;
        } catch (error) {
            console.error('Error updating location:', error);
            throw new Error('Failed to update location in Google Sheets');
        }
    }

    static async deleteLocation(id: string): Promise<void> {
        console.log('Deleting location:', id);
        const index = this.locations.findIndex(loc => loc.ID === id);
        if (index === -1) throw new Error('Location not found');

        try {
            const rowIndex = index + 2;
            await this.clearRow(rowIndex);
            this.locations = this.locations.filter(loc => loc.ID !== id);
        } catch (error) {
            console.error('Error deleting location:', error);
            throw new Error('Failed to delete location from Google Sheets');
        }
    }

    static async refreshData(): Promise<void> {
        await Promise.all([
            this.fetchFromGoogleSheets(),
            this.fetchCategories()
        ]);
    }
} 