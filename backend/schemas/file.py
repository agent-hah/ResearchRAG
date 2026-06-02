"""
File-related Pydantic schemas for request/response validation.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, computed_field


class FileType(str, Enum):
    """Supported file types."""
    CSV = "csv"
    PDF = "pdf"


class ProcessingStatus(str, Enum):
    """File processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileUploadResponse(BaseModel):
    """Response after file upload."""
    id: int
    filename: str
    file_type: FileType
    file_size: int
    status: ProcessingStatus
    message: str
    
    class Config:
        from_attributes = True


class DatasetResponse(BaseModel):
    """Dataset metadata response."""
    id: int
    name: str
    filename: str
    file_path: str
    file_size_bytes: int
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    columns: Optional[List[str]] = None
    table_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Backward compatibility alias
    @computed_field
    @property
    def file_size(self) -> int:
        return self.file_size_bytes
    
    class Config:
        from_attributes = True


class LiteratureResponse(BaseModel):
    """Literature metadata response."""
    id: int
    filename: str
    file_path: str
    file_size: int
    page_count: Optional[int] = None
    processing_status: str
    indexed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    """Response for file listing."""
    datasets: List[DatasetResponse]
    literature: List[LiteratureResponse]
    total_datasets: int
    total_literature: int
