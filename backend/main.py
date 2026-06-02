"""
FastAPI application entry point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from backend.config import settings
from backend.database import init_db
from backend.api import health, files, rag, query, refinement, notes, annotations, document_suggestions, export, ara_mock
from backend.utils.logger import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting Research Workspace API...")
    logger.info(f"Environment: {'Development' if settings.DEBUG else 'Production'}")
    
    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Research Workspace API...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-driven data engineering workspace for researchers",
    lifespan=lifespan,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for unhandled errors
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Include routers
app.include_router(health.router, prefix=settings.API_V1_PREFIX, tags=["health"])
app.include_router(files.router, prefix=settings.API_V1_PREFIX, tags=["files"])
app.include_router(rag.router, prefix=settings.API_V1_PREFIX, tags=["rag"])
app.include_router(query.router, prefix=settings.API_V1_PREFIX, tags=["query"])
app.include_router(refinement.router, prefix=settings.API_V1_PREFIX, tags=["refinement"])
app.include_router(notes.router, prefix=settings.API_V1_PREFIX, tags=["notes"])
app.include_router(annotations.router, prefix=settings.API_V1_PREFIX, tags=["annotations"])
app.include_router(document_suggestions.router, prefix=settings.API_V1_PREFIX, tags=["suggestions"])
app.include_router(export.router, prefix=settings.API_V1_PREFIX, tags=["export"])
app.include_router(ara_mock.router, tags=["ara"])


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
