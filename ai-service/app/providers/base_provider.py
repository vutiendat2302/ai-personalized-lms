from abc import ABC, abstractmethod
from typing import Optional, AsyncGenerator


class BaseAIProvider(ABC):
    """
    Interface cơ sở cho tất cả các AI Provider (Gemini, Groq, OpenRouter...).
    Đảm bảo các provider tuân thủ cùng một hợp đồng (contract) giao tiếp thống nhất.
    """

    @abstractmethod
    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Phương thức bất đồng bộ để sinh văn bản từ prompt.

        Args:
            prompt (str): Câu lệnh hoặc nội dung prompt gửi tới mô hình AI.
            system_instruction (Optional[str]): Chỉ dẫn ngữ cảnh/vai trò hệ thống cho AI (nếu có).

        Returns:
            str: Văn bản phản hồi do mô hình AI sinh ra.
        """
        pass
    
    @abstractmethod
    async def chat_stream(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Sinh văn bản dạng streaming — yield từng đoạn text khi Gemini trả về.

        Args:
            prompt (str): Câu hỏi/prompt gửi cho AI.
            system_instruction (Optional[str]): Chỉ dẫn vai trò hệ thống.

        Yields:
            str: Từng đoạn text (chunk) được sinh ra tuần tự.
        """
        pass
