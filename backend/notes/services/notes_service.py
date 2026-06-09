"""
Notes Service (Django ORM).

Manages notes with graph-based relationships to queries, datasets, literature, and visualizations.
"""

from typing import List, Optional, Dict, Any
from django.db.models import Q
from notes.models import Note, NoteRelationship, RelationshipType, EntityType

import logging
logger = logging.getLogger(__name__)

class NotesService:
    """Service for managing notes and their relationships"""
    
    @staticmethod
    def create_note(
        title: str,
        content: str,
        tags: Optional[List[str]] = None,
        dataset_id: Optional[int] = None,
        literature_id: Optional[int] = None,
        query_id: Optional[int] = None
    ) -> Note:
        try:
            note = Note.objects.create(
                title=title,
                content=content,
                tags=",".join(tags) if tags else None,
                dataset_id=dataset_id,
                literature_id=literature_id,
                query_id=query_id
            )
            logger.info(f"Created note {note.id}")
            return note
        except Exception as e:
            logger.error(f"Failed to create note: {e}")
            raise

    @staticmethod
    def get_note(note_id: int) -> Optional[Note]:
        return Note.objects.filter(id=note_id).first()

    @staticmethod
    def list_notes(
        skip: int = 0,
        limit: int = 20,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None
    ) -> List[Note]:
        queryset = Note.objects.all()
        
        if tags:
            tag_query = Q()
            for tag in tags:
                tag_query |= Q(tags__icontains=tag)
            queryset = queryset.filter(tag_query)
        
        if search:
            queryset = queryset.filter(content__icontains=search)
        
        queryset = queryset.order_by('-created_at')
        return list(queryset[skip:skip+limit])

    @staticmethod
    def update_note(
        note_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Note]:
        try:
            note = NotesService.get_note(note_id)
            if not note:
                return None
            
            if title is not None:
                note.title = title
            
            if content is not None:
                note.content = content
            
            if tags is not None:
                note.tags = ",".join(tags) if tags else None
            
            note.save()
            logger.info(f"Updated note {note_id}")
            return note
        except Exception as e:
            logger.error(f"Failed to update note {note_id}: {e}")
            raise

    @staticmethod
    def delete_note(note_id: int) -> bool:
        try:
            note = NotesService.get_note(note_id)
            if not note:
                return False
            
            NoteRelationship.objects.filter(
                Q(note_id=note_id) | Q(target_type=EntityType.NOTE, target_id=note_id)
            ).delete()
            
            note.delete()
            logger.info(f"Deleted note {note_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete note {note_id}: {e}")
            raise

    @staticmethod
    def create_relationship(
        note_id: int,
        target_type: str,
        target_id: int,
        relationship_type: str,
        description: Optional[str] = None
    ) -> NoteRelationship:
        try:
            relationship = NoteRelationship.objects.create(
                note_id=note_id,
                target_type=target_type,
                target_id=target_id,
                relationship_type=relationship_type,
                description=description
            )
            logger.info(f"Created relationship: note {note_id} -> {target_type}:{target_id}")
            return relationship
        except Exception as e:
            logger.error(f"Failed to create relationship: {e}")
            raise

    @staticmethod
    def get_note_relationships(note_id: int) -> List[NoteRelationship]:
        return list(NoteRelationship.objects.filter(note_id=note_id))

    @staticmethod
    def get_related_notes(target_type: str, target_id: int) -> List[Note]:
        relationships = NoteRelationship.objects.filter(
            target_type=target_type,
            target_id=target_id
        )
        note_ids = relationships.values_list('note_id', flat=True)
        if not note_ids:
            return []
        return list(Note.objects.filter(id__in=note_ids))

    @staticmethod
    def delete_relationship(relationship_id: int) -> bool:
        try:
            relationship = NoteRelationship.objects.filter(id=relationship_id).first()
            if not relationship:
                return False
            
            relationship.delete()
            logger.info(f"Deleted relationship {relationship_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete relationship {relationship_id}: {e}")
            raise

    @staticmethod
    def get_note_graph(note_id: int, depth: int = 2) -> Dict[str, Any]:
        visited = set()
        nodes = []
        edges = []
        
        def traverse(current_id: int, current_depth: int):
            if current_depth > depth or current_id in visited:
                return
            
            visited.add(current_id)
            note = NotesService.get_note(current_id)
            if note:
                nodes.append({
                    "id": note.id,
                    "title": note.title,
                    "type": "note",
                    "content": note.content[:100],
                    "tags": note.tags.split(",") if note.tags else []
                })
            
            relationships = NotesService.get_note_relationships(current_id)
            for rel in relationships:
                edges.append({
                    "source": rel.note_id,
                    "target": f"{rel.target_type}:{rel.target_id}",
                    "type": rel.relationship_type,
                    "description": rel.description
                })
                
                if rel.target_type == EntityType.NOTE:
                    traverse(rel.target_id, current_depth + 1)
        
        traverse(note_id, 0)
        return {
            "nodes": nodes,
            "edges": edges
        }

    @staticmethod
    def search_notes(query: str, tags: Optional[List[str]] = None, limit: int = 10) -> List[Note]:
        queryset = Note.objects.all()
        
        if query:
            queryset = queryset.filter(content__icontains=query)
        
        if tags:
            tag_query = Q()
            for tag in tags:
                tag_query |= Q(tags__icontains=tag)
            queryset = queryset.filter(tag_query)
        
        queryset = queryset.order_by('-created_at')
        return list(queryset[:limit])
