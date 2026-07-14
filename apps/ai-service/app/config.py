"""Configuration settings for the AI service."""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings."""

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Authentication
    AUTH_TOKEN: Optional[str] = os.getenv("AI_SERVICE_AUTH_TOKEN")

    # Data paths
    DATA_PATH: str = os.getenv("AI_SERVICE_DATA_PATH", "./data")
    CACHE_PATH: str = os.getenv("AI_SERVICE_CACHE_PATH", "./cache")

    # Ollama configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_TIMEOUT: int = 120  # seconds

    # Whisper configuration
    WHISPER_MODEL_PATH: str = os.getenv("WHISPER_MODEL_PATH", "./models/whisper")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "auto")  # auto, cpu, cuda

    # TTS configuration
    TTS_MODEL_PATH: str = os.getenv("TTS_MODEL_PATH", "./models/tts")
    TTS_CACHE_DIR: str = os.getenv("TTS_CACHE_DIR", "./cache/tts")

    # Model defaults
    DEFAULT_LLM_MODEL: str = "qwen2.5:7b-instruct"
    DEFAULT_WHISPER_MODEL: str = "small.en"
    DEFAULT_TTS_VOICE: str = "british_male"

    # Performance settings
    MAX_CONCURRENT_TRANSCRIPTIONS: int = 2
    MAX_CONCURRENT_TTS: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
