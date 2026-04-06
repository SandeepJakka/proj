import requests
import json
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

BASE_URL = "http://localhost:8000"

def get_test_token():
    # This is a bit of a hack to get a token without needing a password
    # We'll use the auth_service directly if we can, but since we are running 
    # as a separate script, we might just assume the user exists and has ID 1.
    import sys
    sys.path.append(os.getcwd())
    from app.services.auth_service import create_access_token
    
    # Create a token for user ID 1
    token = create_access_token({"sub": "1"})
    return token

def test_price_check(token, medicines):
    print(f"\n--- Testing Price Check: {medicines} ---")
    url = f"{BASE_URL}/api/medicines/price-check"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"medicines": medicines, "language": "english"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

def test_interactions(token, medicines):
    print(f"\n--- Testing Interactions: {medicines} ---")
    url = f"{BASE_URL}/api/medicines/interactions"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"medicines": medicines, "language": "english"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    token = get_test_token()
    
    test_cases = [
        ["paracetamol"],
        ["ibuprofen"],
        ["metformin"],
        ["amoxicillin"]
    ]
    
    # Test price check for each
    for tc in test_cases:
        test_price_check(token, tc)
        
    # Test interactions for a pair
    test_interactions(token, ["paracetamol", "ibuprofen"])
    
    # Test empty input
    test_price_check(token, [])
    test_interactions(token, ["paracetamol"]) # Should trigger "at least 2" logic
