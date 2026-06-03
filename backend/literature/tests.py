from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from pathlib import Path
from services.file_service import FileService
from literature.models import Literature, ProcessingStatus
from rag.models import Dataset
import os

class FileServiceTest(TestCase):
    def setUp(self):
        self.test_csv = SimpleUploadedFile("test.csv", b"col1,col2\n1,2", content_type="text/csv")
        self.test_pdf = SimpleUploadedFile("test.pdf", b"%PDF-1.4", content_type="application/pdf")
        self.test_txt = SimpleUploadedFile("test.txt", b"hello", content_type="text/plain")

    def test_validate_file(self):
        valid, err = FileService.validate_file(self.test_csv, FileService.ALLOWED_CSV_EXTENSIONS)
        self.assertTrue(valid)
        self.assertIsNone(err)

        valid, err = FileService.validate_file(self.test_txt, FileService.ALLOWED_CSV_EXTENSIONS)
        self.assertFalse(valid)
        self.assertIn("Invalid file type", err)

    def test_save_uploaded_file(self):
        dest = Path("test_upload_file.txt")
        try:
            size = FileService.save_uploaded_file(self.test_txt, dest)
            self.assertEqual(size, 5)
            self.assertTrue(dest.exists())
            with open(dest, "rb") as f:
                self.assertEqual(f.read(), b"hello")
        finally:
            if dest.exists():
                dest.unlink()

    def test_create_literature_record(self):
        lit = FileService.create_literature_record("test.pdf", "/tmp/test.pdf", 1024)
        self.assertEqual(lit.filename, "test.pdf")
        self.assertEqual(lit.file_size, 1024)
        self.assertEqual(lit.processing_status, ProcessingStatus.PENDING)

        fetched = FileService.get_literature_by_id(lit.id)
        self.assertEqual(fetched.id, lit.id)

    def test_create_dataset_record(self):
        ds = FileService.create_dataset_record("data.csv", "/tmp/data.csv", 2048)
        self.assertEqual(ds.filename, "data.csv")
        self.assertEqual(ds.file_size_bytes, 2048)
        self.assertTrue(ds.table_name.startswith("dataset_data_"))

        fetched = FileService.get_dataset_by_id(ds.id)
        self.assertEqual(fetched.id, ds.id)

    def test_delete_literature(self):
        # Create a dummy file
        dest = Path("dummy_to_delete.pdf")
        with open(dest, "w") as f:
            f.write("dummy")
        
        lit = FileService.create_literature_record("dummy.pdf", str(dest), 5)
        
        result = FileService.delete_literature(lit.id)
        self.assertTrue(result)
        self.assertFalse(dest.exists())
        self.assertIsNone(FileService.get_literature_by_id(lit.id))
