"""
Configuration management for Research Workspace MVP
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application Settings
APP_NAME = "Research Workspace MVP"
APP_VERSION = "0.1.0"

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "research.db"
CHROMA_DIR = DATA_DIR / "chroma_db"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)
CHROMA_DIR.mkdir(exist_ok=True)

# Database Settings
DATABASE_URL = f"sqlite:///{DB_PATH}"

# File Upload Settings
MAX_FILE_SIZE_MB = 100
ALLOWED_CSV_EXTENSIONS = [".csv"]
ALLOWED_PDF_EXTENSIONS = [".pdf"]

# RAG Settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
TOP_K_RETRIEVAL = 3
EMBEDDING_MODEL = "models/gemini-embedding-001"

# LLM Settings
LLM_MODEL = "gemini-pro"
LLM_TEMPERATURE = 0.1
MAX_TOKENS = 2048

# Visualization Settings
DEFAULT_CHART_HEIGHT = 500
DEFAULT_CHART_WIDTH = 800
