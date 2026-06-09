from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .services.export_service import ExportService
from rag.models import Dataset

class ExportDatasetView(APIView):
    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        format_type = request.data.get('format', 'csv')
        
        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            dataset = Dataset.objects.get(id=dataset_id)
            base_name = dataset.filename
            if base_name.lower().endswith('.csv'):
                base_name = base_name[:-4]
            elif base_name.lower().endswith('.json'):
                base_name = base_name[:-5]
        except Dataset.DoesNotExist:
            base_name = f"dataset_{dataset_id}"
            
        export_service = ExportService()
        try:
            if format_type == 'csv':
                content = export_service.export_dataset_csv(dataset_id)
                response = HttpResponse(content, content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="{base_name}.csv"'
                return response
            elif format_type == 'json':
                content = export_service.export_dataset_json(dataset_id)
                response = HttpResponse(content, content_type='application/json')
                response['Content-Disposition'] = f'attachment; filename="{base_name}.json"'
                return response
            else:
                return Response({"error": "Invalid format. Use 'csv' or 'json'."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportQueryView(APIView):
    def post(self, request):
        query_ids = request.data.get('query_ids', [])
        format_type = request.data.get('format', 'csv')
        
        if not query_ids or not isinstance(query_ids, list):
            return Response({"error": "A list of query_ids is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        export_service = ExportService()
        try:
            if format_type == 'json':
                content = export_service.export_query_results_json(query_ids)
                response = HttpResponse(content, content_type='application/json')
                response['Content-Disposition'] = 'attachment; filename="query_results.json"'
                return response
            elif format_type == 'csv':
                content = export_service.export_query_results_csv(query_ids)
                response = HttpResponse(content, content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="query_results.csv"'
                return response
            else:
                return Response({"error": "Invalid format. Use 'json' or 'csv'."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportNotesView(APIView):
    def post(self, request):
        format_type = request.data.get('format', 'markdown')
        note_ids = request.data.get('note_ids', None)
        
        export_service = ExportService()
        try:
            if format_type == 'markdown':
                content = export_service.export_notes_markdown(note_ids)
                response = HttpResponse(content, content_type='text/markdown')
                response['Content-Disposition'] = 'attachment; filename="notes.md"'
                return response
            elif format_type == 'json':
                content = export_service.export_notes_json(note_ids)
                response = HttpResponse(content, content_type='application/json')
                response['Content-Disposition'] = 'attachment; filename="notes.json"'
                return response
            elif format_type == 'csv':
                content = export_service.export_notes_csv(note_ids)
                response = HttpResponse(content, content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="notes.csv"'
                return response
            else:
                return Response({"error": "Invalid format. Use 'markdown', 'json' or 'csv'."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportLiteraturePDFView(APIView):
    def post(self, request):
        literature_id = request.data.get('literature_id')
        include_annotations = request.data.get('include_annotations', False)
        
        if not literature_id:
            return Response({"error": "literature_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        export_service = ExportService()
        try:
            pdf_bytes, filename = export_service.export_literature_pdf(literature_id, include_annotations)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
