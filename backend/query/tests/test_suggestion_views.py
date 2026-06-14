import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
import logging

from rag.models import Dataset
from query.models import DocumentSuggestion

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def dataset(db):
    return Dataset.objects.create(name="Dataset 1", filename="test.csv", table_name="test", row_count=1, file_size_bytes=10)

@pytest.fixture
def suggestion(db, dataset):
    return DocumentSuggestion.objects.create(
        dataset=dataset,
        title="Sample Suggestion",
        authors="John Doe",
        publication_year=2023,
        relevance_score=0.95
    )

@pytest.mark.django_db
def test_get_dataset_suggestions(api_client, dataset, suggestion):
    url = reverse('suggestion-list')
    response = api_client.get(url, {'dataset_id': dataset.id})
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == "Sample Suggestion"

@pytest.mark.django_db
def test_get_global_suggestions(api_client, db):
    # Clear any leaked suggestions from background threads
    DocumentSuggestion.objects.all().delete()
    
    DocumentSuggestion.objects.create(
        title="Global Suggestion",
        relevance_score=0.90
    )
    url = reverse('suggestion-list')
    response = api_client.get(url, {'dataset_id': 'global'})
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == "Global Suggestion"

@pytest.mark.django_db
def test_delete_by_dataset(api_client, dataset, suggestion):
    # Clear any leaked suggestions from background threads
    DocumentSuggestion.objects.exclude(id=suggestion.id).delete()
    
    url = reverse('suggestion-delete-by-dataset', kwargs={'dataset_id': dataset.id})
    response = api_client.delete(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['deleted_count'] == 1
    assert DocumentSuggestion.objects.count() == 0

@pytest.mark.django_db
def test_delete_global(api_client, db):
    # Clear any leaked suggestions from background threads
    DocumentSuggestion.objects.all().delete()
    
    DocumentSuggestion.objects.create(title="Global Suggestion")
    url = reverse('suggestion-delete-global')
    response = api_client.delete(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['deleted_count'] == 1
    assert DocumentSuggestion.objects.count() == 0

@pytest.mark.django_db
def test_suggestion_feedback(api_client, suggestion):
    url = reverse('suggestion-feedback', kwargs={'pk': suggestion.id})
    data = {'is_relevant': True, 'is_dismissed': False}
    response = api_client.put(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    
    suggestion.refresh_from_db()
    assert suggestion.is_relevant is True
    assert suggestion.is_dismissed is False

@pytest.mark.django_db
@patch('query.suggestion_views.DocumentSuggestionService.update_suggestion_feedback')
def test_suggestion_feedback_returns_none(mock_update, api_client):
    mock_update.return_value = None
    url = reverse('suggestion-feedback', kwargs={'pk': 9999})
    data = {'is_relevant': True}
    response = api_client.put(url, data, format='json')
    assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
def test_suggestion_feedback_not_found(api_client):
    url = reverse('suggestion-feedback', kwargs={'pk': 9999})
    data = {'is_relevant': True}
    with pytest.raises(ValueError, match="Suggestion 9999 not found"):
        api_client.put(url, data, format='json')

@pytest.mark.django_db
@patch('threading.Thread')
def test_generate_suggestions(mock_thread, api_client, dataset):
    url = reverse('suggestion-generate')
    data = {'dataset_id': dataset.id, 'max_per_keyword': 3}
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.data['success'] is True
    mock_thread.assert_called_once()
    mock_thread.return_value.start.assert_called_once()

@pytest.mark.django_db
@patch('threading.Thread')
def test_generate_suggestions_global(mock_thread, api_client):
    url = reverse('suggestion-generate')
    data = {'dataset_id': 'global', 'max_per_keyword': 3}
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.data['success'] is True
    mock_thread.assert_called_once()

@pytest.mark.django_db
@patch('query.suggestion_views.DocumentSuggestionService')
def test_generate_suggestions_exception(mock_service_class, api_client, dataset):
    # Call the actual view with a synchronous thread mock to execute `run_sync_generation`
    url = reverse('suggestion-generate')
    data = {'dataset_id': dataset.id}
    
    mock_service = mock_service_class.return_value
    mock_service.generate_suggestions_for_dataset.side_effect = Exception("Test Exception")
    
    def fake_thread(target):
        target() # Run synchronously to test the exception block
        class DummyThread:
            def start(self): pass
        return DummyThread()
        
    with patch('threading.Thread', side_effect=fake_thread):
        with patch('logging.Logger.error') as mock_logger:
            response = api_client.post(url, data, format='json')
            assert response.status_code == status.HTTP_202_ACCEPTED
            mock_logger.assert_called_once()

@pytest.mark.django_db
def test_generate_suggestions_invalid_dataset(api_client):
    url = reverse('suggestion-generate')
    data = {'dataset_id': 'invalid'}
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
@patch('query.suggestion_views.DocumentSuggestionService')
def test_get_keywords(mock_service_class, api_client, dataset):
    mock_service = mock_service_class.return_value
    mock_service.analyze_dataset_for_keywords.return_value = ["kw1", "kw2"]
    
    url = reverse('suggestion-keywords', kwargs={'dataset_id': dataset.id})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['keywords'] == ["kw1", "kw2"]
    assert response.data['dataset_id'] == str(dataset.id)

@pytest.mark.django_db
@patch('query.suggestion_views.DocumentSuggestionService')
def test_get_keywords_global(mock_service_class, api_client):
    mock_service = mock_service_class.return_value
    mock_service.analyze_dataset_for_keywords.return_value = ["global_kw"]
    
    url = reverse('suggestion-keywords', kwargs={'dataset_id': 'global'})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['dataset_id'] == 'global'

@pytest.mark.django_db
@patch('django.core.cache.cache.get')
def test_suggestion_status(mock_cache_get, api_client, dataset):
    mock_cache_get.return_value = {"status": "Processing", "progress": 50}
    url = reverse('suggestion-status', kwargs={'dataset_id': dataset.id})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == "Processing"
    assert response.data['progress'] == 50

@pytest.mark.django_db
@patch('django.core.cache.cache.get')
def test_suggestion_status_global(mock_cache_get, api_client):
    mock_cache_get.return_value = {"status": "Processing", "progress": 50}
    url = reverse('suggestion-status', kwargs={'dataset_id': 'global'})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK

@pytest.mark.django_db
@patch('django.core.cache.cache.get')
def test_suggestion_status_no_cache(mock_cache_get, api_client, dataset):
    mock_cache_get.return_value = None
    url = reverse('suggestion-status', kwargs={'dataset_id': dataset.id})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == "idle"
    assert response.data['progress'] == 0
