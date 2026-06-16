from django.urls import path, include
from rest_framework.routers import DefaultRouter
from literature.views import LiteratureViewSet, AnnotationViewSet, FileUploadView

router = DefaultRouter()
router.register(r'literature', LiteratureViewSet, basename='literature')
router.register(r'annotations', AnnotationViewSet, basename='annotation')

urlpatterns = [
    path('literature/upload/', FileUploadView.as_view(), name='file-upload'),
    path('', include(router.urls)),
]
