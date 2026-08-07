import os
from PIL import Image, ImageOps
import pytesseract
from parsers.base_parser import BaseParser

class ImageParser(BaseParser):
    def parse(self, file_path: str) -> dict:
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        img = Image.open(file_path)
        # Preprocess: convert to grayscale
        img = ImageOps.grayscale(img)
        
        text = pytesseract.image_to_string(img)
        cleaned_text = self._clean_text(text)
        
        return {
            'text': cleaned_text,
            'metadata': {
                'filename': filename,
                'pages': 1,
                'language': 'en',
                'file_size': file_size
            },
            'pages': [{'page_num': 1, 'text': cleaned_text}]
        }
