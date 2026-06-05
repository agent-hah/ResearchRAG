from django.test import TestCase
from notes.models import Note, NoteRelationship, EntityType, RelationshipType
from notes.services.notes_service import NotesService

class NotesServiceTest(TestCase):
    def test_create_note(self):
        note = NotesService.create_note("Test content", ["tag1", "tag2"])
        self.assertEqual(note.content, "Test content")
        self.assertEqual(note.tags, "tag1,tag2")

        fetched = NotesService.get_note(note.id)
        self.assertEqual(fetched.id, note.id)

    def test_list_and_search_notes(self):
        NotesService.create_note("Test content 1", ["apple"])
        NotesService.create_note("Another text", ["banana"])

        notes = NotesService.list_notes()
        self.assertEqual(len(notes), 2)

        search_res = NotesService.search_notes("Another")
        self.assertEqual(len(search_res), 1)
        self.assertEqual(search_res[0].content, "Another text")

    def test_relationships(self):
        note1 = NotesService.create_note("Note 1")
        note2 = NotesService.create_note("Note 2")

        rel = NotesService.create_relationship(
            note1.id, EntityType.NOTE, note2.id, RelationshipType.REFERENCES
        )
        self.assertEqual(rel.note_id, note1.id)

        rels = NotesService.get_note_relationships(note1.id)
        self.assertEqual(len(rels), 1)

        graph = NotesService.get_note_graph(note1.id)
        self.assertIn("nodes", graph)
        self.assertIn("edges", graph)
        self.assertEqual(len(graph["nodes"]), 2)
        self.assertEqual(len(graph["edges"]), 1)
