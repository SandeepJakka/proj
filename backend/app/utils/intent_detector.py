import re

MEDICAL_REASONING_PATTERNS = [
    r"\b(symptom|symptoms)\b",
    r"\b(fatigue|tired|weak|dizzy)\b",
    r"\b(pain|ache|headache|chest pain)\b",
    r"\b(blood report|lab report|test result)\b",
    r"\b(low|high)\b.*\b(hemoglobin|sugar|bp|cholesterol)\b",
    r"\b(x-ray|mri|ct scan|scan)\b"
]

def needs_medical_reasoning(text: str) -> bool:
    text = text.lower()
    for pattern in MEDICAL_REASONING_PATTERNS:
        if re.search(pattern, text):
            return True
    return False
