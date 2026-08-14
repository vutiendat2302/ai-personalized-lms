import base64
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


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
    """Yêu cầu chat nội bộ kèm role, scope và lịch sử đã được backend xác thực."""

    question: str = Field(
        ..., examples=["Nhân viên đi trễ quá 1 tiếng thì tính công thế nào?"]
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
        default=None, alias="imageBase64", max_length=7_000_000
    )
    image_mime_type: str | None = Field(default=None, alias="imageMimeType")

    model_config = ConfigDict(populate_by_name=True)

    def decoded_image(self) -> bytes | None:
        """Giải mã ảnh đã được Backend kiểm tra mà không lưu nội dung ảnh vào AI Service."""
        if self.image_base64 is None:
            return None
        try:
            return base64.b64decode(self.image_base64, validate=True)
        except ValueError as exception:
            raise ValueError("imageBase64 không hợp lệ") from exception
