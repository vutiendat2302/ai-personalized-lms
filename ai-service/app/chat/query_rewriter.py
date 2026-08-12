from app.providers.gemini_provider import GeminiProvider
from app.schemas.chat_schema import ChatHistoryMessage


class QueryRewriter:
    """Viết lại câu hỏi nối tiếp thành truy vấn độc lập để retrieval chính xác."""

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        """Khởi tạo provider dùng cho một lần gọi rewrite ngắn."""
        self.provider = provider or GeminiProvider()

    async def rewrite(self, question: str, history: list[ChatHistoryMessage]) -> str:
        """Bổ sung ngữ cảnh lịch sử vào câu hỏi nhưng không tự trả lời."""
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
