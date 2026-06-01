import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# ==========================================
# CONFIGURATION
# SPREADSHEET_URL is fetched dynamically from environment variables
# ==========================================

class GoogleSheetsManager:
    def __init__(self, credentials_file="service-account.json"):
        self.scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive"
        ]
        self.credentials_file = credentials_file
        self.client = None
        self.spreadsheet = None
        self.connect()

    def connect(self):
        try:
            if not os.path.exists(self.credentials_file):
                print(f"Warning: {self.credentials_file} not found. Google Sheets integration disabled.")
                return

            creds = ServiceAccountCredentials.from_json_keyfile_name(self.credentials_file, self.scope)
            self.client = gspread.authorize(creds)
            
            spreadsheet_url = os.getenv("GOOGLE_SHEET_URL", "")
            if spreadsheet_url:
                self.spreadsheet = self.client.open_by_url(spreadsheet_url)
            else:
                print("Warning: GOOGLE_SHEET_URL not set in environment.")
        except Exception as e:
            print(f"Error connecting to Google Sheets: {e}")

    def _initialize_headers(self, sheet):
        """Sets up headers if the sheet is empty."""
        headers = ["Enrollment Number", "Student Name", "Branch", "Semester", "SGPA", "CGPA", "Result Status", "Total Credits", "Earned Credits", "Last Updated"]
        first_row = sheet.row_values(1)
        if not first_row:
            sheet.append_row(headers)
            print(f"Initialized Google Sheet '{sheet.title}' with headers.")

    def _get_or_create_worksheet(self, title):
        """Gets a worksheet by title, or creates it if it doesn't exist."""
        try:
            return self.spreadsheet.worksheet(title)
        except gspread.exceptions.WorksheetNotFound:
            print(f"Worksheet '{title}' not found. Creating it...")
            sheet = self.spreadsheet.add_worksheet(title=title, rows=1000, cols=20)
            self._initialize_headers(sheet)
            return sheet

    def get_existing_enrollments(self):
        """Returns a set of enrollment numbers already in the Master sheet for O(1) duplicate checking."""
        if not self.spreadsheet:
            return set()
        try:
            master_sheet = self._get_or_create_worksheet("Master")
            # Fetch all values in Column 1 (Enrollment Numbers) to minimize API calls
            values = master_sheet.col_values(1)
            if values and values[0] == "Enrollment Number":
                return set(values[1:])
            return set(values)
        except Exception as e:
            print(f"Error fetching existing enrollments: {e}")
            return set()

    def _write_to_worksheet(self, sheet, data: dict):
        """Checks if enrollment number exists in the given sheet. Updates if yes, appends if no."""
        enrollment = data.get("Enrollment Number")
        if not enrollment:
            return

        row_data = [
            data.get("Enrollment Number", ""),
            data.get("Student Name", ""),
            data.get("Branch", ""),
            data.get("Semester", ""),
            data.get("SGPA", ""),
            data.get("CGPA", ""),
            data.get("Result Status", ""),
            data.get("Total Credits", ""),
            data.get("Earned Credits", ""),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ]

        try:
            cell = sheet.find(enrollment, in_column=1)
            if cell:
                row_idx = cell.row
                cell_list = sheet.range(f'A{row_idx}:J{row_idx}')
                for i, val in enumerate(row_data):
                    cell_list[i].value = val
                sheet.update_cells(cell_list)
                print(f"[{sheet.title}] Updated record for {enrollment}")
            else:
                sheet.append_row(row_data)
                print(f"[{sheet.title}] Appended new record for {enrollment}")
        except Exception as e:
            print(f"Error writing to worksheet '{sheet.title}': {e}")

    def update_or_append_student(self, data: dict):
        """
        Updates or appends a student record to the 'Master' sheet 
        AND their respective 'Branch' sheet.
        """
        if not self.spreadsheet:
            print("Google Sheet not connected. Skipping data write.")
            return

        try:
            # 1. Update Master Sheet
            master_sheet = self._get_or_create_worksheet("Master")
            self._write_to_worksheet(master_sheet, data)

            # 2. Update Branch Sheet
            branch = data.get("Branch")
            if branch:
                branch_sheet = self._get_or_create_worksheet(branch)
                self._write_to_worksheet(branch_sheet, data)

        except gspread.exceptions.APIError as e:
            if "RateLimitExceeded" in str(e):
                print("Rate limit exceeded. Waiting for 60 seconds...")
                import time
                time.sleep(60)
                self.update_or_append_student(data) # Retry
            else:
                print(f"Google Sheets API Error: {e}")
        except Exception as e:
            print(f"Error orchestrating sheet update: {e}")
