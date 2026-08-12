import pytest

from app.schemas.assessment_schema import (
    AssessmentGenerationRequest,
    AssessmentGenerationResponse,
)
from app.services.assessment_generator import AssessmentGenerator


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
