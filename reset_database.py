#!/usr/bin/env python3
"""
Simple Database Reset Script

This script completely resets the database by:
1. Deleting the existing database file
2. Deleting the Alembic version table state
3. Running migrations from scratch

Usage:
    python3 reset_database.py
"""
import os
import sys
import shutil
from pathlib import Path
from alembic.config import Config
from alembic import command

def reset_database():
    """Reset database completely"""
    
    print("🔄 Database Reset Script")
    print("=" * 60)
    
    # Step 1: Delete database files
    db_paths = ["data/research.db", "data/research_workspace.db"]
    deleted_any = False
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"🗑️  Deleting database: {db_path}")
            try:
                os.remove(db_path)
                print(f"✅ Deleted: {db_path}")
                deleted_any = True
            except Exception as e:
                print(f"❌ Error deleting {db_path}: {e}")
                print("   Please stop the backend server and try again")
                return False
    
    if not deleted_any:
        print("📊 No existing database found")
    
    # Step 2: Delete Alembic version cache
    alembic_cache = Path("alembic/versions/__pycache__")
    if alembic_cache.exists():
        print(f"\n🗑️  Cleaning Alembic cache...")
        try:
            shutil.rmtree(alembic_cache)
            print("✅ Cache cleaned")
        except Exception as e:
            print(f"⚠️  Warning: Could not clean cache: {e}")
    
    # Step 3: Stamp the database as being at base (no migrations applied)
    print("\n🔧 Initializing Alembic state...")
    try:
        alembic_cfg = Config("alembic.ini")
        
        # First, ensure database exists by importing models
        print("📦 Importing database models...")
        from backend.database import Base, engine
        
        # Create all tables using SQLAlchemy (this creates the database file)
        print("🏗️  Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created")
        
        # Now stamp it with the current migration
        print("\n📝 Stamping database with current migration...")
        command.stamp(alembic_cfg, "head")
        print("✅ Database stamped successfully")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✨ Database reset completed successfully!")
    print("\nNext steps:")
    print("1. Start the backend server: python3 app.py")
    print("2. Test the application at http://localhost:3000")
    print("3. Upload files to verify everything works")
    
    return True

if __name__ == "__main__":
    print("\n⚠️  WARNING: This will DELETE all data in the database!")
    print("Press Ctrl+C to cancel, or Enter to continue...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
    
    print()
    success = reset_database()
    sys.exit(0 if success else 1)
