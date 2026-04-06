import os
import sys

# Ensure the app module can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.rag.document_loader import load_pdf
from app.services.rag.chunking import chunk_text
from app.services.rag.embedding import get_embeddings
from app.services.rag.vector_store import VectorStore

def main():
    pdf_path = "sample.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found. Run generate_sample_pdf.py first.")
        return

    print("1. Loading PDF...")
    text = load_pdf(pdf_path)
    print(f"Loaded {len(text)} characters.")
    
    print("\n2. Chunking text...")
    chunks = chunk_text(text, chunk_size=200, overlap=50) # Smaller chunks for testing
    print(f"Created {len(chunks)} chunks.")
    
    print("\n3. Generating embeddings...")
    embeddings = get_embeddings(chunks)
    print(f"Generated embeddings of shape {embeddings.shape}.")
    
    print("\n4. Building FAISS index...")
    store = VectorStore()
    store.build(embeddings, chunks)
    print("FAISS index built successfully.")
    
    print("\n5. Testing retrieval...")
    query = "What is diagnosis?"
    query_embedding = get_embeddings([query])[0]
    
    print(f"\nQuery: '{query}'")
    results = store.search(query_embedding, k=2)
    
    print("\nTop retrieved chunks:")
    for i, res in enumerate(results, 1):
        print(f"\n--- Chunk {i} ---")
        print(res.strip())

if __name__ == "__main__":
    main()
