from types import SimpleNamespace

import pytest

from app.chat.management_tools import ManagementToolClient
from app.core.config import settings
from app.providers.gemini_provider import GeminiProvider


class StubModels:
    """Giả lập Gemini trả tool call rồi trả câu trả lời cuối cùng."""

    def __init__(self) -> None:
        """Khởi tạo bộ đếm để thay đổi response theo từng lượt gọi."""
        self.calls = 0

    async def generate_content(self, **_: object) -> object:
        """Trả một function call ở lượt đầu và văn bản ở lượt hai."""
        self.calls += 1
        if self.calls == 1:
            model_content = SimpleNamespace(parts=[SimpleNamespace()])
            return SimpleNamespace(
                function_calls=[
                    SimpleNamespace(name="search_employees", args={"keyword": "An"})
                ],
                candidates=[SimpleNamespace(content=model_content)],
                text=None,
            )
        return SimpleNamespace(function_calls=[], candidates=[], text="Đã tìm thấy nhân viên.")


@pytest.mark.asyncio
async def test_management_tool_calling_uses_backend_result(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Provider phải chuyển tool call sang Backend trước khi trả câu trả lời Gemini."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-api-key")

    async def fake_execute(
        self: ManagementToolClient,
        tool_name: str,
        arguments: dict[str, object],
        tool_access_token: str,
    ) -> dict[str, object]:
        """Ghi nhận arguments để xác minh token context không do Gemini sinh ra."""
        assert tool_name == "search_employees"
        assert arguments == {"keyword": "An"}
        assert tool_access_token == "signed-context"
        return {"count": 1, "employees": [{"employeeCode": "EMP001"}]}

    monkeypatch.setattr(ManagementToolClient, "execute", fake_execute)
    provider = GeminiProvider()
    provider._client = SimpleNamespace(
        aio=SimpleNamespace(models=StubModels())
    )

    chunks = [
        chunk
        async for chunk in provider.chat_stream_with_tools(
            "Tìm nhân viên An", "signed-context"
        )
    ]

    assert chunks == ["Đã tìm thấy nhân viên."]
