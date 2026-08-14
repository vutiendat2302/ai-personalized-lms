import pytest
from pydantic import ValidationError

from app.rag.chunker import RecursiveTextChunker
from app.rag.extractors.factory import ExtractorFactory
from app.rag.models import ExtractedDocument, ExtractedSegment
from app.schemas.rag_schema import IngestRequest
from app.vector_store.qdrant_store import QdrantVectorStore


@pytest.mark.asyncio
async def test_text_extractor_preserves_content() -> None:
    """Kiểm tra text extractor chuẩn hóa nội dung đầu vào."""
    document = await ExtractorFactory().get("text").extract(content="  Xin chào RAG  ")
    assert document.segments[0].text == "Xin chào RAG"


def test_chunker_splits_long_text_with_stable_indexes() -> None:
    """Kiểm tra chunker cắt nội dung dài và đánh index liên tục."""
    chunker = RecursiveTextChunker(chunk_size=30, overlap=5)
    document = ExtractedDocument(
        [
            ExtractedSegment(
                "Đây là câu thứ nhất. Đây là câu thứ hai. Đây là câu thứ ba."
            )
        ]
    )
    chunks = chunker.chunk(document)
    assert len(chunks) > 1
    assert [chunk.index for chunk in chunks] == list(range(len(chunks)))
    assert all(len(chunk.text) <= 30 for chunk in chunks)


def test_factory_rejects_unsupported_source() -> None:
    """Kiểm tra factory báo lỗi rõ ràng cho extractor chưa hỗ trợ."""
    try:
        ExtractorFactory().get("video")
    except ValueError as error:
        assert "video" in str(error)
    else:
        raise AssertionError("Factory phải từ chối source type chưa hỗ trợ")


def test_qdrant_filter_uses_match_any_for_multiple_roles() -> None:
    """Kiểm tra nhiều role được ghép bằng MatchAny trong cùng payload field."""
    query_filter = QdrantVectorStore._filter({"allowedRoles": ["ROLE_TEACHER", "ALL"]})
    condition = query_filter.must[0]
    assert condition.key == "allowedRoles"
    assert condition.match.any == ["ROLE_TEACHER", "ALL"]


def test_ingest_requires_explicit_allowed_roles() -> None:
    """Kiểm tra ingestion fail-closed khi caller quên khai báo quyền tài liệu."""
    with pytest.raises(ValidationError):
        IngestRequest.model_validate(
            {
                "sourceId": "policy-1",
                "sourceType": "text",
                "content": "Nội dung chính sách",
                "domain": "general_policy",
            }
        )
