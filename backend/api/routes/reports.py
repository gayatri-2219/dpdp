from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.compliance_report import ComplianceReport
from tasks import generate_report
import uuid
from sqlalchemy import select
import os

router = APIRouter()

@router.post("/{document_id}/generate")
async def trigger_report(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    generate_report.delay(str(document_id))
    return {"message": "Report generation triggered"}

@router.get("/{document_id}")
async def get_report_data(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ComplianceReport).where(ComplianceReport.document_id == document_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{document_id}/download")
async def download_report(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ComplianceReport).where(ComplianceReport.document_id == document_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not os.path.exists(report.report_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    return FileResponse(report.report_path, filename=f"DPDP_Report_{document_id}.pdf")

@router.get("/")
async def list_reports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ComplianceReport).order_by(ComplianceReport.created_at.desc()))
    return result.scalars().all()
