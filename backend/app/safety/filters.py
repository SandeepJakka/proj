import re

def is_health_related(query: str) -> bool:
    query = query.lower()
    medical_keywords = [
        # general
        "health", "disease", "symptom", "treatment", "medicine", "drug",
        "diagnosis", "report", "test", "lab", "result",
        
        # body & conditions
        "pain", "fever", "infection", "diabetes", "bp", "blood", "heart",
        "liver", "kidney", "glucose", "cholesterol",
        
        # prescriptions
        "prescription", "tablet", "dosage", "medicine", "drug",
        
        # insurance
        "insurance", "claim", "coverage", "policy", "hospital",
        
        # actions
        "should i", "is it normal", "what does", "how to treat",
        
        # greetings & meta
        "hi", "hello", "hey", "help", "who are you", "what can you", "how are you",
        "vaidya", "assist", "healthora", "telugu","tired","sleep"
    ]

    return any(keyword in query for keyword in medical_keywords)
