"""
Company-wide AI assistant ("Mia"): a friendly chat that can answer from ALL of
the signed-in user's company meetings, tasks and summaries — and understand
an attached image (screenshot of a whiteboard, slide, chart, document...).

- Text: Mistral chat completions, with retrieved context from this
  company's meetings/tasks only (company_id filter -> no cross-company leaks).
- Images: sent to a vision-capable Mistral model as a base64 data URL.
  Model is configurable: MISTRAL_VISION_MODEL (default "mistral-small-latest",
  which accepts images). Set it to e.g. "pixtral-12b-latest" if you prefer.
"""
from __future__ import annotations
import os
import re
from typing import List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db_models import get_session, Meeting, ActionItem, User
from backend.auth import get_current_user

router = APIRouter()

CHAT_URL = "https://api.mistral.ai/v1/chat/completions"
TEXT_MODEL = os.getenv("MISTRAL_CHAT_MODEL", "mistral-small-latest")
VISION_MODEL = os.getenv("MISTRAL_VISION_MODEL", "mistral-small-latest")
MAX_IMAGE_CHARS = 6_000_000  # ~4.5MB of image after base64
STOP = set("""a an the is are was were be been of to in on at for from by with about and or but if then
what when who whom why how which did do does done we our us you your i my me they them their it its this that these
those there here can could should would will shall may might any some tell show give find meeting meetings""".split())

SYSTEM = (
    "You are Mia, a friendly, upbeat AI assistant inside a meeting-intelligence app used by managers and employees. "
    "Explain things simply and briefly (short paragraphs or a few bullets). "
    "For questions about meetings, tasks, decisions or deadlines, use ONLY the company context provided below; if the "
    "answer isn't there, say you don't see it in their meetings instead of guessing. "
    "When an image is attached, describe what you see and answer the user's question about it; you may relate it to the "
    "meeting context if it clearly matches. Never invent names, dates or numbers. Reply in the user's language."
)


class Turn(BaseModel):
    role: str  # "user" | "ai"
    text: str


class AssistantRequest(BaseModel):
    message: str = ""
    image: Optional[str] = None  # data URL: data:image/jpeg;base64,...
    history: List[Turn] = []
    meeting_id: Optional[int] = None  # optionally focus on one meeting


def _terms(q: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9ऀ-ॿ']+", (q or "").lower())
    return [w for w in words if w not in STOP and len(w) > 2][:8]


def _excerpt(text: str, terms: list[str], radius: int = 450) -> str:
    low = text.lower()
    for t in terms:
        i = low.find(t)
        if i != -1:
            s, e = max(0, i - radius), min(len(text), i + radius)
            return ("…" if s else "") + text[s:e].strip() + ("…" if e < len(text) else "")
    return text[: radius * 2].strip()


def _build_context(db: Session, user: User, message: str, meeting_id: Optional[int]) -> tuple[str, list[dict]]:
    q = db.query(Meeting).filter(Meeting.company_id == user.company_id)
    if meeting_id:
        q = q.filter(Meeting.id == meeting_id)
    meetings = q.order_by(Meeting.date.desc()).limit(60).all()
    terms = _terms(message)

    scored = []
    for m in meetings:
        hay = f"{m.title or ''} {m.summary or ''} {m.transcript or ''}".lower()
        score = sum(hay.count(t) for t in terms)
        scored.append((score, m))
    top = [m for s, m in sorted(scored, key=lambda x: x[0], reverse=True) if s > 0][:3]

    parts, sources = [], []
    parts.append("RECENT MEETINGS (newest first):")
    for m in meetings[:12]:
        d = m.date.strftime("%Y-%m-%d") if m.date else "?"
        parts.append(
            f"- [#{m.id}] {m.title} ({d}). Summary: {(m.summary or '')[:500]}"
            + (f" Decisions: {(m.key_decisions or '')[:300]}" if m.key_decisions else "")
            + (f" Open questions: {(m.open_questions or '')[:200]}" if m.open_questions else "")
        )
    if top:
        parts.append("\nMOST RELEVANT TRANSCRIPT EXCERPTS:")
        for m in top:
            parts.append(f"[#{m.id}] {m.title}: {_excerpt(m.transcript or m.summary or '', terms)}")
            sources.append({"meeting_id": m.id, "title": m.title})

    items_q = db.query(ActionItem).filter(ActionItem.company_id == user.company_id)
    if meeting_id:
        items_q = items_q.filter(ActionItem.meeting_id == meeting_id)
    items = items_q.limit(40).all()
    if items:
        parts.append("\nTASKS (task | owner | deadline | priority | status):")
        for t in items:
            parts.append(f"- {t.task[:140]} | {t.owner} | {t.deadline} | {t.priority} | {t.status} (meeting #{t.meeting_id})")

    parts.append(f"\nThe user is {user.name} ({user.role}).")
    return "\n".join(parts)[:14000], sources


@router.post("/chat")
def assistant_chat(body: AssistantRequest, user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    message = (body.message or "").strip()
    if not message and not body.image:
        raise HTTPException(400, "Send a message or an image.")
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        raise HTTPException(503, "The AI assistant isn't configured (MISTRAL_API_KEY is missing on the server).")
    if body.image:
        if not body.image.startswith("data:image/"):
            raise HTTPException(400, "Image must be a data URL (data:image/...;base64,...).")
        if len(body.image) > MAX_IMAGE_CHARS:
            raise HTTPException(413, "That image is too large — try a smaller one.")

    context, sources = _build_context(db, user, message, body.meeting_id)
    messages = [{"role": "system", "content": f"{SYSTEM}\n\n=== COMPANY CONTEXT ===\n{context}"}]
    for t in body.history[-8:]:
        messages.append({"role": "assistant" if t.role == "ai" else "user", "content": t.text[:1500]})

    if body.image:
        messages.append({"role": "user", "content": [
            {"type": "text", "text": message or "Please describe this image and tell me what's useful in it."},
            {"type": "image_url", "image_url": body.image},
        ]})
        model = VISION_MODEL
    else:
        messages.append({"role": "user", "content": message})
        model = TEXT_MODEL

    try:
        resp = requests.post(
            CHAT_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": 0.4, "max_tokens": 600},
            timeout=60,
        )
        resp.raise_for_status()
        answer = (resp.json()["choices"][0]["message"]["content"] or "").strip()
    except requests.HTTPError as e:
        detail = ""
        try:
            detail = e.response.text[:200]
        except Exception:
            pass
        raise HTTPException(502, f"AI service error ({e.response.status_code}). {detail}")
    except Exception as e:
        raise HTTPException(502, f"AI service unreachable: {type(e).__name__}")

    return {"answer": answer or "Hmm, I couldn't come up with an answer.", "sources": [] if body.image else sources}
