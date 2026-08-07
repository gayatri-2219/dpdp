from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.document import Document
from models.pii_entity import PIIEntity
from schemas.analysis import MaskingRequest, MaskingResponse
from tasks import process_document
import uuid
import json
from sqlalchemy import select
from ai.masker import Masker
from ai.pii_detector import PIIResult
from ai.summary import generate_ai_summary
from compliance.classifier import get_retention_policy

router = APIRouter()

@router.post("/{document_id}")
async def trigger_analysis(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    process_document.delay(str(doc.id))
    return {"message": "Analysis triggered"}

@router.get("/{document_id}/pii")
async def get_pii(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PIIEntity).where(PIIEntity.document_id == document_id))
    entities = result.scalars().all()
    return entities

@router.post("/{document_id}/mask", response_model=MaskingResponse)
async def mask_document(document_id: uuid.UUID, request: MaskingRequest, db: AsyncSession = Depends(get_db)):
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    pii_result = await db.execute(select(PIIEntity).where(PIIEntity.document_id == document_id))
    entities = pii_result.scalars().all()
    
    # Convert ORM to PIIResult objects
    pii_objects = [
        PIIResult(
            entity_type=e.entity_type,
            value=e.entity_value,
            start=e.start_char,
            end=e.end_char,
            confidence=e.confidence,
            source=e.detector_source,
            page_num=e.page_num
        ) for e in entities
    ]
    
    masker = Masker()
    masked_text, _ = masker.mask_text(doc.extracted_text or "", pii_objects, request.strategy)
    
    return MaskingResponse(document_id=document_id, masked_text=masked_text)

@router.get("/{document_id}/masked-text")
async def get_masked_text(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Defaulting to redact
    return await mask_document(document_id, MaskingRequest(strategy="redact"), db)


@router.get("/{document_id}/summary")
async def get_document_summary(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return stored or freshly generated AI risk summary for a document."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.ai_summary:
        return {
            "document_id": str(doc.id),
            "summary": doc.ai_summary,
            "source": "stored",
        }

    pii_result = await db.execute(
        select(PIIEntity).where(PIIEntity.document_id == document_id)
    )
    entities = pii_result.scalars().all()
    pii_type_list = [e.entity_type for e in entities]

    try:
        violations = json.loads(doc.violations_json or "[]")
    except Exception:
        violations = []

    retention = doc.retention_policy or get_retention_policy(doc.document_type or "general")
    summary, source = generate_ai_summary(
        filename=doc.original_filename or doc.filename,
        doc_type=doc.document_type or "general",
        risk_level=doc.risk_level or "LOW",
        risk_score=float(doc.risk_score or 0),
        pii_type_list=pii_type_list,
        violated_sections=violations,
        retention=retention,
    )

    return {
        "document_id": str(doc.id),
        "summary": summary,
        "source": source,
    }
