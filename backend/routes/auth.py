from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

from database import get_db
from models import User
from security import hash_password
from services.auth_service import authenticate_user, validate_session, AuthError

INVITATION_CODE = "RS-ADMIN-INVITE-2024"

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    avatar_initials: str


class StatusResponse(BaseModel):
    status: str
    message: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    department: str = ""
    password: str
    confirm_password: str
    account_type: str = "user"
    invitation_code: str = ""

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Full name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain a number")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("account_type")
    @classmethod
    def valid_role(cls, v):
        if v not in ("user", "support_engineer"):
            raise ValueError("Invalid account type. Allowed: user, support_engineer")
        return v


@router.post("/api/auth/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    role = req.account_type

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    initials = "".join(w[0].upper() for w in req.full_name.split() if w)[:2]

    user = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        department=req.department,
        role=role,
        status="active",
        password=hash_password(req.password),
        avatar_initials=initials,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Account created successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        result = authenticate_user(db, req.email, req.password, req.remember_me)
        return result
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    return {"status": "ok", "message": "Logged out successfully"}


@router.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1]
    user_data = validate_session(db, token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user_data


@router.get("/api/auth/validate")
def validate(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"valid": False, "reason": "no_token"}
    token = authorization.split(" ", 1)[1]
    user_data = validate_session(db, token)
    if not user_data:
        return {"valid": False, "reason": "expired_or_invalid"}
    return {"valid": True, "user": user_data}
