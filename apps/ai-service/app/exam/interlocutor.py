"""Interlocutor agent - simulates the C1 examination interlocutor."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.llm.ollama_client import OllamaClient
from app.exam.question_bank import Part1QuestionBank


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
        self.question_bank = Part1QuestionBank()
        self.session_questions = {}  # Store questions per session

    async def respond(
        self, context: InterlocutorContext, model: str = "qwen2.5:7b-instruct"
    ) -> InterlocutorResponse:
        """Generate interlocutor response."""

        scripted_response = self._build_scripted_response(context)
        if scripted_response:
            return scripted_response

        system_prompt = self._build_system_prompt(context)
        user_prompt = self._build_user_prompt(context)

        try:
            response = await self.ollama.generate_structured(
                prompt=user_prompt,
                model=model,
                schema=InterlocutorResponse,
                system=system_prompt,
                temperature=0.2,
            )
            return response
        except Exception as e:
            print(f"[Interlocutor] Error generating response: {e}")
            return self._build_fallback_response(context)

    def _build_scripted_response(self, context: InterlocutorContext) -> Optional[InterlocutorResponse]:
        """Return a deterministic Cambridge-style interlocutor turn when possible."""

        if context.session_id not in self.session_questions:
            self.session_questions[context.session_id] = self.question_bank.select_questions_for_session(num_questions=8)

        if context.exam_state == "introduction":
            opening_question = self.question_bank.get_opening_question()
            return InterlocutorResponse(
                action="give_instructions",
                spoken_text=(
                    "Good morning. My name is Sarah and this is my colleague, Mark. "
                    "First, we'd like to know something about you. "
                    f"{opening_question}"
                ),
                topic="introduction",
                question_type="part1_opening",
                next_expected_speaker="user",
                should_start_timer=True,
            )

        if context.exam_part == 1:
            examiner_turns = [t for t in context.conversation_history if t.get("speaker") == "examiner"]
            question_index = max(0, len(examiner_turns) - 1)
            questions = self.session_questions.get(context.session_id, [])
            if question_index < len(questions):
                question = questions[question_index]
                return InterlocutorResponse(
                    action="ask_question",
                    spoken_text=f"Thank you. {question['question']}",
                    topic=question["topic"],
                    question_type="part1_interview",
                    next_expected_speaker="user",
                    should_start_timer=False,
                )
            return InterlocutorResponse(
                action="transition",
                spoken_text="Thank you.",
                topic="part1",
                question_type="part1_close",
                next_expected_speaker="user",
                should_start_timer=False,
            )

        if context.exam_part == 2:
            return self._build_part2_script(context)

        if context.exam_part == 3:
            return self._build_part3_script(context)

        if context.exam_part == 4:
            return self._build_part4_script(context)

        return None

    def _build_part2_script(self, context: InterlocutorContext) -> InterlocutorResponse:
        task = context.current_task or {}
        questions = task.get("questions") or []
        first_question = questions[0] if questions else "why the people might be doing these things"
        second_question = questions[1] if len(questions) > 1 else "how useful these activities might be in the future"
        follow_up = (task.get("followUpQuestions") or ["Which activity do you think would be more difficult?"])[0]

        if context.exam_state == "part2_follow_up":
            return InterlocutorResponse(
                action="ask_question",
                spoken_text=f"Thank you. {follow_up}",
                topic=task.get("title"),
                question_type="part2_follow_up",
                next_expected_speaker="user",
                should_start_timer=True,
            )

        return InterlocutorResponse(
            action="give_instructions",
            spoken_text=(
                "Now, in this part of the test, I'm going to give you three pictures. "
                "I'd like you to talk about two of them on your own for about a minute, "
                "and also to answer a question about your pictures. "
                f"I'd like you to compare two of the pictures and say {first_question} "
                f"and {second_question}. All right?"
            ),
            topic=task.get("title"),
            question_type="part2_long_turn",
            next_expected_speaker="user",
            should_start_timer=True,
        )

    def _build_part3_script(self, context: InterlocutorContext) -> InterlocutorResponse:
        task = context.current_task or {}
        options = [option.get("text") for option in task.get("discussionOptions", []) if option.get("text")]
        options_text = ", ".join(options)
        base_task = task.get("instructions") or "Talk together about these prompts."

        if context.exam_state == "part3_decision":
            return InterlocutorResponse(
                action="ask_question",
                spoken_text=(
                    "Thank you. Now you have about a minute to decide which two options "
                    "are the most important."
                ),
                topic=task.get("title"),
                question_type="part3_decision",
                next_expected_speaker="user",
                should_start_timer=True,
            )

        return InterlocutorResponse(
            action="give_instructions",
            spoken_text=(
                "Now, I'd like you to talk about something together for about two minutes. "
                f"{base_task} "
                f"Here are the things to talk about: {options_text}. "
                "Please talk to each other about all of these."
            ),
            topic=task.get("title"),
            question_type="part3_collaborative",
            next_expected_speaker="user",
            should_start_timer=True,
        )

    def _build_part4_script(self, context: InterlocutorContext) -> InterlocutorResponse:
        task = context.current_task or {}
        questions = task.get("questions") or []
        question = questions[0] if questions else "What do you think?"
        return InterlocutorResponse(
            action="ask_question",
            spoken_text=question,
            topic=task.get("title"),
            question_type="part4_discussion",
            next_expected_speaker="user",
            should_start_timer=True,
        )

    def _build_fallback_response(self, context: InterlocutorContext) -> InterlocutorResponse:
        """Fallback that still sounds like an interlocutor, not a coach."""

        if context.exam_part == 2:
            spoken_text = "Thank you. Now, please compare two of the pictures and answer the question above them."
        elif context.exam_part == 3:
            spoken_text = "Thank you. Now, please talk together about the prompts."
        elif context.exam_part == 4:
            spoken_text = "What do you think about that?"
        else:
            spoken_text = "Thank you. Could you tell me a little more about that?"

        return InterlocutorResponse(
            action="ask_question",
            spoken_text=spoken_text,
            next_expected_speaker="user",
            should_start_timer=False,
        )

    def _build_system_prompt(self, context: InterlocutorContext) -> str:
        """Build system prompt defining the interlocutor role."""
        
        # Determine if this is training or exam mode
        is_training_mode = context.mode in ['intensive_correction', 'conversation']
        
        base_role = f"""You are an experienced Cambridge C1 Advanced Speaking test interlocutor.

Your role:
- Guide candidates through Part {context.exam_part} of the examination
- Use short, procedural examiner language
- Keep a professional, neutral tone throughout
- Give brief acknowledgements only when moving to the next prompt
- Never teach, encourage, praise, correct, or assess during the spoken test

Examination mode: {context.mode}
Current state: {context.exam_state}
"""

        if is_training_mode:
            training_instructions = """
PRACTICE MODE ACTIVE:
Even in practice mode, your spoken interlocutor turns should sound like the real exam:
- Do NOT correct language during the speaking task
- Do NOT give mini-lessons, strategy tips, praise, or scores in the spoken turn
- Save teaching-style feedback for the assessment stage outside the test
- You may be slightly warmer than exam mode, but keep the script realistic
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
- Follow Cambridge C1 Advanced Speaking timings and task setup
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
- Never mention Cambridge as a trademark owner or claim this is an official exam
- Stay in character as a realistic speaking-test interlocutor"""

    def _build_user_prompt(self, context: InterlocutorContext) -> str:
        """Build user prompt with current context."""

        prompt_parts = []
        is_training = context.mode in ['intensive_correction', 'conversation']

        # Special handling for introduction
        if context.exam_state == "introduction":
            # Select questions for this session
            if context.session_id not in self.session_questions:
                self.session_questions[context.session_id] = self.question_bank.select_questions_for_session(num_questions=6)
            
            opening_question = self.question_bank.get_opening_question()
            
            prompt_parts.append("This is the FIRST interaction with the candidate.")
            prompt_parts.append("\nYou must provide the OFFICIAL C1 Advanced Part 1 introduction:")
            prompt_parts.append("1. Greet warmly: 'Good morning/afternoon'")
            prompt_parts.append("2. Introduce yourself: 'My name is [Sarah/John/etc]'")
            
            if is_training:
                prompt_parts.append("3. Explain: 'Welcome to your C1 speaking practice session. In this part, I'll ask you some questions about yourself - your studies, work, interests, and so on.'")
                prompt_parts.append("4. State duration: 'We have about 3 minutes for this part.'")
                prompt_parts.append("5. Mention training: 'Since this is a training session, I'll give you feedback and tips as we go along.'")
                prompt_parts.append("6. Transition: 'So, let's begin.'")
                prompt_parts.append(f"7. Ask EXACTLY this first question: '{opening_question}'")
            else:
                prompt_parts.append("3. Explain: 'In this part of the test, I'm going to ask you some questions about yourself.'")
                prompt_parts.append("4. State duration: 'We have about 3 minutes for this part.'")
                prompt_parts.append("5. Transition: 'So, let's begin.'")
                prompt_parts.append(f"6. Ask EXACTLY this first question: '{opening_question}'")
            
            prompt_parts.append("\nIMPORTANT: Follow this structure precisely. Keep it professional and clear.")
            return "\n".join(prompt_parts)

        if context.exam_part in [2, 3, 4]:
            prompt_parts.append(f"Current examination state: {context.exam_state}")
            prompt_parts.append(f"Mode: {'training/practice' if is_training else 'official exam simulation'}")
            prompt_parts.append("")

            if context.current_task:
                purpose = context.current_task.get("examinerPurpose")
                if purpose:
                    prompt_parts.append(f"Examiner purpose: {purpose}")
                prompt_parts.append(f"Task title: {context.current_task.get('title')}")
                prompt_parts.append(f"Task instructions: {context.current_task.get('instructions')}")
                questions = context.current_task.get("questions") or []
                if questions:
                    prompt_parts.append("Questions to use:")
                    for question in questions:
                        prompt_parts.append(f"- {question}")
                options = context.current_task.get("discussionOptions") or []
                if options:
                    prompt_parts.append("Options to present:")
                    for option in options:
                        prompt_parts.append(f"- {option.get('text')}")
                prompt_parts.append("")

            if context.conversation_history:
                prompt_parts.append("Recent conversation:")
                for turn in context.conversation_history[-8:]:
                    speaker = turn.get("speaker", "unknown")
                    text = turn.get("transcript", "")
                    prompt_parts.append(f"{speaker}: {text}")
                prompt_parts.append("")

            if context.exam_part == 2:
                prompt_parts.append("Generate one concise official Part 2 examiner turn.")
                prompt_parts.append("- For instructions, tell the candidate they have about one minute and must compare, speculate, and answer both prompts.")
                prompt_parts.append("- For follow-up, ask only one short follow-up question.")
            elif context.exam_part == 3:
                prompt_parts.append("Generate one concise official Part 3 examiner turn.")
                prompt_parts.append("- Present the collaborative task and options clearly.")
                prompt_parts.append("- Tell the candidates to talk together, then decide.")
                prompt_parts.append("- Do not take part in the discussion yourself.")
            else:
                prompt_parts.append("Generate one concise official Part 4 discussion question.")
                prompt_parts.append("- Ask the exact supplied question if one is provided.")
                prompt_parts.append("- Do not add feedback or corrections.")

            if is_training:
                prompt_parts.append("- In practice mode, keep the spoken prompt exam-like. Do not add coaching inside the interlocutor turn.")
            else:
                prompt_parts.append("- In exam mode, do not add coaching, feedback, praise, or corrections.")

            return "\n".join(prompt_parts)

        # Add conversation history
        if context.conversation_history:
            prompt_parts.append("Conversation so far:")
            for turn in context.conversation_history[-6:]:  # Last 6 turns
                speaker = turn.get("speaker", "unknown")
                text = turn.get("transcript", "")
                prompt_parts.append(f"{speaker}: {text}")
            prompt_parts.append("")
            
            # Determine question selection strategy
            user_turns = [t for t in context.conversation_history if t.get("speaker") == "user"]
            num_questions_asked = len([t for t in context.conversation_history if t.get("speaker") == "examiner"]) - 1  # Exclude intro
            
            # Get session questions
            session_questions = self.session_questions.get(context.session_id, [])
            
            if num_questions_asked < len(session_questions):
                next_q = session_questions[num_questions_asked]
                prompt_parts.append(f"Next prepared question from question bank:")
                prompt_parts.append(f"Topic: {next_q['topic']}")
                prompt_parts.append(f"Question: {next_q['question']}")
                prompt_parts.append(f"Possible follow-up: {next_q['followup']}")
                prompt_parts.append("")
                prompt_parts.append("Based on the candidate's previous response:")
                
                if is_training and user_turns:
                    prompt_parts.append("- Do not correct or coach the candidate in the spoken interlocutor turn")
                    prompt_parts.append(f"- Give brief acknowledgement: '{self.question_bank.get_acknowledgement()}'")
                else:
                    prompt_parts.append(f"- Give brief acknowledgement: '{self.question_bank.get_acknowledgement()}'")
                
                prompt_parts.append(f"- Ask the prepared question: '{next_q['question']}'")
                prompt_parts.append("")
            else:
                # Session should be ending
                prompt_parts.append("All prepared questions have been asked.")
                prompt_parts.append("You should wrap up Part 1 naturally.")
                if context.mode in ['intensive_correction', 'conversation']:
                    prompt_parts.append("Do not give feedback in the spoken test. Simply thank the candidate professionally.")
                else:
                    prompt_parts.append("Simply thank the candidate professionally.")

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
- Briefly move into personal interview questions
- Keep the opening short; Part 1 is about 2 minutes for a pair of candidates
- Transition smoothly into the first question
- Keep the introduction concise
Example: "Good morning. My name is Sarah and this is my colleague, Mark. First, we'd like to know something about you..."
Then ask your first question immediately.""",
            1: """Part 1 - Interview (about 2 minutes for a pair):
- Ask personal and general questions
- Topics: studies, work, hometown, interests, future plans, technology, etc.
- One question at a time
- Brief acknowledgements only
- Move between topics naturally
- Keep questions clear and direct""",
            2: """Part 2 - Long Turn (4 minutes):
- Present three visual prompts
- Ask the candidate to talk about two of them
- Give 1 minute uninterrupted speaking time
- Minimal interruption during long turn
- Ask brief follow-up question after the long turn""",
            3: """Part 3 - Collaborative Task (3 minutes for a pair):
- Present discussion task with options
- Step back and let candidates interact
- First phase: about 2 minutes discussing the prompts
- Second phase: about 1 minute reaching a decision
- Do not join the discussion yourself""",
            4: """Part 4 - Discussion (5 minutes):
- Ask broader, abstract questions related to Part 3 topic
- Explore implications, causes, consequences
- Address both candidates
- Encourage justification and examples
- Can ask one candidate to respond to another's point""",
        }

        return guidelines.get(part, "Follow standard examination procedures.")
