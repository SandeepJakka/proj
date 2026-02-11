import requests

def test_registration():
    url = "http://127.0.0.1:8000/api/auth/register"
    data = {
        "email": "test_fixed@example.com",
        "password": "securepassword123"
    }
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_registration()
