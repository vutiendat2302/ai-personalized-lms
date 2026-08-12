from io import BytesIO

from docx import Document

from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class DocxExtractor(BaseExtractor):
    """Trích xuất DOCX theo đoạn và giữ đường dẫn heading gần nhất."""

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """Đọc paragraph DOCX thành các segment có headingPath."""
        if not file_bytes:
            raise ValueError("DOCX phải có dữ liệu file")
        headings: list[str] = []
        segments: list[ExtractedSegment] = []
        document = Document(BytesIO(file_bytes))
        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue
            style_name = paragraph.style.name if paragraph.style else ""
            if style_name.startswith("Heading"):
                try:
                    level = int(style_name.split()[-1])
                except ValueError:
                    level = 1
                headings = headings[: level - 1]
                headings.append(text)
                continue
            segments.append(
                ExtractedSegment(
                    text=text, metadata={"headingPath": " > ".join(headings)}
                )
            )
        if not segments:
            raise ValueError("DOCX không chứa nội dung văn bản")
        return ExtractedDocument(segments=segments)
