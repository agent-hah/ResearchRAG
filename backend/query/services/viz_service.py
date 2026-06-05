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
    def get_viz_data(dataset_id: int, limit: int = 1000) -> Dict[str, Any]:
        """
        Get data for visualization from a dataset.
        
        Args:
            dataset_id: ID of the dataset
            limit: Maximum number of rows to retrieve
            
        Returns:
            Dictionary with columns and row data
        """
        dataset = FileService.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
            
        if not dataset.table_name or dataset.row_count == 0:
            # Try to process it if not already processed
            file_path = Path(dataset.file_path)
            if not file_path.exists():
                raise ValueError(f"File not found on disk: {dataset.file_path}")
            
            logger.info(f"Dataset {dataset_id} not yet processed, processing now...")
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

    @staticmethod
    def get_spatial_data(dataset_id: int, limit: int = 1000) -> Dict[str, Any]:
        """
        Extract geographic data from a dataset.
        """
        dataset = FileService.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
            
        if not dataset.table_name or dataset.row_count == 0:
            file_path = Path(dataset.file_path)
            if not file_path.exists():
                raise ValueError(f"File not found on disk: {dataset.file_path}")
            dataset = CSVProcessor.process_csv_file(file_path, dataset)
            
        rows = CSVProcessor.get_table_preview(dataset.table_name, limit)
        if not rows:
            return {"is_spatial": False, "points": []}
            
        df = pd.DataFrame(rows)
        columns = df.columns.tolist()
        
        # Look for lat/lng columns with more specific patterns
        lat_patterns = ["latitude", "lat"]
        lng_patterns = ["longitude", "longitude", "lng", "lon"]
        
        # Check for exact matches first, then partial
        lat_col = next((col for col in columns if col.lower() in lat_patterns or col.lower() == 'y'), None)
        if not lat_col:
            lat_col = next((col for col in columns if any(p in col.lower() for p in lat_patterns)), None)
            
        lng_col = next((col for col in columns if col.lower() in lng_patterns or col.lower() == 'x'), None)
        if not lng_col:
            lng_col = next((col for col in columns if any(p in col.lower() for p in lng_patterns)), None)
        
        logger.info(f"Detected columns: lat={lat_col}, lng={lng_col}")
        
        if not lat_col or not lng_col:
            # Fallback: check for numeric columns that could be coordinates
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            if len(numeric_cols) >= 2:
                # Basic check for coordinate ranges
                potential_lat = None
                potential_lng = None
                for col in numeric_cols:
                    # Latitude: -90 to 90
                    if df[col].between(-90, 90).all() and not potential_lat:
                        potential_lat = col
                    # Longitude: -180 to 180
                    elif df[col].between(-180, 180).all() and not potential_lng:
                        potential_lng = col
                
                if potential_lat and potential_lng:
                    lat_col = potential_lat
                    lng_col = potential_lng
                    logger.info(f"Fallback detected columns: lat={lat_col}, lng={lng_col}")
        
        if not lat_col or not lng_col:
            return {"is_spatial": False, "points": []}
            
        # Extract points
        points = []
        for i, row in df.iterrows():
            try:
                lat = float(row[lat_col])
                lng = float(row[lng_col])
                if pd.isna(lat) or pd.isna(lng):
                    continue
                    
                # Find a label
                label = ""
                for col in columns:
                    if col not in [lat_col, lng_col] and df[col].dtype == object:
                        label = str(row[col])
                        break
                
                # Find a value
                value = None
                for col in columns:
                    if col not in [lat_col, lng_col] and pd.api.types.is_numeric_dtype(df[col]):
                        value = float(row[col])
                        break
                        
                points.append({
                    "lat": lat,
                    "lng": lng,
                    "label": label or f"Point {len(points) + 1}",
                    "value": value,
                    "metadata": {col: row[col] for col in columns if col not in [lat_col, lng_col]}
                })
            except:
                continue
                
        logger.info(f"Extracted {len(points)} spatial points")
        
        return {
            "dataset_id": dataset_id,
            "is_spatial": True,
            "lat_column": lat_col,
            "lng_column": lng_col,
            "points": points,
            "total_points": len(points)
        }
