from typing import Any, Optional, AsyncGenerator
from google import genai
from google.genai import types
from app.providers.base_provider import BaseAIProvider
from app.core.config import settings
from app.chat.management_tools import ManagementToolClient, management_tools
from app.schemas.assessment_schema import AssessmentGenerationResponse


class GeminiProvider(BaseAIProvider):
    """
    Provider hiện thực giao tiếp với dịch vụ Google Gemini AI thông qua SDK google-genai.
    """

    def __init__(self):
        """
        Khởi tạo GeminiProvider với model sinh nội dung từ cấu hình tập trung.
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
        if (
            not settings.GEMINI_API_KEY
            or settings.GEMINI_API_KEY == "your_gemini_api_key_here"
        ):
            raise ValueError("GEMINI_API_KEY chưa được cấu hình đúng trong file .env!")
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    @property
    def async_client(self):
        """Trả async client dùng chung cho các tác vụ Gemini bất đồng bộ."""
        return self._get_client().aio

    async def generate_text(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> str:
        """
        Gửi yêu cầu sinh văn bản đến Google Gemini AI.

        Args:
            prompt (str): Nội dung câu hỏi/prompt gửi cho Gemini.
            system_instruction (Optional[str]): Chỉ dẫn vai trò cho hệ thống AI (nếu có).

        Returns:
            str: Nội dung câu trả lời hoàn chỉnh từ Gemini.
        """
        client = self.async_client

        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        response = await client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        if not response.text:
            return ""
        return response.text

    async def generate_from_media(
        self, file_bytes: bytes, mime_type: str, prompt: str
    ) -> str:
        """Trích xuất nội dung media bằng khả năng multimodal của Gemini."""
        response = await self.async_client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                prompt,
            ],
        )
        return response.text or ""

    # Gửi prompt dạng streaming sang Gemini AI, generator yield liên tục từng đoạn text vừa nhận
    async def chat_stream(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Gọi Gemini streaming API, yield từng đoạn text nhận được.
        """
        client = self.async_client
        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        stream = await client.models.generate_content_stream(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        async for chunk in stream:
            if chunk.text:
                yield chunk.text

    async def chat_stream_with_tools(
        self,
        prompt: str,
        tool_access_token: str,
        system_instruction: Optional[str] = None,
        image_bytes: bytes | None = None,
        image_mime_type: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Chạy tối đa vài vòng Gemini function calling rồi trả lời từ context Backend an toàn."""
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=management_tools(),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        )
        user_parts = [types.Part.from_text(text=prompt)]
        if image_bytes is not None and image_mime_type is not None:
            user_parts.insert(
                0, types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type)
            )
        contents: list[types.Content] = [types.Content(role="user", parts=user_parts)]
        tool_client = ManagementToolClient()
        for _ in range(settings.MANAGEMENT_TOOL_MAX_ROUNDS):
            response = await self.async_client.models.generate_content(
                model=self.model_name, contents=contents, config=config
            )
            calls = self._function_calls(response)
            if not calls:
                if response.text:
                    yield response.text
                return
            model_content = self._model_content(response)
            if model_content is None:
                yield "Không thể xử lý yêu cầu dữ liệu hệ thống lúc này."
                return
            contents.append(model_content)
            responses = [
                types.Part.from_function_response(
                    name=name,
                    response={
                        "result": await tool_client.execute(
                            name, arguments, tool_access_token
                        )
                    },
                )
                for name, arguments in calls
            ]
            contents.append(types.Content(role="user", parts=responses))
        yield "Yêu cầu cần quá nhiều bước tra cứu; vui lòng chia nhỏ câu hỏi."

    async def chat_stream_with_image(
        self,
        prompt: str,
        image_bytes: bytes,
        image_mime_type: str,
        system_instruction: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream Gemini Vision cho ảnh đính kèm không cần tool nghiệp vụ."""
        config = types.GenerateContentConfig(system_instruction=system_instruction)
        stream = await self.async_client.models.generate_content_stream(
            model=self.model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type),
                types.Part.from_text(text=prompt),
            ],
            config=config,
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text

    async def generate_assessment(
        self,
        lesson_title: str,
        lesson_content: str,
        assessment_type: str,
        question_count: int,
    ) -> AssessmentGenerationResponse:
        """Sinh quiz/assignment JSON strict schema, chỉ dựa trên lesson source đã cấp."""
        prompt = (
            "Bạn là chuyên gia thiết kế đánh giá cho LMS. Chỉ sử dụng thông tin trong "
            "NỘI DUNG NGUỒN bên dưới; không bịa kiến thức ngoài nguồn. Viết tiếng Việt rõ ràng. "
            f"Tên bài học: {lesson_title}\n"
            f"Loại cần tạo: {assessment_type}. Số câu quiz cần tạo: {question_count}.\n"
            "Nếu loại là QUIZ chỉ trả quiz và assignment=null. Nếu ASSIGNMENT chỉ trả "
            "assignment và quiz=null. Nếu BOTH trả cả hai. Quiz chỉ dùng SINGLE_CHOICE, "
            "MULTIPLE_CHOICE hoặc TRUE_FALSE; mỗi câu có explanation, đáp án chính xác và "
            "không trùng lặp. Assignment phải có yêu cầu, tiêu chí đánh giá và đầu ra mong đợi.\n\n"
            f"NỘI DUNG NGUỒN:\n{lesson_content}"
        )
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AssessmentGenerationResponse,
            temperature=0.2,
        )
        response = await self.async_client.models.generate_content(
            model=self.model_name, contents=prompt, config=config
        )
        if not response.text:
            raise ValueError("Gemini không trả assessment hợp lệ")
        return AssessmentGenerationResponse.model_validate_json(response.text)

    @staticmethod
    def _function_calls(response: Any) -> list[tuple[str, dict[str, Any]]]:
        """Trích các function call hợp lệ từ Gemini response mà không tin dữ liệu model mù quáng."""
        calls = getattr(response, "function_calls", None) or []
        return [
            (str(call.name), dict(call.args or {}))
            for call in calls
            if getattr(call, "name", None)
        ]

    @staticmethod
    def _model_content(response: Any) -> types.Content | None:
        """Lấy model content nguyên vẹn để Gemini liên kết function response đúng vòng gọi."""
        candidates = getattr(response, "candidates", None) or []
        return candidates[0].content if candidates and candidates[0].content else None
