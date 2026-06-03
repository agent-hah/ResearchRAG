import os
import re

files_to_fix = [
    "backend/services/document_suggestion_service.py",
    "backend/services/export_service.py",
    "backend/services/refinement_service.py",
    "backend/services/search_api_service.py"
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("from sqlalchemy.orm import Session", "")
    content = content.replace("from backend.models.document_suggestion import DocumentSuggestion", "from query.models import DocumentSuggestion")
    content = content.replace("from backend.models.dataset import Dataset", "from rag.models import Dataset")
    content = content.replace("from backend.models.literature import Literature", "from literature.models import Literature")
    content = content.replace("from backend.models.query_history import QueryHistory", "from query.models import QueryHistory")
    content = content.replace("from backend.models.note import Note", "from notes.models import Note")
    
    # Session signatures
    content = re.sub(r',\s*db:\s*Session', '', content)
    content = re.sub(r'db:\s*Session,\s*', '', content)
    content = re.sub(r'db:\s*Session', '', content)

    # db.query
    content = re.sub(r'db\.query\((\w+)\)\.filter\(\1\.(\w+)\s*==\s*(.*?)\)\.first\(\)', r'\1.objects.filter(\2=\3).first()', content)
    content = re.sub(r'db\.query\((\w+)\)\.filter\(\1\.(\w+)\s*==\s*(.*?)\)\.all\(\)', r'list(\1.objects.filter(\2=\3))', content)
    content = re.sub(r'db\.query\((\w+)\)\.all\(\)', r'list(\1.objects.all())', content)
    
    # save
    content = re.sub(r'db\.add\((.*?)\)', r'\1.save()', content)
    content = re.sub(r'db\.commit\(\)', '', content)
    content = re.sub(r'db\.refresh\((.*?)\)', '', content)
    content = re.sub(r'db\.delete\((.*?)\)', r'\1.delete()', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
