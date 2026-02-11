async def run_medical_reasoning(symptoms: list[str], age=None, gender=None, report_summary=None, db=None, user_id=None):
    """
    Runs medical reasoning using local MediPhi-Instruct GGUF model.
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

    # Combined context for safety check (mirroring is allowed)
    context_text = ((" ".join(symptoms) if symptoms else "") + " " + (report_summary or "") + " " + profile_context).lower()

    def sanitize_medical_output(result: dict) -> dict:
        text = " ".join(result.get("findings", [])) + " " + result.get("explanation", "")
        text_lower = text.lower()

        for term in FORBIDDEN_TERMS:
            if term in text_lower:
                # SAFEGUARD: If the term was already in the input (symptoms or report), 
                # we assume the user/report introduced it, so it's safe to discuss.
                if term in context_text:
                    continue

                # Instead of raising error, we can return a safe fallback or filtered result
                # For now, let's just log and return a generic safe message to avoid crashing
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

    try:
        from app.services.local_llm import LocalMedicalLLM
        llm = LocalMedicalLLM.get_instance()
        
        # Call the local model
        # PRIORITY INSTRUCTION: Tell the model to prioritize the report
        report_text = (report_summary or "")
        profile_text = (profile_context if profile_context else "")
        
        combined_context = (
            "### MEDICAL REPORT DATA (PRIORITY) ###\n"
            f"{report_text}\n\n"
            "### PATIENT GENERAL HISTORY (FOR CONTEXT ONLY) ###\n"
            f"{profile_text}"
        )
        
        result = llm.predict(symptoms, age, gender, combined_context)
        
        # Apply safety filter
        safe_result = sanitize_medical_output(result)
        return safe_result

    except Exception as e:
        # Fallback in case of error (e.g., model not loaded)
        import traceback
        trace = traceback.format_exc()
        print(f"Error in local medical reasoning: {e}")
        return {
            "findings": [f"Error executing local medical model: {str(e)}"],
            "explanation": f"Debug info: {trace}",
            "confidence": "low"
        }

