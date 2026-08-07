from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.document import Document
from schemas.document import DocumentListResponse, DocumentResponse
from compliance.audit_logger import AuditLogger
import uuid
from sqlalchemy import select, func

router = APIRouter()
_audit_logger = AuditLogger()

@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1), 
    size: int = Query(10, ge=1, le=100),
    risk_level: str = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Document)
    if risk_level:
        query = query.where(Document.risk_level == risk_level)
        
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.original_filename or doc.filename
        
    import os
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        
    await db.delete(doc)
    await db.commit()

    await _audit_logger.log(
        action='DOCUMENT_DELETED',
        document_id=str(document_id),
        details={'filename': filename},
        request=request,
    )
    return {"message": "Document deleted"}
