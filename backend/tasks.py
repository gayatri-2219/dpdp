from celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models.document import Document, DocumentStatus
from parsers.factory import ParserFactory
import time

# Sync engine for Celery tasks
_sync_db_url = settings.DATABASE_URL.replace('+asyncpg', '')
if _sync_db_url.startswith("postgres://"):
    _sync_db_url = _sync_db_url.replace("postgres://", "postgresql://", 1)
engine = create_engine(_sync_db_url, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: str):
    session = SessionLocal()
    try:
        doc = session.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return "Document not found"
        
        doc.status = DocumentStatus.PROCESSING
        session.commit()
        
        # Placeholder for full pipeline: parse -> detect PII -> score -> store
        # 1. Parse
        # parser = ParserFactory.get_parser(doc.file_type)
        # parsed_data = parser.parse(doc.file_path)
        # 2. Detect PII
        # 3. Score Risk
        
        doc.status = DocumentStatus.COMPLETED
        session.commit()
        return f"Document {document_id} processed successfully"
    except Exception as e:
        session.rollback()
        doc = session.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED
            session.commit()
        raise self.retry(exc=e, countdown=60)
    finally:
        session.close()

@celery_app.task(bind=True)
def generate_report(self, document_id: str):
    # Placeholder for generating compliance PDF report
    return f"Report generated for {document_id}"
