import pytest
from unittest.mock import MagicMock, patch
from query.services.search_api_service import SearchAPIService
import requests

@pytest.fixture
def search_service():
    return SearchAPIService()

def test_parse_openalex_abstract(search_service):
    inverted_index = {
        "This": [0],
        "is": [1],
        "a": [2],
        "test.": [3]
    }
    abstract = search_service._parse_openalex_abstract(inverted_index)
    assert abstract == "This is a test."
    
    assert search_service._parse_openalex_abstract(None) == ""

def test_extract_year(search_service):
    assert search_service._extract_year("Published in 2023 by test") == 2023
    assert search_service._extract_year("No year here") is None

def test_calculate_relevance(search_service):
    # exact title match
    res = search_service._calculate_relevance({"title": "quantum computing basics", "citation_count": 0}, "quantum computing")
    assert res > 0.5  # Boost from title
    
    # highly cited boost
    res2 = search_service._calculate_relevance({"title": "Other", "citation_count": 150}, "quantum computing")
    assert res2 == 0.7  # 0.5 + 0.2

@pytest.mark.asyncio
@patch('query.services.search_api_service.requests.get')
async def test_search_openalex_success(mock_get, search_service):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "results": [{
            "title": "OpenAlex Paper",
            "authorships": [{"author": {"display_name": "Author 1"}}],
            "publication_year": 2023,
            "primary_location": {"source": {"display_name": "Journal X"}},
            "abstract_inverted_index": {"Abstract": [0]},
            "id": "url_link",
            "cited_by_count": 10,
            "doi": "10.123/456"
        }]
    }
    mock_get.return_value = mock_response
    
    results = await search_service.search_openalex("test query", max_results=1)
    assert len(results) == 1
    assert results[0]["title"] == "OpenAlex Paper"
    assert results[0]["authors"] == "Author 1"
    assert results[0]["abstract"] == "Abstract"



@pytest.mark.asyncio
@patch('query.services.search_api_service.SearchAPIService.search_openalex')
async def test_search_articles_auto(mock_openalex, search_service):
    mock_openalex.return_value = [{"title": "Auto Paper"}]
    
    results = await search_service.search_articles("test query")
    assert len(results) == 1
    assert results[0]["title"] == "Auto Paper"
    mock_openalex.assert_called_once()

@pytest.mark.asyncio
@patch('query.services.search_api_service.SearchAPIService.search_openalex')
async def test_search_articles_empty(mock_openalex, search_service):
    mock_openalex.return_value = []
    
    results = await search_service.search_articles("test query")
    assert len(results) == 0
    mock_openalex.assert_called_once()

@pytest.mark.asyncio
@patch('query.services.search_api_service.requests.get')
async def test_search_openalex_many_authors_and_exception(mock_get, search_service):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "results": [{
            "title": "OpenAlex Paper",
            "authorships": [{"author": {"display_name": "Author 1"}}, {"author": {"display_name": "A2"}}, {"author": {"display_name": "A3"}}, {"author": {"display_name": "A4"}}],
            "publication_year": 2023,
            "id": "url_link",
            "cited_by_count": 55,
        }]
    }
    mock_get.return_value = mock_response
    results = await search_service.search_openalex("test", max_results=1)
    assert "et al." in results[0]["authors"]
    assert results[0]["relevance_score"] >= 0.6  # citations > 50 gives +0.1 to 0.5
    
    mock_get.return_value.json.side_effect = Exception("Parse Error")
    results_err = await search_service.search_openalex("test")
    assert results_err == []


