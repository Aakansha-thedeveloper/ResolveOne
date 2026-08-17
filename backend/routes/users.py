import traceback
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from database import get_db
from models import User, Ticket, ActivityLog
from schemas import UserCreate, UserUpdate

router = APIRouter()


def _user_to_response(u: User, db: Session = None) -> dict:
    ticket_counts = None
    if db:
        total = db.query(func.count(Ticket.id)).filter(
            Ticket.reporter == u.full_name
        ).scalar() or 0
        open_count = db.query(func.count(Ticket.id)).filter(
            Ticket.reporter == u.full_name,
            Ticket.status.in_(["Open", "In Progress", "Pending"]),
        ).scalar() or 0
        resolved_count = db.query(func.count(Ticket.id)).filter(
            Ticket.reporter == u.full_name, Ticket.status == "Resolved"
        ).scalar() or 0
        ticket_counts = {"total": total, "open": open_count, "resolved": resolved_count}
    last_login_str = u.last_login.isoformat() if u.last_login else None
    created_str = u.created_at.isoformat() if u.created_at else ""
    initials = u.avatar_initials or ""
    if not initials and u.full_name:
        parts = u.full_name.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2])
    return {
        "id": u.id,
        "name": u.full_name,
        "email": u.email,
        "phone": u.phone or "",
        "department": u.department or "",
        "role": u.role or "user",
        "avatar": u.avatar or "",
        "status": u.status or "active",
        "last_login": last_login_str,
        "avatar_initials": initials,
        "created_at": created_str,
        "ticket_counts": ticket_counts,
    }


def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── GET /api/users ─────────────────────────────────────────────────
@router.get("/api/users")
def list_users(
    search: Optional[str] = Query(""),
    role: Optional[str] = Query(""),
    status: Optional[str] = Query(""),
    department: Optional[str] = Query(""),
    db: Session = Depends(get_db),
):
    try:
        q = db.query(User)
        if search:
            like = f"%{search}%"
            q = q.filter(
                User.full_name.ilike(like)
                | User.email.ilike(like)
                | User.phone.ilike(like)
            )
        if role:
            q = q.filter(User.role == role)
        if status:
            q = q.filter(User.status == status)
        if department:
            q = q.filter(User.department.ilike(f"%{department}%"))
        users = q.order_by(User.id).all()
        return [_user_to_response(u, db) for u in users]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── POST /api/users ────────────────────────────────────────────────
@router.post("/api/users", status_code=status.HTTP_201_CREATED)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        if not req.name or not req.name.strip():
            raise HTTPException(status_code=400, detail="Name is required")
        if not req.email or not req.email.strip():
            raise HTTPException(status_code=400, detail="Email is required")
        if "@" not in req.email:
            raise HTTPException(status_code=400, detail="Invalid email format")

        existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
        if existing:
            raise HTTPException(status_code=409, detail="A user with this email already exists")

        parts = req.name.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2])

        user = User(
            full_name=req.name.strip(),
            email=req.email.strip().lower(),
            phone=req.phone or "",
            department=req.department or "",
            role=req.role or "user",
            status=req.status or "active",
            password=req.temporary_password or req.password or "",
            avatar_initials=initials,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        result = _user_to_response(user, db)
        return {"success": True, "message": "User created", "user": result}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


# ─── GET /api/users/{user_id} ───────────────────────────────────────
@router.get("/api/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    try:
        user = _get_user_or_404(user_id, db)
        return _user_to_response(user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── PUT /api/users/{user_id} ───────────────────────────────────────
@router.put("/api/users/{user_id}")
def update_user(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
):
    try:
        user = _get_user_or_404(user_id, db)
        if req.name is not None:
            user.full_name = req.name.strip()
        if req.email is not None:
            user.email = req.email.strip().lower()
        if req.phone is not None:
            user.phone = req.phone
        if req.department is not None:
            user.department = req.department
        if req.role is not None:
            user.role = req.role
        if req.status is not None:
            user.status = req.status
        tmp_pw = req.temporary_password if req.temporary_password is not None else req.password
        if tmp_pw is not None:
            user.password = tmp_pw
        db.commit()
        db.refresh(user)
        result = _user_to_response(user, db)
        return {"success": True, "message": "User updated", "user": result}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


# ─── DELETE /api/users/{user_id} ────────────────────────────────────
@router.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    try:
        user = _get_user_or_404(user_id, db)
        db.delete(user)
        db.commit()
        return {"success": True, "message": "User deleted"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


# ─── GET /api/users/{user_id}/activity ──────────────────────────────
@router.get("/api/users/{user_id}/activity")
def get_user_activity(
    user_id: int,
    db: Session = Depends(get_db),
):
    try:
        user = _get_user_or_404(user_id, db)
        activities = (
            db.query(ActivityLog)
            .filter(ActivityLog.actor == user.full_name)
            .order_by(ActivityLog.timestamp.desc())
            .limit(50)
            .all()
        )
        return [
            {
                "action": a.action,
                "detail": a.detail or "",
                "actor": a.actor or "",
                "timestamp": a.timestamp.isoformat() if a.timestamp else "",
            }
            for a in activities
        ]
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── GET /api/user (profile support) ──────────────────────────────
@router.get("/api/user")
def get_current_user(db: Session = Depends(get_db)):
    try:
        user = db.query(User).order_by(User.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="No user found")
        return _user_to_response(user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── PUT /api/user (profile support) ─────────────────────────────
@router.put("/api/user")
def update_current_user(req: UserUpdate, db: Session = Depends(get_db)):
    try:
        user = db.query(User).order_by(User.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="No user found")
        if req.name is not None:
            user.full_name = req.name.strip()
        if req.email is not None:
            user.email = req.email.strip().lower()
        if req.phone is not None:
            user.phone = req.phone
        if req.department is not None:
            user.department = req.department
        if req.role is not None:
            user.role = req.role
        if req.status is not None:
            user.status = req.status
        db.commit()
        db.refresh(user)
        result = _user_to_response(user, db)
        return {"success": True, "message": "Profile updated", "user": result}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
