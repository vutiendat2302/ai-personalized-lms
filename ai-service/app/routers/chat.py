from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.core.security import verify_internal_token
from app.providers.gemini_provider import GeminiProvider
from app.schemas.chat_schema import ChatStreamRequest

router = APIRouter(prefix="/chat", tags=["Chat"], dependencies=[Depends(verify_internal_token)])
gemini_provider = GeminiProvider()

DEFAULT_SYSTEM_PROMPT = (
    "Bạn là trợ lý AI hỗ trợ quản trị viên hệ thống quản lý học tập AILMS. "
    "Trả lời ngắn gọn, chính xác, bằng tiếng Việt."
)


async def sse_event_generator(question: str, system_instruction: str):
    try:
        async for chunk in gemini_provider.chat_stream(
            prompt=question,
            system_instruction=system_instruction
        ):
            # Escape xuống dòng để không phá format SSE (mỗi event chỉ 1 dòng "data: ...")
            safe_chunk = chunk.replace("\n", "\\n")
            yield f"data: {safe_chunk}\n\n"
    except Exception as e:
        yield f"event: error\ndata: {str(e)}\n\n"
    finally:
        yield "event: done\ndata: [DONE]\n\n"


@router.post("/stream")
async def chat_stream(request: ChatStreamRequest):
    """
    Endpoint streaming trả lời AI dạng SSE (Server-Sent Events).
    """
    system_instruction = request.system_instruction or DEFAULT_SYSTEM_PROMPT
    return StreamingResponse(
        sse_event_generator(request.question, system_instruction),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # tắt buffer nếu sau này có Nginx đứng trước
        }
    )