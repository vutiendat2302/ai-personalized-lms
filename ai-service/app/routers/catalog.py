from fastapi import APIRouter, Depends

from app.catalog.service import CatalogVectorService
from app.core.security import verify_internal_token
from app.schemas.catalog_schema import (
    CatalogIndexRequest,
    CatalogIndexBatchRequest,
    CatalogSearchItem,
    CatalogSearchRequest,
)

router = APIRouter(
    prefix="/catalog", tags=["Catalog semantic search"], dependencies=[Depends(verify_internal_token)]
)
catalog_service = CatalogVectorService()


@router.post("/index", status_code=204)
async def index_catalog(request: CatalogIndexRequest) -> None:
    """Tạo hoặc cập nhật vector cho category/course từ dữ liệu Backend."""
    await catalog_service.index(request.source_id, request.entity_type, request.text, request.metadata)


@router.post("/index-batch", status_code=204)
async def index_catalog_batch(request: CatalogIndexBatchRequest) -> None:
    """Backfill course/category bằng local embedding theo batch."""
    await catalog_service.index_batch([item.model_dump(by_alias=True) for item in request.items])


@router.delete("/{entity_type}/{source_id}", status_code=204)
async def delete_catalog(entity_type: str, source_id: str) -> None:
    """Xóa vector catalog theo loại entity và ID nguồn."""
    await catalog_service.delete(source_id, entity_type)


@router.post("/search", response_model=list[CatalogSearchItem])
async def search_catalog(request: CatalogSearchRequest) -> list[CatalogSearchItem]:
    """Trả về ID catalog theo thứ tự điểm cosine similarity giảm dần."""
    results = await catalog_service.search(request.query, request.entity_type, request.limit, request.filters)
    return [CatalogSearchItem(id=str(result.payload.get("sourceId", result.id)),
                               score=result.score, metadata=result.payload) for result in results]
