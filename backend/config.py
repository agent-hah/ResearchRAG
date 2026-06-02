"""
Configuration management for Research Workspace backend
"""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Research Workspace API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./data/research.db"
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    CHROMA_DB_DIR: Path = DATA_DIR / "chroma_db"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 104857600  # 100MB in bytes
    
    # LLM Settings
    GOOGLE_API_KEY: str = ""  # For Gemini Pro
    GEMINI_API_KEY: str = ""  # Alias for backward compatibility
    GEMINI_MODEL: str = "gemini-pro"
    EMBEDDING_MODEL: str = "models/embedding-001"
    LLM_TEMPERATURE: float = 0.1
    
    # Search API Settings
    SERPAPI_KEY: Optional[str] = None  # For Google Scholar via SerpAPI (optional)
    
    # RAG Settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    CHROMA_COLLECTION: str = "research_literature"
    
    # Ara Integration Settings
    ARA_API_KEY: Optional[str] = None  # For Ara cloud services
    ARA_RUNTIME_KEY: Optional[str] = None  # For Ara runtime authentication
    ARA_APP_HEADER_KEY: Optional[str] = None  # For Ara app-specific authentication
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        self.DATA_DIR.mkdir(exist_ok=True)
        self.UPLOAD_DIR.mkdir(exist_ok=True)
        self.CHROMA_DB_DIR.mkdir(exist_ok=True)
        
        # Handle GOOGLE_API_KEY alias
        if not self.GOOGLE_API_KEY and self.GEMINI_API_KEY:
            self.GOOGLE_API_KEY = self.GEMINI_API_KEY
        elif self.GOOGLE_API_KEY and not self.GEMINI_API_KEY:
            self.GEMINI_API_KEY = self.GOOGLE_API_KEY


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get settings instance"""
    return settings
