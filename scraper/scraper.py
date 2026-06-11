import os
import time
import json
from dotenv import load_dotenv
load_dotenv()  # MUST BE CALLED BEFORE IMPORTS

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, UnexpectedAlertPresentException, NoAlertPresentException

from scraper.ocr import CaptchaSolver
from scraper.utils import get_random_delay, get_enrollment_batches, setup_logger, load_config
from database.gsheets import GoogleSheetsManager

class MitsScraper:
    def __init__(self):
        self.logger = setup_logger("MitsScraper")
        self.max_retries = 5
        
        self.config = load_config()
        self.program_select_url = self.config["urls"]["program_select"]
        self.result_page_url = self.config["urls"]["result_page"]
        self.semester = self.config.get("semester", 4)
        
        self.captcha_solver = CaptchaSolver()
        self.gsheets = GoogleSheetsManager()
        self._init_webdriver()

    def _init_webdriver(self):
        import sys
        chrome_options = Options()
        
        # Base arguments for stability and undetectability
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("window-size=1920,1080")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # Cloud (Linux) vs Local (Windows/Mac) configuration
        if sys.platform.startswith('linux'):
            chrome_options.add_argument("--headless=new")
            # Overwrite headless user-agent to bypass basic anti-bot detections
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            chrome_options.binary_location = "/usr/bin/chromium"
            service = Service("/usr/bin/chromedriver")
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            self.driver = webdriver.Chrome(options=chrome_options)
            
        self.wait = WebDriverWait(self.driver, 15)

    def initialize_session(self):
        """
        Step 1: Navigate to Program Select URL and select the program
        to initialize the session/cookies before proceeding to results.
        """
        self.logger.info("Initializing session via Program Select page...")
        try:
            self.driver.get(self.program_select_url)
            
            # Click the specific radio button or link (ContentPlaceHolder1_radlstProgram_3)
            # This ID was specified by the user.
            program_element = self.wait.until(
                EC.element_to_be_clickable((By.ID, "ContentPlaceHolder1_radlstProgram_3"))
            )
            program_element.click()
            
            # Allow some time for the ASP.NET postback or redirect to complete
            time.sleep(3)
            
            self.logger.info("Session successfully initialized.")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize session: {e}")
            return False

    def _refresh_captcha(self):
        """Attempts to refresh the CAPTCHA image."""
        try:
            # First try a known refresh button ID if it exists
            refresh_btn = self.driver.find_element(By.ID, "btnRefreshCaptcha")
            refresh_btn.click()
            time.sleep(1.5)
        except NoSuchElementException:
            try:
                # Often on ASP.NET, clicking the CAPTCHA image itself refreshes it
                img = self.driver.find_element(By.CSS_SELECTOR, "img[src*='CaptchaImage.axd']")
                img.click()
                time.sleep(1.5)
            except Exception:
                # Fallback: Reload the entire page to get a fresh CAPTCHA
                self.driver.get(self.result_page_url)
                time.sleep(1.5)

    def scrape_student(self, enrollment_number: str, branch_name: str) -> dict:
        """
        Step 2: Navigates to the result page, solves the CAPTCHA, submits, and extracts data.
        """
        for attempt in range(self.max_retries):
            try:
                # Only load the page on the first attempt; subsequent attempts will use the refreshed DOM
                if attempt == 0:
                    self.driver.get(self.result_page_url)
                
                # Strict explicit wait: Wait up to 10 seconds for the first element to physically appear
                try:
                    enrollment_input = WebDriverWait(self.driver, 10).until(
                        EC.visibility_of_element_located((By.ID, "ContentPlaceHolder1_txtrollno"))
                    )
                except TimeoutException:
                    self.logger.error(f"[{enrollment_number}] Timeout: Could not find Enrollment Input (ContentPlaceHolder1_txtrollno)")
                    continue

                try:
                    captcha_canvas = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "img[src*='CaptchaImage.axd']")))
                except TimeoutException:
                    self.logger.error(f"[{enrollment_number}] Timeout: Could not find CAPTCHA image. Please provide the correct ID!")
                    continue
                
                try:
                    semester_dropdown = Select(self.driver.find_element(By.ID, "ContentPlaceHolder1_drpSemester"))
                except NoSuchElementException:
                    self.logger.error(f"[{enrollment_number}] Could not find Semester Dropdown (ContentPlaceHolder1_drpSemester)")
                    continue
                
                try:
                    submit_button = self.driver.find_element(By.ID, "ContentPlaceHolder1_btnviewresult")
                    captcha_input = self.driver.find_element(By.ID, "ContentPlaceHolder1_TextBox1")
                except NoSuchElementException:
                    self.logger.error(f"[{enrollment_number}] Could not find Submit button or CAPTCHA input box.")
                    continue
                
                # Extract CAPTCHA image using JS (Handles both <canvas> and <img> tags)
                js_script = """
                var el = arguments[0];
                if (el.tagName.toLowerCase() === 'canvas') {
                    return el.toDataURL('image/png');
                } else {
                    var canvas = document.createElement('canvas');
                    canvas.width = el.naturalWidth || el.width || 150;
                    canvas.height = el.naturalHeight || el.height || 50;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(el, 0, 0);
                    return canvas.toDataURL('image/png');
                }
                """
                captcha_base64 = self.driver.execute_script(js_script, captcha_canvas)
                
                # Solve CAPTCHA
                captcha_text = self.captcha_solver.solve_base64(captcha_base64)
                
                if not captcha_text or len(captcha_text) != 5:
                    self.logger.warning(f"[{enrollment_number}] Invalid CAPTCHA read: '{captcha_text}'. Refreshing...")
                    self._refresh_captcha()
                    continue

                self.logger.info(f"[{enrollment_number}] Successfully solved CAPTCHA -> Submitting: '{captcha_text}'")

                # Fill the form with JS-based interactions to bypass overlays and locks
                self.driver.execute_script("arguments[0].click();", enrollment_input)
                time.sleep(0.5)
                self.driver.execute_script("arguments[0].value = '';", enrollment_input)
                enrollment_input.send_keys(enrollment_number)
                
                # Re-select semester in case page was reloaded
                try:
                    semester_dropdown.select_by_value(str(self.semester))
                except Exception as e:
                    semester_dropdown.select_by_visible_text(str(self.semester))
                
                self.driver.execute_script("arguments[0].click();", captcha_input)
                time.sleep(0.5)
                self.driver.execute_script("arguments[0].value = '';", captcha_input)
                captcha_input.send_keys(captcha_text)
                
                # Ensure frontend JS state catches up before submission
                time.sleep(1.0)
                
                # Submit using JS to bypass overlays (ElementClickInterceptedException)
                try:
                    self.driver.execute_script("arguments[0].click();", submit_button)
                    
                    # Wait up to 1.5 seconds for a potential alert to appear
                    WebDriverWait(self.driver, 1.5).until(EC.alert_is_present())
                    alert = self.driver.switch_to.alert
                    alert_text = alert.text
                    self.logger.warning(f"[{enrollment_number}] Alert caught: '{alert_text}'. Refreshing CAPTCHA...")
                    alert.accept()
                    self._refresh_captcha()
                    continue
                except TimeoutException:
                    # No alert appeared, which means submission went through
                    pass
                except UnexpectedAlertPresentException:
                    # Fallback catch just in case it triggers immediately
                    alert = self.driver.switch_to.alert
                    self.logger.warning(f"[{enrollment_number}] Unexpected Alert caught: '{alert.text}'. Refreshing CAPTCHA...")
                    alert.accept()
                    self._refresh_captcha()
                    continue
                
                # Check for success or failure on the next page
                try:
                    # Explicit wait for the correct grading panel ID or the error label
                    WebDriverWait(self.driver, 30).until(
                        lambda d: d.find_elements(By.ID, "ContentPlaceHolder1_pnlGrading") or d.find_elements(By.ID, "lblError")
                    )
                except UnexpectedAlertPresentException:
                    # Catch any delayed alerts during the wait
                    alert = self.driver.switch_to.alert
                    self.logger.warning(f"[{enrollment_number}] Delayed alert caught during wait: '{alert.text}'. Refreshing CAPTCHA...")
                    alert.accept()
                    self._refresh_captcha()
                    continue
                except TimeoutException:
                    self.logger.error(f"[{enrollment_number}] Timeout waiting for response.")
                    self._refresh_captcha()
                    continue

                # Parse the page
                soup = BeautifulSoup(self.driver.page_source, "html.parser")
                
                error_label = soup.find(id="lblError")
                if error_label:
                    err_text = error_label.text.strip().lower()
                    if "invalid captcha" in err_text:
                        self.logger.info(f"[{enrollment_number}] CAPTCHA failed on server side. Refreshing CAPTCHA...")
                        self._refresh_captcha()
                        continue
                    else:
                        # Handles "Record Not Found", "Invalid Enrollment", etc.
                        self.logger.info(f"[{enrollment_number}] Empty or invalid record detected: {error_label.text.strip()}")
                        
                        # Log empty status so it's not repeatedly tried in future runs
                        empty_data = {
                            "Enrollment Number": enrollment_number,
                            "Student Name": "N/A",
                            "Branch": branch_name,
                            "Semester": self.semester,
                            "SGPA": 0.0,
                            "CGPA": 0.0,
                            "Result Status": error_label.text.strip(),
                            "Total Credits": 0,
                            "Earned Credits": 0
                        }
                        try:
                            self.gsheets.update_or_append_student(empty_data)
                        except Exception:
                            pass
                        
                        return None
                        
                # --- DATA EXTRACTION PIPELINE ---
                grading_panel = soup.find(id="ContentPlaceHolder1_pnlGrading")
                if not grading_panel:
                    self.logger.error(f"[{enrollment_number}] Grading panel not found despite no error label. Aborting retry loop for this student.")
                    return None

                def safe_get_text(element_id):
                    element = soup.find(id=element_id)
                    return element.get_text(strip=True) if element else ""

                # Using the exact HTML IDs discovered from the local ASP.NET DOM dumps
                name = safe_get_text("ContentPlaceHolder1_lblNameGrading")
                extracted_branch = safe_get_text("ContentPlaceHolder1_lblBranchGrading") or branch_name
                sgpa = safe_get_text("ContentPlaceHolder1_lblSGPA") or "0.0"
                cgpa = safe_get_text("ContentPlaceHolder1_lblCGPA") or "0.0"  # Assuming ID structure, fallback to 0.0
                result_status = safe_get_text("ContentPlaceHolder1_lblResultNewGrading")
                
                data = {
                    "Enrollment Number": enrollment_number,
                    "Student Name": name,
                    "Branch": extracted_branch,
                    "Semester": self.semester,
                    "SGPA": float(sgpa) if sgpa.replace('.','',1).isdigit() else 0.0,
                    "CGPA": float(cgpa) if cgpa.replace('.','',1).isdigit() else 0.0,
                    "Result Status": result_status,
                    "Total Credits": 0,
                    "Earned Credits": 0
                }

                print("\n================ STUDENT DATA RECOVERY ================")
                print(json.dumps(data, indent=4))
                print("=======================================================\n")
                
                self.logger.info(f"[{enrollment_number}] Successfully scraped data: SGPA {sgpa}")
                
                # Google Sheets Logging Integration
                try:
                    self.gsheets.update_or_append_student(data)
                    self.logger.info(f"[{enrollment_number}] Successfully synced to Google Sheets cloud.")
                except Exception as e:
                    self.logger.error(f"[{enrollment_number}] Critical error syncing to Google Sheets: {e}")

                return data

            except Exception as e:
                self.logger.error(f"[{enrollment_number}] Exception during scrape attempt {attempt + 1}: {e}")
                # Hard pause before immediately firing the next attempt to prevent instant loop burning
                time.sleep(2)
                time.sleep(get_random_delay(3, 6))

        self.logger.error(f"[{enrollment_number}] Failed after {self.max_retries} retries.")
        return None

    def run(self):
        """
        Main execution loop.
        """
        if not self.initialize_session():
            self.logger.error("Could not initialize session. Aborting run.")
            self.driver.quit()
            return

        batches = get_enrollment_batches(self.config)
        for branch_name, enrollments in batches.items():
            self.logger.info(f"Starting batch for branch: {branch_name} ({len(enrollments)} records)")
            
            existing_records = self.gsheets.get_existing_enrollments()
            
            for enrollment in enrollments:
                if enrollment in existing_records:
                    self.logger.info(f"[{enrollment}] Already in Google Sheets. Skipping...")
                    continue
                    
                self.scrape_student(enrollment, branch_name)
                
                # Rate limit between successful/unsuccessful requests
                time.sleep(get_random_delay())

        self.driver.quit()
        self.logger.info("Scraping completed.")

if __name__ == "__main__":
    scraper = MitsScraper()
    scraper.run()