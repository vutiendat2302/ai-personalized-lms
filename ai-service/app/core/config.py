from pydantic_settings import BaseSettings, SettingsConfigDict

# Đọc biến môi trường 
class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    INTERNAL_SECRET: str = "dev_internal_secret_123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
