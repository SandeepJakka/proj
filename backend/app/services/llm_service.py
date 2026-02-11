from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """
You are a clinical reasoning assistant.

You must follow these rules strictly:
- Do NOT name diseases or diagnoses.
- Do NOT prescribe medicines or dosages.
- Do NOT give emergency advice.
- Use cautious, non-conclusive medical language.
- Describe symptoms and possible physiological explanations only.

Input:
Symptoms: {symptoms}
Age: {age}
Gender: {gender}
Report Summary (if any): {report_summary}

Your task:
Explain what the symptoms MAY be associated with in general medical terms.

Output MUST follow this JSON format exactly:

{
  "findings": [
    "Symptom pattern description without disease names"
  ],
  "explanation": "Plain medical reasoning explaining what the symptoms may indicate in general terms",
  "confidence": "low | medium | high"
}

Important:
- NEVER output disease names.
- NEVER output diagnostic labels.
- If unsure, lower confidence.

"""

async def medical_llm_response(messages: list[dict]) -> str:
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=full_messages,
        temperature=0.25,
        max_tokens=450
    )

    return response.choices[0].message.content

async def simplify_medical_text(medical_text: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": (
                    "You simplify medical explanations for patients.\n"
                    "Do NOT add new medical information.\n"
                    "Do NOT diagnose.\n"
                    "Explain in very simple language."
                )
            },
            {"role": "user", "content": medical_text}
        ],
        temperature=0.2,
        max_tokens=250
    )

    return response.choices[0].message.content

