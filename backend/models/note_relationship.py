"""
Note Relationship model for graph-based connections
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SQLEnum
from backend.models.base import BaseModel
import enum


class RelationshipType(str, enum.Enum):
    """Types of relationships between notes and entities"""
    REFERENCES = "references"  # Note references another entity
    DERIVED_FROM = "derived_from"  # Note derived from entity
    RELATED_TO = "related_to"  # General relationship
    CONTRADICTS = "contradicts"  # Note contradicts entity
    SUPPORTS = "supports"  # Note supports entity
    QUESTIONS = "questions"  # Note questions entity


class EntityType(str, enum.Enum):
    """Types of entities that can be linked"""
    NOTE = "note"
    QUERY = "query"
    DATASET = "dataset"
    LITERATURE = "literature"
    VISUALIZATION = "visualization"


class NoteRelationship(BaseModel):
    """
    Model for storing relationships between notes and other entities
    """
    __tablename__ = "note_relationships"
    
    # Source note
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False, index=True)
    
    # Target entity
    target_type = Column(SQLEnum(EntityType), nullable=False, index=True)
    target_id = Column(Integer, nullable=False, index=True)
    
    # Relationship metadata
    relationship_type = Column(SQLEnum(RelationshipType), nullable=False)
    description = Column(String(512), nullable=True)
    
    def __repr__(self):
        return f"<NoteRelationship(note_id={self.note_id}, target={self.target_type}:{self.target_id}, type={self.relationship_type})>"
