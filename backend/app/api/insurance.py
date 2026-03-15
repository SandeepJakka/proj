from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import fitz  # PyMuPDF

from app.db.deps import get_db, get_current_user
from app.db import models

router = APIRouter(prefix="/api/insurance", tags=["Insurance"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> tuple:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text)
        doc.close()
        full_text = "\n\n--- PAGE BREAK ---\n\n".join(pages)
        return full_text, len(pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {str(e)}")


def extract_image_text_groq(file_bytes: bytes, filename: str) -> str:
    import base64
    from groq import Groq
    from app.config import settings
    client = Groq(api_key=settings.GROQ_API_KEY)
    ext = filename.split('.')[-1].lower()
    media_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
    media_type = media_map.get(ext, 'image/jpeg')
    b64 = base64.b64encode(file_bytes).decode('utf-8')
    response = client.chat.completions.create(
        model=settings.GROQ_VISION_MODEL,
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
            {"type": "text", "text": "Extract ALL text from this document. Return only the text content, nothing else."}
        ]}],
        max_tokens=4000
    )
    return response.choices[0].message.content


def chunk_policy_text(text: str, chunk_size: int = 2000) -> list:
    words = text.split()
    chunks = []
    overlap = 200
    i = 0
    while i < len(words):
        chunks.append(' '.join(words[i:i + chunk_size]))
        i += chunk_size - overlap
    return chunks


def find_relevant_chunks(policy_text: str, query: str, max_chunks: int = 3) -> str:
    chunks = chunk_policy_text(policy_text)
    if not chunks:
        return policy_text[:8000]
    query_words = set(query.lower().split())
    scored = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = sum(1 for w in query_words if w in chunk_lower and len(w) > 3)
        scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return "\n\n---\n\n".join(c for _, c in scored[:max_chunks])


# ── Upload Policy ──────────────────────────────────────────────────────────────

@router.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    policy_name: str = Form(...),
    policy_number: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 50MB.")
    filename = file.filename or "policy.pdf"
    ext = filename.split('.')[-1].lower()
    if ext == 'pdf':
        policy_text, page_count = extract_pdf_text(file_bytes)
    elif ext in ['jpg', 'jpeg', 'png']:
        policy_text = extract_image_text_groq(file_bytes, filename)
        page_count = 1
    else:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG files supported")
    if not policy_text or len(policy_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract text from document.")

    from google import genai
    from app.config import settings
    import json
    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        meta_response = gemini_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=f"""From this insurance policy text extract:
- insurer_name (company name)
- policy_type (health/life/vehicle/other)

Return ONLY JSON: {{"insurer_name": "...", "policy_type": "..."}}

Policy text (first 2000 chars):
{policy_text[:2000]}"""
        )
        meta_text = meta_response.text
        if '```json' in meta_text:
            meta_text = meta_text.split('```json')[1].split('```')[0]
        elif '```' in meta_text:
            meta_text = meta_text.split('```')[1].split('```')[0]
        meta = json.loads(meta_text.strip())
        insurer_name = meta.get('insurer_name', '')
        policy_type = meta.get('policy_type', 'health')
    except Exception:
        insurer_name = ''
        policy_type = 'health'

    policy = InsurancePolicy(
        user_id=current_user.id,
        policy_name=policy_name,
        insurer_name=insurer_name,
        policy_type=policy_type,
        policy_number=policy_number or None,
        policy_text=policy_text,
        page_count=page_count
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return {
        "id": policy.id,
        "policy_name": policy.policy_name,
        "insurer_name": policy.insurer_name,
        "policy_type": policy.policy_type,
        "page_count": policy.page_count,
        "text_length": len(policy_text),
        "message": f"Policy uploaded successfully! Extracted {page_count} pages."
    }


# ── Get / Delete Policies ──────────────────────────────────────────────────────

@router.get("/policies")
def get_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    policies = db.query(InsurancePolicy).filter(
        InsurancePolicy.user_id == current_user.id,
        InsurancePolicy.is_active == True
    ).order_by(InsurancePolicy.created_at.desc()).all()
    return [{
        "id": p.id,
        "policy_name": p.policy_name,
        "insurer_name": p.insurer_name,
        "policy_type": p.policy_type,
        "policy_number": p.policy_number,
        "page_count": p.page_count,
        "created_at": p.created_at.isoformat()
    } for p in policies]


@router.delete("/policies/{policy_id}")
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id,
        InsurancePolicy.user_id == current_user.id
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted"}


# ── Claim Check ────────────────────────────────────────────────────────────────

class ClaimCheckRequest(BaseModel):
    policy_id: int
    situation: str
    bill_text: Optional[str] = None
    language: str = "english"


@router.post("/check-claim")
async def check_claim_eligibility(
    req: ClaimCheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    from google import genai
    from app.config import settings
    import json as json_mod

    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == req.policy_id,
        InsurancePolicy.user_id == current_user.id
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    query = req.situation + (" " + req.bill_text[:500] if req.bill_text else "")
    relevant_text = find_relevant_chunks(policy.policy_text, query, max_chunks=3)
    relevant_text = relevant_text[:6000]
    bill_section = f"\nMedical Bill / Report:\n{req.bill_text[:2000]}" if req.bill_text else ""

    system_prompt = """You are an insurance claim expert in India specializing in health insurance.
Analyze the policy text and determine claim eligibility.
Respond ONLY with valid JSON:
{
  "eligible": true,
  "confidence": "high|medium|low",
  "verdict": "One sentence verdict",
  "covered_amount": "Estimated claimable amount",
  "claim_type": "cashless|reimbursement|both",
  "covered_items": ["What is covered"],
  "not_covered": ["Exclusions"],
  "conditions": ["Conditions or waiting periods"],
  "documents_required": ["Document needed"],
  "claim_steps": ["Step 1: ...", "Step 2: ..."],
  "cashless_guidance": "How to use cashless",
  "reimbursement_guidance": "How to file reimbursement",
  "tips": ["Practical tip for claim in India"],
  "aarogyasri_applicable": false,
  "summary": "Plain language summary"
}"""

    user_prompt = f"""Insurance Policy: {policy.policy_name}
Insurer: {policy.insurer_name or 'Unknown'}
Policy Type: {policy.policy_type}

Relevant Policy Sections:
{relevant_text}
{bill_section}

Patient's Situation: {req.situation}
Language: {req.language}"""

    full_prompt = f"{system_prompt}\n\n{user_prompt}"

    response = gemini_client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=full_prompt
    )

    text = response.text.strip()
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
        text = text.split('```')[1].split('```')[0].strip()
    try:
        data = json_mod.loads(text)
        return {"success": True, "data": data}
    except Exception:
        return {"success": False, "error": "Could not analyze claim. Please try again."}


# ── Policy Chat ────────────────────────────────────────────────────────────────

class PolicyChatRequest(BaseModel):
    policy_id: int
    question: str
    chat_history: list = []
    language: str = "english"


@router.post("/chat")
async def chat_with_policy(
    req: PolicyChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    from google import genai
    from app.config import settings

    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == req.policy_id,
        InsurancePolicy.user_id == current_user.id
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    relevant_text = find_relevant_chunks(policy.policy_text, req.question)
    relevant_text = relevant_text[:6000]

    system_prompt = f"""You are an insurance expert helping a patient understand their {policy.policy_type} insurance policy from {policy.insurer_name or 'their insurer'}.
You have access to relevant sections of their policy document. Answer clearly and simply.

Policy Context:
{relevant_text}

Rules:
- Answer based on the policy text provided
- If not in policy text, say so clearly
- Mention cashless, TPA, Aarogyasri in Indian context where relevant
- If language is telugu respond in Telugu
- Keep answers concise but complete"""

    # Build conversation as a single prompt for Gemini
    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.chat_history[-6:]:
        if isinstance(msg, dict) and msg.get('role') in ['user', 'assistant']:
            messages.append({"role": msg['role'], "content": msg['content']})
    messages.append({"role": "user", "content": req.question})

    conversation = ""
    for msg in messages:
        if msg["role"] == "system":
            conversation += f"Instructions: {msg['content']}\n\n"
        elif msg["role"] == "user":
            conversation += f"User: {msg['content']}\n"
        elif msg["role"] == "assistant":
            conversation += f"Assistant: {msg['content']}\n"

    response = gemini_client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=conversation
    )

    return {"response": response.text, "policy_name": policy.policy_name}


# ── Check Claim with Bill Upload ───────────────────────────────────────────────

@router.post("/check-claim-with-bill")
async def check_claim_with_bill(
    file: UploadFile = File(...),
    policy_id: int = Form(...),
    situation: str = Form(""),
    language: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_insurance import InsurancePolicy
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id,
        InsurancePolicy.user_id == current_user.id
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    file_bytes = await file.read()
    filename = file.filename or "bill.pdf"
    ext = filename.split('.')[-1].lower()

    if ext == 'pdf':
        bill_text, _ = extract_pdf_text(file_bytes)
    elif ext in ['jpg', 'jpeg', 'png']:
        bill_text = extract_image_text_groq(file_bytes, filename)
    else:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG supported")

    req = ClaimCheckRequest(
        policy_id=policy_id,
        situation=situation or "Check if this medical bill/report is claimable under the insurance policy",
        bill_text=bill_text[:3000],
        language=language
    )
    return await check_claim_eligibility(req, db, current_user)
