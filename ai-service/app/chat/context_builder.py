from app.rag.models import SearchResult
from app.schemas.chat_schema import ChatHistoryMessage, ChatStreamRequest


class ManagementContextBuilder:
    """
    Bộ xây dựng prompt ngữ cảnh hội thoại quản trị (Prompt Engineering Context Builder).

    Cơ chế hoạt động:
    - Tách biệt rõ ràng các luồng prompt: DIRECT (chat thường), GROUNDED (tri thức tài liệu RAG),
      MEMORY (ký ức người dùng) và TOOL (dữ liệu hệ thống).
    - Đánh mã rõ ràng cho từng chunk tài liệu `[chunk_01]`, `[chunk_02]` để kiểm soát citation chính xác.
    - Đặt ra các giới hạn nghiêm ngặt (Guardrails) để chống ảo giác (Hallucination), ngăn LLM tự bịa số liệu.
    """

    def build_direct(self, request: ChatStreamRequest) -> str:
        """
        Xây dựng prompt cho hội thoại trực tiếp (DIRECT), không đưa tài liệu RAG vào ngữ cảnh.

        Args:
            request (ChatStreamRequest): Yêu cầu chat của người dùng.

        Returns:
            str: Chuỗi prompt trực tiếp.
        """
        history = self._history(request.history)
        return (
            f"SCOPE HỘI THOẠI: {request.scope}\n"
            f"MODULE HIỆN TẠI: {request.module}\n"
            f"ROUTE HIỆN TẠI: {request.route or 'không có'}\n\n"
            f"LỊCH SỬ GẦN NHẤT:\n{history or 'Không có'}\n\n"
            f"CÂU HỎI HIỆN TẠI:\n{request.question}\n\n"
            "Trả lời tự nhiên, chính xác, súc tích và hữu ích theo kiến thức chung."
        )

    def build_grounded(
        self, request: ChatStreamRequest, knowledge: list[SearchResult]
    ) -> str:
        """
        Xây dựng prompt có tri thức tài liệu được xác thực (KNOWLEDGE / RAG).

        Args:
            request (ChatStreamRequest): Yêu cầu chat của người dùng.
            knowledge (list[SearchResult]): Danh sách phân đoạn tài liệu phù hợp vượt ngưỡng score.

        Returns:
            str: Chuỗi prompt kèm ngữ cảnh tài liệu đánh mã cụ thể.
        """
        history = self._history(request.history)
        context = self._tagged_chunks(knowledge)
        return (
            f"SCOPE HỘI THOẠI: {request.scope}\n"
            f"MODULE HIỆN TẠI: {request.module}\n"
            f"ROUTE HIỆN TẠI: {request.route or 'không có'}\n\n"
            f"LỊCH SỬ GẦN NHẤT:\n{history or 'Không có'}\n\n"
            f"TÀI LIỆU QUY CHẾ / GIÁO TRÌNH HỢP LỆ:\n{context or 'Không tìm thấy tài liệu phù hợp'}\n\n"
            f"CÂU HỎI HIỆN TẠI:\n{request.question}\n\n"
            "QUY TẮC BẮT BUỘC:\n"
            "1. Chỉ sử dụng thông tin có trong các phân đoạn tài liệu trên để trả lời các quy định, chính sách, số liệu của tổ chức.\n"
            "2. Nếu tài liệu được cung cấp không đủ thông tin, hãy nói rõ 'Hiện tại tài liệu chưa có thông tin về vấn đề này', TUYỆT ĐỐI không tự suy đoán bịa đặt.\n"
            "3. Khi câu trả lời thực sự sử dụng thông tin từ tài liệu nào, hãy ghi nguồn tham khảo ở cuối câu trả lời (Tên tài liệu, Trang nếu có). Không ghi nguồn nếu không thực sự sử dụng."
        )

    def build_memory(
        self, request: ChatStreamRequest, memories: list[SearchResult]
    ) -> str:
        """
        Xây dựng prompt có ký ức cá nhân của người dùng (MEMORY).

        Args:
            request (ChatStreamRequest): Yêu cầu chat của người dùng.
            memories (list[SearchResult]): Danh sách ký ức dài hạn được recall.

        Returns:
            str: Chuỗi prompt kèm ngữ cảnh bộ nhớ cá nhân.
        """
        history = self._history(request.history)
        memory_text = self._results(memories, "content")
        return (
            f"SCOPE HỘI THOẠI: {request.scope}\n"
            f"MODULE HIỆN TẠI: {request.module}\n"
            f"ROUTE HIỆN TẠI: {request.route or 'không có'}\n\n"
            f"LỊCH SỬ GẦN NHẤT:\n{history or 'Không có'}\n\n"
            f"KÝ ỨC / SỞ THÍCH CÁ NHÂN ĐÃ LƯU CỦA NGƯỜI DÙNG:\n{memory_text or 'Chưa có thông tin ghi nhớ'}\n\n"
            f"CÂU HỎI HIỆN TẠI:\n{request.question}\n\n"
            "Sử dụng thông tin ghi nhớ trên để phản hồi cá nhân hóa. Đây là ký ức cá nhân, không phải tài liệu quy chế hệ thống nên không gắn nhãn trích dẫn tài liệu."
        )

    def build(
        self,
        request: ChatStreamRequest,
        knowledge: list[SearchResult],
        memories: list[SearchResult],
    ) -> str:
        """
        Tổng hợp tất cả các thành phần ngữ cảnh thành một chuỗi prompt hoàn chỉnh gửi tới AI.

        Args:
            request (ChatStreamRequest): Yêu cầu chat chứa câu hỏi, lịch sử, module và scope.
            knowledge (list[SearchResult]): Danh sách các đoạn văn bản trích xuất từ Vector Store theo quyền hạn.
            memories (list[SearchResult]): Danh sách các ký ức dài hạn liên quan đến câu hỏi.

        Returns:
            str: Chuỗi prompt hoàn chỉnh có cấu trúc phân vùng rõ ràng.
        """
        history = self._history(request.history)
        context = self._tagged_chunks(knowledge) if knowledge else ""
        memory = self._results(memories, "content") if memories else ""
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
        """
        Định dạng danh sách tin nhắn lịch sử thành chuỗi văn bản theo vai trò.

        Args:
            messages (list[ChatHistoryMessage]): Danh sách tin nhắn lịch sử hội thoại.

        Returns:
            str: Chuỗi hội thoại nhiều dòng.
        """
        return "\n".join(f"{item.role}: {item.content}" for item in messages[-10:])

    @staticmethod
    def _tagged_chunks(results: list[SearchResult]) -> str:
        """
        Định dạng danh sách kết quả semantic search thành các block chunk có định danh.

        Args:
            results (list[SearchResult]): Danh sách kết quả vector search.

        Returns:
            str: Chuỗi các đoạn trích dẫn được đánh số [chunk_01], [chunk_02],...
        """
        lines: list[str] = []
        for index, result in enumerate(results, start=1):
            chunk_tag = f"chunk_{index:02d}"
            source = result.payload.get("title") or result.payload.get("sourceId", "")
            page = result.payload.get("pageNumber")
            citation_info = f"nguồn={source}" + (f", trang={page}" if page else "")
            lines.append(
                f"[{chunk_tag}] ({citation_info})\n{result.payload.get('chunkText', '')}"
            )
        return "\n\n".join(lines)

    @staticmethod
    def _results(results: list[SearchResult], text_key: str) -> str:
        """
        Định dạng danh sách kết quả semantic search kèm thông tin nguồn trích dẫn.

        Args:
            results (list[SearchResult]): Danh sách kết quả vector search.
            text_key (str): Khóa chứa nội dung văn bản trong payload.

        Returns:
            str: Chuỗi các đoạn trích dẫn.
        """
        lines: list[str] = []
        for index, result in enumerate(results, start=1):
            source = result.payload.get("title") or result.payload.get("sourceId", "")
            page = result.payload.get("pageNumber")
            citation = f"nguồn={source}" + (f", trang={page}" if page else "")
            lines.append(f"[{index}] ({citation}) {result.payload.get(text_key, '')}")
        return "\n".join(lines)
