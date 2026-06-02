"""
Export service for data, visualizations, and notes
"""
import pandas as pd
from typing import Dict
import json
from database.db_manager import DatabaseManager


class ExportService:
    """Handles export operations"""
    
    def __init__(self):
        self.db = DatabaseManager()
    
    def export_dataset(self, dataset_id: int, format: str = 'csv') -> bytes:
        """Export dataset to CSV or JSON"""
        dataset = self.db.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")
        
        # Query all data
        sql = f"SELECT * FROM {dataset['table_name']}"
        df = self.db.query_dataset(sql)
        
        if format == 'csv':
            return df.to_csv(index=False).encode()
        elif format == 'json':
            return df.to_json(orient='records').encode()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def export_query_results(self, df: pd.DataFrame, format: str = 'csv') -> bytes:
        """Export query results"""
        if format == 'csv':
            return df.to_csv(index=False).encode()
        elif format == 'json':
            return df.to_json(orient='records').encode()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def export_notes(self, format: str = 'md') -> bytes:
        """Export all notes"""
        notes = self.db.get_notes()
        
        if format == 'md':
            content = "# Research Notes\n\n"
            for note in notes:
                content += f"## Note {note['id']}\n"
                content += f"**Created**: {note['created_at']}\n"
                if note['tags']:
                    content += f"**Tags**: {note['tags']}\n"
                content += f"\n{note['content']}\n\n---\n\n"
            return content.encode()
        elif format == 'json':
            return json.dumps(notes, indent=2).encode()
        else:
            raise ValueError(f"Unsupported format: {format}")
