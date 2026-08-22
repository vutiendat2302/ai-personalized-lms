import pytest

from app.schemas.assessment_schema import (
    AssessmentGenerationRequest,
    AssessmentGenerationResponse,
)
from app.services.assessment_generator import AssessmentGenerator
from app.rag.models import SearchResult
from pydantic import ValidationError


class StubProvider:
    """Provider giả để kiểm tra generator không gọi Gemini thật."""

    async def generate_assessment(
        self,
        lesson_title: str,
        lesson_content: str,
        assessment_type: str,
        question_count: int,
    ) -> AssessmentGenerationResponse:
        """Ghi nhận context được ghép rồi trả schema response tối thiểu."""
        assert lesson_title == "Biến trong Python"
        assert "NỘI DUNG BÀI HỌC" in lesson_content
        assert assessment_type == "ASSIGNMENT"
        assert question_count == 3
        return AssessmentGenerationResponse(
            assignment={
                "title": "Bài tập biến",
                "instructions": "Viết chương trình dùng biến.",
                "maxScore": 10,
                "allowLate": False,
                "submissionMode": "BLOCK_EDITOR",
            }
        )


@pytest.mark.asyncio
async def test_generator_uses_lesson_content_without_file() -> None:
    """Generator phải dùng block lesson ngay cả khi người dùng không upload tài liệu bổ sung."""
    generator = AssessmentGenerator(StubProvider())  # type: ignore[arg-type]
    request = AssessmentGenerationRequest(
        lessonId="1",
        lessonTitle="Biến trong Python",
        lessonContent="Biến dùng để lưu giá trị.",
        assessmentType="ASSIGNMENT",
        questionCount=3,
    )

    result = await generator.generate(request)

    assert result.assignment is not None
    assert result.assignment.title == "Bài tập biến"


class RagStubProvider:
    """Provider trả Quiz có cả citation hợp lệ và citation do mô hình tự tạo."""

    async def generate_assessment(
        self,
        lesson_title: str,
        lesson_content: str,
        assessment_type: str,
        question_count: int,
    ) -> AssessmentGenerationResponse:
        """Kiểm tra generator chỉ đưa Top-K chunk đã retrieve vào prompt."""
        assert "NGUỒN RAG [class-resource-10]" in lesson_content
        assert "Nội dung chunk liên quan" in lesson_content
        return AssessmentGenerationResponse(
            quiz={
                "title": "Quiz RAG",
                "description": "Kiểm tra theo nguồn",
                "timeLimitMin": 10,
                "passScore": 70,
                "maxAttempts": 2,
                "shuffleQuestions": True,
                "questions": [
                    {
                        "content": "Câu hỏi?",
                        "questionType": "SINGLE_CHOICE",
                        "points": 1,
                        "explanation": "Theo tài liệu",
                        "sourceIds": ["class-resource-10", "forged-source"],
                        "options": [
                            {"content": "Đúng", "isCorrect": True},
                            {"content": "Sai", "isCorrect": False},
                        ],
                    },
                    {
                        "content": "Câu hỏi 2?",
                        "questionType": "TRUE_FALSE",
                        "points": 1,
                        "explanation": "Theo tài liệu",
                        "options": [
                            {"content": "Đúng", "isCorrect": True},
                            {"content": "Sai", "isCorrect": False},
                        ],
                    },
                    {
                        "content": "Câu hỏi 3?",
                        "questionType": "TRUE_FALSE",
                        "points": 1,
                        "explanation": "Theo tài liệu",
                        "options": [
                            {"content": "Đúng", "isCorrect": True},
                            {"content": "Sai", "isCorrect": False},
                        ],
                    },
                ],
            }
        )


class RagStubRetriever:
    """Retriever ghi nhận filter bảo mật và trả một chunk cố định."""

    async def retrieve(
        self, query: str, filters: dict, limit: int, score_threshold: float
    ):
        """Xác nhận source/class/course/role luôn có trong filter."""
        assert query
        assert filters["sourceId"] == "class-resource-10"
        assert filters["classId"] == "class-1"
        assert filters["courseId"] == "course-1"
        assert "ROLE_TEACHER" in filters["allowedRoles"]
        assert limit == 8
        assert score_threshold == 0.0
        return [
            SearchResult(
                id="chunk-1",
                score=0.8,
                payload={"chunkText": "Nội dung chunk liên quan"},
            )
        ]


@pytest.mark.asyncio
async def test_generator_retrieves_rag_and_sanitizes_question_sources() -> None:
    """Generator dùng RAG theo source và loại citation nằm ngoài allow-list."""
    generator = AssessmentGenerator(RagStubProvider(), RagStubRetriever())  # type: ignore[arg-type]
    request = AssessmentGenerationRequest(
        lessonId="lesson-1",
        lessonTitle="Bài RAG",
        lessonContent="Nội dung lesson",
        assessmentType="QUIZ",
        questionCount=3,
        ragSourceIds=["class-resource-10"],
        classId="class-1",
        courseId="course-1",
        allowedRoles=["ROLE_TEACHER"],
    )

    result = await generator.generate(request)

    assert result.quiz is not None
    assert result.quiz.questions[0].source_ids == ["class-resource-10"]
    assert result.quiz.questions[1].source_ids == ["class-resource-10"]


class EmptyRagRetriever:
    """Retriever không tìm thấy chunk cho nguồn đã chọn."""

    async def retrieve(
        self, query: str, filters: dict, limit: int, score_threshold: float
    ):
        """Trả rỗng để kiểm tra fail-closed."""
        return []


class PartiallyMissingRagRetriever:
    """Retriever chỉ có chunk cho source đầu để kiểm tra từng source đều bắt buộc có nội dung."""

    async def retrieve(
        self, query: str, filters: dict, limit: int, score_threshold: float
    ):
        """Trả rỗng riêng source thứ hai dù source đầu có kết quả."""
        if filters["sourceId"] == "class-resource-10":
            return [
                SearchResult(
                    id="chunk-1",
                    score=0.8,
                    payload={"chunkText": "Nội dung nguồn đầu"},
                )
            ]
        return []


@pytest.mark.asyncio
async def test_generator_fails_when_selected_rag_sources_have_no_chunks() -> None:
    """Không gọi provider khi source đã chọn không có nội dung vector."""
    generator = AssessmentGenerator(RagStubProvider(), EmptyRagRetriever())  # type: ignore[arg-type]
    request = AssessmentGenerationRequest(
        lessonId="lesson-1",
        lessonTitle="Bài RAG",
        lessonContent="Nội dung lesson",
        assessmentType="QUIZ",
        questionCount=3,
        ragSourceIds=["class-resource-10"],
        classId="class-1",
        courseId="course-1",
        allowedRoles=["ROLE_TEACHER"],
    )

    with pytest.raises(ValueError, match="Không tìm thấy nội dung RAG"):
        await generator.generate(request)


@pytest.mark.asyncio
async def test_generator_fails_when_any_selected_source_has_no_chunks() -> None:
    """Không bỏ qua im lặng một source rỗng khi source khác vẫn có chunk."""
    generator = AssessmentGenerator(RagStubProvider(), PartiallyMissingRagRetriever())  # type: ignore[arg-type]
    request = AssessmentGenerationRequest(
        lessonId="lesson-1",
        lessonTitle="Bài RAG",
        lessonContent="Nội dung lesson",
        assessmentType="QUIZ",
        questionCount=3,
        ragSourceIds=["class-resource-10", "class-resource-11"],
        classId="class-1",
        courseId="course-1",
        allowedRoles=["ROLE_TEACHER"],
    )

    with pytest.raises(ValueError, match="class-resource-11"):
        await generator.generate(request)


def test_assessment_schema_rejects_unscoped_or_duplicate_rag_sources() -> None:
    """Schema chặn nguồn RAG thiếu scope và danh sách source bị trùng."""
    with pytest.raises(ValidationError):
        AssessmentGenerationRequest(
            lessonId="lesson-1",
            lessonTitle="Bài",
            lessonContent="Nội dung",
            assessmentType="QUIZ",
            questionCount=3,
            ragSourceIds=["source-1"],
        )
    with pytest.raises(ValidationError):
        AssessmentGenerationRequest(
            lessonId="lesson-1",
            lessonTitle="Bài",
            lessonContent="Nội dung",
            assessmentType="QUIZ",
            questionCount=3,
            ragSourceIds=["source-1", "source-1"],
            classId="class-1",
            courseId="course-1",
            allowedRoles=["ROLE_TEACHER"],
        )
