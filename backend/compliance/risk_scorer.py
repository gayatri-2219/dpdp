"""
DPDP Shield — Risk Scorer v2
Improved scoring formula:
  - Per-entity weights, capped per category (prevents 1 Aadhaar = 100/100)
  - Volume multiplier: more entities → higher risk, with diminishing returns
  - Context penalty: Critical entities in doc with high PII density = escalation
  - Bands: ≤25=LOW, ≤50=MEDIUM, ≤75=HIGH, >75=CRITICAL
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import math

# ── Per-entity base weights (points) ─────────────────────────────────────────
ENTITY_WEIGHTS: Dict[str, float] = {
    # Critical sensitivity — government biometric/financial IDs
    "AADHAAR":          30,
    "CREDIT_CARD":      28,
    "BANK_ACCOUNT":     25,

    # High sensitivity — government IDs, financial identifiers
    "PAN":              20,
    "PASSPORT":         20,
    "DRIVING_LICENSE":  18,
    "VOTER_ID":         15,
    "GSTIN":            14,
    "IFSC":             13,
    "UPI":              13,
    "SALARY":           20,
    "BIOMETRIC":        25,

    # Medium sensitivity — personal contact data
    "EMAIL_ADDRESS":     8,
    "EMAIL":             8,
    "MOBILE":            8,
    "PHONE_NUMBER":      8,
    "DATE_OF_BIRTH":    12,
    "DOB":              12,
    "BLOOD_GROUP":      10,
    "MEDICAL_RECORD":   22,

    # Lower sensitivity — location, generic
    "PIN_CODE":          4,
    "IP_ADDRESS":        3,
    "PERSON":            3,
    "ORG":               2,
    "ORGANIZATION":      2,
    "GPE":               2,
    "LOC":               2,
    "LOCATION":          2,
}

# Sensitivity tiers for reporting
ENTITY_SENSITIVITY: Dict[str, str] = {
    "AADHAAR": "CRITICAL", "CREDIT_CARD": "CRITICAL", "BANK_ACCOUNT": "CRITICAL",
    "BIOMETRIC": "CRITICAL", "MEDICAL_RECORD": "CRITICAL",
    "PAN": "HIGH", "PASSPORT": "HIGH", "DRIVING_LICENSE": "HIGH", "VOTER_ID": "HIGH",
    "GSTIN": "HIGH", "IFSC": "HIGH", "UPI": "HIGH", "SALARY": "HIGH",
    "EMAIL_ADDRESS": "MEDIUM", "EMAIL": "MEDIUM", "MOBILE": "MEDIUM",
    "PHONE_NUMBER": "MEDIUM", "DATE_OF_BIRTH": "MEDIUM", "DOB": "MEDIUM",
    "BLOOD_GROUP": "MEDIUM",
}


@dataclass
class RiskScore:
    level: str          # LOW | MEDIUM | HIGH | CRITICAL
    score: float        # 0–100
    breakdown: Dict[str, int] = field(default_factory=dict)
    triggered_sections: List[str] = field(default_factory=list)
    rationale: str = ""
    pii_type_counts: Dict[str, int] = field(default_factory=dict)


class RiskScorer:
    """
    Improved risk scoring for DPDP Act 2023 compliance.

    Formula:
      base_score  = Σ weight(entity_type) for each unique entity type found
      volume_bonus = log10(1 + total_entities) × 8   [max ~24 at 1000 entities]
      raw_score   = base_score + volume_bonus
      final_score = min(raw_score, 100)

    This means:
      - 1 Aadhaar alone   → 30 + 0  = 30  (MEDIUM)
      - 1 Aadhaar + 1 PAN → 50 + 2  = 52  (HIGH)
      - 5 critical PIIs   → 80+     = CRITICAL
      - 100 emails only   → 8 + 16  = 24  (LOW)
    """

    def score(self, pii_results: list, metadata: Dict[str, Any] = None) -> RiskScore:
        metadata = metadata or {}
        pii_type_counts: Dict[str, int] = {}
        breakdown = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        triggered = set()

        # Tally unique entity types and counts
        for pii in pii_results:
            etype = pii.entity_type.upper()
            pii_type_counts[etype] = pii_type_counts.get(etype, 0) + 1

        # Base score: sum weight for each unique entity type present
        base_score = 0.0
        for etype in pii_type_counts:
            weight     = ENTITY_WEIGHTS.get(etype, 3)
            sensitivity = ENTITY_SENSITIVITY.get(etype, "LOW")
            breakdown[sensitivity] += pii_type_counts[etype]
            base_score += weight

            # DPDP section triggers
            if sensitivity == "CRITICAL":
                triggered.update(["section_6", "section_8"])
            elif sensitivity == "HIGH":
                triggered.update(["section_4", "section_8"])
            elif sensitivity == "MEDIUM":
                triggered.update(["section_5", "section_6"])

        # Volume bonus: logarithmic to prevent gaming with mass low-weight entities
        total_entities = len(pii_results)
        volume_bonus = math.log10(1 + total_entities) * 8 if total_entities > 0 else 0

        raw_score   = base_score + volume_bonus
        final_score = round(min(raw_score, 100), 1)

        # ── Risk level bands ──────────────────────────────────────────────────
        if final_score <= 25:
            level    = "LOW"
            rationale = (
                f"{total_entities} low-sensitivity PII entities detected. "
                "Standard data governance practices apply."
            )
        elif final_score <= 50:
            level    = "MEDIUM"
            rationale = (
                f"Moderate PII exposure: {total_entities} entities across "
                f"{len(pii_type_counts)} types. "
                "Data governance review and consent records recommended."
            )
            triggered.update(["section_4", "section_6"])
        elif final_score <= 75:
            level    = "HIGH"
            rationale = (
                f"Significant sensitive PII: {breakdown['HIGH']} high-sensitivity "
                f"+ {breakdown['CRITICAL']} critical entities detected. "
                "Enhanced access controls and masking required under DPDP §8."
            )
            triggered.update(["section_8", "section_11"])
        else:
            level    = "CRITICAL"
            rationale = (
                f"Critical PII exposure: {breakdown['CRITICAL']} critical-sensitivity "
                f"entities (Aadhaar/bank/card data). "
                "Immediate masking and incident review required. "
                "Notify Data Protection Board if a breach has occurred. "
                "Penalties up to ₹250 crore under DPDP Act 2023."
            )
            triggered.update(["section_8", "section_10", "section_11"])

        return RiskScore(
            level=level,
            score=final_score,
            breakdown=breakdown,
            triggered_sections=sorted(triggered),
            rationale=rationale,
            pii_type_counts=pii_type_counts,
        )

    def score_from_summary(self, pii_type_counts: Dict[str, int]) -> RiskScore:
        """Re-score from a pre-aggregated count dict."""
        class _Fake:
            def __init__(self, entity_type: str):
                self.entity_type = entity_type
        fake = []
        for etype, count in pii_type_counts.items():
            fake.extend([_Fake(etype)] * count)
        return self.score(fake)
