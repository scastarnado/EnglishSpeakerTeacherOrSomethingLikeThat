"""Assessment engine - generates evidence-based feedback."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
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
    """All criterion scores - Official C1 Advanced 5 criteria."""
    
    model_config = ConfigDict(populate_by_name=True)

    grammatical_resource: CriterionScore = Field(..., alias="grammaticalResource", serialization_alias="grammaticalResource")
    lexical_resource: CriterionScore = Field(..., alias="lexicalResource", serialization_alias="lexicalResource")
    discourse_management: CriterionScore = Field(..., alias="discourseManagement", serialization_alias="discourseManagement")
    pronunciation: CriterionScore
    interactive_communication: CriterionScore = Field(..., alias="interactiveCommunication", serialization_alias="interactiveCommunication")
    global_achievement: CriterionScore = Field(..., alias="globalAchievement", serialization_alias="globalAchievement")
    
    # Note: Global Achievement is calculated based on the other 4 criteria
    # It represents the overall effectiveness at C1 level


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

    id: str = Field(default_factory=lambda: str(uuid4()))
    session_id: Optional[str] = Field(None, alias="sessionId", serialization_alias="sessionId")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        alias="createdAt",
        serialization_alias="createdAt",
    )
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
            if not assessment.session_id:
                assessment.session_id = session_data.get("id") or session_data.get("sessionId")
            return assessment
        except Exception as e:
            print(f"[Assessment] Error generating assessment: {e}")
            # Return fallback assessment
            return self._create_fallback_assessment(turns, audio_metrics)

    def _build_assessor_system_prompt(self) -> str:
        """Build system prompt for assessor."""

        return """You are an experienced Cambridge C1 Advanced English speaking examiner trained in the official assessment criteria.

Your task:
- Assess speaking performance using the 5 official Cambridge criteria
- Provide evidence-based, specific feedback with transcript quotes
- Reference specific turn IDs for every claim
- Give constructive, actionable feedback
- Distinguish between observed issues and inferences

OFFICIAL C1 ADVANCED ASSESSMENT CRITERIA:

1. GRAMMAR AND VOCABULARY (Grammatical Resource + Lexical Resource)
   C1 Expectations:
   - Wide range of complex grammatical structures with control
   - Rich, precise vocabulary with sophisticated expressions
   - Idiomatic language and colloquialisms used appropriately
   - Minor errors don't impede communication
   
   Look for:
   - Complex sentence structures (conditionals, subjunctives, passive, reported speech)
   - Advanced tenses and aspects
   - Precise vocabulary choices
   - Collocations and phrasal verbs
   - Academic/formal register when appropriate

2. DISCOURSE MANAGEMENT
   C1 Expectations:
   - Extended, coherent discourse with logical development
   - Effective cohesive devices without overuse
   - Develops topics fully with relevant details
   - Natural topic transitions
   - Avoids one-word or very brief answers
   
   Look for:
   - Coherent paragraphing in extended responses
   - Linkers (however, moreover, on the other hand)
   - Reference words (this, that, such, those)
   - Ability to expand on ideas without prompting

3. PRONUNCIATION
   C1 Expectations:
   - Clear, intelligible speech
   - Appropriate word and sentence stress
   - Natural intonation for emphasis and meaning
   - Individual sounds mostly accurate
   - Pronunciation doesn't impede understanding
   
   Look for:
   - Stress patterns on multi-syllable words
   - Rising/falling intonation for questions/statements
   - Connected speech features
   - Clear articulation
   
   NOTE: Be conservative - only comment on clear patterns in transcript

4. INTERACTIVE COMMUNICATION
   C1 Expectations:
   - Initiates and maintains interaction naturally
   - Responds promptly and relevantly
   - Shows active listening
   - Uses communication strategies (clarification, paraphrasing)
   - Engaging and confident
   
   Look for:
   - Quick, relevant responses
   - Building on examiner's questions
   - Natural conversation flow
   - Handling unexpected questions

5. GLOBAL ACHIEVEMENT
   C1 Expectations:
   - Achieves communicative purposes effectively
   - Sustained C1-level performance throughout
   - Demonstrates overall proficiency
   - Confidence and fluency
   
   Overall assessment:
   - Can the candidate function effectively at C1 level?
   - Are communicative goals achieved?
   - Is performance consistent?

SCORING GUIDE (0-5 scale):
5.0 = C2 level (exceptional)
4.5-4.9 = Strong C1
4.0-4.4 = Solid C1
3.5-3.9 = C1 borderline / B2+
3.0-3.4 = B2 level
Below 3.0 = B1 or lower

IMPORTANT CONSTRAINTS:
- Every claim must cite turn_id and quote transcript excerpt
- For pronunciation, be conservative - transcripts have limitations
- Acknowledge confidence levels and limitations
- Never invent errors not in the transcript
- Prioritize the most impactful improvements
- Balance encouragement with honest assessment
- This is practice feedback, not official Cambridge scoring"""

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
        prompt_parts.append("="*80)
        prompt_parts.append("C1 ADVANCED SPEAKING PART 1 ASSESSMENT")
        prompt_parts.append("="*80)
        prompt_parts.append(f"Session mode: {session_data.get('mode', 'unknown')}")
        prompt_parts.append(f"Target level: {options.get('target_level', 'C1') if options else 'C1'}")
        prompt_parts.append(f"TRANSCRIPT - CANDIDATE RESPONSES ONLY:")
        prompt_parts.append("-" * 80)

        user_turns = [t for t in turns if t.get("speaker") == "user"]
        
        if not user_turns:
            prompt_parts.append("[No candidate responses recorded]")
        else:
            total_words = 0
            for i, turn in enumerate(user_turns):
                turn_id = turn.get("id", f"turn_{i}")
                transcript = turn.get("transcript", "")
                duration = turn.get("duration_seconds", 0)
                word_count = len(transcript.split())
                total_words += word_count

                prompt_parts.append(f"\n[{turn_id}] Duration: {duration:.1f}s | Words: {word_count}")
                prompt_parts.append(f"Candidate: {transcript}")
            
            prompt_parts.append(f"\n{'-' * 80}")
            prompt_parts.append(f"AUDIO METRICS:")
            if audio_metrics:
                prompt_parts.append(f"- Total speaking time: {audio_metrics.get('speech_duration_seconds', 0):.1f}s")
                prompt_parts.append(f"- Speech/silence ratio: {audio_metrics.get('speech_to_silence_ratio', 0):.2f}")
                prompt_parts.append(f"- Long pauses (>1s): {audio_metrics.get('pause_metrics', {}).get('long_pauses', 0)}")
            else:
                prompt_parts.append("- Audio metrics were not provided; assess fluency from transcripts and turn durations only.")
            prompt_parts.append("")

        # Instructions
        prompt_parts.append("ASSESSMENT TASK:")
        prompt_parts.append("="*80)
        prompt_parts.append("Provide a comprehensive C1 Advanced assessment following these requirements:")
        prompt_parts.append("")
        prompt_parts.append("1. SCORES (0-5 scale for each criterion):")
        prompt_parts.append("   - Grammar and Vocabulary (combined: Grammatical Resource + Lexical Resource)")
        prompt_parts.append("   - Discourse Management")
        prompt_parts.append("   - Pronunciation (be conservative)")
        prompt_parts.append("   - Interactive Communication")
        prompt_parts.append("   - Global Achievement (overall effectiveness)")
        prompt_parts.append("")
        prompt_parts.append("2. For EACH score, provide:")
        prompt_parts.append("   - Specific evidence with turn_id and exact quotes")
        prompt_parts.append("   - Clear summary of strengths/weaknesses")
        prompt_parts.append("   - Confidence level (0-1)")
        prompt_parts.append("   - Any limitations in assessment")
        prompt_parts.append("")
        prompt_parts.append("3. CORRECTIONS:")
        prompt_parts.append("   - List specific errors with:")
        prompt_parts.append("     * turn_id and original excerpt")
        prompt_parts.append("     * Corrected version")
        prompt_parts.append("     * Natural C1 alternative")
        prompt_parts.append("     * Category (grammar/vocabulary/discourse/pronunciation)")
        prompt_parts.append("     * Rule or explanation")
        prompt_parts.append("     * Severity (minor/moderate/major)")
        prompt_parts.append("")
        prompt_parts.append("4. STRENGTHS:")
        prompt_parts.append("   - Specific examples of C1-level language")
        prompt_parts.append("   - Turn_id references")
        prompt_parts.append("")
        prompt_parts.append("5. PRIORITY IMPROVEMENTS:")
        prompt_parts.append("   - Focus on 3-5 most impactful areas")
        prompt_parts.append("   - Actionable advice")
        prompt_parts.append("")
        prompt_parts.append("6. OVERALL ASSESSMENT:")
        prompt_parts.append("   - Estimated level (B2/C1_borderline/C1/C1_strong/C2)")
        prompt_parts.append("   - Summary (2-3 sentences)")
        prompt_parts.append("")
        prompt_parts.append("Remember: Be specific, evidence-based, and constructive!")
        prompt_parts.append("="*80)
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
            session_id=turns[0].get("sessionId") if turns else None,
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
