from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.extractors.docx_extractor import DocxExtractor
from app.rag.extractors.image_extractor import ImageExtractor
from app.rag.extractors.pdf_extractor import PdfExtractor
from app.rag.extractors.text_extractor import TextExtractor


class ExtractorFactory:
    """Chọn extractor theo source type mà không phụ thuộc router."""

    def __init__(self) -> None:
        """Đăng ký các extractor đang được hỗ trợ."""
        self._extractors: dict[str, BaseExtractor] = {
            "text": TextExtractor(),
            "pdf": PdfExtractor(),
            "docx": DocxExtractor(),
            "image": ImageExtractor(),
        }

    def get(self, source_type: str) -> BaseExtractor:
        """Trả extractor tương ứng hoặc báo loại nguồn chưa hỗ trợ."""
        extractor = self._extractors.get(source_type)
        if extractor is None:
            raise ValueError(f"Source type chưa được hỗ trợ: {source_type}")
        return extractor
