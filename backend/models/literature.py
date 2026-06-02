"""
Literature model for PDF storage
"""
from sqlalchemy import Column, String, Integer, Text, Enum, DateTime
import enum
from datetime import datetime
from backend.models.base import BaseModel


class ProcessingStatus(str, enum.Enum):
    """Processing status for literature"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    INDEXED = "indexed"
    FAILED = "failed"


class Literature(BaseModel):
    """
    Model for storing literature metadata
    """
    __tablename__ = "literature"
    
    filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=True)
    processing_status = Column(
        Enum(ProcessingStatus),
        default=ProcessingStatus.PENDING,
        nullable=False,
        index=True
    )
    indexed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<Literature(id={self.id}, filename='{self.filename}', status='{self.processing_status}')>"
