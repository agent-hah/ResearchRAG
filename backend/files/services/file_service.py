"""
File service for handling file uploads and validation (Django ORM).
"""
import os
import shutil
import time
import re
from pathlib import Path
from typing import Tuple, Optional

from literature.models import Literature, ProcessingStatus
from rag.models import Dataset
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile

import logging
logger = logging.getLogger(__name__)

class FileService:
    """Service for file upload and management."""
    
    ALLOWED_CSV_EXTENSIONS = {".csv"}
    ALLOWED_PDF_EXTENSIONS = {".pdf"}
    
    @staticmethod
    def validate_file(file: UploadedFile, allowed_extensions: set) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file.
        """
        if not file.name:
            return False, "Filename is required"
        
        file_ext = Path(file.name).suffix.lower()
        if file_ext not in allowed_extensions:
            return False, f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        
        if file.content_type:
            if file_ext == ".csv" and "csv" not in file.content_type.lower():
                return False, "Invalid content type for CSV file"
            elif file_ext == ".pdf" and "pdf" not in file.content_type.lower():
                return False, "Invalid content type for PDF file"
        
        MAX_SIZE = 10485760 # 10MB limit
        if file.size > MAX_SIZE:
            return False, "File is too large. Please upload files smaller than 10MB to keep the server happy."
        
        return True, None
    
    @staticmethod
    def get_unique_filename(directory: Path, filename: str) -> str:
        """
        Generate a unique filename by appending (1), (2), etc. if the file already exists.
        """
        base_name = filename.rsplit('.', 1)[0]
        extension = ""
        if '.' in filename:
            extension = "." + filename.rsplit('.', 1)[1]
            
        counter = 1
        unique_filename = filename
        while (directory / unique_filename).exists():
            unique_filename = f"{base_name}({counter}){extension}"
            counter += 1
            
        return unique_filename
    
    @staticmethod
    def save_uploaded_file(file: UploadedFile, user_id: str) -> Tuple[str, int]:
        """
        Save uploaded file to default storage, scoped to user_id.
        """
        try:
            from django.core.files.storage import default_storage
            # Prepend user_id to file path to prevent collisions between users
            file_path = f"{user_id}/{file.name}"
            saved_path = default_storage.save(file_path, file)
            logger.info(f"Saved file to cloud storage: {saved_path} ({file.size} bytes)")
            return saved_path, file.size
        except Exception as e:
            logger.error(f"Error saving file {file.name}: {str(e)}")
            raise Exception(f"Failed to save file: {str(e)}")
    
    @staticmethod
    def create_dataset_record(filename: str, file_path: str, file_size: int, user_id: str) -> Dataset:
        base_name = filename.rsplit('.', 1)[0]
        sanitized = re.sub(r'[^\w]+', '_', base_name.lower())
        timestamp = int(time.time() * 1000)
        table_name = f"dataset_{sanitized}_{timestamp}"
        
        dataset = Dataset.objects.create(
            name=base_name,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size,
            table_name=table_name,
            user_id=user_id
        )
        logger.info(f"Created dataset record: {dataset.id} - {filename}")
        return dataset
    
    @staticmethod
    def create_literature_record(filename: str, file_path: str, file_size: int, user_id: str) -> Literature:
        literature = Literature.objects.create(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            processing_status=ProcessingStatus.PENDING,
            user_id=user_id
        )
        logger.info(f"Created literature record: {literature.id} - {filename}")
        return literature
    
    @staticmethod
    def get_all_datasets(user_id: str):
        return Dataset.objects.filter(user_id=user_id).order_by('-created_at')
    
    @staticmethod
    def get_all_literature(user_id: str):
        return Literature.objects.filter(user_id=user_id).order_by('-created_at')
    
    @staticmethod
    def get_dataset_by_id(dataset_id: int, user_id: str) -> Optional[Dataset]:
        return Dataset.objects.filter(id=dataset_id, user_id=user_id).first()
    
    @staticmethod
    def get_literature_by_id(literature_id: int, user_id: str) -> Optional[Literature]:
        return Literature.objects.filter(id=literature_id, user_id=user_id).first()
    
    @staticmethod
    def delete_dataset(dataset_id: int, user_id: str) -> bool:
        dataset = FileService.get_dataset_by_id(dataset_id, user_id)
        if not dataset:
            return False
        
        from django.core.files.storage import default_storage
        if dataset.file_path and default_storage.exists(dataset.file_path):
            default_storage.delete(dataset.file_path)
        
        dataset.delete()
        return True
    
    @staticmethod
    def delete_literature(literature_id: int, user_id: str) -> bool:
        literature = FileService.get_literature_by_id(literature_id, user_id)
        if not literature:
            return False
        
        from django.core.files.storage import default_storage
        if literature.file_path and default_storage.exists(literature.file_path):
            default_storage.delete(literature.file_path)
        
        literature.delete()
        return True
