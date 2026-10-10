"""
FastAPI backend for the AI Meeting Assistant dashboard.

Run with:  uvicorn backend.app:app --reload --port 8000
(run from the project root, one level above backend/)

This layer sits ON TOP of your existing, working pipeline
(core/, database/, utils/) — it imports run_pipeline from main.py to
process new recordings, and adds the new endpoints the dashboard needs:
search, voice search, task tracking, analytics, executive dashboard.
"""
from __future__ import annotations
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # project root

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db_models import init_db
from backend.routers import meetings, tasks, search, analytics, voice_search, employees, auth, chat

app = FastAPI(
    title="AI Meeting Assistant API",
    description="Backend for meeting transcription, summarization, task tracking, and analytics.",
    version="1.0.0",
)

# Add your deployed frontend's URL(s) here too, e.g.
# "https://your-frontend.onrender.com" — CORS blocks any origin not listed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://meeting-intelligence-platform-1.onrender.com", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        init_db()
        print("[app] DB tables ensured.")
    except Exception as e:
        print(f"[app] Could not init DB (check DATABASE_URL): {e}")


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(voice_search.router, prefix="/api/voice-search", tags=["voice-search"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(employees.router, prefix="/api/employees", tags=["employees"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
