import { Location, LocationFormData } from '../types/Location';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const RANGE = 'A1:O1000'; // Adjust based on your data range

// Add environment variable validation
if (!SHEET_ID || !API_KEY) {
    console.error('Missing required environment variables. Please check your .env file.');
}

export class LocationService {
    private static locations: Location[] = [];

    static async initialize() {
        await this.fetchFromGoogleSheets();
    }

    private static async fetchFromGoogleSheets() {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`
            );
            const data = await response.json();
            
            if (data.values && data.values.length > 1) {
                const headers = data.values[0];
                this.locations = data.values.slice(1).map((row: any[], index: number) => {
                    const location: any = { ID: (index + 1).toString() };
                    headers.forEach((header: string, i: number) => {
                        location[header] = row[i] || '';
                    });
                    return location as Location;
                });
            }
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            this.locations = [];
        }
    }

    static getAllLocations(): Location[] {
        return this.locations;
    }

    static getLocation(id: string): Location | undefined {
        return this.locations.find(loc => loc.ID === id);
    }

    static async addLocation(location: LocationFormData): Promise<Location> {
        // TODO: Implement Google Sheets API append row
        const newLocation: Location = {
            ...location,
            ID: (Math.max(...this.locations.map(l => parseInt(l.ID)), 0) + 1).toString()
        };
        this.locations.push(newLocation);
        return newLocation;
    }

    static async updateLocation(id: string, location: LocationFormData): Promise<Location> {
        // TODO: Implement Google Sheets API update row
        const index = this.locations.findIndex(loc => loc.ID === id);
        if (index === -1) throw new Error('Location not found');
        
        const updatedLocation: Location = { ...location, ID: id };
        this.locations[index] = updatedLocation;
        return updatedLocation;
    }

    static async deleteLocation(id: string): Promise<void> {
        // TODO: Implement Google Sheets API delete row
        this.locations = this.locations.filter(loc => loc.ID !== id);
    }

    // Remove CSV-specific methods
    static async refreshData(): Promise<void> {
        await this.fetchFromGoogleSheets();
    }
} 