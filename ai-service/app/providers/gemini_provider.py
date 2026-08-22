from typing import Any, AsyncGenerator, Optional
from google import genai
from google.genai import types

from app.chat.management_tools import ManagementToolClient, management_tools
from app.core.config import settings
from app.providers.base_provider import BaseAIProvider
from app.schemas.assessment_schema import AssessmentGenerationResponse


class GeminiProvider(BaseAIProvider):
    """
    Hiện thực giao tiếp với Google Gemini AI thông qua SDK chính thức `google-genai`.

    Cơ chế hoạt động:
    - Quản lý Client bất đồng bộ (`async_client`) tái sử dụng trong suốt vòng đời của ứng dụng.
    - Hỗ trợ đầy đủ các tính năng nâng cao: Multimodal Vision, Streaming SSE, Structured Output JSON,
      và Function Calling tương tác với Backend Spring Boot.
    """

    def __init__(self) -> None:
        """Khởi tạo GeminiProvider với cấu hình model từ biến môi trường (mặc định gemini-3.5-flash-lite)."""
        self.model_name = settings.GEMINI_MODEL
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """
        Khởi tạo hoặc lấy lại instance client của Google GenAI SDK dựa trên GEMINI_API_KEY.

        Cơ chế:
        - Kiểm tra tính hợp lệ của GEMINI_API_KEY từ cấu hình.
        - Áp dụng Singleton pattern nội bộ để không tạo mới client nhiều lần.

        Returns:
            genai.Client: Đối tượng client đồng bộ/bất đồng bộ kết nối tới Google GenAI SDK.

        Raises:
            ValueError: Nếu GEMINI_API_KEY chưa được cấu hình hoặc mang giá trị mặc định.
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
        """
        Thuộc tính trả về async client (`aio`) dùng cho các tác vụ I/O không chặn event loop.

        Returns:
            genai.client.AsyncClient: Đối tượng client bất đồng bộ của Google GenAI.
        """
        return self._get_client().aio

    async def generate_text(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> str:
        """
        Gửi yêu cầu sinh văn bản đồng bộ (non-streaming) đến Google Gemini AI.

        Cơ chế hoạt động:
        - Đóng gói prompt và system_instruction vào `GenerateContentConfig`.
        - Gọi `generate_content` bất đồng bộ và trích xuất trường text phản hồi.

        Args:
            prompt (str): Nội dung câu hỏi/chỉ dẫn cho AI.
            system_instruction (Optional[str]): Chỉ dẫn vai trò hoặc quy tắc hệ thống.

        Returns:
            str: Toàn bộ nội dung câu trả lời từ Gemini.
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
        """
        Trích xuất văn bản hoặc phân tích dữ liệu đa phương thức (ảnh/PDF) qua Gemini Vision.

        Cơ chế hoạt động:
        - Tạo `types.Part.from_bytes` chứa dữ liệu nhị phân của ảnh/tài liệu và kiểu MIME.
        - Gửi đồng thời tệp và prompt chỉ dẫn OCR/phân tích biểu đồ tới Gemini.

        Args:
            file_bytes (bytes): Dữ liệu nhị phân của tệp.
            mime_type (str): Kiểu MIME (ví dụ: 'image/png', 'application/pdf').
            prompt (str): Yêu cầu trích xuất (ví dụ: OCR, tóm tắt biểu đồ).

        Returns:
            str: Nội dung trích xuất dạng văn bản hoặc Markdown.
        """
        response = await self.async_client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                prompt,
            ],
        )
        return response.text or ""

    async def chat_stream(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Gọi Gemini Streaming API để phát trực tiếp từng token văn bản về frontend.

        Cơ chế hoạt động:
        - Sử dụng `models.generate_content_stream` từ async client.
        - Lặp qua luồng response bất đồng bộ và yield ngay lập tức từng đoạn `chunk.text`.

        Args:
            prompt (str): Toàn bộ ngữ cảnh hội thoại, tài liệu RAG và câu hỏi.
            system_instruction (Optional[str]): Hướng dẫn hành vi và giới hạn phạm vi LMS.

        Yields:
            str: Từng đoạn token văn bản nối tiếp nhau.
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
        """
        Xử lý vòng lặp Function Calling đa bước để trả lời các câu hỏi quản trị nội bộ an toàn.

        Cơ chế hoạt động:
        1. Cấu hình `tools=management_tools()` và tắt `automatic_function_calling` để AI Service toàn quyền kiểm soát logic thực thi tool.
        2. Nếu có ảnh, chèn dữ liệu ảnh vào đầu danh sách parts của User Message.
        3. Trong vòng lặp tối đa `MANAGEMENT_TOOL_MAX_ROUNDS`:
           a. Gửi lịch sử `contents` tới Gemini.
           b. Kiểm tra xem Gemini có yêu cầu gọi tool nào không qua `_function_calls()`.
           c. Nếu không có tool call -> Đã có câu trả lời cuối cùng -> yield text và kết thúc.
           d. Nếu có tool call -> Lưu lại nội dung `model_content` vào lịch sử hội thoại,
              gọi Backend Spring Boot qua `ManagementToolClient.execute()` bằng token ngữ cảnh,
              đóng gói kết quả thành `Part.from_function_response()` rồi gửi tiếp sang Gemini.
        4. Tránh lặp vô tận khi câu hỏi phức tạp vượt quá số vòng lặp tối đa.

        Args:
            prompt (str): Yêu cầu từ người dùng.
            tool_access_token (str): JWT token xác thực quyền hạn của người dùng tại Backend.
            system_instruction (Optional[str]): Hướng dẫn vai trò trợ lý quản trị LMS.
            image_bytes (bytes | None): Byte ảnh đính kèm nếu có.
            image_mime_type (str | None): Kiểu MIME ảnh đính kèm.

        Yields:
            str: Câu trả lời tổng hợp tự nhiên sau khi đã gọi công cụ tra cứu.
        """
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
        last_tool_result: dict[str, Any] | None = None
        for _ in range(settings.MANAGEMENT_TOOL_MAX_ROUNDS):
            response = await self.async_client.models.generate_content(
                model=self.model_name, contents=contents, config=config
            )
            calls = self._function_calls(response)
            if not calls:
                if response.text:
                    if last_tool_result and self._looks_like_raw_tool_call(
                        response.text
                    ):
                        yield self._natural_tool_result(last_tool_result)
                    else:
                        yield response.text
                return
            model_content = self._model_content(response)
            if model_content is None:
                yield "Không thể xử lý yêu cầu dữ liệu hệ thống lúc này."
                return
            contents.append(model_content)
            responses = []
            for name, arguments in calls:
                last_tool_result = await tool_client.execute(
                    name, arguments, tool_access_token
                )
                responses.append(
                    types.Part.from_function_response(
                        name=name,
                        response={"result": last_tool_result},
                    )
                )
            contents.append(types.Content(role="user", parts=responses))
        yield "Yêu cầu cần quá nhiều bước tra cứu; vui lòng chia nhỏ câu hỏi."

    @staticmethod
    def _looks_like_raw_tool_call(text: str) -> bool:
        """
        Kiểm tra xem phản hồi văn bản của mô hình có bị lộ chuỗi raw JSON của tool call hay không.

        Cơ chế:
        - Kiểm tra các từ khóa đặc trưng (arguments, tên hàm, dấu ngoặc nhọn JSON).
        - Giúp ngăn ngừa việc hiển thị các đoạn mã thô cho người dùng cuối.

        Args:
            text (str): Chuỗi văn bản cần kiểm tra.

        Returns:
            bool: True nếu chuỗi có dấu hiệu lộ raw tool call, ngược lại False.
        """
        normalized = text.strip().lower()
        return (
            "arguments" in normalized
            or "create_quiz_for_course_or_lesson" in normalized
            or normalized.startswith("{")
        )

    @staticmethod
    def _natural_tool_result(result: dict[str, Any]) -> str:
        """
        Chuyển đổi dữ liệu kết quả tool (ví dụ: tạo Quiz thành công) thành câu thông báo tiếng Việt tự nhiên kèm link.

        Cơ chế:
        - Đọc các trường `quizId`, `title`, `questionCount`, `quizCode`, `actionUrl` trong payload kết quả.
        - Trả về câu thông báo thân thiện và chèn link Markdown điều hướng tới kho bài kiểm tra.

        Args:
            result (dict[str, Any]): Dữ liệu trả về từ Backend sau khi thực thi tool.

        Returns:
            str: Chuỗi thông báo định dạng Markdown thân thiện.
        """
        if result.get("error"):
            return f"Mình chưa thể lưu phiếu kiểm tra vào hệ thống: {result['error']}"
        if result.get("quizId"):
            title = result.get("title", "bài kiểm tra")
            count = result.get("questionCount", 0)
            code = result.get("quizCode", result["quizId"])
            url = result.get("actionUrl", "/teacher/assessments?tab=quizzes")
            return (
                f"Đã tạo và lưu {title} vào kho bài kiểm tra của hệ thống, "
                f"gồm {count} câu hỏi. Mã bài: {code}. "
                f"[Mở kho bài kiểm tra]({url})"
            )
        return "Mình đã xử lý yêu cầu với hệ thống nhưng chưa nhận được kết quả lưu hợp lệ."

    async def chat_stream_with_image(
        self,
        prompt: str,
        image_bytes: bytes,
        image_mime_type: str,
        system_instruction: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Phân tích hình ảnh đính kèm theo luồng streaming (Gemini Vision) không qua tool.

        Cơ chế hoạt động:
        - Đóng gói dữ liệu ảnh nhị phân và câu hỏi vào danh sách contents.
        - Gọi `generate_content_stream` để trả về câu phân tích hoặc giải đáp tức thời.

        Args:
            prompt (str): Câu hỏi của người dùng về ảnh.
            image_bytes (bytes): Dữ liệu nhị phân của ảnh.
            image_mime_type (str): Kiểu MIME ảnh (ví dụ: 'image/png').
            system_instruction (Optional[str]): Hướng dẫn phân tích.

        Yields:
            str: Từng phân đoạn giải thích kết quả ảnh dạng stream.
        """
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
        """
        Sinh đề kiểm tra (Quiz) hoặc bài tập tự luận (Assignment) tuân thủ nghiêm ngặt schema JSON.

        Cơ chế hoạt động:
        1. Xây dựng prompt kèm schema JSON chi tiết và nội dung lý thuyết bài học đã OCR/trích xuất.
        2. Thiết lập `response_mime_type="application/json"` và nhiệt độ thấp `temperature=0.2` để Gemini không tự ý sáng tạo sai schema.
        3. Làm sạch các dấu backtick Markdown bao bọc JSON (nếu có).
        4. Chuyển đổi và xác thực chuỗi JSON thành instance Pydantic `AssessmentGenerationResponse`.

        Args:
            lesson_title (str): Tên bài học.
            lesson_content (str): Nội dung bài học và tài liệu bổ trợ.
            assessment_type (str): Loại assessment ('QUIZ', 'ASSIGNMENT', 'BOTH').
            question_count (int): Số lượng câu hỏi trắc nghiệm cần sinh.

        Returns:
            AssessmentGenerationResponse: Dữ liệu bài kiểm tra có cấu trúc chuẩn.

        Raises:
            ValueError: Nếu Gemini không trả về dữ liệu hoặc trả về JSON không khớp schema.
        """
        schema_desc = (
            "{\n"
            '  "quiz": {\n'
            '    "title": "Tiêu đề bài kiểm tra",\n'
            '    "description": "Mô tả bài kiểm tra",\n'
            '    "timeLimitMin": 15,\n'
            '    "passScore": 8.0,\n'
            '    "maxAttempts": 3,\n'
            '    "shuffleQuestions": true,\n'
            '    "questions": [\n'
            "      {\n"
            '        "content": "Nội dung câu hỏi",\n'
            '        "questionType": "SINGLE_CHOICE",\n'
            '        "points": 2.0,\n'
            '        "explanation": "Giải thích chi tiết đáp án",\n'
            '        "sourceIds": ["ID nguồn nằm trong nhãn NGUỒN RAG, hoặc [] nếu chỉ dùng lesson/upload"],\n'
            '        "options": [\n'
            '          {"content": "Đáp án A", "isCorrect": true},\n'
            '          {"content": "Đáp án B", "isCorrect": false}\n'
            "        ]\n"
            "      }\n"
            "    ]\n"
            "  },\n"
            '  "assignment": {\n'
            '    "title": "Tiêu đề bài tập",\n'
            '    "instructions": "Hướng dẫn và tiêu chí đánh giá",\n'
            '    "maxScore": 10.0,\n'
            '    "allowLate": false,\n'
            '    "submissionMode": "FILE_UPLOAD"\n'
            "  }\n"
            "}"
        )
        prompt = (
            "Bạn là chuyên gia thiết kế đánh giá cho LMS. Chỉ sử dụng thông tin trong "
            "NỘI DUNG NGUỒN bên dưới; không bịa kiến thức ngoài nguồn. Viết tiếng Việt rõ ràng. "
            f"Tên bài học: {lesson_title}\n"
            f"Loại cần tạo: {assessment_type}. Số câu quiz cần tạo: {question_count}.\n"
            "Nếu loại là QUIZ chỉ trả quiz và assignment=null. Nếu ASSIGNMENT chỉ trả "
            "assignment và quiz=null. Nếu BOTH trả cả hai. Quiz chỉ dùng SINGLE_CHOICE, "
            "MULTIPLE_CHOICE hoặc TRUE_FALSE; mỗi câu có explanation, đáp án chính xác và "
            "không trùng lặp. Assignment phải có yêu cầu, tiêu chí đánh giá và đầu ra mong đợi.\n\n"
            "Với mỗi câu hỏi, sourceIds chỉ được lấy từ nhãn NGUỒN RAG xuất hiện trong NỘI DUNG NGUỒN; "
            "không tự tạo ID nguồn.\n\n"
            f"CẤU TRÚC JSON MẪU:\n{schema_desc}\n\n"
            f"NỘI DUNG NGUỒN:\n{lesson_content}"
        )
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )
        response = await self.async_client.models.generate_content(
            model=self.model_name, contents=prompt, config=config
        )
        if not response.text:
            raise ValueError("Gemini không trả assessment hợp lệ")
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        return AssessmentGenerationResponse.model_validate_json(raw_text.strip())

    @staticmethod
    def _function_calls(response: Any) -> list[tuple[str, dict[str, Any]]]:
        """
        Trích xuất danh sách các lệnh gọi hàm (Function Call) hợp lệ từ response của Gemini.

        Cơ chế:
        - Đọc thuộc tính `function_calls` từ response.
        - Chuẩn hóa tên hàm và đối số thành danh sách tuple `(tên_hàm, dict_tham_số)`.

        Args:
            response (Any): Đối tượng phản hồi từ Gemini API.

        Returns:
            list[tuple[str, dict[str, Any]]]: Danh sách tên tool và tham số tương ứng.
        """
        calls = getattr(response, "function_calls", None) or []
        return [
            (str(call.name), dict(call.args or {}))
            for call in calls
            if getattr(call, "name", None)
        ]

    @staticmethod
    def _model_content(response: Any) -> types.Content | None:
        """
        Trích xuất đối tượng Content nguyên vẹn của mô hình để duy trì ngữ cảnh vòng lặp Function Calling.

        Cơ chế:
        - Lấy `candidates[0].content` từ phản hồi của Gemini để nối tiếp vào chuỗi hội thoại của vòng gọi tiếp theo.

        Args:
            response (Any): Đối tượng phản hồi từ Gemini API.

        Returns:
            types.Content | None: Đối tượng nội dung của mô hình hoặc None nếu không tồn tại.
        """
        candidates = getattr(response, "candidates", None) or []
        return candidates[0].content if candidates and candidates[0].content else None
