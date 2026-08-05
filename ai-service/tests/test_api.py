from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    """
    Kiểm tra endpoint /test/health:
    Đảm bảo service hoạt động bình thường và trả về trạng thái HTTP 200 OK cùng thông tin service.
    """
    response = client.get("/test/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_generate_without_token():
    """
    Kiểm tra endpoint /test/generate:
    Đảm bảo từ chối các request thiếu header xác thực 'X-Internal-Token' (HTTP 401 Unauthorized).
    """
    response = client.post(
        "/test/generate",
        json={"prompt": "Hello"}
    )
    assert response.status_code == 401


def test_generate_success():
    """
    Kiểm tra endpoint /test/generate:
    Đảm bảo sinh văn bản thành công từ Google Gemini AI (HTTP 200 OK) khi gửi prompt hợp lệ.
    """
    response = client.post(
        "/test/generate",
        headers={"X-Internal-Token": "dev_internal_secret_123"},
        json={"prompt": "1 + 1 bằng mấy?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["provider"] == "gemini"
    assert len(data["result"]) > 0
