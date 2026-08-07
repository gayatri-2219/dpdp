import os
import uuid
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import aiofiles
from compliance.classifier import classify_document, get_retention_policy, PII_VIOLATION_MAP
from compliance.audit_logger import AuditLogger
from ai.summary import generate_ai_summary
from config import settings

from database import get_db
from models.document import Document, DocumentStatus
from models.pii_entity import PIIEntity
from scanner.regex_patterns import RegexScanner
from scanner.presidio_scanner import PresidioScanner
from scanner.spacy_scanner import SpacyScanner
from scanner.merge import merge_all_sources
from scanner.masking import Masker
from compliance.risk_scorer import RiskScorer
from compliance.engine import ComplianceEngine
from parsers.factory import ParserFactory

router = APIRouter()

# Singletons (initialized once)
_regex_scanner = None
_presidio_scanner = None
_spacy_scanner = None
_masker = Masker()
_risk_scorer = RiskScorer()
_compliance_engine = ComplianceEngine()
_audit_logger = AuditLogger()

def get_scanners():
    global _regex_scanner, _presidio_scanner, _spacy_scanner
    if _regex_scanner is None:
        _regex_scanner = RegexScanner()
        _presidio_scanner = PresidioScanner()
        _spacy_scanner = SpacyScanner()
    return _regex_scanner, _presidio_scanner, _spacy_scanner

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'csv', 'xlsx', 'txt', 'png', 'jpg', 'jpeg'}

@router.post("/")
async def scan_document(
    file: UploadFile = File(...),
    mask_strategy: str = 'partial',
    background_tasks: BackgroundTasks = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/scan
    Unified pipeline: Upload → Parse → Detect PII → Deduplicate → Mask → Score → Rules → Store
    Returns full scan result with risk assessment.
    """
    # Validate file type
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: .{ext}")
    
    # Save file
    doc_id = str(uuid.uuid4())
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{doc_id}.{ext}")
    
    content = await file.read()
    file_size = len(content)
    
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create DB record
    doc = Document(
        id=doc_id,
        filename=f"{doc_id}.{ext}",
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        status=DocumentStatus.PROCESSING
    )
    db.add(doc)
    await db.commit()
    
    try:
        # Parse document
        parser = ParserFactory.get_parser(ext)
        parse_result = parser.parse(file_path)
        full_text = parse_result.get('text', '')
        pages = parse_result.get('pages', [])
        
        # Run scanner pipeline
        regex_sc, presidio_sc, spacy_sc = get_scanners()
        
        all_regex = []
        all_presidio = []
        all_spacy = []
        
        for page in pages:
            page_text = page.get('text', '')
            page_num = page.get('page_num', 0)
            all_regex.extend(regex_sc.scan(page_text, page_num))
            all_presidio.extend(presidio_sc.scan(page_text, page_num))
            all_spacy.extend(spacy_sc.scan(page_text, page_num))
        
        # If no pages, scan full text directly
        if not pages:
            all_regex = regex_sc.scan(full_text)
            all_presidio = presidio_sc.scan(full_text)
            all_spacy = spacy_sc.scan(full_text)
        
        # Merge & deduplicate
        merged = merge_all_sources(all_regex, all_presidio, all_spacy)
        
        # Mask
        masked_text, mask_map = _masker.mask_text(full_text, merged, mask_strategy)
        
        # Risk score
        risk = _risk_scorer.score(merged)

        # Compliance rules
        rule_results = _compliance_engine.evaluate(merged)
        compliance_summary = _compliance_engine.get_compliance_summary(rule_results)

        # ── v2: Document Classification ───────────────────────────
        pii_type_list = [p.entity_type for p in merged]
        doc_type      = classify_document(file.filename, pii_type_list)
        retention     = get_retention_policy(doc_type)

        # ── v2: DPDP Violation Mapping ────────────────────────────
        violated_sections: set = set()
        for ptype in set(pii_type_list):
            for sec in PII_VIOLATION_MAP.get(ptype, []):
                violated_sections.add(sec)
        # Also capture rule failures
        for r in rule_results:
            if hasattr(r, 'status') and r.status == 'FAIL' and hasattr(r, 'section') and r.section:
                violated_sections.add(str(r.section).replace('Section ', ''))
        violations_json = json.dumps(sorted(list(violated_sections)))

        # ── v2: AI Summary ────────────────────────────────────────
        ai_summary, _ = generate_ai_summary(
            filename=file.filename,
            doc_type=doc_type,
            risk_level=risk.level,
            risk_score=risk.score,
            pii_type_list=pii_type_list,
            violated_sections=sorted(list(violated_sections)),
            retention=retention,
        )

        # Store PII entities in DB
        for pii in merged:
            entity = PIIEntity(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                entity_type=pii.entity_type,
                entity_value=pii.value,
                masked_value=_masker._partial_mask(pii.value, pii.entity_type),
                start_char=pii.start,
                end_char=pii.end,
                confidence=pii.confidence,
                detector_source=pii.source,
                page_num=pii.page_num
            )
            db.add(entity)

        # Update document record (including new v2 fields)
        doc.status           = DocumentStatus.COMPLETED
        doc.extracted_text   = full_text[:50000]
        doc.page_count       = len(pages) or 1
        doc.pii_count        = len(merged)
        doc.risk_level       = risk.level
        doc.risk_score       = risk.score
        doc.document_type    = doc_type
        doc.violations_json  = violations_json
        doc.retention_policy = retention
        doc.ai_summary       = ai_summary
        await db.commit()

        await _audit_logger.log(
            action='SCAN_COMPLETED',
            document_id=doc_id,
            details={
                'filename': file.filename,
                'document_type': doc_type,
                'risk_level': risk.level,
                'pii_count': len(merged),
            },
            request=request,
        )
        
        # Build response (includes v2 fields)
        return {
            "scan_id":       doc_id,
            "filename":      file.filename,
            "status":        "completed",
            "document_type": doc_type,
            "retention":     retention,
            "violations":    sorted(list(violated_sections)),
            "summary": {
                "total_pii_found":        len(merged),
                "risk_level":             risk.level,
                "risk_score":             risk.score,
                "risk_rationale":         risk.rationale,
                "breakdown":              risk.breakdown,
                "pii_type_counts":        risk.pii_type_counts,
                "compliance_score":       compliance_summary['compliance_score'],
                "rules_passed":           compliance_summary['passed'],
                "rules_failed":           compliance_summary['failed'],
                "manual_review_required": compliance_summary['manual_review'],
            },
            "pii_entities": [
                {
                    "entity_type": p.entity_type,
                    "value":       p.value,
                    "masked":      _masker._partial_mask(p.value, p.entity_type),
                    "start":       p.start,
                    "end":         p.end,
                    "confidence":  p.confidence,
                    "source":      p.source,
                    "page":        p.page_num
                } for p in merged
            ],
            "masked_text": masked_text[:5000],
            "rule_results": [
                {
                    "id":          r.rule_id,
                    "title":       r.title,
                    "section":     r.section,
                    "severity":    r.severity,
                    "status":      r.status,
                    "reason":      r.reason,
                    "remediation": r.remediation
                } for r in rule_results
            ],
            "compliance_summary":  compliance_summary,
            "triggered_sections": risk.triggered_sections,
        }
    
    except Exception as e:
        doc.status = DocumentStatus.FAILED
        await db.commit()
        raise HTTPException(500, f"Scan failed: {str(e)}")


@router.post("/batch")
async def batch_scan(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Batch scan up to 20 files. Returns a list of scan_ids.
    Each scan is processed individually.
    """
    if len(files) > 20:
        raise HTTPException(400, "Maximum 20 files per batch")
    
    results = []
    for file in files:
        try:
            # Re-use single scan logic
            result = await scan_document(file=file, db=db)
            results.append({'filename': file.filename, 'status': 'queued', 'scan_id': result['scan_id']})
        except Exception as e:
            results.append({'filename': file.filename, 'status': 'error', 'error': str(e)})
    
    return {'batch_size': len(files), 'results': results}


@router.get("/{scan_id}/recommendations")
async def get_ai_recommendations(
    scan_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get AI-powered remediation recommendations for a scan."""
    from models.document import Document
    from models.pii_entity import PIIEntity
    from ai.gemini import GeminiClient
    from config import settings
    
    doc = await db.get(Document, scan_id)
    if not doc:
        raise HTTPException(404, "Scan not found")
    
    # Get PII entities
    result = await db.execute(select(PIIEntity).where(PIIEntity.document_id == scan_id))
    pii_entities = result.scalars().all()
    
    gemini = GeminiClient(api_key=settings.GEMINI_API_KEY)
    
    # In a real app we'd construct the full scan summary, for now we pass basics
    summary = {
        'pii_type_counts': {p.entity_type: 1 for p in pii_entities},
    }
    
    recommendations = await gemini.get_recommendations(
        scan_summary=summary,
        rule_violations=[],
        risk_level=doc.risk_level
    )
    return {"recommendations": [r.__dict__ for r in recommendations]}


@router.post("/{document_id}/rescan")
async def rescan_document(
    document_id: str,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/v1/scan/{document_id}/rescan
    Re-runs the full scan pipeline on an already-uploaded document.
    Deletes existing PII entities and re-scans from stored file_path.
    """
    from models.document import Document
    from models.pii_entity import PIIEntity
    from sqlalchemy import delete as sql_delete

    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(410, "Original file no longer available for re-scan")

    # Delete old PII entities
    await db.execute(sql_delete(PIIEntity).where(PIIEntity.document_id == document_id))
    doc.status = DocumentStatus.PROCESSING
    await db.commit()

    try:
        ext = doc.file_type or "txt"
        parser = ParserFactory.get_parser(ext)
        parse_result = parser.parse(doc.file_path)
        full_text = parse_result.get("text", "")
        pages = parse_result.get("pages", [])

        regex_sc, presidio_sc, spacy_sc = get_scanners()
        all_regex, all_presidio, all_spacy = [], [], []

        for page in pages:
            ptext = page.get("text", "")
            pnum  = page.get("page_num", 0)
            all_regex.extend(regex_sc.scan(ptext, pnum))
            all_presidio.extend(presidio_sc.scan(ptext, pnum))
            all_spacy.extend(spacy_sc.scan(ptext, pnum))

        if not pages:
            all_regex    = regex_sc.scan(full_text)
            all_presidio = presidio_sc.scan(full_text)
            all_spacy    = spacy_sc.scan(full_text)

        merged = merge_all_sources(all_regex, all_presidio, all_spacy)
        masked_text, _ = _masker.mask_text(full_text, merged, "partial")
        risk = _risk_scorer.score(merged)
        rule_results = _compliance_engine.evaluate(merged)
        compliance_summary = _compliance_engine.get_compliance_summary(rule_results)

        # Classify + violations
        pii_type_list = [p.entity_type for p in merged]
        doc_type  = classify_document(doc.original_filename or doc.filename, pii_type_list)
        retention = get_retention_policy(doc_type)
        violated: set = set()
        for ptype in set(pii_type_list):
            for sec in PII_VIOLATION_MAP.get(ptype, []):
                violated.add(sec)
        for r in rule_results:
            if hasattr(r, 'status') and r.status == 'FAIL' and hasattr(r, 'section') and r.section:
                violated.add(str(r.section).replace('Section ', ''))

        ai_summary, _ = generate_ai_summary(
            filename=doc.original_filename or doc.filename,
            doc_type=doc_type,
            risk_level=risk.level,
            risk_score=risk.score,
            pii_type_list=pii_type_list,
            violated_sections=sorted(list(violated)),
            retention=retention,
        )

        # Store new PII entities
        for pii in merged:
            db.add(PIIEntity(
                id=str(uuid.uuid4()),
                document_id=document_id,
                entity_type=pii.entity_type,
                entity_value=pii.value,
                masked_value=_masker._partial_mask(pii.value, pii.entity_type),
                start_char=pii.start,
                end_char=pii.end,
                confidence=pii.confidence,
                detector_source=pii.source,
                page_num=pii.page_num,
            ))

        doc.status           = DocumentStatus.COMPLETED
        doc.extracted_text   = full_text[:50000]
        doc.page_count       = len(pages) or 1
        doc.pii_count        = len(merged)
        doc.risk_level       = risk.level
        doc.risk_score       = risk.score
        doc.document_type    = doc_type
        doc.violations_json  = json.dumps(sorted(list(violated)))
        doc.retention_policy = retention
        doc.ai_summary       = ai_summary
        await db.commit()

        await _audit_logger.log(
            action='RESCAN_COMPLETED',
            document_id=document_id,
            details={
                'filename': doc.original_filename or doc.filename,
                'document_type': doc_type,
                'risk_level': risk.level,
                'pii_count': len(merged),
            },
            request=request,
        )

        return {
            "scan_id":       document_id,
            "status":        "rescanned",
            "document_type": doc_type,
            "violations":    sorted(list(violated)),
            "summary": {
                "total_pii_found": len(merged),
                "risk_level":      risk.level,
                "risk_score":      risk.score,
            },
        }

    except Exception as e:
        doc.status = DocumentStatus.FAILED
        await db.commit()
        raise HTTPException(500, f"Re-scan failed: {str(e)}")

