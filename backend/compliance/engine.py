import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Literal

RuleStatus = Literal['PASS', 'FAIL', 'MANUAL_REVIEW']

@dataclass
class RuleResult:
    rule_id: int
    title: str
    section: str
    severity: str
    status: RuleStatus
    description: str
    remediation: str
    reason: str

class ComplianceEngine:
    def __init__(self):
        rules_path = Path(__file__).parent / 'rules.json'
        with open(rules_path) as f:
            self.rules = json.load(f)
    
    def evaluate(self, pii_results: list, scan_metadata: dict = None) -> List[RuleResult]:
        """
        For each rule, evaluate based on detected PII types and metadata.
        Returns PASS | FAIL | MANUAL_REVIEW for each rule.
        """
        scan_metadata = scan_metadata or {}
        detected_types = {r.entity_type.upper() for r in pii_results} if pii_results else set()
        results = []
        
        for rule in self.rules:
            status, reason = self._evaluate_rule(rule, detected_types, scan_metadata)
            results.append(RuleResult(
                rule_id=rule['id'],
                title=rule['title'],
                section=rule['section'],
                severity=rule['severity'],
                status=status,
                description=rule['description'],
                remediation=rule['remediation'],
                reason=reason
            ))
        
        return results
    
    def _evaluate_rule(self, rule: dict, detected_types: set, metadata: dict):
        check = rule.get('check', '')
        triggers = set(rule.get('pii_triggers', []))
        triggered = detected_types & triggers
        
        if check == 'sensitive_data_protected':
            if triggered:
                return 'FAIL', f"Unprotected sensitive PII detected: {', '.join(triggered)}"
            return 'PASS', 'No sensitive PII detected without protection'
        
        elif check == 'consent_exists':
            if triggered:
                return 'MANUAL_REVIEW', f"PII found ({', '.join(triggered)}). Verify consent mechanism exists."
            return 'PASS', 'No PII requiring consent detected'
        
        elif check == 'retention_policy_exists':
            if triggered:
                return 'MANUAL_REVIEW', 'Critical PII detected. Verify retention and deletion policies.'
            return 'PASS', 'No long-retention PII detected'
        
        elif check == 'notice_provided':
            if detected_types:
                return 'MANUAL_REVIEW', 'PII detected. Verify privacy notice is shown to data subjects.'
            return 'PASS', 'No PII detected'
        
        elif check == 'lawful_purpose':
            if triggered:
                return 'FAIL', f"Identity PII ({', '.join(triggered)}) present without documented lawful purpose."
            return 'PASS', 'No government-ID PII detected'
        
        elif check == 'security_safeguards':
            if len(triggered) >= 3:
                return 'FAIL', f"Multiple sensitive PII types ({len(triggered)}) detected. Enhanced safeguards required."
            elif triggered:
                return 'MANUAL_REVIEW', f"Sensitive PII detected: {', '.join(triggered)}. Verify security controls."
            return 'PASS', 'PII volume within acceptable limits'
        
        elif check == 'pii_masked_in_non_prod':
            if triggered:
                return 'FAIL', f"Unmasked PII found in document: {', '.join(triggered)}. Must mask in non-prod."
            return 'PASS', 'No unmasked sensitive PII detected'
        
        elif check == 'data_minimization':
            if len(detected_types) > 8:
                return 'FAIL', f"{len(detected_types)} PII types detected. Review necessity of each."
            elif detected_types:
                return 'MANUAL_REVIEW', 'Verify that only minimum necessary data is collected.'
            return 'PASS', 'Data collection appears minimal'
        
        elif check in ('children_data_consent', 'cross_border_compliance',
                       'data_principal_rights', 'grievance_mechanism_exists',
                       'dpo_appointed', 'dpia_conducted'):
            # These require human review — cannot be automatically determined from document text
            return 'MANUAL_REVIEW', 'Manual review required. Cannot be automatically verified from document content.'
        
        else:
            return 'MANUAL_REVIEW', 'Requires manual compliance review.'
    
    def get_compliance_summary(self, rule_results: List[RuleResult]) -> dict:
        total = len(rule_results)
        passed = sum(1 for r in rule_results if r.status == 'PASS')
        failed = sum(1 for r in rule_results if r.status == 'FAIL')
        manual = sum(1 for r in rule_results if r.status == 'MANUAL_REVIEW')
        score = round((passed / total * 100), 1) if total > 0 else 0
        
        return {
            'total_rules': total,
            'passed': passed,
            'failed': failed,
            'manual_review': manual,
            'compliance_score': score,
            'critical_failures': [
                {'id': r.rule_id, 'title': r.title, 'reason': r.reason}
                for r in rule_results
                if r.status == 'FAIL' and r.severity == 'CRITICAL'
            ]
        }
