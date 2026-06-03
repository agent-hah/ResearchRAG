from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('literature.urls')),
    path('api/v1/notes/', include('notes.urls')),
    path('api/v1/rag/', include('rag.urls')),
    path('api/v1/query/', include('query.urls')),
]
