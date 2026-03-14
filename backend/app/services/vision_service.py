import base64
from app.config import settings
from PIL import Image
import io

async def analyze_medical_image(image_path: str, image_type: str = "X-ray") -> dict:
    """
    Analyze medical images (X-rays, CT scans, MRIs) using text-based analysis
    
    Args:
        image_path: Path to the image file
        image_type: Type of medical image (X-ray, CT, MRI, Ultrasound)
    
    Returns:
        dict with findings, interpretation, and recommendations
    """
    
    try:
        # Use Groq text model to provide general X-ray guidance
        from app.services.llm_service import medical_llm_response
        
        analysis_prompt = f"""You are an expert radiologist. A patient has uploaded a {image_type} image for preliminary analysis.

Provide a clean, structured educational guide:

## Image Quality Assessment
[What to check for proper {image_type} quality]

## Anatomical Features
[Key structures visible in {image_type}]

## Common Findings
[Typical abnormalities in {image_type}]:
- Finding 1
- Finding 2
- Finding 3

## Warning Signs
[Critical indicators requiring immediate medical attention]:
- Red flag 1
- Red flag 2

## Recommendations
1. Consult a qualified radiologist for accurate diagnosis
2. Bring this image to your healthcare provider
3. Discuss any symptoms you're experiencing

Keep it concise, clear, and well-formatted. Use bullet points and numbered lists."""
        
        analysis_text = await medical_llm_response([{"role": "user", "content": analysis_prompt}])
        
        confidence = "educational"
        
        return {
            "success": True,
            "analysis": analysis_text,
            "confidence": confidence,
            "model": "Llama-3.3-70B (Educational Guide)",
            "disclaimer": "⚠️ This is educational guidance about X-ray interpretation. Your actual image must be reviewed by a qualified radiologist for accurate diagnosis. Please consult a healthcare professional."
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "analysis": "Failed to generate analysis. Please consult a healthcare professional directly."
        }


async def analyze_prescription_image(
    file_bytes: bytes,
    filename: str
) -> dict:
    """
    Use Groq Llama 4 Scout vision to extract medicines
    from prescription image.
    Returns structured list of medicines.
    """
    import base64
    import json
    from groq import Groq
    from app.config import settings

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        b64 = base64.b64encode(file_bytes).decode('utf-8')
        ext = filename.split('.')[-1].lower() \
            if '.' in filename else 'jpg'
        if ext in ['jpg', 'jpeg']:
            media_type = 'image/jpeg'
        elif ext == 'png':
            media_type = 'image/png'
        elif ext == 'pdf':
            media_type = 'application/pdf'
        else:
            media_type = 'image/jpeg'

        prompt = """You are a medical prescription reader.
Extract all medicines from this prescription image.

Return ONLY a valid JSON object, no other text:
{
  "medicines": [
    {
      "name": "Medicine name exactly as written",
      "dosage": "strength like 500mg or 10mg if visible",
      "instructions": "instructions like after food if visible",
      "duration": "number of days if mentioned"
    }
  ],
  "doctor_name": "doctor name if visible or null",
  "date": "prescription date if visible or null",
  "raw_text": "one line summary of what you read"
}

Rules:
- Extract ALL medicines listed, even if partially visible
- If dosage not visible, set to null
- If instructions not visible, set to null
- If you cannot read the image at all, return:
  {"medicines": [], "error": "Cannot read prescription clearly"}
- Return ONLY the JSON, no markdown, no explanation"""

        response = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{b64}"
                        }
                    },
                    {"type": "text", "text": prompt}
                ]
            }],
            max_tokens=1000,
            temperature=0.1
        )

        text = response.choices[0].message.content.strip()

        # Clean JSON if wrapped in markdown
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()

        data = json.loads(text)

        if not data.get('medicines') or len(data['medicines']) == 0:
            return {
                "success": False,
                "medicines": [],
                "error": data.get('error', 'No medicines found')
            }

        return {
            "success": True,
            "medicines": data.get("medicines", []),
            "raw_text": data.get("raw_text", ""),
            "doctor_name": data.get("doctor_name"),
            "date": data.get("date")
        }

    except json.JSONDecodeError as e:
        import logging
        logging.getLogger(__name__).error(
            f"Prescription JSON parse error: {e}, text: {text[:200]}"
        )
        return {
            "success": False,
            "medicines": [],
            "error": "Could not parse prescription data"
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"Prescription scan error: {e}"
        )
        return {
            "success": False,
            "medicines": [],
            "error": str(e)
        }
