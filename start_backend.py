#!/usr/bin/env python3
"""
Backend startup script for Django backend
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("🚀 Starting Research Workspace Backend (Django)...")
print("📍 Backend will be available at: http://localhost:8000")

if __name__ == "__main__":
    os.system("python backend/manage.py runserver 0.0.0.0:8000")