"""Co-candidate agent - simulates a peer candidate."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.llm.ollama_client import OllamaClient


class CoCandidateProfile(BaseModel):
    """Co-candidate personality profile."""
    
    model_config = ConfigDict(populate_by_name=True)

    name: str = "Alex"
    estimated_level: str = Field("C1", alias="estimatedLevel", serialization_alias="estimatedLevel")
    confidence: str = "medium"
    talkativeness: str = "balanced"
    disagreement_frequency: str = Field("medium", alias="disagreementFrequency", serialization_alias="disagreementFrequency")
    speaking_style: str = Field("reflective", alias="speakingStyle", serialization_alias="speakingStyle")


class CoCandidateContext(BaseModel):
    """Context for co-candidate generation."""
    
    model_config = ConfigDict(populate_by_name=True)

    session_id: str = Field(..., alias="sessionId")
    exam_part: int = Field(..., alias="examPart")
    exam_state: str = Field(..., alias="examState")
    conversation_history: List[dict] = Field(default_factory=list, alias="conversationHistory")
    current_task: Optional[dict] = Field(None, alias="currentTask")
    profile: CoCandidateProfile
    discussion_options: Optional[List[dict]] = Field(None, alias="discussionOptions")


class CoCandidateResponse(BaseModel):
    """Co-candidate response."""
    
    model_config = ConfigDict(populate_by_name=True)

    spoken_text: str = Field(..., serialization_alias="spokenText")
    interaction_function: str = Field(..., serialization_alias="interactionFunction")
    mentioned_options: Optional[List[str]] = Field(None, serialization_alias="mentionedOptions")
    should_yield_turn: bool = Field(..., serialization_alias="shouldYieldTurn")


class CoCandidateAgent:
    """Agent that simulates a peer candidate."""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client

    async def respond(
        self, context: CoCandidateContext, model: str = "qwen2.5:7b-instruct"
    ) -> CoCandidateResponse:
        """Generate co-candidate response."""

        system_prompt = self._build_system_prompt(context)
        user_prompt = self._build_user_prompt(context)

        try:
            response = await self.ollama.generate_structured(
                prompt=user_prompt,
                model=model,
                schema=CoCandidateResponse,
                system=system_prompt,
                temperature=0.8,
            )
            return response
        except Exception as e:
            print(f"[CoCandidate] Error generating response: {e}")
            # Fallback
            return CoCandidateResponse(
                spoken_text="I think that's a good point. What do you think about the other options?",
                interaction_function="invite_opinion",
                should_yield_turn=True,
            )

    def _build_system_prompt(self, context: CoCandidateContext) -> str:
        """Build system prompt."""

        profile = context.profile

        return f"""You are {profile.name}, a candidate taking the C1 Advanced speaking examination alongside another candidate.

Your characteristics:
- English level: {profile.estimated_level}
- Confidence: {profile.confidence}
- Speaking style: {profile.speaking_style}
- Talkativeness: {profile.talkativeness}

Your role in Part {context.exam_part}:
- Participate naturally in the discussion
- Listen and respond to the other candidate's ideas
- Share your own thoughts
- Agree and disagree appropriately (disagreement frequency: {profile.disagreement_frequency})
- Help move the conversation forward
- Invite the other candidate's opinion
- Use natural C1-level English

Important:
- Do not dominate the conversation
- Do not agree with everything
- Show you're listening by building on ideas
- Keep responses conversational, not speeches
- Occasionally show natural hesitation
- Never correct the other candidate's language
- Stay focused on the task"""

    def _build_user_prompt(self, context: CoCandidateContext) -> str:
        """Build user prompt."""

        prompt_parts = []

        # Current task
        if context.current_task:
            prompt_parts.append(f"Discussion task: {context.current_task.get('title')}")
            if context.discussion_options:
                prompt_parts.append("Options to discuss:")
                for opt in context.discussion_options:
                    prompt_parts.append(f"- {opt.get('text')}")
            prompt_parts.append("")

        # Conversation history
        if context.conversation_history:
            prompt_parts.append("Conversation so far:")
            for turn in context.conversation_history[-6:]:
                speaker = turn.get("speaker", "unknown")
                text = turn.get("transcript", "")
                prompt_parts.append(f"{speaker}: {text}")
            prompt_parts.append("")

        prompt_parts.append("Respond naturally as a co-candidate.")

        return "\n".join(prompt_parts)
