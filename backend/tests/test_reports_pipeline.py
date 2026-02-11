import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

def test_pipeline():
    print("Testing Reports Pipeline Components...")

    # 1. Test NER
    try:
        from app.services.ner_service import extract_entities
        text = "Patient shows signs of hypertension and high cholesterol. Prescribed Lipitor."
        entities = extract_entities(text)
        print(f"✅ NER Success: {entities.keys()}")
    except Exception as e:
        print(f"❌ NER Failed: {e}")

    # 2. Test Report Summary
    try:
        from app.services.report_summary_service import build_report_summary
        summary = build_report_summary(text, entities)
        print(f"✅ Summary Success: {len(summary)} chars")
    except Exception as e:
        print(f"❌ Summary Failed: {e}")

    # 3. Test OCR Import
    try:
        from app.services.ocr_service import extract_text
        print(f"✅ OCR Service Import Success")
    except Exception as e:
        print(f"❌ OCR Service Import Failed: {e}")

    # 4. Test Models Import
    try:
        from app.db.models_reports import Report, ReportExtract
        print(f"✅ DB Models Import Success")
    except Exception as e:
        print(f"❌ DB Models Import Failed: {e}")

if __name__ == "__main__":
    test_pipeline()
