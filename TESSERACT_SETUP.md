# Tesseract-OCR Installation Guide (Windows)

## Problem
```
Warning: Tesseract-OCR not found in common paths. Image OCR may fail.
```

This means Tesseract is not installed, so image uploads can't extract text properly.

---

## Solution: Install Tesseract-OCR

### Option 1: Quick Install (Recommended)

**Step 1: Download Installer**

Download the Windows installer from:
https://github.com/UB-Mannheim/tesseract/releases

**Get this file:**
`tesseract-ocr-w64-setup-5.3.3.20231005.exe` (or latest version)

Direct link:
https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe

**Step 2: Run Installer**

1. Run the downloaded `.exe` file
2. **IMPORTANT**: Install to default path: `C:\Program Files\Tesseract-OCR`
3. Click "Next" through all steps
4. Finish installation

**Step 3: Verify Installation**

Open **new** PowerShell and run:
```powershell
tesseract --version
```

Expected output:
```
tesseract v5.3.3.20231005
```

**Step 4: Restart Backend**

Your backend needs to restart to detect Tesseract:

1. In the backend terminal, press `Ctrl+C`
2. Restart: `uvicorn app.main:app --reload`

You should NO LONGER see the Tesseract warning.

---

### Option 2: Custom Install Path

If you installed to a different location (e.g., `C:\Tesseract-OCR`):

1. Open: `d:\Healthora\proj\backend\app\services\ocr_service.py`
2. Find line ~10: `TESSERACT_PATHS = [...]`
3. Add your custom path to the list:
   ```python
   TESSERACT_PATHS = [
       r"C:\Program Files\Tesseract-OCR\tesseract.exe",
       r"C:\Tesseract-OCR\tesseract.exe",  # Add your path
       # ... other paths
   ]
   ```
4. Restart backend

---

## Testing OCR

### Test 1: Text File (Works Without Tesseract)

Upload the provided test file to verify basic parsing:
```
d:\Healthora\proj\test_lab_report.txt
```

This should work even without Tesseract since it's a text file.

### Test 2: Image File (Requires Tesseract)

After installing Tesseract, create a simple test image:

1. Open Notepad
2. Type some lab values:
   ```
   Glucose: 120 mg/dL
   Hemoglobin: 14.5 g/dL
   ```
3. Take a screenshot
4. Save as PNG
5. Upload to Healthora

---

## Why Your PNG Upload Failed

**Without Tesseract:**
- Image upload → OCR fails → Empty/garbage text extracted
- Parser finds no lab values → Shows generic response
- Backend logs show: "Warning: Tesseract-OCR not found"

**With Tesseract:**
- Image upload → OCR succeeds → Proper text extracted
- Parser finds lab values → Shows structured cards with colors
- No warnings in backend

---

## Alternative: Use Text Files for Now

While you install Tesseract, you can test with text files:

1. Copy your medical report text
2. Save as `.txt` file
3. Upload to Healthora

The system works perfectly with text files - only image/PDF OCR needs Tesseract.

---

## Quick Check

Run this in PowerShell to see if Tesseract is already installed:

```powershell
# Check Program Files
Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe"

# Check alternative location
Test-Path "C:\Tesseract-OCR\tesseract.exe"
```

If either shows `True`, Tesseract is already installed! You just need to restart the backend.

---

## Expected Behavior After Install

### Backend Terminal:
```
INFO:     Will watch for changes in these directories: ['d:\\Healthora\\proj\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
✅ Tesseract found at: C:\Program Files\Tesseract-OCR\tesseract.exe
```

### When Uploading Image:
```
INFO: Extracting text from image using Tesseract...
INFO: Extracted 523 characters
INFO: Found 8 lab values
INFO: Benchmarked against clinical ranges
```

### In UI:
```
📊 Structured Lab Values
8 tests analyzed

[Color-coded cards with actual values]
```

---

## Still Having Issues?

### Issue: "Tesseract found but OCR still fails"

**Solution**: Install Visual C++ Redistributable
https://aka.ms/vs/17/release/vc_redist.x64.exe

### Issue: "OCR works but extracts garbage"

**Causes**:
- Low image quality
- Handwritten text (Tesseract works best with printed text)
- Rotated image

**Solutions**:
- Use higher quality image
- Use text file or PDF with selectable text
- Rotate image to be upright

### Issue: "Still shows random answers"

**Debug**:
1. Check backend logs for extracted text
2. Look for: `Extracted text: ...`
3. If text looks wrong → Image quality issue
4. If text looks right → Parser issue (let me know)

---

## Next Steps

1. **Install Tesseract** from link above
2. **Restart backend** (Ctrl+C, then restart)
3. **Test with text file** first (`test_lab_report.txt`)
4. **Then test with image** after confirming Tesseract works

Let me know if you see any errors during installation!
