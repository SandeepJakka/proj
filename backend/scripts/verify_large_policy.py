import sys
import os
import logging
import asyncio

# Setup path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag.rag_service import RAGService
from app.db.models_insurance import InsurancePolicy

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("VerifyLargePolicy")

async def verify_large_policy():
    logger.info("🚀 Starting 200-page Policy Simulation...")
    
    rag_service = RAGService()
    doc_id = "test_large_document_support"
    
    # 1. Generate 200 pages of dummy text
    pages = []
    for i in range(1, 201):
        content = f"This is page {i} of the insurance policy. "
        if i == 1:
            content += "MARKER_START: The insurer for this policy is 'Astra Health'."
        elif i == 100:
            content += "MARKER_MIDDLE: The emergency helpline number is '1800-ASTRA-99'."
        elif i == 200:
            content += "MARKER_END: The registered address is 'Floor 42, Galaxy Towers, Hyderabad'."
        
        # Add some filler filler text to reach ~4000 characters per page (roughly 800k chars total)
        content += "Insurance policy terms and conditions detail. " * 80
        pages.append(content)
    
    full_text = "\n\n".join(pages)
    logger.info(f"Generated {len(full_text)} characters of text (~200 pages equivalent).")

    # 2. Index into RAG
    logger.info("Indexing into RAG (this simulates the background processing)...")
    await asyncio.to_thread(rag_service.load_text, doc_id, full_text)
    logger.info("✅ RAG Indexing complete.")

    # 3. Test Retrieval from Start, Middle, and End
    test_queries = [
        ("Who is the insurer?", "Astra Health"),
        ("What is the emergency helpline number?", "1800-ASTRA-99"),
        ("What is the registered address?", "Galaxy Towers")
    ]

    for question, expected in test_queries:
        logger.info(f"Querying: '{question}'")
        results = rag_service.query(doc_id, question, k=5)
        
        found = False
        for res in results:
            if expected.lower() in res['chunk'].lower():
                found = True
                logger.info(f"  ✅ Found marker: '{expected}' in chunk (dist: {res['distance']:.4f})")
                break
        
        if not found:
            logger.error(f"  ❌ FAILED to find '{expected}' in retrieved chunks!")
            # Log what was actually found for debugging
            for j, res in enumerate(results):
                logger.debug(f"    Chunk {j}: {res['chunk'][:100]}...")
    
    logger.info("🏁 Simulation finished.")

if __name__ == "__main__":
    asyncio.run(verify_large_policy())
