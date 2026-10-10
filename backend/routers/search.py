from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db_models import get_session, Meeting, User
from backend.auth import get_current_user
from backend.core_ext.search_engine import search as ai_search

router = APIRouter()


@router.get("")
def search_meetings(q: str, user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Searches only this company's meetings — each company's transcripts
    are isolated from every other company's by the company_id filter."""
    meetings = db.query(Meeting).filter(Meeting.company_id == user.company_id).all()
    payload = [{
        "id": m.id, "title": m.title,
        "date": m.date.isoformat() if m.date else None,
        "transcript": m.transcript or "", "summary": m.summary or "",
    } for m in meetings]
    return ai_search(q, payload)
