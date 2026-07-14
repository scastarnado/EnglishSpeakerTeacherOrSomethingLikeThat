"""API routes for examination interactions."""

from fastapi import APIRouter, HTTPException, Depends
import app.main
from app.main import verify_auth_token
from app.exam.interlocutor import InterlocutorContext, InterlocutorResponse
from app.exam.co_candidate import CoCandidateContext, CoCandidateResponse

router = APIRouter()


@router.post("/interlocutor/respond", dependencies=[Depends(verify_auth_token)])
async def interlocutor_respond(context: InterlocutorContext):
    """Generate interlocutor response."""
    interlocutor_agent = app.main.interlocutor_agent
    if not interlocutor_agent:
        raise HTTPException(status_code=503, detail="Interlocutor agent unavailable")

    try:
        # Get model from context or use default
        model = context.current_task.get("llm_model") if context.current_task else None
        if not model:
            model = "qwen2.5:7b-instruct"

        response = await interlocutor_agent.respond(context, model=model)
        
        # Return camelCase response
        return {
            "action": response.action,
            "spokenText": response.spoken_text,
            "topic": response.topic,
            "questionType": response.question_type,
            "nextExpectedSpeaker": response.next_expected_speaker,
            "shouldStartTimer": response.should_start_timer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interlocutor response failed: {str(e)}")


@router.post("/co-candidate/respond", dependencies=[Depends(verify_auth_token)])
async def co_candidate_respond(context: CoCandidateContext):
    """Generate co-candidate response."""
    co_candidate_agent = app.main.co_candidate_agent
    if not co_candidate_agent:
        raise HTTPException(status_code=503, detail="Co-candidate agent unavailable")

    try:
        response = await co_candidate_agent.respond(context)
        
        # Return camelCase response
        return {
            "spokenText": response.spoken_text,
            "interactionFunction": response.interaction_function,
            "mentionedOptions": response.mentioned_options,
            "shouldYieldTurn": response.should_yield_turn
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Co-candidate response failed: {str(e)}")
