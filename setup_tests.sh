#!/bin/bash

# Research Workspace - Test Setup Script
# This script sets up the testing environment for both backend and frontend

set -e  # Exit on error

echo "========================================="
echo "Research Workspace - Test Setup"
echo "========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $python_version found"
echo ""

# Check Node version
echo "Checking Node version..."
node_version=$(node --version 2>&1)
echo "✓ Node $node_version found"
echo ""

# Backend setup
echo "========================================="
echo "Setting up Backend Tests"
echo "========================================="
echo ""

echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "✓ Backend dependencies installed"
echo ""

# Frontend setup
echo "========================================="
echo "Setting up Frontend Tests"
echo "========================================="
echo ""

echo "Installing Node dependencies..."
cd frontend
npm install
cd ..
echo "✓ Frontend dependencies installed"
echo ""

# Check for API keys
echo "========================================="
echo "Checking Configuration"
echo "========================================="
echo ""

if [ -f ".env" ]; then
    echo "✓ .env file found"
    
    if grep -q "GOOGLE_API_KEY=" .env && ! grep -q "GOOGLE_API_KEY=$" .env && ! grep -q "GOOGLE_API_KEY=your" .env; then
        echo "✓ GOOGLE_API_KEY is configured"
    else
        echo "⚠ GOOGLE_API_KEY not configured in .env"
        echo "  Please add your Google API key to .env file"
    fi
    
    if grep -q "SERPAPI_KEY=" .env && ! grep -q "SERPAPI_KEY=$" .env && ! grep -q "SERPAPI_KEY=your" .env; then
        echo "✓ SERPAPI_KEY is configured (optional)"
    else
        echo "ℹ SERPAPI_KEY not configured (optional)"
        echo "  For real Google Scholar results, get a key from https://serpapi.com/"
    fi
else
    echo "⚠ .env file not found"
    echo "  Creating from .env.example..."
    cp .env.example .env
    echo "  Please edit .env and add your API keys"
fi
echo ""

# Run tests
echo "========================================="
echo "Running Tests"
echo "========================================="
echo ""

echo "Running backend tests..."
if pytest -v --tb=short; then
    echo "✓ Backend tests passed"
else
    echo "⚠ Some backend tests failed (this is normal if API keys are not configured)"
fi
echo ""

echo "Running frontend tests..."
cd frontend
if npm run test:run; then
    echo "✓ Frontend tests passed"
else
    echo "⚠ Some frontend tests failed"
fi
cd ..
echo ""

# Summary
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure API keys in .env file (if not already done)"
echo "2. Run backend tests: pytest -v"
echo "3. Run frontend tests: cd frontend && npm test"
echo "4. Read TESTING_README.md for more information"
echo ""
echo "For real Google Scholar results:"
echo "- Get SerpAPI key from https://serpapi.com/"
echo "- Add to .env: SERPAPI_KEY=your_key"
echo ""
echo "Free alternatives (no API key needed):"
echo "- Semantic Scholar (automatic)"
echo "- CrossRef (automatic)"
echo ""
