"""Text-to-speech service."""

import os
import hashlib
from pathlib import Path
from typing import Optional
import asyncio
import mutagen.mp3


class TTSService:
    """Text-to-speech synthesis service using Edge TTS."""

    def __init__(self, cache_dir: str = "./cache/tts"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Map friendly voice names to Edge TTS voice IDs
        self.voice_map = {
            "british_male": "en-GB-RyanNeural",
            "british_female": "en-GB-SoniaNeural",
            "american_male": "en-US-GuyNeural",
            "american_female": "en-US-JennyNeural",
        }

    async def synthesize(
        self,
        text: str,
        voice: str = "british_male",
        speed: float = 1.0,
        cache_key: Optional[str] = None,
    ) -> dict:
        """Synthesize speech from text using Edge TTS."""

        # Generate cache key
        if cache_key:
            file_key = cache_key
        else:
            content_hash = hashlib.md5(f"{text}_{voice}_{speed}".encode()).hexdigest()
            file_key = content_hash

        # Use MP3 format (Edge TTS native output, browsers support it)
        cache_path = self.cache_dir / f"{file_key}.mp3"

        # Check cache
        if cache_path.exists():
            duration = self._get_audio_duration(str(cache_path))
            return {
                "audio_path": str(cache_path.absolute()),
                "duration_seconds": duration,
                "from_cache": True,
            }

        # Synthesize using Edge TTS
        try:
            print(f"[TTS] Starting Edge TTS synthesis for text: '{text[:50]}...'")
            print(f"[TTS] Output path: {cache_path}")
            
            # Import edge_tts here to avoid issues if not installed
            import edge_tts
            
            # Get Edge TTS voice ID
            edge_voice = self.voice_map.get(voice, "en-GB-RyanNeural")
            print(f"[TTS] Using Edge voice: {edge_voice}, speed: {speed}")
            
            # Adjust rate for Edge TTS (format: +X% or -X%)
            rate_percent = int((speed - 1.0) * 50)  # Convert speed to percentage
            rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
            
            # Create communicate object and save directly to MP3
            communicate = edge_tts.Communicate(text, edge_voice, rate=rate_str)
            await communicate.save(str(cache_path))
            
            print(f"[TTS] Edge TTS synthesis complete")
            
            # Check if file was created
            if cache_path.exists():
                file_size = cache_path.stat().st_size
                print(f"[TTS] Audio file created: {cache_path} ({file_size} bytes)")
            else:
                print(f"[TTS] ERROR: Audio file was not created!")
                raise Exception("Audio file was not created")
            
        except Exception as e:
            print(f"[TTS] Error during synthesis: {e}")
            import traceback
            traceback.print_exc()
            raise

        duration = self._get_audio_duration(str(cache_path))

        return {
            "audio_path": str(cache_path.absolute()),
            "duration_seconds": duration,
            "from_cache": False,
        }

    def _get_audio_duration(self, file_path: str) -> float:
        """Get duration of MP3 file in seconds."""
        try:
            audio = mutagen.mp3.MP3(file_path)
            return float(audio.info.length)
        except Exception as e:
            print(f"[TTS] Error getting audio duration: {e}")
            # Estimate based on file size (rough approximation: 128kbps = ~16KB/sec)
            try:
                file_size = os.path.getsize(file_path)
                estimated_duration = file_size / 16000
                return max(1.0, estimated_duration)
            except:
                return 2.0

    def get_available_voices(self) -> list:
        """Get list of available voices."""
        return [
            {"id": "british_male", "name": "British Male (Ryan)", "language": "en-GB"},
            {"id": "british_female", "name": "British Female (Sonia)", "language": "en-GB"},
            {"id": "american_male", "name": "American Male (Guy)", "language": "en-US"},
            {"id": "american_female", "name": "American Female (Jenny)", "language": "en-US"},
        ]

    async def cleanup(self):
        """Cleanup resources."""
        self.executor.shutdown(wait=True)
