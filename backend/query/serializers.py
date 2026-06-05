from rest_framework import serializers
from .models import QueryHistory, DocumentSuggestion

class QueryHistorySerializer(serializers.ModelSerializer):
    query = serializers.CharField(source='query_text')
    row_count = serializers.IntegerField(source='result_count')
    processing_time_ms = serializers.IntegerField(source='execution_time_ms')
    literature_count = serializers.SerializerMethodField()

    class Meta:
        model = QueryHistory
        fields = ['id', 'query', 'sql_query', 'row_count', 'processing_time_ms', 'literature_count', 'created_at', 'sql_confidence', 'data_results', 'literature_context', 'synthesis']

    def get_literature_count(self, obj):
        # We don't have this in the model yet, default to 0
        return 0

class DocumentSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSuggestion
        fields = '__all__'
