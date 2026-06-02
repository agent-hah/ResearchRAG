"""
PDF processing service for extracting text and metadata.
"""
from pathlib import Path
from typing import Dict, Any
import PyPDF2
from sqlalchemy.orm import Session

from backend.models.literature import Literature, ProcessingStatus
from backend.utils.logger import get_logger

logger = get_logger(__name__)


class PDFProcessor:
    """Service for processing PDF files."""
    
    @staticmethod
    def extract_text(file_path: Path) -> str:
        """
        Extract text content from PDF.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Extracted text content
        """
        try:
            text_content = []
            
            with open(file_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
            
            full_text = "\n\n".join(text_content)
            logger.info(f"Extracted text from PDF: {file_path} - {len(full_text)} characters")
            
            return full_text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    @staticmethod
    def get_metadata(file_path: Path) -> Dict[str, Any]:
        """
        Extract metadata from PDF.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Dictionary with PDF metadata
        """
        try:
            with open(file_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                metadata = {
                    "page_count": len(pdf_reader.pages),
                    "title": None,
                    "author": None,
                    "subject": None,
                    "creator": None
                }
                
                # Extract document info if available
                if pdf_reader.metadata:
                    metadata["title"] = pdf_reader.metadata.get("/Title")
                    metadata["author"] = pdf_reader.metadata.get("/Author")
                    metadata["subject"] = pdf_reader.metadata.get("/Subject")
                    metadata["creator"] = pdf_reader.metadata.get("/Creator")
                
                logger.info(f"Extracted metadata from PDF: {file_path} - {metadata['page_count']} pages")
                return metadata
                
        except Exception as e:
            logger.error(f"Error extracting metadata from PDF {file_path}: {str(e)}")
            raise ValueError(f"Failed to extract metadata from PDF: {str(e)}")
    
    @staticmethod
    def update_literature_metadata(
        db: Session,
        literature: Literature,
        metadata: Dict[str, Any]
    ) -> Literature:
        """
        Update literature with processing metadata.
        
        Args:
            db: Database session
            literature: Literature instance
            metadata: Processing metadata
            
        Returns:
            Updated Literature instance
        """
        literature.page_count = metadata.get("page_count")
        literature.processing_status = ProcessingStatus.COMPLETED
        
        db.commit()
        db.refresh(literature)
        
        logger.info(f"Updated literature metadata: {literature.id}")
        return literature
    
    @staticmethod
    def process_pdf_file(
        file_path: Path,
        literature: Literature,
        db: Session
    ) -> tuple[Literature, str]:
        """
        Complete PDF processing pipeline.
        
        Args:
            file_path: Path to PDF file
            literature: Literature instance
            db: Session: Database session
            
        Returns:
            Tuple of (Updated Literature instance, extracted text)
        """
        try:
            # Update status to processing
            literature.processing_status = ProcessingStatus.PROCESSING
            db.commit()
            
            # Extract text
            text_content = PDFProcessor.extract_text(file_path)
            
            # Extract metadata
            metadata = PDFProcessor.get_metadata(file_path)
            
            # Update literature metadata
            literature = PDFProcessor.update_literature_metadata(db, literature, metadata)
            
            logger.info(f"Successfully processed PDF: {literature.id} - {literature.filename}")
            return literature, text_content
            
        except Exception as e:
            # Update status to failed
            literature.processing_status = ProcessingStatus.FAILED
            db.commit()
            
            logger.error(f"Error processing PDF file: {str(e)}")
            raise
    
    @staticmethod
    def validate_pdf(file_path: Path) -> bool:
        """
        Validate that file is a readable PDF.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            True if valid, False otherwise
        """
        try:
            with open(file_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                # Try to access pages to ensure it's readable
                _ = len(pdf_reader.pages)
            return True
        except Exception as e:
            logger.error(f"PDF validation failed for {file_path}: {str(e)}")
            return False
