from pydantic_settings import BaseSettings, SettingsConfigDict


# Đọc biến môi trường
class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2"
    INTERNAL_SECRET: str = "dev_internal_secret_123"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_CONTENT_COLLECTION: str = "management_knowledge"
    QDRANT_MEMORY_COLLECTION: str = "long_term_memory"
    EMBEDDING_DIMENSION: int = 768
    EMBEDDING_BATCH_SIZE: int = 32
    CHUNK_SIZE: int = 2000
    CHUNK_OVERLAP: int = 200
    CHAT_HISTORY_LIMIT: int = 10
    CHAT_RETRIEVAL_LIMIT: int = 5
    CHAT_MEMORY_LIMIT: int = 3
    BACKEND_INTERNAL_BASE_URL: str = "http://localhost:8080"
    MANAGEMENT_TOOL_MAX_ROUNDS: int = 3

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
