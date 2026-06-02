"""
Query history model
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from backend.models.base import BaseModel


class QueryHistory(BaseModel):
    """
    Model for storing query history
    """
    __tablename__ = "query_history"
    
    query_text = Column(Text, nullable=False)
    sql_query = Column(Text, nullable=True)
    result_count = Column(Integer, nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<QueryHistory(id={self.id}, query='{self.query_text[:50]}...')>"
