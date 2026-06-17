import pytest
from rest_framework.test import APIClient
from django.urls import reverse

@pytest.fixture
def api_client():
    return APIClient()

def test_refine_view_missing_command(api_client):
    url = reverse('refine')
    response = api_client.post(url, {'current_config': {}}, format='json')
    assert response.status_code == 400
    assert 'error' in response.data

def test_refine_view_success(api_client, mocker):
    mock_service = mocker.patch('refinement.views.get_refinement_service').return_value
    mock_service.parse_refinement_command.return_value = {'type': 'bar'}
    mock_service.apply_refinement.return_value = {'type': 'bar', 'title': 'Test'}
    
    url = reverse('refine')
    response = api_client.post(url, {'command': 'test', 'current_config': {}}, format='json')
    
    assert response.status_code == 200
    assert response.data['updates'] == {'type': 'bar'}

def test_refine_view_exception(api_client, mocker):
    mock_service = mocker.patch('refinement.views.get_refinement_service').return_value
    mock_service.parse_refinement_command.side_effect = Exception("Test Error")
    
    url = reverse('refine')
    response = api_client.post(url, {'command': 'test', 'current_config': {}}, format='json')
    assert response.status_code == 500
    assert response.data['error'] == "An internal error occurred."

def test_suggestions_view_success(api_client, mocker):
    mock_service = mocker.patch('refinement.views.get_refinement_service').return_value
    mock_service.suggest_refinements.return_value = ["Do this", "Do that"]
    
    url = reverse('suggestions')
    response = api_client.post(url, {'chart_type': 'bar', 'data_summary': {}}, format='json')
    
    assert response.status_code == 200
    assert response.data['suggestions'] == ["Do this", "Do that"]

def test_suggestions_view_exception(api_client, mocker):
    mock_service = mocker.patch('refinement.views.get_refinement_service').return_value
    mock_service.suggest_refinements.side_effect = Exception("Test Error")
    
    url = reverse('suggestions')
    response = api_client.post(url, {'chart_type': 'bar', 'data_summary': {}}, format='json')
    
    assert response.status_code == 500
    assert response.data['error'] == "An internal error occurred."
