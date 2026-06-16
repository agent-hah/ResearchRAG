from django.contrib import admin
from django.urls import path, include
from core.views import CleanupOrphansView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('literature.urls')),
    path('api/v1/notes/', include('notes.urls')),
    path('api/v1/rag/', include('rag.urls')),
    path('api/v1/query/', include('query.urls')),
    path('api/v1/export/', include('query.export_urls')),
    path('api/refinement/', include('refinement.urls')),
    path('api/v1/system/cleanup/', CleanupOrphansView.as_view(), name='system-cleanup'),
]
