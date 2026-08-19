import re
from app.schemas.chat_schema import ChatRoute, ChatRoutingDecision, GroundingMode


class FastChatRouter:
    """
    Bộ định tuyến nhanh dựa trên heuristic và mẫu câu (Fast Heuristic Router).

    Cơ chế:
    - Bắt nhanh các câu chào hỏi, cảm ơn, giao tiếp thông thường với chi phí 0 token, 0 latency -> DIRECT (NONE).
    - Bắt nhanh các câu hỏi chứa từ khóa quy định, quy chế bắt buộc của tổ chức -> KNOWLEDGE (REQUIRED).
    - Trả về None nếu câu hỏi không thuộc các mẫu có độ tự tin cao để chuyển tiếp cho LLM Router phân loại.
    """

    DIRECT_EXACT_PATTERNS = {
        "xin chào",
        "chào bạn",
        "chào",
        "hello",
        "hi",
        "cảm ơn",
        "cảm ơn bạn",
        "cảm ơn nhé",
        "thanks",
        "thank you",
        "ok",
        "oke",
        "okay",
        "tạm biệt",
        "bye",
        "goodbye",
    }

    REQUIRED_KNOWLEDGE_PATTERNS = [
        "theo quy định",
        "theo quy chế",
        "theo tài liệu",
        "theo chính sách",
        "quy định của trung tâm",
        "quy định của hệ thống",
        "quy chế của",
        "chính sách hoàn tiền",
        "chính sách thanh toán",
        "điều kiện hoàn học phí",
        "quy định nghỉ học",
        "quy định thi lại",
        "quy định bảo lưu",
    ]

    def classify(self, question: str) -> ChatRoutingDecision | None:
        """
        Phân loại nhanh câu hỏi người dùng thành quyết định điều phối routing.

        Cơ chế:
        - Chuẩn hóa text (chữ thường, bỏ dấu câu thừa ở hai đầu).
        - Kiểm tra khớp chính xác với tập mẫu giao tiếp cơ bản -> DIRECT.
        - Kiểm tra chứa cụm từ khóa quy chế tổ chức -> KNOWLEDGE.
        - Trả về None nếu không khớp mẫu tự tin cao.

        Args:
            question (str): Câu hỏi thô từ người dùng.

        Returns:
            ChatRoutingDecision | None: Quyết định điều phối hoặc None nếu cần LLM phân loại sâu.
        """
        cleaned = question.strip().lower()
        cleaned_no_punct = re.sub(r"[?!.,;:]+$", "", cleaned).strip()

        if cleaned_no_punct in self.DIRECT_EXACT_PATTERNS:
            return ChatRoutingDecision(
                route=ChatRoute.DIRECT,
                grounding=GroundingMode.NONE,
                reason="fast_pattern_casual_greeting",
            )

        if any(pattern in cleaned for pattern in self.REQUIRED_KNOWLEDGE_PATTERNS):
            return ChatRoutingDecision(
                route=ChatRoute.KNOWLEDGE,
                grounding=GroundingMode.REQUIRED,
                reason="fast_pattern_organization_policy",
            )

        return None
