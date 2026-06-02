"""
Note model for annotations and remarks
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from backend.models.base import BaseModel


class Note(BaseModel):
    """
    Model for storing notes and annotations
    """
    __tablename__ = "notes"
    
    content = Column(Text, nullable=False)
    tags = Column(String(512), nullable=True)  # Comma-separated tags
    
    # Optional relationships to other entities
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    literature_id = Column(Integer, ForeignKey("literature.id"), nullable=True, index=True)
    query_id = Column(Integer, ForeignKey("query_history.id"), nullable=True, index=True)
    
    # For graph relationships (future enhancement)
    linked_note_ids = Column(Text, nullable=True)  # JSON array of note IDs
    
    def __repr__(self):
        return f"<Note(id={self.id}, content='{self.content[:50]}...')>"
