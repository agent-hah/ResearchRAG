from django.db import models

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class ProcessingStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    INDEXED = 'indexed', 'Indexed'
    FAILED = 'failed', 'Failed'

class Literature(TimeStampedModel):
    filename = models.CharField(max_length=255, db_index=True)
    file_path = models.CharField(max_length=512)
    file_size = models.IntegerField()
    page_count = models.IntegerField(null=True, blank=True)
    processing_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
        db_index=True
    )
    indexed_at = models.DateTimeField(null=True, blank=True)
    indexing_progress = models.FloatField(default=0.0)
    error_message = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"<Literature(id={self.id}, filename='{self.filename}', status='{self.processing_status}')>"

class AnnotationType(models.TextChoices):
    HIGHLIGHT = 'highlight', 'Highlight'
    COMMENT = 'comment', 'Comment'
    BOOKMARK = 'bookmark', 'Bookmark'

class Annotation(TimeStampedModel):
    literature = models.ForeignKey(Literature, on_delete=models.CASCADE, related_name='annotations')
    annotation_type = models.CharField(max_length=20, choices=AnnotationType.choices)
    content = models.TextField(null=True, blank=True)
    page_number = models.IntegerField()
    x_position = models.FloatField(null=True, blank=True)
    y_position = models.FloatField(null=True, blank=True)
    width = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    color = models.CharField(max_length=20, default="yellow", null=True, blank=True)

    def __str__(self):
        return f"<Annotation(id={self.id}, type={self.annotation_type}, page={self.page_number})>"
