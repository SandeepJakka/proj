import pdfplumber
import pytesseract
import os
import sys
import shutil
from PIL import Image, ImageOps, ImageFilter

# Attempt to locate Tesseract binary on Windows
possible_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.getlogin()),
    r"D:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Tesseract-OCR\tesseract.exe"
]

tesseract_cmd = None
# Check system path first
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
    print("⚠️ Warning: Tesseract-OCR not found in common paths. Image OCR may fail.")
    print("Please install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")

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
        if not tesseract_cmd and not shutil.which("tesseract"):
             return "Error: Tesseract-OCR is not installed or not found on this system."
        
        try:
            img = Image.open(path)
            
            # Apply Preprocessing
            img = preprocess_image(img)
            
            # Using PSM 3 (Fully automatic page segmentation)
            custom_config = r'--oem 3 --psm 3'
            
            text = pytesseract.image_to_string(img, config=custom_config)
            
            # Optional: Log for debugging if text is very short
            if len(text.strip()) < 50:
                print(f"Warning: Low text yield from OCR ({len(text)} chars). Preprocessing might need tuning.")
                
            return text
        except Exception as e:
            print(f"Image OCR failed: {e}")
            return ""

    raise ValueError(f"Unsupported file type: {ext}")
