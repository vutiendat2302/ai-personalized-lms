from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class TextExtractor(BaseExtractor):
    """Trích xuất nội dung text hoặc Markdown mà không làm mất cấu trúc."""

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """Chuẩn hóa text đầu vào thành một segment."""
        text = content if content is not None else (file_bytes or b"").decode("utf-8")
        if not text.strip():
            raise ValueError("Nội dung text không được để trống")
        return ExtractedDocument([ExtractedSegment(text=text.strip())])
