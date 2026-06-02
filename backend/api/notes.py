"""
Notes API

Endpoints for managing notes and their relationships.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.notes_service import NotesService
from backend.models.note_relationship import RelationshipType, EntityType
from backend.utils.logger import get_logger

router = APIRouter(prefix="/notes", tags=["notes"])
logger = get_logger(__name__)


# Schemas

class NoteCreate(BaseModel):
    """Request to create a note"""
    content: str = Field(..., description="Note content (supports markdown)")
    tags: Optional[List[str]] = Field(default=None, description="List of tags")
    dataset_id: Optional[int] = Field(default=None, description="Related dataset ID")
    literature_id: Optional[int] = Field(default=None, description="Related literature ID")
    query_id: Optional[int] = Field(default=None, description="Related query ID")


class NoteUpdate(BaseModel):
    """Request to update a note"""
    content: Optional[str] = Field(default=None, description="Updated content")
    tags: Optional[List[str]] = Field(default=None, description="Updated tags")


class NoteResponse(BaseModel):
    """Note response"""
    id: int
    content: str
    tags: Optional[List[str]]
    dataset_id: Optional[int]
    literature_id: Optional[int]
    query_id: Optional[int]
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class RelationshipCreate(BaseModel):
    """Request to create a relationship"""
    target_type: EntityType = Field(..., description="Type of target entity")
    target_id: int = Field(..., description="Target entity ID")
    relationship_type: RelationshipType = Field(..., description="Type of relationship")
    description: Optional[str] = Field(default=None, description="Optional description")


class RelationshipResponse(BaseModel):
    """Relationship response"""
    id: int
    note_id: int
    target_type: str
    target_id: int
    relationship_type: str
    description: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class NoteGraphResponse(BaseModel):
    """Note graph response"""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


# Endpoints

@router.post("", response_model=NoteResponse)
async def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """
    Create a new note
    
    Notes support markdown formatting and can be linked to datasets, literature, or queries.
    """
    try:
        service = NotesService(db)
        created_note = service.create_note(
            content=note.content,
            tags=note.tags,
            dataset_id=note.dataset_id,
            literature_id=note.literature_id,
            query_id=note.query_id
        )
        
        return NoteResponse(
            id=created_note.id,
            content=created_note.content,
            tags=created_note.tags.split(",") if created_note.tags else None,
            dataset_id=created_note.dataset_id,
            literature_id=created_note.literature_id,
            query_id=created_note.query_id,
            created_at=created_note.created_at.isoformat(),
            updated_at=created_note.updated_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to create note: {e}")
        raise HTTPException(status_code=500, detail="Failed to create note")


@router.get("", response_model=List[NoteResponse])
async def list_notes(
    skip: int = 0,
    limit: int = 20,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List notes with optional filtering
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **tags**: Comma-separated list of tags to filter by
    - **search**: Search query for content
    """
    try:
        service = NotesService(db)
        tag_list = tags.split(",") if tags else None
        
        notes = service.list_notes(
            skip=skip,
            limit=limit,
            tags=tag_list,
            search=search
        )
        
        return [
            NoteResponse(
                id=note.id,
                content=note.content,
                tags=note.tags.split(",") if note.tags else None,
                dataset_id=note.dataset_id,
                literature_id=note.literature_id,
                query_id=note.query_id,
                created_at=note.created_at.isoformat(),
                updated_at=note.updated_at.isoformat()
            )
            for note in notes
        ]
        
    except Exception as e:
        logger.error(f"Failed to list notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list notes")


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note by ID"""
    try:
        service = NotesService(db)
        note = service.get_note(note_id)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return NoteResponse(
            id=note.id,
            content=note.content,
            tags=note.tags.split(",") if note.tags else None,
            dataset_id=note.dataset_id,
            literature_id=note.literature_id,
            query_id=note.query_id,
            created_at=note.created_at.isoformat(),
            updated_at=note.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get note {note_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get note")


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note: NoteUpdate,
    db: Session = Depends(get_db)
):
    """Update a note's content and/or tags"""
    try:
        service = NotesService(db)
        updated_note = service.update_note(
            note_id=note_id,
            content=note.content,
            tags=note.tags
        )
        
        if not updated_note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return NoteResponse(
            id=updated_note.id,
            content=updated_note.content,
            tags=updated_note.tags.split(",") if updated_note.tags else None,
            dataset_id=updated_note.dataset_id,
            literature_id=updated_note.literature_id,
            query_id=updated_note.query_id,
            created_at=updated_note.created_at.isoformat(),
            updated_at=updated_note.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update note {note_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a note and all its relationships"""
    try:
        service = NotesService(db)
        success = service.delete_note(note_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"success": True, "message": "Note deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete note {note_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete note")


# Relationship endpoints

@router.post("/{note_id}/relationships", response_model=RelationshipResponse)
async def create_relationship(
    note_id: int,
    relationship: RelationshipCreate,
    db: Session = Depends(get_db)
):
    """
    Create a relationship between a note and another entity
    
    Relationships allow linking notes to queries, datasets, literature, visualizations, or other notes.
    """
    try:
        service = NotesService(db)
        
        # Verify note exists
        note = service.get_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        created_rel = service.create_relationship(
            note_id=note_id,
            target_type=relationship.target_type,
            target_id=relationship.target_id,
            relationship_type=relationship.relationship_type,
            description=relationship.description
        )
        
        return RelationshipResponse(
            id=created_rel.id,
            note_id=created_rel.note_id,
            target_type=created_rel.target_type.value,
            target_id=created_rel.target_id,
            relationship_type=created_rel.relationship_type.value,
            description=created_rel.description,
            created_at=created_rel.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create relationship: {e}")
        raise HTTPException(status_code=500, detail="Failed to create relationship")


@router.get("/{note_id}/relationships", response_model=List[RelationshipResponse])
async def get_note_relationships(note_id: int, db: Session = Depends(get_db)):
    """Get all relationships for a note"""
    try:
        service = NotesService(db)
        relationships = service.get_note_relationships(note_id)
        
        return [
            RelationshipResponse(
                id=rel.id,
                note_id=rel.note_id,
                target_type=rel.target_type.value,
                target_id=rel.target_id,
                relationship_type=rel.relationship_type.value,
                description=rel.description,
                created_at=rel.created_at.isoformat()
            )
            for rel in relationships
        ]
        
    except Exception as e:
        logger.error(f"Failed to get relationships for note {note_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get relationships")


@router.get("/{note_id}/graph", response_model=NoteGraphResponse)
async def get_note_graph(
    note_id: int,
    depth: int = 2,
    db: Session = Depends(get_db)
):
    """
    Get graph of relationships for a note
    
    Returns nodes and edges representing the note's relationship network.
    """
    try:
        service = NotesService(db)
        graph = service.get_note_graph(note_id, depth)
        
        return NoteGraphResponse(
            nodes=graph["nodes"],
            edges=graph["edges"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get graph for note {note_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get note graph")


@router.get("/related/{target_type}/{target_id}", response_model=List[NoteResponse])
async def get_related_notes(
    target_type: EntityType,
    target_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all notes related to a specific entity
    
    Useful for finding notes linked to a query, dataset, or literature.
    """
    try:
        service = NotesService(db)
        notes = service.get_related_notes(target_type, target_id)
        
        return [
            NoteResponse(
                id=note.id,
                content=note.content,
                tags=note.tags.split(",") if note.tags else None,
                dataset_id=note.dataset_id,
                literature_id=note.literature_id,
                query_id=note.query_id,
                created_at=note.created_at.isoformat(),
                updated_at=note.updated_at.isoformat()
            )
            for note in notes
        ]
        
    except Exception as e:
        logger.error(f"Failed to get related notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to get related notes")
