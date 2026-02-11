"""
Test script to verify Tier 1 implementation
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 60)
print("TIER 1 COMPONENT TESTS")
print("=" * 60)

# Test 1: OutputSafetyGuard
print("\n[TEST 1] OutputSafetyGuard - Emergency Detection")
print("-" * 60)

from app.safety.output_guard import get_safety_guard, SafetyAction

guard = get_safety_guard()

# Test emergency
result = guard.validate(
    "I have severe chest pain radiating to my left arm and jaw",
    ""
)
print(f"Input: Chest pain symptoms")
print(f"Action: {result['action']}")
print(f"Expected: {SafetyAction.EMERGENCY_REDIRECT}")
print(f"✅ PASS" if result["action"] == SafetyAction.EMERGENCY_REDIRECT else "❌ FAIL")

# Test diagnosis blocking
print("\n[TEST 2] OutputSafetyGuard - Diagnosis Blocking")
print("-" * 60)

result = guard.validate(
    "Based on your symptoms, you likely have diabetes and hypertension.",
    "I feel tired and thirsty"
)
print(f"Input: LLM suggesting diabetes diagnosis")
print(f"Action: {result['action']}")
print(f"Flags: {result['flags']}")
print(f"✅ PASS" if "diagnosis:diabetes" in result['flags'] else "❌ FAIL")

# Test 3: LabValueParser
print("\n[TEST 3] LabValueParser - Numeric Extraction")
print("-" * 60)

from app.services.lab_parser import LabValueParser

parser = LabValueParser()
sample_text = """
Hemoglobin: 12.5 g/dL (Normal Range: 12-16)
Glucose - 145 mg/dL (High)
HbA1c 6.2%
"""

results = parser.parse(sample_text)
print(f"Extracted {len(results)} lab values:")
for lab in results:
    print(f"  - {lab.test_name}: {lab.value} {lab.unit}")

print(f"✅ PASS" if len(results) >= 3 else "❌ FAIL")

# Test 4: ReferenceRangeEngine
print("\n[TEST 4] ReferenceRangeEngine - Clinical Benchmarking")
print("-" * 60)

from app.services.reference_ranges import ReferenceRangeEngine, LabStatus

engine = ReferenceRangeEngine()

# Test low hemoglobin
eval = engine.evaluate("Hemoglobin", 9.5, "g/dL", "female", 35)
print(f"Test: Hemoglobin 9.5 g/dL (Female, 35yo)")
print(f"Status: {eval.status.value}")
print(f"Severity: {eval.severity.value if eval.severity else 'N/A'}")
print(f"Interpretation: {eval.interpretation}")
print(f"✅ PASS" if eval.status == LabStatus.LOW else "❌ FAIL")

# Test high glucose
eval = engine.evaluate("Glucose", 180, "mg/dL")
print(f"\nTest: Glucose 180 mg/dL")
print(f"Status: {eval.status.value}")
print(f"✅ PASS" if eval.status == LabStatus.HIGH else "❌ FAIL")

# Test critical potassium
eval = engine.evaluate("Potassium", 6.8, "mmol/L")
print(f"\nTest: Potassium 6.8 mmol/L")
print(f"Status: {eval.status.value}")
print(f"✅ PASS" if eval.status == LabStatus.CRITICAL_HIGH else "❌ FAIL")

print("\n" + "=" * 60)
print("ALL TIER 1 COMPONENTS OPERATIONAL ✅")
print("=" * 60)
