"""
Annotations API

Endpoints for managing PDF annotations.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.annotation import Annotation
from backend.utils.logger import get_logger

router = APIRouter(prefix="/annotations", tags=["annotations"])
logger = get_logger(__name__)


# Schemas

class AnnotationCreate(BaseModel):
    """Request to create an annotation"""
    literature_id: int = Field(..., description="Literature ID")
    annotation_type: str = Field(..., description="Type: highlight, comment, note")
    content: Optional[str] = Field(default=None, description="Comment or note content")
    highlighted_text: Optional[str] = Field(default=None, description="Highlighted text")
    page_number: int = Field(..., description="Page number (1-indexed)")
    x_position: Optional[float] = Field(default=None, description="X coordinate (0-1)")
    y_position: Optional[float] = Field(default=None, description="Y coordinate (0-1)")
    width: Optional[float] = Field(default=None, description="Width (0-1)")
    height: Optional[float] = Field(default=None, description="Height (0-1)")
    color: Optional[str] = Field(default="yellow", description="Highlight color")
    note_id: Optional[int] = Field(default=None, description="Linked note ID")


class AnnotationUpdate(BaseModel):
    """Request to update an annotation"""
    content: Optional[str] = Field(default=None, description="Updated content")
    color: Optional[str] = Field(default=None, description="Updated color")


class AnnotationResponse(BaseModel):
    """Annotation response"""
    id: int
    literature_id: int
    note_id: Optional[int]
    annotation_type: str
    content: Optional[str]
    highlighted_text: Optional[str]
    page_number: int
    x_position: Optional[float]
    y_position: Optional[float]
    width: Optional[float]
    height: Optional[float]
    color: Optional[str]
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


# Endpoints

@router.post("", response_model=AnnotationResponse)
async def create_annotation(annotation: AnnotationCreate, db: Session = Depends(get_db)):
    """
    Create a new PDF annotation
    
    Annotations can be highlights, comments, or notes on specific pages and positions.
    """
    try:
        new_annotation = Annotation(
            literature_id=annotation.literature_id,
            note_id=annotation.note_id,
            annotation_type=annotation.annotation_type,
            content=annotation.content,
            highlighted_text=annotation.highlighted_text,
            page_number=annotation.page_number,
            x_position=annotation.x_position,
            y_position=annotation.y_position,
            width=annotation.width,
            height=annotation.height,
            color=annotation.color
        )
        
        db.add(new_annotation)
        db.commit()
        db.refresh(new_annotation)
        
        logger.info(f"Created annotation {new_annotation.id} for literature {annotation.literature_id}")
        
        return AnnotationResponse(
            id=new_annotation.id,
            literature_id=new_annotation.literature_id,
            note_id=new_annotation.note_id,
            annotation_type=new_annotation.annotation_type,
            content=new_annotation.content,
            highlighted_text=new_annotation.highlighted_text,
            page_number=new_annotation.page_number,
            x_position=new_annotation.x_position,
            y_position=new_annotation.y_position,
            width=new_annotation.width,
            height=new_annotation.height,
            color=new_annotation.color,
            created_at=new_annotation.created_at.isoformat(),
            updated_at=new_annotation.updated_at.isoformat()
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create annotation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create annotation")


@router.get("/literature/{literature_id}", response_model=List[AnnotationResponse])
async def get_literature_annotations(
    literature_id: int,
    page_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all annotations for a literature document
    
    Optionally filter by page number.
    """
    try:
        query = db.query(Annotation).filter(Annotation.literature_id == literature_id)
        
        if page_number is not None:
            query = query.filter(Annotation.page_number == page_number)
        
        annotations = query.order_by(Annotation.page_number, Annotation.created_at).all()
        
        return [
            AnnotationResponse(
                id=ann.id,
                literature_id=ann.literature_id,
                note_id=ann.note_id,
                annotation_type=ann.annotation_type,
                content=ann.content,
                highlighted_text=ann.highlighted_text,
                page_number=ann.page_number,
                x_position=ann.x_position,
                y_position=ann.y_position,
                width=ann.width,
                height=ann.height,
                color=ann.color,
                created_at=ann.created_at.isoformat(),
                updated_at=ann.updated_at.isoformat()
            )
            for ann in annotations
        ]
        
    except Exception as e:
        logger.error(f"Failed to get annotations for literature {literature_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get annotations")


@router.get("/{annotation_id}", response_model=AnnotationResponse)
async def get_annotation(annotation_id: int, db: Session = Depends(get_db)):
    """Get a specific annotation"""
    try:
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        
        if not annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")
        
        return AnnotationResponse(
            id=annotation.id,
            literature_id=annotation.literature_id,
            note_id=annotation.note_id,
            annotation_type=annotation.annotation_type,
            content=annotation.content,
            highlighted_text=annotation.highlighted_text,
            page_number=annotation.page_number,
            x_position=annotation.x_position,
            y_position=annotation.y_position,
            width=annotation.width,
            height=annotation.height,
            color=annotation.color,
            created_at=annotation.created_at.isoformat(),
            updated_at=annotation.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get annotation {annotation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get annotation")


@router.put("/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int,
    update: AnnotationUpdate,
    db: Session = Depends(get_db)
):
    """Update an annotation's content or color"""
    try:
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        
        if not annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")
        
        if update.content is not None:
            annotation.content = update.content
        
        if update.color is not None:
            annotation.color = update.color
        
        db.commit()
        db.refresh(annotation)
        
        logger.info(f"Updated annotation {annotation_id}")
        
        return AnnotationResponse(
            id=annotation.id,
            literature_id=annotation.literature_id,
            note_id=annotation.note_id,
            annotation_type=annotation.annotation_type,
            content=annotation.content,
            highlighted_text=annotation.highlighted_text,
            page_number=annotation.page_number,
            x_position=annotation.x_position,
            y_position=annotation.y_position,
            width=annotation.width,
            height=annotation.height,
            color=annotation.color,
            created_at=annotation.created_at.isoformat(),
            updated_at=annotation.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update annotation {annotation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update annotation")


@router.delete("/{annotation_id}")
async def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    """Delete an annotation"""
    try:
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        
        if not annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")
        
        db.delete(annotation)
        db.commit()
        
        logger.info(f"Deleted annotation {annotation_id}")
        
        return {"success": True, "message": "Annotation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete annotation {annotation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete annotation")
