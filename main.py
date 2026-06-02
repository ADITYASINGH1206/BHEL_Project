import argparse
import os
import sys
from dotenv import load_dotenv

# Ensure the root directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_scraper(semester=None, branch=None, start=None, end=None):
    """Initializes and executes the MitsScraper."""
    from scraper.scraper import MitsScraper
    
    scraper = MitsScraper()
    
    # Override configuration if arguments are provided
    if semester is not None:
        scraper.semester = semester
        scraper.logger.info(f"Orchestrator overridden target semester to: {semester}")
        
    if branch and branch != "All":
        # Parse comma-separated branches
        target_branches = [b.strip() for b in branch.split(",")]
        # Keep only the targeted branches
        scraper.config["branches"] = [b for b in scraper.config["branches"] if b["name"] in target_branches]
        if not scraper.config["branches"]:
            scraper.logger.error(f"None of the branches {target_branches} were found in config.json. Aborting.")
            return
            
    if start is not None and end is not None:
        # Override the start/end ranges for all active branches
        for b in scraper.config["branches"]:
            b["start_range"] = start
            b["end_range"] = end
        scraper.logger.info(f"Orchestrator overridden target range to: {start} - {end}")
    
    try:
        scraper.run()
    except KeyboardInterrupt:
        print("\nScraping gracefully interrupted by user.")
    except Exception as e:
        print(f"\nCritical error during scraper execution: {e}")
    finally:
        if hasattr(scraper, 'driver') and scraper.driver:
            scraper.driver.quit()

def step_scrape(semester=None, branch=None, start=None, end=None):
    """Pipeline Step: Executes the web scraping data collection phase."""
    print("==========================================")
    print("  PIPELINE STEP: Web Scraping & OCR")
    print("==========================================")
    run_scraper(semester=semester, branch=branch, start=start, end=end)

def main():
    parser = argparse.ArgumentParser(description="MITS University Data Pipeline Orchestrator")
    parser.add_argument('--semester', type=str, default=None, help="Specify the semester target, e.g., 4")
    parser.add_argument('--branch', type=str, default=None, help="Target a specific branch or 'All'")
    parser.add_argument('--start', type=int, default=None, help="Start index for enrollment numbers")
    parser.add_argument('--end', type=int, default=None, help="End index for enrollment numbers")
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()
    
    semester = args.semester if args.semester else os.getenv("SEMESTER")
        
    # Execute the scraping step
    step_scrape(
        semester=semester,
        branch=args.branch,
        start=args.start,
        end=args.end
    )

if __name__ == "__main__":
    main()
