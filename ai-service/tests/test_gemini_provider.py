from types import SimpleNamespace
from typing import AsyncGenerator

import pytest

from app.providers.gemini_provider import GeminiProvider
from app.core.config import settings


class StubModels:
    """Giả lập async streaming API của google-genai."""

    async def generate_content_stream(
        self, **_: object
    ) -> AsyncGenerator[object, None]:
        """Trả coroutine resolve thành async iterator giống SDK thật."""

        async def chunks() -> AsyncGenerator[object, None]:
            """Phát hai chunk để kiểm tra provider await đúng stream."""
            yield SimpleNamespace(text="Xin ")
            yield SimpleNamespace(text="chào")

        return chunks()


@pytest.mark.asyncio
async def test_chat_stream_awaits_sdk_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provider phải await coroutine trước khi lặp các Gemini chunk."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-api-key")
    provider = GeminiProvider()
    provider._client = SimpleNamespace(aio=SimpleNamespace(models=StubModels()))

    chunks = [chunk async for chunk in provider.chat_stream("Hello")]

    assert chunks == ["Xin ", "chào"]
