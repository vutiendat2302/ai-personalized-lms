import pytest
from unittest.mock import AsyncMock

from app.chat.chat_router import ChatRouter
from app.chat.context_builder import ManagementContextBuilder
from app.chat.fast_router import FastChatRouter
from app.rag.models import SearchResult
from app.schemas.chat_schema import (
    ChatHistoryMessage,
    ChatRoute,
    ChatStreamRequest,
    GroundingMode,
    RetrievalMode,
)


def test_fast_router_classifies_greetings_and_casual() -> None:
    """Kiểm tra Fast router phân loại ngay các câu giao tiếp cơ bản thành DIRECT."""
    router = FastChatRouter()
    for text in ["xin chào", "Chào bạn!", "Cảm ơn nhé.", "hello", "thanks", "ok"]:
        decision = router.classify(text)
        assert decision is not None, f"Failed for '{text}'"
        assert decision.route == ChatRoute.DIRECT
        assert decision.grounding == GroundingMode.NONE


def test_fast_router_classifies_policy_keywords_as_required_knowledge() -> None:
    """Kiểm tra Fast router nhận diện từ khóa chính sách tổ chức thành KNOWLEDGE REQUIRED."""
    router = FastChatRouter()
    for text in [
        "Theo quy định thì nhân viên nghỉ phép báo trước mấy ngày?",
        "Chính sách hoàn tiền của trung tâm như thế nào?",
        "Điều kiện hoàn học phí là gì?",
    ]:
        decision = router.classify(text)
        assert decision is not None, f"Failed for '{text}'"
        assert decision.route == ChatRoute.KNOWLEDGE
        assert decision.grounding == GroundingMode.REQUIRED


def test_fast_router_returns_none_for_ambiguous_queries() -> None:
    """Kiểm tra Fast router trả về None cho các câu hỏi cần LLM phân loại sâu."""
    router = FastChatRouter()
    for text in [
        "Giải thích thuật toán Dijkstra",
        "Có bao nhiêu học viên trong lớp Java 01?",
        "Viết lại đoạn email sau cho lịch sự hơn",
    ]:
        assert router.classify(text) is None


@pytest.mark.asyncio
async def test_chat_router_llm_fallback() -> None:
    """Kiểm tra ChatRouter gọi LLM Provider khi Fast Router không khớp mẫu."""
    mock_provider = AsyncMock()
    mock_provider.generate_text.return_value = (
        '{"route": "DIRECT", "grounding": "NONE", "reason": "general_coding_concept"}'
    )

    router = ChatRouter(provider=mock_provider)
    decision = await router.decide(question="Giải thích khái niệm OOP trong Java")

    assert decision.route == ChatRoute.DIRECT
    assert decision.grounding == GroundingMode.NONE
    mock_provider.generate_text.assert_called_once()


def test_context_builder_direct_vs_grounded() -> None:
    """Kiểm tra Context Builder tạo prompt riêng cho DIRECT và GROUNDED."""
    builder = ManagementContextBuilder()
    request = ChatStreamRequest(
        question="Giải thích REST API",
        ownerId="user-1",
        roles=["ROLE_STUDENT"],
        scope="STUDENT_COPILOT",
        module="COURSE",
    )

    direct_prompt = builder.build_direct(request)
    assert "TÀI LIỆU QUY CHẾ" not in direct_prompt
    assert "Giải thích REST API" in direct_prompt

    knowledge = [
        SearchResult(
            id="1",
            score=0.88,
            payload={
                "title": "Quy chế đào tạo",
                "pageNumber": 5,
                "chunkText": "Học viên được vắng tối đa 20% số buổi.",
            },
        )
    ]
    grounded_prompt = builder.build_grounded(request, knowledge)
    assert "TÀI LIỆU QUY CHẾ / GIÁO TRÌNH HỢP LỆ:" in grounded_prompt
    assert "[chunk_01]" in grounded_prompt
    assert "nguồn=Quy chế đào tạo, trang=5" in grounded_prompt
