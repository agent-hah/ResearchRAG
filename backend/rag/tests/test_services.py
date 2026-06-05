import pytest
from unittest.mock import MagicMock, patch
from rag.services.rag_service import RAGService, get_rag_service
from literature.models import Literature, ProcessingStatus

@pytest.fixture
def mock_langchain_components(mocker):
    mock_embeddings = mocker.patch('rag.services.rag_service.GoogleGenerativeAIEmbeddings')
    mock_splitter = mocker.patch('rag.services.rag_service.RecursiveCharacterTextSplitter')
    mock_chroma = mocker.patch('rag.services.rag_service.Chroma')
    
    # Configure mock splitter
    mock_splitter_instance = MagicMock()
    mock_splitter_instance.split_text.return_value = ["chunk1", "chunk2"]
    mock_splitter.return_value = mock_splitter_instance
    
    # Configure mock chroma
    mock_chroma_instance = MagicMock()
    mock_chroma.return_value = mock_chroma_instance
    
    # For search, return dummy docs
    mock_doc = MagicMock()
    mock_doc.page_content = "dummy text"
    mock_doc.metadata = {"literature_id": 1, "filename": "dummy.pdf"}
    mock_chroma_instance.similarity_search_with_score.return_value = [(mock_doc, 0.9)]
    
    # For get_stats
    mock_collection = MagicMock()
    mock_collection.count.return_value = 10
    mock_chroma_instance._collection = mock_collection
    
    return {
        'embeddings': mock_embeddings,
        'splitter': mock_splitter,
        'chroma': mock_chroma,
        'chroma_instance': mock_chroma_instance
    }

@pytest.mark.django_db
def test_index_literature(mock_langchain_components):
    # Setup mock sleep to avoid waiting during tests
    with patch('rag.services.rag_service.time.sleep'):
        service = RAGService()
        literature = Literature.objects.create(
            filename="dummy.pdf",
            file_path="dummy.pdf",
            file_size=1024,
            processing_status=ProcessingStatus.PENDING
        )
        
        result = service.index_literature(literature, "dummy text")
        
        assert result['status'] == 'indexed'
        assert result['chunks_created'] == 2
        mock_langchain_components['chroma_instance'].add_texts.assert_called_once()
        mock_langchain_components['chroma_instance'].persist.assert_called_once()
        
        literature.refresh_from_db()
        assert literature.processing_status == ProcessingStatus.INDEXED

@pytest.mark.django_db
def test_search_literature(mock_langchain_components):
    service = RAGService()
    results = service.search_literature("query text", top_k=5)
    
    assert len(results) == 1
    assert results[0]['literature_id'] == 1
    assert results[0]['text'] == "dummy text"
    assert results[0]['score'] == 0.9

@pytest.mark.django_db
def test_get_stats(mock_langchain_components):
    service = RAGService()
    Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.INDEXED
    )
    
    stats = service.get_stats()
    
    assert stats['total_indexed'] == 1
    assert stats['total_chunks'] == 10

@pytest.mark.django_db
def test_delete_literature_index(mock_langchain_components):
    service = RAGService()
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.INDEXED
    )
    
    mock_langchain_components['chroma_instance']._collection.get.return_value = {"ids": ["chunk1"]}
    
    service.delete_literature_index(literature.id)
    
    mock_langchain_components['chroma_instance']._collection.delete.assert_called_once_with(ids=["chunk1"])
    mock_langchain_components['chroma_instance'].persist.assert_called_once()
    
    literature.refresh_from_db()
    assert literature.processing_status == ProcessingStatus.COMPLETED
    assert literature.indexed_at is None

@pytest.mark.django_db
def test_index_literature_already_indexed(mock_langchain_components):
    service = RAGService()
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.INDEXED
    )
    
    result = service.index_literature(literature, "dummy text")
    assert result['status'] == 'already_indexed'
    assert result['chunks_created'] == 0

@pytest.mark.django_db
def test_index_literature_force_reindex(mock_langchain_components):
    with patch('rag.services.rag_service.time.sleep'):
        service = RAGService()
        literature = Literature.objects.create(
            filename="dummy.pdf",
            file_path="dummy.pdf",
            file_size=1024,
            processing_status=ProcessingStatus.INDEXED
        )
        
        mock_langchain_components['chroma_instance']._collection.get.return_value = {"ids": ["chunk1"]}
        result = service.index_literature(literature, "dummy text", force_reindex=True)
        
        assert result['status'] == 'indexed'
        mock_langchain_components['chroma_instance']._collection.delete.assert_called_once()

@pytest.mark.django_db
def test_index_literature_exception(mock_langchain_components):
    service = RAGService()
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.PENDING
    )
    
    mock_langchain_components['splitter'].return_value.split_text.side_effect = Exception("Test error")
    
    with pytest.raises(Exception):
        service.index_literature(literature, "dummy text")
        
    literature.refresh_from_db()
    assert literature.processing_status == ProcessingStatus.FAILED

@pytest.mark.django_db
def test_search_literature_with_filter_and_max_chunks(mock_langchain_components):
    service = RAGService()
    
    # Mocking multiple results for the same lit_id
    mock_doc1 = MagicMock()
    mock_doc1.page_content = "text1"
    mock_doc1.metadata = {"literature_id": 1, "filename": "dummy.pdf"}
    
    mock_doc2 = MagicMock()
    mock_doc2.page_content = "text2"
    mock_doc2.metadata = {"literature_id": 1, "filename": "dummy.pdf"}
    
    mock_doc3 = MagicMock()
    mock_doc3.page_content = "text3"
    mock_doc3.metadata = {"literature_id": 1, "filename": "dummy.pdf"}
    
    mock_doc4 = MagicMock()
    mock_doc4.page_content = "text4"
    mock_doc4.metadata = {"literature_id": 1, "filename": "dummy.pdf"}
    
    mock_langchain_components['chroma_instance'].similarity_search_with_score.return_value = [
        (mock_doc1, 0.9), (mock_doc2, 0.8), (mock_doc3, 0.7), (mock_doc4, 0.6)
    ]
    
    results = service.search_literature("query", top_k=2, literature_ids=[1], max_chunks_per_doc=2)
    
    assert len(results) == 2
    mock_langchain_components['chroma_instance'].similarity_search_with_score.assert_called_once()
    kwargs = mock_langchain_components['chroma_instance'].similarity_search_with_score.call_args[1]
    assert kwargs['filter'] == {"literature_id": {"$in": [1]}}

@pytest.mark.django_db
def test_search_literature_exception(mock_langchain_components):
    service = RAGService()
    mock_langchain_components['chroma_instance'].similarity_search_with_score.side_effect = Exception("Test error")
    
    with pytest.raises(Exception):
        service.search_literature("query")

@pytest.mark.django_db
def test_get_stats_exception(mock_langchain_components):
    service = RAGService()
    mock_langchain_components['chroma_instance']._collection.count.side_effect = Exception("Test error")
    
    with pytest.raises(Exception):
        service.get_stats()

@pytest.mark.django_db
def test_delete_literature_chunks_exception(mock_langchain_components):
    service = RAGService()
    mock_langchain_components['chroma_instance']._collection.get.side_effect = Exception("Test error")
    
    with pytest.raises(Exception):
        service._delete_literature_chunks(1)

@pytest.mark.django_db
def test_delete_literature_index_exception(mock_langchain_components):
    service = RAGService()
    with patch.object(service, '_delete_literature_chunks', side_effect=Exception("Test error")):
        with pytest.raises(Exception):
            service.delete_literature_index(1)

@pytest.mark.django_db
def test_reindex_all(mock_langchain_components):
    with patch('rag.services.rag_service.time.sleep'), patch('rag.services.rag_service.PDFProcessor.extract_text', return_value="dummy text"):
        service = RAGService()
        Literature.objects.create(filename="dummy1.pdf", file_path="dummy1.pdf", file_size=1024, processing_status=ProcessingStatus.INDEXED)
        Literature.objects.create(filename="dummy2.pdf", file_path="dummy2.pdf", file_size=1024, processing_status=ProcessingStatus.INDEXED)
        
        result = service.reindex_all()
        assert result['total'] == 2
        assert result['success'] == 2

@pytest.mark.django_db
def test_reindex_all_exception(mock_langchain_components):
    with patch('rag.services.rag_service.time.sleep'), patch('rag.services.rag_service.PDFProcessor.extract_text', side_effect=Exception("Extraction error")):
        service = RAGService()
        Literature.objects.create(filename="dummy1.pdf", file_path="dummy1.pdf", file_size=1024, processing_status=ProcessingStatus.INDEXED)
        
        result = service.reindex_all()
        assert result['total'] == 1
        assert result['failed'] == 1
        assert len(result['errors']) == 1

def test_get_rag_service(mock_langchain_components):
    service1 = get_rag_service()
    service2 = get_rag_service()
    assert service1 is service2
