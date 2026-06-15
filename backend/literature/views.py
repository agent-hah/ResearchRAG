from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from django.http import FileResponse

from literature.models import Literature, Annotation, ProcessingStatus
from literature.serializers import LiteratureSerializer, AnnotationSerializer
from files.services.file_service import FileService
import threading
from literature.services.pdf_processor import PDFProcessor

def process_pdf_background(literature_id, file_path):
    from literature.models import Literature
    literature = Literature.objects.get(id=literature_id)
    try:
        from literature.services.pdf_processor import PDFProcessor
        from rag.services.rag_service import get_rag_service
        
        literature, text_content = PDFProcessor.process_pdf_file(file_path, literature)
        
        rag_service = get_rag_service()
        rag_service.index_literature(literature, text_content)
    except Exception as e:
        print(f"Error in background processing: {e}")

class AnnotationViewSet(viewsets.ModelViewSet):
    serializer_class = AnnotationSerializer

    def get_queryset(self):
        queryset = Annotation.objects.all()
        literature_id = self.request.query_params.get('literature_id')
        page_number = self.request.query_params.get('page_number')
        if literature_id:
            queryset = queryset.filter(literature_id=literature_id)
        if page_number:
            queryset = queryset.filter(page_number=page_number)
        return queryset

class LiteratureViewSet(viewsets.ModelViewSet):
    queryset = Literature.objects.all()
    serializer_class = LiteratureSerializer

    def perform_destroy(self, instance):
        try:
            from rag.services.rag_service import get_rag_service
            # Delete associated vector embeddings from Chroma DB
            get_rag_service().delete_literature_index(instance.id)
        except Exception as e:
            print(f"Error deleting embeddings for literature {instance.id}: {e}")
            
        try:
            from django.core.files.storage import default_storage
            if instance.file_path and default_storage.exists(instance.file_path):
                default_storage.delete(instance.file_path)
        except Exception as e:
            print(f"Error deleting file for literature {instance.id}: {e}")
            
        instance.delete()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        literature = self.get_object()
        from django.core.files.storage import default_storage
        response = FileResponse(default_storage.open(literature.file_path, 'rb'), as_attachment=False, filename=literature.filename)
        response['Access-Control-Expose-Headers'] = 'Accept-Ranges, Content-Range, Content-Encoding, Content-Length'
        return response

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        literature = self.get_object()
        literature.processing_status = ProcessingStatus.PENDING
        literature.save()
        thread = threading.Thread(target=process_pdf_background, args=(literature.id, literature.file_path))
        thread.start()
        return Response({"status": "processing_started"})

class FileUploadView(views.APIView):
    def post(self, request, format=None):
        file = request.FILES.get('file')
        file_type = request.data.get('type', 'pdf')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if file_type == 'pdf':
            is_valid, error_msg = FileService.validate_file(file, FileService.ALLOWED_PDF_EXTENSIONS)
            if not is_valid:
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            saved_path, file_size = FileService.save_uploaded_file(file)
            
            literature = FileService.create_literature_record(
                filename=file.name,
                file_path=saved_path,
                file_size=file_size
            )
            
            # Start background thread
            thread = threading.Thread(target=process_pdf_background, args=(literature.id, saved_path))
            thread.start()
            
            return Response(LiteratureSerializer(literature).data, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": "Unsupported file type"}, status=status.HTTP_400_BAD_REQUEST)
