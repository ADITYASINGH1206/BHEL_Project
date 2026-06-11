# /backend/Dockerfile
# Built from the root context of the repository to access all modules

FROM python:3.10-slim

# Set environment variables to prevent Python from writing .pyc files
# and to ensure stdout/stderr are unbuffered.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install chromium, chromium-driver, and required networking tools
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    wget \
    curl \
    unzip \
    gnupg2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Working Directory
WORKDIR /app

# Copy requirements from the root directory
COPY requirements.txt .

# Install Python dependencies
# Note: PyTorch can be very large; for a production docker container, you might want to use the CPU-only version
RUN pip install --no-cache-dir -r requirements.txt

# Copy necessary directories and files from root
COPY backend/ ./backend/
COPY scraper/ ./scraper/
COPY database/ ./database/
COPY config.json .
COPY main.py .

# Expose the API port
EXPOSE 8000

# Command to run the FastAPI app via Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
