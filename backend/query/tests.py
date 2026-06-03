from django.test import TestCase
from query.models import QueryHistory
from rag.models import Dataset
from services.query_service import get_query_service

class QueryServiceTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(
            filename="data.csv",
            file_path="/tmp/data.csv",
            file_size_bytes=1000,
            table_name="dataset_1_data"
        )
        # Create table to avoid SQL error
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("CREATE TABLE dataset_1_data (id INTEGER PRIMARY KEY, value TEXT)")
            cursor.execute("INSERT INTO dataset_1_data (id, value) VALUES (1, 'test')")

    def test_save_query_history(self):
        service = get_query_service()
        history = service.save_query_history(
            query="test",
            sql_query="SELECT * FROM dataset_1_data",
            row_count=1,
            processing_time_ms=10.0
        )
        self.assertEqual(history.query_text, "test")
        
        histories, count = service.get_query_history()
        self.assertEqual(count, 1)

    def test_execute_sql(self):
        service = get_query_service()
        result = service.execute_sql("SELECT * FROM dataset_1_data")
        self.assertEqual(result["row_count"], 1)
        self.assertEqual(result["rows"][0]["value"], "test")

    def tearDown(self):
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS dataset_1_data")
