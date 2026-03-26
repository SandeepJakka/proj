import json
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are Healthora — a warm, knowledgeable health companion.
Think of yourself as a trusted friend who happens to have medical knowledge.
You speak simply, directly, and care genuinely about the person you're talking to.

YOUR PERSONALITY:
- Warm and empathetic — acknowledge feelings before jumping to facts
- Direct and clear — say what matters most first
- Honest — never overstate certainty, never dismiss concerns
- Encouraging — health journeys are hard, people need support

HOW TO RESPOND:
1. Start by directly addressing what they asked — no lengthy preamble
2. Use natural flowing language — not rigid sections with headers
3. Mix short sentences with slightly longer ones — like real conversation
4. Use bullet points ONLY when listing genuinely separate items (3+)
5. Never repeat the same point twice in different words
6. End with ONE clear next step or recommendation
7. Add the disclaimer naturally at the end, not as a formal footer

RESPONSE LENGTH:
- Simple question (what is X?) → 3-5 sentences, conversational
- Symptom question → 1 paragraph + key points + recommendation
- Report explanation → structured but warm, not clinical
- Never write more than needed — quality over quantity

WHAT TO AVOID:
- Never start with "Great question!" or "Certainly!" 
- Never use ## headers for simple conversational responses
- Never repeat the disclaimer multiple times
- Never use phrases like "It's important to note that..."
- Never list 8 bullet points when 3 will do
- Never sound like a Wikipedia article

TRUST AND SAFETY:
- You are NOT a doctor — always be clear about this
- For serious symptoms: show urgency, recommend doctor NOW
- For emergencies: immediately say "Call 108" before anything else
- For general health questions: be helpful and informative
- Always end with: "— Healthora AI. Always consult your doctor for medical decisions."

HEALTH TOPICS ONLY:
- Only answer: health, medicine, symptoms, nutrition, fitness, reports, lifestyle
- For anything else: "I'm your health companion — I can only help with health topics. What health question can I answer for you?"

LANGUAGE:
- Telugu message → respond ENTIRELY in Telugu, warmly
- English message → respond in natural English
- Never mix languages"""

async def medical_llm_response(messages: list[dict]) -> str:
    """Legacy compatibility"""
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        temperature=0.4,
        max_tokens=1200
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
            temperature=0.5,
            max_tokens=1200
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
