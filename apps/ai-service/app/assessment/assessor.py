"""Assessment engine - generates evidence-based feedback."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.llm.ollama_client import OllamaClient


class CriterionScore(BaseModel):
    """Score for one assessment criterion."""
    
    model_config = ConfigDict(populate_by_name=True)

    score: float
    confidence: float
    summary: str
    evidence_turn_ids: List[str] = Field(default_factory=list, alias="evidenceTurnIds", serialization_alias="evidenceTurnIds")
    limitations: Optional[List[str]] = None


class AssessmentScores(BaseModel):
    """All criterion scores."""
    
    model_config = ConfigDict(populate_by_name=True)

    grammatical_resource: CriterionScore = Field(..., alias="grammaticalResource", serialization_alias="grammaticalResource")
    lexical_resource: CriterionScore = Field(..., alias="lexicalResource", serialization_alias="lexicalResource")
    discourse_management: CriterionScore = Field(..., alias="discourseManagement", serialization_alias="discourseManagement")
    pronunciation: CriterionScore
    interactive_communication: CriterionScore = Field(..., alias="interactiveCommunication", serialization_alias="interactiveCommunication")
    global_achievement: CriterionScore = Field(..., alias="globalAchievement", serialization_alias="globalAchievement")


class Correction(BaseModel):
    """Individual correction."""
    
    model_config = ConfigDict(populate_by_name=True)

    turn_id: str = Field(..., alias="turnId", serialization_alias="turnId")
    original_excerpt: str = Field(..., alias="originalExcerpt", serialization_alias="originalExcerpt")
    corrected_excerpt: str = Field(..., alias="correctedExcerpt", serialization_alias="correctedExcerpt")
    natural_c1_alternative: str = Field(..., alias="naturalC1Alternative", serialization_alias="naturalC1Alternative")
    category: str
    rule_or_explanation: str = Field(..., alias="ruleOrExplanation", serialization_alias="ruleOrExplanation")
    severity: str
    confidence: float


class FluencyMetrics(BaseModel):
    """Fluency metrics."""
    
    model_config = ConfigDict(populate_by_name=True)

    words_per_minute: float = Field(..., alias="wordsPerMinute", serialization_alias="wordsPerMinute")
    silence_ratio: float = Field(..., alias="silenceRatio", serialization_alias="silenceRatio")
    long_pause_count: int = Field(..., alias="longPauseCount", serialization_alias="longPauseCount")
    filler_count: int = Field(..., alias="fillerCount", serialization_alias="fillerCount")
    repetition_count: int = Field(..., alias="repetitionCount", serialization_alias="repetitionCount")
    self_correction_count: int = Field(..., alias="selfCorrectionCount", serialization_alias="selfCorrectionCount")
    interpretation: str


class Assessment(BaseModel):
    """Complete assessment."""
    
    model_config = ConfigDict(populate_by_name=True)

    assessment_version: str = Field("1.0", alias="assessmentVersion", serialization_alias="assessmentVersion")
    estimated_overall_level: str = Field(..., alias="estimatedOverallLevel", serialization_alias="estimatedOverallLevel")
    overall_summary: str = Field(..., alias="overallSummary", serialization_alias="overallSummary")
    scores: AssessmentScores
    strengths: List[Dict[str, Any]]
    corrections: List[Correction]
    fluency: FluencyMetrics
    priority_improvements: List[Dict[str, Any]] = Field(default_factory=list, alias="priorityImprovements", serialization_alias="priorityImprovements")
    assessment_limitations: List[str] = Field(default_factory=list, alias="assessmentLimitations", serialization_alias="assessmentLimitations")


class AssessmentEngine:
    """Engine for generating evidence-based assessments."""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client

    async def assess_session(
        self,
        session_data: Dict[str, Any],
        turns: List[Dict[str, Any]],
        audio_metrics: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None,
        model: str = "qwen2.5:7b-instruct",
    ) -> Assessment:
        """Generate complete assessment."""

        # Build context
        system_prompt = self._build_assessor_system_prompt()
        user_prompt = self._build_assessment_prompt(session_data, turns, audio_metrics, options)

        try:
            assessment = await self.ollama.generate_structured(
                prompt=user_prompt,
                model=model,
                schema=Assessment,
                system=system_prompt,
                temperature=0.3,  # Lower temperature for more consistent assessment
                max_retries=3,
            )
            return assessment
        except Exception as e:
            print(f"[Assessment] Error generating assessment: {e}")
            # Return fallback assessment
            return self._create_fallback_assessment(turns, audio_metrics)

    def _build_assessor_system_prompt(self) -> str:
        """Build system prompt for assessor."""

        return """You are an experienced C1 Advanced English speaking examiner.

Your task:
- Assess the candidate's speaking performance
- Provide evidence-based feedback
- Quote specific examples from the transcript
- Give honest, constructive feedback
- Distinguish between observed issues and inferred ones

Assessment criteria:
1. Grammatical Resource: Range and accuracy of grammar
2. Lexical Resource: Range and precision of vocabulary
3. Discourse Management: Coherence, cohesion, organization
4. Pronunciation: Intelligibility, stress, intonation, individual sounds
5. Interactive Communication: Initiating, responding, turn-taking
6. Global Achievement: Overall C1 proficiency

Important constraints:
- Every important claim must cite evidence from the transcript
- Use turn IDs when referencing specific moments
- For pronunciation, be conservative - only comment on clear patterns
- Acknowledge when confidence is low
- Never invent errors that aren't in the transcript
- Distinguish between errors and less natural but acceptable language

Remember:
- This is practice assessment, not official Cambridge scoring
- Provide actionable, specific feedback
- Prioritize the most impactful improvements
- Be encouraging while being honest"""

    def _build_assessment_prompt(
        self,
        session_data: Dict[str, Any],
        turns: List[Dict[str, Any]],
        audio_metrics: Optional[Dict[str, Any]],
        options: Optional[Dict[str, Any]],
    ) -> str:
        """Build detailed assessment prompt."""

        prompt_parts = []

        # Session context
        prompt_parts.append(f"Session mode: {session_data.get('mode', 'unknown')}")
        prompt_parts.append(f"Target level: {options.get('target_level', 'C1') if options else 'C1'}")
        prompt_parts.append("")

        # Transcript
        prompt_parts.append("Complete transcript:")
        prompt_parts.append("-" * 60)

        user_turns = [t for t in turns if t.get("speaker") == "user"]

        for i, turn in enumerate(user_turns):
            turn_id = turn.get("id", f"turn_{i}")
            transcript = turn.get("transcript", "")
            duration = turn.get("duration_seconds", 0)

            prompt_parts.append(f"[{turn_id}] ({duration:.1f}s)")
            prompt_parts.append(transcript)
            prompt_parts.append("")

        # Audio metrics if available
        if audio_metrics:
            prompt_parts.append("Audio metrics:")
            prompt_parts.append(f"- Total speaking time: {audio_metrics.get('speech_duration_seconds', 0):.1f}s")
            prompt_parts.append(f"- Speech/silence ratio: {audio_metrics.get('speech_to_silence_ratio', 0):.2f}")
            prompt_parts.append(f"- Long pauses: {audio_metrics.get('pause_metrics', {}).get('long_pauses', 0)}")
            prompt_parts.append("")

        # Instructions
        correction_level = options.get("correction_level", "balanced") if options else "balanced"
        prompt_parts.append(f"Correction level: {correction_level}")
        prompt_parts.append("")
        prompt_parts.append("Provide a complete, evidence-based assessment following the required JSON schema.")

        return "\n".join(prompt_parts)

    def _create_fallback_assessment(
        self, turns: List[Dict[str, Any]], audio_metrics: Optional[Dict[str, Any]]
    ) -> Assessment:
        """Create a basic fallback assessment if AI generation fails."""

        user_turns = [t for t in turns if t.get("speaker") == "user"]
        total_words = sum(len(t.get("transcript", "").split()) for t in user_turns)
        total_duration = sum(t.get("duration_seconds", 0) for t in user_turns)

        wpm = (total_words / total_duration * 60) if total_duration > 0 else 0

        # Create basic scores
        basic_score = CriterionScore(
            score=3.0,
            confidence=0.3,
            summary="Assessment generation failed. Manual review recommended.",
            evidence_turn_ids=[],
            limitations=["Automated assessment unavailable"],
        )

        return Assessment(
            estimated_overall_level="C1_borderline",
            overall_summary="Technical issue during assessment. Please review the transcript manually or retry assessment.",
            scores=AssessmentScores(
                grammatical_resource=basic_score,
                lexical_resource=basic_score,
                discourse_management=basic_score,
                pronunciation=basic_score,
                interactive_communication=basic_score,
                global_achievement=basic_score,
            ),
            strengths=[],
            corrections=[],
            fluency=FluencyMetrics(
                words_per_minute=wpm,
                silence_ratio=0.0,
                long_pause_count=0,
                filler_count=0,
                repetition_count=0,
                self_correction_count=0,
                interpretation="Metrics unavailable due to processing error.",
            ),
            priority_improvements=[],
            assessment_limitations=[
                "Automated assessment failed",
                "Manual review strongly recommended",
                "Retry assessment after checking system health",
            ],
        )
