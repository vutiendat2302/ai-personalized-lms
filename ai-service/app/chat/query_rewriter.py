from app.providers.gemini_provider import GeminiProvider
from app.schemas.chat_schema import ChatHistoryMessage


class QueryRewriter:
    """
    Bộ viết lại câu hỏi ngữ cảnh (Contextual Query Rewriter / HyDE).

    Cơ chế hoạt động:
    - Trong hội thoại thực tế, người dùng thường hỏi những câu ngắn cụt hoặc sử dụng đại từ thay thế
      (ví dụ: "Thế còn học phí của nó thì sao?", "Quy chế đó áp dụng khi nào?").
    - Nếu đem trực tiếp câu hỏi ngắn này đi vector search trên Qdrant, kết quả tìm kiếm sẽ rất kém do thiếu từ khóa chủ thể.
    - `QueryRewriter` sử dụng Gemini để phân tích lịch sử 10 tin nhắn gần nhất và viết lại câu hỏi thành một câu truy vấn độc lập,
      đầy đủ ngữ cảnh và từ khóa chính xác trước khi đưa vào RAG pipeline.
    """

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """
        Khởi tạo QueryRewriter với GeminiProvider.

        Args:
            provider (GeminiProvider | None): Instance AI Provider xử lý lệnh viết lại prompt.
        """
        self.provider = provider or GeminiProvider()

    async def rewrite(self, question: str, history: list[ChatHistoryMessage]) -> str:
        """
        Phân tích lịch sử hội thoại và sinh ra câu truy vấn độc lập hoàn chỉnh.

        Cơ chế:
        1. Nếu không có lịch sử hội thoại -> Giữ nguyên câu hỏi ban đầu để tiết kiệm token và độ trễ.
        2. Ghép 10 tin nhắn lịch sử gần nhất vào prompt chỉ dẫn viết lại.
        3. Yêu cầu LLM trả về đúng 1 câu hỏi độc lập duy nhất, không giải thích dài dòng.
        4. Nếu quá trình sinh gặp vấn đề hoặc chuỗi rỗng -> Fallback về câu hỏi gốc của người dùng.

        Args:
            question (str): Câu hỏi gốc mới nhất của người dùng.
            history (list[ChatHistoryMessage]): Danh sách tin nhắn lịch sử hội thoại.

        Returns:
            str: Câu hỏi đã được bổ sung ngữ cảnh đầy đủ hoặc câu hỏi gốc.
        """
        if not history:
            return question
        transcript = "\n".join(
            f"{message.role}: {message.content}" for message in history[-10:]
        )
        prompt = (
            "Lịch sử hội thoại:\n"
            f"{transcript}\n\nCâu hỏi mới: {question}\n\n"
            "Viết lại câu hỏi mới thành đúng một câu hỏi độc lập, đầy đủ ngữ cảnh để "
            "tìm kiếm tài liệu. Không trả lời câu hỏi và không thêm giải thích."
        )
        rewritten = await self.provider.generate_text(
            prompt,
            "Bạn là bộ viết lại truy vấn tiếng Việt chính xác và tiết kiệm token.",
        )
        return rewritten.strip() or question
