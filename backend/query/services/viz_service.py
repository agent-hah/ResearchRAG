"""
Visualization service for preparing data for charts and maps.
"""
from typing import List, Dict, Any, Optional
import pandas as pd
from pathlib import Path

from query.services.csv_processor import CSVProcessor
from files.services.file_service import FileService
import logging

logger = logging.getLogger(__name__)


class VizService:
    """Service for processing data for visualizations."""
    
    @staticmethod
    def get_viz_data(dataset: Any, limit: int = 1000) -> Dict[str, Any]:
        """
        Get data for visualization from a dataset.
        
        Args:
            dataset: The Dataset object
            limit: Maximum number of rows to retrieve
            
        Returns:
            Dictionary with columns and row data
        """
        if not dataset:
            raise ValueError("Dataset not provided")
            
        if not dataset.table_name or dataset.row_count == 0:
            # Try to process it if not already processed
            file_path = Path(dataset.file_path)
            if not file_path.exists():
                raise ValueError(f"File not found on disk: {dataset.file_path}")
            
            logger.info(f"Dataset {dataset.id} not yet processed, processing now...")
            dataset = CSVProcessor.process_csv_file(file_path, dataset)
            
        # Get data from table
        rows = CSVProcessor.get_table_preview(dataset.table_name, limit)
        schema = CSVProcessor.get_table_schema(dataset.table_name)
        
        # Format for charts
        columns = [col["name"] for col in schema]
        
        # Simple auto-detection of column types
        column_types = {}
        if rows:
            df = pd.DataFrame(rows)
            for col in columns:
                # Check for numeric types (including boolean)
                if pd.api.types.is_numeric_dtype(df[col]):
                    if pd.api.types.is_bool_dtype(df[col]) or set(df[col].unique()) <= {0, 1, True, False}:
                        column_types[col] = "boolean"
                    else:
                        column_types[col] = "numeric"
                # Check for datetime types
                elif pd.api.types.is_datetime64_any_dtype(df[col]):
                    column_types[col] = "datetime"
                else:
                    # Try to infer datetime from string
                    try:
                        # Only try if it looks like a date string (basic check)
                        sample = str(df[col].iloc[0]) if not df[col].empty else ""
                        if any(char in sample for char in ["-", "/", ":"]):
                            pd.to_datetime(df[col], errors="raise")
                            column_types[col] = "datetime"
                        else:
                            column_types[col] = "categorical"
                    except:
                        column_types[col] = "categorical"
                    
        return {
            "dataset_id": dataset.id,
            "filename": dataset.filename,
            "columns": columns,
            "column_types": column_types,
            "data": rows,
            "total_rows": dataset.row_count,
            "preview_limit": limit
        }


