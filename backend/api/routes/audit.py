"""
Audit log API — paginated logs and CSV export.
"""
import csv
import io
from datetime import datetime
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.audit_log import AuditLog

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: str
    action: str
    document_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Paginated audit log entries, newest first."""
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar() or 0

    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
    )


@router.get("/export")
async def export_audit_logs(
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Download all audit logs as CSV."""
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.where(AuditLog.action == action)

    result = await db.execute(query)
    logs = result.scalars().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'ID', 'Action', 'Document ID', 'Entity Type', 'Entity ID',
        'Details', 'IP Address', 'User Agent', 'Created At',
    ])
    for log in logs:
        writer.writerow([
            str(log.id),
            log.action,
            str(log.document_id) if log.document_id else '',
            log.entity_type or '',
            log.entity_id or '',
            str(log.details) if log.details else '',
            log.ip_address or '',
            log.user_agent or '',
            log.created_at.isoformat() if log.created_at else '',
        ])

    buffer.seek(0)
    date_str = datetime.now().strftime('%Y%m%d')
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="audit_logs_{date_str}.csv"'},
    )
