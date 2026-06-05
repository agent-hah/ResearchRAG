from django.urls import path
from .export_views import (
    ExportDatasetView,
    ExportQueryView,
    ExportNotesView,
    ExportLiteraturePDFView,
)

urlpatterns = [
    path('dataset', ExportDatasetView.as_view(), name='export-dataset'),
    path('query', ExportQueryView.as_view(), name='export-query'),
    path('notes', ExportNotesView.as_view(), name='export-notes'),
    path('literature/pdf', ExportLiteraturePDFView.as_view(), name='export-literature-pdf'),
]
