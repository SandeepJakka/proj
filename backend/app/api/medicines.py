from fastapi import APIRouter, Depends
import httpx
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import logging
import json
import re

from app.db.deps import get_current_user
from app.db import models
from app.services.medicine_verification_service import (
    verify_medicine,
    verify_medicines_batch,
    normalize_medicine_name,
)

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])
logger = logging.getLogger(__name__)

# ── Web scraping helpers ─────────────────────────────────────

async def scrape_1mg_price(medicine_name: str) -> Optional[dict]:
    """
    Scrape real price from 1mg.com for a medicine.
    Returns price data or None if scraping fails.
    """
    import httpx
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }

    # Clean medicine name for search
    search_query = medicine_name.strip().lower()
    # Remove dosage for cleaner search
    search_query = re.sub(r'\d+\s*mg|\d+\s*ml|\d+\s*mcg', '', search_query).strip()
    search_url = f"https://www.1mg.com/search/all?name={search_query.replace(' ', '+')}"

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(search_url, headers=headers)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, 'html.parser')
            results = []

            # Method 1: Look for __NEXT_DATA__ (Modern sites use this to store state)
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            if next_data_script:
                try:
                    full_data = json.loads(next_data_script.string)
                    # Traverse the complex tree to find products (common path for 1mg)
                    props = full_data.get('props', {}).get('pageProps', {})
                    comp_data = props.get('componentData', [])
                    for comp in comp_data:
                        if comp.get('type') == 'product_list':
                            for prod in comp.get('data', []):
                                name = prod.get('name')
                                price = prod.get('price', {}).get('offered_price')
                                if name and price:
                                    results.append({
                                        'name': name,
                                        'price': f"₹{price}",
                                        'source': '1mg'
                                    })
                except Exception:
                    pass

            # Method 2: Look for JSON-LD structured data (Fallback)
            if not results:
                scripts = soup.find_all('script', type='application/ld+json')
                for script in scripts:
                    try:
                        data = json.loads(script.string)
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if item.get('@type') == 'Product':
                                offer = item.get('offers', {})
                                price = offer.get('price')
                                name = item.get('name', '')
                                if price and name:
                                    results.append({
                                        'name': name,
                                        'price': f"₹{price}",
                                        'source': '1mg'
                                    })
                    except Exception:
                        continue

            # Method 3: Broad Regex Search (Last resort)
            if not results:
                price_pattern = re.compile(r'₹\s*(\d+(?:\.\d+)?)')
                prices_found = price_pattern.findall(response.text)
                if prices_found:
                    return {
                        'found': True,
                        'results': [{'price': f"₹{p}", 'source': '1mg'} for p in prices_found[:3]],
                        'url': search_url
                    }

            if results:
                return {'found': True, 'results': results[:3], 'url': search_url}
            
            return {'found': False, 'url': search_url}

    except Exception as e:
        logger.warning(f"1mg scraping failed for {medicine_name}: {e}")
        return None


async def scrape_pharmeasy_price(medicine_name: str) -> Optional[dict]:
    """Scrape price from PharmEasy."""
    import httpx
    from bs4 import BeautifulSoup

    search_query = re.sub(
        r'\d+\s*mg|\d+\s*ml|\d+\s*mcg', '',
        medicine_name.strip()
    ).strip()
    search_url = (
        f"https://pharmeasy.in/search/all?"
        f"name={search_query.replace(' ', '+')}"
    )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(search_url, headers=headers)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for price in JSON-LD
            scripts = soup.find_all('script', type='application/ld+json')
            results = []
            for script in scripts:
                try:
                    data = json.loads(script.string or '{}')
                    if data.get('@type') == 'Product':
                        offer = data.get('offers', {})
                        price = offer.get('price')
                        if price:
                            results.append({
                                'name': data.get('name', medicine_name),
                                'price': f"₹{price}",
                                'source': 'PharmEasy'
                            })
                except Exception:
                    continue

            # Fallback: regex price search
            price_pattern = re.compile(r'₹\s*\d+(?:\.\d+)?')
            prices_found = price_pattern.findall(soup.get_text())

            if results:
                return {'found': True, 'results': results[:2], 'url': search_url}
            elif prices_found:
                return {
                    'found': True,
                    'results': [{'price': p, 'source': 'PharmEasy'} for p in prices_found[:2]],
                    'url': search_url
                }
            return {'found': False}

    except Exception as e:
        logger.warning(f"PharmEasy scraping failed for {medicine_name}: {e}")
        return None


async def get_jan_aushadhi_info(medicine_name: str) -> dict:
    """
    Check Jan Aushadhi availability using OpenFDA API
    to get generic name, then estimate Jan Aushadhi price.
    Jan Aushadhi prices are typically 50-90% less than branded.
    """
    import httpx

    generic_name = medicine_name
    try:
        # Use OpenFDA to get generic name
        search = medicine_name.split()[0]  # Use first word
        print("Calling OpenFDA with:", medicine_name)
        url = f"https://api.fda.gov/drug/label.json?search=brand_name:{search}&limit=1"
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(url)
            print("OpenFDA response:", res.status_code, res.text[:200])
            if res.status_code == 200:
                data = res.json()
                results = data.get('results', [])
                if results:
                    generic = results[0].get('generic_name', [''])[0]
                    if generic:
                        generic_name = generic.title()
    except Exception as e:
        print("Jan Aushadhi OpenFDA error:", str(e))
        pass

    return {
        'generic_name': generic_name,
        'jan_aushadhi_available': True,
        'savings_note': 'Jan Aushadhi stores offer 50-90% savings vs branded medicines',
        'find_store': 'Visit janaushadhi.gov.in or search "Jan Aushadhi" on Google Maps'
    }


async def fetch_real_price(medicine_name: str):
    """
    Fetch real prices from online pharmacies.
    Returns dict with prices or None if scraping fails.
    """
    import asyncio
    try:
        # Run scraping concurrently
        mg_task = scrape_1mg_price(medicine_name)
        pe_task = scrape_pharmeasy_price(medicine_name)
        
        mg_data, pe_data = await asyncio.gather(mg_task, pe_task, return_exceptions=True)
        
        results = {}
        found = False
        
        if mg_data and not isinstance(mg_data, Exception) and mg_data.get('found'):
            prices = [r.get('price', '') for r in mg_data.get('results', []) if r.get('price')]
            if prices:
                results["1mg"] = prices[0]
                found = True
                
        if pe_data and not isinstance(pe_data, Exception) and pe_data.get('found'):
            prices = [r.get('price', '') for r in pe_data.get('results', []) if r.get('price')]
            if prices:
                results["pharmeasy"] = prices[0]
                found = True
        
        if found:
            results["source"] = "real"
            return results
            
        return None
    except Exception:
        return None


def extract_json(text: str):
    import json
    decoder = json.JSONDecoder()
    text = text.strip()

    for i in range(len(text)):
        try:
            obj, end = decoder.raw_decode(text[i:])
            return obj
        except json.JSONDecodeError:
            continue

    return None


# ── Main endpoint ────────────────────────────────────────────

class PriceCheckRequest(BaseModel):
    medicines: List[str]
    language: str = "english"

@router.post("/price-check")
async def check_medicine_prices(
    req: PriceCheckRequest,
    current_user: models.User = Depends(get_current_user)
):
    # TODO: Re-enable after integrating real data sources (PharmEasy / 1mg / RAG) to ensure accuracy
    return {
        "success": False,
        "error": "Price check is temporarily unavailable to ensure accuracy."
    }

async def _old_implementation_hidden_for_safety(
    req: PriceCheckRequest,
    current_user: models.User = Depends(get_current_user)
):
    from app.services.llm_service import medical_llm_response

    if not req.medicines:
        return {
            "success": True, 
            "data": [], 
            "note": "No medicines provided for price check"
        }
    
    print("Input medicines:", req.medicines)

    # ── Step 0: Verify & normalise all medicine names ─────────────────────
    raw_medicines = [m.strip() for m in req.medicines if m.strip()]
    verification_results = await verify_medicines_batch(raw_medicines)

    # Build a map: original_name → verification dict
    verification_map: dict[str, dict] = {
        raw: vr for raw, vr in zip(raw_medicines, verification_results)
    }

    # Use corrected names for scraping / AI; fall back to original if unverified
    medicines = [
        (vr.get("corrected_name") or raw) if vr.get("verified") else raw
        for raw, vr in zip(raw_medicines, verification_results)
    ]

    print("Verified medicines:", medicines)

    # Step 1: Fetch real prices concurrently
    real_prices = {}
    price_tasks = []
    for med in medicines[:5]:
        price_tasks.append(fetch_real_price(med))
    
    price_results = await asyncio.gather(*price_tasks, return_exceptions=True)
    
    for med, res in zip(medicines[:5], price_results):
        if res and not isinstance(res, Exception):
            real_prices[med] = res

    # Step 2: Build context for AI with scraped data
    scraped_context = ""
    for med, pdata in real_prices.items():
        scraped_context += f"Medicine: {med}\nReal prices found: "
        if "1mg" in pdata: scraped_context += f"1mg: {pdata['1mg']} "
        if "pharmeasy" in pdata: scraped_context += f"PharmEasy: {pdata['pharmeasy']} "
        scraped_context += "\n"

    # Step 3: AI enrichment with real price context
    system_prompt = """You are a pharmaceutical pricing expert for India. 
You provide a hybrid of real-time scraped prices and accurate AI estimates.

Respond ONLY with valid JSON:
{
  "medicines": [
    {
      "name": "Medicine name",
      "brand_name": "Brand name",
      "generic_name": "Generic name",
      "category": "Category",
      "brand_price": "Price string",
      "generic_price": "Estimate",
      "jan_aushadhi_price": "50-90% less than brand",
      "online_prices": {
        "1mg": "Price or 'Not available'",
        "pharmeasy": "Price or 'Not available'",
        "netmeds": "Estimated price"
      },
      "source": "real|estimated",
      "confidence": 0.9,
      "price_label": "Real price|Estimated price",
      "alternatives": [],
      "buying_tip": "Tip",
      "prescription_required": true
    }
  ],
  "summary_tip": "Money-saving tip"
}

RULES:
1. If REAL price data is provided in context, use it, set source="real" and confidence=0.9.
2. If NO real data is provided, use your knowledge, set source="estimated" and confidence=0.4.
3. Never return a price without a source label.
4. If medicine is common (paracetamol, ibuprofen, etc.) and real data fails, provide very accurate estimates based on last known Indian market rates.
5. Return ONLY valid JSON. No text outside the JSON object. """

    user_prompt = f"""Medicines to check:
{chr(10).join(f"- {m}" for m in medicines)}

Real-time scraped price data:
{scraped_context if scraped_context.strip() else "Scraping unavailable - use accurate estimates"}

Language: {req.language}
Provide complete price comparison using real data where available."""

    try:
        response = await medical_llm_response([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])

        text = response.strip()
        print("LLM RAW (first 300 chars):", text[:300])
        
        data = extract_json(text)
        
        if data is None:
            print("Failed to extract JSON from LLM")
            return {
                "success": True,
                "data": [],
                "note": "AI response could not be parsed"
            }

        # Add scraping metadata
        data['scraping_attempted'] = True
        data['real_time_data'] = len(real_prices) > 0
        data['scraped_medicines'] = list(real_prices.keys())

        # ── Attach verification metadata per medicine ──────────────────────
        if 'medicines' in data and isinstance(data['medicines'], list):
            for med_entry in data['medicines']:
                # Try to match by corrected name or original name
                entry_name = (med_entry.get('name') or '').lower().strip()
                for raw_name, vr in verification_map.items():
                    if (
                        vr['corrected_name'].lower() == entry_name
                        or raw_name.lower() == entry_name
                        or normalize_medicine_name(raw_name) == entry_name
                    ):
                        med_entry['verification'] = {
                            'input_name':          vr['input_name'],
                            'original_name':       vr['original_name'],
                            'corrected_name':      vr['corrected_name'],
                            'verified':            vr['verified'],
                            'verification_status': vr['verification_status'],
                            'confidence':          vr['confidence'],
                            'similarity_score':    vr['similarity_score'],
                            'confidence_reason':   vr['confidence_reason'],
                            'source':              vr['source'],
                            'standardized':        vr['standardized'],
                        }
                        # Surface uses/warnings at the medicine level if empty
                        if vr.get('uses') and not med_entry.get('uses'):
                            med_entry['uses'] = vr['uses']
                        if vr.get('warnings') and not med_entry.get('warnings'):
                            med_entry['warnings'] = vr['warnings']
                        break

        data['verification_summary'] = [
            {
                'input':               vr['input_name'],
                'original_name':       vr['original_name'],
                'corrected':           vr['corrected_name'],
                'verified':            vr['verified'],
                'verification_status': vr['verification_status'],
                'confidence':          vr['confidence'],
                'similarity_score':    vr['similarity_score'],
                'confidence_reason':   vr['confidence_reason'],
                'source':              vr['source'],
            }
            for vr in verification_results
        ]

        if not data or not data.get('medicines'):
            return {
                "success": True,
                "data": [],
                "note": "No pricing data found for this medicine"
            }

        return {"success": True, "data": data}

    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": True,
            "data": [],
            "error": str(e),
            "note": "A system error occurred while fetching prices"
        }


# ── Drug interaction endpoint (W2 prep) ─────────────────────
@router.post("/interactions")
async def check_drug_interactions(
    req: PriceCheckRequest,  # Reuse model — medicines list
    current_user: models.User = Depends(get_current_user)
):
    """Check drug interactions using OpenFDA API + AI analysis."""
    import httpx
    print("Checking interactions for:", req.medicines)

    if not req.medicines or len(req.medicines) < 2:
        return {
            "success": True,
            "data": {
                "interactions": [],
                "safe_combinations": [],
                "overall_risk": "safe",
                "summary": "At least 2 medicines are required to check for interactions."
            },
            "note": "No interactions found"
        }

    # Fetch FDA interaction data
    fda_data = []
    async with httpx.AsyncClient(timeout=10) as client:
        for med in req.medicines[:5]:
            try:
                search = med.split()[0].lower()
                print("Calling OpenFDA for interaction:", med)
                url = (
                    f"https://api.fda.gov/drug/label.json?"
                    f"search=warnings:{search}&limit=1"
                )
                res = await client.get(url)
                print("OpenFDA interaction response:", res.status_code, res.text[:200])
                if res.status_code == 200:
                    data = res.json()
                    results = data.get('results', [])
                    if results:
                        warnings = results[0].get('drug_interactions', [''])[0]
                        if warnings:
                            fda_data.append({
                                'medicine': med,
                                'fda_warnings': warnings[:500]
                            })
            except Exception as e:
                print(f"FDA interaction lookup error for {med}:", str(e))
                continue

    # AI analysis of interactions
    from app.services.llm_service import medical_llm_response
    import json as json_mod

    fda_context = "\n".join(
        f"{d['medicine']}: {d['fda_warnings']}"
        for d in fda_data
    ) if fda_data else "No specific FDA interaction data found. Use your medical knowledge."

    system_prompt = """You are a clinical pharmacist checking drug interactions.
Respond ONLY with valid JSON:
{
  "interactions": [
    {
      "medicine_1": "First medicine",
      "medicine_2": "Second medicine",
      "severity": "major|moderate|minor|none",
      "description": "What the interaction causes",
      "recommendation": "What patient should do",
      "source": "FDA data|Medical knowledge"
    }
  ],
  "safe_combinations": ["Safe pair 1", "Safe pair 2"],
  "overall_risk": "high|medium|low|safe",
  "consult_doctor": true or false,
  "summary": "Plain language summary"
}
Use FDA data provided. Be accurate and conservative."""

    user_prompt = f"""Check interactions between:
{chr(10).join(f"- {m}" for m in req.medicines)}

FDA Data:
{fda_context}

Language: {req.language}"""

    try:
        response = await medical_llm_response([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        text = response.strip()
        
        # Robust JSON extraction: take everything between first { and last }
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx+1]
        
        try:
            data, index = json_mod.JSONDecoder().raw_decode(text)
        except json_mod.JSONDecodeError as je:
            print("Interaction JSON Decode Error:", str(je))
            raise je
        
        if not data.get('interactions') and not data.get('safe_combinations'):
             return {
                "success": True,
                "data": data,
                "note": "No interactions found"
            }

        return {"success": True, "data": data, "fda_data_used": len(fda_data) > 0}

    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e)
        }


# ── Medicine info endpoint ───────────────────────────────────

class MedicineInfoRequest(BaseModel):
    medicine_name: str
    dosage: str = ""
    language: str = "english"

@router.post("/medicine-info")
async def get_medicine_info(
    req: MedicineInfoRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Get medicine information from web + AI.
    Runs the medicine through the verification layer first, then
    uses OpenFDA API for verified drug data, falls back to AI knowledge.
    """
    import httpx
    import json as json_mod
    from app.services.llm_service import medical_llm_response

    # ── Step 0: Verify & correct the medicine name ─────────────────────────
    verification = await verify_medicine(req.medicine_name)
    verified_name = verification["corrected_name"] if verification["verified"] else req.medicine_name
    logger.info(
        f"medicine-info: '{req.medicine_name}' → verified='{verified_name}' "
        f"(confidence={verification['confidence']}, source={verification['source']})"
    )

    fda_data = {}
    web_verified = False

    # Step 1: Search OpenFDA for real medicine data
    # Prefer the verified corrected name for the search term
    try:
        search_term = verified_name.split()[0]
        async with httpx.AsyncClient(timeout=8) as client:
            # Try brand name search
            res = await client.get(
                f"https://api.fda.gov/drug/label.json?"
                f"search=openfda.brand_name:{search_term}&limit=1"
            )
            if res.status_code == 200:
                data = res.json()
                results = data.get('results', [])
                if results:
                    label = results[0]
                    fda_data = {
                        'brand_name': label.get('openfda', {}).get('brand_name', [verified_name])[0],
                        'generic_name': label.get('openfda', {}).get('generic_name', [''])[0],
                        'purpose': ' '.join(label.get('purpose', []))[:300],
                        'indications': ' '.join(label.get('indications_and_usage', []))[:400],
                        'warnings': ' '.join(label.get('warnings', []))[:300],
                        'dosage_admin': ' '.join(label.get('dosage_and_administration', []))[:300],
                        'side_effects': ' '.join(label.get('adverse_reactions', []))[:300],
                    }
                    web_verified = True

            # If brand search failed, try generic name
            if not fda_data:
                res = await client.get(
                    f"https://api.fda.gov/drug/label.json?"
                    f"search=openfda.generic_name:{search_term}&limit=1"
                )
                if res.status_code == 200:
                    data = res.json()
                    results = data.get('results', [])
                    if results:
                        label = results[0]
                        fda_data = {
                            'brand_name': label.get('openfda', {}).get('brand_name', [verified_name])[0],
                            'generic_name': label.get('openfda', {}).get('generic_name', [''])[0],
                            'purpose': ' '.join(label.get('purpose', []))[:300],
                            'indications': ' '.join(label.get('indications_and_usage', []))[:400],
                            'warnings': ' '.join(label.get('warnings', []))[:300],
                            'dosage_admin': ' '.join(label.get('dosage_and_administration', []))[:300],
                            'side_effects': ' '.join(label.get('adverse_reactions', []))[:300],
                        }
                        web_verified = True

        # Merge pre-fetched verification FDA data if OpenFDA above returned nothing
        if not fda_data and verification.get('uses'):
            fda_data = {
                'brand_name':  verified_name,
                'generic_name': verification.get('generic_name', verified_name),
                'purpose':     verification.get('uses', ''),
                'indications': verification.get('uses', ''),
                'warnings':    verification.get('warnings', ''),
                'dosage_admin': '',
                'side_effects': '',
            }
            web_verified = verification['verified']

    except Exception as e:
        logger.warning(f"FDA lookup failed: {e}")

    # Step 2: Use AI with FDA context to generate clear explanation
    fda_context = ""
    if fda_data:
        fda_context = f"""
Real FDA data found:
- Brand name: {fda_data.get('brand_name', '')}
- Generic name: {fda_data.get('generic_name', '')}
- Purpose: {fda_data.get('purpose', '')}
- Indications: {fda_data.get('indications', '')}
- Side effects: {fda_data.get('side_effects', '')}
- Dosage: {fda_data.get('dosage_admin', '')}
- Warnings: {fda_data.get('warnings', '')}
"""

    system_prompt = """You are a friendly pharmacist in India explaining
a medicine to a patient in simple language.
Use the FDA data provided if available, otherwise use your knowledge.
Focus on Indian context — mention Indian brand names where known.

Respond ONLY with valid JSON:
{
  "verified_name": "Correct medicine name (corrected if needed)",
  "generic_name": "Generic/salt name",
  "indian_brands": ["Common Indian brand names"],
  "category": "Medicine category (antibiotic, painkiller, etc)",
  "used_for": "Simple explanation of what this medicine treats",
  "how_it_works": "Simple explanation of how it works in the body",
  "how_to_take": "Clear instructions on how to take this medicine",
  "common_side_effects": [
    "Side effect 1",
    "Side effect 2",
    "Side effect 3"
  ],
  "important_warnings": [
    "Important warning 1",
    "Important warning 2"
  ],
  "avoid_with": ["What to avoid while taking this medicine"],
  "food_interactions": "Any food/drink interactions",
  "prescription_required": true or false,
  "web_verified": true or false,
  "safety_rating": "safe|use_with_caution|prescription_only",
  "patient_tip": "One practical tip for taking this medicine correctly"
}

Rules:
- Use simple language a patient can understand
- Mention Indian context where relevant
- Be accurate — patient safety is critical
- If medicine name seems wrong from prescription, correct it in verified_name
- Respond in Telugu if language is telugu

CRITICAL: Your response must start with { and end with }
Do not add any text before or after the JSON object.
Do not use markdown formatting."""

    user_prompt = f"""Medicine: {verified_name}
Original input: {req.medicine_name}
Dosage: {req.dosage or 'Not specified'}
Language: {req.language}
{fda_context[:500] if fda_context else 'Use medical knowledge for this Indian medicine.'}

Return JSON only. Keep each field concise — max 2 sentences per field."""

    try:
        response = await medical_llm_response([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])

        text = response.strip()

        # Remove markdown code blocks
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()

        # Extract JSON object if surrounded by other text
        import re as re_mod
        json_match = re_mod.search(r'\{.*\}', text, re_mod.DOTALL)
        if json_match:
            text = json_match.group()

        try:
            data = json_mod.loads(text)
        except json.JSONDecodeError:
            # If JSON fails, build basic response from AI text
            logger.warning(f"JSON parse failed, building fallback response")
            data = {
                "verified_name": req.medicine_name,
                "generic_name": "",
                "indian_brands": [],
                "category": "Medicine",
                "used_for": text[:300] if len(text) > 50 else "Information not available",
                "how_it_works": "",
                "how_to_take": f"Take {req.medicine_name} as prescribed by your doctor.",
                "common_side_effects": [],
                "important_warnings": ["Always take as prescribed by your doctor"],
                "avoid_with": [],
                "food_interactions": "",
                "prescription_required": True,
                "web_verified": False,
                "safety_rating": "use_with_caution",
                "patient_tip": "Always consult your doctor or pharmacist before taking this medicine."
            }

        data['web_verified'] = web_verified
        data['fda_data_used'] = bool(fda_data)

        # ── Attach verification metadata ───────────────────────────────────
        data['verification'] = {
            'input_name':          verification['input_name'],
            'original_name':       verification['original_name'],
            'corrected_name':      verification['corrected_name'],
            'verified':            verification['verified'],
            'verification_status': verification['verification_status'],
            'confidence':          verification['confidence'],
            'similarity_score':    verification['similarity_score'],
            'confidence_reason':   verification['confidence_reason'],
            'source':              verification['source'],
            'standardized':        verification['standardized'],
        }

        return {"success": True, "data": data}

    except Exception as e:
        logger.error(f"Medicine info error: {e}")
        import traceback
        logger.error(traceback.format_exc())

        # Return basic fallback instead of error
        return {
            "success": True,
            "data": {
                "verified_name": req.medicine_name,
                "generic_name": "",
                "indian_brands": [],
                "category": "Medicine",
                "used_for": f"{req.medicine_name} is a medicine prescribed by your doctor.",
                "how_it_works": "Works as prescribed for your condition.",
                "how_to_take": "Take exactly as prescribed by your doctor.",
                "common_side_effects": ["Consult doctor if you feel unwell"],
                "important_warnings": [
                    "Always take as prescribed",
                    "Do not stop without consulting doctor"
                ],
                "avoid_with": [],
                "food_interactions": "Ask your pharmacist about food interactions.",
                "prescription_required": True,
                "web_verified": False,
                "safety_rating": "use_with_caution",
                "patient_tip": "Always consult your doctor or pharmacist for guidance on this medicine.",
                "fda_data_used": False,
                "fallback": True
            }
        }
