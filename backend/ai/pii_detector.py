import re
from dataclasses import dataclass
from typing import List, Optional
import spacy
from presidio_analyzer import AnalyzerEngine

@dataclass
class PIIResult:
    entity_type: str
    value: str
    start: int
    end: int
    confidence: float
    source: str
    page_num: int = 0

class PIIDetector:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.nlp = None
            
        self.presidio_analyzer = AnalyzerEngine()
        
        self.regex_patterns = {
            'AADHAAR': r'\b[2-9]{1}[0-9]{11}\b',
            'PAN': r'[A-Z]{5}[0-9]{4}[A-Z]{1}',
            'PHONE_NUMBER': r'(\+91|91|0)?[6-9][0-9]{9}',
            'EMAIL_ADDRESS': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'CREDIT_CARD': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b',
            'PASSPORT': r'[A-Z][1-9][0-9]{7}',
            'DATE_OF_BIRTH': r'\b\d{2}[-/]\d{2}[-/]\d{4}\b',
            'IFSC': r'[A-Z]{4}0[A-Z0-9]{6}',
            'UPI': r'[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}'
        }

    def detect(self, text: str, document_id: Optional[str] = None) -> List[PIIResult]:
        results = []
        
        # Layer 1: Regex
        for entity_type, pattern in self.regex_patterns.items():
            for match in re.finditer(pattern, text):
                results.append(PIIResult(
                    entity_type=entity_type,
                    value=match.group(),
                    start=match.start(),
                    end=match.end(),
                    confidence=0.9,
                    source='regex'
                ))
                
        # Layer 2: spaCy
        if self.nlp:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ in ['PERSON', 'ORG', 'GPE']:
                    results.append(PIIResult(
                        entity_type=ent.label_,
                        value=ent.text,
                        start=ent.start_char,
                        end=ent.end_char,
                        confidence=0.7,
                        source='spacy'
                    ))
                    
        # Layer 3: Presidio
        analyzer_results = self.presidio_analyzer.analyze(text=text, language='en')
        for res in analyzer_results:
            results.append(PIIResult(
                entity_type=res.entity_type,
                value=text[res.start:res.end],
                start=res.start,
                end=res.end,
                confidence=res.score,
                source='presidio'
            ))
            
        # Deduplicate based on span overlap
        deduplicated = self._deduplicate(results)
        return sorted(deduplicated, key=lambda x: x.start)
        
    def _deduplicate(self, results: List[PIIResult]) -> List[PIIResult]:
        # Simple deduplication logic: keep the one with higher confidence for overlapping spans
        deduped = []
        results = sorted(results, key=lambda x: (x.start, -x.confidence))
        
        for res in results:
            if not deduped:
                deduped.append(res)
            else:
                last = deduped[-1]
                if res.start < last.end:
                    if res.confidence > last.confidence:
                        deduped[-1] = res
                else:
                    deduped.append(res)
        return deduped
