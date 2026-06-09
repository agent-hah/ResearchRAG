import pytest
from unittest.mock import patch, MagicMock, mock_open
import json
import io
from datetime import datetime

from django.utils import timezone
from query.services.export_service import ExportService
from rag.models import Dataset
from notes.models import Note
from query.models import QueryHistory
from literature.models import Literature, Annotation

@pytest.fixture
def export_service():
    return ExportService()

@pytest.fixture
def dataset(db):
    return Dataset.objects.create(
        name="Test Dataset", 
        filename="test.csv", 
        table_name="dataset_1_test", 
        row_count=0, 
        file_size_bytes=100
    )

@pytest.fixture
def note_fixture(db, dataset, lit_fixture, query_history):
    return Note.objects.create(
        content="Test note\nLine 2",
        tags="tag1, tag2",
        dataset=dataset,
        literature=lit_fixture,
        query=query_history
    )

@pytest.fixture
def query_history(db):
    return QueryHistory.objects.create(
        query_text="Test query",
        sql_query="SELECT * FROM test",
        data_results={"data": [{"col1": "val1", "col2": "val2"}, {"col1": "val3", "col2": "val4"}]}
    )

@pytest.fixture
def lit_fixture(db):
    return Literature.objects.create(
        filename="test.pdf",
        file_path="/test/path/test.pdf",
        file_size=1024,
        processing_status="completed"
    )

@pytest.mark.django_db
def test_export_dataset_csv(export_service, dataset):
    from django.db import connection
    table_name = dataset.table_name
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE TABLE {table_name} (id INT, name VARCHAR(255))")
        cursor.execute(f"INSERT INTO {table_name} VALUES (1, 'A'), (2, 'B')")
    
    try:
        csv_str = export_service.export_dataset_csv(dataset.id)
        assert "id,name\r\n1,A\r\n2,B\r\n" == csv_str
    finally:
        with connection.cursor() as cursor:
            cursor.execute(f"DROP TABLE {table_name}")

@pytest.mark.django_db
def test_export_dataset_csv_not_found(export_service):
    with pytest.raises(ValueError, match="Dataset 999 not found"):
        export_service.export_dataset_csv(999)

@pytest.mark.django_db
def test_export_dataset_csv_no_table(export_service, dataset):
    dataset.table_name = ""
    dataset.save()
    with pytest.raises(ValueError, match="Dataset table name not found"):
        export_service.export_dataset_csv(dataset.id)

@pytest.mark.django_db
def test_export_dataset_json(export_service, dataset):
    from django.db import connection
    table_name = dataset.table_name
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE TABLE {table_name} (id INT, name VARCHAR(255))")
        cursor.execute(f"INSERT INTO {table_name} VALUES (1, 'A'), (2, 'B')")
    
    try:
        json_str = export_service.export_dataset_json(dataset.id)
        data = json.loads(json_str)
        assert data["dataset"]["id"] == dataset.id
        assert len(data["data"]) == 2
        assert data["data"][0]["id"] == 1
        assert data["data"][0]["name"] == "A"
    finally:
        with connection.cursor() as cursor:
            cursor.execute(f"DROP TABLE {table_name}")

@pytest.mark.django_db
def test_export_dataset_json_not_found(export_service):
    with pytest.raises(ValueError, match="Dataset 999 not found"):
        export_service.export_dataset_json(999)

@pytest.mark.django_db
def test_export_query_results_csv(export_service, query_history):
    csv_str = export_service.export_query_results_csv([query_history.id])
    assert "ID,Question,SQL Query,Created At,Result Count,Synthesis Summary" in csv_str
    assert "\n1,Test query" in csv_str or "\r\n1,Test query" in csv_str
    assert "Test query" in csv_str
    assert "SELECT * FROM test" in csv_str

@pytest.mark.django_db
def test_export_query_results_csv_not_found(export_service):
    with pytest.raises(ValueError, match="No queries found"):
        export_service.export_query_results_csv([999])

@pytest.mark.django_db
def test_export_query_results_json(export_service, query_history):
    query_history.literature_context = [{"text": "Context 1", "relevance_score": 0.95}]
    query_history.save()
    json_str = export_service.export_query_results_json([query_history.id])
    data = json.loads(json_str)
    
    assert "queries" in data
    assert len(data["queries"]) == 1
    assert data["queries"][0]["id"] == 1
    assert data["queries"][0]["question"] == "Test query"
    assert len(data["queries"][0]["results"]["data"]) == 2
    assert "relevance_score" not in data["queries"][0]["literature_context"][0]

@pytest.mark.django_db
def test_export_query_results_json_not_found(export_service):
    with pytest.raises(ValueError, match="No queries found"):
        export_service.export_query_results_json([999])

@pytest.mark.django_db
def test_export_notes_markdown(export_service, note_fixture):
    md_str = export_service.export_notes_markdown()
    assert "# Research Notes" in md_str
    assert "Total Notes: 1" in md_str
    assert "## Test note" in md_str
    assert "`tag1`, `tag2`" in md_str
    assert f"*References Dataset ID: {note_fixture.dataset_id}*" in md_str
    assert f"*References Literature ID: {note_fixture.literature_id}*" in md_str
    assert f"*References Query ID: {note_fixture.query_id}*" in md_str
    assert "Test note\nLine 2" in md_str

@pytest.mark.django_db
def test_export_notes_markdown_with_ids(export_service, note_fixture):
    md_str = export_service.export_notes_markdown([note_fixture.id])
    assert "Total Notes: 1" in md_str

@pytest.mark.django_db
def test_export_notes_json(export_service, note_fixture):
    json_str = export_service.export_notes_json()
    data = json.loads(json_str)
    
    assert data["total"] == 1
    assert data["notes"][0]["id"] == note_fixture.id
    assert "tag1" in data["notes"][0]["tags"]
    assert data["notes"][0]["dataset_id"] == note_fixture.dataset_id

@pytest.mark.django_db
def test_export_notes_json_with_ids(export_service, note_fixture):
    json_str = export_service.export_notes_json([note_fixture.id])
    data = json.loads(json_str)
    assert data["total"] == 1

def test_export_visualization_json(export_service):
    viz_config = {"type": "bar", "data": [1, 2, 3]}
    json_str = export_service.export_visualization_json(viz_config)
    data = json.loads(json_str)
    
    assert data["visualization"]["type"] == "bar"
    assert data["format_version"] == "1.0"
    assert "exported_at" in data

@pytest.mark.django_db
@patch('os.path.exists')
def test_export_literature_pdf_not_found_literature(mock_exists, export_service):
    with pytest.raises(ValueError, match="Literature 999 not found"):
        export_service.export_literature_pdf(999)

@pytest.mark.django_db
def test_export_literature_pdf_not_found_file(mocker, export_service, lit_fixture):
    mock_exists = mocker.patch('os.path.exists')
    mock_exists.return_value = False
    with pytest.raises(ValueError, match="PDF file not found at /test/path/test.pdf"):
        export_service.export_literature_pdf(lit_fixture.id)

@pytest.mark.django_db
@patch('os.path.exists')
def test_export_literature_pdf_no_annotations(mock_exists, export_service, lit_fixture):
    mock_exists.return_value = True
    with patch("builtins.open", mock_open(read_data=b"pdf_content")):
        pdf_bytes, filename = export_service.export_literature_pdf(lit_fixture.id, include_annotations=False)
        assert pdf_bytes == b"pdf_content"
        assert filename == "test.pdf"

@pytest.mark.django_db
@patch('os.path.exists')
def test_export_literature_pdf_with_annotations_but_none_exist(mock_exists, export_service, lit_fixture):
    mock_exists.return_value = True
    with patch("builtins.open", mock_open(read_data=b"pdf_content")):
        pdf_bytes, filename = export_service.export_literature_pdf(lit_fixture.id, include_annotations=True)
        assert pdf_bytes == b"pdf_content"
        assert filename == "test.pdf"

@pytest.mark.django_db
def test_export_literature_pdf_with_annotations(mocker, export_service, lit_fixture):
    mock_exists = mocker.patch('os.path.exists')
    mock_reader = mocker.patch('PyPDF2.PdfReader')
    mock_writer = mocker.patch('PyPDF2.PdfWriter')
    mock_canvas = mocker.patch('reportlab.pdfgen.canvas.Canvas')
    mock_exists.return_value = True
    
    # Create an annotation
    Annotation.objects.create(
        literature=lit_fixture,
        page_number=1,
        annotation_type="highlight",
        x_position=0.1,
        y_position=0.2,
        width=0.3,
        height=0.4,
        color="yellow",
        content="Test comment"
    )
    
    # Setup mocks
    mock_page = MagicMock()
    mock_page.mediabox.width = 100
    mock_page.mediabox.height = 200
    
    mock_reader_instance = mock_reader.return_value
    mock_reader_instance.pages = [mock_page]
    
    mock_writer_instance = mock_writer.return_value
    
    with patch("builtins.open", mock_open(read_data=b"pdf_content")):
        pdf_bytes, filename = export_service.export_literature_pdf(lit_fixture.id, include_annotations=True)
        
        # Test basic success since we mocked out the PDF manipulation
        assert filename == "test_with_annotations.pdf"
        mock_writer_instance.write.assert_called_once()
        mock_canvas.return_value.save.assert_called_once()

@pytest.mark.django_db
def test_export_literature_pdf_with_annotations_integration(export_service, lit_fixture):
    # Setup a real dummy PDF to ensure PDF processing doesn't crash (e.g. IndexError on empty pages)
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    
    # Create real dummy PDF
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.drawString(100, 100, 'Test PDF Document')
    can.showPage()
    can.save()
    
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(packet.getvalue())
        tmp_path = tmp.name
        
    try:
        # Update literature to point to real file
        lit_fixture.file_path = tmp_path
        lit_fixture.save()
        
        # Create an annotation
        Annotation.objects.create(
            literature=lit_fixture,
            page_number=1,
            annotation_type="highlight",
            x_position=0.1,
            y_position=0.2,
            width=0.3,
            height=0.4,
            color="yellow",
            content="Integration test comment"
        )
        
        # Run export (no mocking of PyPDF2 or reportlab)
        pdf_bytes, filename = export_service.export_literature_pdf(lit_fixture.id, include_annotations=True)
        
        # Check output is a valid PDF bytes
        assert pdf_bytes.startswith(b'%PDF')
        assert filename == "test_with_annotations.pdf"
        
        # Verify we can read the resulting PDF
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == 1
    finally:
        os.unlink(tmp_path)
