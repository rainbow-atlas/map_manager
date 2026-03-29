# Rainbow Atlas Map Manager

A web application for managing and visualizing location data with Google Maps integration.

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com) and run the schema migration:
   - Go to your project → SQL Editor
   - Run the SQL in `supabase/migrations/20240318000000_create_schema.sql`

3. Create a `.env` file in the project root (see `.env.example` for structure):
   ```env
   # Supabase (required - get from Project Settings → API)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # Google Maps (optional - for address autocomplete)
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

   # Users Configuration
   VITE_USERS_CONFIG='{"admin":{"password":"your-password","role":"admin"},"editor":{"password":"your-password","role":"editor"}}'
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Migrating Data from Google Sheets (Optional)

If you have existing data in a Google Sheet:

1. Export the sheet: File → Download → Comma-separated values (.csv)
2. Run the migration script:
   ```bash
   npm run migrate -- path/to/Sheet1.csv
   ```

Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env` before running.

## Managing GitHub Secrets

The application requires environment variables to be set as GitHub Secrets for deployment:

1. Install GitHub CLI: `brew install gh`
2. Login: `gh auth login`
3. Run: `./scripts/set-github-secrets.sh`

Add these secrets in GitHub → Settings → Secrets and variables → Actions (or run `./scripts/set-github-secrets.sh` to sync from `.env`):
- `VITE_SUPABASE_URL` (required for deploy)
- `VITE_SUPABASE_ANON_KEY` (required for deploy)
- `VITE_GOOGLE_MAPS_API_KEY` (optional — address autocomplete)
- `VITE_QUEER_MAP_EMBED_URL` (optional — public map URL for iframe builder + login link; app falls back to GitHub Pages if unset)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run migrate -- <path/to/export.csv>` - Migrate data from a CSV (exported from Google Sheets) into Supabase

## User Roles

The application supports two roles:

1. **Admin** - Full access (including user management in the app)
2. **Editor** - Can edit map content

## Technologies Used

- React
- TypeScript
- Vite
- Material-UI
- Google Maps API
- Supabase (PostgreSQL)

## Features

- View all locations in a filterable list
- Add new locations through a form interface
- Edit existing locations
- Delete locations
- Import locations from CSV
- Export locations to CSV
- Data persistence using Supabase
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
