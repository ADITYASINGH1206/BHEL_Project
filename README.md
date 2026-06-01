# MITS Result Scraper and Dashboard

An automated web scraping, data processing, and visualization pipeline for MITS Gwalior university portal results.

## Project Structure
- `scraper/`: Contains the Selenium web scraping logic and TrOCR CAPTCHA solver.
- `database/`: Handles integration with Google Sheets using the Google Drive/Sheets APIs.
- `backend/`: FastAPI backend to serve data from the Google Sheet to the React frontend.
- `frontend/`: React + Vite frontend dashboard for visualizing the results.

## Setup Instructions

### 1. Python Environment Setup
Install the required dependencies in a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Google Sheets API Configuration
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Sheets API** and **Google Drive API**.
3. Create a Service Account and download the JSON key file.
4. Rename the key file to `service_account.json` and place it in the root directory.
5. Create a new Google Sheet and share it with the email address of the service account you created (give it Editor permissions).

### 3. Environment Variables
Create a `.env` file in the root directory with the following variables:
```
GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
MITS_PORTAL_URL="https://example-mits-portal.com/"
```
*(Wait to populate MITS_PORTAL_URL until provided)*

### 4. Running the Scraper
To run the web scraper and update the Google Sheet:
```bash
python -m scraper.scraper
```

### 5. Running the Backend API
Start the FastAPI server:
```bash
uvicorn backend.main:app --reload --port 8000
```

### 6. Running the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
