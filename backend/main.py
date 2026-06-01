import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import gspread
from oauth2client.service_account import ServiceAccountCredentials

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="MITS Results API")

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_google_sheet():
    credentials_file = BASE_DIR / "service-account.json"
    if not credentials_file.exists():
        return None
    
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(credentials_file, scope)
    client = gspread.authorize(creds)
    
    sheet_url = os.getenv("GOOGLE_SHEET_URL")
    if not sheet_url:
        return None
    
    return client.open_by_url(sheet_url).worksheet("Master")

@app.get("/api/results")
def get_results():
    """
    Fetches all result data from the Google Sheet.
    """
    sheet = get_google_sheet()
    if not sheet:
        # Return mock data if sheet is not configured
        return [
            {"Enrollment Number": "BTAD24O1001", "Student Name": "Alice Smith", "Branch": "BTAD", "SGPA": 9.2, "CGPA": 9.0, "Result Status": "Pass"},
            {"Enrollment Number": "BTAM24O1002", "Student Name": "Bob Jones", "Branch": "BTAM", "SGPA": 7.5, "CGPA": 7.8, "Result Status": "Pass"},
            {"Enrollment Number": "BTAI24O1003", "Student Name": "Charlie Brown", "Branch": "BTAI", "SGPA": 4.5, "CGPA": 5.0, "Result Status": "Fail"},
            {"Enrollment Number": "BTAD24O1004", "Student Name": "Diana Prince", "Branch": "BTAD", "SGPA": 8.5, "CGPA": 8.6, "Result Status": "Pass"},
        ]

    try:
        # Get all records as a list of dictionaries
        records = sheet.get_all_records()
        
        # Convert necessary fields to appropriate types
        for record in records:
            try:
                record["SGPA"] = float(record.get("SGPA", 0))
                record["CGPA"] = float(record.get("CGPA", 0))
            except ValueError:
                record["SGPA"] = 0.0
                record["CGPA"] = 0.0
                
        return records
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
