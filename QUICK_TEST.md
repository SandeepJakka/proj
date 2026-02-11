# QUICK START - Test Without Tesseract

## You can test the system RIGHT NOW without installing Tesseract!

### Step 1: Upload Text Report (No OCR Needed)

1. **Go to**: http://localhost:5173/reports
2. **Click**: "Upload New Report"
3. **Select**: `d:\Healthora\proj\test_lab_report.txt`
4. **Watch**: Lab values appear with color-coded badges!

**This will work immediately because text files don't need OCR.**

---

### Step 2: Install Tesseract (For Image/PDF Support)

**Download**: https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe

**Install Steps**:
1. Run the downloaded `.exe`
2. Use default path: `C:\Program Files\Tesseract-OCR`
3. Click through installation
4. **Important**: Restart your backend server after install

**Restart Backend**:
```powershell
# Stop current server (Ctrl+C in backend terminal)
# Then restart:
cd d:\Healthora\proj\backend
uvicorn app.main:app --reload
```

---

### Why Your PNG Upload Failed

**Without Tesseract:**
```
PNG Upload → ❌ OCR Fails → Empty Text → Random AI Response
```

**With Tesseract:**
```
PNG Upload → ✅ OCR Succeeds → Lab Values Extracted → Structured Display
```

---

### Alternative: Convert PNG to Text

If you want to test with your PNG report before installing Tesseract:

**Option A: Use Online OCR**
1. Go to: https://www.onlineocr.net/
2. Upload your PNG
3. Download as TXT
4. Upload TXT to Healthora

**Option B: Manually Type Key Values**
1. Open Notepad
2. Type the lab values from your PNG:
   ```
   Glucose: 120 mg/dL
   Hemoglobin: 14.5 g/dL
   Cholesterol: 195 mg/dL
   ```
3. Save as `.txt`
4. Upload to Healthora

---

## What You'll See (With Text File)

```
✅ Upload Successful
📊 Structured Lab Values
12 tests analyzed

┌────────────────────────────┐
│ Glucose        🟠 HIGH     │
│ 145 mg/dL                  │
│ Moderate above normal      │
│ by 45 mg/dL                │
│ Normal: 70-99 mg/dL        │
└────────────────────────────┘

┌────────────────────────────┐
│ Hemoglobin A1c 🟠 HIGH     │
│ 6.2 %                      │
│ Mild above normal          │
│ Normal: 0-5.6 %            │
└────────────────────────────┘

... and 10 more cards
```

---

## Priority Order

1. ✅ **TEST NOW**: Upload text file to verify system works
2. ⏳ **INSTALL LATER**: Tesseract (for image support)
3. 🎯 **THEN TEST**: PNG/PDF uploads

**The deterministic analysis works perfectly - you just need to get the text in!**
