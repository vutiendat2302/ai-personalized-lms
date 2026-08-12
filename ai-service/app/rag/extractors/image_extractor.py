from app.providers.gemini_provider import GeminiProvider
from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class ImageExtractor(BaseExtractor):
    """OCR chữ và mô tả thành phần trực quan trong ảnh quản trị."""

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """Khởi tạo provider hỗ trợ Gemini Vision."""
        self.provider = provider or GeminiProvider()

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """Chuyển ảnh thành Markdown có thể chunk và tìm kiếm."""
        if not file_bytes:
            raise ValueError("Ảnh phải có dữ liệu file")
        mime_type = content or "image/png"
        text = await self.provider.generate_from_media(
            file_bytes,
            mime_type,
            "OCR chính xác chữ trong ảnh và mô tả ngắn gọn biểu đồ, bảng, sơ đồ "
            "hoặc thành phần giao diện. Trả Markdown, không giải thích thêm.",
        )
        if not text.strip():
            raise ValueError("Không trích xuất được nội dung từ ảnh")
        return ExtractedDocument(
            [ExtractedSegment(text=text.strip(), metadata={"mimeType": mime_type})]
        )
