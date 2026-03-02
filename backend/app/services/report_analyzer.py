import os
import json
import io
import re
import fitz  # PyMuPDF
import base64
from PIL import Image
from google import genai
from google.genai import types
from groq import Groq

from app.config import settings
from app.services.llm_service import explain_report_with_llm
import logging
import traceback

from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)

ocr = None
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
except Exception as e:
    logger.warning(f"PaddleOCR init failed: {e}")

# Initialize Gemini & Groq
client = genai.Client(api_key=settings.GEMINI_API_KEY)
groq_client = Groq(api_key=settings.GROQ_API_KEY)


SYSTEM_PROMPT = """You are a medical report analyzer for Healthora.
Analyze this medical document/image carefully.

First identify document type:
- Blood Test / Lab Report
- Prescription / Medicine  
- MRI / X-Ray / CT Scan / Radiology Report
- Doctor's Note / Discharge Summary
- Other Medical Document

Then extract and analyze based on type:

For Blood Test / Lab Report / ANY Medical Test Result:
This includes: CBC, metabolic panel, malaria test, urine test, thyroid,
liver function, kidney function, COVID test, culture reports, parasite
tests, dengue, typhoid — ANY lab result.

- For NUMERICAL results: extract name, value, unit, reference range,
  mark as NORMAL, HIGH, or LOW
- For QUALITATIVE results (Positive/Negative/Not seen/Seen/Detected):
  extract test name, result value, interpretation
  Mark status as: NORMAL (if Negative/Not seen/Not detected) or
  ABNORMAL (if Positive/Detected/Seen/Present)
- ALWAYS populate the parameters array even for qualitative tests.
  Example for malaria:
  {
    "name": "Malaria Parasite (Thick Smear)",
    "value": "Trophozoites of P.Vivax seen",
    "unit": "",
    "reference_range": "Not seen",
    "status": "ABNORMAL",
    "interpretation": "Active P.Vivax malaria infection detected"
  }
- Do NOT skip any test item — extract ALL rows from the report.

For Prescription / Medicine:
- List every medicine: name, dosage, frequency, duration
- What each medicine is typically used for
- Important warnings

For MRI / X-Ray / CT Scan:
- Extract radiologist findings
- Explain what was examined
- Key observations in simple terms

Return ONLY valid JSON in this exact format:
{
  "document_type": "...",
  "extraction_successful": true,
  "raw_findings": "complete findings text",
  "structured_data": {
    "parameters": [],
    "medicines": [],
    "findings": ""
  },
  "critical_alerts": []
}"""

def preprocess_document(file_bytes: bytes, filename: str) -> list[Image.Image]:
    """
    Converts a document (PDF or Image) into a list of PIL Images, resizing if necessary.
    Converts max 3 pages for PDFs.
    """
    images = []
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    if ext == 'pdf':
        try:
            # Open PDF from bytes
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(min(3, len(doc))):
                page = doc.load_page(page_num)
                # Render to pixmap with reasonable DPI
                pix = page.get_pixmap(dpi=150)
                # Convert to PIL Image
                mode = "RGBA" if pix.alpha else "RGB"
                img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                if mode == "RGBA":
                    img = img.convert("RGB")
                images.append(img)
            doc.close()
        except Exception as e:
            print(f"Error processing PDF: {e}")
    else:
        # Assume Image
        try:
            img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
            images.append(img)
        except Exception as e:
            print(f"Error processing image: {e}")
            
    # Resize images to save tokens if width > 1500px
    processed_images = []
    for img in images:
        if img.width > 1500:
            scale = 1500 / img.width
            new_height = int(img.height * scale)
            img = img.resize((1500, new_height), Image.Resampling.LANCZOS)
        processed_images.append(img)
        
    return processed_images


def get_base64_from_images(images: list[Image.Image]) -> tuple[str, str]:
    if not images:
        return "", "image/jpeg"
    
    if len(images) == 1:
        img = images[0]
    else:
        # Stitch images vertically for seamless text extraction on PDFs
        widths, heights = zip(*(i.size for i in images))
        total_height = sum(heights)
        max_width = max(widths)
        img = Image.new("RGB", (max_width, total_height))
        y_offset = 0
        for i in images:
            img.paste(i, (0, y_offset))
            y_offset += i.size[1]
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8"), "image/jpeg"


def analyze_image_with_groq(image_base64: str, media_type: str) -> dict:
    """Use Groq Llama 4 Scout for medical image analysis"""
    try:
        response = groq_client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": SYSTEM_PROMPT
                        }
                    ]
                }
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        response_text = response.choices[0].message.content
        # Parse JSON from response robustly
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            return {
                "document_type": "Medical Document",
                "extraction_successful": True,
                "raw_findings": response_text,
                "structured_data": {"parameters": [], "medicines": [], "findings": response_text},
                "critical_alerts": []
            }
    except Exception as e:
        logger.error(f"Groq vision error FULL DETAILS: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


def analyze_image_with_gemini(image_base64: str, media_type: str) -> dict:
    """Fallback: Use Gemini for medical image analysis"""
    try:
        image_bytes = base64.b64decode(image_base64)
        
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type=media_type
                        ),
                        types.Part.from_text(text=SYSTEM_PROMPT)
                    ]
                )
            ]
        )
        
        gemini_text = response.text
        
        # Strip markdown formatting if Gemini added it
        if "```json" in gemini_text:
            gemini_text = gemini_text.split("```json")[1].split("```")[0].strip()
        elif "```" in gemini_text:
            gemini_text = gemini_text.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(gemini_text)
        except json.JSONDecodeError:
            print(f"Failed to parse Gemini output as JSON: {gemini_text}")
            return {
                "document_type": "Unknown Document",
                "extraction_successful": False,
                "raw_findings": gemini_text,
                "structured_data": {"parameters": [], "medicines": [], "findings": ""},
                "critical_alerts": []
            }

    except Exception as e:
        logger.error(f"Gemini API error FULL DETAILS: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


def analyze_with_paddleocr(image_path: str) -> dict:
    if not ocr: return None
    try:
        result = ocr.ocr(image_path, cls=True)
        extracted_text = ""
        if result and result[0]:
            for line in result[0]:
                if line and isinstance(line, list) and len(line) > 1:
                    extracted_text += line[1][0] + " "
        
        if len(extracted_text.strip()) < 20:
            return None
            
        return {
            "document_type": "Medical Document",
            "extraction_successful": True,
            "raw_findings": extracted_text.strip(),
            "structured_data": {
                "parameters": [],
                "medicines": [],
                "findings": extracted_text.strip()
            },
            "critical_alerts": []
        }
    except Exception as e:
        logger.error(f"PaddleOCR fallback error: {str(e)}")
        return None


async def analyze_report(file_bytes: bytes, filename: str, language: str = "english") -> dict:
    """
    Main pipeline: Preprocess -> Primary Groq Extract (with Gemini Fallback) -> Groq LLM Explain
    """
    logger.info(f"Using Groq Vision model: {settings.GROQ_VISION_MODEL} as primary")
    logger.info(f"Using Gemini model: {settings.GEMINI_MODEL} as fallback")
    logger.info(f"File received: {filename}")
    
    try:
        # Step 1: Preprocess
        images = preprocess_document(file_bytes, filename)
        if not images:
            return {
                "success": False,
                "error": "Failed to extract images from the document. Please ensure it is a valid PDF, JPG, or PNG."
            }
        
        # Stitch and obtain Base64 Data URL Representation    
        image_base64, media_type = get_base64_from_images(images)

        # Step 2: Groq Vision Analysis
        logger.info("Executing Primary Vision Analysis via Groq...")
        result = analyze_image_with_groq(image_base64, media_type)
        model_used = f"Groq {settings.GROQ_VISION_MODEL}"
        
        # Step 2b: Fallback Gemini Vision Analysis
        if result is None:
            logger.info("Groq vision failed, trying Gemini fallback...")
            result = analyze_image_with_gemini(image_base64, media_type)
            model_used = f"Gemini {settings.GEMINI_MODEL}"

        # Step 2c: Fallback PaddleOCR
        if result is None:
            logger.info("Gemini vision failed, trying PaddleOCR fallback...")
            model_used = "PaddleOCR Fallback"
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
                tf.write(base64.b64decode(image_base64))
                temp_path = tf.name
            
            try:
                result = analyze_with_paddleocr(temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            
        if result is None:
            return {"success": False, "error": "Analysis service unavailable. Please try again."}

        # Step 3: LLM Explanation with Groq
        logger.info(f"Generating extraction using: {model_used}. Sending explanation to language model...")
        explanation = await explain_report_with_llm(json.dumps(result), language=language)

        # Step 4: Return Structured Response
        return {
            "success": True,
            "document_type": result.get("document_type", "Unknown Document"),
            "gemini_extraction": result,
            "explanation": explanation,
            "critical_alerts": result.get("critical_alerts", []),
            "language_detected": language,
            "disclaimer": "This is for informational purposes only. Please consult a doctor."
        }

    except Exception as e:
        logger.error(f"Report analysis failed FULL DETAILS: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"Report analysis failed: {str(e)}"
        }
