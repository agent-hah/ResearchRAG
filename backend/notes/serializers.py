from rest_framework import serializers
from .models import Note, NoteRelationship

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = '__all__'

class NoteRelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteRelationship
        fields = '__all__'
