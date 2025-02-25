# Rainbow Atlas Map Manager

A minimal content management system for managing location data in the Rainbow Atlas project. This application allows you to create, edit, and manage location entries through a user-friendly interface.

## Features

- View all locations in a filterable list
- Add new locations through a form interface
- Edit existing locations
- Delete locations
- Import locations from CSV
- Export locations to CSV
- Data persistence using local storage
- Responsive design

## Development

To run the project locally:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is configured to deploy automatically to GitHub Pages when changes are pushed to the main branch. To set up deployment:

1. Create a new repository on GitHub
2. Push your code to the repository
3. In your repository settings, enable GitHub Pages and select the GitHub Actions option
4. The application will be automatically deployed when you push to the main branch

## Usage

### Importing Data
To import your location data:
1. Click the "Import CSV" button
2. Select your CSV file
3. The data will be loaded into the application

### Managing Locations
- Use the search bar to filter locations
- Click the edit icon to modify a location
- Click the delete icon to remove a location
- Click "Add New Location" to create a new entry

### Exporting Data
Click the "Export CSV" button to download your current data as a CSV file.

## Data Structure

Each location entry contains the following fields:
- Name (required)
- Latitude (required)
- Longitude (required)
- Description
- Website
- Tags (comma-separated)
- Image URL
- Address
- Phone
- Email
- Category
- Contact Person
- Last Checked
- Additional Info
