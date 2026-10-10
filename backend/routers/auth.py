from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from backend.db_models import get_session, User, Company
from backend.auth import hash_password, verify_password, create_access_token, get_current_user, new_invite_code

router = APIRouter()


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    # Either join an existing company via invite code, or create a new one.
    invite_code: Optional[str] = None
    company_name: Optional[str] = None
    role: str = "employee"  # first user of a new company should sign up as "manager"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_session)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "An account with this email already exists")

    company: Optional[Company] = None

    if req.invite_code:
        company = db.query(Company).filter(Company.invite_code == req.invite_code.upper()).first()
        if not company:
            raise HTTPException(400, "Invalid invite code")
    else:
        # Try auto-join by email domain first (e.g. priya@microsoft.com -> Microsoft)
        domain = req.email.split("@")[-1].lower()
        company = db.query(Company).filter(Company.email_domain == domain).first()
        if not company:
            if not req.company_name:
                raise HTTPException(
                    400,
                    "No company found for this email domain. Provide an invite_code to join "
                    "an existing company, or company_name to create a new one.",
                )
            if db.query(Company).filter(Company.name == req.company_name).first():
                raise HTTPException(400, "A company with this name already exists — ask them for an invite code")
            company = Company(name=req.company_name, email_domain=domain, invite_code=new_invite_code())
            db.add(company)
            db.flush()

    user = User(
        company_id=company.id,
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role if req.role in ("manager", "employee") else "employee",
    )
    db.add(user)
    db.commit()

    token = create_access_token(user.id, company.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "company": {"id": company.id, "name": company.name, "invite_code": company.invite_code},
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_session)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    token = create_access_token(user.id, user.company_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "company": {"id": user.company.id, "name": user.company.name, "invite_code": user.company.invite_code},
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "company": {"id": user.company.id, "name": user.company.name, "invite_code": user.company.invite_code},
    }
