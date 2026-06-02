# Research Workspace Backend

FastAPI backend for the Research Workspace application.

## Architecture

### Core Components

- **FastAPI Application** (`main.py`): Entry point with CORS, routing, and error handling
- **Database Layer** (`database.py`): SQLAlchemy session management and connection pooling
- **Models** (`models/`): SQLAlchemy ORM models for all entities
- **API Routes** (`api/`): REST API endpoints organized by feature
- **Schemas** (`schemas/`): Pydantic models for request/response validation
- **Configuration** (`config.py`): Centralized settings management with environment variables
- **Utilities** (`utils/`): Logging, helpers, and shared utilities

### Database Models

1. **Dataset**: CSV dataset metadata and table references
2. **Literature**: PDF literature metadata and processing status
3. **Note**: Notes and annotations with entity relationships
4. **QueryHistory**: Query execution history and results

### API Structure

```
/api/v1
├── /health          # Health check endpoints
├── /upload          # File upload endpoints (future)
├── /datasets        # Dataset management (future)
├── /literature      # Literature management (future)
├── /query           # Query processing (future)
├── /visualization   # Visualization generation (future)
├── /notes           # Notes management (future)
└── /export          # Export operations (future)
```

## Setup

### Prerequisites

- Python 3.10+
- pip or uv package manager

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or with uv
uv pip install -r requirements.txt
```

### Configuration

Create a `.env` file in the project root:

```env
# API Configuration
DEBUG=True

# Database
DATABASE_URL=sqlite:///./data/research.db

# LLM Configuration
GEMINI_API_KEY=your_api_key_here

# Optional: Override defaults
MAX_FILE_SIZE_MB=100
LLM_TEMPERATURE=0.1
```

### Database Migrations

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create a new migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Running the Server

### Development Mode

```bash
# Run with auto-reload
python -m backend.main

# Or with uvicorn directly
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
# Set DEBUG=False in .env
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Testing

```bash
# Run tests (future)
pytest

# Run with coverage
pytest --cov=backend --cov-report=html
```

## Project Structure

```
backend/
├── __init__.py           # Package initialization
├── main.py               # FastAPI application entry point
├── config.py             # Configuration management
├── database.py           # Database connection and session
├── api/                  # API route handlers
│   ├── __init__.py
│   └── health.py         # Health check endpoints
├── models/               # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── base.py           # Base model with common fields
│   ├── dataset.py        # Dataset model
│   ├── literature.py     # Literature model
│   ├── note.py           # Note model
│   └── query_history.py  # Query history model
├── schemas/              # Pydantic schemas
│   ├── __init__.py
│   └── common.py         # Common response schemas
├── services/             # Business logic (future)
├── repositories/         # Data access layer (future)
└── utils/                # Utilities
    ├── __init__.py
    └── logger.py         # Logging configuration
```

## Development Guidelines

### Adding New Endpoints

1. Create route handler in `api/` directory
2. Define Pydantic schemas in `schemas/`
3. Implement business logic in `services/`
4. Register router in `main.py`

### Database Changes

1. Modify models in `models/`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review and edit migration file
4. Apply migration: `alembic upgrade head`

### Error Handling

- Use FastAPI's `HTTPException` for expected errors
- Global exception handler catches unhandled errors
- Return consistent error format via `ErrorResponse` schema

### Logging

- Logs written to `logs/app.log`
- Console output for development
- Configure log level via `DEBUG` setting

## Next Steps

This is the core infrastructure. Future units will add:

1. **File Management API** - Upload and validation endpoints
2. **RAG Pipeline API** - Literature processing and retrieval
3. **Query Processing API** - Natural language to SQL
4. **Visualization API** - Chart generation and refinement
5. **Notes API** - Note management with graph relationships
6. **Export API** - Data and visualization export

## License

MIT
