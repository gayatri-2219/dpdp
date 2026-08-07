from abc import ABC, abstractmethod
from typing import Dict, Any, List
import re

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Parse the file and return standard structure:
        {
            'text': str,
            'metadata': {'filename': str, 'pages': int, 'language': str, 'file_size': int},
            'pages': [{'page_num': int, 'text': str}]
        }
        """
        pass

    def _clean_text(self, text: str) -> str:
        """Utility to clean up extracted text."""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """Utility to chunk text with overlap."""
        if not text:
            return []
        
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks
