from typing import List, Dict
import google.generativeai as genai
from config import settings
from ai.embedder import Embedder

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class DPDPChatbot:
    def __init__(self):
        self.embedder = Embedder()
        self.system_prompt = "You are an Expert DPDP Act 2023 compliance advisor. Provide clear and legally sound advice."

    async def chat(self, message: str, conversation_history: List[Dict[str, str]]) -> str:
        if not settings.GEMINI_API_KEY:
            return "Gemini API key not configured."
            
        model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=self.system_prompt)
        
        context = await self.get_document_context(message)
        prompt = f"Context: {context}\n\nUser: {message}"
        
        response = model.generate_content(prompt)
        return response.text

    async def get_document_context(self, query: str) -> str:
        similar_chunks = await self.embedder.search_similar(query)
        context = " ".join([chunk.get("text", "") for chunk in similar_chunks])
        return context
