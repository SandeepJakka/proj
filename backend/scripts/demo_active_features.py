"""
Quick demonstration of active safety features
"""

import requests
import json

API_BASE = "http://127.0.0.1:8000/api"

# You'll need a valid token - replace this
TOKEN = "your_jwt_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

print("=" * 70)
print("TESTING ACTIVE SAFETY FEATURES")
print("=" * 70)

# Test 1: Emergency Detection
print("\n[TEST 1] Emergency Symptom Detection")
print("-" * 70)
print("Sending: 'I have severe chest pain and difficulty breathing'")

try:
    response = requests.post(
        f"{API_BASE}/chat/",
        headers=headers,
        json={"message": "I have severe chest pain and difficulty breathing"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Response received:")
        print(f"Is Medical: {data.get('is_medical')}")
        print(f"Response Preview: {data.get('response')[:200]}...")
        
        if "EMERGENCY" in data.get('response', '').upper():
            print("\n🚨 Emergency redirect WORKING!")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nNote: Make sure:")
    print("  1. Backend is running (uvicorn app.main:app --reload)")
    print("  2. You have a valid JWT token")
    print("  3. Replace TOKEN variable above with your actual token")

# Test 2: Normal health query (should work fine)
print("\n\n[TEST 2] Normal Health Question")
print("-" * 70)
print("Sending: 'What foods are good for heart health?'")

try:
    response = requests.post(
        f"{API_BASE}/chat/",
        headers=headers,
        json={"message": "What foods are good for heart health?"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Response received:")
        print(f"Response Preview: {data.get('response')[:200]}...")
    else:
        print(f"❌ Error: {response.status_code}")
except Exception as e:
    print(f"❌ Failed: {e}")

print("\n" + "=" * 70)
print("To get your JWT token:")
print("  1. Open browser dev tools (F12)")
print("  2. Go to Application/Storage > Local Storage")
print("  3. Copy the 'token' value")
print("=" * 70)
