"""
CSV processing service for parsing and storing CSV data (Django ORM).
"""
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
import json

from django.db import connection
from rag.models import Dataset

import logging
logger = logging.getLogger(__name__)

class CSVProcessor:
    """Service for processing CSV files."""
    
    @staticmethod
    def parse_csv(file_path: Path) -> pd.DataFrame:
        try:
            # Auto-detect delimiter
            df = pd.read_csv(file_path, sep=None, engine='python')
            logger.info(f"Parsed CSV: {file_path} - {len(df)} rows, {len(df.columns)} columns")
            return df
        except Exception as e:
            logger.error(f"Error parsing CSV {file_path}: {str(e)}")
            raise ValueError(f"Failed to parse CSV: {str(e)}")
    
    @staticmethod
    def generate_table_name(filename: str, dataset_id: int) -> str:
        base_name = Path(filename).stem
        safe_name = "".join(c if c.isalnum() else "_" for c in base_name)
        table_name = f"dataset_{dataset_id}_{safe_name}".lower()
        if not table_name[0].isalpha():
            table_name = f"d_{table_name}"
        return table_name
    
    @staticmethod
    def store_in_database(df: pd.DataFrame, table_name: str) -> Dict[str, Any]:
        try:
            # For sqlite3, we can use Django's underlying sqlite connection or just sqlalchemy if needed.
            # Pandas to_sql supports sqlite3 connection object.
            # However, using sqlalchemy is more robust if we switch DBs. We will use django's connection.
            with connection.cursor() as cursor:
                # To make it compatible with pandas we get the raw connection
                raw_conn = connection.connection
                df.to_sql(name=table_name, con=raw_conn, if_exists="replace", index=False)
            
            logger.info(f"Stored DataFrame in table: {table_name}")
            return {
                "table_name": table_name,
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": df.columns.tolist()
            }
        except Exception as e:
            logger.error(f"Error storing DataFrame in database: {str(e)}")
            raise ValueError(f"Failed to store data in database: {str(e)}")
    
    @staticmethod
    def update_dataset_metadata(dataset: Dataset, metadata: Dict[str, Any]) -> Dataset:
        dataset.table_name = metadata["table_name"]
        dataset.row_count = metadata["row_count"]
        dataset.column_count = metadata["column_count"]
        dataset.columns_json = json.dumps(metadata["columns"])
        dataset.save()
        logger.info(f"Updated dataset metadata: {dataset.id}")
        return dataset
    
    @staticmethod
    def process_csv_file(file_path: Path, dataset: Dataset) -> Dataset:
        try:
            df = CSVProcessor.parse_csv(file_path)
            table_name = CSVProcessor.generate_table_name(dataset.filename, dataset.id)
            metadata = CSVProcessor.store_in_database(df, table_name)
            dataset = CSVProcessor.update_dataset_metadata(dataset, metadata)
            logger.info(f"Successfully processed CSV: {dataset.id} - {dataset.filename}")
            return dataset
        except Exception as e:
            logger.error(f"Error processing CSV file: {str(e)}")
            raise
    
    @staticmethod
    def get_table_preview(table_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            with connection.cursor() as cursor:
                # Basic protection against SQL injection on table name
                if not table_name.isidentifier():
                    raise ValueError("Invalid table name")
                
                cursor.execute(f"SELECT * FROM {table_name} LIMIT %s", [limit])
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
                return rows
        except Exception as e:
            logger.error(f"Error getting table preview: {str(e)}")
            raise ValueError(f"Failed to get table preview: {str(e)}")
    
    @staticmethod
    def get_table_schema(table_name: str) -> List[Dict[str, str]]:
        try:
            with connection.cursor() as cursor:
                if not table_name.isidentifier():
                    raise ValueError("Invalid table name")
                
                # Using PRAGMA table_info for SQLite
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                # Pragma columns: cid, name, type, notnull, dflt_value, pk
                return [
                    {
                        "name": col[1],
                        "type": col[2],
                        "nullable": not col[3]
                    }
                    for col in columns
                ]
        except Exception as e:
            logger.error(f"Error getting table schema: {str(e)}")
            raise ValueError(f"Failed to get table schema: {str(e)}")

    @staticmethod
    def drop_table(table_name: str) -> None:
        try:
            with connection.cursor() as cursor:
                if not table_name.isidentifier():
                    raise ValueError("Invalid table name")
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            logger.info(f"Dropped table: {table_name}")
        except Exception as e:
            logger.error(f"Error dropping table {table_name}: {str(e)}")
            raise
