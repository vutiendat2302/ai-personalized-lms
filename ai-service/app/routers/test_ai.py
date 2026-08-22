import logging

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.core.security import verify_internal_token
from app.providers.gemini_provider import GeminiProvider
from app.schemas.test_schema import GenerateTestRequest, GenerateTestResponse

router = APIRouter(prefix="/test", tags=["Test AI Connection"])
gemini_provider = GeminiProvider()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """
    Endpoint kiểm tra trạng thái hoạt động (health check) của AI Service.
    Không yêu cầu xác thực token nội bộ.

    Returns:
        dict: Chứa thông tin trạng thái service, tên model Gemini và trạng thái cấu hình API Key.
    """
    api_key_configured = bool(
        settings.GEMINI_API_KEY
        and settings.GEMINI_API_KEY != "your_gemini_api_key_here"
    )
    return {
        "status": "ok",
        "service": "ai-service",
        "gemini_model": settings.GEMINI_MODEL,
        "api_key_configured": api_key_configured,
    }


@router.post(
    "/generate",
    response_model=GenerateTestResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def test_generate(request: GenerateTestRequest):
    """
    Endpoint thử nghiệm gửi prompt trực tiếp tới Google Gemini AI và nhận phản hồi.
    Yêu cầu truyền thành công header 'X-Internal-Token'.

    Args:
        request (GenerateTestRequest): Payload chứa prompt và system_instruction.

    Returns:
        GenerateTestResponse: Kết quả phản hồi từ mô hình AI Gemini.
    """
    try:
        response_text = await gemini_provider.generate_text(
            prompt=request.prompt, system_instruction=request.system_instruction
        )
        return GenerateTestResponse(
            status="success",
            provider="gemini",
            model=settings.GEMINI_MODEL,
            result=response_text,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        logger.exception("Không thể kết nối Google AI ở endpoint kiểm tra")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể kết nối tới Google AI lúc này",
        )
