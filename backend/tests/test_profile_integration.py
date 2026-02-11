import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_profile_flow():
    print("Testing Health Profile Integration...")
    
    # 1. Update Profile
    print("\n1. Updating Profile for User 1...")
    profile_data = {
        "age": 45,
        "gender": "Male",
        "known_conditions": "Asthma, Seasonal Allergies",
        "activity_level": "Moderate"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/profile/", json=profile_data)
        if resp.status_code == 200:
            print("✅ Profile Updated:", resp.json())
        else:
            print(f"❌ Profile Update Failed: {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    # 2. Get Profile to verify
    print("\n2. Verifying Profile...")
    resp = requests.get(f"{BASE_URL}/profile/")
    print("Fetched Profile:", resp.json())
    
    # 3. Test Medical Reasoning (Implicit Context)
    print("\n3. Testing Medical Reasoning (Implicit Context)...")
    payload = {
        "symptoms": ["wheezing after exercise"]
    }
    # We expect the AI to likely mention asthma possibility due to context
    try:
        resp = requests.post(f"{BASE_URL}/medical/reason", json=payload)
        result = resp.json()
        print("AI Response:", json.dumps(result, indent=2))
        
        explanation = result.get("explanation", "").lower()
        if "asthma" in explanation or "respiratory" in explanation:
            print("✅ Context Usage: AI likely used the profile context (Asthma/Wheezing).")
        else:
            print("⚠️ Context Usage: Unclear if profile was used.")
            
    except Exception as e:
        print(f"❌ Reasoning Failed: {e}")

if __name__ == "__main__":
    test_profile_flow()
