"""
RAG-related Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """Document chunk with metadata."""
    text: str
    metadata: dict
    page: Optional[int] = None
    source: str


class RAGIndexRequest(BaseModel):
    """Request to index a literature document."""
    literature_id: int = Field(..., description="Literature ID to index")
    force_reindex: bool = Field(False, description="Force reindexing if already indexed")


class RAGIndexResponse(BaseModel):
    """Response after indexing."""
    literature_id: int
    filename: str
    chunks_created: int
    status: str
    message: str
    indexed_at: Optional[datetime] = None


class RAGSearchRequest(BaseModel):
    """Request to search literature."""
    query: str = Field(..., min_length=1, description="Search query")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to return")
    literature_ids: Optional[List[int]] = Field(None, description="Filter by specific literature IDs")


class RAGSearchResult(BaseModel):
    """Single search result."""
    literature_id: int
    filename: str
    text: str
    page: Optional[int] = None
    score: float
    metadata: dict


class RAGSearchResponse(BaseModel):
    """Response from literature search."""
    query: str
    results: List[RAGSearchResult]
    total_results: int
    search_time_ms: float


class RAGStatsResponse(BaseModel):
    """RAG system statistics."""
    total_indexed: int
    total_chunks: int
    collection_name: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
