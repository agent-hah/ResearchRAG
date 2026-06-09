import pytest
from unittest.mock import MagicMock, patch
import json
from datetime import datetime

from rag.models import Dataset
from query.models import QueryHistory
from query.services.query_service import QueryService, _extract_response_text, get_query_service

# Dummy class to mimic Gemini response
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

def test_extract_response_text_simple():
    resp = DummyResponse(text="Simple text")
    assert _extract_response_text(resp) == "Simple text"

def test_extract_response_text_multipart():
    resp = DummyResponse(parts=["Part 1", " and ", "Part 2"])
    assert _extract_response_text(resp) == "Part 1 and Part 2"

def test_extract_response_text_markdown_json():
    resp = DummyResponse(text="```json\n{\"key\": \"value\"}\n```")
    assert json.loads(_extract_response_text(resp)) == {"key": "value"}

def test_extract_response_text_fallback_json():
    resp = DummyResponse(text="Here is some reasoning... {\"key\": \"value\"} ...and more reasoning.")
    assert json.loads(_extract_response_text(resp)) == {"key": "value"}

@pytest.fixture
def query_service():
    with patch('query.services.query_service.genai.Client') as mock_client:
        service = QueryService()
        return service

@pytest.mark.django_db
@patch('query.services.query_service.CSVProcessor.get_table_schema')
@patch('query.services.query_service.CSVProcessor.get_table_preview')
def test_get_database_schema(mock_get_table_preview, mock_get_table_schema, query_service):
    Dataset.objects.create(name="D1", filename="test1.csv", file_path="p", file_size_bytes=1, table_name="dataset_1", row_count=5)
    Dataset.objects.create(name="D2", filename="test2.csv", file_path="p", file_size_bytes=1, table_name="dataset_2", row_count=10)
    
    mock_get_table_schema.return_value = [{"name": "id", "type": "INTEGER"}]
    mock_get_table_preview.return_value = [{"id": 1}]
    
    schemas = query_service.get_database_schema()
    
    assert len(schemas) == 2
    assert schemas[0]["table_name"] == "dataset_1"
    assert schemas[0]["original_filename"] == "test1.csv"
    assert schemas[0]["columns"] == [{"name": "id", "type": "INTEGER"}]
    assert schemas[0]["row_count"] == 5
    assert schemas[0]["sample_data"] == [{"id": 1}]

@pytest.mark.django_db
@patch('query.services.query_service.CSVProcessor.get_table_schema')
def test_get_database_schema_error(mock_get_table_schema, query_service):
    Dataset.objects.create(name="D1", filename="test1.csv", file_path="p", file_size_bytes=1, table_name="dataset_1", row_count=5)
    mock_get_table_schema.side_effect = Exception("Schema Error")
    
    schemas = query_service.get_database_schema()
    assert schemas == [] # Exception caught and continues, empty since all failed

def test_build_schema_context(query_service):
    schemas = [{
        "table_name": "dataset_1",
        "original_filename": "test.csv",
        "row_count": 10,
        "columns": [{"name": "col1", "type": "TEXT"}],
        "sample_data": [{"col1": "val"}]
    }]
    context = query_service._build_schema_context(schemas)
    assert "dataset_1" in context
    assert "test.csv" in context
    assert "col1 (TEXT)" in context
    assert "val" in context

def test_generate_sql_success(query_service):
    schemas = [{"table_name": "dataset_1", "original_filename": "test.csv", "row_count": 10, "columns": [], "sample_data": []}]
    mock_response = DummyResponse(text="{\"sql_query\": \"SELECT * FROM dataset_1\", \"explanation\": \"expl\", \"tables_used\": [\"dataset_1\"], \"columns_used\": [\"*\"], \"confidence\": 0.9}")
    query_service.client.models.generate_content.return_value = mock_response
    
    res = query_service.generate_sql("query", schemas)
    assert res["sql_query"] == "SELECT * FROM dataset_1"
    assert res["confidence"] == 0.9

def test_generate_sql_no_schemas(query_service):
    res = query_service.generate_sql("query", [])
    assert res["sql_query"] == ""
    assert res["confidence"] == 0.0

def test_generate_sql_json_error(query_service):
    schemas = [{"table_name": "dataset_1", "original_filename": "test.csv", "row_count": 10, "columns": [], "sample_data": []}]
    mock_response = DummyResponse(text="Not a JSON string")
    query_service.client.models.generate_content.return_value = mock_response
    
    res = query_service.generate_sql("query", schemas)
    assert res["sql_query"] == ""
    assert "Failed to generate SQL" in res["explanation"]

@patch('query.services.query_service.connection.cursor')
def test_execute_sql(mock_cursor_func, query_service):
    mock_cursor = MagicMock()
    mock_cursor_func.return_value.__enter__.return_value = mock_cursor
    mock_cursor.description = [("id",), ("name",), ("date_col",)]
    mock_cursor.fetchall.return_value = [(1, "Test", datetime(2023, 1, 1))]
    
    res = query_service.execute_sql("SELECT * FROM dataset_1")
    assert res["row_count"] == 1
    assert res["columns"] == ["id", "name", "date_col"]
    # Rows are arrays of values in column order
    assert res["rows"][0] == [1, "Test", "2023-01-01T00:00:00"]

@patch('query.services.query_service.connection.cursor')
def test_execute_sql_error(mock_cursor_func, query_service):
    mock_cursor_func.side_effect = Exception("DB Error")
    res = query_service.execute_sql("SELECT * FROM dataset_1")
    assert res["row_count"] == 0
    assert "DB Error" in res["error"]

@patch('query.services.query_service.get_rag_service')
def test_get_literature_context(mock_get_rag, query_service):
    mock_rag = MagicMock()
    mock_get_rag.return_value = mock_rag
    mock_rag.search_literature.return_value = [
        {"literature_id": 1, "title": "Doc1", "text": "Some text", "score": 0.8, "metadata": {}}
    ]
    
    ctx = query_service.get_literature_context("query")
    assert len(ctx) == 1
    assert ctx[0]["title"] == "Doc1"
    assert ctx[0]["relevance_score"] == 0.8

def test_get_literature_context_max_0(query_service):
    ctx = query_service.get_literature_context("query", max_results=0)
    assert ctx == []

def test_synthesize_results_success(query_service):
    sql_result = {"row_count": 1, "columns": ["id"], "rows": [{"id": 1}]}
    literature_context = [{"title": "Doc", "excerpt": "Excerpt"}]
    mock_response = DummyResponse(text="{\"summary\": \"Great summary\", \"key_findings\": [\"A\"], \"data_insights\": [], \"literature_insights\": [], \"methodology_notes\": null}")
    query_service.client.models.generate_content.return_value = mock_response
    
    res = query_service.synthesize_results("query", sql_result, literature_context)
    assert res["summary"] == "Great summary"
    assert res["key_findings"] == ["A"]
    
    # Verify the prompt explicitly instructs the model to cross-reference CSV data and PDF literature
    call_args = query_service.client.models.generate_content.call_args
    prompt_used = call_args.kwargs['contents']
    assert "Actively cross-reference findings from the structured datasets with insights from the literature" in prompt_used

def test_synthesize_results_json_error(query_service):
    sql_result = {"row_count": 0}
    literature_context = []
    mock_response = DummyResponse(text="Not JSON")
    query_service.client.models.generate_content.return_value = mock_response
    
    res = query_service.synthesize_results("query", sql_result, literature_context)
    assert "Synthesis failed" in res["summary"]

@pytest.mark.django_db
def test_save_and_get_query_history(query_service):
    query_service.save_query_history("query text", "SELECT 1", 1, 10.0)
    queries, total = query_service.get_query_history(page=1, page_size=10)
    assert total == 1
    assert len(queries) == 1
    assert queries[0].query_text == "query text"

def test_get_query_service_singleton():
    service1 = get_query_service()
    service2 = get_query_service()
    assert service1 is service2
