"""
CSV processing service for parsing and storing CSV data.
"""
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.dataset import Dataset
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class CSVProcessor:
    """Service for processing CSV files."""
    
    @staticmethod
    def parse_csv(file_path: Path) -> pd.DataFrame:
        """
        Parse CSV file into DataFrame.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            Pandas DataFrame
        """
        try:
            df = pd.read_csv(file_path)
            logger.info(f"Parsed CSV: {file_path} - {len(df)} rows, {len(df.columns)} columns")
            return df
        except Exception as e:
            logger.error(f"Error parsing CSV {file_path}: {str(e)}")
            raise ValueError(f"Failed to parse CSV: {str(e)}")
    
    @staticmethod
    def generate_table_name(filename: str, dataset_id: int) -> str:
        """
        Generate unique table name for dataset.
        
        Args:
            filename: Original filename
            dataset_id: Dataset ID
            
        Returns:
            Table name
        """
        # Remove extension and special characters
        base_name = Path(filename).stem
        safe_name = "".join(c if c.isalnum() else "_" for c in base_name)
        table_name = f"dataset_{dataset_id}_{safe_name}".lower()
        
        # Ensure it starts with a letter
        if not table_name[0].isalpha():
            table_name = f"d_{table_name}"
        
        return table_name
    
    @staticmethod
    def store_in_database(
        df: pd.DataFrame,
        table_name: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Store DataFrame in SQLite database.
        
        Args:
            df: Pandas DataFrame
            table_name: Name for the table
            db: Database session
            
        Returns:
            Dictionary with storage metadata
        """
        try:
            # Create engine from session
            engine = db.get_bind()
            
            # Store DataFrame as table
            df.to_sql(
                name=table_name,
                con=engine,
                if_exists="replace",
                index=False
            )
            
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
    def update_dataset_metadata(
        db: Session,
        dataset: Dataset,
        metadata: Dict[str, Any]
    ) -> Dataset:
        """
        Update dataset with processing metadata.
        
        Args:
            db: Database session
            dataset: Dataset instance
            metadata: Processing metadata
            
        Returns:
            Updated Dataset instance
        """
        dataset.table_name = metadata["table_name"]
        dataset.row_count = metadata["row_count"]
        dataset.column_count = metadata["column_count"]
        dataset.columns = metadata["columns"]
        
        db.commit()
        db.refresh(dataset)
        
        logger.info(f"Updated dataset metadata: {dataset.id}")
        return dataset
    
    @staticmethod
    def process_csv_file(
        file_path: Path,
        dataset: Dataset,
        db: Session
    ) -> Dataset:
        """
        Complete CSV processing pipeline.
        
        Args:
            file_path: Path to CSV file
            dataset: Dataset instance
            db: Database session
            
        Returns:
            Updated Dataset instance
        """
        try:
            # Parse CSV
            df = CSVProcessor.parse_csv(file_path)
            
            # Generate table name
            table_name = CSVProcessor.generate_table_name(dataset.filename, dataset.id)
            
            # Store in database
            metadata = CSVProcessor.store_in_database(df, table_name, db)
            
            # Update dataset metadata
            dataset = CSVProcessor.update_dataset_metadata(db, dataset, metadata)
            
            logger.info(f"Successfully processed CSV: {dataset.id} - {dataset.filename}")
            return dataset
            
        except Exception as e:
            logger.error(f"Error processing CSV file: {str(e)}")
            raise
    
    @staticmethod
    def get_table_preview(
        table_name: str,
        db: Session,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get preview of data from table.
        
        Args:
            table_name: Name of the table
            db: Database session
            limit: Maximum number of rows
            
        Returns:
            List of row dictionaries
        """
        try:
            query = text(f"SELECT * FROM {table_name} LIMIT :limit")
            result = db.execute(query, {"limit": limit})
            
            # Convert to list of dicts
            columns = result.keys()
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
            
            return rows
            
        except Exception as e:
            logger.error(f"Error getting table preview: {str(e)}")
            raise ValueError(f"Failed to get table preview: {str(e)}")
    
    @staticmethod
    def get_table_schema(table_name: str, db: Session) -> List[Dict[str, str]]:
        """
        Get schema information for a table.
        
        Args:
            table_name: Name of the table
            db: Database session
            
        Returns:
            List of column information dictionaries
        """
        try:
            engine = db.get_bind()
            inspector = inspect(engine)
            
            columns = inspector.get_columns(table_name)
            
            return [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True)
                }
                for col in columns
            ]
            
        except Exception as e:
            logger.error(f"Error getting table schema: {str(e)}")
            raise ValueError(f"Failed to get table schema: {str(e)}")
