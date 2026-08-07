from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models.document import DocumentStatus

class DocumentCreate(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_type: str
    file_size: int

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: DocumentStatus
    page_count: int
    pii_count: int
    risk_level: Optional[str]
    risk_score: Optional[float]
    document_type: Optional[str] = None
    ai_summary: Optional[str] = None
    violations_json: Optional[str] = None
    retention_policy: Optional[str] = None
    department: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    size: int
