"""
DPDP Shield — Analytics API
Enterprise-grade metrics: document types, violation trends, department risk, compliance score.
All data from PostgreSQL — zero hardcoded values.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from database import get_db
from models.document import Document
from models.pii_entity import PIIEntity

router = APIRouter()

# DPDP section violation map (PII type -> sections)
PII_VIOLATION_MAP = {
    "AADHAAR":      ["8", "6"],
    "PAN":          ["8", "6"],
    "PASSPORT":     ["8", "6"],
    "BANK_ACCOUNT": ["8"],
    "CREDIT_CARD":  ["8"],
    "MEDICAL":      ["8", "9"],
    "EMAIL_ADDRESS": ["6"],
    "MOBILE":       ["6"],
    "SALARY":       ["8"],
    "BIOMETRIC":    ["8", "9"],
}

@router.get("/overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/analytics/overview
    Returns comprehensive enterprise metrics for the Privacy Command Center.
    """
    # Document counts
    total_docs   = (await db.execute(select(func.count()).select_from(Document))).scalar() or 0
    total_pii    = (await db.execute(select(func.count()).select_from(PIIEntity))).scalar() or 0

    # Risk distribution
    risk_result  = await db.execute(
        select(Document.risk_level, func.count(Document.id))
        .group_by(Document.risk_level)
    )
    risk_dist = {r[0] or "UNKNOWN": r[1] for r in risk_result.all()}

    critical = risk_dist.get("CRITICAL", 0)
    high     = risk_dist.get("HIGH", 0)
    medium   = risk_dist.get("MEDIUM", 0)
    low      = risk_dist.get("LOW", 0)

    # Compliance score: penalise critical (30pts) and high (15pts) per document
    score = 100
    if total_docs > 0:
        score = max(0, round(100 - (critical * 30 + high * 15) / total_docs))

    # Document type breakdown
    type_result = await db.execute(
        select(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
    )
    doc_types = {(r[0] or "general"): r[1] for r in type_result.all()}

    # PII type breakdown
    pii_result = await db.execute(
        select(PIIEntity.entity_type, func.count(PIIEntity.id))
        .group_by(PIIEntity.entity_type)
        .order_by(func.count(PIIEntity.id).desc())
        .limit(10)
    )
    pii_breakdown = {r[0]: r[1] for r in pii_result.all()}

    # DPDP violations — map PII types to sections
    violations: dict[str, int] = {}
    for pii_type, count in pii_breakdown.items():
        sections = PII_VIOLATION_MAP.get(pii_type, [])
        for section in sections:
            violations[f"Section {section}"] = violations.get(f"Section {section}", 0) + count

    # Recent scans (last 10)
    recent_result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).limit(10)
    )
    recent_docs = recent_result.scalars().all()

    recent_activity = [
        {
            "id":                str(d.id),
            "filename":          d.original_filename or d.filename,
            "original_filename": d.original_filename,
            "status":            d.status.value if hasattr(d.status, "value") else str(d.status),
            "risk_level":        d.risk_level,
            "risk_score":        d.risk_score,
            "pii_count":         d.pii_count,
            "document_type":     d.document_type,
            "created_at":        d.created_at.isoformat() if d.created_at else None,
        }
        for d in recent_docs
    ]

    # Estimated violations count
    total_violations = sum(1 for d in recent_docs if d.risk_level in ["HIGH", "CRITICAL"])

    return {
        "total_documents":   total_docs,
        "total_pii_found":   total_pii,
        "compliance_score":  score,
        "total_violations":  total_violations,
        "risk_distribution": risk_dist,
        "document_types":    doc_types,
        "pii_breakdown":     pii_breakdown,
        "dpdp_violations":   violations,
        "recent_activity":   recent_activity,
        "risk_counts": {
            "critical": critical,
            "high":     high,
            "medium":   medium,
            "low":      low,
        },
    }


@router.get("/violations")
async def get_violations(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/analytics/violations
    Per-document DPDP violation analysis.
    """
    result = await db.execute(
        select(Document).where(
            Document.risk_level.in_(["HIGH", "CRITICAL"])
        ).order_by(Document.risk_score.desc()).limit(20)
    )
    docs = result.scalars().all()

    violations = []
    for doc in docs:
        # Get PII types in this document
        pii_result = await db.execute(
            select(PIIEntity.entity_type, func.count(PIIEntity.id))
            .where(PIIEntity.document_id == doc.id)
            .group_by(PIIEntity.entity_type)
        )
        pii_types = {r[0]: r[1] for r in pii_result.all()}

        # Map to DPDP sections
        violated_sections = set()
        for pii_type in pii_types:
            for section in PII_VIOLATION_MAP.get(pii_type, []):
                violated_sections.add(section)

        violations.append({
            "document_id":    str(doc.id),
            "filename":       doc.original_filename or doc.filename,
            "risk_level":     doc.risk_level,
            "risk_score":     doc.risk_score,
            "pii_count":      doc.pii_count,
            "document_type":  doc.document_type,
            "pii_types":      pii_types,
            "dpdp_sections":  sorted(list(violated_sections)),
            "ai_summary":     doc.ai_summary,
            "retention":      doc.retention_policy,
        })

    return {"violations": violations, "total": len(violations)}


@router.get("/export/audit-csv")
async def export_audit_csv(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/analytics/export/audit-csv
    Download all scanned documents as a CSV audit log.
    Includes: id, filename, type, classification, risk, pii_count, violations, status, date, ai_summary.
    """
    import io, csv
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Filename", "File Type", "Classification",
        "Risk Level", "Risk Score", "Compliance Score",
        "PII Count", "DPDP Violations",
        "Status", "Retention Policy", "Department",
        "Scan Date", "AI Summary"
    ])

    for doc in docs:
        # Parse violations from JSON string
        import json
        try:
            violations_list = json.loads(doc.violations_json or "[]")
            violations_str  = " | ".join(f"§{s}" for s in violations_list) if violations_list else "None"
        except Exception:
            violations_str = "None"

        compliance_score = max(0, 100 - int(doc.risk_score or 0))
        status = doc.status.value if hasattr(doc.status, "value") else str(doc.status)
        scan_date = doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else ""

        writer.writerow([
            str(doc.id),
            doc.original_filename or doc.filename,
            (doc.file_type or "").upper(),
            doc.document_type or "general",
            doc.risk_level or "",
            f"{doc.risk_score or 0:.1f}",
            f"{compliance_score}%",
            doc.pii_count or 0,
            violations_str,
            status,
            doc.retention_policy or "",
            doc.department or "",
            scan_date,
            (doc.ai_summary or "").replace("\n", " "),
        ])

    output.seek(0)
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"dpdp_audit_{date_str}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
