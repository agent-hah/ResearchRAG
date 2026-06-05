import pytest
from unittest.mock import MagicMock
from refinement.services import RefinementService, get_refinement_service

@pytest.fixture
def mock_genai_client(mocker):
    # Mock the entire genai client
    mock_client = MagicMock()
    mock_generate = MagicMock()
    # Create a dummy response object
    mock_response = MagicMock()
    mock_response.text = '{"type": "bar"}'
    mock_generate.return_value = mock_response
    mock_client.models.generate_content = mock_generate
    
    # Patch the genai.Client in refinement.services
    mocker.patch('refinement.services.genai.Client', return_value=mock_client)
    return mock_client

def test_get_refinement_service(mock_genai_client):
    service = get_refinement_service()
    assert isinstance(service, RefinementService)

def test_parse_refinement_command(mock_genai_client):
    service = RefinementService()
    current_config = {"type": "line", "title": "Old Title"}
    command = "change to bar chart"
    
    updates = service.parse_refinement_command(command, current_config)
    
    assert updates == {"type": "bar"}
    mock_genai_client.models.generate_content.assert_called_once()

def test_apply_refinement():
    service = RefinementService()
    current_config = {"type": "line", "title": "Old Title"}
    updates = {"type": "bar", "showLegend": False}
    
    new_config = service.apply_refinement(current_config, updates)
    
    assert new_config["type"] == "bar"
    assert new_config["title"] == "Old Title"
    assert new_config["showLegend"] is False

def test_suggest_refinements():
    service = RefinementService()
    suggestions = service.suggest_refinements('line', {'has_outliers': True})
    
    assert "Change to bar chart" in suggestions
    assert "Filter out outliers" in suggestions
