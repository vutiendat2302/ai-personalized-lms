from types import SimpleNamespace

import pytest

from app.rag.embedder import GeminiEmbedder


class _Models:
    """Provider fake trả thiếu vector khi batch để kiểm tra fallback an toàn."""

    async def embed_content(self, *, contents, **kwargs):
        """Trả một vector cho batch và đúng một vector cho từng request đơn."""
        del kwargs
        count = 1 if isinstance(contents, list) else 1
        return SimpleNamespace(
            embeddings=[SimpleNamespace(values=[float(len(str(contents)))])] * count
        )


@pytest.mark.asyncio
async def test_document_embedding_falls_back_when_batch_is_incomplete():
    """Mỗi chunk vẫn nhận đúng một vector nếu provider không hỗ trợ batch đầy đủ."""
    provider = SimpleNamespace(async_client=SimpleNamespace(models=_Models()))
    embedder = GeminiEmbedder(provider=provider)

    vectors = await embedder.embed_documents(["chunk một", "chunk hai"])

    assert len(vectors) == 2
