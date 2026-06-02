"""
Simple notes service for MVP
"""
from typing import List, Dict
from database.db_manager import DatabaseManager


class NotesService:
    """Handles note operations"""
    
    def __init__(self):
        self.db = DatabaseManager()
    
    def create_note(self, content: str, tags: str = "", 
                   entity_type: str = None, entity_id: int = None) -> int:
        """Create a new note"""
        return self.db.add_note(content, tags, entity_type, entity_id)
    
    def get_notes(self, entity_type: str = None, entity_id: int = None) -> List[Dict]:
        """Get notes, optionally filtered"""
        return self.db.get_notes(entity_type, entity_id)
    
    def delete_note(self, note_id: int):
        """Delete a note"""
        self.db.delete_note(note_id)
    
    def search_notes(self, search_term: str) -> List[Dict]:
        """Search notes by content"""
        all_notes = self.db.get_notes()
        return [note for note in all_notes 
                if search_term.lower() in note['content'].lower()]
