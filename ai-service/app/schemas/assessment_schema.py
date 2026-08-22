import base64
import binascii
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AssessmentSourceFile(BaseModel):
    """
    Schema đại diện cho một tệp học liệu đính kèm tạm thời do Giảng viên tải lên.

    Cơ chế hoạt động:
    - Nhận file dưới dạng chuỗi Base64 cùng `mimeType` được kiểm soát chặt chẽ.
    - Phương thức `decoded_content()` giải mã byte trực tiếp trong RAM, không ghi ra đĩa.
    """

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
        """
        Giải mã chuỗi Base64 thành dữ liệu nhị phân nguyên bản trong bộ nhớ RAM.

        Returns:
            bytes: Mảng byte của tệp tin.

        Raises:
            ValueError: Nếu chuỗi Base64 bị lỗi định dạng hoặc không hợp lệ.
        """
        try:
            return base64.b64decode(self.content_base64, validate=True)
        except (ValueError, binascii.Error) as exception:
            raise ValueError("contentBase64 không hợp lệ") from exception

    model_config = {"populate_by_name": True}


class AssessmentGenerationRequest(BaseModel):
    """
    Schema yêu cầu sinh đề thi hoặc bài tập từ Backend Spring Boot gửi sang.

    Cơ chế hoạt động:
    - Mang đầy đủ thông tin bài học (`lessonId`, `lessonTitle`, `lessonContent`),
      loại đánh giá mong muốn (`QUIZ`, `ASSIGNMENT`, `BOTH`), số lượng câu hỏi (`questionCount`)
      và danh sách tối đa 3 file tài liệu bổ sung (`sourceFiles`).
    """

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
    rag_source_ids: list[str] = Field(
        default_factory=list, alias="ragSourceIds", max_length=10
    )
    class_id: str | None = Field(default=None, alias="classId")
    course_id: str | None = Field(default=None, alias="courseId")
    allowed_roles: list[str] = Field(default_factory=list, alias="allowedRoles")

    @model_validator(mode="after")
    def validate_requested_assessment(self) -> "AssessmentGenerationRequest":
        """Kiểm tra và tiền xử lý logic các thông số yêu cầu tạo bài đánh giá."""
        if self.rag_source_ids and (not self.class_id or not self.course_id):
            raise ValueError("Nguồn RAG của lớp cần classId và courseId")
        if self.rag_source_ids and not self.allowed_roles:
            raise ValueError("Nguồn RAG cần allowedRoles do Backend xác thực")
        if len(set(self.rag_source_ids)) != len(self.rag_source_ids):
            raise ValueError("ragSourceIds không được trùng lặp")
        if self.assessment_type == "ASSIGNMENT" and self.question_count != 3:
            return self
        return self

    model_config = {"populate_by_name": True}


class GeneratedQuestionOption(BaseModel):
    """
    Schema một phương án trả lời trong câu hỏi trắc nghiệm (Quiz Option).

    Cơ chế hoạt động:
    - Chứa nội dung phương án (`content`) và cờ đánh dấu phương án đúng (`isCorrect`).
    """

    content: str = Field(min_length=1, max_length=1_000)
    is_correct: bool = Field(alias="isCorrect")

    model_config = {"populate_by_name": True}


class GeneratedQuestion(BaseModel):
    """
    Schema câu hỏi trắc nghiệm do AI sinh ra kèm đáp án và giải thích chi tiết.

    Cơ chế hoạt động và kiểm định tính hợp lệ:
    - Bắt buộc kiểm tra logic số lượng đáp án đúng thông qua validator `validate_answers`:
      + SINGLE_CHOICE hoặc TRUE_FALSE: Phải có ĐÚNG 1 đáp án `isCorrect=True`.
      + MULTIPLE_CHOICE: Phải có TỐI THIỂU 2 đáp án `isCorrect=True`.
    - Bao gồm điểm số (`points`) và lời giải thích cặn kẽ vì sao đúng/sai (`explanation`).
    """

    content: str = Field(min_length=1, max_length=4_000)
    question_type: Literal["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] = Field(
        alias="questionType"
    )
    points: float = Field(ge=0.1, le=100)
    explanation: str = Field(min_length=1, max_length=4_000)
    options: list[GeneratedQuestionOption] = Field(min_length=2, max_length=6)
    source_ids: list[str] = Field(
        default_factory=list, alias="sourceIds", max_length=10
    )

    @model_validator(mode="after")
    def validate_answers(self) -> "GeneratedQuestion":
        """Xác thực số lượng đáp án đúng phù hợp với loại câu hỏi (Single/Multiple/TrueFalse)."""
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
    """
    Schema bài trắc nghiệm hoàn chỉnh (Quiz Draft).

    Cơ chế hoạt động:
    - Bao gồm tiêu đề, mô tả, thời gian làm bài (`timeLimitMin`), điểm đạt (`passScore`),
      số lần thử tối đa (`maxAttempts`), cài đặt trộn câu hỏi (`shuffleQuestions`),
      và danh sách các câu hỏi `GeneratedQuestion`.
    """

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=2_000)
    time_limit_min: int = Field(alias="timeLimitMin", ge=1, le=180)
    pass_score: float = Field(alias="passScore", ge=0, le=100)
    max_attempts: int = Field(alias="maxAttempts", ge=1, le=10)
    shuffle_questions: bool = Field(alias="shuffleQuestions")
    questions: list[GeneratedQuestion] = Field(min_length=3, max_length=15)

    model_config = {"populate_by_name": True}


class GeneratedAssignment(BaseModel):
    """
    Schema bài tập tự luận/thực hành do AI sinh ra (Assignment Draft).

    Cơ chế hoạt động:
    - Chứa tiêu đề, hướng dẫn làm bài chi tiết (`instructions`), thang điểm tối đa (`maxScore`),
      chính sách nộp muộn (`allowLate`) và hình thức nộp bài (`FILE_UPLOAD` hoặc `BLOCK_EDITOR`).
    """

    title: str = Field(min_length=1, max_length=255)
    instructions: str = Field(min_length=1, max_length=8_000)
    max_score: float = Field(alias="maxScore", ge=1, le=100)
    allow_late: bool = Field(alias="allowLate")
    submission_mode: Literal["FILE_UPLOAD", "BLOCK_EDITOR"] = Field(
        alias="submissionMode"
    )

    model_config = {"populate_by_name": True}


class AssessmentGenerationResponse(BaseModel):
    """
    Schema phản hồi chung của API sinh bài đánh giá.

    Cơ chế hoạt động:
    - Trả về đối tượng `quiz` (nếu yêu cầu QUIZ hoặc BOTH) và/hoặc `assignment` (nếu yêu cầu ASSIGNMENT hoặc BOTH).
    """

    quiz: GeneratedQuiz | None = None
    assignment: GeneratedAssignment | None = None

    model_config = {"populate_by_name": True}
