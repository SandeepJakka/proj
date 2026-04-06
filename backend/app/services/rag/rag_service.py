import os
from app.services.rag.document_loader import load_pdf
from app.services.rag.chunking import chunk_text
from app.services.rag.embedding import get_embeddings
from app.services.rag.vector_store import VectorStore

class RAGService:
    def __init__(self):
        self.documents = {}  # key: doc_id -> VectorStore

    def load_document(self, doc_id: str, file_path: str):
        store_path = f"rag_store/{doc_id}"
        vector_store = VectorStore()
        
        # Try loading existing
        if vector_store.load(store_path):
            self.documents[doc_id] = vector_store
            print(f"Loaded existing index for {doc_id} from {store_path}")
            return
            
        # Otherwise build new
        text = load_pdf(file_path)
        self.load_text(doc_id, text)

    def load_text(self, doc_id: str, text: str):
        store_path = f"rag_store/{doc_id}"
        vector_store = VectorStore()

        chunks = chunk_text(text)
        embeddings = get_embeddings(chunks)

        vector_store.build(embeddings, chunks)
        
        # Save to disk
        vector_store.save(store_path)

        self.documents[doc_id] = vector_store
        print(f"Built and saved new index for {doc_id} to {store_path}")

    def query(self, doc_id: str, question: str, k=3):
        if doc_id not in self.documents:
            # Try to auto-load if missing but on disk
            store_path = f"rag_store/{doc_id}"
            vector_store = VectorStore()
            if vector_store.load(store_path):
                self.documents[doc_id] = vector_store
            else:
                return []

        vector_store = self.documents[doc_id]

        query_embedding = get_embeddings([question])[0]
        return vector_store.search(query_embedding, k)

    def answer(self, doc_id: str, question: str, k=3):
        if doc_id not in self.documents:
            # Try to auto-load if missing but on disk
            store_path = f"rag_store/{doc_id}"
            vector_store = VectorStore()
            if vector_store.load(store_path):
                self.documents[doc_id] = vector_store
            else:
                return {
                    "answer": "Document not loaded",
                    "confidence": 0,
                    "source": "none"
                }

        results = self.query(doc_id, question, k)

        if not results:
            return {
                "answer": "No relevant information found",
                "confidence": 0,
                "source": "none"
            }

        chunks = [r["chunk"] for r in results]
        distances = [r["distance"] for r in results]

        if all(not c.strip() for c in chunks):
            return {
                "answer": "No relevant information found",
                "confidence": 0,
                "source": "none"
            }

        context = "\n\n".join(chunks)

        prompt = f"""
You are a medical AI assistant.

STRICT RULES:
1. Answer ONLY from the provided context
2. DO NOT use external knowledge
3. If answer is not clearly present -> say "Not found in document"
4. Return ONLY a clean, short answer sentence
5. Do NOT include explanations or extra text

Context:
{context}

Question:
{question}

Answer:
"""

        from groq import Groq
        import re
        client = Groq() # assumes GROQ_API_KEY is in environment

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )

        answer = response.choices[0].message.content.strip()

        # STEP 1: Remove everything after first strong sentence boundary
        # (Prevents chunk leakage)
        sentence_match = re.search(r'([A-Z][^.!?]*[.!?])', answer)
        if sentence_match:
            answer = sentence_match.group(1)
        else:
            answer = answer.split("\n")[0]

        # STEP 2: Remove bullet artifacts / OCR noise
        answer = re.sub(r'[-•]\s*\w+', '', answer)

        # STEP 3: Remove broken fragments like "nosis", "agnosis"
        answer = re.sub(r'\b[a-zA-Z]{1,4}\b(?=\s*[-])', '', answer)

        # STEP 4: Normalize whitespace
        answer = re.sub(r'\s+', ' ', answer)

        # STEP 5: Remove unwanted characters (but KEEP punctuation)
        answer = re.sub(r'[^a-zA-Z0-9.,()\s]', '', answer)

        # STEP 6: Final trim
        answer = answer.strip()

        if "not found" in answer.lower():
            confidence = 0.3
            hallucination = False
        else:
            similarity_scores = [1 / (1 + d) for d in distances]
            avg_similarity = sum(similarity_scores) / len(similarity_scores)
            
            context_relevance = min(1.0, len(" ".join(chunks)) / 1000)
            
            grounding_score = 0.3
            for chunk in chunks:
                if any(word in answer.lower() for word in chunk.lower().split()):
                    grounding_score = 1.0
                    break
                    
            confidence = (
                0.4 * avg_similarity +
                0.3 * context_relevance +
                0.3 * grounding_score
            )
            confidence = round(confidence, 2)
            hallucination = confidence < 0.5

        return {
            "answer": answer,
            "confidence": confidence,
            "hallucination_risk": hallucination,
            "source": "rag",
            "context_used": chunks
        }
