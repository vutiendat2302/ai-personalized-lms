from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ExtractedSegment:
    """Biểu diễn một phần văn bản kèm metadata nguồn."""

    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ExtractedDocument:
    """Kết quả chuẩn hóa chung của mọi extractor."""

    segments: list[ExtractedSegment]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TextChunk:
    """Biểu diễn đoạn văn bản sẵn sàng để embedding."""

    text: str
    index: int
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class VectorRecord:
    """Biểu diễn vector và payload độc lập với Qdrant."""

    id: str
    vector: list[float]
    payload: dict[str, Any]


@dataclass(slots=True)
class SearchResult:
    """Biểu diễn kết quả tìm kiếm độc lập với vector database."""

    id: str
    score: float
    payload: dict[str, Any]
