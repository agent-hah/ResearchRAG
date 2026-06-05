import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from literature.models import Literature, ProcessingStatus

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_rag_index_view_success(api_client, mocker):
    mock_thread = mocker.patch('rag.views.threading.Thread')
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.PENDING
    )
    
    url = reverse('rag-index')
    response = api_client.post(url, {'literature_id': literature.id}, format='json')
    
    assert response.status_code == 202
    assert mock_thread.call_count >= 1
    mock_thread.return_value.start.assert_called()

@pytest.mark.django_db
def test_rag_index_view_not_found(api_client):
    url = reverse('rag-index')
    response = api_client.post(url, {'literature_id': 9999}, format='json')
    assert response.status_code == 404

@pytest.mark.django_db
def test_rag_index_view_already_indexed(api_client):
    literature = Literature.objects.create(
        filename="dummy.pdf",
        file_path="dummy.pdf",
        file_size=1024,
        processing_status=ProcessingStatus.INDEXED
    )
    
    url = reverse('rag-index')
    response = api_client.post(url, {'literature_id': literature.id}, format='json')
    assert response.status_code == 200
    assert response.data['status'] == 'already_indexed'

@pytest.mark.django_db
def test_rag_search_view(api_client, mocker):
    mock_service = mocker.patch('rag.views.get_rag_service').return_value
    mock_service.search_literature.return_value = [{"score": 0.9}]
    
    url = reverse('rag-search')
    response = api_client.post(url, {'query': 'test'}, format='json')
    
    assert response.status_code == 200
    assert len(response.data['results']) == 1

@pytest.mark.django_db
def test_rag_stats_view(api_client, mocker):
    mock_service = mocker.patch('rag.views.get_rag_service').return_value
    mock_service.get_stats.return_value = {"total_indexed": 10}
    
    url = reverse('rag-stats')
    response = api_client.get(url)
    
    assert response.status_code == 200
    assert response.data['total_indexed'] == 10
