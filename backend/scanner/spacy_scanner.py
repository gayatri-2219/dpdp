import spacy
from .regex_patterns import PIIMatch
from typing import List

NER_LABELS = {'PERSON', 'ORG', 'GPE', 'LOC', 'FAC', 'NORP'}

class SpacyScanner:
    def __init__(self):
        self.nlp = None
        self.model_name = None
        for model in ['en_core_web_lg', 'en_core_web_md', 'en_core_web_sm']:
            try:
                self.nlp = spacy.load(model)
                self.model_name = model
                print(f"spaCy loaded: {model}")
                break
            except Exception:
                continue
        if not self.nlp:
            print("WARNING: No spaCy model found. NER disabled.")
    
    def scan(self, text: str, page_num: int = 0) -> List[PIIMatch]:
        if not self.nlp:
            return []
        # Truncate very long texts for spaCy (limit 1M chars)
        text_chunk = text[:500000]
        try:
            doc = self.nlp(text_chunk)
            results = []
            for ent in doc.ents:
                if ent.label_ in NER_LABELS and len(ent.text.strip()) > 1:
                    results.append(PIIMatch(
                        entity_type=ent.label_,
                        value=ent.text,
                        start=ent.start_char,
                        end=ent.end_char,
                        confidence=0.75,
                        source='spacy',
                        page_num=page_num
                    ))
            return results
        except Exception as e:
            print(f"spaCy scan error: {e}")
            return []
