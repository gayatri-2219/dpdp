"""
DPDP Shield — Chat API
Enterprise-grade, database-aware AI copilot endpoint.
Replaces generic chatbot with document-context-aware answers.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from ai.smart_copilot import SmartCopilot

router = APIRouter()
copilot = SmartCopilot()


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    response: str


@router.post("/", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/chat/
    DB-aware AI copilot. Answers questions about YOUR company's documents.
    Examples:
      "Which files contain Aadhaar numbers?"
      "Why is Employee_Master.xlsx HIGH risk?"
      "How do I become DPDP compliant?"
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    response = await copilot.chat(
        message=req.message,
        db=db,
        conversation_history=req.conversation_history or [],
    )
    return ChatResponse(response=response)


@router.get("/suggestions")
async def get_suggestions(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/chat/suggestions
    Returns dynamic suggested questions based on the company's actual data.
    """
    from sqlalchemy import select, func
    from models.document import Document
    from models.pii_entity import PIIEntity

    doc_count = (await db.execute(select(func.count()).select_from(Document))).scalar() or 0

    if doc_count == 0:
        return {
            "suggestions": [
                "What is DPDP Act 2023?",
                "What are the consent requirements under DPDP?",
                "What personal data types require special protection?",
                "What are the rights of data principals?",
                "How do I prepare for a DPDP audit?",
            ]
        }

    # Data-aware suggestions
    pii_types = await db.execute(
        select(PIIEntity.entity_type, func.count(PIIEntity.id).label("cnt"))
        .group_by(PIIEntity.entity_type)
        .order_by(func.count(PIIEntity.id).desc())
        .limit(3)
    )
    top_pii = [r[0] for r in pii_types.all()]

    high_risk = (await db.execute(
        select(func.count()).select_from(Document).where(
            Document.risk_level.in_(["HIGH", "CRITICAL"])
        )
    )).scalar() or 0

    suggestions = [
        f"Which files contain {top_pii[0].replace('_', ' ').title()} numbers?" if top_pii else "Which files contain Aadhaar numbers?",
        f"Why are {high_risk} documents marked as HIGH or CRITICAL risk?" if high_risk else "How is risk level calculated?",
        "What DPDP Act sections are we currently violating?",
        "What are the top 5 actions I should take to become compliant?",
        "Generate a summary report for our compliance officer.",
        f"Which {top_pii[1].replace('_', ' ').lower() if len(top_pii) > 1 else 'PII type'} exposures are most critical?",
    ]
    return {"suggestions": suggestions}
