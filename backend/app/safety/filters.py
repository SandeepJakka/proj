import re

NON_HEALTH_PATTERNS = [
    r"\b(stock|crypto|bitcoin|politics|movie|song|code|programming)\b",
    r"\b(diagnose|diagnosis|dosage|how much medicine)\b",
    r"\b(emergency|call ambulance|urgent help)\b"
]

def is_health_related(text: str) -> bool:
    text = text.lower()
    for pattern in NON_HEALTH_PATTERNS:
        if re.search(pattern, text):
            return False
    return True
