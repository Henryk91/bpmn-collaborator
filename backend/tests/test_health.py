"""Simple health check test."""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_root_endpoint(client):
    """Test the root endpoint returns 200."""
    response = client.get("/")
    assert response.status_code == 200
    # Root endpoint may return JSON or HTML depending on STATIC_DIR
    # In test mode, it should return JSON
    if response.headers.get("content-type", "").startswith("application/json"):
        data = response.json()
        assert "status" in data
        assert data["status"] == "running"

