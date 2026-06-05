"""
Export Service

Handles exporting data in various formats (CSV, JSON, Markdown, etc.)
"""
import json
import csv
import io
import logging
import os
import shutil
from typing import List, Dict, Any, Optional
from datetime import datetime

from rag.models import Dataset
from notes.models import Note
from query.models import QueryHistory
from literature.models import Literature, Annotation

logger = logging.getLogger(__name__)


class ExportService:
    """
    Service for exporting data in various formats
    """
    
    def export_dataset_csv(self, dataset_id: int) -> str:
        """
        Export dataset as CSV
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            CSV string
        """
        try:
            dataset = Dataset.objects.filter(id=dataset_id).first()
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get table name from metadata
            table_name = dataset.metadata.get('table_name') if dataset.metadata else None
            if not table_name:
                raise ValueError("Dataset table name not found")
            
            # Query data from dynamic table
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT * FROM {table_name}")
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            # Convert to CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(columns)
            
            # Write rows
            for row in rows:
                writer.writerow(row)
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to export dataset {dataset_id} as CSV: {e}")
            raise
    
    def export_dataset_json(self, dataset_id: int) -> str:
        """
        Export dataset as JSON
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            JSON string
        """
        try:
            dataset = Dataset.objects.filter(id=dataset_id).first()
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get table name from metadata
            table_name = dataset.metadata.get('table_name') if dataset.metadata else None
            if not table_name:
                raise ValueError("Dataset table name not found")
            
            # Query data from dynamic table
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT * FROM {table_name}")
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            # Convert to list of dicts
            data = [dict(zip(columns, row)) for row in rows]
            
            # Create export object
            export_data = {
                "dataset": {
                    "id": dataset.id,
                    "filename": dataset.filename,
                    "created_at": dataset.created_at.isoformat(),
                    "metadata": dataset.metadata
                },
                "data": data,
                "exported_at": datetime.utcnow().isoformat()
            }
            
            return json.dumps(export_data, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Failed to export dataset {dataset_id} as JSON: {e}")
            raise
    
    def export_query_results_csv(self, query_id: int) -> str:
        """
        Export query results as CSV
        
        Args:
            query_id: Query history ID
            
        Returns:
            CSV string
        """
        try:
            query_history = QueryHistory.objects.filter(id=query_id).first()
            
            if not query_history:
                raise ValueError(f"Query {query_id} not found")
            
            if not query_history.results:
                raise ValueError("Query has no results")
            
            results = query_history.results.get('data', [])
            if not results:
                raise ValueError("Query results are empty")
            
            # Convert to CSV
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to export query {query_id} as CSV: {e}")
            raise
    
    def export_query_results_json(self, query_id: int) -> str:
        """
        Export query results as JSON
        
        Args:
            query_id: Query history ID
            
        Returns:
            JSON string
        """
        try:
            query_history = QueryHistory.objects.filter(id=query_id).first()
            
            if not query_history:
                raise ValueError(f"Query {query_id} not found")
            
            # Create export object
            export_data = {
                "query": {
                    "id": query_history.id,
                    "question": query_history.question,
                    "sql_query": query_history.sql_query,
                    "created_at": query_history.created_at.isoformat()
                },
                "results": query_history.results,
                "exported_at": datetime.utcnow().isoformat()
            }
            
            return json.dumps(export_data, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Failed to export query {query_id} as JSON: {e}")
            raise
    
    def export_notes_markdown(self, note_ids: Optional[List[int]] = None) -> str:
        """
        Export notes as Markdown
        
        Args:
            note_ids: Optional list of note IDs (exports all if None)
            
        Returns:
            Markdown string
        """
        try:
            query = Note.objects.all()
            
            if note_ids:
                query = query.filter(id__in=note_ids)
            
            notes = query.order_by('-created_at')
            
            # Build markdown
            output = io.StringIO()
            output.write(f"# Research Notes\n\n")
            output.write(f"Exported: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n\n")
            output.write(f"Total Notes: {len(notes)}\n\n")
            output.write("---\n\n")
            
            for note in notes:
                # Use first line of content as title or generate one
                title = note.content.split('\n')[0][:100] if note.content else f"Note {note.id}"
                output.write(f"## {title}\n\n")
                
                # Metadata
                output.write(f"**Created**: {note.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                
                if note.tags:
                    tags = [t.strip() for t in note.tags if t.strip()] if isinstance(note.tags, list) else note.tags.split(',')
                    output.write(f"**Tags**: {', '.join(f'`{t.strip()}`' for t in tags if t.strip())}\n\n")
                
                # Content
                output.write(f"{note.content}\n\n")
                
                # References
                if note.dataset_id:
                    output.write(f"*References Dataset ID: {note.dataset_id}*\n\n")
                if note.literature_id:
                    output.write(f"*References Literature ID: {note.literature_id}*\n\n")
                if note.query_id:
                    output.write(f"*References Query ID: {note.query_id}*\n\n")
                
                output.write("---\n\n")
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to export notes as Markdown: {e}")
            raise
    
    def export_notes_json(self, note_ids: Optional[List[int]] = None) -> str:
        """
        Export notes as JSON
        
        Args:
            note_ids: Optional list of note IDs (exports all if None)
            
        Returns:
            JSON string
        """
        try:
            query = Note.objects.all()
            
            if note_ids:
                query = query.filter(id__in=note_ids)
            
            notes = query.order_by('-created_at')
            
            # Convert to list of dicts
            notes_data = [
                {
                    "id": note.id,
                    "content": note.content,
                    "tags": [t.strip() for t in note.tags if t.strip()] if isinstance(note.tags, list) else (note.tags.split(',') if note.tags else []),
                    "dataset_id": note.dataset_id,
                    "literature_id": note.literature_id,
                    "query_id": note.query_id,
                    "created_at": note.created_at.isoformat(),
                    "updated_at": note.updated_at.isoformat()
                }
                for note in notes
            ]
            
            export_data = {
                "notes": notes_data,
                "total": len(notes_data),
                "exported_at": datetime.utcnow().isoformat()
            }
            
            return json.dumps(export_data, indent=2)
            
        except Exception as e:
            logger.error(f"Failed to export notes as JSON: {e}")
            raise
    
    def export_visualization_json(self, viz_config: Dict[str, Any]) -> str:
        """
        Export visualization configuration as JSON
        
        Args:
            viz_config: Visualization configuration dict
            
        Returns:
            JSON string
        """
        try:
            export_data = {
                "visualization": viz_config,
                "exported_at": datetime.utcnow().isoformat(),
                "format_version": "1.0"
            }
            
            return json.dumps(export_data, indent=2)
            
        except Exception as e:
            logger.error(f"Failed to export visualization as JSON: {e}")
            raise
    
    def export_literature_pdf(self, literature_id: int, include_annotations: bool = False) -> tuple[bytes, str]:
        """
        Export literature PDF, optionally with annotations
        
        Args:
            literature_id: Literature ID
            include_annotations: Whether to include annotations in the PDF
            
        Returns:
            Tuple of (PDF bytes, filename)
        """
        try:
            literature = Literature.objects.filter(id=literature_id).first()
            if not literature:
                raise ValueError(f"Literature {literature_id} not found")
            
            # Get the original PDF file path
            file_path = literature.file_path
            if not os.path.exists(file_path):
                raise ValueError(f"PDF file not found at {file_path}")
            
            # Read the PDF file
            with open(file_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # If annotations are not requested, return original PDF
            if not include_annotations:
                return pdf_bytes, literature.filename
            
            # Get annotations for this literature
            annotations = Annotation.objects.filter(
                literature_id=literature_id
            ).order_by('page_number', 'y_position')
            
            if not annotations:
                # No annotations, return original PDF
                return pdf_bytes, literature.filename
            
            # Add annotations to PDF using PyPDF2 or reportlab
            try:
                from PyPDF2 import PdfReader, PdfWriter
                from reportlab.pdfgen import canvas
                from reportlab.lib.colors import yellow, red, green, blue, orange
                from reportlab.lib.pagesizes import letter
                import tempfile
                
                # Create a PDF reader
                pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
                pdf_writer = PdfWriter()
                
                # Group annotations by page
                annotations_by_page = {}
                for ann in annotations:
                    if ann.page_number not in annotations_by_page:
                        annotations_by_page[ann.page_number] = []
                    annotations_by_page[ann.page_number].append(ann)
                
                # Process each page
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    
                    # Check if this page has annotations
                    if (page_num + 1) in annotations_by_page:
                        # Create overlay with annotations
                        packet = io.BytesIO()
                        can = canvas.Canvas(packet, pagesize=letter)
                        
                        # Get page dimensions
                        page_width = float(page.mediabox.width)
                        page_height = float(page.mediabox.height)
                        
                        # Draw annotations
                        for ann in annotations_by_page[page_num + 1]:
                            if ann.annotation_type == "highlight" and ann.x_position is not None:
                                # Convert normalized coordinates to actual coordinates
                                x = ann.x_position * page_width
                                y = page_height - (ann.y_position * page_height)  # PDF coordinates are bottom-up
                                width = (ann.width or 0.1) * page_width
                                height = (ann.height or 0.02) * page_height
                                
                                # Set color based on annotation color
                                color_map = {
                                    'yellow': yellow,
                                    'red': red,
                                    'green': green,
                                    'blue': blue,
                                    'orange': orange
                                }
                                color = color_map.get(ann.color, yellow)
                                
                                # Draw semi-transparent rectangle
                                can.setFillColor(color, alpha=0.3)
                                can.rect(x, y - height, width, height, fill=1, stroke=0)
                            
                            # Add comment as text annotation if present
                            if ann.content and ann.x_position is not None:
                                x = ann.x_position * page_width
                                y = page_height - (ann.y_position * page_height)
                                
                                can.setFillColor('black')
                                can.setFont("Helvetica", 8)
                                # Draw comment text
                                can.drawString(x, y - 15, f"Note: {ann.content[:50]}...")
                        
                        can.save()
                        
                        # Merge overlay with original page
                        packet.seek(0)
                        overlay_pdf = PdfReader(packet)
                        page.merge_page(overlay_pdf.pages[0])
                    
                    pdf_writer.add_page(page)
                
                # Write to bytes
                output = io.BytesIO()
                pdf_writer.write(output)
                output.seek(0)
                annotated_pdf_bytes = output.read()
                
                # Generate filename with annotations suffix
                base_name = os.path.splitext(literature.filename)[0]
                # Remove special characters for safe filename
                safe_name = "".join(c if c.isalnum() or c in ('-', '_', ' ') else '_' for c in base_name)
                annotated_filename = f"{safe_name}_with_annotations.pdf"
                
                return annotated_pdf_bytes, annotated_filename
                
            except ImportError:
                logger.warning("PyPDF2 or reportlab not installed, returning original PDF")
                return pdf_bytes, literature.filename
            
        except Exception as e:
            logger.error(f"Failed to export literature PDF {literature_id}: {e}")
            raise
