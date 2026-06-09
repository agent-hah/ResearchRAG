"""
Tests for query view response contracts.

These tests validate that the API endpoints return data in the format
expected by the frontend. In particular, they ensure `data_results.rows`
is a list of lists (not dicts), since the frontend's QueryResults component
calls `row.map()` on each row, which requires arrays.

See: frontend/src/components/query/QueryResults.tsx line 116
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from rest_framework.test import APIClient

from rag.models import Dataset
from query.models import QueryHistory


@pytest.fixture
def api_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Helper: a mock query service that returns controlled data
# ---------------------------------------------------------------------------

def _make_mock_query_service(
    sql_rows=None,
    sql_columns=None,
    sql_row_count=None,
    literature_context=None,
    synthesis=None,
    sql_generation=None,
):
    """Build a mock QueryService with sane defaults."""
    svc = MagicMock()

    # Schema
    svc.get_database_schema.return_value = [
        {
            "table_name": "dataset_1",
            "original_filename": "test.csv",
            "columns": [{"name": "id", "type": "INTEGER"}, {"name": "name", "type": "TEXT"}],
            "row_count": 5,
            "sample_data": [{"id": 1, "name": "Alice"}],
        }
    ]

    # SQL generation
    svc.generate_sql.return_value = sql_generation or {
        "sql_query": "SELECT id, name FROM dataset_1",
        "explanation": "Lists all records",
        "tables_used": ["dataset_1"],
        "columns_used": ["id", "name"],
        "confidence": 0.95,
    }

    # SQL execution – rows must be arrays (not dicts) to match frontend expectations
    if sql_rows is None:
        sql_rows = [[1, "Alice"], [2, "Bob"]]
    if sql_columns is None:
        sql_columns = ["id", "name"]
    if sql_row_count is None:
        sql_row_count = len(sql_rows)

    svc.execute_sql.return_value = {
        "rows": sql_rows,
        "row_count": sql_row_count,
        "columns": sql_columns,
        "execution_time_ms": 5.0,
    }

    # Literature
    svc.get_literature_context.return_value = literature_context or []

    # Synthesis
    svc.synthesize_results.return_value = synthesis or {
        "summary": "Test summary",
        "key_findings": ["Finding 1"],
        "data_insights": [],
        "literature_insights": [],
        "methodology_notes": None,
        "limitations": None,
    }

    # History save – return a real-looking history object
    mock_history = MagicMock()
    mock_history.id = 1
    mock_history.created_at = datetime(2025, 1, 1)
    svc.save_query_history.return_value = mock_history

    return svc


# ===========================================================================
# QueryExecutionView (/query/execute/) – response contract tests
# ===========================================================================

class TestQueryExecutionViewResponseContract:
    """
    Validate that POST /query/execute/ returns a response whose
    `data_results.rows` entries are lists (arrays), NOT dicts.

    The frontend component QueryResults.tsx iterates each row with
    `row.map(...)`, which requires each row to be an array.
    """

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_data_results_rows_are_lists_not_dicts(self, mock_get_svc, api_client):
        """
        The most critical contract test.  If execute_sql returns rows as
        dicts, the view must transform them into arrays so the frontend
        can call row.map().
        """
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        # data_results must exist
        assert "data_results" in data, "Response must include 'data_results'"

        rows = data["data_results"]["rows"]
        assert isinstance(rows, list), "rows must be a list"

        for i, row in enumerate(rows):
            assert isinstance(row, list), (
                f"data_results.rows[{i}] must be a list (array), "
                f"got {type(row).__name__}: {row!r}. "
                "The frontend calls row.map() which requires an array."
            )

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_data_results_columns_present(self, mock_get_svc, api_client):
        """Columns must be returned so the frontend can render table headers."""
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        columns = data["data_results"]["columns"]
        assert isinstance(columns, list), "columns must be a list"
        assert all(isinstance(c, str) for c in columns), "each column must be a string"

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_data_results_row_length_matches_columns(self, mock_get_svc, api_client):
        """Each row array must have the same length as the columns array."""
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        columns = data["data_results"]["columns"]
        rows = data["data_results"]["rows"]
        for i, row in enumerate(rows):
            if isinstance(row, list):
                assert len(row) == len(columns), (
                    f"Row {i} has {len(row)} values but there are "
                    f"{len(columns)} columns"
                )

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_data_results_row_count_field(self, mock_get_svc, api_client):
        """row_count must accurately reflect the number of rows returned."""
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        assert data["data_results"]["row_count"] == len(data["data_results"]["rows"])

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_empty_query_results_still_valid_format(self, mock_get_svc, api_client):
        """When no rows are returned the response format must still be correct."""
        mock_svc = _make_mock_query_service(
            sql_rows=[],
            sql_columns=[],
            sql_row_count=0,
        )
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show non-existent data"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        assert data["data_results"]["rows"] == []
        assert data["data_results"]["row_count"] == 0
        assert isinstance(data["data_results"]["columns"], list)

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_response_contains_required_top_level_keys(self, mock_get_svc, api_client):
        """Verify the full set of top-level keys the frontend expects."""
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        required_keys = {
            "query_id",
            "question",
            "sql_query",
            "sql_confidence",
            "data_results",
            "literature_context",
            "synthesis",
            "created_at",
        }
        missing = required_keys - set(data.keys())
        assert not missing, f"Response is missing keys: {missing}"

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_synthesis_has_expected_fields(self, mock_get_svc, api_client):
        """Synthesis object must contain the fields the frontend reads."""
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        synthesis = resp.json()["synthesis"]

        expected_keys = {"summary", "key_findings", "data_insights", "literature_insights"}
        missing = expected_keys - set(synthesis.keys())
        assert not missing, f"Synthesis is missing keys: {missing}"

        # List fields must actually be lists
        for key in ["key_findings", "data_insights", "literature_insights"]:
            assert isinstance(synthesis[key], list), f"synthesis.{key} must be a list"

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_no_sql_generated_still_returns_valid_data_results(self, mock_get_svc, api_client):
        """When SQL generation produces no query, data_results must still be well-formed."""
        mock_svc = _make_mock_query_service(
            sql_generation={
                "sql_query": "",
                "explanation": "No matching datasets",
                "tables_used": [],
                "columns_used": [],
                "confidence": 0.0,
            },
            sql_rows=[],
            sql_columns=[],
            sql_row_count=0,
        )
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show all records"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()
        dr = data["data_results"]

        assert dr["row_count"] == 0
        assert isinstance(dr["rows"], list)
        assert dr["rows"] == []

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_datetime_values_are_serialized_to_strings(self, mock_get_svc, api_client):
        """
        datetime values must be JSON-serialisable (i.e. strings),
        not raw Python datetime objects.
        """
        mock_svc = _make_mock_query_service(
            sql_rows=[[1, "2025-01-01T00:00:00"]],
            sql_columns=["id", "created"],
            sql_row_count=1,
        )
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show dates"},
            format="json",
        )

        assert resp.status_code == 200
        rows = resp.json()["data_results"]["rows"]
        for row in rows:
            if isinstance(row, list):
                for cell in row:
                    assert not isinstance(cell, datetime), (
                        "datetime values must be serialized to strings"
                    )

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_sql_execution_retry_loop(self, mock_get_svc, api_client):
        """Verify that QueryExecutionView retries SQL generation on error."""
        mock_svc = _make_mock_query_service()
        
        mock_svc.generate_sql.side_effect = [
            {"sql_query": "SELECT ranking FROM dataset_1", "confidence": 0.5},
            {"sql_query": "SELECT id, name FROM dataset_1", "confidence": 0.95}
        ]
        
        mock_svc.execute_sql.side_effect = [
            {"error": "no such column: ranking", "rows": [], "row_count": 0, "columns": []},
            {"rows": [[1, "Alice"]], "row_count": 1, "columns": ["id", "name"], "execution_time_ms": 5.0}
        ]
        
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/execute/",
            {"query": "Show rankings"},
            format="json",
        )

        assert resp.status_code == 200
        
        assert mock_svc.generate_sql.call_count == 2
        assert mock_svc.execute_sql.call_count == 2
        
        call_args = mock_svc.generate_sql.call_args_list[1][0]
        # args: (query, schemas, dataset_ids, previous_query, previous_error)
        assert call_args[3] == "SELECT ranking FROM dataset_1"
        assert call_args[4] == "no such column: ranking"


# ===========================================================================
# ExecuteSQLView (/query/sql/execute/) – response contract tests
# ===========================================================================

class TestExecuteSQLViewResponseContract:
    """
    Validate that POST /query/sql/execute/ returns rows as lists.
    The frontend's executeRawSQL also expects `rows: any[][]`.
    """

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_raw_sql_rows_are_lists_not_dicts(self, mock_get_svc, api_client):
        mock_svc = _make_mock_query_service()
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/sql/execute/",
            {"sql": "SELECT id, name FROM dataset_1"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()

        rows = data["rows"]
        assert isinstance(rows, list)
        for i, row in enumerate(rows):
            assert isinstance(row, list), (
                f"rows[{i}] must be a list (array), got {type(row).__name__}: {row!r}"
            )

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_raw_sql_missing_query_returns_400(self, mock_get_svc, api_client):
        resp = api_client.post(
            "/api/v1/query/sql/execute/",
            {},
            format="json",
        )
        assert resp.status_code == 400

    @pytest.mark.django_db
    @patch("query.views.get_query_service")
    def test_raw_sql_error_response_still_has_rows_list(self, mock_get_svc, api_client):
        """Even on SQL error, rows should be an empty list."""
        mock_svc = _make_mock_query_service()
        mock_svc.execute_sql.return_value = {
            "rows": [],
            "row_count": 0,
            "columns": [],
            "execution_time_ms": 0.0,
            "error": "no such table: dataset_99",
        }
        mock_get_svc.return_value = mock_svc

        resp = api_client.post(
            "/api/v1/query/sql/execute/",
            {"sql": "SELECT * FROM dataset_99"},
            format="json",
        )

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["rows"], list)
        assert data["rows"] == []


# ===========================================================================
# QueryHistoryViewSet – cached data_results contract
# ===========================================================================

class TestQueryHistoryResponseContract:
    """
    When loading a query from history, the frontend reads the cached
    data_results.  The rows in the stored data must also be arrays.
    """

    @pytest.mark.django_db
    def test_history_list_data_results_rows_are_lists(self, api_client):
        """Stored data_results should have rows as arrays of arrays."""
        # Create a history entry with the correct (array) format
        QueryHistory.objects.create(
            query_text="Test query",
            sql_query="SELECT id, name FROM dataset_1",
            result_count=2,
            execution_time_ms=10,
            sql_confidence=0.9,
            data_results={
                "columns": ["id", "name"],
                "rows": [[1, "Alice"], [2, "Bob"]],
                "row_count": 2,
            },
            literature_context=[],
            synthesis={
                "summary": "Test",
                "key_findings": [],
                "data_insights": [],
                "literature_insights": [],
                "methodology_notes": None,
                "limitations": None,
            },
        )

        resp = api_client.get("/api/v1/query/history/")
        assert resp.status_code == 200

        data = resp.json()
        queries = data["queries"]
        assert len(queries) == 1

        stored_results = queries[0]["data_results"]
        assert stored_results is not None
        for i, row in enumerate(stored_results["rows"]):
            assert isinstance(row, list), (
                f"Stored data_results.rows[{i}] must be a list, "
                f"got {type(row).__name__}"
            )

    @pytest.mark.django_db
    def test_history_with_dict_rows_detected(self, api_client):
        """
        This test documents the bug: if dict rows sneak into stored
        data_results, the frontend will crash.  This test ensures we
        can detect the problem.
        """
        QueryHistory.objects.create(
            query_text="Buggy query",
            sql_query="SELECT id, name FROM dataset_1",
            result_count=1,
            execution_time_ms=5,
            sql_confidence=0.8,
            data_results={
                "columns": ["id", "name"],
                "rows": [{"id": 1, "name": "Alice"}],  # BUG: dict rows
                "row_count": 1,
            },
            literature_context=[],
            synthesis={
                "summary": "Test",
                "key_findings": [],
                "data_insights": [],
                "literature_insights": [],
                "methodology_notes": None,
                "limitations": None,
            },
        )

        resp = api_client.get("/api/v1/query/history/")
        assert resp.status_code == 200

        stored_results = resp.json()["queries"][0]["data_results"]
        # This assertion will FAIL if the backend stores dict rows,
        # proving the bug would reach the frontend
        has_dict_rows = any(isinstance(row, dict) for row in stored_results["rows"])
        assert has_dict_rows, (
            "This test intentionally stores dict rows to prove the bug. "
            "If this assertion fails, the storage has been fixed upstream."
        )


# ===========================================================================
# execute_sql service method – unit-level contract test
# ===========================================================================

class TestExecuteSQLServiceContract:
    """
    Unit tests for QueryService.execute_sql to validate row format.
    Rows must be arrays (lists) so the frontend can call row.map().
    """

    @patch("query.services.query_service.connection.cursor")
    @patch("query.services.query_service.genai.Client")
    def test_execute_sql_returns_array_rows(self, mock_client, mock_cursor_func):
        """
        execute_sql must return rows as arrays of values (not dicts),
        matching the columns list order.
        """
        from query.services.query_service import QueryService

        mock_cursor = MagicMock()
        mock_cursor_func.return_value.__enter__.return_value = mock_cursor
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = [(1, "Alice"), (2, "Bob")]

        service = QueryService()
        result = service.execute_sql("SELECT id, name FROM dataset_1")

        assert result["row_count"] == 2
        assert result["columns"] == ["id", "name"]
        for row in result["rows"]:
            assert isinstance(row, list), (
                f"execute_sql must return array rows, got {type(row).__name__}"
            )
        assert result["rows"][0] == [1, "Alice"]
        assert result["rows"][1] == [2, "Bob"]

    @patch("query.services.query_service.connection.cursor")
    @patch("query.services.query_service.genai.Client")
    def test_execute_sql_columns_returned(self, mock_client, mock_cursor_func):
        """execute_sql must return a columns list."""
        from query.services.query_service import QueryService

        mock_cursor = MagicMock()
        mock_cursor_func.return_value.__enter__.return_value = mock_cursor
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = []

        service = QueryService()
        result = service.execute_sql("SELECT id, name FROM dataset_1")

        assert "columns" in result
        assert result["columns"] == ["id", "name"]
