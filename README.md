# Rainbow Atlas Map Manager

A web application for managing and visualizing location data with Google Maps integration.

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following structure:
   ```env
   # Google Sheets Configuration
   VITE_GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"
   VITE_GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   VITE_GOOGLE_SHEET_ID=your-google-sheet-id

   # Users Configuration
   VITE_USERS_CONFIG='{
     "admin": {
       "password": "your-admin-password",
       "role": "admin"
     },
     "editor": {
       "password": "your-editor-password",
       "role": "editor"
     },
     "viewer": {
       "password": "your-viewer-password",
       "role": "viewer"
     },
     "guest": {
       "password": "your-guest-password",
       "role": "guest"
     }
   }'
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Managing GitHub Secrets

The application requires several environment variables to be set as GitHub Secrets for deployment. To set these up:

1. Install GitHub CLI:
   ```bash
   # On macOS with Homebrew
   brew install gh
   ```

2. Login to GitHub CLI:
   ```bash
   gh auth login
   ```

3. Run the secrets setup script:
   ```bash
   ./scripts/set-github-secrets.sh
   ```

This script will:
- Read your local `.env` file
- Set each environment variable as a GitHub Secret
- Make the secrets available to your GitHub Pages deployment

Note: For GitHub Pages deployment, you need to set these secrets in your repository's settings:
1. Go to your repository on GitHub
2. Click on "Settings"
3. Click on "Secrets and variables" → "Actions"
4. Add the following secrets:
   - `VITE_GOOGLE_CLIENT_EMAIL`
   - `VITE_GOOGLE_PRIVATE_KEY`
   - `VITE_GOOGLE_PRIVATE_KEY_ID`
   - `VITE_GOOGLE_SHEET_ID`
   - `VITE_USERS_CONFIG`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## User Roles

The application supports four user roles with different permission levels:

1. **Admin** - Full access to all features
2. **Editor** - Can edit content with some restrictions
3. **Viewer** - Can view content with limited editing capabilities
4. **Guest** - Most restricted access

## Technologies Used

- React
- TypeScript
- Vite
- Material-UI
- Google Maps API
- Google Sheets API

## Features

- View all locations in a filterable list
- Add new locations through a form interface
- Edit existing locations
- Delete locations
- Import locations from CSV
- Export locations to CSV
- Data persistence using local storage
- Responsive design

## Deployment

The application is configured to deploy automatically to GitHub Pages when changes are pushed to the main branch. To set up deployment:

1. Create a new repository on GitHub
2. Push your code to the repository
3. In your repository settings, enable GitHub Pages and select the GitHub Actions option
4. Set up the required secrets in your repository settings (see "Managing GitHub Secrets" section)
5. The application will be automatically deployed when you push to the main branch

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
