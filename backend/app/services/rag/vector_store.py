import faiss
import numpy as np
import pickle
import os

class VectorStore:
    def __init__(self):
        self.index = None
        self.text_chunks = []
        
    def build(self, embeddings, chunks):
        dim = len(embeddings[0])
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(np.array(embeddings))
        self.text_chunks = chunks
        
    def search(self, query_embedding, k=3):
        distances, indices = self.index.search(
            np.array([query_embedding]), k
        )
        
        results = []
        for i, idx in enumerate(indices[0]):
            results.append({
                "chunk": self.text_chunks[idx],
                "distance": float(distances[0][i])
            })
            
        return results

    def save(self, path: str):
        os.makedirs(path, exist_ok=True)
        # Save FAISS index
        faiss.write_index(self.index, f"{path}/index.faiss")
        # Save chunks
        with open(f"{path}/chunks.pkl", "wb") as f:
            pickle.dump(self.text_chunks, f)

    def load(self, path: str):
        if not os.path.exists(f"{path}/index.faiss"):
            return False
            
        self.index = faiss.read_index(f"{path}/index.faiss")
        with open(f"{path}/chunks.pkl", "rb") as f:
            self.text_chunks = pickle.load(f)
            
        return True
