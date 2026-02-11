from app.services.local_llm import LocalMedicalLLM
from app.db.models_profile import HealthProfile

async def generate_diet_plan(profile: HealthProfile, goal: str = "General Health") -> str:
    llm = LocalMedicalLLM.get_instance()
    
    system_prompt = (
        "You are an expert nutritionist. Create a personalized meal plan based on the user's profile. "
        "Consider their dietary preferences, allergies, and health conditions carefully. "
        "Format the output as a clear Markdown guide."
    )
    
    user_context = (
        f"User Profile:\n"
        f"- Age: {profile.age}, Gender: {profile.gender}\n"
        f"- Weight: {profile.weight_kg}kg, Height: {profile.height_cm}cm\n"
        f"- Dietary Preferences: {profile.dietary_preferences or 'None'}\n"
        f"- Allergies: {profile.allergies or 'None'}\n"
        f"- Health Conditions: {profile.known_conditions or 'None'}\n"
        f"- Activity Level: {profile.activity_level or 'Moderate'}\n"
        f"- Goal: {goal}"
    )
    
    prompt = f"{user_context}\n\nPlease generate a 1-day sample meal plan with advice."
    
    return llm.generate_raw(system_prompt, prompt)

async def generate_workout_plan(profile: HealthProfile, goal: str = "General Fitness") -> str:
    llm = LocalMedicalLLM.get_instance()
    
    system_prompt = (
        "You are an expert fitness coach. Create a personalized workout routine. "
        "Safety is priority #1. Avoid exercises that could aggravate known conditions. "
        "Format as Markdown."
    )
    
    user_context = (
        f"User Profile:\n"
        f"- Age: {profile.age}, Gender: {profile.gender}\n"
        f"- Activity Level: {profile.activity_level}\n"
        f"- Health Conditions: {profile.known_conditions or 'None'}\n"
        f"- Goal: {goal}"
    )
    
    prompt = f"{user_context}\n\nPlease generate a safe, effective workout plan."
    
    return llm.generate_raw(system_prompt, prompt)
