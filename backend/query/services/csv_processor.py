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
    def parse_csv(file_path: str) -> pd.DataFrame:
        try:
            from django.core.files.storage import default_storage
            import io
            
            with default_storage.open(file_path, "rb") as f:
                file_obj = io.BytesIO(f.read())
            
            # Auto-detect delimiter
            df = pd.read_csv(file_obj, sep=None, engine='python')
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
            from django.conf import settings
            from sqlalchemy import create_engine
            
            db_settings = settings.DATABASES['default']
            engine_url = ""
            
            if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
                engine_url = f"sqlite:///{db_settings['NAME']}"
            elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
                user = db_settings.get('USER', '')
                password = db_settings.get('PASSWORD', '')
                host = db_settings.get('HOST', 'localhost')
                port = db_settings.get('PORT', '5432')
                name = db_settings['NAME']
                
                auth = f"{user}:{password}" if user else ""
                auth = f"{auth}@" if auth else ""
                host_port = f"{host}:{port}" if port else host
                
                engine_url = f"postgresql://{auth}{host_port}/{name}"
            
            # If using dj-database-url, the environment variable might also just be accessible
            import os
            if os.getenv("DATABASE_URL") and db_settings['ENGINE'] == 'django.db.backends.postgresql':
                # Use raw DATABASE_URL if available for maximum compatibility (e.g. Neon, Render)
                # Ensure the scheme starts with postgresql:// instead of postgres://
                engine_url = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://", 1)
                
            engine = create_engine(engine_url)
            df.to_sql(name=table_name, con=engine, if_exists="replace", index=False)
            
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
    def process_csv_file(file_path: str, dataset: Dataset) -> Dataset:
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
                
                if connection.vendor == 'sqlite':
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    return [
                        {
                            "name": col[1],
                            "type": col[2],
                            "nullable": not col[3]
                        }
                        for col in columns
                    ]
                elif connection.vendor == 'postgresql':
                    cursor.execute(
                        "SELECT column_name, data_type, is_nullable "
                        "FROM information_schema.columns "
                        "WHERE table_name = %s",
                        [table_name]
                    )
                    columns = cursor.fetchall()
                    return [
                        {
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == 'YES'
                        }
                        for col in columns
                    ]
                else:
                    raise ValueError(f"Unsupported database vendor: {connection.vendor}")
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
