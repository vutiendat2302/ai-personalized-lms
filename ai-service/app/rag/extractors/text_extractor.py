from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class TextExtractor(BaseExtractor):
    """
    Bộ chuẩn hóa dữ liệu văn bản thuần hoặc Markdown (Raw Text & Markdown Extractor).

    Cơ chế hoạt động:
    - Tiếp nhận trực tiếp chuỗi văn bản UTF-8 (từ form nhập liệu, bài học, mô tả khóa học) hoặc tệp `.txt`/`.md` dạng byte.
    - Xử lý giải mã và làm sạch khoảng trắng thừa ở đầu/cuối chuỗi.
    - Đóng gói toàn bộ văn bản vào một `ExtractedSegment` duy nhất sẵn sàng chuyển tiếp cho bộ RecursiveTextChunker.
    """

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """
        Chuẩn hóa chuỗi văn bản đầu vào thành một đối tượng ExtractedDocument.

        Cơ chế:
        1. Ưu tiên lấy chuỗi `content` nếu có; nếu không có, giải mã `file_bytes` theo bảng mã UTF-8.
        2. Kiểm tra chuỗi sau khi strip không được rỗng.
        3. Đóng gói văn bản vào một `ExtractedSegment`.

        Args:
            content (str | None): Chuỗi văn bản trực tiếp.
            file_bytes (bytes | None): Byte của tệp text/markdown.

        Returns:
            ExtractedDocument: Tài liệu chứa đoạn văn bản đã chuẩn hóa.

        Raises:
            ValueError: Nếu nội dung văn bản bị rỗng sau khi làm sạch.
        """
        text = content if content is not None else (file_bytes or b"").decode("utf-8")
        if not text.strip():
            raise ValueError("Nội dung text không được để trống")
        return ExtractedDocument([ExtractedSegment(text=text.strip())])
