import pytest
from unittest.mock import MagicMock, patch
import json

from rag.models import Dataset
from query.models import DocumentSuggestion
from notes.models import Note
from literature.models import Literature
from query.services.document_suggestion_service import DocumentSuggestionService

class DummyPart:
    def __init__(self, text):
        self.text = text

class DummyContent:
    def __init__(self, parts):
        self.parts = parts

class DummyCandidate:
    def __init__(self, content):
        self.content = content

class DummyResponse:
    def __init__(self, text=None, parts=None):
        self._text = text
        if parts is not None:
            self.candidates = [DummyCandidate(DummyContent([DummyPart(p) for p in parts]))]
        else:
            self.candidates = []

    @property
    def text(self):
        if self._text is not None:
            return self._text
        raise ValueError("Multi-part response")

@pytest.fixture
def suggestion_service():
    with patch('query.services.document_suggestion_service.genai.Client') as mock_client:
        service = DocumentSuggestionService()
        return service

def test_extract_text(suggestion_service):
    assert suggestion_service._extract_text(DummyResponse(text="Simple")) == "Simple"
    assert suggestion_service._extract_text(DummyResponse(parts=["A", "B"])) == "AB"
    
    # Empty candidates
    class EmptyResp:
        @property
        def text(self): raise ValueError("No text")
        candidates = []
    assert suggestion_service._extract_text(EmptyResp()) == ""
    
    # Missing content
    class NoContentResp:
        @property
        def text(self): raise ValueError("No text")
        candidates = [DummyCandidate(None)]
    assert suggestion_service._extract_text(NoContentResp()) == ""

@patch('time.sleep')
def test_generate_with_retry(mock_sleep, suggestion_service):
    mock_resp = DummyResponse(text="Success")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    res = suggestion_service._generate_with_retry("prompt")
    assert suggestion_service._extract_text(res) == "Success"

@patch('time.sleep')
def test_generate_with_retry_error(mock_sleep, suggestion_service):
    suggestion_service.client.models.generate_content.side_effect = Exception("timeout error")
    with pytest.raises(Exception, match="timeout"):
        suggestion_service._generate_with_retry("prompt")

def test_generate_with_retry_is_json(suggestion_service):
    mock_resp = DummyResponse(text="{}")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    res = suggestion_service._generate_with_retry("prompt", is_json=True)
    assert suggestion_service._extract_text(res) == "{}"

@pytest.mark.django_db
def test_analyze_dataset_for_keywords(suggestion_service):
    Dataset.objects.create(id=1, name="D1", filename="test.csv", table_name="d1", row_count=1, file_size_bytes=10)
    Note.objects.create(content="Note content", dataset_id=1)
    
    mock_resp = DummyResponse(text="```json\n{\"keywords\": [\"key1\", \"key2\"]}\n```")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    keywords = suggestion_service.analyze_dataset_for_keywords([1])
    assert keywords == ["key1", "key2"]

@pytest.mark.django_db
def test_analyze_dataset_for_keywords_no_dataset(suggestion_service):
    Note.objects.create(content="Note content")
    mock_resp = DummyResponse(text="{\"keywords\": [\"key1\"]}")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    keywords = suggestion_service.analyze_dataset_for_keywords()
    assert keywords == ["key1"]

@pytest.mark.django_db
def test_analyze_dataset_for_keywords_invalid_json(suggestion_service):
    Note.objects.create(content="Note content")
    mock_resp = DummyResponse(text="Not json")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    keywords = suggestion_service.analyze_dataset_for_keywords()
    assert keywords == []

@pytest.mark.django_db
def test_analyze_dataset_for_keywords_code_blocks(suggestion_service):
    Note.objects.create(content="Note content")
    mock_resp = DummyResponse(text="```\n{\"keywords\": [\"key1\"]}\n```")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    keywords = suggestion_service.analyze_dataset_for_keywords()
    assert keywords == ["key1"]

@pytest.mark.django_db
def test_analyze_dataset_for_keywords_no_list(suggestion_service):
    Note.objects.create(content="Note content")
    mock_resp = DummyResponse(text="{\"keywords\": \"string instead of list\"}")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    keywords = suggestion_service.analyze_dataset_for_keywords()
    assert keywords == []

@pytest.mark.django_db
def test_analyze_dataset_for_keywords_exception(suggestion_service):
    suggestion_service.client.models.generate_content.side_effect = Exception("Error")
    keywords = suggestion_service.analyze_dataset_for_keywords()
    assert keywords == []

def test_generate_with_retry_non_timeout(suggestion_service):
    suggestion_service.client.models.generate_content.side_effect = Exception("Unknown Error")
    with pytest.raises(Exception, match="Unknown Error"):
        suggestion_service._generate_with_retry("prompt")

@pytest.mark.asyncio
@patch('query.services.document_suggestion_service.SearchAPIService.search_articles')
async def test_search_articles(mock_api_search, suggestion_service):
    mock_api_search.return_value = [{"title": "Real API Article"}]
    
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 1
    assert articles[0]["title"] == "Real API Article"

@pytest.mark.asyncio
@patch('query.services.document_suggestion_service.SearchAPIService.search_articles')
async def test_search_articles_fallback(mock_api_search, suggestion_service):
    mock_api_search.return_value = []
    
    mock_resp = DummyResponse(text="""[
        {"title": "Fallback", "authors": "Author", "year": 2022, "venue": "Conf", "abstract": "Abs", "relevance_score": 0.8}
    ]""")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 1
    assert articles[0]["title"] == "Fallback"
    assert "mock." in articles[0]["doi"]

@pytest.mark.django_db
@patch('django.core.cache.cache.set')
@patch('query.services.document_suggestion_service.DocumentSuggestionService.search_articles')
@patch('query.services.document_suggestion_service.DocumentSuggestionService.analyze_dataset_for_keywords')
def test_generate_suggestions_for_dataset(mock_analyze, mock_search, mock_cache, suggestion_service):
    Dataset.objects.create(id=1, name="D1", filename="test.csv", table_name="d1", row_count=1, file_size_bytes=10)
    mock_analyze.return_value = ["kw1"]
    
    # search_articles is async, but we patch it so we need to return an awaitable or handle async_to_sync
    # Actually async_to_sync will call it, so we mock it with an async function
    async def mock_search_func(*args, **kwargs):
        return [{"title": "Sug1"}]
        
    mock_search.side_effect = mock_search_func
    
    suggestions = suggestion_service.generate_suggestions_for_dataset(dataset_ids=[1], max_per_keyword=1)
    
    assert len(suggestions) == 1
    assert suggestions[0].title == "Sug1"
    assert suggestions[0].search_query == "kw1"

@pytest.mark.django_db
@patch('django.core.cache.cache.set')
@patch('query.services.document_suggestion_service.DocumentSuggestionService.analyze_dataset_for_keywords')
def test_generate_suggestions_for_dataset_no_keywords(mock_analyze, mock_cache, suggestion_service):
    mock_analyze.return_value = []
    
    suggestions = suggestion_service.generate_suggestions_for_dataset()
    assert suggestions == []

@pytest.mark.django_db
def test_get_suggestions_for_dataset(suggestion_service):
    Dataset.objects.create(id=1, name="D1", filename="test.csv", table_name="d1", row_count=1, file_size_bytes=10)
    DocumentSuggestion.objects.create(title="Sug1", dataset_id=1, is_dismissed=False, relevance_score=0.9)
    DocumentSuggestion.objects.create(title="Sug2", dataset_id=1, is_dismissed=True, relevance_score=0.8)
    
    sugs = suggestion_service.get_suggestions_for_dataset(dataset_id=1, include_dismissed=False)
    assert len(sugs) == 1
    assert sugs[0].title == "Sug1"
    
    sugs_all = suggestion_service.get_suggestions_for_dataset(dataset_id=1, include_dismissed=True)
    assert len(sugs_all) == 2

@pytest.mark.django_db
def test_update_suggestion_feedback(suggestion_service):
    Dataset.objects.create(id=1, name="D1", filename="test.csv", table_name="d1", row_count=1, file_size_bytes=10)
    sug = DocumentSuggestion.objects.create(title="Sug1", dataset_id=1)
    
    updated = suggestion_service.update_suggestion_feedback(sug.id, is_relevant=True, is_dismissed=False, is_imported=True)
    assert updated.is_relevant is True
    assert updated.is_dismissed is False
    assert updated.is_imported is True

@pytest.mark.django_db
def test_delete_suggestions_for_dataset(suggestion_service):
    Dataset.objects.create(id=1, name="D1", filename="test.csv", table_name="d1", row_count=1, file_size_bytes=10)
    DocumentSuggestion.objects.create(title="Sug1", dataset_id=1)
    count = suggestion_service.delete_suggestions_for_dataset(1)
    assert count == 1
    assert DocumentSuggestion.objects.filter(dataset_id=1).count() == 0

@pytest.mark.asyncio
@patch('query.services.document_suggestion_service.SearchAPIService.search_articles')
async def test_search_articles_fallback_code_blocks(mock_api_search, suggestion_service):
    mock_api_search.return_value = []
    mock_resp = DummyResponse(text="```json\n[\n{\"title\": \"Fallback Block\"}\n]\n```")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 1
    assert articles[0]["title"] == "Fallback Block"

@pytest.mark.asyncio
@patch('query.services.document_suggestion_service.SearchAPIService.search_articles')
async def test_search_articles_fallback_code_blocks_no_json(mock_api_search, suggestion_service):
    mock_api_search.return_value = []
    mock_resp = DummyResponse(text="```\n[\n{\"title\": \"Fallback Block\"}\n]\n```")
    suggestion_service.client.models.generate_content.return_value = mock_resp
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 1
    assert articles[0]["title"] == "Fallback Block"

@pytest.mark.asyncio
@patch('query.services.document_suggestion_service.SearchAPIService.search_articles')
async def test_search_articles_fallback_exception(mock_api_search, suggestion_service):
    mock_api_search.return_value = []
    suggestion_service.client.models.generate_content.side_effect = Exception("Error")
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 0

@pytest.mark.asyncio
async def test_search_articles_api_exception(suggestion_service):
    suggestion_service.search_api.search_articles = MagicMock(side_effect=Exception("API Error"))
    articles = await suggestion_service.search_articles("query")
    assert len(articles) == 0
