from app.services.llm_service import get_health_response
import logging

logger = logging.getLogger(__name__)

def normalize_report_type(document_type: str) -> str:
    """Normalize document type to standard categories."""
    if not document_type:
        return "other"
    
    doc_lower = document_type.lower()
    
    if any(kw in doc_lower for kw in ["blood", "lab", "haematology", "cbc", "hemoglobin"]):
        return "blood_test"
    elif any(kw in doc_lower for kw in ["x-ray", "xray", "radiograph"]):
        return "xray"
    elif "mri" in doc_lower:
        return "mri"
    elif any(kw in doc_lower for kw in ["ct", "scan"]):
        return "ct_scan"
    elif any(kw in doc_lower for kw in ["prescription", "medicine", "medication"]):
        return "prescription"
    elif "urine" in doc_lower:
        return "urine_test"
    elif "thyroid" in doc_lower:
        return "thyroid"
    elif "liver" in doc_lower:
        return "liver_function"
    elif any(kw in doc_lower for kw in ["ecg", "ekg", "electrocardiogram"]):
        return "ecg"
    else:
        return "other"

async def compare_reports(
    old_report_summary: str,
    new_report_summary: str,
    report_type: str,
    language: str = "english"
) -> dict:
    """
    Compare two reports of same type using Groq LLM.
    Returns structured comparison with improvements, worsenings, unchanged.
    """
    prompt = f"""
You are Healthora, a medical report comparison expert.
Compare these two {report_type} reports for the same patient.
OLDER REPORT: {old_report_summary}
NEWER REPORT: {new_report_summary}

Provide a detailed comparison structured as:

## Overall Assessment
(2-3 sentences about overall health trend)

## ✅ What Improved
(List specific values or findings that got better)

## ⚠️ What Got Worse  
(List specific values or findings that worsened)

## ➡️ What Stayed the Same
(List unchanged values)

## 📋 Key Takeaways
(3-5 practical points the patient should know)

## 🩺 What to Discuss with Your Doctor
(Specific things to ask doctor about)

---
⚕️ This comparison is for informational purposes only.
Always consult your doctor for medical interpretation.

{"Respond entirely in Telugu." if language == "telugu" else "Respond in English."}
"""
    try:
        messages = [{"role": "user", "content": prompt}]
        comparison_text = await get_health_response(
            messages=messages,
            language=language
        )
        return {
            "success": True,
            "comparison": comparison_text,
            "has_comparison": True
        }
    except Exception as e:
        logger.error(f"Report comparison failed: {e}")
        return {
            "success": False,
            "comparison": None,
            "has_comparison": False
        }
