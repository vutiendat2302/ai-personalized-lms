import base64
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RetrievalMode(str, Enum):
    """Chế độ điều phối truy xuất tri thức (Retrieval Mode)."""

    AUTO = "AUTO"
    ALWAYS = "ALWAYS"
    NEVER = "NEVER"


class ChatRoute(str, Enum):
    """Kênh xử lý dự định (Intent Route) của câu hỏi người dùng."""

    DIRECT = "DIRECT"
    KNOWLEDGE = "KNOWLEDGE"
    TOOL = "TOOL"
    MEMORY = "MEMORY"


class GroundingMode(str, Enum):
    """Mức độ bắt buộc phải có nguồn trích dẫn chính thức."""

    NONE = "NONE"
    OPTIONAL = "OPTIONAL"
    REQUIRED = "REQUIRED"


class ChatRoutingDecision(BaseModel):
    """Quyết định điều phối sau khi phân loại câu hỏi."""

    route: ChatRoute
    grounding: GroundingMode
    reason: str

    model_config = ConfigDict(populate_by_name=True)


class ChatSource(BaseModel):
    """Nguồn tài liệu thực sự được câu trả lời tham chiếu."""

    source_id: str = Field(alias="sourceId")
    title: str | None = None
    source_type: str = Field(default="text", alias="sourceType")
    chunk_id: str = Field(alias="chunkId")
    score: float | None = None
    course_id: str | None = Field(default=None, alias="courseId")
    class_id: str | None = Field(default=None, alias="classId")
    lesson_id: str | None = Field(default=None, alias="lessonId")
    section_id: str | None = Field(default=None, alias="sectionId")
    page_number: int | None = Field(default=None, alias="pageNumber")

    model_config = ConfigDict(populate_by_name=True)


class GroundedAnswer(BaseModel):
    """Cấu trúc phản hồi có trích dẫn nguồn theo ID phân đoạn."""

    answer: str
    cited_chunk_ids: list[str] = Field(default_factory=list, alias="citedChunkIds")

    model_config = ConfigDict(populate_by_name=True)


class ChatHistoryMessage(BaseModel):
    """Một tin nhắn lịch sử đã được backend xác thực ownership."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)


class ConversationTitleRequest(BaseModel):
    """Câu hỏi đầu tiên dùng để tạo tiêu đề hội thoại."""

    question: str = Field(min_length=1, max_length=20000)


class ConversationTitleResponse(BaseModel):
    """Tiêu đề một dòng đã được Gemini rút gọn."""

    title: str


class SupportQuickAnswerRequest(BaseModel):
    """Quick action công khai đã được Backend ánh xạ sang câu hỏi và context tin cậy."""

    option_id: Literal[
        "COURSE_CONSULTING", "LEARNING_PATH", "PRICING", "DELIVERY", "POLICY"
    ] = Field(alias="optionId")
    question: str = Field(min_length=1, max_length=500)
    context: str = Field(min_length=1, max_length=20000)

    model_config = ConfigDict(populate_by_name=True)


class SupportQuickAnswerResponse(BaseModel):
    """Câu trả lời ngắn đã giới hạn để lưu vào support conversation."""

    answer: str = Field(min_length=1, max_length=4000)


class SupportIntentSuggestionRequest(BaseModel):
    """Câu mô tả nhu cầu để local embedding xếp hạng quick intent phù hợp."""

    question: str = Field(min_length=2, max_length=1000)


class SupportIntentSuggestion(BaseModel):
    """Intent được xếp hạng bằng cosine similarity, không sinh nội dung nghiệp vụ."""

    option_id: str = Field(alias="optionId")
    score: float

    model_config = ConfigDict(populate_by_name=True)


class ChatStreamRequest(BaseModel):
    """
    Schema yêu cầu chat hội thoại truyền phát SSE (Chat Stream Request).

    Cơ chế hoạt động:
    - Tiếp nhận câu hỏi, lịch sử hội thoại (`history`), thông tin xác thực phân quyền (`roles`, `ownerId`, `scope`, `module`),
      chế độ truy xuất (`retrievalMode`), và các tệp/ảnh đính kèm dạng Base64 (`fileBase64`, `imageBase64`).
    """

    question: str = Field(
        ..., examples=["Nhân viên đi trễ quá 1 tiếng thì tính công thế nào?"]
    )
    retrieval_mode: RetrievalMode = Field(
        default=RetrievalMode.AUTO,
        alias="retrievalMode",
        description="Chế độ điều phối truy xuất tri thức",
    )
    conversation_id: Optional[str] = Field(
        None, alias="conversationId", examples=["conv_1786008934743_2wobp"]
    )
    system_instruction: Optional[str] = Field(
        None, examples=["Bạn là trợ lý AI hỗ trợ quản trị viên hệ thống AILMS."]
    )
    owner_id: str = Field(alias="ownerId", min_length=1)
    roles: list[str] = Field(min_length=1)
    scope: str = Field(min_length=1)
    module: str = Field(default="GENERAL", min_length=1)
    route: str | None = None
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    tool_access_token: str | None = Field(default=None, alias="toolAccessToken")
    image_base64: str | None = Field(
        default=None, alias="imageBase64", max_length=15_000_000
    )
    image_mime_type: str | None = Field(default=None, alias="imageMimeType")
    file_base64: str | None = Field(
        default=None, alias="fileBase64", max_length=15_000_000
    )
    file_mime_type: str | None = Field(default=None, alias="fileMimeType")
    file_name: str | None = Field(default=None, alias="fileName")
    course_id: str | None = Field(default=None, alias="courseId")
    class_id: str | None = Field(default=None, alias="classId")
    lesson_id: str | None = Field(default=None, alias="lessonId")
    retrieval_scope: Literal[
        "LESSON_ONLY", "CLASS_MATERIALS", "COURSE_MATERIALS", "GENERAL"
    ] = Field(default="GENERAL", alias="retrievalScope")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_learning_scope(self) -> "ChatStreamRequest":
        """Yêu cầu đủ khóa filter khi Backend chọn RAG theo lesson/class/course."""
        if self.scope != "STUDENT_ASSISTANT":
            return self
        if self.retrieval_scope != "GENERAL" and not self.course_id:
            raise ValueError("Learning RAG cần courseId")
        if self.retrieval_scope == "LESSON_ONLY" and not self.lesson_id:
            raise ValueError("LESSON_ONLY cần lessonId")
        if self.retrieval_scope == "CLASS_MATERIALS" and not self.class_id:
            raise ValueError("CLASS_MATERIALS cần classId")
        return self

    def decoded_image(self) -> bytes | None:
        """
        Giải mã chuỗi Base64 của ảnh đính kèm thành dữ liệu byte trong bộ nhớ.

        Returns:
            bytes | None: Byte dữ liệu ảnh hoặc None nếu không có ảnh.

        Raises:
            ValueError: Nếu chuỗi imageBase64 không hợp lệ.
        """
        if self.image_base64 is None:
            return None
        try:
            return base64.b64decode(self.image_base64, validate=True)
        except ValueError as exception:
            raise ValueError("imageBase64 không hợp lệ") from exception

    def decoded_file(self) -> bytes | None:
        """
        Giải mã chuỗi Base64 của tệp đính kèm thành dữ liệu byte trong bộ nhớ.

        Returns:
            bytes | None: Byte dữ liệu tệp hoặc None nếu không có tệp.

        Raises:
            ValueError: Nếu chuỗi fileBase64 không hợp lệ.
        """
        raw_b64 = self.file_base64 or self.image_base64
        if raw_b64 is None:
            return None
        try:
            return base64.b64decode(raw_b64, validate=True)
        except ValueError as exception:
            raise ValueError("fileBase64 không hợp lệ") from exception
