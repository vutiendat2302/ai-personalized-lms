import json
import logging
from app.chat.fast_router import FastChatRouter
from app.core.config import settings
from app.providers.gemini_provider import GeminiProvider
from app.schemas.chat_schema import (
    ChatHistoryMessage,
    ChatRoute,
    ChatRoutingDecision,
    GroundingMode,
)

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """Bạn là Bộ phân loại ý định (Intent Router) của Trợ lý AI hệ thống LMS AILMS.
Nhiệm vụ: Phân tích câu hỏi của người dùng và chọn duy nhất 1 route cùng 1 grounding mode phù hợp.

CÁC ROUTE:
1. DIRECT:
- Trò chuyện, chào hỏi, cảm ơn, khen ngợi.
- Giải thích kiến thức chung (ví dụ: OOP, REST API, Machine Learning cơ bản, công thức toán/lý).
- Viết lại, tóm tắt đoạn văn bản do người dùng trực tiếp cung cấp trong prompt/tệp đính kèm.
- Sáng tạo, brainstorming ý tưởng không phụ thuộc tài liệu nội bộ của hệ thống.

2. KNOWLEDGE:
- Câu hỏi về quy định, quy chế, chính sách của trung tâm/hệ thống AILMS (học phí, nghỉ học, thi lại, bảo lưu, hoàn tiền).
- Câu hỏi về nội dung tài liệu, giáo trình, bài giảng, đề cương của khóa học hoặc bài học cụ thể.
- Yêu cầu tra cứu thông tin authoritative trong kho tri thức nội bộ.

3. TOOL:
- Câu hỏi về dữ liệu hệ thống thời gian thực (realtime) như: số lượng học viên của một lớp hiện tại, điểm danh hôm nay, danh sách hợp đồng chờ duyệt, lịch dạy cụ thể của một giảng viên, tiến độ hoàn thành bài của học viên.
- Yêu cầu thực thi nghiệp vụ hệ thống (tạo bài quiz, lưu đề thi).

4. MEMORY:
- Câu hỏi gợi nhắc thông tin cá nhân mà người dùng từng chia sẻ trước đó (ví dụ: sở thích học tập, mục tiêu cá nhân đã lưu).

GROUNDING MODES:
- NONE: Không cần dữ liệu chính thức bên ngoài (áp dụng cho DIRECT).
- OPTIONAL: Có thể tận dụng tri thức nếu có, nếu không thì dùng kiến thức tổng quát của AI.
- REQUIRED: BẮT BUỘC phải dựa trên tài liệu/dữ liệu chính xác của hệ thống, không được tự suy đoán bịa số liệu.

Định dạng trả về: Bắt buộc CHỈ trả về một JSON object hợp lệ duy nhất theo mẫu sau, không kèm giải thích bên ngoài:
{"route": "DIRECT|KNOWLEDGE|TOOL|MEMORY", "grounding": "NONE|OPTIONAL|REQUIRED", "reason": "mô tả ngắn"}
"""


class ChatRouter:
    """
    Bộ định tuyến thông minh kết hợp 2 tầng (Hybrid Chat Router).

    Cơ chế:
    - Tầng 1: Chạy `FastChatRouter` (heuristic/regex) để phân loại tức thì các câu rõ ràng mà không tốn token/latency.
    - Tầng 2: Nếu Tầng 1 không xác định chắc chắn (trả về None), gọi Gemini Flash Lite với prompt ngắn để phân loại chính xác intent và grounding mode.
    """

    def __init__(
        self,
        fast_router: FastChatRouter | None = None,
        provider: GeminiProvider | None = None,
    ) -> None:
        """
        Khởi tạo ChatRouter với Fast Router và Provider.

        Args:
            fast_router (FastChatRouter | None): Instance heuristic router.
            provider (GeminiProvider | None): Instance LLM Provider để phân loại ngữ nghĩa.
        """
        self.fast_router = fast_router or FastChatRouter()
        self.provider = provider or GeminiProvider()

    async def decide(
        self,
        question: str,
        history: list[ChatHistoryMessage] | None = None,
        module: str = "GENERAL",
        route: str | None = None,
    ) -> ChatRoutingDecision:
        """
        Phân loại câu hỏi thành quyết định điều phối routing cụ thể.

        Cơ chế:
        1. Gọi FastChatRouter trước. Nếu có kết quả, trả về ngay.
        2. Tạo ngữ cảnh ngắn gọn gồm câu hỏi, module, route và tối đa 4 tin nhắn lịch sử gần nhất.
        3. Gọi Gemini phân loại và parse JSON kết quả.
        4. Fallback về DIRECT (NONE) nếu phân loại LLM gặp sự cố để đảm bảo trải nghiệm chat không bị gián đoạn.

        Args:
            question (str): Câu hỏi của người dùng.
            history (list[ChatHistoryMessage] | None): Lịch sử hội thoại.
            module (str): Tên module hiện tại của màn hình (ví dụ: COURSE, HR, SALES).
            route (str | None): Đường dẫn trang web hiện tại (ví dụ: /teacher/courses/10).

        Returns:
            ChatRoutingDecision: Quyết định chứa route, grounding mode và lý do.
        """
        fast_decision = self.fast_router.classify(question)
        if fast_decision is not None:
            return fast_decision

        recent_history = ""
        if history:
            limit = settings.ROUTER_HISTORY_LIMIT
            sliced = history[-limit:]
            recent_history = "\n".join(f"{item.role}: {item.content}" for item in sliced)

        prompt = (
            f"MODULE: {module}\n"
            f"ROUTE: {route or 'không có'}\n"
            f"LỊCH SỬ GẦN NHẤT:\n{recent_history or 'Không có'}\n\n"
            f"CÂU HỎI:\n{question}\n\n"
            "Hãy trả về JSON phân loại:"
        )

        try:
            raw_response = await self.provider.generate_text(
                prompt, ROUTER_SYSTEM_PROMPT
            )
            parsed = self._parse_json(raw_response)
            route_val = ChatRoute(parsed.get("route", "DIRECT").upper())
            grounding_val = GroundingMode(parsed.get("grounding", "NONE").upper())
            reason = str(parsed.get("reason", "llm_classified"))
            return ChatRoutingDecision(
                route=route_val, grounding=grounding_val, reason=reason
            )
        except Exception as error:
            logger.warning("LLM router classification failed, fallback to DIRECT: %s", error)
            return ChatRoutingDecision(
                route=ChatRoute.DIRECT,
                grounding=GroundingMode.NONE,
                reason="fallback_on_error",
            )

    @staticmethod
    def _parse_json(text: str) -> dict:
        """
        Trích xuất và parse an toàn JSON từ phản hồi dạng text của LLM.

        Args:
            text (str): Phản hồi thô của mô hình.

        Returns:
            dict: Dictionary dữ liệu JSON đã bóc tách.
        """
        cleaned = text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            cleaned = cleaned[start : end + 1]
        return json.loads(cleaned)
