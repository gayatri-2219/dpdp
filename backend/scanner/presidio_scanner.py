from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from .regex_patterns import PIIMatch
from typing import List

class PresidioScanner:
    def __init__(self):
        try:
            self.analyzer = AnalyzerEngine()
            self._available = True
        except Exception as e:
            print(f"Presidio init failed: {e}")
            self._available = False
    
    def scan(self, text: str, page_num: int = 0) -> List[PIIMatch]:
        if not self._available:
            return []
        try:
            results = self.analyzer.analyze(
                text=text,
                language='en',
                entities=[
                    'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD',
                    'IP_ADDRESS', 'DATE_TIME', 'PERSON', 'LOCATION',
                    'NRP', 'MEDICAL_LICENSE', 'URL', 'IBAN_CODE'
                ]
            )
            return [
                PIIMatch(
                    entity_type=r.entity_type,
                    value=text[r.start:r.end],
                    start=r.start,
                    end=r.end,
                    confidence=float(r.score),
                    source='presidio',
                    page_num=page_num
                )
                for r in results if r.score >= 0.5
            ]
        except Exception as e:
            print(f"Presidio scan error: {e}")
            return []
