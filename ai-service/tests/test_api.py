import httpx
import pytest

from app.main import app
from app.routers import test_ai


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
