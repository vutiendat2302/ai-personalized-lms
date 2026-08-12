import fitz

from app.providers.gemini_provider import GeminiProvider
from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class PdfExtractor(BaseExtractor):
    """Trích xuất text layer của PDF và giữ số trang."""

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """Khởi tạo Gemini fallback để OCR trang PDF scan."""
        self.provider = provider or GeminiProvider()

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """Đọc từng trang PDF thành segment có pageNumber."""
        if not file_bytes:
            raise ValueError("PDF phải có dữ liệu file")
        segments: list[ExtractedSegment] = []
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            page_count = len(document)
            for page_index, page in enumerate(document):
                text = page.get_text("text").strip()
                if not text:
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    text = await self.provider.generate_from_media(
                        pixmap.tobytes("png"),
                        "image/png",
                        "OCR chính xác toàn bộ chữ trên trang PDF này. Giữ tiêu đề, "
                        "danh sách và bảng ở dạng Markdown. Không giải thích thêm.",
                    )
                if text.strip():
                    segments.append(
                        ExtractedSegment(
                            text=text.strip(), metadata={"pageNumber": page_index + 1}
                        )
                    )
        if not segments:
            raise ValueError("Không trích xuất được nội dung từ PDF")
        return ExtractedDocument(segments=segments, metadata={"pageCount": page_count})
