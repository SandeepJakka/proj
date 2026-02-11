import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

try:
    from app.services.ner_service import extract_entities
    print("NER Service Import Successful")
    
    text = "Patient has a severe headache and fever. Prescribed Ibuprofen."
    print(f"Testing NER on: '{text}'")
    
    entities = extract_entities(text)
    print("Extracted Entities:", entities)
    
except Exception as e:
    print(f"NER Service Failed: {e}")
