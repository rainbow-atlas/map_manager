"""
Example usage of Google Sheets integration.

This module demonstrates how to use the Google Sheets setup and logging functionality
with practical examples.
"""

import os
from datetime import datetime, timezone
from sheets_setup import SheetsSetup
from sheets_logger import SheetsLogger

def main():
    """Main function demonstrating Google Sheets integration usage."""
    
    # 1. Initialize Google Sheets setup
    print("\n1. Setting up Google Sheets connection...")
    setup = SheetsSetup()
    
    # 2. Establish connection
    client = setup.setup_connection()
    if not client:
        print("Failed to set up Google Sheets connection")
        return
    
    # 3. Connect to spreadsheet
    worksheet = setup.connect_to_spreadsheet()
    if not worksheet:
        print("Failed to connect to spreadsheet")
        return
    
    # 4. Initialize logger
    logger = SheetsLogger(worksheet)
    
    # 5. Example: Log an interaction
    print("\n2. Logging an example interaction...")
    success = logger.log_interaction(
        session_id="example_session_001",
        username="test_user",
        interaction_type="question",
        content="How do I use this API?",
        timestamp=datetime.now(timezone.utc),
        metadata={
            "status": "open",
            "rating": None,
            "notes": "First time user"
        }
    )
    print(f"Interaction logged successfully: {success}")
    
    # 6. Example: Log a rating
    print("\n3. Logging an example rating...")
    success = logger.log_rating(
        session_id="example_session_001",
        username="test_user",
        rating_user="feedback_user",
        rating=5,
        timestamp=datetime.now(timezone.utc)
    )
    print(f"Rating logged successfully: {success}")
    
    # 7. Example: Batch update
    print("\n4. Performing a batch update...")
    success = logger.batch_update(
        range_name="A1:B2",
        values=[
            ["Header 1", "Header 2"],
            ["Value 1", "Value 2"]
        ]
    )
    print(f"Batch update completed successfully: {success}")

if __name__ == "__main__":
    main() 