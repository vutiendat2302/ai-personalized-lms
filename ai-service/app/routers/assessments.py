import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import verify_internal_token
from app.providers.gemini_provider import GeminiProvider
from app.schemas.assessment_schema import (
    AssessmentGenerationRequest,
    AssessmentGenerationResponse,
)
from app.services.assessment_generator import AssessmentGenerator

router = APIRouter(
    prefix="/assessments",
    tags=["AI Assessments"],
    dependencies=[Depends(verify_internal_token)],
)
logger = logging.getLogger(__name__)
generator = AssessmentGenerator(GeminiProvider())


@router.post("/generate", response_model=AssessmentGenerationResponse)
async def generate_assessment(
    request: AssessmentGenerationRequest,
) -> AssessmentGenerationResponse:
    """Sinh assessment draft từ lesson và source upload mà không lưu source hay assessment."""
    try:
        return await generator.generate(request)
    except ValueError as exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exception)
        ) from exception
    except Exception:
        logger.exception("Không thể sinh assessment AI")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI không thể sinh assessment từ nội dung này lúc này",
        )
