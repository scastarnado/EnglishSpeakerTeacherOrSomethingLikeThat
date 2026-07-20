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

    # Optional local image generation for realistic Part 2 prompts.
    # Compatible with local Stable Diffusion WebUI / SD.Next APIs started with --api.
    LOCAL_IMAGE_PROVIDER: str = os.getenv("LOCAL_IMAGE_PROVIDER", "stable-diffusion-webui")
    STABLE_DIFFUSION_API_URL: str = os.getenv("STABLE_DIFFUSION_API_URL", "http://127.0.0.1:7860")
    LOCAL_IMAGE_WIDTH: int = int(os.getenv("LOCAL_IMAGE_WIDTH", "640"))
    LOCAL_IMAGE_HEIGHT: int = int(os.getenv("LOCAL_IMAGE_HEIGHT", "448"))
    LOCAL_IMAGE_STEPS: int = int(os.getenv("LOCAL_IMAGE_STEPS", "14"))
    LOCAL_IMAGE_CFG_SCALE: float = float(os.getenv("LOCAL_IMAGE_CFG_SCALE", "5.5"))
    LOCAL_IMAGE_SAMPLER: str = os.getenv("LOCAL_IMAGE_SAMPLER", "Euler a")
    LOCAL_IMAGE_CHECKPOINT: Optional[str] = os.getenv(
        "LOCAL_IMAGE_CHECKPOINT", "Realistic_Vision_V6.0_NV_B1_fp16.safetensors"
    )
    LOCAL_IMAGE_AUTOSTART: bool = os.getenv("LOCAL_IMAGE_AUTOSTART", "true").lower() not in ("0", "false", "no")
    LOCAL_IMAGE_WEBUI_PATH: Optional[str] = os.getenv("LOCAL_IMAGE_WEBUI_PATH")
    LOCAL_IMAGE_TOTAL_TIMEOUT_SECONDS: int = int(os.getenv("LOCAL_IMAGE_TOTAL_TIMEOUT_SECONDS", "120"))

    # Performance settings
    MAX_CONCURRENT_TRANSCRIPTIONS: int = 2
    MAX_CONCURRENT_TTS: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
