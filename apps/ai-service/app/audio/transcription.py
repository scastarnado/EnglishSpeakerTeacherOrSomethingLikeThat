"""Speech-to-text transcription using Whisper."""

import asyncio
from pathlib import Path
from typing import List, Optional, Dict
from pydantic import BaseModel
from faster_whisper import WhisperModel
import numpy as np


class WordTimestamp(BaseModel):
    """Word-level timestamp."""

    word: str
    start: float
    end: float
    confidence: float


class TranscriptionResult(BaseModel):
    """Transcription result."""

    transcript: str
    confidence: float
    duration_seconds: float
    words: Optional[List[WordTimestamp]] = None
    detected_language: Optional[str] = None


class TranscriptionService:
    """Service for transcribing audio using Whisper."""

    def __init__(self):
        self.models: Dict[str, WhisperModel] = {}
        self.lock = asyncio.Lock()

    async def transcribe(
        self,
        audio_path: str,
        model_size: str = "small.en",
        language: str = "en",
        include_word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe audio file."""

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._transcribe_sync,
            audio_path,
            model_size,
            language,
            include_word_timestamps,
        )
        return result

    def _transcribe_sync(
        self,
        audio_path: str,
        model_size: str,
        language: str,
        include_word_timestamps: bool,
    ) -> TranscriptionResult:
        """Synchronous transcription (run in executor)."""

        # Load model if not cached
        if model_size not in self.models:
            print(f"[Transcription] Loading Whisper model: {model_size}")
            # Determine device
            try:
                import torch

                device = "cuda" if torch.cuda.is_available() else "cpu"
            except:
                device = "cpu"

            self.models[model_size] = WhisperModel(
                model_size,
                device=device,
                compute_type="float16" if device == "cuda" else "int8",
            )
            print(f"[Transcription] Model loaded on {device}")

        model = self.models[model_size]

        def run_transcription(use_vad: bool):
            segments, info = model.transcribe(
                audio_path,
                language=language,
                word_timestamps=include_word_timestamps,
                vad_filter=use_vad,
                vad_parameters={
                    "threshold": 0.5,
                    "min_speech_duration_ms": 250,
                    "min_silence_duration_ms": 300,
                } if use_vad else None,
            )

            full_transcript = []
            words = []
            for segment in segments:
                full_transcript.append(segment.text)

                if include_word_timestamps and segment.words:
                    for word in segment.words:
                        words.append(
                            WordTimestamp(
                                word=word.word.strip(),
                                start=word.start,
                                end=word.end,
                                confidence=word.probability,
                            )
                        )
            return full_transcript, words, info

        try:
            full_transcript, words, info = run_transcription(use_vad=True)
        except Exception as exc:
            # A packaged build made without faster_whisper's ONNX package data
            # can still transcribe safely without VAD. The spec now includes
            # the asset, while this fallback keeps older/incomplete bundles usable.
            error_text = str(exc).lower()
            if "silero_vad" not in error_text or not any(
                marker in error_text for marker in ("no_suchfile", "doesn't exist", "not found")
            ):
                raise
            print("[Transcription] Silero VAD asset missing; retrying without VAD")
            full_transcript, words, info = run_transcription(use_vad=False)

        transcript_text = " ".join(full_transcript).strip()

        # Calculate average confidence
        if words:
            avg_confidence = sum(w.confidence for w in words) / len(words)
        else:
            avg_confidence = 0.9  # Default if no word-level data

        return TranscriptionResult(
            transcript=transcript_text,
            confidence=avg_confidence,
            duration_seconds=info.duration,
            words=words if words else None,
            detected_language=info.language,
        )

    async def cleanup(self):
        """Cleanup resources."""
        self.models.clear()
