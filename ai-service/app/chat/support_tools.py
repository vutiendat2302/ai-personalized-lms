from app.rag.retriever import Retriever


class SupportKnowledgeTools:
    """Allow-list công cụ RAG chỉ đọc dành cho tư vấn công khai."""

    def __init__(self, retriever: Retriever | None = None) -> None:
        """Nhận retriever tách rời để kiểm thử mà không phụ thuộc Qdrant thật."""
        self.retriever = retriever or Retriever()

    async def search_policy(self, question: str, limit: int = 6) -> str:
        """Tìm chunk policy công khai đã ingest với filter cố định, không nhận filter từ model."""
        results = await self.retriever.retrieve(
            question,
            {"module": "SUPPORT", "domain": "support_policy", "allowedRoles": ["ALL"]},
            limit,
        )
        chunks = [str(item.payload.get("chunkText", "")).strip() for item in results]
        return "\n\n".join(chunk for chunk in chunks if chunk)
