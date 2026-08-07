from typing import Optional
from pydantic import BaseModel, Field


class ChatStreamRequest(BaseModel):
    question: str = Field(..., examples=["Nhân viên đi trễ quá 1 tiếng thì tính công thế nào?"])
    conversation_id: Optional[str] = Field(
        None,
        alias="conversationId",
        examples=["conv_1786008934743_2wobp"]
    )
    system_instruction: Optional[str] = Field(
        None,
        examples=["Bạn là trợ lý AI hỗ trợ quản trị viên hệ thống AILMS."]
    )

    class Config:
        populate_by_name = True