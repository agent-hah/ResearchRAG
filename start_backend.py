#!/usr/bin/env python3
"""
Backend startup script that works with current project structure
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Only print startup message once (not on reload)
if not os.environ.get('UVICORN_RELOADING'):
    print("🚀 Starting Research Workspace Backend...")
    print("📍 Backend will be available at: http://localhost:8000")
    print("📊 API docs available at: http://localhost:8000/docs")

# Import and run uvicorn
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )