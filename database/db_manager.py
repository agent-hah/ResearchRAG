"""
Database manager for SQLite operations
"""
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime
import config


class DatabaseManager:
    """Manages SQLite database operations"""
    
    def __init__(self):
        self.db_path = config.DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize database with schema"""
        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        conn = self.get_connection()
        try:
            conn.executescript(schema_sql)
            conn.commit()
        finally:
            conn.close()
    
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.Connection(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn
    
    # Dataset operations
    def add_dataset(self, name: str, filename: str, row_count: int, 
                   column_count: int, file_size: int, table_name: str) -> int:
        """Add dataset metadata"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                """INSERT INTO datasets 
                   (name, filename, row_count, column_count, file_size_bytes, table_name)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (name, filename, row_count, column_count, file_size, table_name)
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def get_datasets(self) -> List[Dict[str, Any]]:
        """Get all active datasets"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                "SELECT * FROM datasets WHERE status = 'active' ORDER BY upload_date DESC"
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_dataset_by_id(self, dataset_id: int) -> Optional[Dict[str, Any]]:
        """Get dataset by ID"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                "SELECT * FROM datasets WHERE id = ? AND status = 'active'",
                (dataset_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    def delete_dataset(self, dataset_id: int):
        """Soft delete dataset"""
        conn = self.get_connection()
        try:
            # Get table name before deleting
            dataset = self.get_dataset_by_id(dataset_id)
            if dataset:
                # Drop the data table
                conn.execute(f"DROP TABLE IF EXISTS {dataset['table_name']}")
                # Soft delete metadata
                conn.execute(
                    "UPDATE datasets SET status = 'deleted' WHERE id = ?",
                    (dataset_id,)
                )
                conn.commit()
        finally:
            conn.close()
    
    def create_dataset_table(self, table_name: str, df: pd.DataFrame):
        """Create table from DataFrame"""
        conn = self.get_connection()
        try:
            df.to_sql(table_name, conn, if_exists='replace', index=False)
            conn.commit()
        finally:
            conn.close()
    
    def query_dataset(self, sql: str) -> pd.DataFrame:
        """Execute SQL query and return DataFrame"""
        conn = self.get_connection()
        try:
            return pd.read_sql_query(sql, conn)
        finally:
            conn.close()
    
    # Literature operations
    def add_literature(self, filename: str, file_path: str, 
                      page_count: int, file_size: int) -> int:
        """Add literature metadata"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                """INSERT INTO literature 
                   (filename, file_path, page_count, file_size_bytes, processing_status)
                   VALUES (?, ?, ?, ?, 'pending')""",
                (filename, file_path, page_count, file_size)
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def update_literature_status(self, lit_id: int, status: str):
        """Update literature processing status"""
        conn = self.get_connection()
        try:
            conn.execute(
                "UPDATE literature SET processing_status = ? WHERE id = ?",
                (status, lit_id)
            )
            conn.commit()
        finally:
            conn.close()
    
    def get_literature(self) -> List[Dict[str, Any]]:
        """Get all active literature"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                "SELECT * FROM literature WHERE status = 'active' ORDER BY upload_date DESC"
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def delete_literature(self, lit_id: int):
        """Soft delete literature"""
        conn = self.get_connection()
        try:
            conn.execute(
                "UPDATE literature SET status = 'deleted' WHERE id = ?",
                (lit_id,)
            )
            conn.commit()
        finally:
            conn.close()
    
    # Notes operations
    def add_note(self, content: str, tags: str = "", 
                entity_type: str = None, entity_id: int = None) -> int:
        """Add note"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                """INSERT INTO notes 
                   (content, tags, entity_type, entity_id)
                   VALUES (?, ?, ?, ?)""",
                (content, tags, entity_type, entity_id)
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def get_notes(self, entity_type: str = None, entity_id: int = None) -> List[Dict[str, Any]]:
        """Get notes, optionally filtered by entity"""
        conn = self.get_connection()
        try:
            if entity_type and entity_id:
                cursor = conn.execute(
                    """SELECT * FROM notes 
                       WHERE status = 'active' AND entity_type = ? AND entity_id = ?
                       ORDER BY created_at DESC""",
                    (entity_type, entity_id)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM notes WHERE status = 'active' ORDER BY created_at DESC"
                )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def delete_note(self, note_id: int):
        """Soft delete note"""
        conn = self.get_connection()
        try:
            conn.execute(
                "UPDATE notes SET status = 'deleted' WHERE id = ?",
                (note_id,)
            )
            conn.commit()
        finally:
            conn.close()
    
    # Query history operations
    def add_query_history(self, query_text: str, sql_query: str = None,
                         dataset_id: int = None, result_count: int = 0) -> int:
        """Add query to history"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                """INSERT INTO query_history 
                   (query_text, sql_query, dataset_id, result_count)
                   VALUES (?, ?, ?, ?)""",
                (query_text, sql_query, dataset_id, result_count)
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def get_query_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent query history"""
        conn = self.get_connection()
        try:
            cursor = conn.execute(
                "SELECT * FROM query_history ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
