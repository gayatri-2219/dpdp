import pandas as pd
from parsers.base_parser import BaseParser
import os

class ExcelParser(BaseParser):
    def parse(self, file_path: str) -> dict:
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        excel_file = pd.ExcelFile(file_path)
        pages_data = []
        full_text = []
        
        page_num = 1
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            text_lines = []
            text_lines.append(f"Sheet: {sheet_name}")
            text_lines.append(" | ".join([str(col) for col in df.columns]))
            
            for _, row in df.iterrows():
                text_lines.append(" | ".join([str(val) for val in row.values]))
                
            sheet_text = "\n".join(text_lines)
            cleaned_text = self._clean_text(sheet_text)
            
            pages_data.append({"page_num": page_num, "text": cleaned_text})
            full_text.append(cleaned_text)
            page_num += 1
            
        combined_text = "\n\n".join(full_text)
        
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
