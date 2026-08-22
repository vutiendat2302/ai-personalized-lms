from app.providers.gemini_provider import GeminiProvider
from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class ImageExtractor(BaseExtractor):
    """
    Bộ trích xuất nội dung hình ảnh bằng trí tuệ nhân tạo thị giác (AI Vision OCR & Visual Describer).

    Cơ chế hoạt động và xử lý đa phương thức (Multimodal Extraction):
    - Nhận dữ liệu hình ảnh (PNG, JPEG, WEBP) từ các tài liệu học tập, slide bài giảng, hoặc bảng số liệu quản trị.
    - Sử dụng `GeminiProvider.generate_from_media` kích hoạt khả năng Gemini Vision để:
      1. OCR nhận dạng chữ viết tay và chữ in tiếng Việt/tiếng Anh với độ chính xác cao.
      2. Tự động mô tả ngắn gọn ý nghĩa của các thành phần trực quan: Biểu đồ cột/tròn, sơ đồ quy trình, bảng biểu.
    - Định dạng toàn bộ kết quả thành văn bản Markdown để có thể đưa vào bộ chia nhỏ (Chunker) và tìm kiếm ngữ nghĩa.
    """

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """
        Khởi tạo ImageExtractor với GeminiProvider.

        Args:
            provider (GeminiProvider | None): Instance AI Provider hỗ trợ tính năng Gemini Vision.
        """
        self.provider = provider or GeminiProvider()

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """
        Chuyển đổi hình ảnh nhị phân thành tài liệu văn bản ExtractedDocument thông qua Gemini Vision.

        Cơ chế:
        1. Kiểm tra sự tồn tại của `file_bytes`.
        2. Xác định kiểu `mime_type` (mặc định 'image/png' nếu không truyền trong `content`).
        3. Gửi tệp nhị phân tới Gemini với prompt yêu cầu OCR chữ và mô tả cấu trúc bảng/sơ đồ.
        4. Đóng gói chuỗi văn bản Markdown vào một `ExtractedSegment` duy nhất kèm `mimeType`.

        Args:
            content (str | None): Chuỗi MIME type của ảnh (ví dụ: 'image/jpeg') nếu có.
            file_bytes (bytes | None): Dữ liệu nhị phân của tệp ảnh.

        Returns:
            ExtractedDocument: Tài liệu chứa nội dung văn bản OCR và mô tả hình ảnh.

        Raises:
            ValueError: Nếu thiếu `file_bytes` hoặc Gemini Vision không đọc được nội dung từ ảnh.
        """
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
