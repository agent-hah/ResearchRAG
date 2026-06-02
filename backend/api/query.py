"""
Query processing API endpoints for natural language queries.
"""
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.query import (
    QueryRequest,
    QueryResponse,
    SQLGeneration,
    DataResult,
    LiteratureContext,
    QuerySynthesis,
    QueryHistoryResponse,
    QueryHistoryItem,
    DatabaseSchemaResponse,
    SchemaInfo
)
from backend.services.query_service import get_query_service
from backend.utils.logger import get_logger

router = APIRouter(prefix="/query", tags=["query"])
logger = get_logger(__name__)


@router.post("/process", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Process a natural language query.
    
    This endpoint:
    1. Converts natural language to SQL
    2. Executes the SQL query on uploaded datasets
    3. Retrieves relevant literature context using RAG
    4. Synthesizes results combining data and literature insights
    5. Saves the query to history
    """
    try:
        start_time = time.time()
        query_service = get_query_service()
        
        # Get database schema
        schemas = query_service.get_database_schema(db)
        if not schemas:
            raise HTTPException(
                status_code=400,
                detail="No datasets available. Please upload CSV files first."
            )
        
        # Generate SQL
        sql_generation = query_service.generate_sql(
            query=request.query,
            schemas=schemas,
            dataset_ids=request.dataset_ids
        )
        
        # Execute SQL if generated successfully
        data_result = {"rows": [], "row_count": 0, "columns": [], "execution_time_ms": 0.0}
        if sql_generation["sql_query"] and sql_generation["confidence"] > 0.1:
            data_result = query_service.execute_sql(sql_generation["sql_query"], db)
        
        # Get literature context if requested
        literature_context = []
        if request.include_literature and request.max_literature_results > 0:
            literature_context = query_service.get_literature_context(
                query=request.query,
                max_results=request.max_literature_results,
                literature_ids=request.literature_ids
            )
        
        # Synthesize results
        synthesis = query_service.synthesize_results(
            query=request.query,
            sql_result=data_result,
            literature_context=literature_context
        )
        
        # Calculate total processing time
        total_time = (time.time() - start_time) * 1000
        
        # Save to history
        try:
            query_service.save_query_history(
                db=db,
                query=request.query,
                sql_query=sql_generation["sql_query"],
                row_count=data_result["row_count"],
                literature_count=len(literature_context),
                processing_time_ms=total_time
            )
        except Exception as e:
            logger.error(f"Failed to save query history: {str(e)}")
            # Don't fail the request if history save fails
        
        # Build response
        response = QueryResponse(
            query=request.query,
            sql_generation=SQLGeneration(**sql_generation),
            data_result=DataResult(**data_result),
            literature_context=[LiteratureContext(**ctx) for ctx in literature_context],
            synthesis=QuerySynthesis(**synthesis),
            total_processing_time_ms=total_time,
            timestamp=time.time()
        )
        
        logger.info(f"Query processed successfully in {total_time:.2f}ms")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.get("/schema", response_model=DatabaseSchemaResponse)
async def get_database_schema(db: Session = Depends(get_db)):
    """
    Get database schema information for all uploaded datasets.
    
    Returns table names, columns, types, and sample data for each dataset.
    """
    try:
        query_service = get_query_service()
        schemas = query_service.get_database_schema(db)
        
        schema_info = []
        for schema in schemas:
            schema_info.append(SchemaInfo(
                table_name=schema["table_name"],
                columns=schema["columns"],
                row_count=schema["row_count"],
                sample_data=schema["sample_data"]
            ))
        
        return DatabaseSchemaResponse(
            schemas=schema_info,
            total_tables=len(schema_info)
        )
        
    except Exception as e:
        logger.error(f"Error getting database schema: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")


@router.get("/history", response_model=QueryHistoryResponse)
async def get_query_history(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based, overrides skip)"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Page size (overrides limit)"),
    db: Session = Depends(get_db)
):
    """
    Get query history with pagination.
    
    Returns previously executed queries with metadata and performance information.
    Supports both skip/limit and page/page_size pagination styles.
    """
    try:
        query_service = get_query_service()
        # Support page/page_size style (used by frontend) as well as skip/limit
        if page is not None:
            resolved_page = page
            resolved_page_size = page_size or limit
        else:
            resolved_page_size = page_size or limit
            resolved_page = (skip // resolved_page_size) + 1

        queries, total_count = query_service.get_query_history(db, resolved_page, resolved_page_size)
        
        history_items = [QueryHistoryItem.from_orm(q) for q in queries]
        
        return QueryHistoryResponse(
            queries=history_items,
            total_count=total_count,
            page=resolved_page,
            page_size=resolved_page_size
        )
        
    except Exception as e:
        logger.error(f"Error getting query history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@router.post("/sql/execute")
async def execute_raw_sql(
    sql_query: str,
    db: Session = Depends(get_db)
):
    """
    Execute raw SQL query directly.
    
    WARNING: This endpoint allows direct SQL execution. Use with caution.
    Only SELECT statements are recommended for safety.
    """
    try:
        # Basic safety check - only allow SELECT statements
        sql_lower = sql_query.lower().strip()
        if not sql_lower.startswith('select'):
            raise HTTPException(
                status_code=400,
                detail="Only SELECT statements are allowed for safety"
            )
        
        query_service = get_query_service()
        result = query_service.execute_sql(sql_query, db)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing raw SQL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SQL execution failed: {str(e)}")


@router.post("/sql/generate")
async def generate_sql_only(
    query: str,
    dataset_ids: List[int] = None,
    db: Session = Depends(get_db)
):
    """
    Generate SQL from natural language without executing.
    
    Useful for reviewing the generated SQL before execution.
    """
    try:
        query_service = get_query_service()
        
        # Get database schema
        schemas = query_service.get_database_schema(db)
        if not schemas:
            raise HTTPException(
                status_code=400,
                detail="No datasets available. Please upload CSV files first."
            )
        
        # Generate SQL
        result = query_service.generate_sql(
            query=query,
            schemas=schemas,
            dataset_ids=dataset_ids
        )
        
        return SQLGeneration(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating SQL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SQL generation failed: {str(e)}")


@router.get("/examples")
async def get_query_examples():
    """
    Get example natural language queries.
    
    Returns sample queries that users can try with their datasets.
    """
    examples = [
        {
            "category": "Basic Analysis",
            "queries": [
                "Show me the first 10 rows of data",
                "What are the column names and types in my dataset?",
                "How many rows are in each dataset?",
                "What is the average value in the numeric columns?"
            ]
        },
        {
            "category": "Statistical Analysis",
            "queries": [
                "Calculate summary statistics for all numeric columns",
                "Find outliers in the data",
                "Show the distribution of values in each column",
                "What are the minimum and maximum values?"
            ]
        },
        {
            "category": "Filtering and Grouping",
            "queries": [
                "Show records where column X is greater than Y",
                "Group data by category and count occurrences",
                "Find the top 10 highest values",
                "Show unique values in each categorical column"
            ]
        },
        {
            "category": "Comparison and Trends",
            "queries": [
                "Compare values between different groups",
                "Show trends over time if date columns exist",
                "Find correlations between numeric columns",
                "Identify patterns in the data"
            ]
        }
    ]
    
    return {"examples": examples}