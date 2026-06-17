from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from refinement.services import get_refinement_service
import logging

logger = logging.getLogger(__name__)

class RefineView(APIView):
    def post(self, request):
        try:
            command = request.data.get('command')
            current_config = request.data.get('current_config', {})
            
            if not command:
                return Response({'error': 'Command is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            service = get_refinement_service()
            updates = service.parse_refinement_command(command, current_config)
            refined_config = service.apply_refinement(current_config, updates)
            
            return Response({
                'updates': updates,
                'refined_config': refined_config,
                'explanation': f'Applied refinement based on command: {command}'
            })
        except Exception as e:
            logger.error(str(e))
            return Response({'error': 'An internal error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SuggestionsView(APIView):
    def post(self, request):
        try:
            chart_type = request.data.get('chart_type', 'bar')
            data_summary = request.data.get('data_summary', {})
            
            service = get_refinement_service()
            suggestions = service.suggest_refinements(chart_type, data_summary)
            
            return Response({
                'suggestions': suggestions
            })
        except Exception as e:
            logger.error(str(e))
            return Response({'error': 'An internal error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
