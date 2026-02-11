import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

try:
    from app.services.ocr_service import extract_text, tesseract_cmd
    print(f"OCR Service Import Successful.")
    if tesseract_cmd:
        print(f"Tesseract Path: {tesseract_cmd}")
    else:
        print("Tesseract NOT found.")
        
except Exception as e:
    print(f"OCR Service Failed: {e}")
