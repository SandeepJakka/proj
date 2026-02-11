import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

from app.services.medical_reasoning_service import run_medical_reasoning

async def test_medical_inference():
    print("Testing Medical Inference locally...")
    
    symptoms = ["severe headache", "sensitivity to light", "nausea"]
    age = 30
    gender = "Female"
    
    print(f"Input: {symptoms}, Age: {age}, Gender: {gender}")
    
    try:
        result = await run_medical_reasoning(symptoms, age, gender)
        print("\n--- Result ---")
        print(result)
        
        if "findings" in result and "explanation" in result:
            print("\n✅ Test Passed: Structure is correct.")
        else:
            print("\n❌ Test Failed: Invalid structure.")
            
    except Exception as e:
        print(f"\n❌ Test Failed with error: {e}")

if __name__ == "__main__":
    asyncio.run(test_medical_inference())
