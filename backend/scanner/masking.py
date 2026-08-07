import re
from typing import List, Tuple
from .regex_patterns import PIIMatch

MASKING_STRATEGIES = ['redact', 'partial', 'tokenize']

class Masker:
    """
    Mask PII entities using various strategies.
    
    partial strategy examples (per spec):
      Aadhaar:      9876 5432 1012 → XXXX XXXX 1012
      PAN:          ABCDE1234F     → ABCXXXXXXF
      Email:        john@gmail.com → j***@gmail.com
      Mobile:       +919876543210  → +91-98****3210
      Credit Card:  4111111111111  → XXXX-XXXX-XXXX-1111
    """
    
    def mask_text(
        self,
        text: str,
        pii_results: List[PIIMatch],
        strategy: str = 'partial'
    ) -> Tuple[str, List[dict]]:
        """Mask text and return (masked_text, mask_map)."""
        if strategy not in MASKING_STRATEGIES:
            strategy = 'partial'
        
        # Sort by start descending so replacing doesn't shift indices
        sorted_results = sorted(pii_results, key=lambda x: x.start, reverse=True)
        
        masked_text = text
        mask_map = []
        
        for pii in sorted_results:
            original = pii.value
            if strategy == 'redact':
                replacement = f'[REDACTED-{pii.entity_type}]'
            elif strategy == 'partial':
                replacement = self._partial_mask(original, pii.entity_type)
            else:  # tokenize
                replacement = f'<<{pii.entity_type}_{abs(hash(original)) % 10000:04d}>>'
            
            masked_text = masked_text[:pii.start] + replacement + masked_text[pii.end:]
            mask_map.append({
                'original': original,
                'masked': replacement,
                'entity_type': pii.entity_type,
                'start': pii.start,
                'end': pii.end
            })
        
        return masked_text, mask_map
    
    def _partial_mask(self, value: str, entity_type: str) -> str:
        """Apply entity-specific partial masking."""
        entity_type = entity_type.upper()
        
        if entity_type == 'AADHAAR':
            # 9876 5432 1012 → XXXX XXXX 1012
            digits = re.sub(r'[\s-]', '', value)
            if len(digits) == 12:
                return f'XXXX XXXX {digits[-4:]}'
            return 'XXXX-XXXX-' + value[-4:]
        
        elif entity_type == 'PAN':
            # ABCDE1234F → ABCXXXXXXF
            if len(value) == 10:
                return value[:3] + 'XXXXXX' + value[-1]
            return value[:2] + 'X' * (len(value) - 3) + value[-1]
        
        elif entity_type in ('EMAIL_ADDRESS', 'EMAIL'):
            # john@gmail.com → j***@gmail.com
            parts = value.split('@')
            if len(parts) == 2:
                local = parts[0]
                domain = parts[1]
                masked_local = local[0] + '***' if len(local) > 1 else '***'
                return f'{masked_local}@{domain}'
            return '***@***'
        
        elif entity_type in ('MOBILE', 'PHONE_NUMBER', 'PHONE'):
            # +919876543210 → +91-98****3210
            digits = re.sub(r'[\s+\-()]', '', value)
            if digits.startswith('91') and len(digits) == 12:
                return f'+91-{digits[2:4]}****{digits[-4:]}'
            elif len(digits) == 10:
                return f'{digits[:2]}****{digits[-4:]}'
            return value[:3] + '****' + value[-4:]
        
        elif entity_type == 'CREDIT_CARD':
            # 4111111111111111 → XXXX-XXXX-XXXX-1111
            digits = re.sub(r'[\s-]', '', value)
            if len(digits) >= 12:
                return f'XXXX-XXXX-XXXX-{digits[-4:]}'
            return 'XXXX-' + value[-4:]
        
        elif entity_type == 'GSTIN':
            # Show first 2 (state code) and last 2
            return value[:2] + 'X' * (len(value) - 4) + value[-2:]
        
        elif entity_type == 'PASSPORT':
            # P1234567 → P***4567
            return value[0] + '***' + value[-4:]
        
        elif entity_type == 'IFSC':
            # SBIN0001234 → SBINXXXX34
            return value[:4] + 'XXXX' + value[-2:]
        
        elif entity_type in ('UPI', 'VPA'):
            # name@upi → n***@upi
            return self._partial_mask(value, 'EMAIL_ADDRESS')
        
        elif entity_type == 'VOTER_ID':
            return value[:3] + 'XXXX' + value[-3:]
        
        elif entity_type == 'DRIVING_LICENSE':
            return value[:4] + 'X' * (len(value) - 6) + value[-2:]
        
        else:
            # Generic: show first and last char
            if len(value) <= 4:
                return 'X' * len(value)
            return value[0] + 'X' * (len(value) - 2) + value[-1]
    
    def get_masked_display(self, text: str, pii_results: List[PIIMatch]) -> dict:
        """Return all three masking views for a document."""
        return {
            'redacted': self.mask_text(text, pii_results, 'redact')[0],
            'partial':  self.mask_text(text, pii_results, 'partial')[0],
            'tokenized': self.mask_text(text, pii_results, 'tokenize')[0],
        }
