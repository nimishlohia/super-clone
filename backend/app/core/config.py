from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Signal Messenger API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth Settings
    SECRET_KEY: str = "super-secret-key-change-this-in-production-evaluation"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./signal.db"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Verification Configuration
    MOCK_OTP: str = "123456"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()