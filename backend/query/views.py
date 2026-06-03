from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from rag.models import Dataset
from query.models import QueryHistory, DocumentSuggestion
from query.serializers import QueryHistorySerializer, DocumentSuggestionSerializer
from services.query_service import get_query_service
from services.file_service import FileService
from services.csv_processor import CSVProcessor
import threading

def process_csv_background(dataset_id, file_path):
    dataset = Dataset.objects.get(id=dataset_id)
    try:
        CSVProcessor.process_csv_file(file_path, dataset)
    except Exception as e:
        print(f"Error processing CSV: {e}")

class DatasetUploadView(views.APIView):
    def post(self, request, format=None):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
            
        is_valid, error_msg = FileService.validate_file(file, FileService.ALLOWED_CSV_EXTENSIONS)
        if not is_valid:
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        file_path = settings.UPLOAD_DIR / file.name
        file_size = FileService.save_uploaded_file(file, file_path)
        
        dataset = FileService.create_dataset_record(
            filename=file.name,
            file_path=str(file_path),
            file_size=file_size
        )
        
        thread = threading.Thread(target=process_csv_background, args=(dataset.id, str(file_path)))
        thread.start()
        
        return Response({"id": dataset.id, "filename": dataset.filename, "status": "processing"}, status=status.HTTP_201_CREATED)

from rag.serializers import DatasetSerializer

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        dataset = self.get_object()
        if not dataset.table_name:
            return Response({"error": "Dataset not yet processed"}, status=status.HTTP_400_BAD_REQUEST)
            
        limit = int(request.query_params.get('limit', 1000))
        rows = CSVProcessor.get_table_preview(dataset.table_name, limit=limit)
        schema = CSVProcessor.get_table_schema(dataset.table_name)
        return Response({
            "dataset_id": dataset.id,
            "table_name": dataset.table_name,
            "row_count": dataset.row_count,
            "schema": schema,
            "rows": rows
        })

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        dataset = self.get_object()
        # Drop existing table if needed? CSVProcessor handles it with replace/append
        thread = threading.Thread(target=process_csv_background, args=(dataset.id, dataset.file_path))
        thread.start()
        return Response({"status": "processing_started"})

class DatabaseSchemaView(views.APIView):
    def get(self, request):
        query_service = get_query_service()
        schemas = query_service.get_database_schema()
        return Response(schemas)

class ExecuteSQLView(views.APIView):
    def post(self, request):
        sql = request.data.get('sql')
        if not sql:
            return Response({"error": "No SQL query provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        query_service = get_query_service()
        result = query_service.execute_sql(sql)
        return Response(result)

class QueryHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = QueryHistory.objects.all().order_by('-created_at')
    serializer_class = QueryHistorySerializer

class QueryExecutionView(views.APIView):
    def post(self, request):
        query = request.data.get('query')
        dataset_ids = request.data.get('dataset_ids', None)
        literature_ids = request.data.get('literature_ids', None)
        max_literature = request.data.get('max_literature', 10)
        
        query_service = get_query_service()
        schemas = query_service.get_database_schema()
        
        sql_generation = query_service.generate_sql(query, schemas, dataset_ids)
        sql_query = sql_generation.get("sql_query")
        
        sql_result = {"row_count": 0, "rows": []}
        if sql_query:
            sql_result = query_service.execute_sql(sql_query)
            
        literature_context = query_service.get_literature_context(query, max_literature, literature_ids)
        
        synthesis = query_service.synthesize_results(query, sql_result, literature_context)
        
        history = query_service.save_query_history(
            query=query,
            sql_query=sql_query,
            row_count=sql_result.get("row_count", 0),
            processing_time_ms=sql_result.get("execution_time_ms", 0)
        )
        
        return Response({
            "query_id": str(history.id),
            "question": query,
            "sql_query": sql_query,
            "sql_confidence": sql_generation.get("confidence", 0.0),
            "data_results": sql_result,
            "literature_context": literature_context,
            "synthesis": synthesis,
            "created_at": history.created_at.isoformat() if history.created_at else None
        })
