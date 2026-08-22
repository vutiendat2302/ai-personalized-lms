import pytest
from pydantic import ValidationError
from unittest.mock import AsyncMock

from app.routers import chat as chat_module
from app.schemas.chat_schema import ChatRoute, ChatRoutingDecision, GroundingMode
from app.schemas.chat_schema import ChatStreamRequest


def base_request(**overrides: object) -> dict[str, object]:
    """Tạo payload tối thiểu cho schema ChatStreamRequest."""
    payload: dict[str, object] = {
        "question": "Giải thích bài học",
        "ownerId": "student-1",
        "roles": ["ROLE_STUDENT"],
        "scope": "STUDENT_ASSISTANT",
        "module": "TRAINING",
    }
    payload.update(overrides)
    return payload


def test_lesson_scope_requires_course_and_lesson() -> None:
    """LESSON_ONLY fail-closed nếu Backend không gửi đủ khóa filter."""
    with pytest.raises(ValidationError):
        ChatStreamRequest(**base_request(retrievalScope="LESSON_ONLY"))
    with pytest.raises(ValidationError):
        ChatStreamRequest(
            **base_request(retrievalScope="LESSON_ONLY", courseId="course-1")
        )


def test_class_scope_requires_class_id() -> None:
    """CLASS_MATERIALS không được chạy chỉ với courseId."""
    with pytest.raises(ValidationError):
        ChatStreamRequest(
            **base_request(retrievalScope="CLASS_MATERIALS", courseId="course-1")
        )


def test_valid_learning_scopes_are_accepted() -> None:
    """Chấp nhận các scope có đầy đủ course/class/lesson tương ứng."""
    lesson = ChatStreamRequest(
        **base_request(
            retrievalScope="LESSON_ONLY", courseId="course-1", lessonId="lesson-1"
        )
    )
    clazz = ChatStreamRequest(
        **base_request(
            retrievalScope="CLASS_MATERIALS", courseId="course-1", classId="class-1"
        )
    )
    course = ChatStreamRequest(
        **base_request(retrievalScope="COURSE_MATERIALS", courseId="course-1")
    )

    assert lesson.lesson_id == "lesson-1"
    assert clazz.class_id == "class-1"
    assert course.course_id == "course-1"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("scope_fields", "expected_filters"),
    [
        (
            {
                "retrievalScope": "LESSON_ONLY",
                "courseId": "course-1",
                "lessonId": "lesson-1",
            },
            {
                "courseId": "course-1",
                "lessonId": "lesson-1",
                "visibility": "COURSE",
            },
        ),
        (
            {
                "retrievalScope": "CLASS_MATERIALS",
                "courseId": "course-1",
                "classId": "class-1",
            },
            {
                "courseId": "course-1",
                "classId": "class-1",
                "visibility": "CLASS",
            },
        ),
        (
            {"retrievalScope": "COURSE_MATERIALS", "courseId": "course-1"},
            {"courseId": "course-1", "visibility": "COURSE"},
        ),
    ],
)
async def test_student_retrieval_uses_exact_learning_filters(
    monkeypatch: pytest.MonkeyPatch,
    scope_fields: dict[str, object],
    expected_filters: dict[str, str],
) -> None:
    """Mỗi scope phải lọc cả ownership và visibility để không lộ tài liệu lớp khác."""
    monkeypatch.setattr(
        chat_module.query_rewriter, "rewrite", AsyncMock(return_value="rewritten")
    )
    retrieve_mock = AsyncMock(return_value=[])
    monkeypatch.setattr(chat_module.retriever, "retrieve", retrieve_mock)
    request = ChatStreamRequest(
        **base_request(
            **scope_fields,
            retrievalMode="ALWAYS",
        )
    )

    _ = [event async for event in chat_module.sse_event_generator(request)]

    filters = retrieve_mock.await_args.args[1]
    assert filters["module"] == "TRAINING"
    assert "ROLE_STUDENT" in filters["allowedRoles"]
    for key, value in expected_filters.items():
        assert filters[key] == value


@pytest.mark.asyncio
async def test_general_student_scope_never_retrieves_training_documents(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GENERAL dùng câu trả lời trực tiếp kể cả router yêu cầu KNOWLEDGE."""
    monkeypatch.setattr(
        chat_module.chat_router,
        "decide",
        AsyncMock(
            return_value=ChatRoutingDecision(
                route=ChatRoute.KNOWLEDGE,
                grounding=GroundingMode.REQUIRED,
                reason="forced-test",
            )
        ),
    )
    monkeypatch.setattr(
        chat_module.query_rewriter, "rewrite", AsyncMock(return_value="rewritten")
    )
    retrieve_mock = AsyncMock(return_value=[])
    monkeypatch.setattr(chat_module.retriever, "retrieve", retrieve_mock)

    async def fake_stream(prompt: str, system_instruction: str):
        """Phát một token cố định để test generator mà không gọi provider thật."""
        yield "câu trả lời chung"

    monkeypatch.setattr(chat_module.gemini_provider, "chat_stream", fake_stream)
    request = ChatStreamRequest(
        **base_request(
            retrievalScope="GENERAL",
            retrievalMode="ALWAYS",
            question="Giải thích khái niệm chung",
        )
    )

    events = [event async for event in chat_module.sse_event_generator(request)]

    retrieve_mock.assert_not_awaited()
    assert any("câu trả lời chung" in event for event in events)
    assert any('"sources": []' in event for event in events)
