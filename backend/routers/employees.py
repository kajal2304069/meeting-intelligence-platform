from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db_models import get_session, Employee, User
from backend.auth import get_current_user, require_manager

router = APIRouter()


class EmployeeIn(BaseModel):
    name: str
    email: str | None = None
    team: str | None = None


@router.get("")
def list_employees(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    rows = db.query(Employee).filter(Employee.company_id == user.company_id).all()
    return [{"id": e.id, "name": e.name, "email": e.email, "team": e.team} for e in rows]


@router.post("")
def add_employee(body: EmployeeIn, user: User = Depends(require_manager), db: Session = Depends(get_session)):
    existing = db.query(Employee).filter(Employee.company_id == user.company_id, Employee.name == body.name).first()
    if existing:
        raise HTTPException(400, "Employee already exists")
    e = Employee(company_id=user.company_id, name=body.name, email=body.email, team=body.team)
    db.add(e)
    db.commit()
    return {"id": e.id, "name": e.name}
