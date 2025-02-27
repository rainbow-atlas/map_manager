# Google API Setup Guide

This guide explains how to set up Google API integration for the Discord bot, specifically for Google Sheets functionality.

## Prerequisites

- A Google Cloud Platform account
- Python 3.8 or higher
- Required Python packages (see requirements.txt)

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Create Project" or select an existing project
3. Note down your Project ID

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Google Sheets API
   - Google Drive API

## Step 3: Create Service Account Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: Choose a descriptive name (e.g., "discord-bot-sheets")
   - Role: Project > Editor
4. Click "Create and Continue"
5. Click "Done"

## Step 4: Generate Service Account Key

1. In the Credentials page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose JSON format
6. Download the key file

## Step 5: Set Up Environment Variables

Create a `.env` file in your project root with the following variables from your downloaded JSON key:

```env
GOOGLE_SHEETS_SCOPE=https://spreadsheets.google.com/feeds,https://www.googleapis.com/auth/drive
GOOGLE_TYPE=service_account
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="your_private_key"
GOOGLE_CLIENT_EMAIL=your_client_email
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_CLIENT_X509_CERT_URL=your_cert_url
GOOGLE_UNIVERSE_DOMAIN=googleapis.com
SPREADSHEET_ID=your_spreadsheet_id
```

## Step 6: Create and Share Google Spreadsheet

1. Create a new Google Spreadsheet
2. Copy the spreadsheet ID from the URL (the long string between /d/ and /edit)
3. Share the spreadsheet with your service account email (found in the JSON key file)
4. Add the spreadsheet ID to your .env file

## Required Python Packages

Install the following packages:

```bash
pip install gspread oauth2client google-api-python-client python-dotenv
```

## Code Implementation

Check the following files in this directory for implementation details:
- `sheets_setup.py`: Basic setup and authentication
- `sheets_logger.py`: Logging functionality
- `example_usage.py`: Example usage of the Google Sheets integration

## Troubleshooting

1. **Authentication Errors**:
   - Verify all credentials in .env file
   - Ensure service account has access to the spreadsheet
   - Check if APIs are enabled in Google Cloud Console

2. **Permission Issues**:
   - Confirm spreadsheet is shared with service account email
   - Verify service account has editor access

3. **Rate Limiting**:
   - Implement exponential backoff for requests
   - Cache data when possible
   - Batch updates when possible

## Security Notes

- Never commit your credentials or .env file
- Keep your service account key secure
- Regularly rotate your service account keys
- Monitor API usage and set up alerts

## Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [gspread Documentation](https://docs.gspread.org/) 