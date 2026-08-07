from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID

class PIIEntityResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_value: str
    masked_value: str
    start_char: int
    end_char: int
    confidence: float
    detector_source: str
    page_num: int

    model_config = ConfigDict(from_attributes=True)

class AnalysisResult(BaseModel):
    document_id: UUID
    pii_entities: List[PIIEntityResponse]
    risk_level: str
    risk_score: float

class MaskingRequest(BaseModel):
    strategy: str = "redact" # redact, pseudonymize, tokenize

class MaskingResponse(BaseModel):
    document_id: UUID
    masked_text: str
