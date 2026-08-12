import base64
import binascii

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import verify_internal_token
from app.rag.ingestion_pipeline import IngestionPipeline
from app.rag.retriever import Retriever
from app.schemas.rag_schema import (
    IngestRequest,
    IngestResponse,
    SearchItem,
    SearchRequest,
)

router = APIRouter(
    prefix="/rag", tags=["RAG"], dependencies=[Depends(verify_internal_token)]
)
pipeline = IngestionPipeline()
retriever = Retriever()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(request: IngestRequest) -> IngestResponse:
    """Extract, chunk, embed và upsert nguồn trong một request đồng bộ."""
    try:
        file_bytes = (
            base64.b64decode(request.file_base64, validate=True)
            if request.file_base64
            else None
        )
        metadata = {
            **request.metadata,
            "module": request.module.upper(),
            "domain": request.domain.lower(),
            "allowedRoles": [role.upper() for role in request.allowed_roles],
            "mimeType": request.mime_type,
            "courseId": request.course_id,
            "sectionId": request.section_id,
            "lessonId": request.lesson_id,
        }
        count = await pipeline.ingest(
            source_id=request.source_id,
            source_type=request.source_type,
            content=(
                request.mime_type if request.source_type == "image" else request.content
            ),
            file_bytes=file_bytes,
            metadata={
                key: value for key, value in metadata.items() if value is not None
            },
        )
        return IngestResponse(chunksCount=count, sourceType=request.source_type)
    except (ValueError, binascii.Error) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: str) -> None:
    """Xóa vector của nguồn khi Backend đã xóa dữ liệu gốc khỏi MySQL."""
    await pipeline.delete_source(source_id)


@router.post("/search", response_model=list[SearchItem])
async def search(request: SearchRequest) -> list[SearchItem]:
    """Tìm semantic với role filter bắt buộc do backend cung cấp."""
    filters = {
        key: value for key, value in request.filters.items() if key != "allowedRoles"
    }
    filters["allowedRoles"] = list({role.upper() for role in request.roles} | {"ALL"})
    results = await retriever.retrieve(request.query, filters, request.limit)
    return [
        SearchItem(
            score=result.score,
            text=str(result.payload.get("chunkText", "")),
            metadata={
                key: value
                for key, value in result.payload.items()
                if key != "chunkText"
            },
        )
        for result in results
    ]
