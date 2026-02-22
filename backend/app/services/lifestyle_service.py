from app.services.llm_service import medical_llm_response
from app.db.models_profile import HealthProfile

async def start_plan_consultation(profile: HealthProfile, plan_type: str, lab_summary: str = "") -> str:
    """Start interactive consultation before generating plan"""
    system_prompt = (
        "You are a caring doctor starting a consultation to create a personalized plan.\n"
        "Review the patient's profile and lab results, then ask 3-4 specific questions to understand:\n"
        "- Current eating habits / exercise routine\n"
        "- Dietary restrictions, allergies, food preferences\n"
        "- Physical limitations, injuries, pain\n"
        "- Daily schedule and lifestyle\n"
        "- Goals and motivation\n\n"
        "Be warm, encouraging, and conversational. Show you care about their health journey."
    )
    
    context = f"""Patient Profile:
- Age: {profile.age}, Gender: {profile.gender}
- Weight: {profile.weight_kg}kg, Height: {profile.height_cm}cm
- Activity: {profile.activity_level}
- Known Conditions: {profile.known_conditions or 'None'}
- Allergies: {profile.allergies or 'None'}
- Dietary Preferences: {profile.dietary_preferences or 'None'}

{lab_summary}

You're creating a {plan_type} plan. Start the consultation by greeting them and asking your first questions."""
    
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": context}]
    return await medical_llm_response(messages)

async def generate_final_plan(profile: HealthProfile, plan_type: str, conversation: str, lab_summary: str = "") -> str:
    """Generate final plan after consultation"""
    if plan_type == "nutrition":
        system_prompt = (
            "You are an expert nutritionist creating a personalized 7-day meal plan.\n"
            "Based on the consultation conversation, create a detailed plan that:\n"
            "- Addresses their specific dietary needs and preferences\n"
            "- Considers lab values and health conditions\n"
            "- Respects their lifestyle and schedule\n"
            "- Includes specific meals, portions, and recipes\n"
            "- Provides shopping list and meal prep tips\n\n"
            "Format with clear sections, meal times, and actionable guidance."
        )
    else:
        system_prompt = (
            "You are an expert fitness coach creating a personalized weekly workout plan.\n"
            "Based on the consultation conversation, create a detailed plan that:\n"
            "- Matches their fitness level and goals\n"
            "- Avoids any mentioned injuries or limitations\n"
            "- Fits their schedule and preferences\n"
            "- Includes specific exercises, sets, reps, duration\n"
            "- Provides progression guidelines and safety tips\n\n"
            "Format with clear weekly schedule and exercise instructions."
        )
    
    context = f"""Patient Profile:
- Age: {profile.age}, Gender: {profile.gender}
- Weight: {profile.weight_kg}kg, Height: {profile.height_cm}cm
- Activity: {profile.activity_level}
- Conditions: {profile.known_conditions or 'None'}
- Allergies: {profile.allergies or 'None'}

{lab_summary}

Consultation Conversation:
{conversation}

Create a comprehensive, personalized {plan_type} plan based on everything discussed."""
    
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": context}]
    return await medical_llm_response(messages)
