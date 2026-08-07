import uuid
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from database import Base

class ComplianceReport(Base):
    __tablename__ = "compliance_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    risk_level = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    
    dpdp_sections = Column(JSONB, nullable=False)
    recommendations = Column(JSONB, nullable=False)
    summary = Column(Text, nullable=False)
    report_path = Column(String, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
