from unittest.mock import AsyncMock, MagicMock
import pytest

from app.catalog.local_embedder import LocalCatalogEmbedder, clean_text
from app.catalog.service import CatalogVectorService


def test_clean_text() -> None:
    """Kiểm tra clean_text loại bỏ HTML tag và khoảng trắng thừa."""
    html = "<p>Khóa học   <strong>Lập trình</strong> Java <br/> nâng cao</p>"
    assert clean_text(html) == "Khóa học Lập trình Java nâng cao"
    assert clean_text("") == ""
    assert clean_text("   nhiều    khoảng    trắng   ") == "nhiều khoảng trắng"


@pytest.mark.asyncio
async def test_embed_documents_deduplication(monkeypatch) -> None:
    """Kiểm tra embed_documents deduplicate văn bản trùng trước khi encode."""
    embedder = LocalCatalogEmbedder()
    call_texts: list[list[str]] = []

    def fake_encode(texts: list[str]) -> list[list[float]]:
        """Ghi nhận danh sách văn bản thực tế được encode."""
        call_texts.append(texts)
        return [[float(i), float(i)] for i in range(len(texts))]

    monkeypatch.setattr(embedder, "_encode_documents", fake_encode)

    input_texts = ["text A", "text B", "text A", "text C", "text B"]
    vectors = await embedder.embed_documents(input_texts)

    # Chỉ encode 3 text duy nhất ("text A", "text B", "text C")
    assert len(call_texts[0]) == 3
    assert len(vectors) == 5
    # text A ở vị trí 0 và 2 phải có cùng vector
    assert vectors[0] == vectors[2]
    # text B ở vị trí 1 và 4 phải có cùng vector
    assert vectors[1] == vectors[4]


@pytest.mark.asyncio
async def test_embed_query_caching(monkeypatch) -> None:
    """Kiểm tra embed_query cache kết quả theo chuỗi truy vấn."""
    embedder = LocalCatalogEmbedder()
    call_count = 0

    class DummyModel:
        """Mô hình giả lập đếm số lần gọi embed."""

        def embed(self, texts: list[str], batch_size: int = 1):
            """Tạo vector giả lập cho query."""
            nonlocal call_count
            call_count += 1
            return [[0.1, 0.2, 0.3]]

    monkeypatch.setattr("app.catalog.local_embedder._load_model", lambda: DummyModel())

    # Gọi lần đầu với query duy nhất
    vec1 = await embedder.embed_query("khóa học python đặc biệt 2026")
    # Gọi lần hai với cùng query
    vec2 = await embedder.embed_query("khóa học python đặc biệt 2026")

    assert vec1 == vec2
    # Do cache LRU, embed của model chỉ được gọi 1 lần
    assert call_count == 1


@pytest.mark.asyncio
async def test_catalog_index_skips_when_hash_matches() -> None:
    """Kiểm tra index bỏ qua embed và upsert khi contentHash không thay đổi."""
    service = CatalogVectorService()
    service.embedder = MagicMock()
    service.embedder.embed_documents = AsyncMock()
    service.vector_store = MagicMock()
    service.vector_store.ensure_collection = AsyncMock()
    service.vector_store.upsert = AsyncMock()

    text = "Khóa học AI Specialist"
    cleaned = clean_text(text)
    expected_hash = service._content_hash(cleaned)

    # Giả lập Qdrant đã có bản ghi với hash giống hệt
    service.vector_store.get_payload_field = AsyncMock(return_value={"101": expected_hash})

    await service.index(source_id="101", entity_type="course", text=text, metadata={"title": "AI"})

    # Không gọi embedder và không gọi upsert
    service.embedder.embed_documents.assert_not_called()
    service.vector_store.upsert.assert_not_called()


@pytest.mark.asyncio
async def test_catalog_index_updates_when_hash_differs() -> None:
    """Kiểm tra index thực hiện embed và upsert khi nội dung thay đổi."""
    service = CatalogVectorService()
    service.embedder = MagicMock()
    service.embedder.embed_documents = AsyncMock(return_value=[[0.5, 0.5]])
    service.vector_store = MagicMock()
    service.vector_store.ensure_collection = AsyncMock()
    service.vector_store.upsert = AsyncMock()

    # Giả lập Qdrant chưa có hoặc hash cũ khác
    service.vector_store.get_payload_field = AsyncMock(return_value={"101": "old_hash_xyz"})

    await service.index(source_id="101", entity_type="course", text="Khóa học AI mới", metadata={"title": "AI"})

    service.embedder.embed_documents.assert_called_once()
    service.vector_store.upsert.assert_called_once()
    upserted_record = service.vector_store.upsert.call_args[0][1][0]
    assert upserted_record.payload["sourceId"] == "101"
    assert "contentHash" in upserted_record.payload


@pytest.mark.asyncio
async def test_catalog_index_batch_filters_unchanged() -> None:
    """Kiểm tra index_batch chỉ embed các bản ghi có hash thay đổi."""
    service = CatalogVectorService()
    service.embedder = MagicMock()
    service.embedder.embed_documents = AsyncMock(return_value=[[0.1, 0.2]])
    service.vector_store = MagicMock()
    service.vector_store.ensure_collection = AsyncMock()
    service.vector_store.upsert = AsyncMock()

    hash_course_1 = service._content_hash(clean_text("Course 1 unchanged"))
    items = [
        {"entityType": "course", "sourceId": "1", "text": "Course 1 unchanged", "metadata": {}},
        {"entityType": "course", "sourceId": "2", "text": "Course 2 new", "metadata": {}},
    ]

    # Course 1 đã tồn tại với hash cũ, Course 2 chưa có
    service.vector_store.get_payload_field = AsyncMock(return_value={"1": hash_course_1})

    await service.index_batch(items)

    # Chỉ embed 1 item (Course 2)
    service.embedder.embed_documents.assert_called_once_with(["Course 2 new"])
    service.vector_store.upsert.assert_called_once()
    records = service.vector_store.upsert.call_args[0][1]
    assert len(records) == 1
    assert records[0].payload["sourceId"] == "2"


@pytest.mark.asyncio
async def test_ensure_once_caches_collection() -> None:
    """Kiểm tra _ensure_once chỉ gọi ensure_collection một lần duy nhất."""
    service = CatalogVectorService()
    service.vector_store = MagicMock()
    service.vector_store.ensure_collection = AsyncMock()

    await service._ensure_once("test_col", 384)
    await service._ensure_once("test_col", 384)

    assert service.vector_store.ensure_collection.call_count == 1
