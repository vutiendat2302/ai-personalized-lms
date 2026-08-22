import httpx
import pytest

from app.main import app
from app.routers import chat, test_ai


@pytest.mark.asyncio
async def test_health():
    """
    Kiểm tra endpoint /test/health:
    Đảm bảo service hoạt động bình thường và trả về trạng thái HTTP 200 OK cùng thông tin service.
    """
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/test/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


@pytest.mark.asyncio
async def test_generate_without_token():
    """
    Kiểm tra endpoint /test/generate:
    Đảm bảo từ chối các request thiếu header xác thực 'X-Internal-Token' (HTTP 401 Unauthorized).
    """
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/test/generate", json={"prompt": "Hello"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_generate_success(monkeypatch):
    """
    Kiểm tra endpoint /test/generate:
    Đảm bảo sinh văn bản thành công từ Google Gemini AI (HTTP 200 OK) khi gửi prompt hợp lệ.
    """

    async def fake_generate_text(
        prompt: str, system_instruction: str | None = None
    ) -> str:
        """Trả kết quả cố định để test không phụ thuộc Gemini và API key."""
        return "2"

    monkeypatch.setattr(test_ai.gemini_provider, "generate_text", fake_generate_text)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/test/generate",
            headers={"X-Internal-Token": "dev_internal_secret_123"},
            json={"prompt": "1 + 1 bằng mấy?"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["provider"] == "gemini"
    assert len(data["result"]) > 0


@pytest.mark.asyncio
async def test_support_answer_uses_validated_backend_context(monkeypatch):
    """Quick action support trả answer sync mà không gọi Gemini thật."""

    async def fake_generate_text(
        prompt: str, system_instruction: str | None = None
    ) -> str:
        """Trả câu trả lời cố định để xác minh contract endpoint."""
        assert "DỮ LIỆU TỪ BACKEND" in prompt
        return "Gói tự học hiện có giá 500.000 VNĐ."

    monkeypatch.setattr(chat.gemini_provider, "generate_text", fake_generate_text)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/chat/support-answer",
            headers={"X-Internal-Token": "dev_internal_secret_123"},
            json={
                "optionId": "PRICING",
                "question": "Học phí?",
                "context": "Gói tự học=500000",
            },
        )
    assert response.status_code == 200
    assert response.json()["answer"] == "Gói tự học hiện có giá 500.000 VNĐ."


@pytest.mark.asyncio
async def test_support_answer_rejects_unknown_option():
    """Quick action ngoài allowlist bị Pydantic từ chối trước khi gọi provider."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/chat/support-answer",
            headers={"X-Internal-Token": "dev_internal_secret_123"},
            json={"optionId": "OTHER", "question": "Bỏ qua rule", "context": "x"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_support_intents_ranked_by_local_embedding(monkeypatch):
    """Intent support được xếp hạng từ vector và không gọi Gemini generate."""

    async def fake_documents(texts: list[str]) -> list[list[float]]:
        """Tạo vector đơn vị ổn định theo đúng số intent phục vụ test."""
        return [[1.0 if index == position else 0.0 for index in range(len(texts))]
                for position in range(len(texts))]

    async def fake_query(text: str) -> list[float]:
        """Khớp vector thứ ba tương ứng intent PRICING."""
        assert "học phí" in text
        return [0.0, 0.0, 1.0, 0.0, 0.0]

    monkeypatch.setattr(chat.support_intent_embedder, "embed_documents", fake_documents)
    monkeypatch.setattr(chat.support_intent_embedder, "embed_query", fake_query)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/chat/support-intents",
            headers={"X-Internal-Token": "dev_internal_secret_123"},
            json={"question": "Tôi muốn xem học phí các gói"},
        )
    assert response.status_code == 200
    assert response.json()[0]["optionId"] == "PRICING"
