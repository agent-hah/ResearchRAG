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
    
    def __init__(self, user_id: Optional[str] = None):
        self.user_id = user_id
    
    def export_dataset_csv(self, dataset_id: int) -> str:
        """
        Export dataset as CSV
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            CSV string
        """
        try:
            qs = Dataset.objects.filter(id=dataset_id)
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            dataset = qs.first()
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get table name from model
            table_name = dataset.table_name
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
            qs = Dataset.objects.filter(id=dataset_id)
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            dataset = qs.first()
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get table name from model
            table_name = dataset.table_name
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
                    "created_at": dataset.created_at.isoformat()
                },
                "data": data,
                "exported_at": datetime.utcnow().isoformat()
            }
            
            return json.dumps(export_data, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Failed to export dataset {dataset_id} as JSON: {e}")
            raise
    
    def export_query_results_csv(self, query_ids: List[int]) -> str:
        """
        Export query metadata as CSV
        
        Args:
            query_ids: List of Query history IDs
            
        Returns:
            CSV string
        """
        try:
            qs = QueryHistory.objects.filter(id__in=query_ids)
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            queries = qs.order_by('-created_at')
            if not queries:
                raise ValueError("No queries found")
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['ID', 'Question', 'SQL Query', 'Created At', 'Result Count', 'Synthesis Summary'])
            
            for index, q in enumerate(queries, 1):
                synthesis_summary = ""
                if q.synthesis and isinstance(q.synthesis, dict):
                    synthesis_summary = q.synthesis.get('summary', '')
                writer.writerow([
                    index,
                    q.query_text,
                    q.sql_query or '',
                    q.created_at.isoformat(),
                    q.result_count or 0,
                    synthesis_summary
                ])
                
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to export queries as CSV: {e}")
            raise
    
    def export_query_results_json(self, query_ids: List[int]) -> str:
        """
        Export query results as JSON
        
        Args:
            query_ids: List of Query history IDs
            
        Returns:
            JSON string
        """
        try:
            qs = QueryHistory.objects.filter(id__in=query_ids)
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            queries = qs.order_by('-created_at')
            if not queries:
                raise ValueError("No queries found")
            
            export_list = []
            for index, q in enumerate(queries, 1):
                # Remove relevance scores from literature context if present
                lit_context = q.literature_context
                if lit_context and isinstance(lit_context, list):
                    # Make a deep copy to avoid modifying the DB if we ever save this instance (though unlikely here)
                    import copy
                    lit_context = copy.deepcopy(lit_context)
                    for item in lit_context:
                        if isinstance(item, dict) and 'relevance_score' in item:
                            del item['relevance_score']

                export_data = {
                    "id": index,
                    "question": q.query_text,
                    "sql_query": q.sql_query,
                    "created_at": q.created_at.isoformat(),
                    "result_count": q.result_count,
                    "results": q.data_results,
                    "literature_context": lit_context,
                    "synthesis": q.synthesis
                }
                export_list.append(export_data)
                
            return json.dumps({
                "queries": export_list,
                "exported_at": datetime.utcnow().isoformat()
            }, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Failed to export queries as JSON: {e}")
            raise
    
    def export_notes_csv(self, note_ids: Optional[List[int]] = None) -> str:
        try:
            qs = Note.objects.all()
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            if note_ids:
                query = qs.filter(id__in=note_ids)
            else:
                query = qs
            notes = query.order_by('-created_at')
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['ID', 'Title', 'Content', 'Tags', 'Dataset ID', 'Literature ID', 'Query ID', 'Created At'])
            
            for note in notes:
                tags = [t.strip() for t in note.tags if t.strip()] if isinstance(note.tags, list) else (note.tags.split(',') if note.tags else [])
                writer.writerow([
                    note.id,
                    note.title,
                    note.content,
                    ', '.join(tags),
                    note.dataset_id,
                    note.literature_id,
                    note.query_id,
                    note.created_at.isoformat()
                ])
                
            return output.getvalue()
        except Exception as e:
            logger.error(f"Failed to export notes as CSV: {e}")
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
                title = note.title or (note.content.split('\n')[0][:100] if note.content else f"Note {note.id}")
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
                    "title": note.title,
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
            qs = Literature.objects.filter(id=literature_id)
            if self.user_id:
                qs = qs.filter(user_id=self.user_id)
            literature = qs.first()
            if not literature:
                raise ValueError("Literature not found")
            
            from django.core.files.storage import default_storage
            
            # Check if pdf exists
            if not literature.file_path or not default_storage.exists(literature.file_path):
                raise ValueError("PDF file not found on server")
                
            # Read the PDF file
            with default_storage.open(literature.file_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # If annotations are not requested, return original PDF
            if not include_annotations:
                return pdf_bytes, literature.filename
            
            # Get annotations
            from literature.models import Annotation
            ann_qs = Annotation.objects.filter(
                literature_id=literature_id
            )
            if self.user_id:
                ann_qs = ann_qs.filter(user_id=self.user_id)
            annotations = ann_qs.order_by('page_number', '-created_at')
            
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
                        # Get page dimensions
                        page_width = float(page.mediabox.width)
                        page_height = float(page.mediabox.height)

                        # Create overlay with annotations
                        packet = io.BytesIO()
                        can = canvas.Canvas(packet, pagesize=(page_width, page_height))
                        
                        # Draw annotations
                        for ann in annotations_by_page[page_num + 1]:
                            if ann.annotation_type == "highlight":
                                color_map = {
                                    'yellow': yellow,
                                    'red': red,
                                    'green': green,
                                    'blue': blue,
                                    'orange': orange
                                }
                                color = color_map.get(ann.color, yellow)
                                quad_points = []
                                min_x, min_y, max_x, max_y = float('inf'), float('inf'), float('-inf'), float('-inf')
                                
                                if ann.rects:
                                    for rect in ann.rects:
                                        x = rect.get('x', 0)
                                        width = rect.get('width', 0)
                                        height = rect.get('height', 0)
                                        y = page_height - rect.get('y', 0) - height
                                        if width > 0 and height > 0:
                                            quad_points.extend([
                                                x, y + height,
                                                x + width, y + height,
                                                x, y,
                                                x + width, y
                                            ])
                                            min_x = min(min_x, x)
                                            min_y = min(min_y, y)
                                            max_x = max(max_x, x + width)
                                            max_y = max(max_y, y + height)
                                elif ann.x_position is not None and ann.y_position is not None:
                                    x = ann.x_position * page_width
                                    y = page_height - (ann.y_position * page_height)
                                    width = (ann.width or 0.1) * page_width
                                    height = (ann.height or 0.02) * page_height
                                    quad_points.extend([
                                        x, y,
                                        x + width, y,
                                        x, y - height,
                                        x + width, y - height
                                    ])
                                    min_x, min_y, max_x, max_y = x, y - height, x + width, y
                                
                                if quad_points:
                                    # Draw visual highlights using Multiply blend mode so text beneath remains crisp
                                    can.saveState()
                                    can.setBlendMode('Multiply')
                                    can.setFillColor(color)
                                    
                                    if ann.rects:
                                        for rect in ann.rects:
                                            x = rect.get('x', 0)
                                            width = rect.get('width', 0)
                                            height = rect.get('height', 0)
                                            y = page_height - rect.get('y', 0) - height
                                            if width > 0 and height > 0:
                                                can.rect(x, y, width, height, fill=1, stroke=0)
                                    elif ann.x_position is not None and ann.y_position is not None:
                                        x = ann.x_position * page_width
                                        y = page_height - (ann.y_position * page_height)
                                        width = (ann.width or 0.1) * page_width
                                        height = (ann.height or 0.02) * page_height
                                        can.rect(x, y - height, width, height, fill=1, stroke=0)
                                        
                                    can.restoreState()
                                    
                                    # Also add the invisible native annotation for comments (if PDF viewer supports merged annots)
                                    bounding_rect = [min_x, min_y, max_x, max_y]
                                    rgb_color = [color.red, color.green, color.blue]
                                    comment_text = ann.content if ann.content else "Highlighted Text"
                                    # Add annotation with 0 opacity / hidden visual so it doesn't duplicate the visual highlight
                                    can.highlightAnnotation(comment_text, Rect=bounding_rect, QuadPoints=quad_points, Color=rgb_color)
                        
                        can.showPage()
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
