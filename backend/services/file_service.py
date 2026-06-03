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
        
        return True, None
    
    @staticmethod
    def save_uploaded_file(file: UploadedFile, destination: Path) -> int:
        """
        Save uploaded file to disk.
        """
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("wb") as buffer:
                for chunk in file.chunks():
                    buffer.write(chunk)
            
            file_size = destination.stat().st_size
            logger.info(f"Saved file: {destination} ({file_size} bytes)")
            return file_size
        except Exception as e:
            logger.error(f"Error saving file {destination}: {str(e)}")
            raise Exception(f"Failed to save file: {str(e)}")
    
    @staticmethod
    def create_dataset_record(filename: str, file_path: str, file_size: int) -> Dataset:
        base_name = filename.rsplit('.', 1)[0]
        sanitized = re.sub(r'[^\w]+', '_', base_name.lower())
        timestamp = int(time.time() * 1000)
        table_name = f"dataset_{sanitized}_{timestamp}"
        
        dataset = Dataset.objects.create(
            name=base_name,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size,
            table_name=table_name
        )
        logger.info(f"Created dataset record: {dataset.id} - {filename}")
        return dataset
    
    @staticmethod
    def create_literature_record(filename: str, file_path: str, file_size: int) -> Literature:
        literature = Literature.objects.create(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            processing_status=ProcessingStatus.PENDING
        )
        logger.info(f"Created literature record: {literature.id} - {filename}")
        return literature
    
    @staticmethod
    def get_all_datasets():
        return Dataset.objects.all().order_by('-created_at')
    
    @staticmethod
    def get_all_literature():
        return Literature.objects.all().order_by('-created_at')
    
    @staticmethod
    def get_dataset_by_id(dataset_id: int) -> Optional[Dataset]:
        return Dataset.objects.filter(id=dataset_id).first()
    
    @staticmethod
    def get_literature_by_id(literature_id: int) -> Optional[Literature]:
        return Literature.objects.filter(id=literature_id).first()
    
    @staticmethod
    def delete_dataset(dataset_id: int) -> bool:
        dataset = FileService.get_dataset_by_id(dataset_id)
        if not dataset:
            return False
        
        file_path = Path(dataset.file_path)
        if file_path.exists():
            file_path.unlink()
        
        dataset.delete()
        return True
    
    @staticmethod
    def delete_literature(literature_id: int) -> bool:
        literature = FileService.get_literature_by_id(literature_id)
        if not literature:
            return False
        
        file_path = Path(literature.file_path)
        if file_path.exists():
            file_path.unlink()
        
        literature.delete()
        return True
