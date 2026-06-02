"""
Annotation model for PDF annotations
"""
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey
from backend.models.base import BaseModel


class Annotation(BaseModel):
    """
    Model for storing PDF annotations (highlights, comments)
    """
    __tablename__ = "annotations"
    
    # Reference to literature
    literature_id = Column(Integer, ForeignKey("literature.id"), nullable=False, index=True)
    
    # Reference to note (optional - annotation can create a note)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True, index=True)
    
    # Annotation type
    annotation_type = Column(String(50), nullable=False)  # highlight, comment, note
    
    # Content
    content = Column(Text, nullable=True)  # Comment text or note content
    highlighted_text = Column(Text, nullable=True)  # Text that was highlighted
    
    # Position in PDF (page and coordinates)
    page_number = Column(Integer, nullable=False)
    x_position = Column(Float, nullable=True)  # X coordinate (0-1 normalized)
    y_position = Column(Float, nullable=True)  # Y coordinate (0-1 normalized)
    width = Column(Float, nullable=True)  # Width of highlight (0-1 normalized)
    height = Column(Float, nullable=True)  # Height of highlight (0-1 normalized)
    
    # Color for highlights
    color = Column(String(20), nullable=True, default="yellow")
    
    def __repr__(self):
        return f"<Annotation(id={self.id}, type={self.annotation_type}, page={self.page_number})>"
