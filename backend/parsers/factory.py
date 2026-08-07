"""
DPDP Shield — Parser Factory
Maps file extensions (WITHOUT leading dot) to their parsers.
scan.py passes ext = file.filename.split('.')[-1].lower() — no dot.
"""
from parsers.base_parser import BaseParser
from parsers.pdf_parser import PDFParser
from parsers.docx_parser import DOCXParser
from parsers.csv_parser import CSVParser
from parsers.excel_parser import ExcelParser
from parsers.txt_parser import TXTParser
from parsers.image_parser import ImageParser


class ParserFactory:
    # Maps extension string (no dot) → parser class
    _MAP = {
        'pdf':  PDFParser,
        'docx': DOCXParser,
        'doc':  DOCXParser,
        'csv':  CSVParser,
        'xlsx': ExcelParser,
        'xls':  ExcelParser,
        'txt':  TXTParser,
        'png':  ImageParser,
        'jpg':  ImageParser,
        'jpeg': ImageParser,
    }

    @classmethod
    def get_parser(cls, file_extension: str) -> BaseParser:
        """Return the correct parser for a given file extension (with or without dot)."""
        ext = file_extension.lower().lstrip('.')   # normalise: strip leading dot if present
        parser_cls = cls._MAP.get(ext)
        if parser_cls is None:
            raise ValueError(f"Unsupported file extension: {ext}")
        return parser_cls()
