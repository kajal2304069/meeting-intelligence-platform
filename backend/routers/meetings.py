from __future__ import annotations
import os
import datetime as dt
import tempfile
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.db_models import get_session, Meeting, ActionItem, Employee, MeetingParticipant, User, SessionLocal
from backend.auth import get_current_user, require_manager
from backend.core_ext.sentiment_analyzer import analyze_sentiment
from backend.core_ext.deadline_predictor import predict_deadline
from backend.core_ext.task_assigner import auto_assign_all
from backend.core_ext.email_service import meeting_confirmed_email

router = APIRouter()


class ParticipantIn(BaseModel):
    employee_name: str
    attendance: str = "online"  # "online" | "offline"


class ProcessMeetingRequest(BaseModel):
    source: str  # YouTube URL, meeting recording URL, or local file path
    language: str = "english"
    participants: List[ParticipantIn] = []


def _run_real_pipeline(source: str, language: str) -> dict:
    """Uses YOUR existing, working pipeline from main.py."""
    from main import run_pipeline
    return run_pipeline(source, language)


def _process_and_store(source: str, language: str, company_id: int, user_id: Optional[int],
                        participants: List[ParticipantIn]):
    """Runs in a background task, so it opens its OWN db session rather than
    reusing the request-scoped one (which closes as soon as the request returns)."""
    db = SessionLocal()
    try:
        result = _run_real_pipeline(source, language)

        sentiment = analyze_sentiment(result["transcript"])

        # Narrow the auto-assignment roster to this meeting's actual
        # participants when given; otherwise fall back to the whole company roster.
        if participants:
            roster = [p.employee_name for p in participants if p.attendance != "absent"]
        else:
            roster = [e.name for e in db.query(Employee).filter(Employee.company_id == company_id).all()]

        action_items = auto_assign_all(result.get("action_items") or [], result["transcript"], roster)
        action_items = [predict_deadline(t) for t in action_items]

        meeting = Meeting(
            company_id=company_id,
            created_by=user_id,
            external_ref=source,
            title=result.get("title"),
            date=dt.datetime.utcnow(),
            language=language,
            transcript=result.get("transcript"),
            summary=result.get("summary"),
            key_decisions=str(result.get("key_decisions")),
            open_questions=str(result.get("open_questions")),
            sentiment=sentiment["sentiment"],
            sentiment_confidence=sentiment["confidence"],
            review_status="pending_review",
        )
        db.add(meeting)
        db.flush()  # get meeting.id

        for p in participants:
            db.add(MeetingParticipant(meeting_id=meeting.id, employee_name=p.employee_name, attendance=p.attendance))

        for t in action_items:
            db.add(ActionItem(
                company_id=company_id,
                meeting_id=meeting.id,
                task=t.get("task", ""),
                owner=t.get("owner"),
                owner_is_predicted=t.get("owner_is_predicted", False),
                deadline=str(t.get("deadline")),
                deadline_is_predicted=t.get("deadline_is_predicted", False),
                priority=t.get("priority", "medium"),
                status=t.get("status", "Pending"),
            ))
        db.commit()
    finally:
        db.close()


@router.post("/process")
def process_meeting(req: ProcessMeetingRequest, background_tasks: BackgroundTasks,
                     user: User = Depends(get_current_user)):
    """Kicks off the full pipeline (transcription -> summary -> tasks -> sentiment
    -> auto-assignment -> deadline prediction) and stores the result, scoped to
    the logged-in user's company. Runs in the background since transcription can
    take a while; poll GET /api/meetings to see it land as 'pending_review'."""
    try:
        background_tasks.add_task(_process_and_store, req.source, req.language, user.company_id, user.id, req.participants)
        return {"status": "processing", "message": "Meeting is being processed. It will appear as 'Pending Review' shortly."}
    except Exception as e:
        raise HTTPException(500, f"Failed to start processing: {e}")


@router.post("/upload-recording")
async def upload_recording(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form("english"),
    participants: str = Form("[]"),  # JSON string: [{"employee_name":"...","attendance":"online"}]
    user: User = Depends(get_current_user),
):
    """For in-browser recording: the frontend records the meeting with
    MediaRecorder and uploads the resulting audio/video file here when the
    meeting ends, instead of pasting a link."""
    import json
    try:
        parsed = [ParticipantIn(**p) for p in json.loads(participants)]
    except Exception:
        parsed = []

    suffix = os.path.splitext(file.filename or "recording.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    background_tasks.add_task(_process_and_store, tmp_path, language, user.company_id, user.id, parsed)
    return {"status": "processing", "message": "Recording uploaded and is being processed."}


@router.get("")
def list_meetings(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    meetings = (
        db.query(Meeting)
        .filter(Meeting.company_id == user.company_id)
        .order_by(Meeting.date.desc())
        .all()
    )
    return [{
        "id": m.id, "title": m.title, "date": m.date.isoformat() if m.date else None,
        "language": m.language, "sentiment": m.sentiment,
        "sentiment_confidence": m.sentiment_confidence,
        "summary": (m.summary or "")[:220],
        "task_count": len(m.tasks),
        "review_status": m.review_status,
    } for m in meetings]


@router.get("/{meeting_id}")
def get_meeting(meeting_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == user.company_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    return {
        "id": m.id, "title": m.title, "date": m.date.isoformat() if m.date else None,
        "language": m.language, "transcript": m.transcript, "summary": m.summary,
        "key_decisions": m.key_decisions, "open_questions": m.open_questions,
        "sentiment": m.sentiment, "sentiment_confidence": m.sentiment_confidence,
        "review_status": m.review_status,
        "participants": [{"employee_name": p.employee_name, "attendance": p.attendance} for p in m.participants],
        "tasks": [{
            "id": t.id, "task": t.task, "owner": t.owner,
            "owner_is_predicted": t.owner_is_predicted, "deadline": t.deadline,
            "deadline_is_predicted": t.deadline_is_predicted, "priority": t.priority,
            "status": t.status, "verified": t.verified,
        } for t in m.tasks],
    }


class ConfirmMeetingRequest(BaseModel):
    title: Optional[str] = None  # manager can correct the AI-generated title before confirming


@router.patch("/{meeting_id}/title")
def update_title(meeting_id: int, body: ConfirmMeetingRequest, user: User = Depends(require_manager),
                  db: Session = Depends(get_session)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == user.company_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if body.title:
        m.title = body.title
    db.commit()
    return {"id": m.id, "title": m.title}


@router.post("/{meeting_id}/confirm")
def confirm_meeting(meeting_id: int, body: ConfirmMeetingRequest, user: User = Depends(require_manager),
                     db: Session = Depends(get_session)):
    """Manager reviews the AI output (title, each task's owner/deadline —
    editing via PATCH endpoints first if needed), then confirms. This marks
    the meeting finalized and emails the manager a confirmation."""
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.company_id == user.company_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if body.title:
        m.title = body.title
    m.review_status = "confirmed"
    m.confirmed_by = user.id
    m.confirmed_at = dt.datetime.utcnow()
    db.commit()

    meeting_confirmed_email(user.email, m.title or "Untitled meeting", m.id, len(m.tasks))
    return {"id": m.id, "review_status": m.review_status, "title": m.title}
