#!/usr/bin/env python3
"""
Ultra-Fast Ara Setup Script
Sets up Ara integration in 2 hours
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} - Success")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} - Failed")
            if result.stderr.strip():
                print(f"   Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ {description} - Exception: {e}")
        return False

def check_requirements():
    """Check if all requirements are met."""
    print("🔍 Checking requirements...")
    
    # Check if backend files exist
    if not Path("backend/main.py").exists():
        print("❌ Backend files not found. Make sure you're in the project root.")
        return False
    
    print("✅ Backend files found")
    
    # Check if ara-sdk is installed
    try:
        import ara_sdk
        print("✅ ara-sdk is installed")
    except ImportError:
        print("❌ ara-sdk not found. Installing...")
        if not run_command("pip install ara-sdk", "Installing ara-sdk"):
            return False
    
    return True

def setup_environment():
    """Set up environment variables."""
    print("🔧 Setting up environment...")
    
    env_file = Path(".env")
    env_content = ""
    
    if env_file.exists():
        env_content = env_file.read_text()
    
    # Add Ara environment variables if not present
    ara_vars = [
        "# Ara Integration Settings",
        "ARA_API_KEY=your_ara_api_key_here",
        "ARA_RUNTIME_KEY=your_ara_runtime_key_here"
    ]
    
    needs_update = False
    for var in ara_vars:
        if var not in env_content:
            env_content += f"\n{var}"
            needs_update = True
    
    if needs_update:
        env_file.write_text(env_content)
        print("✅ Updated .env file with Ara settings")
        print("⚠️  Please update ARA_API_KEY and ARA_RUNTIME_KEY in .env file")
    else:
        print("✅ Environment variables already configured")

def test_ara_integration():
    """Test the Ara integration."""
    print("🧪 Testing Ara integration...")
    
    # Test ara_app.py syntax
    if run_command("python -m py_compile ara_app.py", "Checking ara_app.py syntax"):
        print("✅ ara_app.py syntax is valid")
    else:
        return False
    
    # Test backend startup script
    if run_command("python -m py_compile start_backend.py", "Checking start_backend.py syntax"):
        print("✅ start_backend.py syntax is valid")
    else:
        return False
    
    print("✅ All files are ready")
    return True

def main():
    """Main setup function."""
    print("🚀 Ultra-Fast Ara Integration Setup")
    print("=" * 40)
    
    # Check requirements
    if not check_requirements():
        print("\n❌ Requirements check failed. Please fix the issues above.")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Test integration
    if not test_ara_integration():
        print("\n❌ Integration test failed. Please check the errors above.")
        sys.exit(1)
    
    print("\n🎉 Ara Integration Setup Complete!")
    print("\nNext steps:")
    print("1. Start the backend: python start_backend.py")
    print("2. Update ARA_API_KEY and ARA_RUNTIME_KEY in .env file")
    print("3. Authenticate with Ara: ara auth login")
    print("4. Deploy the app: ara deploy ara_app.py")
    print("5. Test manual trigger: ara run ara_app.py research_assistant")
    print("\nAPI Endpoints available:")
    print("- GET  /api/ara/status   - Check integration status")
    print("- POST /api/ara/deploy   - Deploy Ara app")
    print("- POST /api/ara/trigger  - Trigger manual analysis")
    print("- GET  /api/ara/logs     - View execution logs")
    print("\nThe daily analysis agent will run automatically at 9 AM once deployed!")

if __name__ == "__main__":
    main()