import fitz

from app.providers.gemini_provider import GeminiProvider
from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.models import ExtractedDocument, ExtractedSegment


class PdfExtractor(BaseExtractor):
    """
    Bộ trích xuất văn bản từ tệp PDF thông minh hỗ trợ 2 lớp (Hybrid Text-Layer & OCR Vision Fallback).

    Cơ chế hoạt động và xử lý tài liệu đa dạng:
    1. Lớp 1 (Fast Native Text Extraction): Mở tệp PDF từ bộ nhớ bằng PyMuPDF (`fitz`), duyệt qua từng trang và lấy nhanh text layer sẵn có.
    2. Lớp 2 (AI Vision Fallback for Scanned Pages): Nếu một trang PDF là tài liệu scan (không có text layer, `get_text() == ""`),
       hệ thống tự động render trang đó thành ảnh PNG độ phân giải cao (`Matrix(2, 2)`) và gọi Gemini Vision (`generate_from_media`)
       để OCR nhận diện chữ, bảng biểu và công thức toán học/khoa học dạng Markdown.
    3. Bảo toàn số trang (`pageNumber`) cho từng segment để người dùng có thể đối chiếu nguồn chính xác trong câu trả lời AI.
    """

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """
        Khởi tạo PdfExtractor với GeminiProvider phục vụ OCR fallback.

        Args:
            provider (GeminiProvider | None): Instance AI Provider xử lý OCR ảnh trang PDF scan.
        """
        self.provider = provider or GeminiProvider()

    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """
        Phân tích và trích xuất nội dung toàn bộ các trang của tệp PDF.

        Cơ chế:
        1. Kiểm tra dữ liệu `file_bytes`.
        2. Mở tài liệu PDF bằng PyMuPDF, lấy tổng số trang `page_count`.
        3. Với mỗi trang:
           - Thử lấy text layer thuần qua `page.get_text("text")`.
           - Nếu trống -> Render trang thành ảnh PNG và gọi OCR Gemini Vision.
           - Đóng gói văn bản trích xuất vào `ExtractedSegment` với metadata `pageNumber = page_index + 1`.

        Args:
            content (str | None): Không sử dụng cho PDF.
            file_bytes (bytes | None): Dữ liệu nhị phân của tệp PDF.

        Returns:
            ExtractedDocument: Tài liệu chứa danh sách các segment theo từng trang và tổng số trang.

        Raises:
            ValueError: Nếu thiếu `file_bytes` hoặc không thể trích xuất được bất kỳ nội dung nào từ tệp PDF.
        """
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
