import argparse
import os
import sys
from dotenv import load_dotenv

# Ensure the root directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_scraper(semester=None):
    """Initializes and executes the MitsScraper."""
    from scraper.scraper import MitsScraper
    
    scraper = MitsScraper()
    
    # Override configuration if semester is provided
    if semester is not None:
        scraper.semester = semester
        scraper.logger.info(f"Orchestrator overridden target semester to: {semester}")
    
    try:
        scraper.run()
    except KeyboardInterrupt:
        print("\nScraping gracefully interrupted by user.")
    except Exception as e:
        print(f"\nCritical error during scraper execution: {e}")
    finally:
        if hasattr(scraper, 'driver') and scraper.driver:
            scraper.driver.quit()

def step_scrape(semester=None):
    """Pipeline Step: Executes the web scraping data collection phase."""
    print("==========================================")
    print("  PIPELINE STEP: Web Scraping & OCR")
    print("==========================================")
    run_scraper(semester=semester)

def main():
    parser = argparse.ArgumentParser(description="MITS University Data Pipeline Orchestrator")
    parser.add_argument('--semester', type=str, default=None, help="Specify the semester target, e.g., 4")
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()
    
    # Determine the semester using the fallback hierarchy:
    # 1. CLI Argument (--semester)
    # 2. Environment Variable (.env)
    # 3. Config.json (Handled natively inside MitsScraper initialization if None)
    semester = args.semester
    if not semester:
        semester = os.getenv("SEMESTER")
        
    # Execute the scraping step
    step_scrape(semester=semester)

if __name__ == "__main__":
    main()
