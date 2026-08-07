import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from database import Base

class PIIEntity(Base):
    __tablename__ = "pii_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    entity_type = Column(String, nullable=False)
    entity_value = Column(String, nullable=False)
    masked_value = Column(String, nullable=False)
    
    start_char = Column(Integer, nullable=False)
    end_char = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    detector_source = Column(String, nullable=False)
    page_num = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
