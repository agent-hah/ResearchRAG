#!/bin/bash
# Simple Database Reset Script
# Usage: ./reset_db.sh

echo "🔄 Database Reset"
echo "============================================================"

# Check if backend is running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  WARNING: Backend server is running on port 8000"
    echo "   Please stop it first (Ctrl+C in the terminal running it)"
    exit 1
fi

# Delete database files
echo "🗑️  Deleting database files..."
rm -f data/research.db data/research_workspace.db
echo "✅ Database files deleted"

# Clean Alembic cache
echo ""
echo "🧹 Cleaning Alembic cache..."
rm -rf alembic/versions/__pycache__
echo "✅ Cache cleaned"

echo ""
echo "✨ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Start backend: python3 app.py"
echo "2. The database will be automatically created on first request"
echo "3. Open http://localhost:3000 to test"
