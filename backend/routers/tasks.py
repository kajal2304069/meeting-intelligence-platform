from __future__ import annotations
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from backend.db_models import get_session, ActionItem, User
from backend.auth import get_current_user, require_manager
from backend.core_ext.email_service import send_email

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str  # Pending | In Progress | Completed | Overdue


class TaskEdit(BaseModel):
    """Manager corrections to what the AI assigned, used during verification."""
    owner: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None


def _scoped(db: Session, user: User, task_id: int) -> ActionItem:
    t = db.query(ActionItem).filter(ActionItem.id == task_id, ActionItem.company_id == user.company_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.get("")
def list_tasks(owner: Optional[str] = None, status: Optional[str] = None,
               user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    q = db.query(ActionItem).filter(ActionItem.company_id == user.company_id)
    if owner:
        q = q.filter(ActionItem.owner == owner)
    if status:
        q = q.filter(ActionItem.status == status)
    tasks = q.all()

    today = dt.date.today()
    out = []
    for t in tasks:
        status_val = t.status
        try:
            if status_val == "Pending" and t.deadline and dt.datetime.strptime(t.deadline, "%Y-%m-%d").date() < today:
                status_val = "Overdue"
        except Exception:
            pass
        out.append({
            "id": t.id, "meeting_id": t.meeting_id, "task": t.task, "owner": t.owner,
            "owner_is_predicted": t.owner_is_predicted, "deadline": t.deadline,
            "deadline_is_predicted": t.deadline_is_predicted, "priority": t.priority,
            "status": status_val, "verified": t.verified,
        })
    return out


@router.patch("/{task_id}/status")
def update_status(task_id: int, body: StatusUpdate, user: User = Depends(get_current_user),
                   db: Session = Depends(get_session)):
    """Employees use this to report how much of their task is actually
    done — Pending / In Progress / Completed — which feeds the productivity
    score (backend/core_ext/productivity_scorer.py)."""
    t = _scoped(db, user, task_id)
    t.status = body.status
    if body.status == "Completed":
        t.completed_at = dt.date.today().isoformat()
    db.commit()
    return {"id": t.id, "status": t.status}


@router.patch("/{task_id}")
def edit_task(task_id: int, body: TaskEdit, user: User = Depends(require_manager),
              db: Session = Depends(get_session)):
    """Manager correction of an AI-assigned owner/deadline/priority before verifying."""
    t = _scoped(db, user, task_id)
    if body.owner is not None:
        t.owner = body.owner
        t.owner_is_predicted = False
    if body.deadline is not None:
        t.deadline = body.deadline
        t.deadline_is_predicted = False
    if body.priority is not None:
        t.priority = body.priority
    db.commit()
    return {"id": t.id, "owner": t.owner, "deadline": t.deadline, "priority": t.priority}


@router.post("/{task_id}/verify")
def verify_task(task_id: int, user: User = Depends(require_manager), db: Session = Depends(get_session)):
    """Manager confirms this task's owner + deadline are correct."""
    t = _scoped(db, user, task_id)
    t.verified = True
    db.commit()
    return {"id": t.id, "verified": True}


@router.post("/{task_id}/remind")
def send_reminder(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    t = _scoped(db, user, task_id)
    t.reminder_sent = True
    db.commit()
    send_email(
        to=user.email,  # swap for the task owner's actual email once Employee records carry one reliably
        subject=f"Reminder: {t.task}",
        body=f"Task \"{t.task}\" is due {t.deadline}. Current status: {t.status}.",
    )
    return {"id": t.id, "reminder_sent": True}
