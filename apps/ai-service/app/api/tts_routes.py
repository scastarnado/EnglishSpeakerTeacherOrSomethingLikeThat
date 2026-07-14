"""API routes for text-to-speech."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import app.main
from app.main import verify_auth_token

router = APIRouter()


class TTSRequest(BaseModel):
    """Request for TTS synthesis."""
    
    model_config = ConfigDict(populate_by_name=True)

    text: str
    voice: str = "british_male"
    speed: float = 1.0
    cache_key: Optional[str] = Field(None, alias="cacheKey")


class TTSResponse(BaseModel):
    """TTS synthesis response."""
    
    model_config = ConfigDict(populate_by_name=True)

    audio_path: str = Field(..., serialization_alias="audioPath")
    duration_seconds: float = Field(..., serialization_alias="durationSeconds")
    from_cache: bool = Field(..., serialization_alias="fromCache")


@router.post("/speak", dependencies=[Depends(verify_auth_token)])
async def synthesize_speech(request: TTSRequest):
    """Synthesize speech from text."""
    print(f"[TTS Route] Received TTS request - text length: {len(request.text)}, voice: {request.voice}")
    print(f"[TTS Route] Text preview: '{request.text[:100]}...'")
    
    tts_service = app.main.tts_service
    if not tts_service:
        print("[TTS Route] ERROR: TTS service is None!")
        raise HTTPException(status_code=503, detail="TTS service unavailable")

    print("[TTS Route] TTS service is available, calling synthesize...")
    try:
        result = await tts_service.synthesize(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            cache_key=request.cache_key,
        )

        print(f"[TTS Route] Synthesis complete: {result}")
        
        # Return camelCase response directly
        response_data = {
            "audioPath": result["audio_path"],
            "durationSeconds": result["duration_seconds"],
            "fromCache": result["from_cache"]
        }
        print(f"[TTS Route] Returning: {response_data}")
        return response_data
    except Exception as e:
        print(f"[TTS Route] ERROR during synthesis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.get("/voices", dependencies=[Depends(verify_auth_token)])
async def list_voices():
    """List available TTS voices."""
    tts_service = app.main.tts_service
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS service unavailable")

    return tts_service.get_available_voices()
