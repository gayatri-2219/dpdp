from dataclasses import dataclass
from typing import List
from compliance.risk_scorer import RiskScore
from ai.pii_detector import PIIResult
from compliance.dpdp_rules import DPDP_SECTIONS

@dataclass
class Recommendation:
    title: str
    description: str
    priority: str
    dpdp_section: str
    action_items: List[str]

class Recommender:
    def recommend(self, risk_score: RiskScore, pii_results: List[PIIResult]) -> List[Recommendation]:
        recommendations = []
        
        if risk_score.level in ['CRITICAL', 'HIGH']:
            recommendations.append(Recommendation(
                title="Implement Strict Data Minimization",
                description="High volume of sensitive data found. Reduce collection to only what is strictly necessary.",
                priority="HIGH",
                dpdp_section="section_8",
                action_items=[
                    "Review data collection forms.",
                    "Mask or redact sensitive fields before storage."
                ]
            ))
            
        if any(p.entity_type == 'AADHAAR' for p in pii_results):
            recommendations.append(Recommendation(
                title="Aadhaar Data Handling",
                description="Aadhaar numbers detected. Ensure compliance with UIDAI regulations.",
                priority="HIGH",
                dpdp_section="section_8",
                action_items=[
                    "Vault Aadhaar numbers.",
                    "Ensure clear explicit consent for Aadhaar."
                ]
            ))

        if 'section_10' in risk_score.triggered_sections:
            recommendations.append(Recommendation(
                title="Significant Data Fiduciary Obligations",
                description="Risk profile suggests Significant Data Fiduciary status.",
                priority="HIGH",
                dpdp_section="section_10",
                action_items=[
                    "Appoint a Data Protection Officer (DPO).",
                    "Conduct a Data Protection Impact Assessment (DPIA).",
                    "Appoint an Independent Data Auditor."
                ]
            ))
            
        return recommendations
