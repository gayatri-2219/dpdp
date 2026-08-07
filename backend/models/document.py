import uuid
from sqlalchemy import Column, String, Integer, Float, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from database import Base
import enum

class DocumentStatus(str, enum.Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED  = "COMPLETED"
    FAILED     = "FAILED"

class Document(Base):
    __tablename__ = "documents"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename          = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path         = Column(String, nullable=False)
    file_type         = Column(String, nullable=False)
    file_size         = Column(Integer, nullable=False)

    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)

    extracted_text = Column(Text, nullable=True)
    page_count     = Column(Integer, default=0)

    pii_count  = Column(Integer, default=0)
    risk_level = Column(String, nullable=True)
    risk_score = Column(Float, nullable=True)

    # ── Enterprise fields (v2) ────────────────────────────────────
    # Classification: hr_record | customer_kyc | legal_contract | invoice | resume | medical | marketing | general
    document_type    = Column(String, nullable=True)
    # Plain-English AI risk summary generated during scan
    ai_summary       = Column(Text, nullable=True)
    # JSON array of violated DPDP sections e.g. ["6","8"]
    violations_json  = Column(Text, nullable=True)
    # Retention period recommended by doc type
    retention_policy = Column(String, nullable=True)
    # Department (editable by user)
    department       = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
