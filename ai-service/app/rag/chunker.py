import re

from app.rag.models import ExtractedDocument, TextChunk


class RecursiveTextChunker:
    """Cắt văn bản theo ranh giới tự nhiên với overlap cấu hình được."""

    def __init__(self, chunk_size: int, overlap: int) -> None:
        """Khởi tạo giới hạn ký tự và phần lặp giữa hai chunk."""
        if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
            raise ValueError("Cấu hình chunk_size/overlap không hợp lệ")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, document: ExtractedDocument) -> list[TextChunk]:
        """Cắt tất cả segment và bảo toàn metadata nguồn."""
        chunks: list[TextChunk] = []
        for segment in document.segments:
            for text in self._split(segment.text):
                chunks.append(
                    TextChunk(
                        text=text, index=len(chunks), metadata=dict(segment.metadata)
                    )
                )
        return chunks

    def _split(self, text: str) -> list[str]:
        """Ưu tiên cắt ở đoạn, câu rồi mới cắt cứng."""
        normalized = re.sub(r"[ \t]+", " ", text).strip()
        if len(normalized) <= self.chunk_size:
            return [normalized] if normalized else []
        result: list[str] = []
        start = 0
        while start < len(normalized):
            end = min(start + self.chunk_size, len(normalized))
            if end < len(normalized):
                boundary = max(
                    normalized.rfind("\n\n", start, end),
                    normalized.rfind(". ", start, end),
                    normalized.rfind(" ", start, end),
                )
                if boundary > start + self.chunk_size // 2:
                    end = boundary + 1
            piece = normalized[start:end].strip()
            if piece:
                result.append(piece)
            if end >= len(normalized):
                break
            start = max(start + 1, end - self.overlap)
        return result
