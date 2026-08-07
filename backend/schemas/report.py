from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import enum

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DPDPSection(BaseModel):
    title: str
    description: str

class ComplianceReportResponse(BaseModel):
    id: UUID
    document_id: UUID
    risk_level: RiskLevel
    risk_score: float
    dpdp_sections: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    summary: str
    report_path: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
