"""
Dataset model for CSV data storage
"""
from sqlalchemy import Column, String, Integer, Text
from backend.models.base import BaseModel


class Dataset(BaseModel):
    """
    Model for storing dataset metadata
    """
    __tablename__ = "datasets"
    
    name = Column(String(255), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=True)  # JSON string of column names and types
    table_name = Column(String(255), nullable=False, unique=True)  # Dynamic table name for data
    
    def __repr__(self):
        return f"<Dataset(id={self.id}, name='{self.name}', rows={self.row_count})>"
