from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Cấu hình trung tâm cho toàn bộ hệ thống AI Microservice (Pydantic Settings).

    Cơ chế hoạt động:
    - Tự động nạp biến môi trường từ hệ điều hành hoặc tệp `.env`.
    - Cung cấp giá trị mặc định cho môi trường phát triển cục bộ và kiểm thử tự động.
    - Quản lý các tham số kết nối API: Gemini API Key, Qdrant URL, Internal Secret, Backend Internal URL,
      kích thước chunk văn bản, số chiều vector và giới hạn ngữ cảnh hội thoại.
    """

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2"
    INTERNAL_SECRET: str = "dev_internal_secret_123"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_CONTENT_COLLECTION: str = "management_knowledge"
    QDRANT_MEMORY_COLLECTION: str = "long_term_memory_local"
    QDRANT_RAG_COLLECTION: str = "management_knowledge_local"
    QDRANT_CATALOG_COLLECTION_PREFIX: str = "public_catalog"
    QDRANT_CATALOG_LOCAL_COLLECTION_PREFIX: str = "public_catalog_local"
    CATALOG_EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    CATALOG_EMBEDDING_BATCH_SIZE: int = 32
    CATALOG_EMBEDDING_DIMENSION: int = 384
    RAG_EMBEDDING_DIMENSION: int = 384
    EMBEDDING_DIMENSION: int = 768
    EMBEDDING_BATCH_SIZE: int = 32
    CHUNK_SIZE: int = 2000
    CHUNK_OVERLAP: int = 200
    CHAT_HISTORY_LIMIT: int = 10
    CHAT_RETRIEVAL_LIMIT: int = 5
    CHAT_MEMORY_LIMIT: int = 3
    BACKEND_INTERNAL_BASE_URL: str = "http://localhost:8080"
    MANAGEMENT_TOOL_MAX_ROUNDS: int = 3
    RAG_MIN_SCORE: float = 0.65
    CHAT_ROUTER_ENABLED: bool = True
    ROUTER_HISTORY_LIMIT: int = 4

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
