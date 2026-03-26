from fastapi import APIRouter
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
import logging

router = APIRouter(prefix="/api/news", tags=["Health News"])
logger = logging.getLogger(__name__)

RSS_FEEDS = [
    {
        "name": "NDTV Health",
        "url": "https://feeds.feedburner.com/ndtvnews-health",
        "backup": "https://www.ndtv.com/rss/health"
    },
    {
        "name": "Times of India Health",
        "url": "https://timesofindia.indiatimes.com/rssfeeds/3908999.cms",
        "backup": None
    },
    {
        "name": "WHO News",
        "url": "https://www.who.int/rss-feeds/news-english.xml",
        "backup": None
    },
    {
        "name": "The Hindu Health",
        "url": "https://www.thehindu.com/sci-tech/health/feeder/default.rss",
        "backup": None
    }
]

def parse_rss_feed(xml_text: str, source_name: str) -> list:
    """Parse RSS XML and extract news items."""
    items = []
    try:
        root = ET.fromstring(xml_text)
        
        # Handle both RSS and Atom formats
        channel = root.find('channel')
        if channel is None:
            channel = root

        for item in channel.findall('item')[:5]:
            title_el = item.find('title')
            desc_el = item.find('description')
            link_el = item.find('link')
            pub_el = item.find('pubDate')

            title = title_el.text if title_el is not None else ''
            desc = desc_el.text if desc_el is not None else ''
            link = link_el.text if link_el is not None else ''
            pub = pub_el.text if pub_el is not None else ''

            # Clean HTML from description
            import re
            desc = re.sub(r'<[^>]+>', '', desc or '').strip()
            desc = desc[:200] + '...' if len(desc) > 200 else desc

            if title and title.strip():
                items.append({
                    'title': title.strip(),
                    'description': desc,
                    'link': link.strip(),
                    'published': pub.strip(),
                    'source': source_name
                })
    except Exception as e:
        logger.warning(f"RSS parse error for {source_name}: {e}")
    return items

@router.get("/health-news")
async def get_health_news():
    """
    Fetch real health news from RSS feeds.
    Returns latest news from multiple sources.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; Healthora/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml"
    }
    
    all_news = []
    
    async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
        for feed in RSS_FEEDS:
            try:
                res = await client.get(feed['url'], headers=headers)
                if res.status_code == 200:
                    items = parse_rss_feed(res.text, feed['name'])
                    all_news.extend(items)
                elif feed.get('backup'):
                    res = await client.get(feed['backup'], headers=headers)
                    if res.status_code == 200:
                        items = parse_rss_feed(res.text, feed['name'])
                        all_news.extend(items)
            except Exception as e:
                logger.warning(f"Feed fetch failed for {feed['name']}: {e}")
                continue
    
    # If all feeds fail, return curated static news
    if not all_news:
        all_news = [
            {
                'title': 'Stay hydrated — drink 8 glasses of water daily',
                'description': 'Hydration is essential for kidney function and overall health.',
                'link': '',
                'published': '',
                'source': 'Healthora Tips'
            },
            {
                'title': 'Regular health checkups recommended every 6 months',
                'description': 'Early detection saves lives. Schedule your checkup today.',
                'link': '',
                'published': '',
                'source': 'Healthora Tips'
            }
        ]
    
    # Deduplicate by title
    seen = set()
    unique_news = []
    for item in all_news:
        if item['title'] not in seen:
            seen.add(item['title'])
            unique_news.append(item)
    
    return {
        "news": unique_news[:12],
        "count": len(unique_news[:12]),
        "sources": list(set(n['source'] for n in unique_news[:12]))
    }
