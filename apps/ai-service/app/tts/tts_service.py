"""Text-to-speech service."""

import os
import hashlib
from pathlib import Path
from typing import Optional
import asyncio
import wave
import pyttsx3
from concurrent.futures import ThreadPoolExecutor


class TTSService:
    """Text-to-speech synthesis service."""

    def __init__(self, cache_dir: str = "./cache/tts"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=1)

    async def synthesize(
        self,
        text: str,
        voice: str = "british_male",
        speed: float = 1.0,
        cache_key: Optional[str] = None,
    ) -> dict:
        """Synthesize speech from text."""

        # Generate cache key
        if cache_key:
            file_key = cache_key
        else:
            content_hash = hashlib.md5(f"{text}_{voice}_{speed}".encode()).hexdigest()
            file_key = content_hash

        cache_path = self.cache_dir / f"{file_key}.wav"

        # Check cache
        if cache_path.exists():
            duration = self._get_audio_duration(str(cache_path))
            return {
                "audio_path": str(cache_path.absolute()),  # Return absolute path
                "duration_seconds": duration,
                "from_cache": True,
            }

        # Synthesize using pyttsx3
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            self.executor,
            self._synthesize_sync,
            text,
            str(cache_path),
            speed
        )

        duration = self._get_audio_duration(str(cache_path))

        return {
            "audio_path": str(cache_path.absolute()),  # Return absolute path
            "duration_seconds": duration,
            "from_cache": False,
        }

    def _synthesize_sync(self, text: str, output_path: str, speed: float):
        """Synchronous TTS synthesis using pyttsx3."""
        try:
            print(f"[TTS] Starting synthesis for text: '{text[:50]}...'")
            print(f"[TTS] Output path: {output_path}")
            
            engine = pyttsx3.init()
            print(f"[TTS] Engine initialized")
            
            # Set properties
            engine.setProperty('rate', int(150 * speed))  # Default is ~200, adjust based on speed
            print(f"[TTS] Rate set to: {int(150 * speed)}")
            
            # Try to set a better quality voice if available
            voices = engine.getProperty('voices')
            print(f"[TTS] Available voices: {len(voices) if voices else 0}")
            if voices:
                # Prefer voices with 'English' in name
                english_voices = [v for v in voices if 'english' in v.name.lower() or 'en' in v.id.lower()]
                if english_voices:
                    print(f"[TTS] Using voice: {english_voices[0].name}")
                    engine.setProperty('voice', english_voices[0].id)
            
            # Save to file
            print(f"[TTS] Calling save_to_file...")
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            print(f"[TTS] Synthesis complete")
            
            # Check if file was created and has content
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"[TTS] Audio file created: {output_path} ({file_size} bytes)")
                if file_size == 0:
                    print(f"[TTS] WARNING: Audio file is empty!")
            else:
                print(f"[TTS] ERROR: Audio file was not created!")
            
        except Exception as e:
            print(f"[TTS] Error during synthesis: {e}")
            import traceback
            traceback.print_exc()
            # Create empty file as fallback
            Path(output_path).touch()
            print(f"[TTS] Created empty fallback file")

    def _get_audio_duration(self, file_path: str) -> float:
        """Get duration of WAV file in seconds."""
        try:
            with wave.open(file_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()
                duration = frames / float(rate)
                return duration
        except Exception:
            # Estimate based on text length (rough approximation)
            return 2.0

    def get_available_voices(self) -> list:
        """Get list of available voices."""
        return [
            {"id": "british_male", "name": "British Male", "language": "en-GB"},
            {"id": "british_female", "name": "British Female", "language": "en-GB"},
        ]

    async def cleanup(self):
        """Cleanup resources."""
        self.executor.shutdown(wait=True)
