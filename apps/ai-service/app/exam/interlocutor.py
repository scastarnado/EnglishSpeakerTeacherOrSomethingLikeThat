"""Interlocutor agent - simulates the C1 examination interlocutor."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.llm.ollama_client import OllamaClient


class InterlocutorContext(BaseModel):
    """Context for interlocutor generation."""
    
    model_config = ConfigDict(populate_by_name=True)

    session_id: str = Field(..., alias="sessionId")
    mode: str
    exam_part: int = Field(..., alias="examPart")
    exam_state: str = Field(..., alias="examState")
    time_remaining_seconds: Optional[int] = Field(None, alias="timeRemainingSeconds")
    question_history: List[str] = Field(default_factory=list, alias="questionHistory")
    conversation_history: List[dict] = Field(default_factory=list, alias="conversationHistory")
    current_task: Optional[dict] = Field(None, alias="currentTask")
    allowed_actions: List[str] = Field(default_factory=list, alias="allowedActions")
    forbidden_actions: List[str] = Field(default_factory=list, alias="forbiddenActions")


class InterlocutorResponse(BaseModel):
    """Interlocutor response."""
    
    model_config = ConfigDict(populate_by_name=True)

    action: str
    spoken_text: str = Field(..., serialization_alias="spokenText")
    topic: Optional[str] = None
    question_type: Optional[str] = Field(None, serialization_alias="questionType")
    next_expected_speaker: str = Field(..., serialization_alias="nextExpectedSpeaker")
    should_start_timer: bool = Field(..., serialization_alias="shouldStartTimer")


class InterlocutorAgent:
    """Agent that acts as the C1 examination interlocutor."""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client

    async def respond(
        self, context: InterlocutorContext, model: str = "qwen2.5:7b-instruct"
    ) -> InterlocutorResponse:
        """Generate interlocutor response."""

        system_prompt = self._build_system_prompt(context)
        user_prompt = self._build_user_prompt(context)

        try:
            response = await self.ollama.generate_structured(
                prompt=user_prompt,
                model=model,
                schema=InterlocutorResponse,
                system=system_prompt,
                temperature=0.7,
            )
            return response
        except Exception as e:
            print(f"[Interlocutor] Error generating response: {e}")
            # Fallback response
            return InterlocutorResponse(
                action="ask_question",
                spoken_text="Could you tell me a bit more about that?",
                next_expected_speaker="user",
                should_start_timer=False,
            )

    def _build_system_prompt(self, context: InterlocutorContext) -> str:
        """Build system prompt defining the interlocutor role."""
        
        # Determine if this is training or exam mode
        is_training_mode = context.mode in ['intensive_correction', 'conversation']
        
        base_role = f"""You are an experienced C1 Advanced English speaking examination interlocutor.

Your role:
- Guide candidates through Part {context.exam_part} of the examination
- Ask clear, appropriate questions
- Keep a professional, neutral tone
- Give brief acknowledgements when appropriate
- Keep your responses concise and natural

Examination mode: {context.mode}
Current state: {context.exam_state}
"""

        if is_training_mode:
            training_instructions = """
TRAINING MODE ACTIVE:
As a training coach, you should:
- Provide immediate, constructive feedback after the candidate's responses
- Point out specific grammar, vocabulary, or pronunciation issues
- Suggest better ways to express ideas at C1 level
- Give brief tips and encouragement
- Still follow the exam format, but add helpful coaching between questions
- Use phrases like:
  * "Good answer. Just note that we say 'X' rather than 'Y'..."
  * "That's a solid response. To sound more natural, you could say..."
  * "Well done. For C1 level, try using more complex structures like..."
  * "Nice! One small point - the pronunciation of 'X' is..."
- Keep feedback brief (1-2 sentences) before moving to next question
- Balance encouragement with constructive criticism
"""
            role_section = base_role + training_instructions
        else:
            exam_instructions = """
OFFICIAL EXAMINATION MODE:
You are a Cambridge C1 Advanced official examiner:
- Do NOT correct language during the examination
- Do NOT provide feedback, tips, or evaluation during the test
- Do NOT praise or criticize answers
- Maintain strict neutrality and professionalism
- Only give brief acknowledgements ("Thank you", "Okay", "Right")
- Follow official Cambridge examination protocols exactly
- No coaching or teaching during the exam
"""
            role_section = base_role + exam_instructions

        return f"""{role_section}

Allowed actions: {', '.join(context.allowed_actions)}
Forbidden actions: {', '.join(context.forbidden_actions)}

Guidelines for Part {context.exam_part}:
{self._get_part_guidelines(context.exam_part)}

Remember:
- Be natural but professional
- One question at a time
- Brief acknowledgements only when needed
- Never say you're an AI or mention technical details
- Stay in character as an {'examiner-coach' if is_training_mode else 'official examiner'}"""

    def _build_user_prompt(self, context: InterlocutorContext) -> str:
        """Build user prompt with current context."""

        prompt_parts = []

        # Special handling for introduction
        if context.exam_state == "introduction":
            is_training = context.mode in ['intensive_correction', 'conversation']
            
            prompt_parts.append("This is the FIRST interaction with the candidate.")
            prompt_parts.append("\nYou must provide a brief introduction following this structure:")
            prompt_parts.append("1. Greet the candidate warmly")
            prompt_parts.append("2. Introduce yourself briefly (name optional)")
            prompt_parts.append("3. Explain what Part 1 is (personal interview)")
            prompt_parts.append("4. Mention the duration (approximately 3 minutes)")
            
            if is_training:
                prompt_parts.append("5. Mention this is a TRAINING session with feedback")
                prompt_parts.append("6. Ask the first question")
                prompt_parts.append("\nExample introduction for TRAINING mode:")
                prompt_parts.append('"Good morning. My name is [name]. Welcome to your C1 speaking practice session. In this part, I\'ll ask you some questions about yourself - your studies, work, interests, and so on. We have about 3 minutes for this part. Since this is a training session, I\'ll give you feedback and tips as we go along. So, let\'s begin. Tell me, what do you do - are you working or studying?"')
            else:
                prompt_parts.append("5. Ask the first question")
                prompt_parts.append("\nExample introduction for EXAM mode:")
                prompt_parts.append('"Good morning. My name is [name]. In this part of the test, I\'m going to ask you some questions about yourself and your life. We have about 3 minutes for this part. So, let\'s begin. Can you tell me what you do? Are you working or are you a student?"')
            
            prompt_parts.append("\nNow generate YOUR introduction and first question.")
            return "\n".join(prompt_parts)

        # Add conversation history
        if context.conversation_history:
            prompt_parts.append("Conversation so far:")
            for turn in context.conversation_history[-6:]:  # Last 6 turns
                speaker = turn.get("speaker", "unknown")
                text = turn.get("transcript", "")
                prompt_parts.append(f"{speaker}: {text}")
            prompt_parts.append("")

        # Add current situation
        prompt_parts.append(f"Current examination state: {context.exam_state}")

        if context.time_remaining_seconds:
            minutes = context.time_remaining_seconds // 60
            prompt_parts.append(f"Time remaining: {minutes} minutes")

        # Add task information if available
        if context.current_task:
            prompt_parts.append(f"\nCurrent task: {context.current_task.get('title')}")
            if context.current_task.get('instructions'):
                prompt_parts.append(f"Instructions: {context.current_task['instructions']}")

        # Add question history to avoid repetition
        if context.question_history:
            prompt_parts.append(f"\nRecent topics: {', '.join(context.question_history[-5:])}")

        prompt_parts.append("\nGenerate your next response as the interlocutor.")

        return "\n".join(prompt_parts)

    def _get_part_guidelines(self, part: int) -> str:
        """Get specific guidelines for each part."""

        guidelines = {
            0: """Introduction Phase:
- Greet the candidate warmly and professionally
- Introduce yourself (examiner name is optional)
- Briefly explain what Part 1 involves (personal interview questions)
- Mention the approximate duration (3 minutes)
- Transition smoothly into the first question
- Keep the introduction concise (about 20-30 seconds)
Example: "Good morning. My name is Sarah. In this part of the test, I'm going to ask you some questions about yourself. We have about 3 minutes for this part. So, let's begin..."
Then ask your first question immediately.""",
            1: """Part 1 - Interview (3 minutes):
- Ask personal and general questions
- Topics: studies, work, hometown, interests, future plans, technology, etc.
- One question at a time
- Brief follow-ups when appropriate
- Move between topics naturally
- Keep questions clear and direct""",
            2: """Part 2 - Long Turn (4 minutes):
- Present visual prompts (images)
- Ask candidate to compare and speculate
- Give 1 minute speaking time
- Minimal interruption during long turn
- Ask brief follow-up question to partner after each turn""",
            3: """Part 3 - Collaborative Task (4 minutes):
- Present discussion task with options
- Step back and let candidates interact
- Minimal intervention
- Only interrupt if candidates go off-track
- Guide toward decision at end""",
            4: """Part 4 - Discussion (5 minutes):
- Ask broader, abstract questions related to Part 3 topic
- Explore implications, causes, consequences
- Address both candidates
- Encourage justification and examples
- Can ask one candidate to respond to another's point""",
        }

        return guidelines.get(part, "Follow standard examination procedures.")
