"""
Document Suggestion model for storing suggested research articles
"""
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, Boolean
from backend.models.base import BaseModel


class DocumentSuggestion(BaseModel):
    """
    Model for storing suggested research articles
    """
    __tablename__ = "document_suggestions"
    
    # Reference to dataset that triggered the suggestion
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    
    # Article metadata
    title = Column(String(500), nullable=False)
    authors = Column(Text, nullable=True)  # Comma-separated list
    publication_year = Column(Integer, nullable=True)
    publication_venue = Column(String(300), nullable=True)  # Journal/conference name
    
    # Content
    abstract = Column(Text, nullable=True)
    snippet = Column(Text, nullable=True)  # Short excerpt
    
    # Links
    url = Column(String(500), nullable=True)  # Link to article
    pdf_url = Column(String(500), nullable=True)  # Direct PDF link if available
    doi = Column(String(100), nullable=True)  # Digital Object Identifier
    
    # Relevance and ranking
    relevance_score = Column(Float, nullable=True)  # 0-1 score
    search_query = Column(Text, nullable=True)  # Query that found this article
    
    # User feedback
    is_relevant = Column(Boolean, nullable=True)  # User feedback: relevant or not
    is_imported = Column(Boolean, default=False)  # Whether user imported this article
    is_dismissed = Column(Boolean, default=False)  # Whether user dismissed this
    
    # Citation count (if available)
    citation_count = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<DocumentSuggestion(id={self.id}, title='{self.title[:50]}...')>"
