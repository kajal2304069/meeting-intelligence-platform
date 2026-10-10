from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db_models import get_session, Meeting, User
from backend.auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


@router.post("/{meeting_id}")
def chat_with_meeting(meeting_id: int, body: ChatRequest, user: User = Depends(get_current_user),
                       db: Session = Depends(get_session)):
    """RAG chat scoped to ONE meeting's transcript — 'ask questions related
    to this meeting' from the Meeting Detail page. Reuses your existing
    core/rag_engine.py; the chain is rebuilt from the stored transcript per
    request since it isn't kept in memory between API calls."""
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == user.company_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if not m.transcript:
        raise HTTPException(400, "This meeting has no transcript yet")

    from core.rag_engine import build_rag_chain, ask_question
    rag_chain = build_rag_chain(m.transcript)
    answer = ask_question(rag_chain, body.question)
    return {"meeting_id": m.id, "question": body.question, "answer": answer}
