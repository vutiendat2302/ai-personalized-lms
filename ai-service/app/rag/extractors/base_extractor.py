from abc import ABC, abstractmethod

from app.rag.models import ExtractedDocument


class BaseExtractor(ABC):
    """Hợp đồng chung để trích xuất nội dung từ một loại nguồn."""

    @abstractmethod
    async def extract(
        self, *, content: str | None = None, file_bytes: bytes | None = None
    ) -> ExtractedDocument:
        """Trích xuất nguồn thành tài liệu văn bản chuẩn hóa."""
        raise NotImplementedError
