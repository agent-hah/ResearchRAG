"""
Export API

Endpoints for exporting data in various formats.
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.export_service import ExportService
from backend.utils.logger import get_logger
import io

router = APIRouter(prefix="/export", tags=["export"])
logger = get_logger(__name__)


# Schemas

class ExportDatasetRequest(BaseModel):
    """Request to export dataset"""
    dataset_id: int = Field(..., description="Dataset ID")
    format: str = Field(..., description="Export format: csv or json")


class ExportQueryRequest(BaseModel):
    """Request to export query results"""
    query_id: int = Field(..., description="Query history ID")
    format: str = Field(..., description="Export format: csv or json")


class ExportNotesRequest(BaseModel):
    """Request to export notes"""
    note_ids: Optional[List[int]] = Field(default=None, description="Note IDs (all if None)")
    format: str = Field(..., description="Export format: markdown or json")


class ExportVisualizationRequest(BaseModel):
    """Request to export visualization"""
    config: Dict[str, Any] = Field(..., description="Visualization configuration")


class ExportLiteratureRequest(BaseModel):
    """Request to export literature PDF"""
    literature_id: int = Field(..., description="Literature ID")
    include_annotations: bool = Field(default=False, description="Include annotations in PDF")


# Endpoints

@router.post("/dataset")
async def export_dataset(request: ExportDatasetRequest, db: Session = Depends(get_db)):
    """
    Export dataset in specified format
    
    Supports CSV and JSON formats.
    """
    try:
        service = ExportService(db)
        
        # Get dataset info for filename
        from backend.models.dataset import Dataset
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Create user-friendly filename from original filename
        base_name = dataset.filename.rsplit('.', 1)[0] if dataset.filename else f"dataset_{request.dataset_id}"
        # Remove special characters and spaces
        safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in base_name)
        
        if request.format == "csv":
            content = service.export_dataset_csv(request.dataset_id)
            media_type = "text/csv"
            filename = f"{safe_name}_export.csv"
        elif request.format == "json":
            content = service.export_dataset_json(request.dataset_id)
            media_type = "application/json"
            filename = f"{safe_name}_export.json"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'json'")
        
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to export dataset")


@router.post("/query")
async def export_query(request: ExportQueryRequest, db: Session = Depends(get_db)):
    """
    Export query results in specified format
    
    Supports CSV and JSON formats.
    """
    try:
        service = ExportService(db)
        
        # Get query info for filename
        from backend.models.query_history import QueryHistory
        from datetime import datetime
        query_history = db.query(QueryHistory).filter(QueryHistory.id == request.query_id).first()
        if not query_history:
            raise HTTPException(status_code=404, detail="Query not found")
        
        # Create user-friendly filename from query
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Use first few words of query for filename
        query_words = query_history.question.split()[:3]
        query_snippet = "_".join(query_words)
        safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in query_snippet)
        
        if request.format == "csv":
            content = service.export_query_results_csv(request.query_id)
            media_type = "text/csv"
            filename = f"query_{safe_name}_{timestamp}.csv"
        elif request.format == "json":
            content = service.export_query_results_json(request.query_id)
            media_type = "application/json"
            filename = f"query_{safe_name}_{timestamp}.json"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'json'")
        
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export query: {e}")
        raise HTTPException(status_code=500, detail="Failed to export query")


@router.post("/notes")
async def export_notes(request: ExportNotesRequest, db: Session = Depends(get_db)):
    """
    Export notes in specified format
    
    Supports Markdown and JSON formats.
    """
    try:
        service = ExportService(db)
        
        # Create user-friendly filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if request.format == "markdown":
            content = service.export_notes_markdown(request.note_ids)
            media_type = "text/markdown"
            filename = f"research_notes_{timestamp}.md"
        elif request.format == "json":
            content = service.export_notes_json(request.note_ids)
            media_type = "application/json"
            filename = f"research_notes_{timestamp}.json"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'markdown' or 'json'")
        
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to export notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to export notes")


@router.post("/visualization")
async def export_visualization(request: ExportVisualizationRequest, db: Session = Depends(get_db)):
    """
    Export visualization configuration as JSON
    
    Returns the visualization configuration that can be used to recreate the chart.
    """
    try:
        service = ExportService(db)
        content = service.export_visualization_json(request.config)
        
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=visualization.json"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to export visualization: {e}")
        raise HTTPException(status_code=500, detail="Failed to export visualization")


@router.post("/literature/pdf")
async def export_literature_pdf(request: ExportLiteratureRequest, db: Session = Depends(get_db)):
    """
    Export literature PDF, optionally with annotations
    
    If include_annotations is True, the PDF will include all saved highlights and comments.
    """
    try:
        service = ExportService(db)
        pdf_bytes, filename = service.export_literature_pdf(
            request.literature_id,
            request.include_annotations
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export literature PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to export literature PDF")
