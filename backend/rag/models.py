from django.db import models
from literature.models import TimeStampedModel

class Dataset(TimeStampedModel):
    user_id = models.CharField(max_length=255, default='default', db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=512)
    file_size_bytes = models.IntegerField()
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    columns_json = models.TextField(null=True, blank=True)
    table_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return f"<Dataset(id={self.id}, name='{self.name}', rows={self.row_count})>"
