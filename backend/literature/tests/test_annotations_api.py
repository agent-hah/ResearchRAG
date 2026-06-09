import pytest
from rest_framework.test import APIClient
from literature.models import Literature, Annotation

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def literature(db):
    return Literature.objects.create(
        filename="test.pdf",
        file_path="/tmp/test.pdf",
        file_size=1024,
        page_count=10
    )

@pytest.mark.django_db
def test_create_annotation(api_client, literature):
    payload = {
        "literature_id": literature.id,
        "annotation_type": "highlight",
        "page_number": 1,
        "content": "Test annotation"
    }
    response = api_client.post("/api/v1/annotations/", payload, format="json")

    assert response.status_code == 201, response.data
    assert "literature_id" in response.data
    assert response.data["literature_id"] == literature.id

@pytest.mark.django_db
def test_create_annotation_with_highlighted_text(api_client, literature):
    payload = {
        "literature_id": literature.id,
        "annotation_type": "highlight",
        "page_number": 1,
        "highlighted_text": "some selected text from the PDF",
        "color": "purple",
    }
    response = api_client.post("/api/v1/annotations/", payload, format="json")

    assert response.status_code == 201, response.data
    assert response.data["highlighted_text"] == "some selected text from the PDF"
    assert response.data["color"] == "purple"

@pytest.mark.django_db
def test_create_annotation_with_rects(api_client, literature):
    payload = {
        "literature_id": literature.id,
        "annotation_type": "highlight",
        "page_number": 1,
        "rects": [
            {"x": 10, "y": 20, "width": 100, "height": 15},
            {"x": 10, "y": 40, "width": 50, "height": 15}
        ]
    }
    response = api_client.post("/api/v1/annotations/", payload, format="json")

    assert response.status_code == 201, response.data
    assert len(response.data["rects"]) == 2
    assert response.data["rects"][0]["width"] == 100

@pytest.mark.django_db
def test_patch_annotation(api_client, literature):
    """PATCH should update only the provided fields without requiring the full object."""
    annotation = Annotation.objects.create(
        literature=literature,
        annotation_type="highlight",
        page_number=1,
        content="original",
        color="yellow",
    )
    response = api_client.patch(
        f"/api/v1/annotations/{annotation.id}/",
        {"color": "red"},
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["color"] == "red"
    assert response.data["content"] == "original"  # unchanged
