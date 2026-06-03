import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from services.rag_service import get_rag_service
rag = get_rag_service()
print("Reindexing all documents...")
results = rag.reindex_all()
print(results)
