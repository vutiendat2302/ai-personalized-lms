from app.providers.base_provider import BaseAIProvider
from app.rag.extractors.docx_extractor import DocxExtractor
from app.rag.extractors.image_extractor import ImageExtractor
from app.rag.extractors.pdf_extractor import PdfExtractor
from app.schemas.assessment_schema import (
    AssessmentGenerationRequest,
    AssessmentGenerationResponse,
)


class AssessmentGenerator:
    """
    Dịch vụ tạo đề kiểm tra và bài tập tự động từ học liệu (AI Assessment Generation Service).

    Cơ chế hoạt động và xử lý tài liệu tạm thời (In-Memory Ephemeral Processing):
    - Tiếp nhận yêu cầu từ Giảng viên/Quản trị viên kèm nội dung bài học (`lessonContent`) và tối đa 3 file tài liệu đính kèm (PDF, DOCX, Ảnh dạng Base64).
    - Giải mã và trích xuất nội dung tài liệu hoàn toàn trong bộ nhớ đệm (RAM) của request, tuyệt đối không lưu tệp rác vào đĩa cứng hay Vector DB.
    - Hợp nhất toàn bộ tri thức học liệu thành một siêu văn bản (giới hạn 80.000 ký tự) và chuyển giao cho `BaseAIProvider.generate_assessment`
      để sinh ra các câu hỏi trắc nghiệm (Quiz) hoặc bài tập thực hành (Assignment) có giải thích chi tiết đáp án và barem điểm chuẩn xác.
    """

    def __init__(self, provider: BaseAIProvider) -> None:
        """
        Khởi tạo AssessmentGenerator với AI Provider.

        Args:
            provider (BaseAIProvider): Provider thực hiện sinh nội dung có cấu trúc qua LLM.
        """
        self.provider = provider

    async def generate(
        self, request: AssessmentGenerationRequest
    ) -> AssessmentGenerationResponse:
        """
        Điều phối quá trình trích xuất học liệu và gọi LLM sinh bài đánh giá.

        Cơ chế:
        1. Gọi `_source_text()` để giải mã và trích xuất toàn bộ văn bản từ bài học và các tệp đính kèm.
        2. Chuyển tiếp tới `provider.generate_assessment()` với tiêu đề bài học, loại bài tập và số lượng câu hỏi mong muốn.
        3. Trả về cấu trúc Pydantic `AssessmentGenerationResponse` hoàn chỉnh để Backend lưu vào DB.

        Args:
            request (AssessmentGenerationRequest): Yêu cầu tạo bài tập chứa lessonId, lessonTitle, lessonContent và sourceFiles.

        Returns:
            AssessmentGenerationResponse: Dữ liệu bài Quiz/Assignment đã qua kiểm định schema.
        """
        source_text = await self._source_text(request)
        return await self.provider.generate_assessment(
            lesson_title=request.lesson_title,
            lesson_content=source_text,
            assessment_type=request.assessment_type,
            question_count=request.question_count,
        )

    async def _source_text(self, request: AssessmentGenerationRequest) -> str:
        """
        Trích xuất và hợp nhất văn bản bài học cùng các tài liệu đính kèm trong bộ nhớ.

        Cơ chế:
        1. Bắt đầu với nội dung bài học `lesson_content`.
        2. Lặp qua danh sách `source_files`:
           - Giải mã chuỗi Base64 thành mảng byte nhị phân.
           - Chọn extractor thích hợp dựa trên `mime_type` (PDF, DOCX, hoặc Image OCR).
           - Trích xuất văn bản và đính kèm tên tệp vào danh sách segments.
        3. Ghép các đoạn phân tách bởi 2 dòng trống và cắt gọn tối đa 80.000 ký tự để bảo vệ token và tránh tràn cửa sổ ngữ cảnh.

        Args:
            request (AssessmentGenerationRequest): Dữ liệu yêu cầu đầu vào.

        Returns:
            str: Toàn bộ nội dung học liệu đã được làm sạch và hợp nhất.
        """
        segments = [f"NỘI DUNG BÀI HỌC:\n{request.lesson_content}"]
        for source_file in request.source_files:
            file_bytes = source_file.decoded_content()
            if source_file.mime_type == "application/pdf":
                extracted = await PdfExtractor().extract(file_bytes=file_bytes)
            elif source_file.mime_type == (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ):
                extracted = await DocxExtractor().extract(file_bytes=file_bytes)
            else:
                extracted = await ImageExtractor().extract(
                    content=source_file.mime_type, file_bytes=file_bytes
                )
            text = "\n".join(segment.text for segment in extracted.segments)
            segments.append(f"TÀI LIỆU BỔ SUNG ({source_file.name}):\n{text}")
        return "\n\n".join(segments)[:80_000]
