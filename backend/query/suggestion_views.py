from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from query.models import DocumentSuggestion
from query.serializers import DocumentSuggestionSerializer
from query.services.document_suggestion_service import DocumentSuggestionService
import asyncio

class SuggestionViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSuggestionSerializer

    def get_queryset(self):
        queryset = DocumentSuggestion.objects.filter(user_id=self.request.user_id).order_by('-created_at')
        
        # Filter by dataset_id (optional)
        dataset_id = self.request.query_params.get('dataset_id', None)
        if dataset_id == 'global':
            queryset = queryset.filter(dataset__isnull=True)
        elif dataset_id:
            try:
                ids = [int(id.strip()) for id in str(dataset_id).split(',')]
                queryset = queryset.filter(dataset_id__in=ids)
            except ValueError:
                pass
            
        # Filter dismissed
        include_dismissed = self.request.query_params.get('include_dismissed', 'false').lower() == 'true'
        if not include_dismissed:
            queryset = queryset.filter(is_dismissed=False)
            
        return queryset

    @action(detail=False, methods=['delete'], url_path=r'dataset/(?P<dataset_id>[\d,]+)')
    def delete_by_dataset(self, request, dataset_id=None):
        service = DocumentSuggestionService()
        try:
            ids = [int(id.strip()) for id in str(dataset_id).split(',')]
        except ValueError:
            ids = []
        count = 0
        for d_id in ids:
            count += service.delete_suggestions_for_dataset(dataset_id=d_id)
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
            dataset_ids = None
        else:
            try:
                dataset_ids = [int(id.strip()) for id in str(dataset_id).split(',')]
            except ValueError:
                return Response({"error": "Invalid dataset_id"}, status=status.HTTP_400_BAD_REQUEST)
                
        service = DocumentSuggestionService()
        
        # Start generation in a background thread since it's async and takes time
        import threading
        
        def run_sync_generation():
            try:
                service.generate_suggestions_for_dataset(
                    dataset_ids=dataset_ids,
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
            dataset_ids = None
        else:
            try:
                dataset_ids = [int(id.strip()) for id in str(dataset_id).split(',')]
            except ValueError:
                dataset_ids = []
            
        service = DocumentSuggestionService()
        
        # Getting keywords is sync
        keywords = service.analyze_dataset_for_keywords(dataset_ids=dataset_ids)
        
        return Response({
            "dataset_id": dataset_id or 'global',
            "keywords": keywords
        })

class SuggestionStatusView(APIView):
    def get(self, request, dataset_id=None):
        from django.core.cache import cache
        
        if str(dataset_id).lower() == 'global':
            cache_id = 'global'
        else:
            try:
                dataset_ids = [int(id.strip()) for id in str(dataset_id).split(',')]
                cache_id = ",".join(map(str, dataset_ids))
            except ValueError:
                cache_id = 'global'
            
        cache_key = f"suggestion_progress_{cache_id}"
        progress_data = cache.get(cache_key)
        
        if not progress_data:
            return Response({
                "status": "idle",
                "progress": 0
            })
            
        return Response(progress_data)
