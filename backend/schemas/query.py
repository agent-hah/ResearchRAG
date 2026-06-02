"""
Query processing schemas for natural language queries and results.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, computed_field


class QueryRequest(BaseModel):
    """Natural language query request."""
    query: str = Field(..., min_length=1, description="Natural language query")
    dataset_ids: Optional[List[int]] = Field(None, description="Filter by specific dataset IDs")
    literature_ids: Optional[List[int]] = Field(None, description="Filter by specific literature IDs")
    include_literature: bool = Field(True, description="Include literature context in response")
    max_literature_results: int = Field(3, ge=0, le=10, description="Maximum literature results to include")


class SQLGeneration(BaseModel):
    """Generated SQL query information."""
    sql_query: str
    explanation: str
    tables_used: List[str]
    columns_used: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)


class DataResult(BaseModel):
    """Data query result."""
    rows: List[Dict[str, Any]]
    row_count: int
    columns: List[str]
    execution_time_ms: float


class LiteratureContext(BaseModel):
    """Literature context from RAG."""
    literature_id: int
    filename: str
    text: str
    relevance_score: float
    metadata: Dict[str, Any]


class QuerySynthesis(BaseModel):
    """Synthesized query result combining data and literature."""
    summary: str
    key_findings: List[str]
    data_insights: List[str]
    literature_insights: List[str]
    methodology_notes: Optional[str] = None
    limitations: Optional[str] = None


class QueryResponse(BaseModel):
    """Complete query response."""
    query: str
    sql_generation: SQLGeneration
    data_result: DataResult
    literature_context: List[LiteratureContext]
    synthesis: QuerySynthesis
    total_processing_time_ms: float
    timestamp: datetime


class QueryHistoryItem(BaseModel):
    """Query history item."""
    id: int
    query_text: str
    sql_query: str
    result_count: Optional[int] = 0
    execution_time_ms: Optional[int] = 0
    created_at: datetime
    
    # Add computed fields for backward compatibility
    @computed_field
    @property
    def query(self) -> str:
        return self.query_text
    
    @computed_field
    @property
    def row_count(self) -> int:
        return self.result_count or 0
    
    @computed_field
    @property
    def literature_count(self) -> int:
        return 0  # Not stored in current model
    
    @computed_field
    @property
    def processing_time_ms(self) -> float:
        return float(self.execution_time_ms or 0)
    
    class Config:
        from_attributes = True


class QueryHistoryResponse(BaseModel):
    """Query history response."""
    queries: List[QueryHistoryItem]
    total_count: int
    page: int
    page_size: int


class SchemaInfo(BaseModel):
    """Database schema information."""
    table_name: str
    columns: List[Dict[str, str]]
    row_count: int
    sample_data: List[Dict[str, Any]]


class DatabaseSchemaResponse(BaseModel):
    """Complete database schema response."""
    schemas: List[SchemaInfo]
    total_tables: int