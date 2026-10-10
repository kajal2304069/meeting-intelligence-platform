"""
DB layer for the dashboard/API: auth (companies + users), meetings, tasks,
employees, productivity. Multi-tenant by `company_id` — one shared Postgres
database, every row tagged with the company it belongs to, every query
filtered by the logged-in user's company (see backend/auth.py).

This does not modify or replace database/save_data.py; it's additive, so
your original pipeline save path keeps working as-is if you still use it
standalone.
"""
from __future__ import annotations
import os
import datetime as dt
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/meeting_ai")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), unique=True, nullable=False)
    # Users signing up with this email domain auto-join this company
    # (e.g. "microsoft.com"). Optional — an invite code also works.
    email_domain = Column(String(200), unique=True, nullable=True)
    invite_code = Column(String(32), unique=True, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="employee")  # "manager" | "employee"
    team = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    company = relationship("Company")


class Employee(Base):
    """Roster entry used for task auto-assignment matching. Kept separate
    from User so a company can list employees before they've signed up."""
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(200))
    team = Column(String(120))
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    __table_args__ = (UniqueConstraint("company_id", "name", name="uq_employee_company_name"),)


class Meeting(Base):
    __tablename__ = "meetings_index"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    external_ref = Column(String(255))  # source URL / file path, or uploaded recording path
    title = Column(String(500))
    date = Column(DateTime, default=dt.datetime.utcnow)
    language = Column(String(50), default="english")
    transcript = Column(Text)
    summary = Column(Text)
    key_decisions = Column(Text)
    open_questions = Column(Text)
    sentiment = Column(String(20))
    sentiment_confidence = Column(Float)
    duration_minutes = Column(Float, nullable=True)

    # Manager review workflow: AI output lands as "pending_review" until a
    # manager confirms it (editing title/tasks first if needed).
    review_status = Column(String(20), default="pending_review")  # pending_review | confirmed
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)

    tasks = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")


class MeetingParticipant(Base):
    """Who was invited/expected for a meeting, set BEFORE recording starts.
    Attendance narrows task auto-assignment to people who were actually there."""
    __tablename__ = "meeting_participants"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings_index.id"), nullable=False)
    employee_name = Column(String(200), nullable=False)
    attendance = Column(String(20), default="online")  # "online" | "offline" | "absent"

    meeting = relationship("Meeting", back_populates="participants")


class ActionItem(Base):
    __tablename__ = "action_items_index"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    meeting_id = Column(Integer, ForeignKey("meetings_index.id"))
    task = Column(Text, nullable=False)
    owner = Column(String(200))
    owner_is_predicted = Column(Boolean, default=False)
    deadline = Column(String(20))
    deadline_is_predicted = Column(Boolean, default=False)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="Pending")  # Pending | In Progress | Completed | Overdue
    completed_at = Column(String(20), nullable=True)
    reminder_sent = Column(Boolean, default=False)
    # Manager verification of this specific task (separate from the meeting's
    # overall review_status) — did the manager confirm owner+deadline are right.
    verified = Column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="tasks")


class ProductivitySnapshot(Base):
    __tablename__ = "productivity_snapshots"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_name = Column(String(200))
    score = Column(Float)
    completed = Column(Integer)
    total = Column(Integer)
    on_time_rate = Column(Float)
    computed_at = Column(DateTime, default=dt.datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
