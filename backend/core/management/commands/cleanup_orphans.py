from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from literature.models import Literature, Annotation
from notes.models import Note, NoteRelationship
from query.models import QueryHistory, DocumentSuggestion
from rag.models import Dataset
from query.services.csv_processor import CSVProcessor
from rag.services.rag_service import get_rag_service
from django.core.files.storage import default_storage

class Command(BaseCommand):
    help = 'Wipes orphaned user IDs and their associated data to prevent database bloat.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Days of inactivity before an ID is orphaned')

    def handle(self, *args, **options):
        days = options['days']
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Determine all active users (updated after cutoff)
        active_users = set()
        all_users = set()
        
        for Model in [Literature, Note, QueryHistory, Dataset]:
            all_users.update(Model.objects.values_list('user_id', flat=True).distinct())
            active_users.update(Model.objects.filter(updated_at__gte=cutoff_date).values_list('user_id', flat=True).distinct())
            active_users.update(Model.objects.filter(created_at__gte=cutoff_date).values_list('user_id', flat=True).distinct())

        orphaned_users = all_users - active_users
        
        # Don't delete 'default' which might be from local dev before isolation
        orphaned_users.discard('default')

        if not orphaned_users:
            self.stdout.write(self.style.SUCCESS("No orphaned users found."))
            return

        self.stdout.write(f"Found {len(orphaned_users)} orphaned user(s). Cleaning up...")

        for uid in orphaned_users:
            self.stdout.write(f"Cleaning data for user: {uid}")
            
            # 1. Clean Datasets
            datasets = Dataset.objects.filter(user_id=uid)
            for d in datasets:
                try:
                    if d.table_name:
                        CSVProcessor.drop_table(d.table_name)
                    if d.file_path and default_storage.exists(d.file_path):
                        default_storage.delete(d.file_path)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error dropping dataset {d.id}: {e}"))
            datasets.delete()

            # 2. Clean Literature
            literatures = Literature.objects.filter(user_id=uid)
            rag_service = get_rag_service(uid)
            for lit in literatures:
                try:
                    rag_service.delete_literature_index(lit.id)
                    if lit.file_path and default_storage.exists(lit.file_path):
                        default_storage.delete(lit.file_path)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error dropping literature {lit.id}: {e}"))
            literatures.delete()
            
            # 3. Clean Notes & Annotations
            NoteRelationship.objects.filter(user_id=uid).delete()
            Note.objects.filter(user_id=uid).delete()
            Annotation.objects.filter(user_id=uid).delete()
            
            # 4. Clean Queries & Suggestions
            QueryHistory.objects.filter(user_id=uid).delete()
            DocumentSuggestion.objects.filter(user_id=uid).delete()
            
        self.stdout.write(self.style.SUCCESS(f"Cleanup complete for {len(orphaned_users)} user(s)."))
