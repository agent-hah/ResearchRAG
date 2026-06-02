#!/usr/bin/env python3
"""
Simple Database Reset (No Alembic)

Resets the database using SQLAlchemy directly.
"""
import os
import sys
from pathlib import Path

def simple_reset():
    """Reset database using SQLAlchemy"""
    
    print("🔄 Simple Database Reset")
    print("=" * 60)
    
    # Delete database files
    db_paths = ["data/research.db", "data/research_workspace.db"]
    deleted = False
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"🗑️  Deleting: {db_path}")
            try:
                os.remove(db_path)
                print(f"✅ Deleted")
                deleted = True
            except Exception as e:
                print(f"❌ Error: {e}")
                print("   Make sure the backend server is stopped!")
                return False
    
    if not deleted:
        print("📊 No existing database found")
    
    # Create fresh database
    print("\n🏗️  Creating fresh database...")
    try:
        # Import after deletion to ensure fresh connection
        from backend.database import Base, engine
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database created successfully")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"\n📋 Created {len(tables)} tables:")
        for table in sorted(tables):
            print(f"   - {table}")
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✨ Database reset complete!")
    print("\nNext steps:")
    print("1. Start backend: python3 app.py")
    print("2. Open frontend: http://localhost:3000")
    print("3. Upload files to test")
    
    return True

if __name__ == "__main__":
    success = simple_reset()
    sys.exit(0 if success else 1)
