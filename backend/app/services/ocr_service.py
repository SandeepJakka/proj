import pdfplumber
import os
import sys
from PIL import Image, ImageOps, ImageFilter

try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
    ocr_engine = PaddleOCR(use_angle_cls=True, lang='en')
except ImportError:
    PADDLE_AVAILABLE = False
    import pytesseract
    import shutil
    
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.getlogin()),
        r"D:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Tesseract-OCR\tesseract.exe"
    ]
    
    tesseract_cmd = None
    if shutil.which("tesseract"):
        tesseract_cmd = shutil.which("tesseract")
    else:
        for path in possible_paths:
            if os.path.exists(path):
                tesseract_cmd = path
                break
    
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        print(f"✅ Tesseract found at: {tesseract_cmd}")
    else:
        print("⚠️ Warning: No OCR engine available")

def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Applies preprocessing to improve OCR accuracy:
    1. Grayscale conversion
    2. Rescale (increase size)
    3. Sharpness/Contrast enhancement
    """
    # 1. Convert to grayscale
    img = img.convert('L')
    
    # 2. Rescale to improve small text detection (300 DPI equivalent)
    width, height = img.size
    img = img.resize((width * 2, height * 2), Image.Resampling.LANCZOS)
    
    # 3. Increase Contrast (Thresholding)
    # Using ImageOps to auto-contrast
    img = ImageOps.autocontrast(img)
    
    # 4. Sharpen
    img = img.filter(ImageFilter.SHARPEN)
    
    return img


def extract_text(path: str, ext: str) -> str:
    path = os.path.abspath(path)
    if ext == "pdf":
        text = []
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text.append(page.extract_text() or "")
            return "\n".join(text)
        except Exception as e:
            print(f"PDF OCR failed: {e}")
            return ""

    if ext in ["png", "jpg", "jpeg"]:
        try:
            if PADDLE_AVAILABLE:
                # Use PaddleOCR
                result = ocr_engine.ocr(path, cls=True)
                if result and result[0]:
                    text_lines = [line[1][0] for line in result[0]]
                    return "\n".join(text_lines)
                return ""
            else:
                # Fallback to Tesseract
                if not tesseract_cmd:
                    return "Error: No OCR engine available"
                
                img = Image.open(path)
                img = preprocess_image(img)
                custom_config = r'--oem 3 --psm 3'
                text = pytesseract.image_to_string(img, config=custom_config)
                
                if len(text.strip()) < 50:
                    print(f"Warning: Low text yield from OCR ({len(text)} chars)")
                    
                return text
        except Exception as e:
            print(f"Image OCR failed: {e}")
            return ""

    raise ValueError(f"Unsupported file type: {ext}")
