import { Location, LocationFormData } from '../types/Location';
import { GoogleSheetsService } from './GoogleSheetsService';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const LOCATIONS_RANGE = 'Sheet1!A1:O1000';
const CATEGORIES_RANGE = 'Categories!A2:A1000';
const CATEGORIES_LIST_RANGE = 'Categories!A2:A';  // Active categories - using open-ended range
const TAGS_LIST_RANGE = 'Tags!A2:A';  // Active tags - using open-ended range
const CATEGORY_LOG_RANGE = 'Logs!A2:E1000';     // Log of changes (Source, Action, Old Category, New Category, Timestamp)

// Add environment variable validation
if (!SHEET_ID) {
    console.error('Missing Sheet ID. Please check your .env file.');
}

export class LocationService {
    private static locations: Location[] = [];
    private static categories: string[] = [];
    private static tags: string[] = [];
    private static sheetsService = GoogleSheetsService.getInstance();

    static async initialize() {
        console.log('Initializing LocationService...');
        console.log('Sheet ID:', SHEET_ID);
        
        // Validate sheet ID format
        if (!SHEET_ID.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error('Invalid Sheet ID format. Please check your .env file.');
        }

        try {
            // Load categories and tags first to ensure they're available immediately
            await Promise.all([
                this.fetchCategories(),
                this.fetchTags()
            ]);
            // Then load locations
            await this.fetchFromGoogleSheets();
            
            console.log('LocationService initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }

    private static async logChange(source: 'category' | 'tag', action: 'ADD' | 'DELETE' | 'RENAME', oldValue: string, newValue?: string) {
        const timestamp = new Date().toISOString();
        const values = [
            [source, action, oldValue, newValue || '', timestamp]  // Source, Action, Old Value, New Value, Timestamp
        ];
        
        try {
            // Columns: A=Source, B=Action, C=Old Value, D=New Value, E=Timestamp
            await this.sheetsService.appendToSheet(SHEET_ID, 'Logs!A:E', values);
        } catch (error) {
            console.error('Failed to log change:', error);
            // Don't throw here - we don't want to break the main operation if logging fails
        }
    }

    private static async fetchCategories() {
        try {
            console.log('Fetching categories from Google Sheets...');
            const values = await this.sheetsService.readSheet(SHEET_ID, CATEGORIES_LIST_RANGE);
            
            if (values) {
                this.categories = values
                    .flat()
                    .filter((category: unknown): category is string => 
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
                // Add default categories to sheet
                await this.sheetsService.updateSheet(SHEET_ID, CATEGORIES_LIST_RANGE, 
                    this.categories.map(cat => [cat])
                );
                // Log the addition of default categories
                for (const category of this.categories) {
                    await this.logChange('category', 'ADD', category);
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            this.categories = ['Restaurant', 'Bar', 'Cafe', 'Shop', 'Community Center'];
        }
    }

    private static async fetchTags() {
        try {
            console.log('Fetching tags from Google Sheets...');
            const values = await this.sheetsService.readSheet(SHEET_ID, TAGS_LIST_RANGE);
            
            if (values) {
                this.tags = values
                    .flat()
                    .filter((tag: unknown): tag is string => 
                        tag !== null && 
                        typeof tag === 'string' && 
                        tag.trim() !== ''
                    )
                    .sort();
                console.log('Fetched tags:', this.tags);
            }

            if (!this.tags || this.tags.length === 0) {
                console.log('No tags found, using defaults');
                this.tags = ['Historic', 'Family-Friendly', 'Accessible', 'Pet-Friendly', 'Parking'];
                // Add default tags to sheet
                await this.sheetsService.updateSheet(SHEET_ID, TAGS_LIST_RANGE, 
                    this.tags.map(tag => [tag])
                );
                // Log the addition of default tags
                for (const tag of this.tags) {
                    await this.logChange('tag', 'ADD', tag);
                }
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            this.tags = ['Historic', 'Family-Friendly', 'Accessible', 'Pet-Friendly', 'Parking'];
        }
    }

    private static async fetchFromGoogleSheets() {
        try {
            console.log('Fetching data from Google Sheets...');
            const values = await this.sheetsService.readSheet(SHEET_ID, LOCATIONS_RANGE);
            
            if (!values) {
                throw new Error('No data received from Google Sheets. Please check that the sheet is not empty.');
            }

            if (values.length <= 1) {
                throw new Error('Sheet appears to be empty (only headers found).');
            }

            const columnHeaders = values[0] as string[];
            console.log('Headers:', columnHeaders);

            const requiredColumns = ['ID', 'Name', 'Latitude', 'Longitude'];
            for (const column of requiredColumns) {
                if (!columnHeaders.includes(column)) {
                    throw new Error(`Required column "${column}" not found in sheet headers.`);
                }
            }

            this.locations = values.slice(1).map((row: any[], index: number) => {
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

    static getTags(): string[] {
        return this.tags;
    }

    static async addCategory(category: string): Promise<void> {
        console.log('Adding category:', category);
        if (!this.categories.includes(category)) {
            this.categories.push(category);
            this.categories.sort();
            
            try {
                // Add to categories list - use updateSheet to overwrite the entire list
                await this.sheetsService.updateSheet(SHEET_ID, CATEGORIES_LIST_RANGE, 
                    this.categories.map(cat => [cat])
                );
                // Log the addition
                await this.logChange('category', 'ADD', category);
            } catch (error) {
                console.error('Error adding category:', error);
                throw new Error('Failed to add category');
            }
        }
    }

    static async renameCategory(oldCategory: string, newCategory: string): Promise<void> {
        console.log('Renaming category:', oldCategory, 'to', newCategory);
        
        try {
            // Update all locations with the old category
            const locationsToUpdate = this.locations.filter(loc => loc.Category === oldCategory);
            
            // Update each location with the new category
            for (const location of locationsToUpdate) {
                const updatedLocation = { ...location, Category: newCategory };
                const rowIndex = this.locations.findIndex(loc => loc.ID === location.ID) + 2;
                await this.updateRow(rowIndex, this.locationToRow(updatedLocation));
                
                // Update the location in memory
                const index = this.locations.findIndex(loc => loc.ID === location.ID);
                if (index !== -1) {
                    this.locations[index] = updatedLocation;
                }
            }
            
            // Update categories list
            const categoryIndex = this.categories.indexOf(oldCategory);
            if (categoryIndex !== -1) {
                // Remove old category and add new one
                this.categories.splice(categoryIndex, 1);
                if (!this.categories.includes(newCategory)) {
                    this.categories.push(newCategory);
                    this.categories.sort();
                }
                
                // Update the categories in the sheet
                await this.sheetsService.updateSheet(SHEET_ID, CATEGORIES_LIST_RANGE, 
                    this.categories.map(cat => [cat])
                );
                
                // Log the rename
                await this.logChange('category', 'RENAME', oldCategory, newCategory);
            }
        } catch (error) {
            console.error('Error renaming category:', error);
            throw new Error('Failed to rename category');
        }
    }

    static async deleteCategory(category: string): Promise<void> {
        console.log('Deleting category:', category);
        
        try {
            // Instead of deleting, rename to empty string which we know works
            await this.renameCategory(category, '');
            
            // Remove from memory
            const categoryIndex = this.categories.indexOf(category);
            if (categoryIndex !== -1) {
                this.categories.splice(categoryIndex, 1);
                
                // Override the RENAME log with a DELETE log
                await this.logChange('category', 'DELETE', category);
                
                // Refresh data to ensure UI is updated
                await this.refreshData();
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            throw new Error('Failed to delete category');
        }
    }

    static async addTag(tag: string): Promise<void> {
        console.log('Adding tag:', tag);
        try {
            // First, clear the entire Tags range
            await this.sheetsService.clearRange(SHEET_ID, TAGS_LIST_RANGE);
            
            // Add new tag to memory if it doesn't exist
            if (!this.tags.includes(tag)) {
                this.tags.push(tag);
            }
            
            // Remove duplicates and sort
            this.tags = [...new Set(this.tags)].sort();
            
            // Update the Tags worksheet with the clean list
            if (this.tags.length > 0) {
                await this.sheetsService.updateSheet(SHEET_ID, TAGS_LIST_RANGE, 
                    this.tags.map(t => [t])
                );
            }
            
            // Log the addition only if it was a new tag
            if (!this.tags.includes(tag)) {
                await this.logChange('tag', 'ADD', tag);
            }
        } catch (error) {
            console.error('Error adding tag:', error);
            throw new Error('Failed to add tag');
        }
    }

    static async renameTag(oldTag: string, newTag: string): Promise<void> {
        console.log('Renaming tag:', oldTag, 'to', newTag);
        
        try {
            // Update all locations with the old tag
            const locationsToUpdate = this.locations.filter(loc => 
                loc.Tags && loc.Tags.split(',').map(t => t.trim()).includes(oldTag)
            );
            
            // Update each location with the new tag
            for (const location of locationsToUpdate) {
                const tags = location.Tags ? location.Tags.split(',').map(t => t.trim()) : [];
                const tagIndex = tags.indexOf(oldTag);
                if (tagIndex !== -1) {
                    tags[tagIndex] = newTag;
                }
                const updatedLocation = { ...location, Tags: tags.join(', ') };
                const rowIndex = this.locations.findIndex(loc => loc.ID === location.ID) + 2;
                await this.updateRow(rowIndex, this.locationToRow(updatedLocation));
                
                // Update the location in memory
                const index = this.locations.findIndex(loc => loc.ID === location.ID);
                if (index !== -1) {
                    this.locations[index] = updatedLocation;
                }
            }
            
            // Update tags list
            const tagIndex = this.tags.indexOf(oldTag);
            if (tagIndex !== -1) {
                // Remove old tag and add new one
                this.tags.splice(tagIndex, 1);
                if (!this.tags.includes(newTag)) {
                    this.tags.push(newTag);
                    this.tags.sort();
                }
                
                // Update the tags in the sheet
                await this.sheetsService.updateSheet(SHEET_ID, TAGS_LIST_RANGE, 
                    this.tags.map(t => [t])
                );
                
                // Log the rename
                await this.logChange('tag', 'RENAME', oldTag, newTag);
            }
        } catch (error) {
            console.error('Error renaming tag:', error);
            throw new Error('Failed to rename tag');
        }
    }

    static async deleteTag(tag: string): Promise<void> {
        console.log('Deleting tag:', tag);
        
        try {
            // First, clear the entire Tags range
            await this.sheetsService.clearRange(SHEET_ID, TAGS_LIST_RANGE);
            
            // Remove tag from memory
            this.tags = this.tags.filter(t => t !== tag);
            
            // Update the Tags worksheet with the filtered list
            if (this.tags.length > 0) {
                await this.sheetsService.updateSheet(SHEET_ID, TAGS_LIST_RANGE, 
                    this.tags.map(t => [t])
                );
            }

            // Then update locations
            const locationsToUpdate = this.locations.filter(loc => 
                loc.Tags && loc.Tags.split(',').map(t => t.trim()).includes(tag)
            );
            
            // Update each location to remove the tag
            for (const location of locationsToUpdate) {
                const tags = location.Tags ? 
                    location.Tags.split(',')
                        .map(t => t.trim())
                        .filter(t => t !== tag && t !== '')
                    : [];
                    
                const updatedLocation = { ...location, Tags: tags.join(', ') };
                const rowIndex = this.locations.findIndex(loc => loc.ID === location.ID) + 2;
                await this.updateRow(rowIndex, this.locationToRow(updatedLocation));
                
                // Update the location in memory
                const index = this.locations.findIndex(loc => loc.ID === location.ID);
                if (index !== -1) {
                    this.locations[index] = updatedLocation;
                }
            }
            
            // Log the deletion
            await this.logChange('tag', 'DELETE', tag);
        } catch (error) {
            console.error('Error deleting tag:', error);
            // If there's an error, refresh data to ensure consistency
            await this.refreshData();
            throw new Error('Failed to delete tag');
        }
    }

    private static async appendRow(values: any[]): Promise<void> {
        try {
            await this.sheetsService.appendToSheet(SHEET_ID, 'Sheet1!A1:O1', [values]);
        } catch (error) {
            console.error('Failed to append row:', error);
            throw new Error('Failed to save data to Google Sheets');
        }
    }

    private static async updateRow(rowIndex: number, values: any[]): Promise<void> {
        try {
            const range = `Sheet1!A${rowIndex}:O${rowIndex}`;
            await this.sheetsService.updateSheet(SHEET_ID, range, [values]);
        } catch (error) {
            console.error('Failed to update row:', error);
            throw new Error('Failed to update data in Google Sheets');
        }
    }

    private static async clearRow(rowIndex: number): Promise<void> {
        try {
            const range = `Sheet1!A${rowIndex}:O${rowIndex}`;
            await this.sheetsService.clearRange(SHEET_ID, range);
        } catch (error) {
            console.error('Failed to clear row:', error);
            throw new Error('Failed to delete data from Google Sheets');
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
            this.fetchCategories(),
            this.fetchTags()
        ]);
    }
} 