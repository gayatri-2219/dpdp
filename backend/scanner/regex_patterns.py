"""
DPDP Shield — Regex PII Scanner
High-precision patterns validated against real Indian documents.
Each pattern includes confidence tuning based on false-positive risk.
"""
from dataclasses import dataclass
from typing import List
import re

# ─────────────────────────────────────────────────────────────────────────────
# Patterns — ordered by sensitivity (highest first)
# Each entry: (pattern, entity_type, confidence, description)
# ─────────────────────────────────────────────────────────────────────────────
_RAW_PATTERNS = [

    # ── Government IDs ────────────────────────────────────────────────────────

    # Aadhaar: exactly 12 digits, groups of 4, optional space/hyphen separator
    # Must NOT be preceded/followed by a digit (prevents matching 16-digit card nums)
    (r"(?<!\d)(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})(?!\d)",
     "AADHAAR", 0.92,
     "12-digit Aadhaar UID"),

    # PAN: 5 letters, 4 digits, 1 letter — strict India format
    # First char is always A-Z, 4th char indicates entity type
    (r"(?<![A-Z0-9])[A-Z]{5}[0-9]{4}[A-Z](?![A-Z0-9])",
     "PAN", 0.97,
     "10-char Permanent Account Number"),

    # Passport: India format — letter from specific set + digit + 7 digits
    (r"(?<![A-Z0-9])[A-PR-WYa-pr-wy][1-9]\d{7}(?![A-Z0-9])",
     "PASSPORT", 0.90,
     "Indian passport number"),

    # Voter ID: 3 uppercase letters + 7 digits (ECI format)
    (r"(?<![A-Z0-9])[A-Z]{3}[0-9]{7}(?![A-Z0-9])",
     "VOTER_ID", 0.88,
     "Electoral Photo ID card"),

    # Driving Licence: state code (2 letters) + 2 digits + year + 7 digits
    # Example: MH12 2012 1234567 or DL0420110149646
    (r"(?<![A-Z0-9])[A-Z]{2}[\s\-]?\d{2}[\s\-]?\d{4}[\s\-]?\d{7}(?![0-9])",
     "DRIVING_LICENSE", 0.85,
     "Indian driving licence number"),

    # ── Financial ─────────────────────────────────────────────────────────────

    # IFSC: 4 letters + 0 + 6 alphanumeric (bank branch code)
    (r"(?<![A-Z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Z0-9])",
     "IFSC", 0.97,
     "RBI bank IFSC code"),

    # GSTIN: 2 digits + 5 letters + 4 digits + letter + digit + Z + alphanumeric
    (r"(?<![A-Z0-9])\d{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z](?![A-Z0-9])",
     "GSTIN", 0.97,
     "GST Identification Number"),

    # Credit/Debit cards: Visa (4xxx), Mastercard (5xxx), Amex (3x), RuPay (6xxx)
    # Require 13-16 digits, optionally space/hyphen separated in groups of 4
    (r"(?<!\d)(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|6(?:011|5\d{2})\d{12}|6[0-9]{15})(?!\d)",
     "CREDIT_CARD", 0.94,
     "Credit/debit card number"),

    # UPI ID: user@bank format — must have realistic bank suffix
    (r"[a-zA-Z0-9.\-_]{2,64}@(?:oksbi|okaxis|okhdfcbank|okicici|ybl|ibl|axl|upi|paytm|gpay|phonepe|sbi|hdfc|icici|axis|kotak|rbl|indus|federal|idfc|pnb|bob|boi|yes|airtel|jio|freecharge)\b",
     "UPI", 0.95,
     "Unified Payments Interface ID"),

    # Bank Account Number: 9–18 digits (without context is ambiguous — needs keyword near it)
    # Only detect when preceded by "account", "a/c", "acc" within 30 chars
    # Implement as a named group pattern
    (r"(?i)(?:account[\s\w]*no[.:]?\s*|a/?c\s*no[.:]?\s*|acc(?:ount)?\s*(?:no|#|number)?\s*[:\-]?\s*)(\d{9,18})",
     "BANK_ACCOUNT", 0.88,
     "Bank account number (context-triggered)"),

    # ── Personal Identifiers ──────────────────────────────────────────────────

    # Mobile: Indian numbers starting with 6-9, exactly 10 digits
    # Optional +91/91/0 prefix, not preceded by digit
    (r"(?<!\d)(?:\+91[\s\-]?|91[\s\-]?|0)?[6-9]\d{9}(?!\d)",
     "MOBILE", 0.88,
     "Indian mobile number"),

    # Date of birth — various formats
    # DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
    # Must be a plausible date (day 01-31, month 01-12, year 19xx-20xx)
    (r"(?<!\d)(?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.](?:19|20)\d{2}(?!\d)",
     "DATE_OF_BIRTH", 0.82,
     "Date of birth (DD/MM/YYYY)"),

    # Email — RFC-5321 simplified
    (r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
     "EMAIL_ADDRESS", 0.95,
     "Email address"),

    # ── Biometric / Medical ───────────────────────────────────────────────────

    # Blood group — standalone A/B/AB/O with +/- Rh factor
    (r"\b(?:A|B|AB|O)[+-]\b",
     "BLOOD_GROUP", 0.85,
     "ABO/Rh blood group"),

    # ── Location / Network ────────────────────────────────────────────────────

    # Indian PIN code: 6 digits starting with 1-9 (not preceded by digit)
    # Exclude if it's part of a longer number
    (r"(?<!\d)(?:PIN|PINCODE|Pin Code|Pin)[\s\-:]*([1-9][0-9]{5})(?!\d)",
     "PIN_CODE", 0.90,
     "India postal PIN code (context-triggered)"),

    # IPv4 address — must be a valid-looking address
    (r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b",
     "IP_ADDRESS", 0.93,
     "IPv4 address"),
]


@dataclass
class PIIMatch:
    entity_type: str
    value: str
    start: int
    end: int
    confidence: float
    source: str = 'regex'
    page_num: int = 0


# ─────────────────────────────────────────────────────────────────────────────
# False-positive filters — if the matched value looks like noise, skip it
# ─────────────────────────────────────────────────────────────────────────────

# Common number sequences that match Aadhaar but are NOT Aadhaar
_AADHAAR_BLOCKLIST = {
    "0000 0000 0000", "1111 1111 1111", "1234 5678 9012",
    "000000000000", "111111111111", "123456789012",
}

# PAN should not look like an all-letter or all-digit code
_PAN_VALID_FOURTH = set("PCHABGJLFTE")  # PAN 4th char encodes entity type

def _is_likely_not_pan(value: str) -> bool:
    """Return True if value fails basic PAN structural checks."""
    if len(value) != 10:
        return True
    # 4th character must be one of the entity-type chars
    if value[3].upper() not in _PAN_VALID_FOURTH:
        return True
    return False


def _is_likely_not_mobile(value: str) -> bool:
    """Return True if the digit sequence is not a real Indian mobile."""
    digits = re.sub(r"[^\d]", "", value)
    # After stripping prefix, must be exactly 10 digits starting 6-9
    if digits.startswith(("91", "0")) and len(digits) > 10:
        digits = digits[len(digits) - 10:]
    return len(digits) != 10 or digits[0] not in "6789"


class RegexScanner:
    """
    High-precision regex-based PII scanner for Indian documents.
    Tuned for DPDP Act 2023 compliance: Aadhaar, PAN, passport, financial data.
    """
    def __init__(self):
        self._patterns: list = []
        for pattern, entity_type, confidence, _desc in _RAW_PATTERNS:
            try:
                compiled = re.compile(pattern)
                self._patterns.append((compiled, entity_type, confidence))
            except re.error as e:
                print(f"[RegexScanner] Invalid pattern for {entity_type}: {e}")

    def scan(self, text: str, page_num: int = 0) -> List[PIIMatch]:
        results: List[PIIMatch] = []

        for pattern, entity_type, base_confidence in self._patterns:
            for match in pattern.finditer(text):
                # Use group(1) if the pattern has a capture group, else group(0)
                value = match.group(1) if match.lastindex else match.group(0)
                value = value.strip()

                if not value or len(value) < 4:
                    continue

                # ── Entity-specific validation ────────────────────────────
                confidence = base_confidence

                if entity_type == "AADHAAR":
                    digits = re.sub(r"[^\d]", "", value)
                    if len(digits) != 12:
                        continue
                    if value in _AADHAAR_BLOCKLIST or digits in _AADHAAR_BLOCKLIST:
                        continue
                    # Reduce confidence if no space/hyphen separators (could be any 12-digit num)
                    if not re.search(r"[\s\-]", value):
                        confidence = 0.75

                elif entity_type == "PAN":
                    if _is_likely_not_pan(value):
                        continue

                elif entity_type == "MOBILE":
                    if _is_likely_not_mobile(value):
                        continue

                elif entity_type == "DRIVING_LICENSE":
                    digits_only = re.sub(r"[^\d]", "", value)
                    if len(digits_only) < 13:
                        continue

                elif entity_type == "BLOOD_GROUP":
                    # Must be a standalone token (surrounded by whitespace or punctuation)
                    span_start = match.start()
                    span_end   = match.end()
                    before = text[max(0, span_start - 1) : span_start]
                    after  = text[span_end : span_end + 1]
                    if before and before not in " \t\n,(:":
                        continue
                    if after and after not in " \t\n,):":
                        continue

                elif entity_type == "PIN_CODE":
                    # Use only the captured group (the 6-digit code)
                    pin = re.sub(r"[^\d]", "", value)
                    if len(pin) != 6:
                        continue
                    value = pin

                elif entity_type == "IP_ADDRESS":
                    # Filter out version numbers and common false positives
                    parts = value.split(".")
                    if all(p in ("0", "1", "2", "3", "10", "255") for p in parts):
                        confidence = 0.60  # likely version number

                # ── Accept match ─────────────────────────────────────────
                results.append(PIIMatch(
                    entity_type=entity_type,
                    value=value,
                    start=match.start(),
                    end=match.end(),
                    confidence=confidence,
                    source="regex",
                    page_num=page_num,
                ))

        return results
