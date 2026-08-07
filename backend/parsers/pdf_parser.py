"""
DPDP Shield — PDF Parser (pdfplumber)
Extracts text + tables from PDFs with Tesseract OCR fallback for scanned pages.
"""
import os
from .base_parser import BaseParser


class PDFParser(BaseParser):
    """
    PDF parser using pdfplumber.
    - Extracts text and tables from each page
    - Falls back to Tesseract OCR if a page yields < 50 characters
      (indicates a scanned/image-only PDF)
    """

    MIN_TEXT_THRESHOLD = 50  # chars below which OCR is triggered

    def parse(self, file_path: str) -> dict:
        try:
            import pdfplumber
        except ImportError:
            raise ImportError(
                "pdfplumber is not installed. Run: pip install pdfplumber"
            )

        all_pages = []
        all_text  = []

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)

            for i, page in enumerate(pdf.pages):
                # ── 1. Extract selectable text ─────────────────────
                page_text = page.extract_text() or ""

                # ── 2. Extract tables → pipe-separated rows ────────
                table_text = ""
                try:
                    tables = page.extract_tables() or []
                    for table in tables:
                        for row in table:
                            if row:
                                row_str = " | ".join(
                                    str(cell or "").strip() for cell in row
                                )
                                table_text += row_str + "\n"
                except Exception:
                    pass  # tables are optional

                combined = (page_text + "\n" + table_text).strip()

                # ── 3. OCR fallback for image-only pages ───────────
                if len(combined) < self.MIN_TEXT_THRESHOLD:
                    ocr_text = self._ocr_page(page)
                    if ocr_text:
                        combined = ocr_text

                cleaned = self._clean_text(combined)
                all_pages.append({"page_num": i + 1, "text": cleaned})
                all_text.append(cleaned)

        full_text = "\n\n".join(all_text)
        return {
            "text": full_text,
            "metadata": {
                "filename":  os.path.basename(file_path),
                "pages":     total_pages,
                "language":  "en",
                "file_size": os.path.getsize(file_path),
            },
            "pages": all_pages,
        }

    def _ocr_page(self, page) -> str:
        """Render PDF page to image and run Tesseract OCR."""
        try:
            import pytesseract

            # pdfplumber's to_image returns a PageImage wrapper
            img = page.to_image(resolution=150).original  # PIL Image
            text = pytesseract.image_to_string(img, lang="eng")
            return text.strip()
        except Exception as e:
            print(f"[PDFParser] OCR failed: {e}")
            return ""
