from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch, MagicMock
from literature.models import Literature, ProcessingStatus, Annotation, AnnotationType
from rag.models import Dataset
from files.services.file_service import FileService

class LiteraturePipelineTests(APITestCase):
    def setUp(self):
        # We need a dummy PDF content
        self.pdf_content = b"%PDF-1.4\n%EOF"
        self.pdf_file = SimpleUploadedFile(
            "dummy_test.pdf",
            self.pdf_content,
            content_type="application/pdf"
        )
    
    @patch('literature.views.threading.Thread')
    @patch('literature.views.PDFProcessor.process_pdf_file')
    @patch('rag.views.threading.Thread')
    @patch('rag.views.get_rag_service')
    def test_full_literature_pipeline(self, mock_get_rag, mock_rag_thread, mock_process_pdf, mock_lit_thread):
        # Setup mocks
        # For lit upload, instead of real thread, we will manually trigger process_pdf_background
        # But actually, we can just let process_pdf_file mock handle it if we call the background function manually
        # Let's mock thread.start to just call the target directly for synchronous testing
        def mock_lit_thread_start():
            from literature.views import process_pdf_background
            # Get the args from the call
            kwargs = mock_lit_thread.call_args[1]
            if 'target' in kwargs and 'args' in kwargs:
                kwargs['target'](*kwargs['args'])
        
        # We don't really need to run the background threads in the test, we can just assert they are called 
        # and manually update states to simulate background task completion
        
        # 1. Test PDF Upload
        upload_url = reverse('file-upload')
        response = self.client.post(upload_url, {'file': self.pdf_file, 'type': 'pdf'}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        lit_id = response.data['id']
        
        # Verify literature was created
        lit = Literature.objects.get(id=lit_id)
        self.assertEqual(lit.filename, "dummy_test.pdf")
        self.assertEqual(lit.processing_status, ProcessingStatus.PENDING)
        
        # Simulate background task completion
        lit.processing_status = ProcessingStatus.COMPLETED
        lit.save()
        
        # 2. Test Preview / Download
        # The router registers LiteratureViewSet with 'literature' prefix
        # URL pattern: /api/v1/literature/{pk}/download/
        download_url = reverse('literature-download', kwargs={'pk': lit_id})
        download_response = self.client.get(download_url)
        self.assertEqual(download_response.status_code, status.HTTP_200_OK)
        # Content-Disposition header might not be set as attachment, but we check if we got content
        self.assertEqual(download_response.getvalue(), self.pdf_content)
        
        # 3. Test Annotate
        annotations_url = reverse('annotation-list')
        annotation_data = {
            'literature': lit_id,
            'annotation_type': AnnotationType.HIGHLIGHT,
            'content': 'Important finding here.',
            'page_number': 1,
            'x_position': 100.0,
            'y_position': 150.0,
            'width': 200.0,
            'height': 20.0,
            'color': 'yellow'
        }
        annotation_response = self.client.post(annotations_url, annotation_data, format='json')
        self.assertEqual(annotation_response.status_code, status.HTTP_201_CREATED)
        
        # Verify annotation was saved
        ann_id = annotation_response.data['id']
        ann = Annotation.objects.get(id=ann_id)
        self.assertEqual(ann.content, 'Important finding here.')
        
        # 4. Test AI Insight Pipeline (RAG Indexing)
        rag_index_url = reverse('rag-index')
        rag_index_response = self.client.post(rag_index_url, {'literature_id': lit_id}, format='json')
        self.assertEqual(rag_index_response.status_code, status.HTTP_202_ACCEPTED)
        
        # Simulate RAG indexing background task
        lit.processing_status = ProcessingStatus.INDEXED
        lit.save()
        
        # 5. Test AI Insight Pipeline (RAG Search)
        rag_search_url = reverse('rag-search')
        
        # Mock the RAG service search
        mock_rag_service = MagicMock()
        mock_get_rag.return_value = mock_rag_service
        mock_rag_service.search_literature.return_value = [
            {
                "literature_id": lit_id,
                "filename": "dummy_test.pdf",
                "text": "Simulated extracted context about the important finding.",
                "page": 1,
                "score": 0.85,
                "metadata": {}
            }
        ]
        
        rag_search_response = self.client.post(rag_search_url, {'query': 'finding'}, format='json')
        self.assertEqual(rag_search_response.status_code, status.HTTP_200_OK)
        self.assertIn('results', rag_search_response.data)
        self.assertEqual(len(rag_search_response.data['results']), 1)
        self.assertEqual(rag_search_response.data['results'][0]['literature_id'], lit_id)
