from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.document import Document
from models.pii_entity import PIIEntity
from sqlalchemy import select, func

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Total documents
    doc_count_result = await db.execute(select(func.count()).select_from(Document))
    total_documents = doc_count_result.scalar() or 0
    
    # Total PII found
    pii_count_result = await db.execute(select(func.count()).select_from(PIIEntity))
    total_pii_found = pii_count_result.scalar() or 0
    
    # Risk distribution
    risk_dist_result = await db.execute(
        select(Document.risk_level, func.count(Document.id))
        .group_by(Document.risk_level)
    )
    risk_distribution = {row[0] or "UNKNOWN": row[1] for row in risk_dist_result.all()}
    
    # PII type breakdown
    pii_type_result = await db.execute(
        select(PIIEntity.entity_type, func.count(PIIEntity.id))
        .group_by(PIIEntity.entity_type)
    )
    pii_type_breakdown = {row[0]: row[1] for row in pii_type_result.all()}
    
    # Recent activity — includes pii_count, document_type, file_size for dashboard display
    recent_docs_result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).limit(5)
    )
    recent_docs = recent_docs_result.scalars().all()
    recent_activity = [
        {
            "id": str(d.id),
            "filename": d.original_filename or d.filename,
            "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
            "risk_level": d.risk_level,
            "risk_score": d.risk_score,
            "pii_count": d.pii_count,
            "document_type": d.document_type,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in recent_docs
    ]

    # Document type breakdown
    doc_type_result = await db.execute(
        select(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
    )
    document_types = {row[0] or "general": row[1] for row in doc_type_result.all()}

    # Compliance score (average across all docs with risk_score)
    avg_risk_result = await db.execute(select(func.avg(Document.risk_score)))
    avg_risk = avg_risk_result.scalar() or 0
    compliance_score = max(0, round(100 - avg_risk))

    return {
        "total_documents": total_documents,
        "total_pii_found": total_pii_found,
        "compliance_score": compliance_score,
        "risk_distribution": risk_distribution,
        "pii_type_breakdown": pii_type_breakdown,
        "document_types": document_types,
        "recent_activity": recent_activity,
        "processing_queue_size": 0,
    }
