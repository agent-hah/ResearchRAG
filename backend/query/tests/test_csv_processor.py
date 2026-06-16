import pytest
import pandas as pd
from pathlib import Path
from unittest.mock import patch, MagicMock
from django.db import connection

from query.services.csv_processor import CSVProcessor
from rag.models import Dataset
import json

@pytest.fixture
def sample_csv(tmp_path):
    df = pd.DataFrame({
        'id': [1, 2],
        'name': ['A', 'B']
    })
    file_path = tmp_path / "test.csv"
    df.to_csv(file_path, index=False)
    return file_path

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        'id': [1, 2],
        'name': ['A', 'B']
    })

@pytest.fixture
def dataset(db):
    return Dataset.objects.create(name="Test Dataset", filename="test.csv", table_name="", row_count=0, file_size_bytes=100)

@pytest.fixture(autouse=True)
def mock_storage_open(mocker):
    # Just use builtin open to bypass Django's SuspiciousOperation for tmp_path
    import builtins
    mocker.patch('django.core.files.storage.default_storage.open', side_effect=builtins.open)

def test_parse_csv(sample_csv):
    df = CSVProcessor.parse_csv(sample_csv)
    assert len(df) == 2
    assert list(df.columns) == ['id', 'name']

def test_parse_csv_error():
    with pytest.raises(ValueError, match="Failed to parse CSV"):
        CSVProcessor.parse_csv(Path("nonexistent.csv"))

def test_generate_table_name():
    assert CSVProcessor.generate_table_name("test.csv", 1) == "dataset_1_test"
    assert CSVProcessor.generate_table_name("123test.csv", 2) == "dataset_2_123test"
    assert CSVProcessor.generate_table_name("test-file!@#.csv", 3) == "dataset_3_test_file___"

@pytest.mark.django_db
@patch('pandas.DataFrame.to_sql')
def test_store_in_database(mock_to_sql, sample_df):
    metadata = CSVProcessor.store_in_database(sample_df, "test_table")
    assert metadata["table_name"] == "test_table"
    assert metadata["row_count"] == 2
    assert metadata["column_count"] == 2
    assert metadata["columns"] == ['id', 'name']
    mock_to_sql.assert_called_once()

@pytest.mark.django_db
@patch('pandas.DataFrame.to_sql')
def test_store_in_database_error(mock_to_sql, sample_df):
    mock_to_sql.side_effect = Exception("DB error")
    with pytest.raises(ValueError, match="Failed to store data in database: DB error"):
        CSVProcessor.store_in_database(sample_df, "test_table")

@pytest.mark.django_db
def test_update_dataset_metadata(dataset):
    metadata = {
        "table_name": "new_table",
        "row_count": 5,
        "column_count": 3,
        "columns": ["a", "b", "c"]
    }
    updated = CSVProcessor.update_dataset_metadata(dataset, metadata)
    assert updated.table_name == "new_table"
    assert updated.row_count == 5
    assert updated.column_count == 3
    assert json.loads(updated.columns_json) == ["a", "b", "c"]

@pytest.mark.django_db
@patch('query.services.csv_processor.CSVProcessor.parse_csv')
@patch('query.services.csv_processor.CSVProcessor.store_in_database')
@patch('query.services.csv_processor.CSVProcessor.update_dataset_metadata')
def test_process_csv_file(mock_update, mock_store, mock_parse, dataset, sample_csv, sample_df):
    mock_parse.return_value = sample_df
    mock_store.return_value = {"table_name": "dataset_1_test", "row_count": 2, "column_count": 2, "columns": ["id", "name"]}
    mock_update.return_value = dataset
    
    result = CSVProcessor.process_csv_file(sample_csv, dataset)
    assert result == dataset
    mock_parse.assert_called_once_with(sample_csv)
    mock_store.assert_called_once()
    mock_update.assert_called_once()

@pytest.mark.django_db
@patch('query.services.csv_processor.CSVProcessor.parse_csv')
def test_process_csv_file_error(mock_parse, dataset, sample_csv):
    mock_parse.side_effect = Exception("Parse error")
    with pytest.raises(Exception, match="Parse error"):
        CSVProcessor.process_csv_file(sample_csv, dataset)

@pytest.mark.django_db
def test_get_table_preview_invalid_name():
    with pytest.raises(ValueError, match="Invalid table name"):
        CSVProcessor.get_table_preview("invalid name")

@pytest.mark.django_db
def test_get_table_schema_invalid_name():
    with pytest.raises(ValueError, match="Invalid table name"):
        CSVProcessor.get_table_schema("invalid name")

@pytest.mark.django_db
def test_drop_table_invalid_name():
    with pytest.raises(ValueError, match="Invalid table name"):
        CSVProcessor.drop_table("invalid name")

@pytest.mark.django_db
@patch('django.db.backends.sqlite3.base.SQLiteCursorWrapper.execute')
@patch('django.db.backends.sqlite3.base.SQLiteCursorWrapper.fetchall')
def test_get_table_preview(mock_fetchall, mock_execute):
    mock_execute.return_value = None
    mock_fetchall.return_value = [[1, "A"], [2, "B"]]
    
    # We also need to mock cursor.description which is an attribute
    # Instead of patching SQLiteCursorWrapper attributes, we can patch the context manager
    with patch('django.db.connection.cursor') as mock_cursor_ctx:
        mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = [[1, "A"], [2, "B"]]
        
        result = CSVProcessor.get_table_preview("test_table", 2)
        
        assert len(result) == 2
        assert result[0] == {"id": 1, "name": "A"}
        assert result[1] == {"id": 2, "name": "B"}
        mock_cursor.execute.assert_called_once_with("SELECT * FROM test_table LIMIT %s", [2])

@pytest.mark.django_db
@patch('django.db.connection.cursor')
def test_get_table_preview_error(mock_cursor_ctx):
    mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
    mock_cursor.execute.side_effect = Exception("DB Error")
    
    with pytest.raises(ValueError, match="Failed to get table preview: DB Error"):
        CSVProcessor.get_table_preview("test_table", 2)

@pytest.mark.django_db
@patch('django.db.connection.cursor')
def test_get_table_schema(mock_cursor_ctx):
    mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
    # Pragma columns: cid, name, type, notnull, dflt_value, pk
    mock_cursor.fetchall.return_value = [
        (0, "id", "INTEGER", 1, None, 1),
        (1, "name", "TEXT", 0, None, 0)
    ]
    
    result = CSVProcessor.get_table_schema("test_table")
    assert len(result) == 2
    assert result[0] == {"name": "id", "type": "INTEGER", "nullable": False}
    assert result[1] == {"name": "name", "type": "TEXT", "nullable": True}
    mock_cursor.execute.assert_called_once_with("PRAGMA table_info(test_table)")

@pytest.mark.django_db
@patch('django.db.connection.cursor')
def test_get_table_schema_error(mock_cursor_ctx):
    mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
    mock_cursor.execute.side_effect = Exception("DB Error")
    
    with pytest.raises(ValueError, match="Failed to get table schema: DB Error"):
        CSVProcessor.get_table_schema("test_table")

@pytest.mark.django_db
@patch('django.db.connection.cursor')
def test_drop_table(mock_cursor_ctx):
    mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
    
    CSVProcessor.drop_table("test_table")
    mock_cursor.execute.assert_called_once_with("DROP TABLE IF EXISTS test_table")

@pytest.mark.django_db
@patch('django.db.connection.cursor')
def test_drop_table_error(mock_cursor_ctx):
    mock_cursor = mock_cursor_ctx.return_value.__enter__.return_value
    mock_cursor.execute.side_effect = Exception("DB Error")
    
    with pytest.raises(Exception, match="DB Error"):
        CSVProcessor.drop_table("test_table")
