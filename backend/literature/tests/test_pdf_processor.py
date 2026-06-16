import pytest
from unittest.mock import MagicMock, patch
from literature.services.pdf_processor import PDFProcessor
from literature.models import Literature, ProcessingStatus
from pathlib import Path

@pytest.fixture(autouse=True)
def mock_storage_open(mocker):
    mock_file = mocker.MagicMock()
    mock_file.read.return_value = b"dummy content"
    
    mock_open = mocker.patch('django.core.files.storage.default_storage.open')
    mock_open.return_value.__enter__.return_value = mock_file
    return mock_open

@pytest.fixture
def mock_pdfplumber(mocker):
    # Mock pdfplumber open
    mock_open = mocker.patch('literature.services.pdf_processor.pdfplumber.open')
    
    # Mock PDF context manager
    mock_pdf = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_pdf
    
    # Mock pages
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "Page 1 Text"
    
    mock_page2 = MagicMock()
    mock_page2.extract_text.return_value = "Page 2 Text"
    
    mock_pdf.pages = [mock_page1, mock_page2]
    mock_pdf.metadata = {
        "Title": "Test PDF",
        "Author": "Test Author"
    }
    return mock_pdf

@pytest.mark.django_db
def test_extract_text(mock_pdfplumber):
    text = PDFProcessor.extract_text(Path("dummy.pdf"))
    assert text == "Page 1 Text\n\nPage 2 Text"

@pytest.mark.django_db
def test_get_metadata(mock_pdfplumber):
    metadata = PDFProcessor.get_metadata(Path("dummy.pdf"))
    assert metadata["page_count"] == 2
    assert metadata["title"] == "Test PDF"
    assert metadata["author"] == "Test Author"

@pytest.mark.django_db
def test_process_pdf_file(mock_pdfplumber):
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        user_id='test_user'
    )
    
    updated_lit, text = PDFProcessor.process_pdf_file(Path("dummy.pdf"), literature)
    
    assert text == "Page 1 Text\n\nPage 2 Text"
    assert updated_lit.processing_status == ProcessingStatus.COMPLETED
    assert updated_lit.page_count == 2

@pytest.mark.django_db
def test_extract_text_exception(mocker):
    mocker.patch('literature.services.pdf_processor.pdfplumber.open', side_effect=Exception("Read Error"))
    with pytest.raises(ValueError, match="Failed to extract text from PDF"):
        PDFProcessor.extract_text(Path("dummy.pdf"))

@pytest.mark.django_db
def test_get_metadata_exception(mocker):
    mocker.patch('literature.services.pdf_processor.pdfplumber.open', side_effect=Exception("Meta Error"))
    with pytest.raises(ValueError, match="Failed to extract metadata from PDF"):
        PDFProcessor.get_metadata(Path("dummy.pdf"))

@pytest.mark.django_db
def test_process_pdf_file_exception(mocker):
    mocker.patch('literature.services.pdf_processor.PDFProcessor.extract_text', side_effect=Exception("Process Error"))
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        user_id='test_user'
    )
    with pytest.raises(Exception, match="Process Error"):
        PDFProcessor.process_pdf_file(Path("dummy.pdf"), literature)
    
    # Refresh from DB
    literature.refresh_from_db()
    assert literature.processing_status == ProcessingStatus.FAILED

@pytest.mark.django_db
def test_validate_pdf_success(mock_pdfplumber):
    assert PDFProcessor.validate_pdf(Path("dummy.pdf")) is True

@pytest.mark.django_db
def test_validate_pdf_exception(mocker):
    mocker.patch('literature.services.pdf_processor.pdfplumber.open', side_effect=Exception("Invalid PDF"))
    assert PDFProcessor.validate_pdf(Path("dummy.pdf")) is False
