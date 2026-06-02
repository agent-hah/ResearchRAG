"""
File processing service for CSV and PDF files
"""
import pandas as pd
import PyPDF2
from pathlib import Path
from typing import Tuple, Optional
import re
import config
from database.db_manager import DatabaseManager


class FileProcessor:
    """Handles CSV and PDF file processing"""
    
    def __init__(self):
        self.db = DatabaseManager()
    
    def process_csv(self, uploaded_file) -> Tuple[bool, str, Optional[int]]:
        """
        Process uploaded CSV file
        Returns: (success, message, dataset_id)
        """
        try:
            # Read CSV
            df = pd.read_csv(uploaded_file)
            
            # Validate
            if df.empty:
                return False, "CSV file is empty", None
            
            # Generate table name
            filename = uploaded_file.name
            table_name = self._generate_table_name(filename)
            
            # Store in database
            self.db.create_dataset_table(table_name, df)
            
            # Add metadata
            dataset_id = self.db.add_dataset(
                name=filename.replace('.csv', ''),
                filename=filename,
                row_count=len(df),
                column_count=len(df.columns),
                file_size=uploaded_file.size,
                table_name=table_name
            )
            
            return True, f"Successfully processed {len(df)} rows, {len(df.columns)} columns", dataset_id
            
        except Exception as e:
            return False, f"Error processing CSV: {str(e)}", None
    
    def process_pdf(self, uploaded_file) -> Tuple[bool, str, Optional[int]]:
        """
        Process uploaded PDF file
        Returns: (success, message, literature_id)
        """
        try:
            # Save PDF to uploads directory
            filename = uploaded_file.name
            file_path = config.UPLOADS_DIR / filename
            
            with open(file_path, 'wb') as f:
                f.write(uploaded_file.getbuffer())
            
            # Extract basic info
            pdf_reader = PyPDF2.PdfReader(file_path)
            page_count = len(pdf_reader.pages)
            
            # Add to database
            lit_id = self.db.add_literature(
                filename=filename,
                file_path=str(file_path),
                page_count=page_count,
                file_size=uploaded_file.size
            )
            
            return True, f"Successfully uploaded PDF ({page_count} pages)", lit_id
            
        except Exception as e:
            return False, f"Error processing PDF: {str(e)}", None
    
    def extract_pdf_text(self, file_path: str) -> Tuple[bool, str, Optional[str]]:
        """
        Extract text from PDF file
        Returns: (success, message, text_content)
        """
        try:
            pdf_reader = PyPDF2.PdfReader(file_path)
            text_content = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    text_content.append(f"[Page {page_num + 1}]\n{text}")
            
            full_text = "\n\n".join(text_content)
            return True, "Text extracted successfully", full_text
            
        except Exception as e:
            return False, f"Error extracting text: {str(e)}", None
    
    def get_csv_preview(self, dataset_id: int, rows: int = 10) -> Optional[pd.DataFrame]:
        """Get preview of CSV data"""
        try:
            dataset = self.db.get_dataset_by_id(dataset_id)
            if not dataset:
                return None
            
            sql = f"SELECT * FROM {dataset['table_name']} LIMIT {rows}"
            return self.db.query_dataset(sql)
            
        except Exception:
            return None
    
    def _generate_table_name(self, filename: str) -> str:
        """Generate valid SQL table name from filename"""
        # Remove extension
        name = filename.replace('.csv', '')
        # Replace invalid characters with underscore
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        # Ensure starts with letter
        if not name[0].isalpha():
            name = 'dataset_' + name
        # Add timestamp to ensure uniqueness
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{name}_{timestamp}"
    
    def validate_csv_file(self, uploaded_file) -> Tuple[bool, str]:
        """Validate CSV file before processing"""
        # Check file extension
        if not uploaded_file.name.endswith('.csv'):
            return False, "File must be a CSV file"
        
        # Check file size
        max_size = config.MAX_FILE_SIZE_MB * 1024 * 1024
        if uploaded_file.size > max_size:
            return False, f"File size exceeds {config.MAX_FILE_SIZE_MB}MB limit"
        
        return True, "Valid CSV file"
    
    def validate_pdf_file(self, uploaded_file) -> Tuple[bool, str]:
        """Validate PDF file before processing"""
        # Check file extension
        if not uploaded_file.name.endswith('.pdf'):
            return False, "File must be a PDF file"
        
        # Check file size
        max_size = config.MAX_FILE_SIZE_MB * 1024 * 1024
        if uploaded_file.size > max_size:
            return False, f"File size exceeds {config.MAX_FILE_SIZE_MB}MB limit"
        
        return True, "Valid PDF file"
