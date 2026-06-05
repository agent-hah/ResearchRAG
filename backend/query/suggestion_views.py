from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from query.models import DocumentSuggestion
from query.serializers import DocumentSuggestionSerializer
from query.services.document_suggestion_service import DocumentSuggestionService
import asyncio

class SuggestionViewSet(viewsets.ModelViewSet):
    queryset = DocumentSuggestion.objects.all().order_by('-created_at')
    serializer_class = DocumentSuggestionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by dataset_id (optional)
        dataset_id = self.request.query_params.get('dataset_id', None)
        if dataset_id == 'global':
            queryset = queryset.filter(dataset__isnull=True)
        elif dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)
            
        # Filter dismissed
        include_dismissed = self.request.query_params.get('include_dismissed', 'false').lower() == 'true'
        if not include_dismissed:
            queryset = queryset.filter(is_dismissed=False)
            
        return queryset

    @action(detail=False, methods=['delete'], url_path=r'dataset/(?P<dataset_id>\d+)')
    def delete_by_dataset(self, request, dataset_id=None):
        service = DocumentSuggestionService()
        count = service.delete_suggestions_for_dataset(dataset_id=dataset_id)
        return Response({"deleted_count": count, "message": f"Deleted {count} suggestions."})
        
    @action(detail=False, methods=['delete'], url_path=r'global')
    def delete_global(self, request):
        service = DocumentSuggestionService()
        count = service.delete_suggestions_for_dataset(dataset_id=None)
        return Response({"deleted_count": count, "message": f"Deleted {count} global suggestions."})

    @action(detail=True, methods=['put'])
    def feedback(self, request, pk=None):
        service = DocumentSuggestionService()
        
        suggestion_id = int(pk)
        is_relevant = request.data.get('is_relevant')
        is_dismissed = request.data.get('is_dismissed')
        is_imported = request.data.get('is_imported')
        
        suggestion = service.update_suggestion_feedback(
            suggestion_id=suggestion_id,
            is_relevant=is_relevant,
            is_dismissed=is_dismissed,
            is_imported=is_imported
        )
        
        if not suggestion:
            return Response({"error": "Suggestion not found"}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = self.get_serializer(suggestion)
        return Response(serializer.data)

class SuggestionGenerateView(APIView):
    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        max_per_keyword = request.data.get('max_per_keyword', 3)
        
        # Convert string 'global' or empty to None
        if not dataset_id or str(dataset_id).lower() == 'global':
            dataset_id = None
        else:
            try:
                dataset_id = int(dataset_id)
            except ValueError:
                return Response({"error": "Invalid dataset_id"}, status=status.HTTP_400_BAD_REQUEST)
                
        service = DocumentSuggestionService()
        
        # Start generation in a background thread since it's async and takes time
        import threading
        
        def run_sync_generation():
            try:
                service.generate_suggestions_for_dataset(
                    dataset_id=dataset_id,
                    max_per_keyword=max_per_keyword
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Background suggestion generation failed: {e}")
                
        thread = threading.Thread(target=run_sync_generation)
        thread.start()
        
        return Response({
            "success": True, 
            "message": "Suggestion generation started in background."
        }, status=status.HTTP_202_ACCEPTED)

class SuggestionKeywordsView(APIView):
    def get(self, request, dataset_id=None):
        if str(dataset_id).lower() == 'global':
            dataset_id = None
            
        service = DocumentSuggestionService()
        
        # Getting keywords is sync
        keywords = service.analyze_dataset_for_keywords(dataset_id=dataset_id)
        
        return Response({
            "dataset_id": dataset_id or 'global',
            "keywords": keywords
        })

class SuggestionStatusView(APIView):
    def get(self, request, dataset_id=None):
        from django.core.cache import cache
        
        if str(dataset_id).lower() == 'global':
            dataset_id = None
            
        cache_key = f"suggestion_progress_{dataset_id or 'global'}"
        progress_data = cache.get(cache_key)
        
        if not progress_data:
            return Response({
                "status": "idle",
                "progress": 0
            })
            
        return Response(progress_data)
