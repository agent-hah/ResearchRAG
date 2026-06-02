"""
RAG API endpoints for literature indexing and retrieval.
"""
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.rag import (
    RAGIndexRequest,
    RAGIndexResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
    RAGStatsResponse
)
from backend.schemas.common import SuccessResponse
from backend.services.file_service import FileService
from backend.services.pdf_processor import PDFProcessor
from backend.services.rag_service import get_rag_service
from backend.models.literature import ProcessingStatus
from backend.utils.logger import get_logger

router = APIRouter(prefix="/rag", tags=["rag"])
logger = get_logger(__name__)


def index_literature_background(literature_id: int):
    """Background task for literature indexing."""
    from backend.database import SessionLocal
    
    db = SessionLocal()
    try:
        rag_service = get_rag_service()
        literature = FileService.get_literature_by_id(db, literature_id)
        
        if not literature:
            logger.error(f"Literature {literature_id} not found")
            return
        
        # Extract text if not already done
        if literature.processing_status == ProcessingStatus.PENDING:
            _, text_content = PDFProcessor.process_pdf_file(
                Path(literature.file_path),
                literature,
                db
            )
        else:
            text_content = PDFProcessor.extract_text(Path(literature.file_path))
        
        # Index in RAG
        rag_service.index_literature(literature, text_content, db)
        
    except Exception as e:
        logger.error(f"Background indexing failed for literature {literature_id}: {str(e)}")
    finally:
        db.close()


@router.post("/index", response_model=RAGIndexResponse)
async def index_literature(
    request: RAGIndexRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Index a literature document for RAG retrieval.
    
    The document will be split into chunks, embedded, and stored in the vector database.
    Processing happens in the background.
    """
    # Get literature
    literature = FileService.get_literature_by_id(db, request.literature_id)
    if not literature:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    # Check if already indexed
    if literature.processing_status == ProcessingStatus.INDEXED and not request.force_reindex:
        return RAGIndexResponse(
            literature_id=literature.id,
            filename=literature.filename,
            chunks_created=0,
            status="already_indexed",
            message="Literature already indexed. Use force_reindex=True to reindex.",
            indexed_at=literature.indexed_at
        )
    
    # Check if processing failed
    if literature.processing_status == ProcessingStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail="Literature processing failed. Please reprocess the PDF first."
        )
    
    # Schedule background indexing
    background_tasks.add_task(index_literature_background, literature.id)
    
    return RAGIndexResponse(
        literature_id=literature.id,
        filename=literature.filename,
        chunks_created=0,
        status="indexing",
        message="Literature indexing scheduled in background"
    )


@router.post("/index/batch", response_model=SuccessResponse)
async def index_batch(
    literature_ids: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Index multiple literature documents in batch.
    """
    # Validate all literature IDs exist
    for lit_id in literature_ids:
        literature = FileService.get_literature_by_id(db, lit_id)
        if not literature:
            raise HTTPException(status_code=404, detail=f"Literature {lit_id} not found")
    
    # Schedule background indexing for each
    for lit_id in literature_ids:
        background_tasks.add_task(index_literature_background, lit_id)
    
    return SuccessResponse(
        message=f"Batch indexing scheduled for {len(literature_ids)} documents"
    )


@router.post("/search", response_model=RAGSearchResponse)
async def search_literature(
    request: RAGSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Search literature using semantic similarity.
    
    Returns the most relevant chunks from indexed literature documents.
    """
    try:
        rag_service = get_rag_service()
        
        # Perform search
        import time
        start_time = time.time()
        
        results = rag_service.search_literature(
            query=request.query,
            top_k=request.top_k,
            literature_ids=request.literature_ids
        )
        
        search_time_ms = (time.time() - start_time) * 1000
        
        # Format response
        search_results = [RAGSearchResult(**result) for result in results]
        
        return RAGSearchResponse(
            query=request.query,
            results=search_results,
            total_results=len(search_results),
            search_time_ms=search_time_ms
        )
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/stats", response_model=RAGStatsResponse)
async def get_rag_stats(db: Session = Depends(get_db)):
    """
    Get RAG system statistics.
    
    Returns information about indexed documents, chunks, and configuration.
    """
    try:
        rag_service = get_rag_service()
        stats = rag_service.get_stats(db)
        return RAGStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.delete("/index/{literature_id}", response_model=SuccessResponse)
async def delete_literature_index(
    literature_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete literature from RAG index.
    
    Removes all chunks for the specified literature document from the vector database.
    """
    # Check literature exists
    literature = FileService.get_literature_by_id(db, literature_id)
    if not literature:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    try:
        rag_service = get_rag_service()
        rag_service.delete_literature_index(literature_id, db)
        
        return SuccessResponse(
            message=f"Literature {literature_id} removed from index"
        )
        
    except Exception as e:
        logger.error(f"Error deleting index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete index: {str(e)}")


@router.post("/reindex/all", response_model=SuccessResponse)
async def reindex_all_literature(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Reindex all literature documents.
    
    This will reprocess and reindex all completed literature documents.
    Use with caution as this is a heavy operation.
    """
    def reindex_all_background():
        from backend.database import SessionLocal
        db = SessionLocal()
        try:
            rag_service = get_rag_service()
            results = rag_service.reindex_all(db)
            logger.info(f"Reindex all complete: {results}")
        except Exception as e:
            logger.error(f"Reindex all failed: {str(e)}")
        finally:
            db.close()
    
    background_tasks.add_task(reindex_all_background)
    
    return SuccessResponse(
        message="Reindexing all literature scheduled in background"
    )


@router.get("/indexed", response_model=List[int])
async def list_indexed_literature(db: Session = Depends(get_db)):
    """
    List all indexed literature IDs.
    """
    literature_list = db.query(FileService.get_all_literature(db))
    indexed_ids = [
        lit.id for lit in FileService.get_all_literature(db)
        if lit.processing_status == ProcessingStatus.INDEXED
    ]
    return indexed_ids
