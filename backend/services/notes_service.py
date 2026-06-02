"""
Notes Service

Manages notes with graph-based relationships to queries, datasets, literature, and visualizations.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from backend.models.note import Note
from backend.models.note_relationship import NoteRelationship, RelationshipType, EntityType
from backend.utils.logger import get_logger

logger = get_logger(__name__)


class NotesService:
    """Service for managing notes and their relationships"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_note(
        self,
        content: str,
        tags: Optional[List[str]] = None,
        dataset_id: Optional[int] = None,
        literature_id: Optional[int] = None,
        query_id: Optional[int] = None
    ) -> Note:
        """
        Create a new note
        
        Args:
            content: Note content (supports rich text/markdown)
            tags: List of tags
            dataset_id: Optional dataset reference
            literature_id: Optional literature reference
            query_id: Optional query reference
            
        Returns:
            Created note
        """
        try:
            note = Note(
                content=content,
                tags=",".join(tags) if tags else None,
                dataset_id=dataset_id,
                literature_id=literature_id,
                query_id=query_id
            )
            
            self.db.add(note)
            self.db.commit()
            self.db.refresh(note)
            
            logger.info(f"Created note {note.id}")
            return note
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create note: {e}")
            raise
    
    def get_note(self, note_id: int) -> Optional[Note]:
        """Get note by ID"""
        return self.db.query(Note).filter(Note.id == note_id).first()
    
    def list_notes(
        self,
        skip: int = 0,
        limit: int = 20,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None
    ) -> List[Note]:
        """
        List notes with optional filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            tags: Filter by tags
            search: Search in content
            
        Returns:
            List of notes
        """
        query = self.db.query(Note)
        
        # Filter by tags
        if tags:
            tag_filters = [Note.tags.contains(tag) for tag in tags]
            query = query.filter(or_(*tag_filters))
        
        # Search in content
        if search:
            query = query.filter(Note.content.contains(search))
        
        # Order by most recent
        query = query.order_by(Note.created_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    def update_note(
        self,
        note_id: int,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Note]:
        """Update note content and/or tags"""
        try:
            note = self.get_note(note_id)
            if not note:
                return None
            
            if content is not None:
                note.content = content
            
            if tags is not None:
                note.tags = ",".join(tags) if tags else None
            
            self.db.commit()
            self.db.refresh(note)
            
            logger.info(f"Updated note {note_id}")
            return note
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update note {note_id}: {e}")
            raise
    
    def delete_note(self, note_id: int) -> bool:
        """Delete note and all its relationships"""
        try:
            note = self.get_note(note_id)
            if not note:
                return False
            
            # Delete all relationships
            self.db.query(NoteRelationship).filter(
                or_(
                    NoteRelationship.note_id == note_id,
                    and_(
                        NoteRelationship.target_type == EntityType.NOTE,
                        NoteRelationship.target_id == note_id
                    )
                )
            ).delete()
            
            # Delete note
            self.db.delete(note)
            self.db.commit()
            
            logger.info(f"Deleted note {note_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete note {note_id}: {e}")
            raise
    
    # Relationship management
    
    def create_relationship(
        self,
        note_id: int,
        target_type: EntityType,
        target_id: int,
        relationship_type: RelationshipType,
        description: Optional[str] = None
    ) -> NoteRelationship:
        """
        Create a relationship between a note and another entity
        
        Args:
            note_id: Source note ID
            target_type: Type of target entity
            target_id: Target entity ID
            relationship_type: Type of relationship
            description: Optional description
            
        Returns:
            Created relationship
        """
        try:
            relationship = NoteRelationship(
                note_id=note_id,
                target_type=target_type,
                target_id=target_id,
                relationship_type=relationship_type,
                description=description
            )
            
            self.db.add(relationship)
            self.db.commit()
            self.db.refresh(relationship)
            
            logger.info(f"Created relationship: note {note_id} -> {target_type}:{target_id}")
            return relationship
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create relationship: {e}")
            raise
    
    def get_note_relationships(self, note_id: int) -> List[NoteRelationship]:
        """Get all relationships for a note"""
        return self.db.query(NoteRelationship).filter(
            NoteRelationship.note_id == note_id
        ).all()
    
    def get_related_notes(
        self,
        target_type: EntityType,
        target_id: int
    ) -> List[Note]:
        """
        Get all notes related to a specific entity
        
        Args:
            target_type: Type of entity
            target_id: Entity ID
            
        Returns:
            List of related notes
        """
        relationships = self.db.query(NoteRelationship).filter(
            and_(
                NoteRelationship.target_type == target_type,
                NoteRelationship.target_id == target_id
            )
        ).all()
        
        note_ids = [rel.note_id for rel in relationships]
        
        if not note_ids:
            return []
        
        return self.db.query(Note).filter(Note.id.in_(note_ids)).all()
    
    def delete_relationship(self, relationship_id: int) -> bool:
        """Delete a specific relationship"""
        try:
            relationship = self.db.query(NoteRelationship).filter(
                NoteRelationship.id == relationship_id
            ).first()
            
            if not relationship:
                return False
            
            self.db.delete(relationship)
            self.db.commit()
            
            logger.info(f"Deleted relationship {relationship_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete relationship {relationship_id}: {e}")
            raise
    
    # Graph queries
    
    def get_note_graph(self, note_id: int, depth: int = 2) -> Dict[str, Any]:
        """
        Get graph of relationships for a note
        
        Args:
            note_id: Starting note ID
            depth: How many levels deep to traverse
            
        Returns:
            Graph structure with nodes and edges
        """
        visited = set()
        nodes = []
        edges = []
        
        def traverse(current_id: int, current_depth: int):
            if current_depth > depth or current_id in visited:
                return
            
            visited.add(current_id)
            
            # Get note
            note = self.get_note(current_id)
            if note:
                nodes.append({
                    "id": note.id,
                    "type": "note",
                    "content": note.content[:100],
                    "tags": note.tags.split(",") if note.tags else []
                })
            
            # Get relationships
            relationships = self.get_note_relationships(current_id)
            
            for rel in relationships:
                edges.append({
                    "source": rel.note_id,
                    "target": f"{rel.target_type.value}:{rel.target_id}",
                    "type": rel.relationship_type.value,
                    "description": rel.description
                })
                
                # If target is another note, traverse it
                if rel.target_type == EntityType.NOTE:
                    traverse(rel.target_id, current_depth + 1)
        
        traverse(note_id, 0)
        
        return {
            "nodes": nodes,
            "edges": edges
        }
    
    def search_notes(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Note]:
        """
        Search notes by content and tags
        
        Args:
            query: Search query
            tags: Optional tag filters
            limit: Maximum results
            
        Returns:
            List of matching notes
        """
        db_query = self.db.query(Note)
        
        # Search in content
        if query:
            db_query = db_query.filter(Note.content.contains(query))
        
        # Filter by tags
        if tags:
            tag_filters = [Note.tags.contains(tag) for tag in tags]
            db_query = db_query.filter(or_(*tag_filters))
        
        # Order by relevance (most recent first for now)
        db_query = db_query.order_by(Note.created_at.desc())
        
        return db_query.limit(limit).all()
