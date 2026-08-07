import pandas as pd
from parsers.base_parser import BaseParser
import os

class CSVParser(BaseParser):
    def parse(self, file_path: str) -> dict:
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        df = pd.read_csv(file_path)
        text_lines = []
        
        # Add headers
        text_lines.append(" | ".join([str(col) for col in df.columns]))
        
        # Add rows
        for _, row in df.iterrows():
            text_lines.append(" | ".join([str(val) for val in row.values]))
            
        combined_text = "\n".join(text_lines)
        cleaned_text = self._clean_text(combined_text)
        
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
