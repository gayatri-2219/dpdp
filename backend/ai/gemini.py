import json
from typing import List, Optional
from dataclasses import dataclass

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

@dataclass
class Recommendation:
    issue: str
    impact: str
    recommendation: str
    priority: str  # HIGH | MEDIUM | LOW
    timeline: str  # e.g. "Within 30 days"
    dpdp_section: Optional[str] = None

class GeminiClient:
    def __init__(self, api_key: str, model: str = 'gemini-1.5-flash'):
        self.available = False
        if not GEMINI_AVAILABLE:
            print("google-generativeai not installed")
            return
        if not api_key or api_key == 'your-gemini-api-key-here':
            print("GEMINI_API_KEY not configured — AI features disabled")
            return
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model)
            self.available = True
        except Exception as e:
            print(f"Gemini init failed: {e}")
    
    async def get_recommendations(
        self,
        scan_summary: dict,
        rule_violations: list,
        risk_level: str
    ) -> List[Recommendation]:
        """
        Prompt Gemini with compliance gaps.
        Returns structured recommendations: [{issue, impact, recommendation, priority, timeline}]
        """
        if not self.available:
            return self._fallback_recommendations(scan_summary, risk_level)
        
        prompt = self._build_recommendation_prompt(scan_summary, rule_violations, risk_level)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2048,
                )
            )
            return self._parse_recommendations(response.text)
        except Exception as e:
            print(f"Gemini recommendation error: {e}")
            return self._fallback_recommendations(scan_summary, risk_level)
    
    def _build_recommendation_prompt(self, scan_summary: dict, rule_violations: list, risk_level: str) -> str:
        violations_text = "\n".join(
            f"- {v.get('title', '')} ({v.get('section', '')}): {v.get('reason', '')}"
            for v in rule_violations[:10]
        )
        pii_summary = json.dumps(scan_summary.get('pii_type_counts', {}), indent=2)
        
        return f"""You are a DPDP Act 2023 (India) compliance expert. 
A document scan has revealed the following:

Risk Level: {risk_level}
PII Types Found:
{pii_summary}

Compliance Violations:
{violations_text}

Based on these compliance gaps under India's Digital Personal Data Protection Act 2023, provide EXACTLY 5 specific, actionable remediation recommendations.

Respond ONLY with a JSON array (no other text, no markdown, no code fences) in this exact format:
[
  {{
    "issue": "Name of the specific compliance issue",
    "impact": "Business/legal impact if not addressed",
    "recommendation": "Specific actionable step to fix this",
    "priority": "HIGH",
    "timeline": "Within 30 days",
    "dpdp_section": "Section 6"
  }}
]
Priority must be one of: HIGH, MEDIUM, LOW.
Timeline must be specific (e.g., 'Immediate', 'Within 7 days', 'Within 30 days', 'Within 90 days')."""
    
    def _parse_recommendations(self, response_text: str) -> List[Recommendation]:
        # Strip markdown if present
        text = response_text.strip()
        if text.startswith('```'):
            text = '\n'.join(text.split('\n')[1:])
            text = text.replace('```', '').strip()
        
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return [
                    Recommendation(
                        issue=item.get('issue', ''),
                        impact=item.get('impact', ''),
                        recommendation=item.get('recommendation', ''),
                        priority=item.get('priority', 'MEDIUM'),
                        timeline=item.get('timeline', 'Within 30 days'),
                        dpdp_section=item.get('dpdp_section')
                    )
                    for item in data
                ]
        except json.JSONDecodeError:
            pass
        return self._fallback_recommendations({}, 'HIGH')
    
    def _fallback_recommendations(self, scan_summary: dict, risk_level: str) -> List[Recommendation]:
        """Static fallback when Gemini is unavailable."""
        return [
            Recommendation(
                issue="Consent Management System Missing",
                impact="Violation of Section 6 — processing without consent carries penalties up to ₹250 crore",
                recommendation="Implement explicit consent collection at all data entry points with opt-in mechanisms",
                priority="HIGH",
                timeline="Within 30 days",
                dpdp_section="Section 6"
            ),
            Recommendation(
                issue="Data Retention Policy Not Defined",
                impact="Non-compliance with Section 8(7) — data stored beyond purpose period",
                recommendation="Define retention periods per data type and automate deletion workflows",
                priority="HIGH",
                timeline="Within 60 days",
                dpdp_section="Section 8(7)"
            ),
            Recommendation(
                issue="PII Not Masked in Documents",
                impact="Breach of data minimization principle — unnecessary exposure of sensitive data",
                recommendation="Apply data masking for Aadhaar (XXXX XXXX 1012), PAN (ABCXXXXXXF) in all non-production contexts",
                priority="HIGH",
                timeline="Immediate",
                dpdp_section="Section 8(1)"
            ),
            Recommendation(
                issue="Privacy Notice Not Provided",
                impact="Violation of Section 5 — Data Principals not informed of processing purpose",
                recommendation="Add a clear privacy notice at all data collection touchpoints",
                priority="MEDIUM",
                timeline="Within 30 days",
                dpdp_section="Section 5"
            ),
            Recommendation(
                issue="Grievance Redressal Mechanism Missing",
                impact="Violation of Section 11(5) — Data Principals cannot exercise their rights",
                recommendation="Appoint a Data Protection Officer and publish a grievance contact mechanism",
                priority="MEDIUM",
                timeline="Within 90 days",
                dpdp_section="Section 11"
            ),
        ]
    
    async def chat(
        self,
        message: str,
        conversation_history: List[dict],
        context: dict
    ) -> str:
        """
        Context-locked DPDP compliance chatbot.
        Answers ONLY using: scan inventory + risk report + DPDP rules.
        """
        if not self.available:
            return self._fallback_chat(message, context)
        
        system_prompt = self._build_chat_system_prompt(context)
        
        # Build conversation
        chat_session = self.model.start_chat(history=[
            {
                'role': 'user' if msg['role'] == 'user' else 'model',
                'parts': [msg['content']]
            }
            for msg in conversation_history[-10:]  # last 10 messages
        ])
        
        try:
            response = chat_session.send_message(
                f"{system_prompt}\n\nUser question: {message}",
            )
            return response.text
        except Exception as e:
            return f"I encountered an error: {str(e)}. Please try again."
    
    def _build_chat_system_prompt(self, context: dict) -> str:
        risk_level = context.get('risk_level', 'UNKNOWN')
        pii_summary = json.dumps(context.get('pii_type_counts', {}), indent=2)
        violations = context.get('rule_violations', [])
        violation_text = ', '.join(v.get('title', '') for v in violations[:5])
        
        return f"""You are a DPDP Act 2023 (India) compliance assistant for DPDP Shield platform.
You MUST answer based ONLY on the following scan context. Do not make up information.

SCAN CONTEXT:
- Risk Level: {risk_level}
- PII Types Found: {pii_summary}
- Compliance Violations: {violation_text or 'None'}
- Total PII Entities: {context.get('total_pii', 0)}

RULES:
1. Only answer questions about DPDP Act 2023 compliance
2. Cite specific DPDP sections when relevant  
3. Reference the scan results above when explaining risk
4. Keep answers concise and actionable
5. If asked something unrelated to DPDP compliance, politely redirect"""
    
    def _fallback_chat(self, message: str, context: dict) -> str:
        msg_lower = message.lower()
        risk_level = context.get('risk_level', 'UNKNOWN')
        
        if any(w in msg_lower for w in ['risk', 'score', 'why high', 'why critical']):
            pii_counts = context.get('pii_type_counts', {})
            reasons = ', '.join(f"{k}: {v}" for k, v in pii_counts.items())
            return f"Your document is rated **{risk_level}** because the following PII was detected: {reasons}. Under DPDP Act 2023 Sections 6 and 8, this data requires proper consent mechanisms and security safeguards."
        elif 'aadhaar' in msg_lower:
            return "Under DPDP Act 2023 Section 8(1), Aadhaar data is considered **Critical** sensitivity. It must be encrypted at rest and in transit, and processed only with explicit consent under Section 6. Aadhaar storage is also governed by the Aadhaar Act 2016."
        elif 'consent' in msg_lower:
            return "Section 6 of DPDP Act 2023 requires consent to be **free, specific, informed, unconditional and unambiguous**. You must obtain explicit opt-in consent before collecting any personal data. Withdrawal of consent must be as easy as giving it."
        elif 'penalty' in msg_lower or 'fine' in msg_lower:
            return "DPDP Act 2023 penalties: Data breach without safeguards — up to **₹250 crore**. Failure to notify breach — up to **₹200 crore**. Non-fulfillment of obligations — up to **₹150 crore**. Violations involving children's data — up to **₹200 crore**."
        else:
            return f"Based on your document scan (Risk Level: **{risk_level}**), I can help you understand your DPDP Act 2023 compliance status. Ask me about your risk score, specific PII types found, consent requirements, or remediation steps."
