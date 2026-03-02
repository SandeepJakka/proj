async def run_medical_reasoning(symptoms: list[str], age=None, gender=None, report_summary=None, db=None, user_id=None):
    """
    Medical reasoning based on symptoms and health profile.
    NOTE: Local LLM (MediPhi) has been removed. This endpoint now returns
    structured observations. Full AI reasoning is available via the /api/chat endpoint.
    """
    FORBIDDEN_TERMS = [
        "migraine", "diabetes", "cancer", "hypertension",
        "infection", "stroke", "tumor", "disease"
    ]

    # 1. Fetch Profile Context if available
    profile_context = ""
    if db and user_id:
        try:
            from app.db.crud import get_health_profile
            profile = get_health_profile(db, user_id)
            if profile:
                # Fill missing age/gender
                if age is None: age = profile.age
                if gender is None: gender = profile.gender

                # Construct context string
                parts = []
                if profile.known_conditions:
                    parts.append(f"Known Conditions: {profile.known_conditions}")
                if profile.allergies:
                    parts.append(f"Allergies: {profile.allergies}")
                if profile.activity_level:
                    parts.append(f"Activity Level: {profile.activity_level}")

                if parts:
                    profile_context = "\nHealth Profile: " + "; ".join(parts)
        except Exception as e:
            print(f"Error fetching profile: {e}")

    # Combined context for safety check
    context_text = (
        (" ".join(symptoms) if symptoms else "") + " " +
        (report_summary or "") + " " + profile_context
    ).lower()

    def sanitize_medical_output(result: dict) -> dict:
        text = " ".join(result.get("findings", [])) + " " + result.get("explanation", "")
        text_lower = text.lower()

        for term in FORBIDDEN_TERMS:
            if term in text_lower:
                # Allow if the term was in the original input (user/report introduced it)
                if term in context_text:
                    continue
                print(f"Unsafe medical output detected (diagnosis term: {term})")
                return {
                    "findings": ["Possible health concern identified."],
                    "explanation": (
                        "The analysis suggests a condition that requires professional medical assessment. "
                        "I cannot provide a specific name for this condition due to safety protocols."
                    ),
                    "confidence": "low"
                }
        return result

    # Build findings from symptoms directly (deterministic, no local model)
    symptom_list = symptoms if symptoms else []
    findings = [f"Symptom reported: {s}" for s in symptom_list]

    result = {
        "findings": findings if findings else ["No symptoms provided."],
        "explanation": (
            f"You reported {len(symptom_list)} symptom(s). "
            "For detailed AI-powered medical reasoning, please use the Chat feature "
            "where Groq-powered analysis is available. "
            f"{'Profile context applied: ' + profile_context if profile_context else ''}"
        ),
        "confidence": "medium"
    }

    return sanitize_medical_output(result)

