"""API routes for assessment generation."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import app.main
from app.main import verify_auth_token
from app.assessment.assessor import Assessment

router = APIRouter()


class AssessmentRequest(BaseModel):
    """Request for assessment generation."""

    session_id: str
    session: Dict[str, Any]
    turns: List[Dict[str, Any]]
    audio_metrics: Optional[Dict[str, Any]] = None
    previous_mistakes: Optional[List[Any]] = None
    options: Optional[Dict[str, Any]] = None


@router.post("/generate", response_model=Assessment, response_model_by_alias=True, dependencies=[Depends(verify_auth_token)])
async def generate_assessment(request: AssessmentRequest):
    """Generate complete assessment for a session."""
    assessment_engine = app.main.assessment_engine
    if not assessment_engine:
        raise HTTPException(status_code=503, detail="Assessment engine unavailable")

    try:
        # Use model from options or default
        model = request.options.get("llm_model") if request.options else None
        if not model:
            model = "qwen2.5:7b-instruct"

        assessment = await assessment_engine.assess_session(
            session_data=request.session,
            turns=request.turns,
            audio_metrics=request.audio_metrics,
            options=request.options,
            model=model,
        )

        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment generation failed: {str(e)}")
