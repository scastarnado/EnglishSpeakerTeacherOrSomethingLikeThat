"""
Main FastAPI application for C1 Speaking Coach AI Service.

This service handles:
- Speech-to-text transcription (Whisper)
- LLM inference (Ollama)
- Text-to-speech synthesis
- Audio analysis
- Assessment generation
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from typing import Optional

from app.config import settings
from app.audio.transcription import TranscriptionService
from app.audio.analysis import AudioAnalyzer
from app.llm.ollama_client import OllamaClient
from app.tts.tts_service import TTSService
from app.exam.interlocutor import InterlocutorAgent
from app.exam.co_candidate import CoCandidateAgent
from app.assessment.assessor import AssessmentEngine

# Global service instances
transcription_service: Optional[TranscriptionService] = None
audio_analyzer: Optional[AudioAnalyzer] = None
ollama_client: Optional[OllamaClient] = None
tts_service: Optional[TTSService] = None
interlocutor_agent: Optional[InterlocutorAgent] = None
co_candidate_agent: Optional[CoCandidateAgent] = None
assessment_engine: Optional[AssessmentEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services."""
    global transcription_service, audio_analyzer, ollama_client, tts_service
    global interlocutor_agent, co_candidate_agent, assessment_engine

    print("[AI Service] Initializing services...")

    try:
        # Initialize services
        print("[AI Service] Initializing transcription service...")
        transcription_service = TranscriptionService()
        print("[AI Service] Transcription service initialized")
        
        print("[AI Service] Initializing audio analyzer...")
        audio_analyzer = AudioAnalyzer()
        print("[AI Service] Audio analyzer initialized")
        
        print("[AI Service] Initializing Ollama client...")
        ollama_client = OllamaClient(base_url=settings.OLLAMA_BASE_URL)
        print("[AI Service] Ollama client initialized")
        
        print("[AI Service] Initializing TTS service...")
        tts_service = TTSService()
        print("[AI Service] TTS service initialized")

        # Initialize AI agents
        print("[AI Service] Initializing AI agents...")
        interlocutor_agent = InterlocutorAgent(ollama_client)
        co_candidate_agent = CoCandidateAgent(ollama_client)
        assessment_engine = AssessmentEngine(ollama_client)
        print("[AI Service] AI agents initialized")

        print("[AI Service] All services initialized successfully")
    except Exception as e:
        print(f"[AI Service] ERROR during initialization: {e}")
        import traceback
        traceback.print_exc()
        raise

    yield

    # Cleanup
    print("[AI Service] Shutting down services...")
    if transcription_service:
        await transcription_service.cleanup()
    if tts_service:
        await tts_service.cleanup()


# Create FastAPI app
app = FastAPI(
    title="C1 Speaking Coach AI Service",
    description="Local AI service for speech processing and assessment",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware (localhost only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication dependency
async def verify_auth_token(authorization: str = Header(None)) -> bool:
    """Verify bearer token from Electron app."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    expected_token = settings.AUTH_TOKEN
    if not expected_token:
        # In development, allow without token
        if settings.ENVIRONMENT == "development":
            return True
        raise HTTPException(status_code=500, detail="Auth token not configured")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]
    if token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid token")

    return True


# ============================================================================
# Health Check
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "transcription": transcription_service is not None,
            "tts": tts_service is not None,
            "ollama": ollama_client is not None,
        },
    }


# ============================================================================
# System Information
# ============================================================================


@app.get("/system/ollama-status", dependencies=[Depends(verify_auth_token)])
async def get_ollama_status():
    """Check Ollama availability and list models."""
    if not ollama_client:
        return {"available": False, "models": []}

    try:
        models = await ollama_client.list_models()
        version = await ollama_client.get_version()
        return {
            "available": True,
            "version": version,
            "models": [model["name"] for model in models],
        }
    except Exception as e:
        return {"available": False, "error": str(e), "models": []}


@app.get("/models", dependencies=[Depends(verify_auth_token)])
async def list_models(type: Optional[str] = None):
    """List available models."""
    models = []

    if type is None or type == "llm":
        if ollama_client:
            try:
                ollama_models = await ollama_client.list_models()
                models.extend(
                    [
                        {
                            "type": "llm",
                            "name": model["name"],
                            "size": model.get("size"),
                            "installed": True,
                        }
                        for model in ollama_models
                    ]
                )
            except:
                pass

    if type is None or type == "whisper":
        models.extend(
            [
                {"type": "whisper", "name": "small.en", "installed": True},
                {"type": "whisper", "name": "medium.en", "installed": False},
                {"type": "whisper", "name": "large-v3", "installed": False},
            ]
        )

    return models


@app.post("/models/test", dependencies=[Depends(verify_auth_token)])
async def test_model(request: dict):
    """Test if a model works."""
    model_type = request.get("type")
    model_name = request.get("name")

    if model_type == "llm":
        if not ollama_client:
            return {"success": False, "message": "Ollama client not initialized"}

        try:
            # Try a simple generation
            response = await ollama_client.generate(
                prompt="Say hello",
                model=model_name,
                max_tokens=10,
            )
            return {"success": True, "message": "Model is working"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    elif model_type == "whisper":
        # Whisper models are loaded on-demand
        return {"success": True, "message": "Whisper model available"}

    else:
        return {"success": False, "message": "Unknown model type"}


# ============================================================================
# Import route modules
# ============================================================================

from app.api import audio_routes, exam_routes, assessment_routes, tts_routes, image_routes

app.include_router(audio_routes.router, prefix="/audio", tags=["audio"])
app.include_router(exam_routes.router, prefix="/exam", tags=["exam"])
app.include_router(assessment_routes.router, prefix="/assessment", tags=["assessment"])
app.include_router(tts_routes.router, prefix="/tts", tags=["tts"])
app.include_router(image_routes.router, prefix="/images", tags=["images"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
