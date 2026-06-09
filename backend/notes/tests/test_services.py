import pytest
from django.db.utils import IntegrityError
from notes.models import Note, NoteRelationship, RelationshipType, EntityType
from notes.services.notes_service import NotesService
from rag.models import Dataset
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
def test_create_note():
    ds = Dataset.objects.create(
        name="Test Dataset", 
        filename="test.csv",
        file_path="/tmp/test.csv",
        file_size_bytes=100,
        table_name="test_dataset_1"
    )
    note = NotesService.create_note("Test title", "Test content", tags=["tag1", "tag2"], dataset_id=ds.id)
    assert note.id is not None
    assert note.title == "Test title"
    assert note.content == "Test content"
    assert note.tags == "tag1,tag2"
    assert note.dataset_id == ds.id

@pytest.mark.django_db
def test_create_note_exception():
    with patch('notes.models.Note.objects.create', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            NotesService.create_note("Test title", "Test content")

@pytest.mark.django_db
def test_get_note():
    note = NotesService.create_note("Test title", "Test content")
    fetched = NotesService.get_note(note.id)
    assert fetched.id == note.id

@pytest.mark.django_db
def test_list_notes():
    NotesService.create_note("First note", "First note", tags=["a", "b"])
    NotesService.create_note("Second note", "Second note", tags=["b", "c"])
    
    notes = NotesService.list_notes()
    assert len(notes) == 2
    
    notes_with_tag = NotesService.list_notes(tags=["c"])
    assert len(notes_with_tag) == 1
    assert notes_with_tag[0].content == "Second note"
    
    notes_with_search = NotesService.list_notes(search="First")
    assert len(notes_with_search) == 1
    assert notes_with_search[0].content == "First note"

@pytest.mark.django_db
def test_update_note():
    note = NotesService.create_note("Old title", "Old content", tags=["old"])
    
    updated = NotesService.update_note(note.id, title="New title", content="New content", tags=["new"])
    assert updated.title == "New title"
    assert updated.content == "New content"
    assert updated.tags == "new"
    
    # Test update not found
    assert NotesService.update_note(9999) is None

@pytest.mark.django_db
def test_update_note_exception():
    note = NotesService.create_note("Old title", "Old content")
    with patch('notes.models.Note.save', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            NotesService.update_note(note.id, content="Error")

@pytest.mark.django_db
def test_delete_note():
    note = NotesService.create_note("To delete", "To delete")
    NotesService.create_relationship(note.id, EntityType.DATASET, 1, RelationshipType.REFERENCES)
    
    assert NotesService.delete_note(note.id) is True
    assert NotesService.get_note(note.id) is None
    assert len(NotesService.get_note_relationships(note.id)) == 0
    
    # Delete non-existent
    assert NotesService.delete_note(9999) is False

@pytest.mark.django_db
def test_delete_note_exception():
    note = NotesService.create_note("To delete", "To delete")
    with patch('notes.models.Note.delete', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            NotesService.delete_note(note.id)

@pytest.mark.django_db
def test_create_relationship():
    note = NotesService.create_note("Note title", "Note")
    rel = NotesService.create_relationship(note.id, EntityType.LITERATURE, 2, RelationshipType.SUPPORTS, "Test rel")
    assert rel.id is not None
    assert rel.target_type == EntityType.LITERATURE
    assert rel.target_id == 2
    assert rel.relationship_type == RelationshipType.SUPPORTS

@pytest.mark.django_db
def test_create_relationship_exception():
    with patch('notes.models.NoteRelationship.objects.create', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            NotesService.create_relationship(1, EntityType.DATASET, 1, RelationshipType.REFERENCES)

@pytest.mark.django_db
def test_get_related_notes():
    note1 = NotesService.create_note("Note 1", "Note 1")
    note2 = NotesService.create_note("Note 2", "Note 2")
    NotesService.create_note("Note 3", "Note 3") # Not related
    
    NotesService.create_relationship(note1.id, EntityType.QUERY, 10, RelationshipType.REFERENCES)
    NotesService.create_relationship(note2.id, EntityType.QUERY, 10, RelationshipType.REFERENCES)
    
    related = NotesService.get_related_notes(EntityType.QUERY, 10)
    assert len(related) == 2
    
    empty_related = NotesService.get_related_notes(EntityType.QUERY, 99)
    assert len(empty_related) == 0

@pytest.mark.django_db
def test_delete_relationship():
    note = NotesService.create_note("Note", "Note")
    rel = NotesService.create_relationship(note.id, EntityType.LITERATURE, 2, RelationshipType.SUPPORTS)
    
    assert NotesService.delete_relationship(rel.id) is True
    assert len(NotesService.get_note_relationships(note.id)) == 0
    
    assert NotesService.delete_relationship(9999) is False

@pytest.mark.django_db
def test_delete_relationship_exception():
    note = NotesService.create_note("Note", "Note")
    rel = NotesService.create_relationship(note.id, EntityType.LITERATURE, 2, RelationshipType.SUPPORTS)
    
    with patch('notes.models.NoteRelationship.delete', side_effect=Exception("DB Error")):
        with pytest.raises(Exception):
            NotesService.delete_relationship(rel.id)

@pytest.mark.django_db
def test_get_note_graph():
    note1 = NotesService.create_note("Note 1", "Note 1")
    note2 = NotesService.create_note("Note 2", "Note 2")
    note3 = NotesService.create_note("Note 3", "Note 3")
    
    # note1 references literature 1
    NotesService.create_relationship(note1.id, EntityType.LITERATURE, 1, RelationshipType.REFERENCES)
    # note1 references note2
    NotesService.create_relationship(note1.id, EntityType.NOTE, note2.id, RelationshipType.SUPPORTS)
    # note2 references note3
    NotesService.create_relationship(note2.id, EntityType.NOTE, note3.id, RelationshipType.CONTRADICTS)
    # Circular reference to trigger `current_id in visited`
    NotesService.create_relationship(note3.id, EntityType.NOTE, note1.id, RelationshipType.RELATED_TO)
    
    graph = NotesService.get_note_graph(note1.id, depth=2)
    assert len(graph['nodes']) == 3
    assert len(graph['edges']) == 4
    
    # Test depth limit
    graph_depth_1 = NotesService.get_note_graph(note1.id, depth=1)
    assert len(graph_depth_1['nodes']) > 0

@pytest.mark.django_db
def test_search_notes():
    NotesService.create_note("Unique pattern A", "Unique pattern A", tags=["t1"])
    NotesService.create_note("Unique pattern B", "Unique pattern B", tags=["t1"])
    NotesService.create_note("Other text", "Other text", tags=["t2"])
    
    res1 = NotesService.search_notes("Unique", tags=["t1"])
    assert len(res1) == 2
    
    res2 = NotesService.search_notes("pattern B")
    assert len(res2) == 1
    
    res3 = NotesService.search_notes("", tags=["t2"])
    assert len(res3) == 1
