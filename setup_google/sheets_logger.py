"""
Google Sheets logging functionality.

This module provides logging functionality for Google Sheets integration.
It handles:
- Logging data to specific worksheets
- Managing data formats
- Error handling and retries
"""

import os
import pytz
import logging
from datetime import datetime
from typing import Any, List, Optional, Union
import gspread
from gspread.exceptions import APIError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SheetsLogger:
    """Handles logging data to Google Sheets."""
    
    def __init__(self, worksheet: gspread.Worksheet):
        """Initialize the sheets logger.
        
        Args:
            worksheet: The Google Sheets worksheet to log to
        """
        self.worksheet = worksheet
        self.local_timezone = pytz.timezone('Europe/Vienna')
        
    def _format_timestamp(self, timestamp: datetime) -> str:
        """Convert UTC timestamp to local timezone string.
        
        Args:
            timestamp: UTC datetime object
            
        Returns:
            str: Formatted timestamp string
        """
        return timestamp.astimezone(self.local_timezone).strftime('%Y-%m-%d %H:%M:%S')
        
    def append_row(self, row_data: List[Any], retry_count: int = 3) -> bool:
        """Append a row of data to the worksheet with retry logic.
        
        Args:
            row_data: List of values to append as a new row
            retry_count: Number of times to retry on failure
            
        Returns:
            bool: True if successful, False otherwise
        """
        for attempt in range(retry_count):
            try:
                self.worksheet.append_row(row_data)
                return True
            except APIError as e:
                if attempt == retry_count - 1:
                    logger.error(f"Failed to append row after {retry_count} attempts: {str(e)}")
                    return False
                logger.warning(f"Attempt {attempt + 1} failed, retrying...")
                continue
            except Exception as e:
                logger.error(f"Unexpected error appending row: {str(e)}")
                return False
                
    def update_cell(self, row: int, col: int, value: Any, retry_count: int = 3) -> bool:
        """Update a specific cell in the worksheet with retry logic.
        
        Args:
            row: Row number (1-based)
            col: Column number (1-based)
            value: New cell value
            retry_count: Number of times to retry on failure
            
        Returns:
            bool: True if successful, False otherwise
        """
        for attempt in range(retry_count):
            try:
                self.worksheet.update_cell(row, col, value)
                return True
            except APIError as e:
                if attempt == retry_count - 1:
                    logger.error(f"Failed to update cell after {retry_count} attempts: {str(e)}")
                    return False
                logger.warning(f"Attempt {attempt + 1} failed, retrying...")
                continue
            except Exception as e:
                logger.error(f"Unexpected error updating cell: {str(e)}")
                return False
                
    def log_interaction(self, 
                       session_id: str,
                       username: str,
                       interaction_type: str,
                       content: str,
                       timestamp: datetime,
                       metadata: Optional[dict] = None) -> bool:
        """Log an interaction to the worksheet.
        
        Args:
            session_id: Unique session identifier
            username: Username of the person involved
            interaction_type: Type of interaction (e.g., 'question', 'answer')
            content: The interaction content
            timestamp: When the interaction occurred
            metadata: Optional additional data to log
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Format timestamp
            formatted_time = self._format_timestamp(timestamp)
            
            # Prepare row data
            row_data = [
                session_id,
                username,
                interaction_type,
                content,
                formatted_time
            ]
            
            # Add metadata if provided
            if metadata:
                row_data.extend([
                    metadata.get('status', ''),
                    metadata.get('rating', ''),
                    metadata.get('notes', '')
                ])
                
            # Append the row
            return self.append_row(row_data)
            
        except Exception as e:
            logger.error(f"Error logging interaction: {str(e)}")
            return False
            
    def log_rating(self,
                   session_id: str,
                   username: str,
                   rating_user: str,
                   rating: Optional[int],
                   timestamp: datetime) -> bool:
        """Log a rating to the worksheet.
        
        Args:
            session_id: The session ID
            username: Username of the person who closed the session
            rating_user: Username of the person who gave the rating
            rating: The rating value (or None if no rating given)
            timestamp: When the rating was given
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Format timestamp
            formatted_time = self._format_timestamp(timestamp)
            
            # Prepare row data
            row_data = [
                session_id,
                username,
                rating_user,
                rating if rating is not None else '-',
                formatted_time,
                'Rating'
            ]
            
            # Append the row
            return self.append_row(row_data)
            
        except Exception as e:
            logger.error(f"Error logging rating: {str(e)}")
            return False
            
    def batch_update(self, 
                    range_name: str, 
                    values: List[List[Any]], 
                    retry_count: int = 3) -> bool:
        """Perform a batch update of multiple cells.
        
        Args:
            range_name: The A1 notation of the range to update
            values: 2D list of values to update
            retry_count: Number of times to retry on failure
            
        Returns:
            bool: True if successful, False otherwise
        """
        for attempt in range(retry_count):
            try:
                self.worksheet.batch_update([{
                    'range': range_name,
                    'values': values
                }])
                return True
            except APIError as e:
                if attempt == retry_count - 1:
                    logger.error(f"Failed to perform batch update after {retry_count} attempts: {str(e)}")
                    return False
                logger.warning(f"Attempt {attempt + 1} failed, retrying...")
                continue
            except Exception as e:
                logger.error(f"Unexpected error in batch update: {str(e)}")
                return False 