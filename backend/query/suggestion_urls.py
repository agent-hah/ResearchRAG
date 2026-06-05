from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .suggestion_views import SuggestionViewSet, SuggestionGenerateView, SuggestionKeywordsView, SuggestionStatusView

router = DefaultRouter()
router.register(r'', SuggestionViewSet, basename='suggestion')

urlpatterns = [
    path('generate', SuggestionGenerateView.as_view(), name='suggestion-generate'),
    path('dataset/<str:dataset_id>/keywords', SuggestionKeywordsView.as_view(), name='suggestion-keywords'),
    path('dataset/<str:dataset_id>/status', SuggestionStatusView.as_view(), name='suggestion-status'),
    path('', include(router.urls)),
]
