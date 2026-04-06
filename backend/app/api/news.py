from fastapi import APIRouter
import os
import logging
import random

router = APIRouter(prefix="/api/news", tags=["Health News"])
logger = logging.getLogger(__name__)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# ── Per-category query pools ──────────────────────────────────────────────────
# We pick ONE query randomly from each pool every call → different results each time

MEDICAL_QUERIES = [
    "latest disease treatment hospital patient news 2025",
    "new medicine drug approval clinical trial 2025",
    "surgery vaccine infection outbreak health news 2025",
    "cancer diabetes heart disease stroke news 2025",
]

WELLNESS_QUERIES = [
    "nutrition diet fitness exercise wellness tips 2025",
    "mental health sleep stress anxiety prevention 2025",
    "weight loss healthy eating lifestyle habits 2025",
]

RESEARCH_QUERIES = [
    "medical research breakthrough study published 2025",
    "WHO ICMR FDA health policy research findings 2025",
    "clinical trial pharmaceutical drug discovery 2025",
]

# ── Keyword filters per category ──────────────────────────────────────────────

MEDICAL_KEYWORDS = {
    "disease", "illness", "disorder", "treatment", "therapy", "surgery",
    "hospital", "clinic", "doctor", "physician", "patient", "diagnosis",
    "symptom", "vaccine", "vaccination", "drug", "medication", "pharmaceutical",
    "clinical", "cancer", "diabetes", "heart", "cardiac", "stroke", "infection",
    "virus", "bacteria", "covid", "pandemic", "epidemic", "immune", "immunity",
    "antibody", "antibiotic", "medical", "medicine", "health",
}

WELLNESS_KEYWORDS = {
    "nutrition", "diet", "fitness", "exercise", "mental health", "wellness",
    "obesity", "weight", "sleep", "stress", "anxiety", "depression",
    "blood pressure", "cholesterol", "allergy", "asthma", "arthritis",
    "lifestyle", "healthy eating", "mindfulness", "yoga", "hydration",
}

RESEARCH_KEYWORDS = {
    "study", "research", "trial", "who", "icmr", "fda", "findings",
    "breakthrough", "published", "journal", "scientists", "discovery",
    "clinical trial", "pharmaceutical", "evidence", "analysis",
}

FALLBACK_NEWS = [
    {
        "title": "Stay hydrated — drink 8 glasses of water daily",
        "description": "Hydration is essential for kidney function, energy levels, and overall health.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "wellness",
    },
    {
        "title": "Regular health checkups recommended every 6 months",
        "description": "Early detection saves lives. Schedule your preventive checkup today.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "medical",
    },
    {
        "title": "New research links poor sleep to increased cardiac risk",
        "description": "Scientists found adults sleeping under 6 hours show 20% higher cardiovascular risk.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "research",
    },
    {
        "title": "7-8 hours of sleep improves immunity and mental health",
        "description": "Quality sleep is one of the most powerful tools for disease prevention.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "wellness",
    },
    {
        "title": "WHO recommends annual flu vaccination for elderly",
        "description": "Influenza vaccination significantly reduces hospital admissions in those over 60.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "medical",
    },
    {
        "title": "ICMR study: 30 min daily walk cuts diabetes risk by 40%",
        "description": "A landmark ICMR multi-city study confirms walking as the most effective prevention.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "research",
    },
    {
        "title": "Hospitals report rise in dengue cases this monsoon",
        "description": "Health authorities urge preventive measures as cases spike across South India.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "medical",
    },
    {
        "title": "Mediterranean diet linked to lower Alzheimer's risk",
        "description": "A 10-year study links olive oil-rich diets to reduced cognitive decline.",
        "link": "", "published": "", "source": "Healthora Tips",
        "image": None, "category": "research",
    },
]


@router.get("/health-news")
async def get_health_news():
    """
    Fetch categorised health news via the Tavily Search API.
    Returns: 4 medical, 2 wellness, 2 research articles.
    Each call picks different random queries → fresh results on every refresh.
    """
    if not TAVILY_API_KEY:
        logger.warning("TAVILY_API_KEY not set — returning fallback news")
        return _fallback_response()

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)

        medical  = await _fetch_category(client, MEDICAL_QUERIES,  MEDICAL_KEYWORDS,  n=4)
        wellness = await _fetch_category(client, WELLNESS_QUERIES, WELLNESS_KEYWORDS, n=2)
        research = await _fetch_category(client, RESEARCH_QUERIES, RESEARCH_KEYWORDS, n=2)

        # Tag each article with its category
        for a in medical:  a["category"] = "medical"
        for a in wellness: a["category"] = "wellness"
        for a in research: a["category"] = "research"

        all_news = medical + wellness + research

        if not all_news:
            raise ValueError("All Tavily queries returned empty results")

        logger.info(
            f"News fetched — medical:{len(medical)} wellness:{len(wellness)} research:{len(research)}"
        )
        return {
            "news": all_news,
            "count": len(all_news),
            "sources": list({n["source"] for n in all_news if n["source"]}),
            "powered_by": "tavily",
            "breakdown": {"medical": len(medical), "wellness": len(wellness), "research": len(research)},
        }

    except Exception as e:
        logger.error(f"Tavily health news fetch failed: {e}")
        return _fallback_response()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_category(client, query_pool: list, keywords: set, n: int) -> list:
    """
    Pick a random query from the pool, fetch from Tavily, filter by keywords,
    shuffle results, and return up to n unique articles.
    """
    query = random.choice(query_pool)
    try:
        response = client.search(
            query=query,
            search_depth="advanced",   # returns full article content
            max_results=n + 6,         # buffer so filtering doesn't leave us short
            include_images=True,
            topic="news",
            days=3,                    # only articles from last 3 days → always fresh
        )
        results = response.get("results", [])

        # Build article dicts
        articles = []
        seen: set[str] = set()
        for r in results:
            title = r.get("title", "").strip()
            if not title or title.lower() in seen:
                continue
            full_content = (r.get("content") or r.get("raw_content") or "").strip()
            preview      = full_content[:300] + ("…" if len(full_content) > 300 else "")
            article = {
                "title":        title,
                "description":  preview,          # short preview for the card
                "content":      full_content,      # full text for the reader modal
                "link":         r.get("url", ""),
                "published":    r.get("published_date", ""),
                "source":       _extract_source(r.get("url", "")),
                "source_url":   r.get("url", ""),
                "image":        r.get("image"),
                "score":        r.get("score", 0),
            }
            if _matches(article, keywords):
                seen.add(title.lower())
                articles.append(article)

        # Sort by score descending first, then shuffle the top results for variety
        articles.sort(key=lambda x: x.get("score", 0), reverse=True)
        top = articles[:n + 2]
        random.shuffle(top)
        return top[:n]

    except Exception as e:
        logger.warning(f"Tavily query failed ('{query}'): {e}")
        return []


def _matches(article: dict, keywords: set) -> bool:
    """Return True if the article title+description contains any keyword."""
    text = f"{article.get('title', '')} {article.get('description', '')}".lower()
    return any(kw in text for kw in keywords)


def _fallback_response() -> dict:
    news = list(FALLBACK_NEWS)
    random.shuffle(news)
    return {
        "news": news,
        "count": len(news),
        "sources": ["Healthora Tips"],
        "powered_by": "fallback",
        "breakdown": {"medical": 2, "wellness": 2, "research": 2},
    }


def _extract_source(url: str) -> str:
    """Extract a human-readable source name from a URL."""
    try:
        from urllib.parse import urlparse
        hostname = urlparse(url).netloc.replace("www.", "")
        parts = hostname.split(".")
        return parts[0].capitalize() if parts else hostname
    except Exception:
        return "News"
