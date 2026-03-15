from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from app.db.deps import get_current_user
from app.db import models

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])

class PriceCheckRequest(BaseModel):
    medicines: List[str]
    language: str = "english"

@router.post("/price-check")
async def check_medicine_prices(
    req: PriceCheckRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    AI-powered medicine price comparison.
    Returns brand vs generic prices, alternatives,
    and online pharmacy estimates for India/AP.
    """
    from app.services.llm_service import medical_llm_response
    import json as json_mod

    if not req.medicines:
        return {"success": False, "error": "No medicines provided"}

    medicines_list = "\n".join(
        f"- {m.strip()}" for m in req.medicines if m.strip()
    )

    system_prompt = """You are a pharmaceutical pricing expert
in India specializing in Andhra Pradesh market.
You help patients find cheaper alternatives to expensive medicines.

Respond ONLY with valid JSON in this exact format:
{
  "medicines": [
    {
      "name": "Medicine name as given",
      "brand_name": "Common brand name in India",
      "generic_name": "Generic/salt name",
      "category": "Medicine category (antibiotic, diabetes, BP etc)",
      "brand_price": "Approximate brand price per strip/unit in INR",
      "generic_price": "Approximate generic price per strip/unit in INR",
      "jan_aushadhi_price": "Jan Aushadhi price if available or null",
      "jan_aushadhi_available": true or false,
      "savings_percent": "Approximate % savings with generic",
      "online_prices": {
        "1mg": "Approximate price on 1mg.com",
        "pharmeasy": "Approximate price on PharmEasy",
        "netmeds": "Approximate price on Netmeds"
      },
      "alternatives": [
        {
          "name": "Alternative medicine name",
          "type": "generic|different_brand|substitute",
          "price": "Approximate price in INR",
          "note": "Brief note about this alternative"
        }
      ],
      "buying_tip": "Practical tip for buying this medicine cheaper in AP",
      "prescription_required": true or false,
      "available_in_ap": true or false
    }
  ],
  "total_brand_cost": "Total monthly cost with brand medicines",
  "total_generic_cost": "Total monthly cost with generics",
  "total_savings": "Total monthly savings by switching to generics",
  "summary_tip": "One overall money-saving tip for these medicines"
}

Rules:
- All prices in Indian Rupees (₹)
- Focus on medicines available in Andhra Pradesh
- Always mention Jan Aushadhi stores (Pradhan Mantri Bhartiya 
  Janaushadhi Pariyojana) for generic alternatives
- Mention Aarogyasri scheme if medicine is for serious condition
- Be realistic with price estimates based on Indian market
- If medicine not found, still return entry with available: false
- Respond in Telugu if language is telugu
- Return ONLY valid JSON"""

    user_prompt = f"""Check prices for these medicines in India/AP:
{medicines_list}

Language: {req.language}
Provide realistic price comparisons and cheaper alternatives."""

    try:
        response = await medical_llm_response([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])

        text = response.strip()
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()

        data = json_mod.loads(text)
        return {"success": True, "data": data}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Price check error: {e}")
        return {
            "success": False,
            "error": "Could not fetch prices. Please try again."
        }
