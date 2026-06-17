from django.urls import path, include
from rest_framework.routers import DefaultRouter
from query.views import QueryHistoryViewSet, QueryExecutionView, DatasetUploadView, DatasetViewSet, DatabaseSchemaView

router = DefaultRouter()
router.register(r'history', QueryHistoryViewSet, basename='queryhistory')
router.register(r'datasets', DatasetViewSet, basename='dataset')

urlpatterns = [
    path('datasets/upload/', DatasetUploadView.as_view(), name='dataset-upload'),
    path('execute/', QueryExecutionView.as_view(), name='query-execute'),
    path('schema/', DatabaseSchemaView.as_view(), name='database-schema'),
    path('suggestions/', include('query.suggestion_urls')),
    path('', include(router.urls)),
]
