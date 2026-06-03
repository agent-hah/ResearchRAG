from rest_framework import serializers
from .models import QueryHistory, DocumentSuggestion

class QueryHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryHistory
        fields = '__all__'

class DocumentSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSuggestion
        fields = '__all__'
