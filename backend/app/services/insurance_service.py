import io
import json
import logging
import re
from typing import Optional

import fitz  # PyMuPDF
from groq import Groq
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models_insurance import InsurancePolicy
from app.services.rag.rag_service import RAGService

logger = logging.getLogger(__name__)
rag_service = RAGService()
groq_client = Groq(api_key=settings.GROQ_API_KEY)


# ── helpers ────────────────────────────────────────────────────────────────────

def _extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF or image bytes using PyMuPDF.
    For images we fall back to a quick Groq-vision OCR."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    text = ""

    if ext == "pdf":
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_pages = len(doc)
            logger.info(f"Starting extraction for {filename} ({total_pages} pages)")
            for i, page in enumerate(doc):
                text += page.get_text()
                if (i + 1) % 20 == 0 or (i + 1) == total_pages:
                    logger.info(f"Extracted page {i + 1}/{total_pages} of {filename}")
            doc.close()
        except Exception as e:
            logger.warning(f"PyMuPDF text extract failed for {filename}: {e}")
    else:
        # Image — use Groq vision for OCR only (plain text, no JSON)
        text = _ocr_image_bytes(file_bytes, filename)

    return text.strip()


def _ocr_image_bytes(file_bytes: bytes, filename: str) -> str:
    """Call Groq vision to get plain-text OCR of an image file."""
    import base64
    from app.services.report_analyzer import preprocess_document, get_base64_from_images

    images = preprocess_document(file_bytes, filename)
    if not images:
        return ""
    image_base64, media_type = get_base64_from_images(images)
    try:
        resp = groq_client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{image_base64}"}},
                        {"type": "text", "text": "Extract and return ALL the text visible in this image. Return plain text only."}
                    ],
                }
            ],
            max_tokens=4096,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OCR vision call failed: {e}")
        return ""


def _extract_json(text: str) -> dict:
    """Reliably pull a JSON object out of an LLM response string."""
    # Strip markdown fences
    text = re.sub(r"```(?:json)?", "", text).strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Greedy regex fallback
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def _get_policy_metadata(policy_text: str) -> dict:
    """Use a text-only LLM call (no vision, no json_object mode) to guess
    insurer name and policy type from a short excerpt of the policy text."""
    excerpt = policy_text[:3000]
    prompt = f"""From the insurance policy text below, extract:
1. insurer_name  - the name of the insurance company
2. policy_type   - one of: health, life, vehicle, other
3. page_count    - best guess at total pages (integer)

Return ONLY a JSON object with those three keys. Example:
{{"insurer_name": "Star Health", "policy_type": "health", "page_count": 12}}

POLICY TEXT:
{excerpt}

JSON:"""
    try:
        resp = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.1,
        )
        return _extract_json(resp.choices[0].message.content)
    except Exception as e:
        logger.warning(f"Metadata extraction failed: {e}")
        return {}


# ── public service functions ───────────────────────────────────────────────────

async def process_and_save_policy(
    db: Session,
    user_id: int,
    file_bytes: bytes,
    filename: str,
    policy_name: str,
    policy_number: Optional[str] = None,
):
    # Step 1 — Extract raw text (no vision JSON required)
    policy_text = _extract_text_from_bytes(file_bytes, filename)
    if not policy_text:
        raise Exception("Could not extract text from the uploaded document. Please check the file and try again.")

    # Step 2 — Metadata via lightweight text LLM call
    meta = _get_policy_metadata(policy_text)
    insurer_name = meta.get("insurer_name") or "Unknown Insurer"
    policy_type = (meta.get("policy_type") or "health").lower()
    page_count = int(meta.get("page_count") or max(1, len(policy_text) // 2000))

    # Step 3 — Persist to DB
    policy = InsurancePolicy(
        user_id=user_id,
        policy_name=policy_name,
        insurer_name=insurer_name,
        policy_type=policy_type,
        policy_number=policy_number,
        policy_text=policy_text,
        page_count=page_count,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)

    # Step 4 — Index into RAG (best-effort, non-blocking)
    try:
        doc_id = f"policy_{policy.id}"
        rag_service.load_text(doc_id, policy_text)
    except Exception as e:
        logger.warning(f"RAG indexing failed (non-fatal): {e}")

    return policy


async def check_insurance_claim(
    policy: InsurancePolicy,
    situation: str,
    bill_file_bytes: Optional[bytes] = None,
    bill_filename: Optional[str] = None,
    language: str = "english",
):
    # Step 1 — OCR bill if provided
    bill_text = ""
    if bill_file_bytes and bill_filename:
        bill_text = _extract_text_from_bytes(bill_file_bytes, bill_filename)

    # Step 2 — Retrieve policy context — more chunks for richer answers
    doc_id = f"policy_{policy.id}"
    try:
        chunks = rag_service.query(doc_id, situation, k=8)
        context = "\n\n".join(r["chunk"] for r in chunks) if chunks else policy.policy_text[:10000]
    except Exception:
        context = policy.policy_text[:10000]

    # Also pull contact / address context from the full text intro
    contact_context = policy.policy_text[:3000]

    lang_instruction = "Respond ENTIRELY in Telugu." if language.lower() == "telugu" else "Respond in English."

    analysis_prompt = f"""You are an expert insurance claim adjuster AI for Healthora.

POLICY DETAILS:
Policy Name: {policy.policy_name}
Insurer: {policy.insurer_name}
Type: {policy.policy_type}

RELEVANT POLICY CLAUSES (RAG retrieved):
{context}

POLICY DOCUMENT START (for contact/address extraction):
{contact_context}

PATIENT SITUATION:
{situation}

ATTACHED BILL / REPORT TEXT:
{bill_text or "(none provided)"}

TASK: Determine if the situation is claimable and provide full guidance.
{lang_instruction}

Return a JSON object with EXACTLY this structure (fill all fields from the policy text):
{{
  "success": true,
  "data": {{
    "eligible": true,
    "verdict": "one clear sentence verdict",
    "covered_amount": "₹ estimate or N/A",
    "confidence": "high",
    "claim_type": "cashless",

    "covered_items": ["list of what is covered for this situation"],
    "not_covered": ["list of exclusions relevant to this situation"],

    "policy_sections": [
      {{"section": "Section X - Name", "detail": "what this section covers and the limits"}}
    ],

    "how_to_claim": {{
      "cashless": [
        "Step 1: Inform insurer/TPA 24-48 hrs before planned hospitalisation or immediately for emergency.",
        "Step 2: Go to a network hospital and show your health card / policy number.",
        "Step 3: Hospital raises pre-authorisation request to insurer.",
        "Step 4: Insurer approves and settles bill directly with hospital."
      ],
      "reimbursement": [
        "Step 1: Pay the hospital bill yourself.",
        "Step 2: Collect all original bills, discharge summary, prescriptions.",
        "Step 3: Submit claim form with documents to insurer within 30 days.",
        "Step 4: Insurer reviews and reimburses eligible amount to your bank account."
      ]
    }},

    "documents_required": ["list of required documents"],
    "conditions": ["waiting periods, co-pay, sub-limits relevant to this situation"],
    "tips": ["practical tips for maximising claim amount"],

    "contact_details": {{
      "phone": "toll-free / helpline numbers found in the policy",
      "email": "claim / support email from the policy",
      "website": "official website from the policy",
      "tpa_name": "TPA name if mentioned",
      "tpa_phone": "TPA helpline if mentioned"
    }},
    "insurer_address": "registered / correspondence address from the policy",

    "aarogyasri_applicable": false
  }}
}}

IMPORTANT: Extract contact_details and insurer_address from the actual policy text provided above. If a field is not found, use null."""

    model_name = settings.GROQ_MULTILINGUAL_MODEL if language.lower() == "telugu" else settings.GROQ_MODEL

    try:
        resp = groq_client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": analysis_prompt}],
            max_tokens=2500,
            temperature=0.2,
        )
        result = _extract_json(resp.choices[0].message.content)
        if not result:
            raise ValueError("Empty JSON")
        return result
    except Exception as e:
        logger.error(f"Claim analysis failed: {e}")
        return {
            "success": False,
            "error": "Could not complete claim analysis. Please try again.",
        }


async def chat_with_policy(
    policy: InsurancePolicy,
    question: str,
    chat_history: list = [],
    language: str = "english",
):
    # Retrieve relevant context via RAG
    doc_id = f"policy_{policy.id}"
    try:
        chunks = rag_service.query(doc_id, question, k=4)
        context = "\n\n".join(r["chunk"] for r in chunks) if chunks else policy.policy_text[:6000]
    except Exception:
        context = policy.policy_text[:6000]

    lang_instruction = "Respond ENTIRELY in Telugu." if language.lower() == "telugu" else ""

    # Build message history
    messages = [
        {
            "role": "system",
            "content": (
                f"You are an Insurance Policy Assistant. "
                f"Help the user understand their policy: '{policy.policy_name}' by {policy.insurer_name}.\n\n"
                f"POLICY CONTEXT:\n{context}\n\n"
                f"Rules:\n"
                f"1. Answer ONLY from the policy context above.\n"
                f"2. If not found, say so clearly.\n"
                f"3. Be warm, concise and helpful.\n"
                f"{lang_instruction}"
            ),
        }
    ]
    for m in chat_history[-6:]:
        if isinstance(m, dict) and m.get("role") and m.get("content"):
            messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": question})

    model_name = settings.GROQ_MULTILINGUAL_MODEL if language.lower() == "telugu" else settings.GROQ_MODEL

    try:
        resp = groq_client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=800,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Chat with policy failed: {e}")
        return "⚠️ I encountered an error. Please try again."
