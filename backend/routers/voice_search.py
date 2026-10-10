from __future__ import annotations
import tempfile, os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db_models import get_session, Meeting, User
from backend.auth import get_current_user
from backend.core_ext.search_engine import search as ai_search

router = APIRouter()


def _transcribe_audio_query(tmp_path: str, language: str = "english") -> str:
    """Reuses your existing Whisper/Sarvam transcriber for the spoken query."""
    from core.transcriber import transcribe_all
    from utils.audio_processor import process_input
    chunks = process_input(tmp_path)
    return transcribe_all(chunks, language)


@router.post("")
async def voice_search(file: UploadFile = File(...), language: str = "english",
                        user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        query_text = _transcribe_audio_query(tmp_path, language)
    except Exception as e:
        raise HTTPException(500, f"Could not transcribe audio query: {e}")
    finally:
        os.unlink(tmp_path)

    meetings = db.query(Meeting).filter(Meeting.company_id == user.company_id).all()
    payload = [{
        "id": m.id, "title": m.title,
        "date": m.date.isoformat() if m.date else None,
        "transcript": m.transcript or "", "summary": m.summary or "",
    } for m in meetings]

    results = ai_search(query_text, payload)
    return {"heard": query_text, "results": results}
