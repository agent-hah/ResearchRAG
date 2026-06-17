from rest_framework import serializers
from .models import QueryHistory, DocumentSuggestion

class QueryHistorySerializer(serializers.ModelSerializer):
    query = serializers.CharField(source='query_text')
    row_count = serializers.IntegerField(source='result_count')
    processing_time_ms = serializers.IntegerField(source='execution_time_ms')
    literature_count = serializers.SerializerMethodField()

    class Meta:
        model = QueryHistory
        fields = ['id', 'query', 'row_count', 'processing_time_ms', 'literature_count', 'created_at', 'data_results', 'literature_context', 'synthesis']

    def get_literature_count(self, obj):
        if not obj.literature_context:
            return 0
            
        valid_docs = set()
        for chunk in obj.literature_context:
            if chunk.get('relevance_score', 0.0) > 0.50:
                doc_id = chunk.get('literature_id') or chunk.get('title')
                if doc_id:
                    valid_docs.add(doc_id)
                    
        return len(valid_docs)

class DocumentSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSuggestion
        fields = '__all__'
