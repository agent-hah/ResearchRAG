import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from query.services.viz_service import VizService

def test_get_viz_data_not_found():
    with pytest.raises(ValueError, match="Dataset not provided"):
        VizService.get_viz_data(None)

def test_get_viz_data_already_processed():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.filename = "test.csv"
    mock_dataset.table_name = "test_table"
    mock_dataset.row_count = 10
    
    mock_schema = [
        {"name": "id", "type": "INTEGER"},
        {"name": "name", "type": "VARCHAR"},
        {"name": "date", "type": "VARCHAR"},
        {"name": "is_active", "type": "BOOLEAN"}
    ]
    
    mock_rows = [
        {"id": 1, "name": "A", "date": "2023-01-01", "is_active": True},
        {"id": 2, "name": "B", "date": "2023-01-02", "is_active": False}
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows), \
         patch('query.services.viz_service.CSVProcessor.get_table_schema', return_value=mock_schema):
         
        res = VizService.get_viz_data(mock_dataset)
        assert res["dataset_id"] == 1
        assert "id" in res["columns"]
        assert res["column_types"]["id"] == "numeric"
        assert res["column_types"]["is_active"] == "boolean"
        assert res["column_types"]["date"] == "datetime"
        assert res["column_types"]["name"] == "categorical"

def test_get_viz_data_needs_processing():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.table_name = None
    mock_dataset.row_count = 0
    mock_dataset.file_path = "/tmp/fake.csv"
    
    with patch('query.services.viz_service.Path.exists', return_value=True), \
         patch('query.services.viz_service.CSVProcessor.process_csv_file', return_value=mock_dataset), \
         patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=[]), \
         patch('query.services.viz_service.CSVProcessor.get_table_schema', return_value=[]):
         
        res = VizService.get_viz_data(mock_dataset)
        assert res["dataset_id"] == 1

def test_get_viz_data_needs_processing_file_missing():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.table_name = None
    mock_dataset.row_count = 0
    mock_dataset.file_path = "/tmp/fake.csv"
    
    with patch('query.services.viz_service.Path.exists', return_value=False):
         
        with pytest.raises(ValueError, match="File not found on disk"):
            VizService.get_viz_data(mock_dataset)

def test_get_spatial_data_not_found():
    with pytest.raises(ValueError, match="Dataset not provided"):
        VizService.get_spatial_data(None)

def test_get_spatial_data_no_rows():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=[]):
        res = VizService.get_spatial_data(mock_dataset)
        assert not res["is_spatial"]

def test_get_spatial_data_exact_match():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    mock_rows = [
        {"latitude": 45.0, "longitude": -90.0, "label": "A", "val": 10},
        {"latitude": 46.0, "longitude": -91.0, "label": "B", "val": 20}
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
        res = VizService.get_spatial_data(mock_dataset)
        assert res["is_spatial"]
        assert res["lat_column"] == "latitude"
        assert res["lng_column"] == "longitude"
        assert len(res["points"]) == 2
        assert res["points"][0]["lat"] == 45.0
        assert res["points"][0]["label"] == "A"
        assert res["points"][0]["value"] == 10

def test_get_spatial_data_fallback_match():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    mock_rows = [
        {"col1": 45.0, "col2": -90.0},
        {"col1": 46.0, "col2": -91.0}
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
        res = VizService.get_spatial_data(mock_dataset)
        assert res["is_spatial"]
        assert res["lat_column"] == "col1"
        assert res["lng_column"] == "col2"

def test_get_spatial_data_missing_data():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    mock_rows = [
        {"latitude": None, "longitude": -90.0, "label": "A"},
        {"latitude": 46.0, "longitude": -91.0, "label": "B"}
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
        res = VizService.get_spatial_data(mock_dataset)
        assert res["is_spatial"]
        assert len(res["points"]) == 1 # First one skipped
        
def test_get_spatial_data_needs_processing_file_missing():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.table_name = None
    mock_dataset.row_count = 0
    mock_dataset.file_path = "/tmp/fake.csv"
    
    with patch('query.services.viz_service.Path.exists', return_value=False):
         
        with pytest.raises(ValueError, match="File not found on disk"):
            VizService.get_spatial_data(mock_dataset)

def test_get_spatial_data_not_spatial():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    mock_rows = [
        {"col1": "A", "col2": "B"},
        {"col1": "C", "col2": "D"}
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
        res = VizService.get_spatial_data(mock_dataset)
        assert not res["is_spatial"]

def test_get_viz_data_datetime_and_error():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.filename = "test.csv"
    mock_dataset.table_name = "test_table"
    mock_dataset.row_count = 10
    
    mock_schema = [
        {"name": "real_date", "type": "TIMESTAMP"},
        {"name": "str_date", "type": "VARCHAR"},
        {"name": "bad_date", "type": "VARCHAR"}
    ]
    
    # Create pandas dataframe manually to bypass json row constraints
    df = pd.DataFrame({
        "real_date": pd.to_datetime(["2023-01-01", "2023-01-02"]),
        "str_date": ["2023/01/01", "2023/01/02"],
        "bad_date": ["2023-bad-date", "2024-worse"]
    })
    
    mock_rows = df.to_dict('records')
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows), \
         patch('query.services.viz_service.CSVProcessor.get_table_schema', return_value=mock_schema), \
         patch('pandas.DataFrame', return_value=df):
         
        res = VizService.get_viz_data(mock_dataset)
        assert res["column_types"]["real_date"] == "datetime"
        assert res["column_types"]["str_date"] == "datetime"
        assert res["column_types"]["bad_date"] == "categorical"

def test_get_spatial_data_needs_processing():
    mock_dataset = MagicMock()
    mock_dataset.id = 1
    mock_dataset.table_name = None
    mock_dataset.row_count = 0
    mock_dataset.file_path = "/tmp/fake.csv"
    
    mock_rows = [
        {"latitude": 45.0, "longitude": -90.0, "label": "A"}
    ]
    
    with patch('query.services.viz_service.Path.exists', return_value=True), \
         patch('query.services.viz_service.CSVProcessor.process_csv_file', return_value=mock_dataset), \
         patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
         
        res = VizService.get_spatial_data(mock_dataset)
        assert res["is_spatial"]

def test_get_spatial_data_exception_in_row():
    mock_dataset = MagicMock()
    mock_dataset.table_name = "test"
    mock_dataset.row_count = 10
    
    mock_rows = [
        {"latitude": "invalid", "longitude": -90.0, "label": "A"} # Will cause float() to raise exception
    ]
    
    with patch('query.services.viz_service.CSVProcessor.get_table_preview', return_value=mock_rows):
        res = VizService.get_spatial_data(mock_dataset)
        assert res["is_spatial"]
        assert len(res["points"]) == 0
