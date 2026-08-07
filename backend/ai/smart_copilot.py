"""
DPDP Shield — Smart AI Copilot
Replaces generic chatbot with a database-aware enterprise assistant.
Answers questions about YOUR documents: "Which files have Aadhaar?",
"Why is this file HIGH risk?", "How do I become compliant?"
"""
from typing import List, Dict, Optional
import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from config import settings
from models.document import Document
from models.pii_entity import PIIEntity

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# ── DPDP Act section reference ────────────────────────────────────────────────
DPDP_SECTIONS = {
    "4":  "Lawful Purpose — data must be collected for a defined, lawful purpose",
    "5":  "Notice — data principals must receive adequate notice",
    "6":  "Consent — explicit, free, informed consent must be obtained and recorded",
    "7":  "Certain Legitimate Uses — exemptions for employment, state functions, etc.",
    "8":  "Data Fiduciary Obligations — accuracy, security, grievance mechanisms",
    "9":  "Children's Data — special safeguards, verifiable parental consent required",
    "11": "Rights — access, correction, erasure, nomination",
    "16": "Cross-border Transfers — only to notified countries",
}

# ── PII type → DPDP section violations ───────────────────────────────────────
PII_VIOLATION_MAP = {
    "AADHAAR":         ["8", "6"],  # Sensitive — must be masked; consent needed
    "PAN":             ["8", "6"],
    "PASSPORT":        ["8", "6"],
    "BANK_ACCOUNT":    ["8"],
    "CREDIT_CARD":     ["8"],
    "MEDICAL_RECORD":  ["8", "9"],
    "EMAIL_ADDRESS":   ["6"],       # Marketing emails need consent
    "MOBILE":          ["6"],
    "DATE_OF_BIRTH":   ["9"],       # Age check for children
    "SALARY":          ["8"],
    "BIOMETRIC":       ["8", "9"],
}

# ── Document type classification ──────────────────────────────────────────────
DOC_TYPE_LABELS = {
    "hr_record":      "HR Record",
    "customer_kyc":   "Customer KYC",
    "legal_contract": "Legal Contract",
    "invoice":        "Financial Invoice",
    "marketing":      "Marketing List",
    "medical":        "Medical Record",
    "resume":         "Resume / CV",
    "general":        "General Document",
}


class SmartCopilot:
    """
    Enterprise-grade AI copilot with real database context.
    Understands your company's actual data — not just DPDP theory.
    """

    def __init__(self):
        self.system_prompt = """You are the AI Privacy Officer for DPDP Shield, an enterprise 
data privacy compliance platform. You have direct access to the company's document scan results 
and PII detection findings stored in PostgreSQL.

Your job is to answer compliance questions with REAL DATA from the company's documents — 
not generic DPDP theory. Be specific, cite actual document names, PII counts, risk levels, 
and DPDP Act 2023 sections. Format responses clearly with bullet points and numbers.

When you receive database context, use it to give precise answers. 
When no data is available, say so clearly and guide the user to upload documents first."""

    async def chat(
        self,
        message: str,
        db: AsyncSession,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        if not settings.GEMINI_API_KEY:
            return (
                "⚠️ Gemini API key not configured. "
                "Add GEMINI_API_KEY to your .env file to enable the AI Copilot."
            )

        # 1. Detect intent and pull relevant DB context
        db_context = await self._build_db_context(message, db)

        # 2. Build prompt with real data
        history_text = ""
        if conversation_history:
            for turn in conversation_history[-6:]:  # last 3 exchanges
                role = "User" if turn.get("role") == "user" else "Assistant"
                history_text += f"{role}: {turn.get('content', '')}\n"

        prompt = f"""## Your Company's Current Data (Live from Database)

{db_context}

## Conversation So Far
{history_text}

## User's Question
{message}

Answer with specific data from the database context above. 
If documents are listed, reference them by name. Cite DPDP Act sections where relevant."""

        # 3. Generate response
        try:
            model = genai.GenerativeModel(
                settings.GEMINI_MODEL or "gemini-1.5-flash",
                system_instruction=self.system_prompt
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"⚠️ AI service error: {str(e)}"

    # ── DB Context Builder ────────────────────────────────────────────────────

    async def _build_db_context(self, query: str, db: AsyncSession) -> str:
        """
        Analyzes the user query and fetches the most relevant DB data.
        Routes to specialized handlers based on detected intent.
        """
        q = query.lower()
        sections = []

        # Always include top-level stats
        sections.append(await self._get_stats_context(db))

        # Intent routing
        if any(w in q for w in ["aadhaar", "pan", "passport", "bank", "credit", "salary", "medical", "biometric"]):
            sections.append(await self._get_pii_type_context(query, db))

        if any(w in q for w in ["high risk", "critical", "dangerous", "risky", "worst"]):
            sections.append(await self._get_high_risk_context(db))

        if any(w in q for w in ["violat", "section", "dpdp", "complian", "comply"]):
            sections.append(await self._get_violations_context(db))

        if any(w in q for w in ["which file", "which document", "what file", "list", "show me", "find"]):
            sections.append(await self._get_document_list_context(db))

        if any(w in q for w in ["recommend", "fix", "remediat", "action", "should i", "what to do", "how to"]):
            sections.append(await self._get_recommendations_context(db))

        if any(w in q for w in ["hr", "employee", "staff", "resume", "kyc", "customer", "contract", "invoice"]):
            sections.append(await self._get_doctype_context(db))

        return "\n\n".join(s for s in sections if s)

    async def _get_stats_context(self, db: AsyncSession) -> str:
        try:
            doc_count  = (await db.execute(select(func.count()).select_from(Document))).scalar() or 0
            pii_count  = (await db.execute(select(func.count()).select_from(PIIEntity))).scalar() or 0
            risk_dist  = await db.execute(
                select(Document.risk_level, func.count(Document.id)).group_by(Document.risk_level)
            )
            risk_rows  = {r[0] or "UNKNOWN": r[1] for r in risk_dist.all()}
            critical   = risk_rows.get("CRITICAL", 0)
            high       = risk_rows.get("HIGH", 0)
            score      = max(0, 100 - int((critical * 30 + high * 15) / max(doc_count, 1)))

            return f"""### Company Overview
- Total documents scanned: {doc_count}
- Total PII entities found: {pii_count:,}
- Critical risk documents: {critical}
- High risk documents: {high}
- Estimated compliance score: {score}%
- Risk distribution: {risk_rows}"""
        except Exception:
            return "### Company Overview\nNo data available yet."

    async def _get_pii_type_context(self, query: str, db: AsyncSession) -> str:
        try:
            # Figure out which PII type they're asking about
            pii_keywords = {
                "aadhaar": "AADHAAR", "pan": "PAN", "passport": "PASSPORT",
                "bank": "BANK_ACCOUNT", "credit": "CREDIT_CARD", "salary": "SALARY",
                "medical": "MEDICAL", "biometric": "BIOMETRIC",
                "mobile": "MOBILE", "phone": "PHONE_NUMBER", "email": "EMAIL_ADDRESS",
            }
            target_type = None
            q = query.lower()
            for kw, ptype in pii_keywords.items():
                if kw in q:
                    target_type = ptype
                    break

            where_clause = f"WHERE pe.entity_type LIKE '%{target_type}%'" if target_type else ""
            result = await db.execute(text(f"""
                SELECT d.original_filename, d.risk_level, COUNT(pe.id) as pii_count
                FROM documents d
                JOIN pii_entities pe ON pe.document_id = d.id
                {where_clause}
                GROUP BY d.id, d.original_filename, d.risk_level
                ORDER BY pii_count DESC
                LIMIT 10
            """))
            rows = result.fetchall()
            if not rows:
                label = target_type or "that PII type"
                return f"### {label} Search\nNo documents found containing {label}."

            label = target_type or "Searched PII Type"
            lines = [f"### Documents Containing {label}"]
            for i, row in enumerate(rows, 1):
                lines.append(f"{i}. **{row[0]}** — Risk: {row[1] or 'N/A'} — {row[2]} instances")
            return "\n".join(lines)
        except Exception as e:
            return f"### PII Search\nError: {e}"

    async def _get_high_risk_context(self, db: AsyncSession) -> str:
        try:
            result = await db.execute(
                select(Document).where(
                    Document.risk_level.in_(["HIGH", "CRITICAL"])
                ).order_by(Document.risk_score.desc()).limit(10)
            )
            docs = result.scalars().all()
            if not docs:
                return "### High Risk Documents\nNo high or critical risk documents found. Well done!"
            lines = ["### High Risk Documents"]
            for d in docs:
                name = d.original_filename or d.filename
                lines.append(f"- **{name}** — {d.risk_level} (Score: {int(d.risk_score or 0)}/100, PII: {d.pii_count or 0})")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_violations_context(self, db: AsyncSession) -> str:
        try:
            result = await db.execute(text("""
                SELECT pe.entity_type, COUNT(DISTINCT pe.document_id) as doc_count, COUNT(pe.id) as total
                FROM pii_entities pe
                GROUP BY pe.entity_type
                ORDER BY total DESC
                LIMIT 10
            """))
            rows = result.fetchall()
            if not rows:
                return ""
            lines = ["### PII Type Exposure (Potential Violations)"]
            for row in rows:
                etype = row[0]
                sections = PII_VIOLATION_MAP.get(etype, [])
                sec_text = f"→ DPDP §{', §'.join(sections)}" if sections else ""
                lines.append(f"- **{etype}**: {row[1]} documents, {row[2]} instances {sec_text}")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_document_list_context(self, db: AsyncSession) -> str:
        try:
            result = await db.execute(
                select(Document).order_by(Document.created_at.desc()).limit(20)
            )
            docs = result.scalars().all()
            if not docs:
                return "### Your Documents\nNo documents scanned yet."
            lines = ["### All Scanned Documents (Latest 20)"]
            for d in docs:
                name = d.original_filename or d.filename
                doc_type = getattr(d, "document_type", None) or "General"
                lines.append(f"- **{name}** | Type: {doc_type} | Risk: {d.risk_level or 'N/A'} | PII: {d.pii_count or 0}")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_recommendations_context(self, db: AsyncSession) -> str:
        try:
            result = await db.execute(
                select(Document).where(
                    Document.risk_level.in_(["HIGH", "CRITICAL"])
                ).order_by(Document.risk_score.desc()).limit(5)
            )
            docs = result.scalars().all()
            pii_result = await db.execute(text("""
                SELECT entity_type, COUNT(*) as cnt
                FROM pii_entities GROUP BY entity_type ORDER BY cnt DESC LIMIT 8
            """))
            pii_types = [r[0] for r in pii_result.fetchall()]

            lines = ["### Compliance Remediation Context"]
            if docs:
                lines.append("**Priority documents requiring attention:**")
                for d in docs:
                    lines.append(f"- {d.original_filename or d.filename} ({d.risk_level}, {d.pii_count or 0} PII)")
            if pii_types:
                lines.append(f"**Most common PII types:** {', '.join(pii_types)}")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_doctype_context(self, db: AsyncSession) -> str:
        try:
            result = await db.execute(text("""
                SELECT document_type, COUNT(*) as cnt, AVG(risk_score) as avg_risk
                FROM documents
                WHERE document_type IS NOT NULL
                GROUP BY document_type
                ORDER BY cnt DESC
            """))
            rows = result.fetchall()
            if not rows:
                return ""
            lines = ["### Documents by Type"]
            for row in rows:
                lines.append(f"- **{row[0]}**: {row[1]} documents, avg risk score {int(row[2] or 0)}/100")
            return "\n".join(lines)
        except Exception:
            return ""
