import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_lifestyle():
    print("Testing Lifestyle Intelligence...")
    
    # 1. Set specific profile for testing
    print("\n1. Setting Profile (Vegetarian, Asthma)...")
    profile_data = {
        "age": 30,
        "gender": "Female",
        "dietary_preferences": "Vegetarian",
        "known_conditions": "Asthma",
        "activity_level": "Light"
    }
    requests.put(f"{BASE_URL}/profile/", json=profile_data)
    
    # 2. Test Diet Plan
    print("\n2. Generating Diet Plan (Goal: Immunity)...")
    try:
        resp = requests.post(f"{BASE_URL}/lifestyle/diet", json={"goal": "Boost Immunity"})
        if resp.status_code == 200:
            plan = resp.json()["markdown_plan"]
            print("✅ Diet Plan Generated (Length: {} chars)".format(len(plan)))
            if "meat" not in plan.lower() and ("vegetable" in plan.lower() or "plant" in plan.lower()):
                print("✅ Vegetarian constraints likely respected.")
            else:
                print("⚠️ Check if vegetarian constraints were respected.")
            # print(plan[:500] + "...")
        else:
            print(f"❌ Diet Plan Failed: {resp.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # 3. Test Workout Plan
    print("\n3. Generating Workout Plan (Goal: Cardio)...")
    try:
        resp = requests.post(f"{BASE_URL}/lifestyle/workout", json={"goal": "Improve Cardio"})
        if resp.status_code == 200:
            plan = resp.json()["markdown_plan"]
            print("✅ Workout Plan Generated (Length: {} chars)".format(len(plan)))
            if "asthma" in plan.lower() or "breathe" in plan.lower() or "warm up" in plan.lower():
                print("✅ Safety (Asthma) likely considered.")
            else:
                print("⚠️ Check if asthma safety was considered.")
            # print(plan[:500] + "...")
        else:
            print(f"❌ Workout Plan Failed: {resp.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_lifestyle()
