from django.urls import path
from .views import RefineView, SuggestionsView

urlpatterns = [
    path('refine', RefineView.as_view(), name='refine'),
    path('suggestions', SuggestionsView.as_view(), name='suggestions'),
]
