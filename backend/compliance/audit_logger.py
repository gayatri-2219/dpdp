from typing import List, Dict, Any, Optional
from models.audit_log import AuditLog
from database import get_db
from fastapi import Request
import json

class AuditLogger:
    async def log(self, action: str, document_id: str = None, details: Dict[str, Any] = None, request: Request = None) -> None:
        async for session in get_db():
            ip_address = None
            user_agent = None
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")
                
            audit_log = AuditLog(
                action=action,
                document_id=document_id,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent
            )
            session.add(audit_log)
            await session.commit()
            break # only need one session

    async def get_logs(self, limit: int = 100, offset: int = 0) -> List[AuditLog]:
        from sqlalchemy import select
        async for session in get_db():
            result = await session.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset))
            return result.scalars().all()
