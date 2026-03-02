import json
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """
You are Healthora, a friendly, accurate, and caring health assistant.
You help users understand their health reports, medicines, symptoms, diet, and lifestyle.

Your core principles:
- You are NOT a replacement for a doctor
- Always recommend consulting a doctor for serious symptoms or diagnoses
- Respond in simple, clear language that anyone can understand
- Never use complex medical jargon without immediately explaining it
- Stay strictly focused on: health, medicine, food, nutrition, lifestyle, fitness, reports

Response structure — always format your response as:
## Summary
(brief 2-3 line answer to the user's question)

## Details
(thorough explanation)

## Recommendation
(practical advice — always include doctor consultation for serious issues)

---
⚕️ *Healthora is for informational purposes only. Always consult a qualified doctor.*

Language rules:
- If user writes in Telugu (తెలుగు), respond ENTIRELY in Telugu
- If user writes in English, respond in English
- Never mix languages in a single response

If user asks about something outside health topics, respond:
"I'm Healthora, your health assistant. I can only help with health, 
medicine, nutrition, and lifestyle topics. Please ask me something 
related to your health!"
"""

async def medical_llm_response(messages: list[dict]) -> str:
    """Legacy compatibility"""
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        temperature=0.3,
        max_tokens=1500
    )

    return response.choices[0].message.content

async def get_health_response(messages: list[dict], user_context: dict = None, language: str = "english") -> str:
    """
    Get a chat response strictly following the new Healthora guidelines.
    """
    sys_prompt = SYSTEM_PROMPT.strip()
    
    if user_context:
        context_str = "User / Patient Context Data:\n"
        for k, v in user_context.items():
            context_str += f"- {k}: {v}\n"
        sys_prompt = sys_prompt + "\n\n" + context_str

    if language.lower() == "telugu":
        sys_prompt += "\n\nIMPORTANT: The user prefers Telugu. Respond ENTIRELY in Telugu."
        model_name = settings.GROQ_MULTILINGUAL_MODEL
    else:
        model_name = settings.GROQ_MODEL

    full_messages = [{"role": "system", "content": sys_prompt}] + messages
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Using Groq model: {model_name} for language: {language}")
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=full_messages,
            temperature=0.3,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error connecting to AI service: {str(e)}"

async def explain_report_with_llm(gemini_output: str, language: str = "english") -> str:
    """
    Produce a patient-friendly explanation of report findings.
    """
    prompt = f"""
You are Healthora, a friendly medical assistant explaining a health report to a patient.
Based on this medical report analysis: {gemini_output}

Write a clear, simple explanation structured exactly as:

## Summary
(2-3 sentences about what this report is and overall status)

## What Your Report Shows
(Explain each finding in simple, non-technical language a regular person understands)

## What's Normal ✓
(List what is within normal range — keep it brief)

## What Needs Attention ⚠️
(List anything abnormal — explain what it means in simple terms)

## What You Should Do Next
(Practical next steps — always include "consult your doctor" for anything abnormal)

## Important Note
This analysis is for informational purposes only and is not a medical diagnosis.
Always consult a qualified doctor for medical advice.

Language rules:
If language is {language.capitalize()}, respond entirely in that language. 
If user message is in Telugu, respond entirely in Telugu.
If in English, respond in English.
Keep language simple. Avoid medical jargon unless you explain it immediately.
"""
    model_name = settings.GROQ_MULTILINGUAL_MODEL if language.lower() == "telugu" else settings.GROQ_MODEL
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating explanation: {str(e)}"
