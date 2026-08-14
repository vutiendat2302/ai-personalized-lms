from app.rag.models import SearchResult
from app.schemas.chat_schema import ChatHistoryMessage, ChatStreamRequest


class ManagementContextBuilder:
    """Ghép lịch sử, RAG và memory thành prompt an toàn theo scope hiện tại."""

    def build(
        self,
        request: ChatStreamRequest,
        knowledge: list[SearchResult],
        memories: list[SearchResult],
    ) -> str:
        """Tạo prompt chỉ cho phép dùng dữ liệu nằm trong scope backend gửi."""
        history = self._history(request.history)
        context = self._results(knowledge, "chunkText")
        memory = self._results(memories, "content")
        return (
            f"SCOPE HỘI THOẠI: {request.scope}\n"
            f"MODULE HIỆN TẠI: {request.module}\n"
            f"ROUTE HIỆN TẠI: {request.route or 'không có'}\n\n"
            f"LỊCH SỬ GẦN NHẤT:\n{history or 'Không có'}\n\n"
            f"THÔNG TIN ĐƯỢC PHÉP NHỚ:\n{memory or 'Không có'}\n\n"
            f"TÀI LIỆU ĐƯỢC PHÉP TRUY CẬP:\n{context or 'Không tìm thấy'}\n\n"
            f"CÂU HỎI HIỆN TẠI:\n{request.question}\n\n"
            "Chỉ dựa vào dữ liệu được cung cấp khi câu hỏi liên quan quy định hoặc số "
            "liệu nội bộ. Nếu thiếu dữ liệu, nói rõ chưa có dữ liệu; không suy đoán."
        )

    @staticmethod
    def _history(messages: list[ChatHistoryMessage]) -> str:
        """Định dạng tối đa mười tin nhắn gần nhất."""
        return "\n".join(f"{item.role}: {item.content}" for item in messages[-10:])

    @staticmethod
    def _results(results: list[SearchResult], text_key: str) -> str:
        """Định dạng kết quả semantic cùng metadata nguồn."""
        lines: list[str] = []
        for index, result in enumerate(results, start=1):
            source = result.payload.get("title") or result.payload.get("sourceId", "")
            page = result.payload.get("pageNumber")
            citation = f"nguồn={source}" + (f", trang={page}" if page else "")
            lines.append(f"[{index}] ({citation}) {result.payload.get(text_key, '')}")
        return "\n".join(lines)
