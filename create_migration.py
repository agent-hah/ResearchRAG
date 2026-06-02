#!/usr/bin/env python3
"""
Script to create initial Alembic migration
"""
from alembic.config import Config
from alembic import command

# Create Alembic config
alembic_cfg = Config("alembic.ini")

# Generate migration
command.revision(alembic_cfg, message="initial_schema", autogenerate=True)

print("Migration created successfully!")
