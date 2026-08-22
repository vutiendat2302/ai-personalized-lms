from abc import ABC, abstractmethod

from app.rag.models import ExtractedDocument


class BaseExtractor(ABC):
    """
    Interface trừu tượng chuẩn hóa cho các bộ bóc tách dữ liệu nguồn (Multi-modal Document Extractors).

    Mục đích:
    - Chuẩn hóa đầu ra của mọi định dạng (PDF, DOCX, Ảnh, Text thuần) về cấu trúc thống nhất `ExtractedDocument`.
    - Cho phép mở rộng thêm các định dạng tệp mới (ví dụ: Audio, Video transcript, Excel) trong tương lai
      mà không làm thay đổi IngestionPipeline.
    """

    @abstractmethod
    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """
        Trích xuất dữ liệu từ chuỗi văn bản hoặc tệp nhị phân thành tài liệu ExtractedDocument có cấu trúc.

        Args:
            content (str | None): Chuỗi văn bản trực tiếp (áp dụng cho text).
            file_bytes (bytes | None): Dữ liệu byte nhị phân của tệp tải lên (áp dụng cho PDF, DOCX, Ảnh).

        Returns:
            ExtractedDocument: Đối tượng chứa danh sách các đoạn trích xuất kèm metadata ngữ cảnh.
        """
        raise NotImplementedError
