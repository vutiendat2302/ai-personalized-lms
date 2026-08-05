from typing import Optional
from pydantic import BaseModel, Field


class GenerateTestRequest(BaseModel):
    """
    Schema định nghĩa dữ liệu đầu vào cho API test sinh văn bản.
    """
    prompt: str = Field(
        ...,
        description="Nội dung câu hỏi/prompt gửi tới AI",
        examples=["1 + 1 bằng mấy?"]
    )
    system_instruction: Optional[str] = Field(
        None,
        description="Chỉ dẫn vai trò hoặc ngữ cảnh hệ thống cho AI",
        examples=["Bạn là trợ lý học tập thông minh."]
    )


class GenerateTestResponse(BaseModel):
    """
    Schema định nghĩa cấu trúc dữ liệu phản hồi trả về từ API test sinh văn bản.
    """
    status: str = Field("success", examples=["success"])
    provider: str = Field("gemini", examples=["gemini"])
    model: str = Field(..., examples=["gemini-2.5-flash"])
    result: str = Field(..., description="Nội dung câu trả lời do Gemini sinh ra")
