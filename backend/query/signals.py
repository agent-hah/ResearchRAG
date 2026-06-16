from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
import threading
import logging

from query.models import QueryHistory, DocumentSuggestion
from notes.models import Note
from literature.models import Literature
from query.services.document_suggestion_service import DocumentSuggestionService

logger = logging.getLogger(__name__)

SUGGESTION_COOLDOWN_HOURS = 1

def trigger_global_suggestion_generation():
    """
    Checks if we should generate global suggestions and runs it in a background thread
    if the cooldown period has elapsed since the last generation.
    """
    # Check cooldown
    latest_suggestion = DocumentSuggestion.objects.filter(dataset__isnull=True).order_by('-created_at').first()
    
    if latest_suggestion:
        time_since_last = timezone.now() - latest_suggestion.created_at
        if time_since_last.total_seconds() < (SUGGESTION_COOLDOWN_HOURS * 3600):
            logger.info(f"Skipping automated suggestion generation due to cooldown. Last generated {time_since_last.total_seconds() / 60:.1f} minutes ago.")
            return

    logger.info("Automated conditions met. Triggering global suggestion generation.")
    
    def run_generation():
        try:
            service = DocumentSuggestionService()
            service.generate_suggestions_for_dataset(
                dataset_ids=None,
            )
        except Exception as e:
            logger.error(f"Error in automated suggestion generation: {e}")

    thread = threading.Thread(target=run_generation)
    thread.start()

@receiver(post_save, sender=Literature)
def literature_post_save(sender, instance, created, **kwargs):
    if created:
        trigger_global_suggestion_generation()

@receiver(post_save, sender=Note)
def note_post_save(sender, instance, created, **kwargs):
    if created:
        trigger_global_suggestion_generation()

@receiver(post_save, sender=QueryHistory)
def query_history_post_save(sender, instance, created, **kwargs):
    if created:
        trigger_global_suggestion_generation()
