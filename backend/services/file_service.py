"""
File service for handling file uploads and validation.
"""
import os
import shutil
from pathlib import Path
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.dataset import Dataset
from backend.models.literature import Literature, ProcessingStatus
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class FileService:
    """Service for file upload and management."""
    
    ALLOWED_CSV_EXTENSIONS = {".csv"}
    ALLOWED_PDF_EXTENSIONS = {".pdf"}
    
    @staticmethod
    def validate_file(file: UploadFile, allowed_extensions: set) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file.
        
        Args:
            file: Uploaded file
            allowed_extensions: Set of allowed file extensions
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check filename
        if not file.filename:
            return False, "Filename is required"
        
        # Check extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in allowed_extensions:
            return False, f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        
        # Check content type
        if file.content_type:
            if file_ext == ".csv" and "csv" not in file.content_type.lower():
                return False, "Invalid content type for CSV file"
            elif file_ext == ".pdf" and "pdf" not in file.content_type.lower():
                return False, "Invalid content type for PDF file"
        
        return True, None
    
    @staticmethod
    async def save_uploaded_file(file: UploadFile, destination: Path) -> int:
        """
        Save uploaded file to disk.
        
        Args:
            file: Uploaded file
            destination: Destination path
            
        Returns:
            File size in bytes
        """
        try:
            # Ensure directory exists
            destination.parent.mkdir(parents=True, exist_ok=True)
            
            # Save file
            with destination.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Get file size
            file_size = destination.stat().st_size
            
            logger.info(f"Saved file: {destination} ({file_size} bytes)")
            return file_size
            
        except Exception as e:
            logger.error(f"Error saving file {destination}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    @staticmethod
    def create_dataset_record(
        db: Session,
        filename: str,
        file_path: str,
        file_size: int
    ) -> Dataset:
        """
        Create dataset database record.
        
        Args:
            db: Database session
            filename: Original filename
            file_path: Path to saved file
            file_size: File size in bytes
            
        Returns:
            Created Dataset instance
        """
        import time
        import re
        
        # Generate unique table name with timestamp
        # Remove extension and sanitize filename
        base_name = filename.rsplit('.', 1)[0]
        # Replace spaces and special chars with underscores
        sanitized = re.sub(r'[^\w]+', '_', base_name.lower())
        # Add timestamp to ensure uniqueness
        timestamp = int(time.time() * 1000)  # milliseconds
        table_name = f"dataset_{sanitized}_{timestamp}"
        
        dataset = Dataset(
            name=base_name,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size,
            table_name=table_name
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        logger.info(f"Created dataset record: {dataset.id} - {filename}")
        return dataset
    
    @staticmethod
    def create_literature_record(
        db: Session,
        filename: str,
        file_path: str,
        file_size: int
    ) -> Literature:
        """
        Create literature database record.
        
        Args:
            db: Database session
            filename: Original filename
            file_path: Path to saved file
            file_size: File size in bytes
            
        Returns:
            Created Literature instance
        """
        literature = Literature(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            processing_status=ProcessingStatus.PENDING
        )
        db.add(literature)
        db.commit()
        db.refresh(literature)
        
        logger.info(f"Created literature record: {literature.id} - {filename}")
        return literature
    
    @staticmethod
    def get_all_datasets(db: Session):
        """Get all datasets."""
        return db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    
    @staticmethod
    def get_all_literature(db: Session):
        """Get all literature."""
        return db.query(Literature).order_by(Literature.created_at.desc()).all()
    
    @staticmethod
    def get_dataset_by_id(db: Session, dataset_id: int) -> Optional[Dataset]:
        """Get dataset by ID."""
        return db.query(Dataset).filter(Dataset.id == dataset_id).first()
    
    @staticmethod
    def get_literature_by_id(db: Session, literature_id: int) -> Optional[Literature]:
        """Get literature by ID."""
        return db.query(Literature).filter(Literature.id == literature_id).first()
    
    @staticmethod
    def delete_dataset(db: Session, dataset_id: int) -> bool:
        """
        Delete dataset and associated file.
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            
        Returns:
            True if deleted, False if not found
        """
        dataset = FileService.get_dataset_by_id(db, dataset_id)
        if not dataset:
            return False
        
        # Delete file if exists
        file_path = Path(dataset.file_path)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted file: {file_path}")
        
        # Delete database record
        db.delete(dataset)
        db.commit()
        
        logger.info(f"Deleted dataset: {dataset_id}")
        return True
    
    @staticmethod
    def delete_literature(db: Session, literature_id: int) -> bool:
        """
        Delete literature and associated file.
        
        Args:
            db: Database session
            literature_id: Literature ID
            
        Returns:
            True if deleted, False if not found
        """
        literature = FileService.get_literature_by_id(db, literature_id)
        if not literature:
            return False
        
        # Delete file if exists
        file_path = Path(literature.file_path)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted file: {file_path}")
        
        # Delete database record
        db.delete(literature)
        db.commit()
        
        logger.info(f"Deleted literature: {literature_id}")
        return True
