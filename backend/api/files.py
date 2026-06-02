"""
File management API endpoints.
"""
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.config import get_settings
from backend.schemas.file import (
    FileUploadResponse,
    DatasetResponse,
    LiteratureResponse,
    FileListResponse,
    FileType,
    ProcessingStatus
)
from backend.schemas.common import SuccessResponse, ErrorResponse
from backend.services.file_service import FileService
from backend.services.csv_processor import CSVProcessor
from backend.services.pdf_processor import PDFProcessor
from backend.utils.logger import get_logger

router = APIRouter(prefix="/files", tags=["files"])
logger = get_logger(__name__)
settings = get_settings()


def process_csv_background(dataset_id: int, file_path: str):
    """Background task for CSV processing."""
    from backend.database import SessionLocal
    
    db = SessionLocal()
    try:
        dataset = FileService.get_dataset_by_id(db, dataset_id)
        if dataset:
            CSVProcessor.process_csv_file(Path(file_path), dataset, db)
    except Exception as e:
        logger.error(f"Background CSV processing failed: {str(e)}")
    finally:
        db.close()


def process_pdf_background(literature_id: int, file_path: str):
    """Background task for PDF processing."""
    from backend.database import SessionLocal
    
    db = SessionLocal()
    try:
        literature = FileService.get_literature_by_id(db, literature_id)
        if literature:
            PDFProcessor.process_pdf_file(Path(file_path), literature, db)
    except Exception as e:
        logger.error(f"Background PDF processing failed: {str(e)}")
    finally:
        db.close()


@router.post("/upload/csv", response_model=FileUploadResponse)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file.
    
    The file will be validated, saved, and processed in the background.
    Processing includes parsing the CSV and storing it in the database.
    """
    # Validate file
    is_valid, error_msg = FileService.validate_file(file, FileService.ALLOWED_CSV_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Save file
    file_path = settings.UPLOAD_DIR / file.filename
    file_size = await FileService.save_uploaded_file(file, file_path)
    
    # Create database record
    dataset = FileService.create_dataset_record(
        db=db,
        filename=file.filename,
        file_path=str(file_path),
        file_size=file_size
    )
    
    # Schedule background processing
    background_tasks.add_task(process_csv_background, dataset.id, str(file_path))
    
    return FileUploadResponse(
        id=dataset.id,
        filename=dataset.filename,
        file_type=FileType.CSV,
        file_size=dataset.file_size_bytes,
        status=ProcessingStatus.PENDING,
        message="CSV file uploaded successfully. Processing in background."
    )


@router.post("/upload/pdf", response_model=FileUploadResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF file.
    
    The file will be validated, saved, and processed in the background.
    Processing includes text extraction and metadata extraction.
    """
    # Validate file
    is_valid, error_msg = FileService.validate_file(file, FileService.ALLOWED_PDF_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Save file
    file_path = settings.UPLOAD_DIR / file.filename
    file_size = await FileService.save_uploaded_file(file, file_path)
    
    # Create database record
    literature = FileService.create_literature_record(
        db=db,
        filename=file.filename,
        file_path=str(file_path),
        file_size=file_size
    )
    
    # Schedule background processing
    background_tasks.add_task(process_pdf_background, literature.id, str(file_path))
    
    return FileUploadResponse(
        id=literature.id,
        filename=literature.filename,
        file_type=FileType.PDF,
        file_size=literature.file_size,
        status=ProcessingStatus.PENDING,
        message="PDF file uploaded successfully. Processing in background."
    )


@router.get("/list", response_model=FileListResponse)
def list_files(db: Session = Depends(get_db)):
    """
    List all uploaded files (datasets and literature).
    """
    datasets = FileService.get_all_datasets(db)
    literature = FileService.get_all_literature(db)
    
    return FileListResponse(
        datasets=[DatasetResponse.from_orm(d) for d in datasets],
        literature=[LiteratureResponse.from_orm(l) for l in literature],
        total_datasets=len(datasets),
        total_literature=len(literature)
    )


@router.get("/datasets", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    """
    List all datasets.
    """
    datasets = FileService.get_all_datasets(db)
    return [DatasetResponse.from_orm(d) for d in datasets]


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """
    Get dataset by ID.
    """
    dataset = FileService.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return DatasetResponse.from_orm(dataset)


@router.get("/datasets/{dataset_id}/preview")
def get_dataset_preview(
    dataset_id: int,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get preview of dataset data.
    """
    dataset = FileService.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not dataset.table_name:
        raise HTTPException(status_code=400, detail="Dataset not yet processed")
    
    try:
        rows = CSVProcessor.get_table_preview(dataset.table_name, db, limit)
        schema = CSVProcessor.get_table_schema(dataset.table_name, db)
        
        return {
            "dataset_id": dataset.id,
            "table_name": dataset.table_name,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "schema": schema,
            "rows": rows,
            "preview_limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/datasets/{dataset_id}", response_model=SuccessResponse)
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """
    Delete dataset and associated file.
    """
    success = FileService.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return SuccessResponse(message=f"Dataset {dataset_id} deleted successfully")


@router.get("/literature", response_model=List[LiteratureResponse])
def list_literature(db: Session = Depends(get_db)):
    """
    List all literature.
    """
    literature = FileService.get_all_literature(db)
    return [LiteratureResponse.from_orm(l) for l in literature]


@router.get("/literature/{literature_id}", response_model=LiteratureResponse)
def get_literature(literature_id: int, db: Session = Depends(get_db)):
    """
    Get literature by ID.
    """
    literature = FileService.get_literature_by_id(db, literature_id)
    if not literature:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    return LiteratureResponse.from_orm(literature)


@router.get("/{literature_id}/download")
def download_literature(literature_id: int, db: Session = Depends(get_db)):
    """
    Download literature PDF file.
    """
    literature = FileService.get_literature_by_id(db, literature_id)
    if not literature:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    file_path = Path(literature.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=literature.filename
    )


@router.delete("/literature/{literature_id}", response_model=SuccessResponse)
def delete_literature(literature_id: int, db: Session = Depends(get_db)):
    """
    Delete literature and associated file.
    """
    success = FileService.delete_literature(db, literature_id)
    if not success:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    return SuccessResponse(message=f"Literature {literature_id} deleted successfully")


@router.post("/datasets/{dataset_id}/reprocess", response_model=SuccessResponse)
def reprocess_dataset(
    dataset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Reprocess a dataset (re-parse CSV and update database).
    """
    dataset = FileService.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Schedule background processing
    background_tasks.add_task(process_csv_background, dataset.id, dataset.file_path)
    
    return SuccessResponse(message=f"Dataset {dataset_id} reprocessing scheduled")


@router.post("/literature/{literature_id}/reprocess", response_model=SuccessResponse)
def reprocess_literature(
    literature_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Reprocess literature (re-extract text and metadata).
    """
    literature = FileService.get_literature_by_id(db, literature_id)
    if not literature:
        raise HTTPException(status_code=404, detail="Literature not found")
    
    # Reset status
    literature.processing_status = ProcessingStatus.PENDING
    db.commit()
    
    # Schedule background processing
    background_tasks.add_task(process_pdf_background, literature.id, literature.file_path)
    
    return SuccessResponse(message=f"Literature {literature_id} reprocessing scheduled")
