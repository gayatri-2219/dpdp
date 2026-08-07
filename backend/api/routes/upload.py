from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.document import Document, DocumentStatus
from schemas.document import DocumentResponse
from config import settings
from tasks import process_document
import os
import uuid
import aiofiles

router = APIRouter()

@router.post("/", response_model=DocumentResponse)
async def upload_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension not allowed")
        
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    # Read to check size and save
    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
        
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(content)
        
    doc = Document(
        original_filename=file.filename,
        filename=unique_filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        status=DocumentStatus.PENDING
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # Enqueue task
    process_document.delay(str(doc.id))
    
    return doc

@router.get("/{document_id}/status")
async def get_status(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "status": doc.status}
