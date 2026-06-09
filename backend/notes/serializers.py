from rest_framework import serializers
from .models import Note, NoteRelationship

class NoteSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    dataset_id = serializers.IntegerField(source='dataset.id', read_only=True)
    literature_id = serializers.IntegerField(source='literature.id', read_only=True)
    query_id = serializers.IntegerField(source='query.id', read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'tags', 'dataset_id', 'literature_id', 'query_id', 'created_at', 'updated_at']

    def get_tags(self, obj):
        if obj.tags:
            return obj.tags.split(',')
        return []

class NoteRelationshipSerializer(serializers.ModelSerializer):
    note_id = serializers.IntegerField(source='note.id', read_only=True)

    class Meta:
        model = NoteRelationship
        fields = ['id', 'note_id', 'target_type', 'target_id', 'relationship_type', 'description', 'created_at', 'updated_at']
