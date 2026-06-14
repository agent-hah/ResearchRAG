from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from rag.models import Dataset
from query.models import QueryHistory, DocumentSuggestion
from query.serializers import QueryHistorySerializer, DocumentSuggestionSerializer
from query.services.query_service import get_query_service
from files.services.file_service import FileService
from query.services.csv_processor import CSVProcessor
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
        
        unique_filename = FileService.get_unique_filename(settings.UPLOAD_DIR, file.name)
        file_path = settings.UPLOAD_DIR / unique_filename
        file_size = FileService.save_uploaded_file(file, file_path)
        
        dataset = FileService.create_dataset_record(
            filename=unique_filename,
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

    def perform_destroy(self, instance):
        try:
            from query.services.csv_processor import CSVProcessor
            if instance.table_name:
                CSVProcessor.drop_table(instance.table_name)
        except Exception as e:
            print(f"Error dropping table for dataset {instance.id}: {e}")
            
        try:
            from pathlib import Path
            file_path = Path(instance.file_path)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error deleting file for dataset {instance.id}: {e}")
            
        instance.delete()

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

    @action(detail=True, methods=['get'])
    def viz_data(self, request, pk=None):
        dataset = self.get_object()
        try:
            from query.services.viz_service import VizService
            limit = int(request.query_params.get('limit', 1000))
            data = VizService.get_viz_data(dataset.id, limit)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def spatial_data(self, request, pk=None):
        dataset = self.get_object()
        try:
            from query.services.viz_service import VizService
            limit = int(request.query_params.get('limit', 1000))
            data = VizService.get_spatial_data(dataset.id, limit)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

class QueryHistoryViewSet(viewsets.ModelViewSet):
    queryset = QueryHistory.objects.all().order_by('-created_at')
    serializer_class = QueryHistorySerializer

    def list(self, request, *args, **kwargs):
        skip = int(request.query_params.get('skip', 0))
        limit = int(request.query_params.get('limit', 20))
        
        queryset = self.get_queryset()
        total_count = queryset.count()
        
        queries = queryset[skip:skip+limit]
        serializer = self.get_serializer(queries, many=True)
        
        return Response({
            "queries": serializer.data,
            "total_count": total_count,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit
        })

class QueryExecutionView(views.APIView):
    def post(self, request):
        query = request.data.get('query')
        dataset_ids = request.data.get('dataset_ids', None)
        literature_ids = request.data.get('literature_ids', None)
        max_literature = request.data.get('max_literature', 10)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received query execution request: {query}")
        
        query_service = get_query_service()
        logger.info("Fetching database schema...")
        schemas = query_service.get_database_schema()
        logger.info(f"Got {len(schemas)} schemas.")
        
        previous_query = None
        previous_error = None
        sql_generation = None
        sql_query = None
        sql_result = {"row_count": 0, "rows": []}
        
        for attempt in range(3):
            logger.info(f"SQL generation attempt {attempt+1}")
            sql_generation = query_service.generate_sql(
                query, schemas, dataset_ids, previous_query, previous_error
            )
            sql_query = sql_generation.get("sql_query")
            
            if not sql_query:
                logger.info("No SQL generated, breaking loop.")
                break
                
            logger.info(f"Executing SQL: {sql_query}")
            sql_result = query_service.execute_sql(sql_query)
            if "error" in sql_result and any(err in sql_result["error"].lower() for err in ["no such column", "no such table", "syntax error", "operationalerror"]):
                logger.warning(f"SQL error: {sql_result['error']}")
                previous_query = sql_query
                previous_error = sql_result["error"]
                continue
            else:
                logger.info("SQL executed successfully.")
                break
            
        logger.info("Getting literature context...")
        literature_context = query_service.get_literature_context(query, max_literature, literature_ids)
        logger.info(f"Got {len(literature_context)} literature snippets.")
        
        logger.info("Synthesizing results...")
        synthesis = query_service.synthesize_results(query, sql_result, literature_context)
        logger.info("Synthesis complete.")
        
        history = query_service.save_query_history(
            query=query,
            sql_query=sql_query,
            row_count=sql_result.get("row_count", 0),
            processing_time_ms=sql_result.get("execution_time_ms", 0),
            sql_confidence=sql_generation.get("confidence", 0.0),
            data_results=sql_result,
            literature_context=literature_context,
            synthesis=synthesis
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
