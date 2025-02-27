"""
Google Sheets setup and authentication module.

This module provides the basic setup and authentication functionality for Google Sheets integration.
It handles:
- Loading environment variables
- Setting up Google Sheets credentials
- Establishing connection to Google Sheets
- Basic worksheet operations
"""

import os
import logging
from typing import Any, Optional
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SheetsSetup:
    """Handles Google Sheets authentication and basic setup."""
    
    def __init__(self):
        """Initialize the sheets setup with environment variables."""
        # Load environment variables
        load_dotenv()
        
        # Initialize connection
        self.client = None
        self.spreadsheet = None
        self.worksheet = None
        
    def create_credentials_dict(self) -> dict:
        """Create credentials dictionary from environment variables.
        
        Returns:
            dict: Dictionary containing Google service account credentials
        """
        return {
            "type": os.getenv('GOOGLE_TYPE'),
            "project_id": os.getenv('GOOGLE_PROJECT_ID'),
            "private_key_id": os.getenv('GOOGLE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('GOOGLE_PRIVATE_KEY'),
            "client_email": os.getenv('GOOGLE_CLIENT_EMAIL'),
            "client_id": os.getenv('GOOGLE_CLIENT_ID'),
            "auth_uri": os.getenv('GOOGLE_AUTH_URI'),
            "token_uri": os.getenv('GOOGLE_TOKEN_URI'),
            "auth_provider_x509_cert_url": os.getenv('GOOGLE_AUTH_PROVIDER_X509_CERT_URL'),
            "client_x509_cert_url": os.getenv('GOOGLE_CLIENT_X509_CERT_URL'),
            "universe_domain": os.getenv('GOOGLE_UNIVERSE_DOMAIN')
        }

    def setup_connection(self) -> Optional[gspread.Client]:
        """Set up connection to Google Sheets.
        
        Returns:
            gspread.Client: Authenticated Google Sheets client
            None: If setup fails
        """
        try:
            # Get scope from environment
            scope = os.getenv('GOOGLE_SHEETS_SCOPE', '').split(',')
            
            # Create credentials from environment variables
            credentials_dict = self.create_credentials_dict()
            
            # Set up credentials
            creds = ServiceAccountCredentials.from_json_keyfile_dict(
                credentials_dict, 
                scope
            )
            
            # Authorize the client
            self.client = gspread.authorize(creds)
            logger.info("Google Sheets API successfully configured")
            
            return self.client
            
        except Exception as e:
            logger.error(f"Error while setting up Google Sheets API: {str(e)}")
            return None

    def connect_to_spreadsheet(self, spreadsheet_id: Optional[str] = None) -> Optional[gspread.Worksheet]:
        """Connect to a specific Google Spreadsheet.
        
        Args:
            spreadsheet_id: Optional spreadsheet ID. If not provided, uses SPREADSHEET_ID from env
            
        Returns:
            gspread.Worksheet: First worksheet of the connected spreadsheet
            None: If connection fails
        """
        try:
            # Get spreadsheet ID from parameter or environment
            sheet_id = spreadsheet_id or os.getenv('SPREADSHEET_ID')
            
            if not sheet_id:
                logger.error("No spreadsheet ID provided or found in environment")
                return None
                
            # Connect to spreadsheet
            self.spreadsheet = self.client.open_by_key(sheet_id)
            self.worksheet = self.spreadsheet.sheet1
            
            logger.info(f"Successfully connected to spreadsheet: {sheet_id}")
            return self.worksheet
            
        except Exception as e:
            logger.error(f"Error connecting to spreadsheet: {str(e)}")
            return None

    def create_worksheet(self, title: str, rows: int = 1000, cols: int = 26) -> Optional[gspread.Worksheet]:
        """Create a new worksheet in the current spreadsheet.
        
        Args:
            title: Title of the new worksheet
            rows: Number of rows (default: 1000)
            cols: Number of columns (default: 26)
            
        Returns:
            gspread.Worksheet: The newly created worksheet
            None: If creation fails
        """
        try:
            if not self.spreadsheet:
                logger.error("No spreadsheet connected")
                return None
                
            worksheet = self.spreadsheet.add_worksheet(title=title, rows=rows, cols=cols)
            logger.info(f"Successfully created worksheet: {title}")
            return worksheet
            
        except Exception as e:
            logger.error(f"Error creating worksheet: {str(e)}")
            return None

def get_sheets_client() -> Optional[gspread.Client]:
    """Helper function to quickly get an authenticated sheets client.
    
    Returns:
        gspread.Client: Authenticated Google Sheets client
        None: If setup fails
    """
    setup = SheetsSetup()
    return setup.setup_connection() 