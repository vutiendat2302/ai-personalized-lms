from fastapi import APIRouter, Depends, Response, status

from app.core.security import verify_internal_token
from app.memory.long_term_memory import LongTermMemoryStore
from app.schemas.memory_schema import MemoryItem, RecallRequest, RememberRequest

router = APIRouter(
    prefix="/memory",
    tags=["Long-term Memory"],
    dependencies=[Depends(verify_internal_token)],
)
memory_store = LongTermMemoryStore()


@router.put("/{owner_id}/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remember(owner_id: str, memory_id: str, request: RememberRequest) -> Response:
    """Tạo hoặc cập nhật memory thuộc đúng owner và scope."""
    await memory_store.remember(
        owner_id, request.scope, memory_id, request.content, request.metadata
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/recall", response_model=list[MemoryItem])
async def recall(request: RecallRequest) -> list[MemoryItem]:
    """Tìm long-term memory trong đúng owner và scope trách nhiệm."""
    results = await memory_store.recall(
        request.owner_id, request.scope, request.query, request.limit
    )
    return [
        MemoryItem(
            memoryId=str(result.payload.get("memoryId", "")),
            content=str(result.payload.get("content", "")),
            score=result.score,
            metadata={
                key: value
                for key, value in result.payload.items()
                if key not in {"ownerId", "memoryId", "content"}
            },
        )
        for result in results
    ]


@router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def forget(owner_id: str, scope: str, memory_id: str | None = None) -> Response:
    """Xóa memory của owner trong scope được chỉ định."""
    await memory_store.forget(owner_id, scope, memory_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
