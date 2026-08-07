from typing import List, Dict, Any
import hashlib

class Embedder:
    async def embed_text(self, text: str) -> List[float]:
        # Fallback to simple hash-based pseudo-embedding if Gemini not configured properly
        # In real code, use genai to generate embeddings
        h = hashlib.sha256(text.encode()).digest()
        return [float(b)/255.0 for b in h[:128]]  # Dummy 128-dim embedding
        
    async def embed_chunks(self, chunks: List[str], document_id: str) -> None:
        # Store embeddings in pgvector here
        pass

    async def search_similar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        # Search pgvector
        return []
