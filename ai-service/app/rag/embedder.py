from abc import ABC, abstractmethod

from google.genai import types

from app.core.config import settings
from app.providers.gemini_provider import GeminiProvider
from app.catalog.local_embedder import LocalCatalogEmbedder


class BaseEmbedder(ABC):
    """
    Interface trừu tượng cho các dịch vụ tạo vector nhúng ngữ nghĩa (Text & Multimodal Embeddings).

    Mục đích:
    - Định nghĩa các hành vi chuẩn hóa: Tạo vector tài liệu (`embed_documents`), tạo vector truy vấn (`embed_query`),
      và tạo vector trực tiếp từ tệp đa phương thức (`embed_media`).
    - Cho phép thay thế hoặc mock embedder trong kiểm thử tự động mà không cần kết nối mạng.
    """

    @abstractmethod
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Sinh danh sách vector nhúng cho một tập hợp các đoạn văn bản tài liệu (Passages).

        Args:
            texts (list[str]): Danh sách chuỗi văn bản cần tạo vector.

        Returns:
            list[list[float]]: Danh sách các vector số thực (ví dụ: mảng float 768 chiều).
        """
        raise NotImplementedError

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """
        Sinh một vector nhúng cho câu hỏi hoặc truy vấn tìm kiếm của người dùng (Query).

        Args:
            text (str): Chuỗi câu hỏi tìm kiếm.

        Returns:
            list[float]: Vector số thực tương ứng biểu diễn ngữ nghĩa câu hỏi.
        """
        raise NotImplementedError

    @abstractmethod
    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """
        Sinh vector nhúng trực tiếp từ tệp nhị phân đa phương thức (ảnh hoặc tệp PDF).

        Args:
            file_bytes (bytes): Dữ liệu nhị phân của tệp.
            mime_type (str): Kiểu MIME (ví dụ: 'image/png', 'application/pdf').

        Returns:
            list[float]: Vector số thực đa phương thức nằm trong cùng không gian với text vector.
        """
        raise NotImplementedError


class GeminiEmbedder(BaseEmbedder):
    """
    Hiện thực Embedding sử dụng mô hình Google Gemini Embedding 2 (mặc định 768 chiều).

    Cơ chế hoạt động và tối ưu hóa hiệu năng:
    - Sử dụng `gemini-embedding-2` đưa cả văn bản và tệp đa phương thức (ảnh/PDF) về chung một không gian vector đa chiều (Shared Embedding Space).
    - Phân chia rõ ràng `task_type`:
      + `RETRIEVAL_DOCUMENT`: Tối ưu cho việc lập chỉ mục tài liệu tri thức vào Vector Database.
      + `RETRIEVAL_QUERY`: Tối ưu cho câu hỏi tìm kiếm để tăng độ chính xác cosine ranking.
    - Gom nhóm (Batching) theo kích thước `EMBEDDING_BATCH_SIZE` (mặc định 32) để giảm thiểu số lượng HTTP request gửi tới Google API.
    - Cơ chế tự phục hồi (Fallback / Retry từng phần tử): Nếu mẻ batch trả về thiếu vector, hệ thống tự động fallback gọi từng phần tử đơn lẻ để đảm bảo tính toàn vẹn.
    """

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """
        Khởi tạo GeminiEmbedder với GeminiProvider.

        Args:
            provider (GeminiProvider | None): Instance GeminiProvider cung cấp async client.
        """
        self.provider = provider or GeminiProvider()

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Tạo vector cho danh sách văn bản theo batch với cơ chế gom nhóm và fallback tự phục hồi.

        Cơ chế:
        1. Chia mảng `texts` thành các chunk con có kích thước `EMBEDDING_BATCH_SIZE`.
        2. Gọi `_embed()` với `task_type="RETRIEVAL_DOCUMENT"`.
        3. Kiểm tra nếu số vector trả về không khớp số lượng text trong batch -> Fallback gọi từng text riêng lẻ.
        4. Tổng hợp toàn bộ vector trả về theo đúng thứ tự mảng ban đầu.

        Args:
            texts (list[str]): Danh sách các đoạn văn bản cần tạo vector.

        Returns:
            list[list[float]]: Danh sách các vector nhúng tương ứng.

        Raises:
            RuntimeError: Nếu Gemini không trả đủ số lượng embedding sau cả bước fallback.
        """
        vectors: list[list[float]] = []
        for offset in range(0, len(texts), settings.EMBEDDING_BATCH_SIZE):
            batch = texts[offset : offset + settings.EMBEDDING_BATCH_SIZE]
            batch_vectors = await self._embed(batch, "RETRIEVAL_DOCUMENT")
            if len(batch_vectors) != len(batch):
                batch_vectors = []
                for text in batch:
                    single = await self._embed([text], "RETRIEVAL_DOCUMENT")
                    if len(single) != 1:
                        raise RuntimeError("Gemini không trả đủ embedding cho document")
                    batch_vectors.append(single[0])
            vectors.extend(batch_vectors)
        return vectors

    async def embed_query(self, text: str) -> list[float]:
        """
        Tạo vector cho câu hỏi tìm kiếm với task_type chuyên dụng cho retrieval query.

        Cơ chế:
        - Gọi `_embed([text], task_type="RETRIEVAL_QUERY")` để Gemini tối ưu hóa vector đại diện câu hỏi.

        Args:
            text (str): Chuỗi câu hỏi tìm kiếm.

        Returns:
            list[float]: Vector nhúng 768 chiều.
        """
        vectors = await self._embed([text], "RETRIEVAL_QUERY")
        return vectors[0]

    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """
        Tạo vector trực tiếp từ tệp đa phương thức (ảnh/PDF) qua Gemini Multimodal Embedding.

        Cơ chế:
        - Đóng gói dữ liệu nhị phân thành `types.Part.from_bytes(data=file_bytes, mime_type=mime_type)`.
        - Cấu hình số chiều vector đầu ra cố định `output_dimensionality=settings.EMBEDDING_DIMENSION`.

        Args:
            file_bytes (bytes): Dữ liệu nhị phân của tệp.
            mime_type (str): Kiểu MIME của tệp (ví dụ: 'image/png', 'application/pdf').

        Returns:
            list[float]: Vector nhúng 768 chiều đại diện cho tệp đa phương thức.

        Raises:
            RuntimeError: Nếu Gemini không trả về embedding cho tệp media.
        """
        response = await self.provider.async_client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            config=types.EmbedContentConfig(
                output_dimensionality=settings.EMBEDDING_DIMENSION
            ),
        )
        embeddings = response.embeddings or []
        if not embeddings:
            raise RuntimeError("Gemini không trả về embedding cho media")
        return list(embeddings[0].values)

    async def _embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        """
        Phương thức nội bộ gọi API Google GenAI `embed_content` và chuẩn hóa kết quả.

        Cơ chế:
        1. Nếu danh sách `texts` rỗng -> Trả về danh sách rỗng ngay lập tức.
        2. Thiết lập cấu hình `EmbedContentConfig` với `task_type` và `output_dimensionality=768`.
        3. Chuyển đổi các giá trị float trong `response.embeddings` thành mảng Python thông thường `list[list[float]]`.

        Args:
            texts (list[str]): Mảng các chuỗi văn bản cần embed.
            task_type (str): Loại tác vụ ('RETRIEVAL_DOCUMENT' hoặc 'RETRIEVAL_QUERY').

        Returns:
            list[list[float]]: Danh sách vector số thực tương ứng.
        """
        if not texts:
            return []
        response = await self.provider.async_client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=settings.EMBEDDING_DIMENSION,
            ),
        )
        return [list(item.values) for item in (response.embeddings or [])]


class LocalRagEmbedder(BaseEmbedder):
    """Tạo embedding local 384 chiều cho RAG và memory, không dùng quota Gemini."""

    def __init__(self) -> None:
        """Khởi tạo model local dùng chung với public catalog."""
        self.delegate = LocalCatalogEmbedder()

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed các đoạn tài liệu bằng model local."""
        return await self.delegate.embed_documents(texts)

    async def embed_query(self, text: str) -> list[float]:
        """Embed câu truy vấn bằng cùng không gian vector local."""
        return await self.delegate.embed_query(text)

    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """Báo không hỗ trợ media để ingestion bỏ qua multimodal embedding."""
        raise RuntimeError("Local RAG không hỗ trợ multimodal embedding")
