#!/usr/bin/env python3
"""
Database Schema Fix Script

This script fixes the database schema mismatch by:
1. Optionally deleting the existing database
2. Creating an initial Alembic migration
3. Applying the migration to create the correct schema

Usage:
    python3 fix_database.py [--keep-data]

Options:
    --keep-data    Keep existing database and add missing columns
    (default)      Delete database and create fresh schema
"""
import os
import sys
from alembic.config import Config
from alembic import command

def fix_database(keep_data=False):
    """Fix database schema using Alembic migrations"""
    
    # Database paths to check
    db_paths = ["data/research.db", "data/research_workspace.db"]
    
    # Find existing database
    existing_db = None
    for db_path in db_paths:
        if os.path.exists(db_path):
            existing_db = db_path
            break
    
    # Handle database deletion if requested
    if not keep_data and existing_db:
        print(f"🗑️  Deleting existing database: {existing_db}")
        try:
            os.remove(existing_db)
            print("✅ Database deleted successfully")
        except Exception as e:
            print(f"❌ Error deleting database: {e}")
            print("Please stop the backend server and try again")
            return False
    elif existing_db:
        print(f"📊 Keeping existing database: {existing_db}")
    else:
        print("📊 No existing database found - will create new one")
    
    # Create Alembic config
    print("\n🔧 Setting up Alembic configuration...")
    try:
        alembic_cfg = Config("alembic.ini")
    except Exception as e:
        print(f"❌ Error loading alembic.ini: {e}")
        print("Make sure you're running this script from the project root directory")
        return False
    
    # Create migration
    migration_message = "add_missing_columns" if keep_data else "initial_schema"
    print(f"\n📝 Creating migration: {migration_message}...")
    try:
        command.revision(alembic_cfg, message=migration_message, autogenerate=True)
        print("✅ Migration created successfully")
    except Exception as e:
        print(f"❌ Error creating migration: {e}")
        return False
    
    # Apply migration
    print("\n⬆️  Applying migration to database...")
    try:
        command.upgrade(alembic_cfg, "head")
        print("✅ Migration applied successfully")
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        return False
    
    print("\n✨ Database schema updated successfully!")
    print("\nNext steps:")
    print("1. Start the backend server: python3 app.py")
    print("2. Test the application at http://localhost:3000")
    print("3. Try uploading a file to verify everything works")
    
    return True

if __name__ == "__main__":
    # Check for --keep-data flag
    keep_data = "--keep-data" in sys.argv
    
    if keep_data:
        print("🔄 Running in KEEP DATA mode - will preserve existing database")
    else:
        print("🆕 Running in FRESH START mode - will delete existing database")
        print("   (Use --keep-data flag to preserve existing data)")
    
    print("\n" + "="*60)
    
    # Run the fix
    success = fix_database(keep_data=keep_data)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
