import asyncio
from functools import lru_cache

from app.core.config import settings


@lru_cache(maxsize=1)
def _load_model():
    """Tải model embedding local đúng một lần cho toàn bộ process."""
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=settings.CATALOG_EMBEDDING_MODEL)


class LocalCatalogEmbedder:
    """Tạo embedding đa ngôn ngữ local cho course/category catalog."""

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed batch văn bản trong worker thread để không chặn event loop."""
        if not texts:
            return []
        return await asyncio.to_thread(self._encode_documents, texts)

    async def embed_query(self, text: str) -> list[float]:
        """Embed câu truy vấn trong cùng không gian với catalog vector."""
        vectors = await asyncio.to_thread(self._encode_queries, [text])
        return vectors[0]

    @staticmethod
    def _encode_documents(texts: list[str]) -> list[list[float]]:
        """Encode và chuẩn hóa cosine vector bằng model local."""
        vectors = _load_model().embed(texts,
                                      batch_size=settings.CATALOG_EMBEDDING_BATCH_SIZE)
        return [list(map(float, vector)) for vector in vectors]

    @staticmethod
    def _encode_queries(texts: list[str]) -> list[list[float]]:
        """Encode query theo định dạng E5 để cùng không gian với passage."""
        vectors = _load_model().embed(texts,
                                      batch_size=settings.CATALOG_EMBEDDING_BATCH_SIZE)
        return [list(map(float, vector)) for vector in vectors]
