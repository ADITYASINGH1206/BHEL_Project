import os
import json
import time
import random
import logging

def setup_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

def get_random_delay(min_seconds=2, max_seconds=4):
    """Returns a random delay to prevent rate-limiting."""
    return random.uniform(min_seconds, max_seconds)

def load_config(config_path="config.json"):
    """Loads the external configuration file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found: {config_path}")
    with open(config_path, "r") as f:
        return json.load(f)

def generate_enrollment_numbers(prefix, year_code, start_idx, end_idx):
    """
    Generates a list of enrollment numbers.
    Example: prefix="BTAD", year_code="24O", start_idx=1001, end_idx=1070
    Result: BTAD24O1001 to BTAD24O1070
    """
    enrollments = []
    base_prefix = f"{prefix}{year_code}"
    for i in range(start_idx, end_idx + 1):
        enrollments.append(f"{base_prefix}{i}")
    return enrollments

def get_enrollment_batches(config):
    """
    Reads the config and returns batches of enrollment numbers per branch.
    """
    batches = {}
    for branch in config.get("branches", []):
        branch_name = branch.get("name")
        enrollments = generate_enrollment_numbers(
            branch.get("prefix"),
            branch.get("year_code"),
            branch.get("start_range"),
            branch.get("end_range")
        )
        batches[branch_name] = enrollments
    return batches
