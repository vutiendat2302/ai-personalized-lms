from app.rag.extractors.base_extractor import BaseExtractor
from app.rag.extractors.docx_extractor import DocxExtractor
from app.rag.extractors.image_extractor import ImageExtractor
from app.rag.extractors.pdf_extractor import PdfExtractor
from app.rag.extractors.text_extractor import TextExtractor


class ExtractorFactory:
    """
    Nhà máy khởi tạo và điều phối các bộ trích xuất dữ liệu (Extractor Factory Pattern).

    Cơ chế hoạt động:
    - Quản lý tập trung từ điển ánh xạ giữa chuỗi định dạng `source_type` ('text', 'pdf', 'docx', 'image')
      và các instance `BaseExtractor` tương ứng.
    - Giúp IngestionPipeline và AssessmentGenerator trừu tượng hóa hoàn toàn việc xử lý file mà không cần các khối `if/else` rải rác.
    """

    def __init__(self) -> None:
        """Khởi tạo và đăng ký sẵn các bộ trích xuất tương ứng với từng định dạng tài liệu được hỗ trợ."""
        self._extractors: dict[str, BaseExtractor] = {
            "text": TextExtractor(),
            "pdf": PdfExtractor(),
            "docx": DocxExtractor(),
            "image": ImageExtractor(),
        }

    def get(self, source_type: str) -> BaseExtractor:
        """
        Lấy bộ trích xuất thích hợp dựa trên kiểu nguồn tài liệu.

        Cơ chế:
        - Tra cứu từ điển `_extractors` theo khóa `source_type`.
        - Nếu tìm thấy: trả về instance của extractor.
        - Nếu không tìm thấy: ném ngoại lệ `ValueError`.

        Args:
            source_type (str): Tên kiểu nguồn ('text', 'pdf', 'docx', 'image').

        Returns:
            BaseExtractor: Đối tượng xử lý bóc tách tài liệu tương ứng.

        Raises:
            ValueError: Nếu `source_type` chưa được hỗ trợ trong hệ thống.
        """
        extractor = self._extractors.get(source_type)
        if extractor is None:
            raise ValueError(f"Source type chưa được hỗ trợ: {source_type}")
        return extractor
