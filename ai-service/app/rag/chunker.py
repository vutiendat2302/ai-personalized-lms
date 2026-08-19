import re

from app.rag.models import ExtractedDocument, TextChunk


class RecursiveTextChunker:
    """
    Bộ phân đoạn văn bản thông minh (Contextual Recursive Text Chunker).

    Cơ chế hoạt động và tối ưu hóa ngữ nghĩa (Semantic Preservation):
    - Thay vì cắt cứng theo số lượng ký tự cố định làm đứt gãy câu hoặc ý nghĩa, thuật toán ưu tiên tìm kiếm
      các ranh giới tự nhiên của ngôn ngữ theo thứ tự ưu tiên:
      1. Ngắt đoạn (`\n\n`)
      2. Kết thúc câu (`. `)
      3. Ngắt từ khoảng trắng (` `)
    - Duy trì vùng chồng lấp (`overlap`) giữa các chunk liền kề để không làm mất ngữ cảnh ở biên phân đoạn.
    - Bảo toàn toàn bộ metadata gốc của từng segment (ví dụ: số trang `pageNumber`, cấp độ tiêu đề `headingPath`).
    """

    def __init__(self, chunk_size: int, overlap: int) -> None:
        """
        Khởi tạo RecursiveTextChunker với kích thước chunk và độ chồng lấp.

        Args:
            chunk_size (int): Kích thước tối đa của một chunk tính theo ký tự (ví dụ: 2000).
            overlap (int): Số lượng ký tự chồng lấp giữa hai chunk liên tiếp (ví dụ: 200).

        Raises:
            ValueError: Nếu `chunk_size <= 0`, `overlap < 0` hoặc `overlap >= chunk_size`.
        """
        if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
            raise ValueError("Cấu hình chunk_size/overlap không hợp lệ")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, document: ExtractedDocument) -> list[TextChunk]:
        """
        Phân tách toàn bộ tài liệu đã trích xuất thành danh sách các TextChunk sẵn sàng cho Embedding.

        Cơ chế:
        1. Lặp qua từng `ExtractedSegment` trong tài liệu.
        2. Áp dụng thuật toán chia nhỏ `_split()` trên văn bản của segment đó.
        3. Gán chỉ số thứ tự tăng dần (`index`) và sao chép metadata của segment sang từng chunk.

        Args:
            document (ExtractedDocument): Tài liệu đầu vào chứa các segment kèm metadata.

        Returns:
            list[TextChunk]: Danh sách các đoạn văn bản đã chia nhỏ kèm metadata và số thứ tự.
        """
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
        """
        Thực hiện thuật toán cửa sổ trượt (Sliding Window) tìm ranh giới cắt tự nhiên.

        Cơ chế:
        1. Chuẩn hóa khoảng trắng và tab liên tiếp thành một dấu cách.
        2. Nếu toàn bộ văn bản nhỏ hơn `chunk_size` -> Trả về danh sách chứa một phần tử duy nhất.
        3. Dùng con trỏ `start` và `end = min(start + chunk_size, len)`.
        4. Tìm vị trí ranh giới tự nhiên tốt nhất (`\n\n`, `. `, ` `) trong nửa sau của cửa sổ hiện tại.
        5. Cắt đoạn văn bản, đẩy vào kết quả, và dịch chuyển `start = max(start + 1, end - overlap)`.

        Args:
            text (str): Đoạn văn bản dài cần chia nhỏ.

        Returns:
            list[str]: Danh sách các chuỗi văn bản con có độ dài phù hợp.
        """
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
