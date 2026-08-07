"""
AI / rule-based document risk summary generation.
Shared by scan pipeline and analyze API.
"""
from config import settings

DPDP_SECTION_TITLES = {
    '4': 'Unlawful Purpose (§4)',
    '6': 'Missing Consent (§6)',
    '8': 'Unmasked Sensitive Data (§8)',
    '9': "Children's Data (§9)",
    '16': 'Cross-border Transfer (§16)',
}

DOC_TYPE_RISK_CONTEXT = {
    'hr_record':      'HR records contain salary, Aadhaar, and bank data — the highest-risk category under DPDP.',
    'customer_kyc':   'KYC documents contain government IDs (Aadhaar, PAN, Passport) requiring strict masking and consent records.',
    'legal_contract': 'Legal contracts contain PII of signatories; ensure proper retention and access controls.',
    'invoice':        'Invoices may contain bank account and personal financial data requiring masking.',
    'resume':         'Resumes contain personal, contact, and financial information — limit access to HR personnel only.',
    'medical':        'Medical records carry the highest sensitivity under DPDP Section 8 and 9.',
    'marketing':      'Marketing lists require explicit, recorded consent for every data principal (§6).',
    'general':        'Document contains personal data requiring standard DPDP compliance measures.',
}


def gemini_configured() -> bool:
    key = settings.GEMINI_API_KEY
    return bool(key and key not in ('', 'your-gemini-api-key-here'))


def generate_ai_summary(
    filename: str,
    doc_type: str,
    risk_level: str,
    risk_score: float,
    pii_type_list: list,
    violated_sections: list,
    retention: str,
) -> tuple[str, str]:
    """
    Generate a plain-English risk summary for a scanned document.
    Returns (summary_text, source) where source is 'generated' or 'rule_based'.
    """
    pii_counts: dict = {}
    for p in pii_type_list:
        pii_counts[p] = pii_counts.get(p, 0) + 1
    top_pii = sorted(pii_counts.items(), key=lambda x: -x[1])[:5]
    pii_text = ', '.join(f'{k.replace("_", " ").title()} ({v})' for k, v in top_pii) or 'None'
    violation_text = ', '.join(DPDP_SECTION_TITLES.get(s, f'Section {s}') for s in violated_sections) or 'None'
    context = DOC_TYPE_RISK_CONTEXT.get(doc_type, DOC_TYPE_RISK_CONTEXT['general'])

    rule_summary = (
        f"This {doc_type.replace('_', ' ')} ({filename}) was classified as {risk_level} risk "
        f"(score: {risk_score:.0f}/100). "
        f"{context} "
        f"Detected PII: {pii_text}. "
    )
    if violated_sections:
        rule_summary += f"DPDP violations triggered: {violation_text}. "
    else:
        rule_summary += 'No DPDP violations detected. '
    rule_summary += f"Recommended retention: {retention}."

    try:
        if gemini_configured():
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = (
                f"You are a privacy compliance officer writing a 2-3 sentence plain-English risk summary "
                f"for a compliance report. Be specific, cite DPDP Act 2023 sections, and be direct.\n\n"
                f"Document: {filename}\n"
                f"Classification: {doc_type}\n"
                f"Risk Level: {risk_level} ({risk_score:.0f}/100)\n"
                f"PII Found: {pii_text}\n"
                f"Violations: {violation_text}\n"
                f"Retention: {retention}\n\n"
                f"Write the summary in 2-3 sentences. No bullet points. No markdown."
            )
            resp = model.generate_content(prompt)
            return resp.text.strip(), 'generated'
    except Exception:
        pass

    return rule_summary, 'rule_based'
