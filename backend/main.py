import os
import sys
import asyncio
import warnings
from pathlib import Path

# --- ML Warning Suppression ---
# Keep Hugging Face hub downloader quiet regarding symlinks
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
# Globally ignore non-critical deprecation and future warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
# ------------------------------
from typing import List, Optional
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Fix for Windows asyncio subprocesses
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="MITS Results API & Command Center")

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global State for Scraper Process ---
class ScraperState:
    process: Optional[asyncio.subprocess.Process] = None

scraper_state = ScraperState()

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

# --- Models ---
class ScraperRequest(BaseModel):
    semester: int
    prefixes: List[str] = []
    branches: List[str] = ["All"]
    start_index: Optional[int] = None
    end_index: Optional[int] = None

class LoginRequest(BaseModel):
    password: str

# --- Helper Functions ---
def get_google_sheet():
    credentials_file = BASE_DIR / "service-account.json"
    if not credentials_file.exists():
        credentials_file = Path("/etc/secrets/service-account.json")
        
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

import subprocess
import threading
import sys

def run_scraper_task(payload: ScraperRequest, loop: asyncio.AbstractEventLoop):
    """Background task to run the scraper synchronously using threads to avoid Windows asyncio bugs."""
    try:
        asyncio.run_coroutine_threadsafe(
            manager.broadcast(f"[SYSTEM] Starting scraper for semester {payload.semester}, branches {', '.join(payload.branches)}..."),
            loop
        )
        
        # Explicitly use venv Python if it exists to prevent ModuleNotFoundError
        venv_python = BASE_DIR / "venv" / "Scripts" / "python.exe"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable
        
        cmd = [python_exe, "-u", "main.py", "--semester", str(payload.semester)]
        if payload.prefixes:
            cmd.extend(["--prefix", ",".join(payload.prefixes)])
        elif payload.branches and "All" not in payload.branches:
            cmd.extend(["--branch", ",".join(payload.branches)])
        if payload.start_index is not None:
            cmd.extend(["--start", str(payload.start_index)])
        if payload.end_index is not None:
            cmd.extend(["--end", str(payload.end_index)])

        kwargs = {
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "cwd": BASE_DIR,
            "text": True,
            "encoding": 'utf-8',
            "errors": 'replace'
        }

        if sys.platform == 'win32':
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

        # Spawn the process synchronously
        process = subprocess.Popen(cmd, **kwargs)
        scraper_state.process = process

        def read_stream(stream, prefix):
            try:
                for line in iter(stream.readline, ''):
                    if not line:
                        break
                    line = line.rstrip()
                    asyncio.run_coroutine_threadsafe(manager.broadcast(f"{prefix}{line}"), loop)
            except Exception as e:
                print(f"Error reading stream: {e}")
                
        t1 = threading.Thread(target=read_stream, args=(process.stdout, ""))
        t2 = threading.Thread(target=read_stream, args=(process.stderr, "[ERROR] "))
        t1.start()
        t2.start()

        process.wait()
        t1.join()
        t2.join()

        asyncio.run_coroutine_threadsafe(
            manager.broadcast(f"[SYSTEM] Scraper finished with exit code {process.returncode}"),
            loop
        )
    except Exception as e:
        print(f"Exception in run_scraper_task: {e}")
        asyncio.run_coroutine_threadsafe(
            manager.broadcast(f"[ERROR] Fatal background task error: {e}"),
            loop
        )

# --- API Endpoints ---
@app.get("/api/data")
def get_results():
    """Fetches all result data from the Google Sheet (previously /api/results)."""
    sheet = get_google_sheet()
    if not sheet:
        return {"error": "Google Sheets credentials not found. Please inject service-account.json."}

    try:
        records = sheet.get_all_records()
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

# pyrefly: ignore [missing-import]
from fastapi import BackgroundTasks

@app.post("/api/login")
def login(payload: LoginRequest):
    """Simple password authentication for the Admin Dashboard."""
    expected_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if payload.password == expected_password:
        return {"status": "success", "token": "authenticated"}
    raise HTTPException(status_code=401, detail="Invalid password.")

@app.post("/api/run-scraper")
async def run_scraper(payload: ScraperRequest, background_tasks: BackgroundTasks):
    """Spins up the Python scraper asynchronously."""
    if scraper_state.process and scraper_state.process.poll() is None:
        raise HTTPException(status_code=400, detail="Scraper is already running.")

    loop = asyncio.get_running_loop()
    background_tasks.add_task(run_scraper_task, payload, loop)
    return {"status": "started"}

@app.post("/api/stop-scraper")
async def stop_scraper():
    """Terminates the running scraper process and its children."""
    if not scraper_state.process or scraper_state.process.poll() is not None:
        raise HTTPException(status_code=400, detail="Scraper is not running.")

    if sys.platform == 'win32':
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(scraper_state.process.pid)], capture_output=True)
    else:
        scraper_state.process.terminate()

    await manager.broadcast("[SYSTEM] Scraper terminated by administrator.")
    return {"status": "terminated"}

@app.get("/api/status")
def get_status():
    """Check if the scraper is running."""
    is_running = scraper_state.process is not None and scraper_state.process.poll() is None
    return {"is_running": is_running}

# --- WebSocket ---
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    # Send welcome message
    await websocket.send_text("[SYSTEM] Connected to Command Center Terminal.")
    try:
        while True:
            # Keep connection alive, listen for dummy messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
