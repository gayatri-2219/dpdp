import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import uuid

class ReportGenerator:
    async def generate_pdf_report(self, document: dict, risk_score, pii_results: list, recommendations: list) -> str:
        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)
        report_path = os.path.join(reports_dir, f"report_{document.get('id', uuid.uuid4())}.pdf")
        
        doc = SimpleDocTemplate(report_path, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Header
        elements.append(Paragraph("DPDP Compliance Assessment Report", styles['Title']))
        elements.append(Spacer(1, 12))
        
        # Exec Summary
        elements.append(Paragraph("Executive Summary", styles['Heading1']))
        elements.append(Paragraph(f"Risk Level: {risk_score.level}", styles['Normal']))
        elements.append(Paragraph(f"Risk Score: {risk_score.score}", styles['Normal']))
        elements.append(Paragraph(f"Rationale: {risk_score.rationale}", styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Document Metadata
        elements.append(Paragraph("Document Metadata", styles['Heading1']))
        data = [
            ["Filename", document.get('filename', 'Unknown')],
            ["File Type", document.get('file_type', 'Unknown')],
            ["Pages", str(document.get('page_count', 0))]
        ]
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))
        
        # Recommendations
        elements.append(Paragraph("Recommendations", styles['Heading1']))
        for rec in recommendations:
            elements.append(Paragraph(f"<b>{rec.title}</b> ({rec.priority})", styles['Heading2']))
            elements.append(Paragraph(rec.description, styles['Normal']))
            for item in rec.action_items:
                elements.append(Paragraph(f"- {item}", styles['Normal']))
            elements.append(Spacer(1, 6))
            
        doc.build(elements)
        return report_path
