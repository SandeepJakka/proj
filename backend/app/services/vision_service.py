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
