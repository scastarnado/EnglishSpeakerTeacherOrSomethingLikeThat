"""Audio analysis for speech metrics."""

import numpy as np
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import librosa
import soundfile as sf


class VoiceSegment(BaseModel):
    """Voice activity segment."""

    start_time: float
    end_time: float
    confidence: float


class PauseMetrics(BaseModel):
    """Pause analysis metrics."""

    total_pauses: int
    long_pauses: int  # > 2 seconds
    average_pause_duration: float
    longest_pause_duration: float
    pause_locations: List[float]


class AudioMetrics(BaseModel):
    """Complete audio metrics."""

    total_duration_seconds: float
    speech_duration_seconds: float
    silence_duration_seconds: float
    speech_to_silence_ratio: float
    voice_segments: List[VoiceSegment]
    pause_metrics: PauseMetrics
    mean_pitch: Optional[float] = None
    pitch_range: Optional[float] = None


class AudioAnalyzer:
    """Analyzes audio for speaking metrics."""

    def __init__(self):
        self.vad_threshold = 0.5

    async def analyze(self, audio_path: str) -> AudioMetrics:
        """Analyze audio file for speaking metrics."""

        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000)
        duration = len(audio) / sr

        # Simple energy-based VAD
        frame_length = int(0.025 * sr)  # 25ms frames
        hop_length = int(0.010 * sr)  # 10ms hop

        # Calculate energy
        energy = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
        energy_threshold = np.mean(energy) * 0.5

        # Detect voice segments
        is_speech = energy > energy_threshold
        times = librosa.frames_to_time(range(len(is_speech)), sr=sr, hop_length=hop_length)

        # Find continuous segments
        voice_segments = []
        in_speech = False
        segment_start = 0

        for i, speaking in enumerate(is_speech):
            if speaking and not in_speech:
                segment_start = times[i]
                in_speech = True
            elif not speaking and in_speech:
                voice_segments.append(
                    VoiceSegment(
                        start_time=segment_start, end_time=times[i], confidence=0.8
                    )
                )
                in_speech = False

        # Calculate speech duration
        speech_duration = sum(seg.end_time - seg.start_time for seg in voice_segments)
        silence_duration = duration - speech_duration
        speech_ratio = speech_duration / duration if duration > 0 else 0

        # Detect pauses
        pauses = []
        for i in range(len(voice_segments) - 1):
            pause_start = voice_segments[i].end_time
            pause_end = voice_segments[i + 1].start_time
            pause_duration = pause_end - pause_start
            if pause_duration > 0.2:  # Ignore very short gaps
                pauses.append((pause_start, pause_duration))

        long_pauses = [p for p in pauses if p[1] > 2.0]

        pause_metrics = PauseMetrics(
            total_pauses=len(pauses),
            long_pauses=len(long_pauses),
            average_pause_duration=np.mean([p[1] for p in pauses]) if pauses else 0,
            longest_pause_duration=max([p[1] for p in pauses]) if pauses else 0,
            pause_locations=[p[0] for p in pauses],
        )

        # Basic pitch analysis
        try:
            pitches, magnitudes = librosa.piptrack(
                y=audio, sr=sr, fmin=75, fmax=400
            )
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)

            if pitch_values:
                mean_pitch = float(np.mean(pitch_values))
                pitch_range = float(np.max(pitch_values) - np.min(pitch_values))
            else:
                mean_pitch = None
                pitch_range = None
        except:
            mean_pitch = None
            pitch_range = None

        return AudioMetrics(
            total_duration_seconds=duration,
            speech_duration_seconds=speech_duration,
            silence_duration_seconds=silence_duration,
            speech_to_silence_ratio=speech_ratio,
            voice_segments=voice_segments,
            pause_metrics=pause_metrics,
            mean_pitch=mean_pitch,
            pitch_range=pitch_range,
        )
