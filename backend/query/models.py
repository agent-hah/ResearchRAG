from django.db import models
from literature.models import TimeStampedModel

class QueryHistory(TimeStampedModel):
    query_text = models.TextField()
    sql_query = models.TextField(null=True, blank=True)
    result_count = models.IntegerField(null=True, blank=True)
    dataset = models.ForeignKey('rag.Dataset', on_delete=models.SET_NULL, null=True, blank=True, related_name='queries')
    execution_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    sql_confidence = models.FloatField(null=True, blank=True)
    data_results = models.JSONField(null=True, blank=True)
    literature_context = models.JSONField(null=True, blank=True)
    synthesis = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"<QueryHistory(id={self.id}, query='{self.query_text[:50]}...')>"

class DocumentSuggestion(TimeStampedModel):
    dataset = models.ForeignKey('rag.Dataset', on_delete=models.SET_NULL, null=True, blank=True, related_name='suggestions')
    title = models.CharField(max_length=500)
    authors = models.TextField(null=True, blank=True)
    publication_year = models.IntegerField(null=True, blank=True)
    publication_venue = models.CharField(max_length=300, null=True, blank=True)
    abstract = models.TextField(null=True, blank=True)
    snippet = models.TextField(null=True, blank=True)
    url = models.CharField(max_length=500, null=True, blank=True)
    pdf_url = models.CharField(max_length=500, null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)
    relevance_score = models.FloatField(null=True, blank=True)
    search_query = models.TextField(null=True, blank=True)
    is_relevant = models.BooleanField(null=True, blank=True)
    is_imported = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    citation_count = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"<DocumentSuggestion(id={self.id}, title='{self.title[:50]}...')>"
