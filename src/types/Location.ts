export interface Location {
    ID: string;
    Name: string;
    Latitude: number;
    Longitude: number;
    Description: string;
    Website: string;
    Tags: string;
    Image: string;
    Address: string;
    Phone: string;
    Email: string;
    Category: string;
    'Contact Person': string;
    'Last Checked': string;
    'Additional Info': string;
}

export type LocationFormData = Omit<Location, 'ID'>; 