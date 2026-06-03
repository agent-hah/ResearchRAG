from django.db import models
from literature.models import TimeStampedModel

class Note(TimeStampedModel):
    content = models.TextField()
    tags = models.CharField(max_length=512, null=True, blank=True)
    dataset = models.ForeignKey('rag.Dataset', on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    literature = models.ForeignKey('literature.Literature', on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    query = models.ForeignKey('query.QueryHistory', on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    linked_note_ids = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"<Note(id={self.id}, content='{self.content[:50]}...')>"

class RelationshipType(models.TextChoices):
    REFERENCES = 'references', 'References'
    DERIVED_FROM = 'derived_from', 'Derived From'
    RELATED_TO = 'related_to', 'Related To'
    CONTRADICTS = 'contradicts', 'Contradicts'
    SUPPORTS = 'supports', 'Supports'
    QUESTIONS = 'questions', 'Questions'

class EntityType(models.TextChoices):
    NOTE = 'note', 'Note'
    QUERY = 'query', 'Query'
    DATASET = 'dataset', 'Dataset'
    LITERATURE = 'literature', 'Literature'
    VISUALIZATION = 'visualization', 'Visualization'

class NoteRelationship(TimeStampedModel):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='relationships')
    target_type = models.CharField(max_length=20, choices=EntityType.choices)
    target_id = models.IntegerField()
    relationship_type = models.CharField(max_length=20, choices=RelationshipType.choices)
    description = models.CharField(max_length=512, null=True, blank=True)

    def __str__(self):
        return f"<NoteRelationship(note_id={self.note_id}, target={self.target_type}:{self.target_id}, type={self.relationship_type})>"
