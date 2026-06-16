from django.urls import path, include
from rest_framework.routers import DefaultRouter
from notes.views import NoteViewSet, NoteRelationshipViewSet, RelatedNotesView

router = DefaultRouter()
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'relationships', NoteRelationshipViewSet, basename='noterelationship')

urlpatterns = [
    path('related/<str:target_type>/<int:target_id>/', RelatedNotesView.as_view(), name='related-notes'),
    path('', include(router.urls)),
]
