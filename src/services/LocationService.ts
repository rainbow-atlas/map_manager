import { Location, LocationFormData } from '../types/Location';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const LOCATIONS_RANGE = 'Sheet1!A1:O1000';
const CATEGORIES_RANGE = 'Categories!A2:A1000';

// Add environment variable validation
if (!SHEET_ID) {
    console.error('Missing Sheet ID. Please check your .env file.');
}

export class LocationService {
    private static locations: Location[] = [];
    private static categories: string[] = [];

    private static getHeaders(): HeadersInit {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    static async initialize() {
        console.log('Initializing LocationService...');
        console.log('Sheet ID:', SHEET_ID);
        
        // Validate sheet ID format
        if (!SHEET_ID.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error('Invalid Sheet ID format. Please check your .env file.');
        }

        await Promise.all([
            this.fetchFromGoogleSheets(),
            this.fetchCategories()
        ]);
    }

    private static async fetchCategories() {
        try {
            console.log('Fetching categories from Google Sheets...');
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!L1:L1000?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
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
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${LOCATIONS_RANGE}?key=${API_KEY}`;
            console.log('Request URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
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
                    errorMessage += 'Please check that the Google Sheet is shared with "Anyone with the link can view"';
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

            const columnHeaders = data.values[0] as string[];
            console.log('Headers:', columnHeaders);

            const requiredColumns = ['ID', 'Name', 'Latitude', 'Longitude'];
            for (const column of requiredColumns) {
                if (!columnHeaders.includes(column)) {
                    throw new Error(`Required column "${column}" not found in sheet headers.`);
                }
            }

            this.locations = data.values.slice(1).map((row: any[], index: number) => {
                const location: any = {};
                columnHeaders.forEach((header: string, i: number) => {
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
                location.ID = (row[columnHeaders.indexOf('ID')] || (index + 1)).toString();
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
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:O1:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
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
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A${rowIndex}:O${rowIndex}?valueInputOption=USER_ENTERED&key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
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
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A${rowIndex}:O${rowIndex}/clear?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders()
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