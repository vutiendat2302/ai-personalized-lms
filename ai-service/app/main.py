import uvicorn
from fastapi import FastAPI
from app.routers import test_ai
from app.routers import chat
from app.routers import ingest
from app.routers import memory
from app.routers import assessments

app = FastAPI(
    title="AILMS - AI Service",
    description="Microservice AI xử lý kết nối Google Gemini AI cho hệ thống AILMS",
    version="0.1.0",
)

app.include_router(test_ai.router)
app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(memory.router)
app.include_router(assessments.router)


@app.get("/")
async def root():
    """
    Endpoint mặc định trả về thông điệp chào mừng và đường dẫn tới tài liệu API Swagger UI (/docs).

    Returns:
        dict: Thông điệp chào mừng và liên kết tới trang tài liệu API.
    """
    return {"message": "Chào mừng bạn đến với hệ thống AILMS", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
