from django.urls import path
from rag.views import RAGIndexView, RAGSearchView, RAGStatsView

urlpatterns = [
    path('index/', RAGIndexView.as_view(), name='rag-index'),
    path('search/', RAGSearchView.as_view(), name='rag-search'),
    path('stats/', RAGStatsView.as_view(), name='rag-stats'),
]
