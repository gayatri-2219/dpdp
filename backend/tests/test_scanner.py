"""
DPDP Shield — Pytest Test Suite
Tests for scanner modules, masking, compliance engine, and API endpoints.
"""
import pytest
import re
from scanner.regex_patterns import RegexScanner, PATTERNS
from scanner.merge import deduplicate, merge_all_sources
from scanner.masking import Masker
from compliance.risk_scorer import RiskScorer
from compliance.engine import ComplianceEngine


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def regex_scanner():
    return RegexScanner()

@pytest.fixture
def masker():
    return Masker()

@pytest.fixture
def risk_scorer():
    return RiskScorer()

@pytest.fixture
def compliance_engine():
    return ComplianceEngine()


# ─── Regex Pattern Tests ──────────────────────────────────────────────────────

class TestRegexPatterns:

    KNOWN_PII = {
        "aadhaar":     ["9876 5432 1012", "1234 5678 9012"],
        "pan":         ["ABCDE1234F", "PQRST9876Z"],
        "gstin":       ["29ABCDE1234F1Z5"],
        "mobile":      ["9876543210", "+919876543210", "09876543210"],
        "email":       ["user@example.com", "john.doe+tag@company.co.in"],
        "credit_card": ["4111111111111111", "5500005555555559"],
        "passport":    ["A1234567", "B9876543"],
        "ifsc":        ["SBIN0001234", "HDFC0001234"],
        "upi":         ["user@okaxis", "john@ybl"],
    }

    def test_all_patterns_compile(self):
        """All patterns should compile without error."""
        for name, pattern in PATTERNS.items():
            assert re.compile(pattern), f"Pattern '{name}' failed to compile"

    def test_aadhaar_detection(self, regex_scanner):
        text = "Customer Aadhaar: 9876 5432 1012 enrolled"
        results = regex_scanner.scan(text)
        aadhaar = [r for r in results if r.entity_type == 'AADHAAR']
        assert len(aadhaar) >= 1, "Should detect Aadhaar number"
        assert "9876 5432 1012" in aadhaar[0].value

    def test_pan_detection(self, regex_scanner):
        text = "PAN card number: ABCDE1234F for taxpayer"
        results = regex_scanner.scan(text)
        pan = [r for r in results if r.entity_type == 'PAN']
        assert len(pan) >= 1, "Should detect PAN number"

    def test_email_detection(self, regex_scanner):
        text = "Contact us at user@example.com for support"
        results = regex_scanner.scan(text)
        emails = [r for r in results if r.entity_type == 'EMAIL']
        assert len(emails) >= 1, "Should detect email"

    def test_mobile_detection(self, regex_scanner):
        text = "Call us at +919876543210 or 9876543210"
        results = regex_scanner.scan(text)
        phones = [r for r in results if r.entity_type == 'MOBILE']
        assert len(phones) >= 1, "Should detect mobile number"

    def test_gstin_detection(self, regex_scanner):
        text = "GSTIN: 29ABCDE1234F1Z5 registered in Karnataka"
        results = regex_scanner.scan(text)
        gstin = [r for r in results if r.entity_type == 'GSTIN']
        assert len(gstin) >= 1, "Should detect GSTIN"

    def test_credit_card_detection(self, regex_scanner):
        text = "Card number: 4111111111111111 expires 12/25"
        results = regex_scanner.scan(text)
        cards = [r for r in results if r.entity_type == 'CREDIT_CARD']
        assert len(cards) >= 1, "Should detect credit card"

    def test_no_false_positives_short_numbers(self, regex_scanner):
        text = "The value is 123 and score is 45"
        results = regex_scanner.scan(text)
        # Short numbers shouldn't trigger Aadhaar/PAN patterns
        aadhaar = [r for r in results if r.entity_type == 'AADHAAR']
        assert len(aadhaar) == 0, "Should not flag short numbers as Aadhaar"

    def test_multiple_pii_in_text(self, regex_scanner):
        text = """
        Employee ID: ABCDE1234F
        Phone: 9876543210
        Email: emp@company.com
        Aadhaar: 9876 5432 1012
        """
        results = regex_scanner.scan(text)
        assert len(results) >= 4, "Should detect multiple PII types"


# ─── Deduplication Tests ─────────────────────────────────────────────────────

class TestDeduplication:

    def _make_match(self, entity_type, value, start, end, confidence, source='regex'):
        from scanner.regex_patterns import PIIMatch
        return PIIMatch(entity_type=entity_type, value=value, start=start, end=end,
                        confidence=confidence, source=source)

    def test_exact_duplicate_removed(self):
        m1 = self._make_match('EMAIL', 'a@b.com', 10, 17, 0.9, 'regex')
        m2 = self._make_match('EMAIL', 'a@b.com', 10, 17, 0.7, 'presidio')
        result = deduplicate([m1, m2])
        assert len(result) == 1
        assert result[0].confidence == 0.9  # keeps higher confidence

    def test_overlapping_keeps_higher_confidence(self):
        m1 = self._make_match('AADHAAR', '9876 5432 1012', 0, 14, 0.9, 'regex')
        m2 = self._make_match('PHONE',   '9876 5432',      0, 9,  0.5, 'presidio')
        result = deduplicate([m1, m2])
        assert len(result) == 1
        assert result[0].entity_type == 'AADHAAR'

    def test_non_overlapping_kept(self):
        m1 = self._make_match('EMAIL',   'a@b.com',    0,  7,  0.9, 'regex')
        m2 = self._make_match('AADHAAR', '1234 5678',  20, 29, 0.9, 'regex')
        result = deduplicate([m1, m2])
        assert len(result) == 2

    def test_empty_input(self):
        assert deduplicate([]) == []

    def test_confidence_filter(self):
        m1 = self._make_match('EMAIL', 'a@b.com', 0, 7, 0.3)  # below 0.5
        m2 = self._make_match('PAN',   'ABCDE1234F', 10, 20, 0.9)
        result = deduplicate([m1, m2], min_confidence=0.5)
        assert len(result) == 1
        assert result[0].entity_type == 'PAN'


# ─── Masking Tests ────────────────────────────────────────────────────────────

class TestMasker:

    def test_aadhaar_partial_mask(self, masker):
        result = masker._partial_mask('987654321012', 'AADHAAR')
        assert '1012' in result
        assert 'XXXX' in result

    def test_pan_partial_mask(self, masker):
        result = masker._partial_mask('ABCDE1234F', 'PAN')
        assert result.startswith('ABC')
        assert result.endswith('F')
        assert 'X' in result

    def test_email_partial_mask(self, masker):
        result = masker._partial_mask('john@gmail.com', 'EMAIL_ADDRESS')
        assert '@gmail.com' in result
        assert '***' in result
        assert result.startswith('j')

    def test_mobile_partial_mask(self, masker):
        result = masker._partial_mask('+919876543210', 'MOBILE')
        assert '3210' in result
        assert '****' in result

    def test_credit_card_partial_mask(self, masker):
        result = masker._partial_mask('4111111111111111', 'CREDIT_CARD')
        assert '1111' in result
        assert 'XXXX' in result

    def test_redact_strategy(self, masker):
        from scanner.regex_patterns import PIIMatch
        text = "Email: john@gmail.com here"
        pii = [PIIMatch('EMAIL_ADDRESS', 'john@gmail.com', 7, 21, 0.9)]
        masked, _ = masker.mask_text(text, pii, strategy='redact')
        assert '[REDACTED-EMAIL_ADDRESS]' in masked
        assert 'john@gmail.com' not in masked

    def test_tokenize_strategy(self, masker):
        from scanner.regex_patterns import PIIMatch
        text = "PAN: ABCDE1234F present"
        pii = [PIIMatch('PAN', 'ABCDE1234F', 5, 15, 0.9)]
        masked, _ = masker.mask_text(text, pii, strategy='tokenize')
        assert '<<PAN_' in masked
        assert 'ABCDE1234F' not in masked

    def test_mask_map_returned(self, masker):
        from scanner.regex_patterns import PIIMatch
        text = "Contact: user@test.com"
        pii = [PIIMatch('EMAIL_ADDRESS', 'user@test.com', 9, 22, 0.9)]
        _, mask_map = masker.mask_text(text, pii, strategy='partial')
        assert len(mask_map) == 1
        assert mask_map[0]['original'] == 'user@test.com'


# ─── Risk Scorer Tests ────────────────────────────────────────────────────────

class TestRiskScorer:

    def _make_pii(self, entity_type):
        class Fake:
            pass
        p = Fake()
        p.entity_type = entity_type
        return p

    def test_empty_document_is_low_risk(self, risk_scorer):
        result = risk_scorer.score([])
        assert result.level == 'LOW'
        assert result.score == 0

    def test_aadhaar_contributes_40_points(self, risk_scorer):
        pii = [self._make_pii('AADHAAR')]
        result = risk_scorer.score(pii)
        assert result.score == 40
        assert result.level == 'HIGH'  # 40 > 25 but <= 50 → MEDIUM? Let's check
        # 40 is in MEDIUM range (26-50)
        assert result.level == 'MEDIUM'

    def test_critical_level_requires_76_plus(self, risk_scorer):
        # Need 76+ score: 2 Aadhaar (80) = CRITICAL
        pii = [self._make_pii('AADHAAR'), self._make_pii('AADHAAR')]
        result = risk_scorer.score(pii)
        assert result.score == 80
        assert result.level == 'CRITICAL'

    def test_high_level_51_to_75(self, risk_scorer):
        # 1 Aadhaar (40) + 1 PAN (20) = 60 → HIGH
        pii = [self._make_pii('AADHAAR'), self._make_pii('PAN')]
        result = risk_scorer.score(pii)
        assert result.score == 60
        assert result.level == 'HIGH'

    def test_score_capped_at_100(self, risk_scorer):
        # 5 Aadhaar = 200 → capped at 100
        pii = [self._make_pii('AADHAAR')] * 5
        result = risk_scorer.score(pii)
        assert result.score == 100

    def test_weights_correct(self, risk_scorer):
        from compliance.risk_scorer import WEIGHTS
        assert WEIGHTS['CRITICAL'] == 40
        assert WEIGHTS['HIGH'] == 20
        assert WEIGHTS['MEDIUM'] == 10
        assert WEIGHTS['LOW'] == 5

    def test_pii_type_counts_populated(self, risk_scorer):
        pii = [self._make_pii('PAN'), self._make_pii('PAN'), self._make_pii('MOBILE')]
        result = risk_scorer.score(pii)
        assert result.pii_type_counts.get('PAN') == 2
        assert result.pii_type_counts.get('MOBILE') == 1


# ─── Compliance Engine Tests ──────────────────────────────────────────────────

class TestComplianceEngine:

    def _make_pii(self, entity_type):
        class Fake:
            pass
        p = Fake()
        p.entity_type = entity_type
        return p

    def test_rules_loaded(self, compliance_engine):
        assert len(compliance_engine.rules) >= 14

    def test_aadhaar_triggers_fail(self, compliance_engine):
        pii = [self._make_pii('AADHAAR')]
        results = compliance_engine.evaluate(pii)
        failed = [r for r in results if r.status == 'FAIL']
        assert len(failed) >= 1

    def test_empty_pii_mostly_pass(self, compliance_engine):
        results = compliance_engine.evaluate([])
        failed = [r for r in results if r.status == 'FAIL']
        assert len(failed) == 0

    def test_compliance_summary_structure(self, compliance_engine):
        results = compliance_engine.evaluate([])
        summary = compliance_engine.get_compliance_summary(results)
        assert 'total_rules' in summary
        assert 'passed' in summary
        assert 'failed' in summary
        assert 'compliance_score' in summary
        assert summary['total_rules'] == len(results)

    def test_compliance_score_100_for_clean(self, compliance_engine):
        results = compliance_engine.evaluate([])
        summary = compliance_engine.get_compliance_summary(results)
        # With no PII, most rules should pass or be manual
        assert summary['failed'] == 0

    def test_rule_results_have_required_fields(self, compliance_engine):
        results = compliance_engine.evaluate([])
        for r in results:
            assert r.rule_id is not None
            assert r.title
            assert r.status in ('PASS', 'FAIL', 'MANUAL_REVIEW')
            assert r.severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
