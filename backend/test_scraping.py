import httpx
from bs4 import BeautifulSoup
import re
import json
import asyncio

async def test_1mg_diagnostic(medicine_name):
    print(f"\n--- Checking 1mg for: {medicine_name} ---")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Referer": "https://www.1mg.com/",
    }
    
    search_query = medicine_name.strip().lower()
    search_url = f"https://www.1mg.com/search/all?name={search_query.replace(' ', '+')}"
    
    try:
        # Try without http2 first for compatibility if package install lagged
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(search_url, headers=headers)
            print(f"Status: {response.status_code}")
            
            html = response.text
            print(f"HTML Length: {len(html)}")
            print(f"Start of HTML: {html[:300]}...")
            
            if "verify" in html.lower() and "robot" in html.lower():
                print("!!! BLOCKED BY BOT PROTECTION !!!")
                return
            
            # Check price pattern
            prices = re.findall(r'₹\s*\d+(?:\.\d+)?', html)
            print(f"Raw prices found in HTML: {prices[:10]}")
            
            soup = BeautifulSoup(html, 'html.parser')
            scripts = soup.find_all('script', type='application/ld+json')
            print(f"Found {len(scripts)} JSON-LD scripts.")
            
            # Check if there are product cards at all
            cards = soup.find_all('div', class_=re.compile(r'style__product-card', re.I))
            print(f"Found {len(cards)} product cards using standard 1mg CSS classes.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_1mg_diagnostic("Aspirin"))
    asyncio.run(test_1mg_diagnostic("Dolo 650"))
