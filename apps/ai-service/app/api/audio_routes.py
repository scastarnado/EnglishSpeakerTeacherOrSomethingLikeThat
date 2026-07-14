"""API routes for audio operations."""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import app.main
from app.main import verify_auth_token

router = APIRouter()


class TranscribeRequest(BaseModel):
    audio_path: str = Field(..., alias="audioPath")
    model_size: str = Field(default="small.en", alias="modelSize")
    language: str = "en"
    include_word_timestamps: bool = Field(default=True, alias="includeWordTimestamps")
    
    model_config = ConfigDict(populate_by_name=True)


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: float


class TranscribeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    transcript: str
    confidence: float
    duration_seconds: float = Field(..., serialization_alias="durationSeconds")
    words: Optional[List[WordTimestamp]] = None
    detected_language: Optional[str] = Field(None, serialization_alias="detectedLanguage")


@router.post("/transcribe", dependencies=[Depends(verify_auth_token)])
async def transcribe_audio(request: TranscribeRequest):
    """Transcribe audio file to text."""
    transcription_service = app.main.transcription_service
    print(f"[API] Transcription endpoint called, service status: {transcription_service is not None}")
    
    if not transcription_service:
        print("[API] ERROR: Transcription service is None!")
        raise HTTPException(status_code=503, detail="Transcription service unavailable")

    try:
        print(f"[API] Transcription request received:")
        print(f"  - audio_path: {request.audio_path}")
        print(f"  - model_size: {request.model_size}")
        print(f"  - language: {request.language}")
        print(f"  - include_word_timestamps: {request.include_word_timestamps}")
        
        # Check if file exists
        from pathlib import Path
        if not Path(request.audio_path).exists():
            raise HTTPException(status_code=400, detail=f"Audio file not found: {request.audio_path}")
        
        file_size = Path(request.audio_path).stat().st_size
        print(f"  - file size: {file_size} bytes")
        
        result = await transcription_service.transcribe(
            audio_path=request.audio_path,
            model_size=request.model_size,
            language=request.language,
            include_word_timestamps=request.include_word_timestamps,
        )

        # Return camelCase response
        return {
            "transcript": result.transcript,
            "confidence": result.confidence,
            "durationSeconds": result.duration_seconds,
            "words": [
                {
                    "word": w.word,
                    "start": w.start,
                    "end": w.end,
                    "confidence": w.confidence
                } for w in result.words
            ] if result.words else None,
            "detectedLanguage": result.detected_language
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Transcription error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/analyze", dependencies=[Depends(verify_auth_token)])
async def analyze_audio(request: dict):
    audio_analyzer = app.main.audio_analyzer
    """Analyze audio for speech metrics."""
    if not audio_analyzer:
        raise HTTPException(status_code=503, detail="Audio analyzer unavailable")

    audio_path = request.get("audioPath") or request.get("audio_path")
    if not audio_path:
        raise HTTPException(status_code=400, detail="Missing audio_path")

    try:
        metrics = await audio_analyzer.analyze(audio_path)
        return metrics.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
