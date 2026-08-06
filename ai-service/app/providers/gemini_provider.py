from typing import Optional, AsyncGenerator
from google import genai
from google.genai import types
from app.providers.base_provider import BaseAIProvider
from app.core.config import settings


class GeminiProvider(BaseAIProvider):
    """
    Provider hiện thực giao tiếp với dịch vụ Google Gemini AI thông qua SDK google-genai.
    """

    def __init__(self):
        """
        Khởi tạo GeminiProvider với tên mô hình cấu hình mặc định (gemini-2.5-flash).
        """
        self.model_name = settings.GEMINI_MODEL
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """
        Khởi tạo hoặc lấy lại instance client của Google GenAI SDK dựa trên GEMINI_API_KEY.

        Returns:
            genai.Client: Đối tượng client kết nối SDK Google GenAI.

        Raises:
            ValueError: Nếu GEMINI_API_KEY chưa được thiết lập đúng trong môi trường/file .env.
        """
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            raise ValueError("GEMINI_API_KEY chưa được cấu hình đúng trong file .env!")
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Gửi yêu cầu sinh văn bản đến Google Gemini AI.

        Args:
            prompt (str): Nội dung câu hỏi/prompt gửi cho Gemini.
            system_instruction (Optional[str]): Chỉ dẫn vai trò cho hệ thống AI (nếu có).

        Returns:
            str: Nội dung câu trả lời hoàn chỉnh từ Gemini.
        """
        client = self._get_client()

        config = None
        if system_instruction:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction
            )

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        if not response.text:
            return ""
        return response.text
        
    # Gửi prompt dạng streaming sang Gemini AI, generator yield liên tục từng đoạn text vừa nhận
    async def chat_stream(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Gọi Gemini streaming API, yield từng đoạn text nhận được.
        """
        client = self._get_client()
        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        stream = client.models.generate_content_stream(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        for chunk in stream:
            if chunk.text:
                yield chunk.text
