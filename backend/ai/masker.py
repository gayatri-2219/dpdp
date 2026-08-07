from typing import List, Tuple
from ai.pii_detector import PIIResult
import uuid

class Masker:
    def mask_text(self, text: str, pii_results: List[PIIResult], strategy: str = 'redact') -> Tuple[str, List[PIIResult]]:
        if strategy == 'pseudonymize':
            masked_text = self.mask_with_pseudonymize(text, pii_results)
        elif strategy == 'tokenize':
            masked_text = self.mask_with_tokenize(text, pii_results)
        else:
            masked_text = self.mask_with_redact(text, pii_results)
            
        return masked_text, pii_results
        
    def mask_with_redact(self, text: str, pii_results: List[PIIResult]) -> str:
        masked_text = text
        offset = 0
        for pii in sorted(pii_results, key=lambda x: x.start):
            replacement = f"[REDACTED-{pii.entity_type}]"
            start = pii.start + offset
            end = pii.end + offset
            masked_text = masked_text[:start] + replacement + masked_text[end:]
            offset += len(replacement) - (pii.end - pii.start)
        return masked_text
        
    def mask_with_pseudonymize(self, text: str, pii_results: List[PIIResult]) -> str:
        # Simplistic pseudonymization
        masked_text = text
        offset = 0
        for pii in sorted(pii_results, key=lambda x: x.start):
            replacement = f"Fake_{pii.entity_type}"
            start = pii.start + offset
            end = pii.end + offset
            masked_text = masked_text[:start] + replacement + masked_text[end:]
            offset += len(replacement) - (pii.end - pii.start)
        return masked_text

    def mask_with_tokenize(self, text: str, pii_results: List[PIIResult]) -> str:
        masked_text = text
        offset = 0
        for pii in sorted(pii_results, key=lambda x: x.start):
            replacement = f"TOKEN_{uuid.uuid4().hex[:8]}"
            start = pii.start + offset
            end = pii.end + offset
            masked_text = masked_text[:start] + replacement + masked_text[end:]
            offset += len(replacement) - (pii.end - pii.start)
        return masked_text
