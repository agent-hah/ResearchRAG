from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.management import call_command
import os

class CleanupOrphansView(APIView):
    """
    API endpoint to trigger the cleanup_orphans management command.
    Useful for triggering cron jobs from free external services or university servers.
    """
    def post(self, request):
        # Extremely basic token auth for the cron endpoint
        secret = request.headers.get('Authorization')
        expected_secret = f"Bearer {os.environ.get('CRON_SECRET_KEY', 'eniac-cron-secret')}"
        
        if secret != expected_secret:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            call_command('cleanup_orphans', days=30)
            return Response({"status": "success", "message": "Cleanup executed successfully."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
