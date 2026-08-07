import os
from parsers.base_parser import BaseParser

class TXTParser(BaseParser):
    def parse(self, file_path: str) -> dict:
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        text = ""
        # Try reading with utf-8 first, fallback to latin-1
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                text = f.read()
                
        # Split into pages by form feed or 100-line chunks
        pages_data = []
        if '\f' in text:
            pages_text = text.split('\f')
        else:
            lines = text.splitlines()
            pages_text = ["\n".join(lines[i:i+100]) for i in range(0, len(lines), 100)]
            
        for i, page_text in enumerate(pages_text):
            cleaned_text = self._clean_text(page_text)
            pages_data.append({"page_num": i + 1, "text": cleaned_text})
            
        combined_text = "\n\n".join([p["text"] for p in pages_data])
        
        return {
            'text': combined_text,
            'metadata': {
                'filename': filename,
                'pages': len(pages_data),
                'language': 'en',
                'file_size': file_size
            },
            'pages': pages_data
        }
