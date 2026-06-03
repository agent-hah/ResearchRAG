from rest_framework import views, status
from rest_framework.response import Response
from django.conf import settings
from services.rag_service import get_rag_service
from services.file_service import FileService
from literature.models import Literature, ProcessingStatus
import threading

def index_literature_background(literature_id):
    literature = Literature.objects.get(id=literature_id)
    try:
        rag_service = get_rag_service()
        # Ensure we have text content
        if literature.processing_status == ProcessingStatus.PENDING:
            from services.pdf_processor import PDFProcessor
            _, text_content = PDFProcessor.process_pdf_file(literature.file_path, literature)
        else:
            from services.pdf_processor import PDFProcessor
            text_content = PDFProcessor.extract_text(literature.file_path)
            
        rag_service.index_literature(literature, text_content)
    except Exception as e:
        print(f"Background indexing failed for {literature_id}: {e}")

class RAGIndexView(views.APIView):
    def post(self, request):
        literature_id = request.data.get('literature_id')
        force_reindex = request.data.get('force_reindex', False)
        
        try:
            literature = Literature.objects.get(id=literature_id)
        except Literature.DoesNotExist:
            return Response({"error": "Literature not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if literature.processing_status == ProcessingStatus.INDEXED and not force_reindex:
            return Response({"status": "already_indexed", "message": "Already indexed"}, status=status.HTTP_200_OK)
            
        thread = threading.Thread(target=index_literature_background, args=(literature.id,))
        thread.start()
        
        return Response({"status": "indexing", "message": "Scheduled"}, status=status.HTTP_202_ACCEPTED)

class RAGSearchView(views.APIView):
    def post(self, request):
        query = request.data.get('query')
        top_k = request.data.get('top_k', 5)
        literature_ids = request.data.get('literature_ids', None)
        
        rag_service = get_rag_service()
        results = rag_service.search_literature(query=query, top_k=top_k, literature_ids=literature_ids)
        
        return Response({"results": results})

class RAGStatsView(views.APIView):
    def get(self, request):
        rag_service = get_rag_service()
        stats = rag_service.get_stats()
        return Response(stats)
