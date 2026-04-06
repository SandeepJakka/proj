"""
medicine_verification_service.py
──────────────────────────────────
Verifies and standardizes medicine names extracted from OCR / prescriptions.

Pipeline:
  1. Normalize input (strip dosage, lowercase, trim)
  2. Fuzzy-match against a local India medicines dataset (rapidfuzz)
  3. If confidence ≥ threshold → mark as locally verified
  4. Otherwise → query OpenFDA for fallback verification
  5. Return structured VerificationResult dict

Caching:
  In-process LRU-style dict cache (_verification_cache) prevents repeat
  API calls for the same medicine within a single server process lifetime.
"""

import re
import json
import logging
from pathlib import Path
from typing import Optional

import httpx
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
LOCAL_MATCH_THRESHOLD = 80          # rapidfuzz score 0–100; ≥ this → locally verified
FDA_TIMEOUT_SECONDS   = 8

# Dosage patterns to strip before matching
_DOSAGE_RE = re.compile(
    r"""
    \b
    (?:
        \d+(?:\.\d+)?          # number (integer or decimal)
        \s*
        (?:mg|mcg|g|ml|iu|units?|caps?|tablets?|tab|cap|syrup|drops?|cream|gel|ointment|suspension|injection|inj|spray|patch)
        \b
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Extra noise words common in Indian prescription OCR
_NOISE_RE = re.compile(
    r"\b(od|bd|tds|sos|prn|stat|once daily|twice daily|after food|before food|with food|as directed|for|days?|weeks?|months?)\b",
    re.IGNORECASE,
)

# ── Local dataset ──────────────────────────────────────────────────────────────
_dataset_path = Path(__file__).parent / "data" / "india_medicines.json"

def _load_local_dataset() -> list[str]:
    try:
        with open(_dataset_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return [str(m).lower().strip() for m in data if m]
    except Exception as e:
        logger.warning(f"Could not load local medicine dataset: {e}")
    return []

_LOCAL_MEDICINES: list[str] = _load_local_dataset()

# ── In-process cache ───────────────────────────────────────────────────────────
_verification_cache: dict[str, dict] = {}


# ── Step 1: Normalize ─────────────────────────────────────────────────────────

def clean_medicine_input(text: str) -> str:
    """
    Stricter cleaning for medicine inputs, removing dosage, noise words,
    numbers, and non-alphabetic characters.
    """
    if not text:
        return ""

    text = text.lower()

    # Remove dosage patterns (e.g., 500mg, 10 ml, 2mg/ml)
    text = re.sub(r'\b\d+\s*(mg|ml|mcg|g|kg|iu)\b', '', text)

    # Remove standalone numbers
    text = re.sub(r'\b\d+\b', '', text)

    # Remove common noise words
    noise_words = [
        "tablet", "tab", "capsule", "cap", "syrup",
        "injection", "inj", "dose", "daily", "twice",
        "once", "od", "bd", "tid", "qid", "after",
        "before", "food", "meal", "morning", "night"
    ]

    for word in noise_words:
        text = re.sub(rf'\b{word}\b', '', text)

    # Remove non-alphabetic characters
    text = re.sub(r'[^a-z\s]', ' ', text)

    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def extract_primary_medicine(text: str) -> str:
    """
    Extracts the first meaningful word from the cleaned text.
    Medicine names are typically the first token.
    """
    if not text:
        return ""

    tokens = text.split()
    return tokens[0] if tokens else ""


def normalize_medicine_name(raw_name: str) -> str:
    """
    Legacy wrapper for cleaning logic.
    """
    return clean_medicine_input(raw_name)


# ── Step 2: Fuzzy Match ───────────────────────────────────────────────────────

def fuzzy_match_local(normalized: str) -> tuple[Optional[str], float]:
    """
    Returns (best_match_name, score_0_to_100) against the local dataset.
    Uses token_set_ratio for robustness against word-order variance.
    """
    if not _LOCAL_MEDICINES:
        return None, 0.0

    result = process.extractOne(
        normalized,
        _LOCAL_MEDICINES,
        scorer=fuzz.token_set_ratio,
        score_cutoff=0,         # return best even if low
    )
    if result is None:
        return None, 0.0

    matched_name, score, _ = result
    return matched_name, float(score)


# ── Step 3 & 4: OpenFDA Fallback ──────────────────────────────────────────────

async def _query_openfda(medicine_name: str) -> dict:
    """
    Queries OpenFDA drug label API for the given medicine name.
    Tries brand name first, then generic name.
    Returns partial FDA label dict or empty dict on failure.
    """
    search_term = medicine_name.split()[0]   # use first word for API query
    endpoints = [
        f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{search_term}&limit=1",
        f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{search_term}&limit=1",
    ]

    async with httpx.AsyncClient(timeout=FDA_TIMEOUT_SECONDS) as client:
        for url in endpoints:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    if results:
                        label = results[0]
                        openfda = label.get("openfda", {})
                        return {
                            "brand_name":    openfda.get("brand_name",   [medicine_name])[0],
                            "generic_name":  openfda.get("generic_name", [""])[0],
                            "purpose":       " ".join(label.get("purpose",  []))[:300].strip(),
                            "indications":   " ".join(label.get("indications_and_usage", []))[:400].strip(),
                            "warnings":      " ".join(label.get("warnings", []))[:300].strip(),
                            "side_effects":  " ".join(label.get("adverse_reactions", []))[:300].strip(),
                        }
            except Exception as e:
                logger.warning(f"OpenFDA query failed ({url}): {e}")

    return {}


# ── Main Public API ────────────────────────────────────────────────────────────

async def verify_medicine(raw_name: str) -> dict:
    """
    Full verification pipeline for a single medicine name.
    """
    # ── 0. Sanitize Input ───────────────────────────────────────────────────
    raw_name = str(raw_name).strip() if raw_name else ""
    
    # ── 1. Cache hit ────────────────────────────────────────────────────────
    cache_key = raw_name.lower().strip()
    if cache_key in _verification_cache:
        logger.debug(f"Cache hit for '{raw_name}'")
        return _verification_cache[cache_key]

    # ── 2. Cleaning & Normalization ─────────────────────────────────────────
    cleaned_input = clean_medicine_input(raw_name).strip()
    extracted_name = extract_primary_medicine(cleaned_input).strip()

    # Fixed Debug Logging
    print("[CLEANING]", {
        "original": raw_name,
        "cleaned": cleaned_input,
        "extracted": extracted_name
    })

    # Safety Fallback
    normalized = extracted_name
    if not normalized or len(normalized) < 3:
        normalized = raw_name.lower().strip()

    # Pre-initialize result variables to avoid mutation bugs
    corrected_name = normalized
    verified = False
    verification_status = "unverified"
    confidence = 0.0
    similarity_score = 0
    confidence_reason = "No reliable match found"
    source = "unverified"
    uses = ""
    warnings = ""
    generic_name = normalized
    
    # ── 3. Step: Fuzzy match against local DB ───────────────────────────────
    if normalized:
        matched_name, score = fuzzy_match_local(normalized)
        confidence_local = round(float(score) / 100, 4)
        
        if matched_name and score >= LOCAL_MATCH_THRESHOLD:
            # Locally verified
            corrected_name = matched_name.strip()
            verified = True
            verification_status = "local"
            confidence = confidence_local
            similarity_score = int(round(score))
            confidence_reason = "High fuzzy match with local dataset"
            source = "local_db"
            generic_name = corrected_name

            # Optional enrich from FDA
            fda_data = await _query_openfda(corrected_name)
            if fda_data:
                uses = fda_data.get("indications") or fda_data.get("purpose") or ""
                warnings = fda_data.get("warnings", "")
                generic_name = fda_data.get("generic_name") or corrected_name
        
        elif fda_data_item := await _query_openfda(normalized):
            # ── 4. Step: OpenFDA fallback ───────────────────────────────────
            fda_corrected = fda_data_item.get("generic_name") or fda_data_item.get("brand_name") or normalized
            fda_corrected = fda_corrected.lower().strip()

            # Cross-check for confidence boost
            _, local_score_after_fda = fuzzy_match_local(fda_corrected)
            in_local = local_score_after_fda >= LOCAL_MATCH_THRESHOLD

            corrected_name = fda_corrected
            verified = True
            verification_status = "openfda"
            confidence = round(0.75 + (0.1 if in_local else 0.0), 4)
            similarity_score = int(round(score)) # raw score from first match attempt
            confidence_reason = "Verified using OpenFDA data"
            source = "openfda"
            uses = fda_data_item.get("indications") or fda_data_item.get("purpose") or ""
            warnings = fda_data_item.get("warnings", "")
            generic_name = fda_data_item.get("generic_name", fda_corrected)

        elif matched_name:
            # ── 5. Step: Best-guess (still unverified) ──────────────────────
            corrected_name = matched_name.strip()
            confidence = confidence_local
            similarity_score = int(round(score))
            confidence_reason = "Low similarity match, possible OCR error"

    # ── 6. Final Result Construction ────────────────────────────────────────
    # Sanitize and Validate Types
    assert isinstance(cleaned_input, str)
    assert isinstance(extracted_name, str)
    assert isinstance(corrected_name, str)

    result = {
        "input_name":          raw_name,
        "original_name":       raw_name,
        "cleaned_input":       cleaned_input.strip(),
        "extracted_name":      extracted_name.strip(),
        "corrected_name":      corrected_name.strip(),
        "verified":            bool(verified),
        "verification_status": str(verification_status),
        "confidence":          float(confidence),
        "similarity_score":    int(similarity_score),
        "confidence_reason":   str(confidence_reason),
        "source":              str(source),
        "uses":                str(uses),
        "warnings":            str(warnings),
        "generic_name":        str(generic_name),
        "standardized":        bool(verified or source == "local_db" or source == "openfda")
    }

    # Final JSON Validation
    try:
        json.dumps(result)
    except Exception as e:
        logger.error(f"JSON integrity error in verification result: {e}")
        # Return a safe minimal response if corruption occurred
        return _unverified_result(raw_name, raw_name)

    _verification_cache[cache_key] = result
    return result


async def verify_medicines_batch(medicine_names: list[str]) -> list[dict]:
    """
    Verify a list of medicine names concurrently.
    Returns results in the same order.
    """
    import asyncio
    tasks = [verify_medicine(name) for name in medicine_names]
    return await asyncio.gather(*tasks)


# ── Internal helpers ───────────────────────────────────────────────────────────

def _unverified_result(raw_name: str, corrected_name: str) -> dict:
    return {
        "input_name":          raw_name,
        "original_name":       raw_name,
        "cleaned_input":       raw_name.lower(),
        "extracted_name":      raw_name.lower(),
        "corrected_name":      corrected_name,
        "verified":            False,
        "verification_status": "unverified",
        "confidence":          0.0,
        "similarity_score":    0,
        "confidence_reason":   "No reliable match found",
        "source":              "unverified",
        "uses":                "",
        "warnings":            "",
        "generic_name":        corrected_name,
        "standardized":        False,
    }
