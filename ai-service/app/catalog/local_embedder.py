import asyncio
from functools import lru_cache
import re

from app.core.config import settings


def clean_text(text: str) -> str:
    """Loại bỏ thẻ HTML và chuẩn hóa khoảng trắng thừa trong văn bản."""
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", cleaned).strip()


@lru_cache(maxsize=1)
def _load_model():
    """Tải model embedding local đúng một lần cho toàn bộ process."""
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=settings.CATALOG_EMBEDDING_MODEL)


@lru_cache(maxsize=1024)
def _cached_encode_query(query: str) -> tuple[float, ...]:
    """Encode một truy vấn đơn lẻ có tiền tố query và lưu cache."""
    prefixed = f"query: {query}" if not query.startswith("query: ") else query
    vectors = _load_model().embed([prefixed], batch_size=1)
    return tuple(map(float, next(iter(vectors))))


class LocalCatalogEmbedder:
    """Tạo embedding đa ngôn ngữ local cho course/category catalog."""

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed batch văn bản sau khi deduplicate trong worker thread."""
        if not texts:
            return []
        unique_texts = list(dict.fromkeys(texts))
        if len(unique_texts) == len(texts):
            return await asyncio.to_thread(self._encode_documents, texts)
        unique_vectors = await asyncio.to_thread(self._encode_documents, unique_texts)
        text_to_vec = dict(zip(unique_texts, unique_vectors, strict=True))
        return [text_to_vec[t] for t in texts]

    async def embed_query(self, text: str) -> list[float]:
        """Embed câu truy vấn trong cùng không gian với catalog vector có cache LRU."""
        vector_tuple = await asyncio.to_thread(_cached_encode_query, text)
        return list(vector_tuple)

    @staticmethod
    def _encode_documents(texts: list[str]) -> list[list[float]]:
        """Encode và chuẩn hóa cosine vector với tiền tố passage bằng model local."""
        prefixed = [f"passage: {t}" if not t.startswith("passage: ") else t for t in texts]
        vectors = _load_model().embed(prefixed, batch_size=settings.CATALOG_EMBEDDING_BATCH_SIZE)
        return [list(map(float, vector)) for vector in vectors]

    @staticmethod
    def _encode_queries(texts: list[str]) -> list[list[float]]:
        """Encode danh sách query theo định dạng E5 để cùng không gian với passage."""
        prefixed = [f"query: {t}" if not t.startswith("query: ") else t for t in texts]
        vectors = _load_model().embed(prefixed, batch_size=settings.CATALOG_EMBEDDING_BATCH_SIZE)
        return [list(map(float, vector)) for vector in vectors]
