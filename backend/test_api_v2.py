import sys
import os
import json

# Add current dir to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.db.deps import get_current_user
from app.db import models

# 1. Setup Mock User
mock_user = models.User(id=1, email="test@example.com", full_name="Test User")

def override_get_current_user():
    return mock_user

# 2. Assign Dependency Overrides
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_endpoint(endpoint_url, payload, description):
    print(f"\n--- {description} ---")
    try:
        response = client.post(endpoint_url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error in {description}: {str(e)}")

if __name__ == "__main__":
    test_cases = [
        ["paracetamol"],
        ["ibuprofen"],
        ["metformin"],
        ["amoxicillin"]
    ]
    
    # Test Price Check
    for tc in test_cases:
        test_endpoint("/api/medicines/price-check", {"medicines": tc}, f"Price Check: {tc}")
        
    # Test Interactions
    test_endpoint("/api/medicines/interactions", {"medicines": ["paracetamol", "ibuprofen"]}, "Interactions: Paracetamol + Ibuprofen")
    
    # Test Edge Cases
    test_endpoint("/api/medicines/price-check", {"medicines": []}, "Price Check: Empty List")
    test_endpoint("/api/medicines/interactions", {"medicines": ["paracetamol"]}, "Interactions: Single medicine")
