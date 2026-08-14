import base64
import binascii
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AssessmentSourceFile(BaseModel):
    """Một file nguồn tạm thời đã được Backend authorize và giới hạn kích thước."""

    name: str = Field(min_length=1, max_length=255)
    mime_type: Literal[
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
    ] = Field(alias="mimeType")
    content_base64: str = Field(
        alias="contentBase64", min_length=1, max_length=14_000_000
    )

    def decoded_content(self) -> bytes:
        """Giải mã file chỉ trong bộ nhớ request; không ghi file nguồn vào AI Service."""
        try:
            return base64.b64decode(self.content_base64, validate=True)
        except (ValueError, binascii.Error) as exception:
            raise ValueError("contentBase64 không hợp lệ") from exception

    model_config = {"populate_by_name": True}


class AssessmentGenerationRequest(BaseModel):
    """Context lesson và tài liệu upload để Gemini sinh assessment draft có schema cố định."""

    lesson_id: str = Field(alias="lessonId", min_length=1)
    lesson_title: str = Field(alias="lessonTitle", min_length=1, max_length=255)
    lesson_content: str = Field(alias="lessonContent", min_length=1, max_length=50_000)
    assessment_type: Literal["QUIZ", "ASSIGNMENT", "BOTH"] = Field(
        alias="assessmentType"
    )
    question_count: int = Field(alias="questionCount", ge=3, le=15)
    source_files: list[AssessmentSourceFile] = Field(
        default_factory=list, alias="sourceFiles", max_length=3
    )

    @model_validator(mode="after")
    def validate_requested_assessment(self) -> "AssessmentGenerationRequest":
        """Đảm bảo loại assessment cần sinh có quy tắc rõ trước khi gọi Gemini."""
        if self.assessment_type == "ASSIGNMENT" and self.question_count != 3:
            return self
        return self

    model_config = {"populate_by_name": True}


class GeneratedQuestionOption(BaseModel):
    """Một lựa chọn quiz với cờ đáp án đúng để Backend sync sang question_option."""

    content: str = Field(min_length=1, max_length=1_000)
    is_correct: bool = Field(alias="isCorrect")

    model_config = {"populate_by_name": True}


class GeneratedQuestion(BaseModel):
    """Câu hỏi quiz tương thích schema block của Course Builder hiện tại."""

    content: str = Field(min_length=1, max_length=4_000)
    question_type: Literal["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] = Field(
        alias="questionType"
    )
    points: float = Field(ge=0.1, le=100)
    explanation: str = Field(min_length=1, max_length=4_000)
    options: list[GeneratedQuestionOption] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def validate_answers(self) -> "GeneratedQuestion":
        """Bắt buộc đáp án đúng phù hợp từng loại câu hỏi trước khi trả Backend."""
        correct_count = sum(option.is_correct for option in self.options)
        if self.question_type in {"SINGLE_CHOICE", "TRUE_FALSE"} and correct_count != 1:
            raise ValueError(
                "Câu hỏi single choice/true false phải có đúng một đáp án đúng"
            )
        if self.question_type == "MULTIPLE_CHOICE" and correct_count < 2:
            raise ValueError("Câu hỏi multiple choice phải có ít nhất hai đáp án đúng")
        return self

    model_config = {"populate_by_name": True}


class GeneratedQuiz(BaseModel):
    """Quiz draft có metadata và block questions để Course Builder hiển thị ngay."""

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=2_000)
    time_limit_min: int = Field(alias="timeLimitMin", ge=1, le=180)
    pass_score: float = Field(alias="passScore", ge=0, le=100)
    max_attempts: int = Field(alias="maxAttempts", ge=1, le=10)
    shuffle_questions: bool = Field(alias="shuffleQuestions")
    questions: list[GeneratedQuestion] = Field(min_length=3, max_length=15)

    model_config = {"populate_by_name": True}


class GeneratedAssignment(BaseModel):
    """Assignment draft tương thích assignment description JSON của block editor."""

    title: str = Field(min_length=1, max_length=255)
    instructions: str = Field(min_length=1, max_length=8_000)
    max_score: float = Field(alias="maxScore", ge=1, le=100)
    allow_late: bool = Field(alias="allowLate")
    submission_mode: Literal["FILE_UPLOAD", "BLOCK_EDITOR"] = Field(
        alias="submissionMode"
    )

    model_config = {"populate_by_name": True}


class AssessmentGenerationResponse(BaseModel):
    """Output Gemini được validate trước khi Backend nhận draft assessment."""

    quiz: GeneratedQuiz | None = None
    assignment: GeneratedAssignment | None = None

    model_config = {"populate_by_name": True}
