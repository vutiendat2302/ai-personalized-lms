from abc import ABC, abstractmethod

from google.genai import types

from app.core.config import settings
from app.providers.gemini_provider import GeminiProvider


class BaseEmbedder(ABC):
    """Hợp đồng embedding độc lập với AI provider."""

    @abstractmethod
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embedding một batch tài liệu."""
        raise NotImplementedError

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Embedding một truy vấn tìm kiếm."""
        raise NotImplementedError

    @abstractmethod
    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """Embedding trực tiếp ảnh hoặc PDF vào cùng không gian vector."""
        raise NotImplementedError


class GeminiEmbedder(BaseEmbedder):
    """Embedding tài liệu và truy vấn bằng Gemini."""

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """Tái sử dụng Gemini client và cấu hình model tập trung."""
        self.provider = provider or GeminiProvider()

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embedding tài liệu theo batch để giảm số request."""
        vectors: list[list[float]] = []
        for offset in range(0, len(texts), settings.EMBEDDING_BATCH_SIZE):
            vectors.extend(
                await self._embed(
                    texts[offset : offset + settings.EMBEDDING_BATCH_SIZE],
                    "RETRIEVAL_DOCUMENT",
                )
            )
        return vectors

    async def embed_query(self, text: str) -> list[float]:
        """Embedding truy vấn với task type phù hợp retrieval."""
        vectors = await self._embed([text], "RETRIEVAL_QUERY")
        return vectors[0]

    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """Embedding media bằng khả năng multimodal của Embedding 2."""
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
        """Gọi Gemini embedding và chuẩn hóa vector trả về."""
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
