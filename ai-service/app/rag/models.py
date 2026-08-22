from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ExtractedSegment:
    """
    Phân đoạn văn bản thô kèm metadata sau khi trích xuất từ nguồn tài liệu gốc.

    Cơ chế hoạt động:
    - Đại diện cho một đơn vị trích xuất cơ sở (ví dụ: một trang PDF, một đoạn văn bản DOCX).
    - Mang theo `metadata` ngữ cảnh (ví dụ: `{"pageNumber": 1}`, `{"headingPath": "Chương 1 > Bài 2"}`).
    """

    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ExtractedDocument:
    """
    Tài liệu đã được trích xuất hoàn chỉnh từ một file hoặc văn bản nguồn.

    Cơ chế hoạt động:
    - Là đầu ra tiêu chuẩn hóa của tất cả các `BaseExtractor` (PDF, DOCX, Ảnh, Text).
    - Tập hợp danh sách các `ExtractedSegment` cùng metadata chung của toàn bộ tài liệu (ví dụ: tổng số trang `pageCount`).
    """

    segments: list[ExtractedSegment]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TextChunk:
    """
    Đoạn văn bản sau khi qua bộ chia nhỏ (Chunker), sẵn sàng cho bước tính toán Vector Embedding.

    Cơ chế hoạt động:
    - Có độ dài văn bản tối ưu (`text`) đảm bảo không vượt quá giới hạn ngữ cảnh của mô hình Embedding.
    - Chứa chỉ số thứ tự (`index`) để tái lập cấu trúc tài liệu khi cần, và kế thừa `metadata` từ segment gốc.
    """

    text: str
    index: int
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class VectorRecord:
    """
    Bản ghi điểm dữ liệu hoàn chỉnh (Point) sẵn sàng upsert vào Vector Database (Qdrant).

    Cơ chế hoạt động:
    - Độc lập hóa dữ liệu khỏi client Qdrant.
    - Bao gồm: ID duy nhất (`id`), mảng vector nhúng số thực (`vector`), và từ điển thông tin tra cứu (`payload`).
    """

    id: str
    vector: list[float]
    payload: dict[str, Any]


@dataclass(slots=True)
class SearchResult:
    """
    Kết quả tìm kiếm ngữ nghĩa độc lập từ Vector Database.

    Cơ chế hoạt động:
    - Chứa ID của point (`id`), điểm tương đồng cosine similarity (`score`), và dữ liệu văn bản/metadata đi kèm (`payload`).
    - Dùng làm dữ liệu đầu vào cho bộ Prompt Context Builder và các công cụ tư vấn.
    """

    id: str
    score: float
    payload: dict[str, Any]
