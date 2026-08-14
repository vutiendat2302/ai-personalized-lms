from app.providers.base_provider import BaseAIProvider
from app.rag.extractors.docx_extractor import DocxExtractor
from app.rag.extractors.image_extractor import ImageExtractor
from app.rag.extractors.pdf_extractor import PdfExtractor
from app.schemas.assessment_schema import (
    AssessmentGenerationRequest,
    AssessmentGenerationResponse,
)


class AssessmentGenerator:
    """Trích xuất source tạm thời và giao provider sinh quiz/assignment schema-validated."""

    def __init__(self, provider: BaseAIProvider) -> None:
        """Nhận provider abstraction để router không biết chi tiết Gemini SDK."""
        self.provider = provider

    async def generate(
        self, request: AssessmentGenerationRequest
    ) -> AssessmentGenerationResponse:
        """Ghép nội dung lesson và upload source rồi sinh assessment đúng loại được yêu cầu."""
        source_text = await self._source_text(request)
        return await self.provider.generate_assessment(
            lesson_title=request.lesson_title,
            lesson_content=source_text,
            assessment_type=request.assessment_type,
            question_count=request.question_count,
        )

    async def _source_text(self, request: AssessmentGenerationRequest) -> str:
        """Trích text PDF/DOCX/ảnh trong memory, giới hạn prompt để tránh payload quá dài."""
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
