from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

from app.schemas.assessment_schema import AssessmentGenerationResponse


class BaseAIProvider(ABC):
    """
    Interface trừu tượng chuẩn hóa (Contract) cho toàn bộ các nhà cung cấp mô hình AI (Google Gemini, OpenAI, Claude,...).

    Mục đích:
    - Độc lập hóa tầng dịch vụ (Service Layer/Router) khỏi SDK cụ thể của từng hãng AI.
    - Cho phép dễ dàng mock hoặc thay đổi mô hình/nhà cung cấp mà không phải sửa logic nghiệp vụ.
    - Quy định chặt chẽ các hành vi cốt lõi: sinh văn bản đồng bộ, streaming SSE, xử lý multimodal (ảnh),
      tương tác gọi hàm nội bộ an toàn (Tool Calling/Function Calling) và sinh bài kiểm tra có cấu trúc (Structured Output).
    """

    @abstractmethod
    async def generate_text(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> str:
        """
        Sinh văn bản hoàn chỉnh từ câu lệnh prompt.

        Cơ chế hoạt động:
        - Gửi toàn bộ prompt và system_instruction (nếu có) tới LLM qua API bất đồng bộ.
        - Đợi mô hình hoàn thành toàn bộ câu trả lời rồi mới trả về một chuỗi văn bản duy nhất.

        Args:
            prompt (str): Nội dung chỉ dẫn hoặc câu hỏi gửi tới AI.
            system_instruction (Optional[str]): Chỉ dẫn vai trò hoặc ngữ cảnh hệ thống định hướng phong cách trả lời.

        Returns:
            str: Toàn bộ phản hồi dạng chuỗi ký tự do mô hình sinh ra.
        """
        pass

    @abstractmethod
    async def chat_stream(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Sinh phản hồi dạng dòng chảy (Server-Sent Events streaming).

        Cơ chế hoạt động:
        - Thiết lập kết nối stream bất đồng bộ với LLM.
        - Mỗi khi mô hình sinh ra một hoặc vài token (chunk), phương thức sẽ `yield` ngay lập tức đoạn text đó
          về cho router để truyền tức thời xuống phía frontend, giúp người dùng không phải chờ đợi lâu.

        Args:
            prompt (str): Câu hỏi/yêu cầu của người dùng đã được kết hợp cùng ngữ cảnh RAG và bộ nhớ.
            system_instruction (Optional[str]): Chỉ dẫn quy tắc hành vi và phạm vi nghiệp vụ cho AI.

        Yields:
            str: Từng phân đoạn văn bản nhỏ (chunk) theo thời gian thực.
        """
        pass

    @abstractmethod
    async def chat_stream_with_tools(
        self,
        prompt: str,
        tool_access_token: str,
        system_instruction: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Điều phối cuộc hội thoại có hỗ trợ gọi công cụ nghiệp vụ (Function Calling) nhiều vòng.

        Cơ chế hoạt động:
        1. Gửi prompt kèm danh sách các khai báo tool (Allow-list) cho LLM.
        2. Nếu LLM quyết định cần tra cứu dữ liệu (ví dụ: tìm nhân viên, xem chấm công, kiểm tra khóa học),
           nó trả về yêu cầu `function_call` kèm tham số.
        3. Provider chặn lại, gọi sang Backend Spring Boot qua `ManagementToolClient` bằng `tool_access_token` để lấy dữ liệu thật.
        4. Kết quả từ Backend được đóng gói lại thành `function_response` và gửi ngược lại cho LLM để tổng hợp câu trả lời tự nhiên.
        5. Lặp lại tối đa `MANAGEMENT_TOOL_MAX_ROUNDS` vòng lặp cho đến khi LLM hoàn thành câu trả lời cuối cùng.

        Args:
            prompt (str): Yêu cầu từ người dùng.
            tool_access_token (str): JWT token bất biến đại diện cho quyền hạn của người dùng để Backend xác thực.
            system_instruction (Optional[str]): Quy định an toàn và hướng dẫn định dạng kết quả.

        Yields:
            str: Phản hồi văn bản cuối cùng sau khi đã tham khảo và tổng hợp dữ liệu từ Backend.
        """
        pass

    @abstractmethod
    async def chat_stream_with_image(
        self,
        prompt: str,
        image_bytes: bytes,
        image_mime_type: str,
        system_instruction: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Phân tích hình ảnh đính kèm tức thời kết hợp câu hỏi trong luồng chat.

        Cơ chế hoạt động:
        - Đóng gói dữ liệu byte của ảnh cùng định dạng MIME và prompt gửi tới mô hình đa phương thức (Gemini Vision).
        - Thực hiện OCR, giải bài tập, phân tích biểu đồ hoặc sơ đồ và stream kết quả về phía người dùng mà không lưu vĩnh viễn ảnh vào Vector Store.

        Args:
            prompt (str): Câu hỏi của người dùng liên quan đến bức ảnh.
            image_bytes (bytes): Dữ liệu nhị phân của file ảnh đính kèm.
            image_mime_type (str): Kiểu MIME của ảnh (ví dụ: 'image/png', 'image/jpeg').
            system_instruction (Optional[str]): Chỉ dẫn quy tắc phân tích hình ảnh.

        Yields:
            str: Từng đoạn phân tích kết quả ảnh dạng stream.
        """
        pass

    @abstractmethod
    async def generate_assessment(
        self,
        lesson_title: str,
        lesson_content: str,
        assessment_type: str,
        question_count: int,
    ) -> AssessmentGenerationResponse:
        """
        Tạo bộ câu hỏi đánh giá (Quiz/Assignment) có cấu trúc chuẩn hóa theo schema Pydantic.

        Cơ chế hoạt động:
        1. Xây dựng prompt chứa nội dung bài học đã trích xuất, yêu cầu số lượng câu hỏi và cấu trúc JSON mẫu.
        2. Kích hoạt chế độ `response_mime_type="application/json"` với nhiệt độ thấp (temperature=0.2) để đảm bảo tính chính xác và nhất quán.
        3. Parse chuỗi JSON trả về thành đối tượng `AssessmentGenerationResponse` đã qua kiểm định kiểu dữ liệu.

        Args:
            lesson_title (str): Tiêu đề bài học mục tiêu.
            lesson_content (str): Nội dung lý thuyết bài học cùng tài liệu tham khảo đính kèm đã OCR/trích xuất.
            assessment_type (str): Loại bài tập cần tạo: "QUIZ", "ASSIGNMENT", hoặc "BOTH".
            question_count (int): Số lượng câu hỏi trắc nghiệm cần sinh.

        Returns:
            AssessmentGenerationResponse: Đối tượng chứa dữ liệu bài Quiz/Assignment hoàn chỉnh sẵn sàng lưu vào MySQL.
        """
        pass
