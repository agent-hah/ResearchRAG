#!/usr/bin/env python3
"""
Quick Database Reset (No Confirmation)

Immediately resets the database without prompting.
Use this when you're sure you want to reset.
"""
import os
import sys
import shutil
from pathlib import Path
from alembic.config import Config
from alembic import command

def quick_reset():
    """Reset database without confirmation"""
    
    print("🔄 Quick Database Reset")
    print("=" * 60)
    
    # Delete database files
    db_paths = ["data/research.db", "data/research_workspace.db"]
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"🗑️  Deleting: {db_path}")
            try:
                os.remove(db_path)
                print(f"✅ Deleted")
            except Exception as e:
                print(f"❌ Error: {e}")
                print("   Stop the backend server first!")
                return False
    
    # Clean cache
    alembic_cache = Path("alembic/versions/__pycache__")
    if alembic_cache.exists():
        shutil.rmtree(alembic_cache)
    
    # Initialize database
    print("\n🏗️  Creating fresh database...")
    try:
        from backend.database import Base, engine
        Base.metadata.create_all(bind=engine)
        
        # Stamp with current migration
        alembic_cfg = Config("alembic.ini")
        command.stamp(alembic_cfg, "head")
        
        print("✅ Database created and stamped")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    print("\n✨ Done! Start the backend server: python3 app.py")
    return True

if __name__ == "__main__":
    success = quick_reset()
    sys.exit(0 if success else 1)
