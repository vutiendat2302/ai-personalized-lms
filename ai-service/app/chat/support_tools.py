from app.rag.retriever import Retriever


class SupportKnowledgeTools:
    """
    Tập hợp công cụ tra cứu tri thức công khai (Public Knowledge Tools) cho cổng tư vấn học viên/khách vãng lai.

    Cơ chế hoạt động và bảo mật:
    - Cổng tư vấn công khai chỉ được phép tiếp cận tài liệu quy định, chính sách, hướng dẫn nhập học chung.
    - Công cụ này cố định filter lọc (`module="SUPPORT"`, `domain="support_policy"`, `allowedRoles=["ALL"]`),
      tuyệt đối không cho phép AI Model tự ý thay đổi filter hoặc truy cập sang tri thức quản trị nội bộ nhạy cảm.
    """

    def __init__(self, retriever: Retriever | None = None) -> None:
        """
        Khởi tạo SupportKnowledgeTools với Retriever.

        Args:
            retriever (Retriever | None): Đối tượng truy xuất vector phục vụ tìm kiếm ngữ nghĩa.
        """
        self.retriever = retriever or Retriever()

    async def search_policy(self, question: str, limit: int = 6) -> str:
        """
        Tìm kiếm các đoạn tài liệu chính sách và điều khoản hỗ trợ công khai liên quan tới câu hỏi.

        Cơ chế:
        1. Gọi `Retriever.retrieve` với câu hỏi và payload filter cố định cho module SUPPORT.
        2. Trích xuất trường `chunkText` từ các kết quả tìm kiếm.
        3. Ghép các đoạn văn bản lại thành một chuỗi duy nhất phân tách bởi 2 dòng trống.

        Args:
            question (str): Câu hỏi thắc mắc của người dùng về chính sách/học phí/quy chế.
            limit (int): Số lượng đoạn tri thức tối đa cần lấy (mặc định 6).

        Returns:
            str: Chuỗi văn bản chứa toàn bộ nội dung các chính sách liên quan đã được bóc tách.
        """
        results = await self.retriever.retrieve(
            question,
            {"module": "SUPPORT", "domain": "support_policy", "allowedRoles": ["ALL"]},
            limit,
        )
        chunks = [str(item.payload.get("chunkText", "")).strip() for item in results]
        return "\n\n".join(chunk for chunk in chunks if chunk)
