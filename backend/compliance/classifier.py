"""
DPDP Shield — Document Classifier
Classifies documents into business types BEFORE risk scoring.
Classification is based on filename heuristics + detected PII types.
This lets us apply the right compliance rules per category.
"""
from typing import List

# ── PII type → DPDP Act section violations ───────────────────────────────────
PII_VIOLATION_MAP: dict[str, list[str]] = {
    "AADHAAR":         ["8", "6"],
    "PAN":             ["8", "6"],
    "PASSPORT":        ["8", "6"],
    "BANK_ACCOUNT":    ["8"],
    "CREDIT_CARD":     ["8"],
    "MEDICAL_RECORD":  ["8", "9"],
    "EMAIL_ADDRESS":   ["6"],
    "MOBILE":          ["6"],
    "PHONE_NUMBER":    ["6"],
    "DATE_OF_BIRTH":   ["9"],
    "SALARY":          ["8"],
    "BIOMETRIC":       ["8", "9"],
}

# ── PII type sets that signal specific document types ─────────────────────────
_HR_PII      = {"SALARY", "EMPLOYEE_ID", "BANK_ACCOUNT", "PF_NUMBER", "ESI_NUMBER"}
_KYC_PII     = {"AADHAAR", "PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE"}
_MEDICAL_PII = {"MEDICAL_RECORD", "DIAGNOSIS", "PRESCRIPTION", "BLOOD_GROUP"}
_FINANCE_PII = {"CREDIT_CARD", "BANK_ACCOUNT", "IFSC", "GST_NUMBER", "INVOICE_NUMBER"}

# ── Filename keyword maps ─────────────────────────────────────────────────────
_FILENAME_RULES = [
    # HR / Employee records
    ([
        "employee", "hr", "staff", "payroll", "salary", "offer_letter", "appointment",
        "joining", "termination", "resignation", "increment", "appraisal", "leave",
        "form16", "form_16", "epf", "esic", "pf_", "esi_", "ctc", "hike",
        "onboarding", "offboarding", "relieving", "experience_letter",
    ], "hr_record"),

    # Customer KYC / identity verification
    ([
        "kyc", "customer", "client", "onboard", "verification", "id_proof",
        "know_your_customer", "identity", "aml", "ckyc", "re_kyc",
        "account_opening", "account_open", "individual_kyc",
    ], "customer_kyc"),

    # Legal contracts, agreements, NDAs
    ([
        "contract", "agreement", "mou", "nda", "vendor", "legal",
        "sla", "msa", "terms", "tnc", "policy", "arbitration",
        "memorandum", "deed", "affidavit", "power_of_attorney",
    ], "legal_contract"),

    # Financial invoices, receipts, billing
    ([
        "invoice", "bill", "receipt", "payment", "gst", "tax", "finance",
        "purchase_order", "po_", "proforma", "quotation", "estimate",
        "debit_note", "credit_note", "challan", "ledger", "balance_sheet",
    ], "invoice"),

    # Resumes / CVs / bio-data
    ([
        "resume", "cv", "curriculum", "biodata", "bio_data", "application",
        "job_application", "profile", "portfolio", "vitae",
    ], "resume"),

    # Medical / health records
    ([
        "medical", "health", "patient", "prescription", "lab", "report_health",
        "discharge", "diagnosis", "clinical", "pathology", "radiology",
        "insurance_claim", "mediclaim", "health_insurance",
    ], "medical"),

    # Marketing / mailing lists
    ([
        "marketing", "campaign", "email_list", "leads", "subscriber", "newsletter",
        "mailing_list", "contact_list", "crm_export", "prospect", "outreach",
    ], "marketing"),
]

def classify_document(filename: str, pii_types_found: List[str]) -> str:
    """
    Returns one of:
      hr_record | customer_kyc | legal_contract | invoice |
      resume | medical | marketing | general
    """
    name_lower = filename.lower().replace(" ", "_").replace("-", "_")

    # 1. Filename-based heuristics (highest signal)
    for keywords, doc_type in _FILENAME_RULES:
        if any(kw in name_lower for kw in keywords):
            return doc_type

    # 2. PII-composition based classification
    pii_set = set(pii_types_found)

    if _HR_PII & pii_set:
        return "hr_record"
    if len(_KYC_PII & pii_set) >= 2:
        return "customer_kyc"
    if len(_KYC_PII & pii_set) >= 1 and len(pii_set) <= 4:
        # Single govt ID with few other types → likely a KYC document
        return "customer_kyc"
    if _MEDICAL_PII & pii_set:
        return "medical"
    if _FINANCE_PII & pii_set:
        return "invoice"

    # 3. Mass email detection → marketing list (lowered threshold to 10)
    email_count = pii_types_found.count("EMAIL_ADDRESS")
    if email_count >= 10:
        return "marketing"

    return "general"


# ── Human-readable labels ─────────────────────────────────────────────────────
DOC_TYPE_LABELS = {
    "hr_record":      "HR Record",
    "customer_kyc":   "Customer KYC",
    "legal_contract": "Legal Contract",
    "invoice":        "Financial Invoice",
    "resume":         "Resume / CV",
    "medical":        "Medical Record",
    "marketing":      "Marketing List",
    "general":        "General Document",
}

def get_doc_type_label(doc_type: str) -> str:
    return DOC_TYPE_LABELS.get(doc_type, "General Document")


# ── DPDP retention periods per doc type ──────────────────────────────────────
RETENTION_POLICY = {
    "hr_record":      "7 years (Employment Act)",
    "customer_kyc":   "5 years (KYC norms)",
    "legal_contract": "10 years (Limitation Act)",
    "invoice":        "8 years (GST Act)",
    "resume":         "1 year or consent",
    "medical":        "10 years (Medical Records Act)",
    "marketing":      "Until consent withdrawn",
    "general":        "As per organizational policy",
}

def get_retention_policy(doc_type: str) -> str:
    return RETENTION_POLICY.get(doc_type, "As per organizational policy")
