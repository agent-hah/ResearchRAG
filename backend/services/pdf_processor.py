"""
PDF processing service for extracting text and metadata (Django ORM).
"""
from pathlib import Path
from typing import Dict, Any
import pdfplumber

from literature.models import Literature, ProcessingStatus
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Service for processing PDF files."""
    
    @staticmethod
    def extract_text(file_path: Path) -> str:
        try:
            text_content = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # layout=False and strict x_tolerance helps preserve spaces for badly kerned PDFs
                    text = page.extract_text(x_tolerance=1)
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
        try:
            with pdfplumber.open(file_path) as pdf:
                metadata = {
                    "page_count": len(pdf.pages),
                    "title": None,
                    "author": None,
                    "subject": None,
                    "creator": None
                }
                
                if pdf.metadata:
                    metadata["title"] = pdf.metadata.get("Title")
                    metadata["author"] = pdf.metadata.get("Author")
                    metadata["subject"] = pdf.metadata.get("Subject")
                    metadata["creator"] = pdf.metadata.get("Creator")
                
                logger.info(f"Extracted metadata from PDF: {file_path} - {metadata['page_count']} pages")
                return metadata
        except Exception as e:
            logger.error(f"Error extracting metadata from PDF {file_path}: {str(e)}")
            raise ValueError(f"Failed to extract metadata from PDF: {str(e)}")
    
    @staticmethod
    def update_literature_metadata(literature: Literature, metadata: Dict[str, Any]) -> Literature:
        literature.page_count = metadata.get("page_count")
        literature.processing_status = ProcessingStatus.COMPLETED
        literature.save()
        logger.info(f"Updated literature metadata: {literature.id}")
        return literature
    
    @staticmethod
    def process_pdf_file(file_path: Path, literature: Literature) -> tuple[Literature, str]:
        try:
            literature.processing_status = ProcessingStatus.PROCESSING
            literature.save()
            
            text_content = PDFProcessor.extract_text(file_path)
            metadata = PDFProcessor.get_metadata(file_path)
            
            literature = PDFProcessor.update_literature_metadata(literature, metadata)
            logger.info(f"Successfully processed PDF: {literature.id} - {literature.filename}")
            return literature, text_content
        except Exception as e:
            literature.processing_status = ProcessingStatus.FAILED
            literature.save()
            logger.error(f"Error processing PDF file: {str(e)}")
            raise
    
    @staticmethod
    def validate_pdf(file_path: Path) -> bool:
        try:
            with pdfplumber.open(file_path) as pdf:
                _ = len(pdf.pages)
            return True
        except Exception as e:
            logger.error(f"PDF validation failed for {file_path}: {str(e)}")
            return False
