from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from models import User
from security import hash_password, verify_password, create_access_token, decode_access_token, REMEMBER_TOKEN_EXPIRE_DAYS, ACCESS_TOKEN_EXPIRE_DAYS


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def authenticate_user(db: Session, email: str, password: str, remember_me: bool = False) -> dict:
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise AuthError("No account found with this email address", 401)

    if user.status != "active":
        raise AuthError("This account has been deactivated. Contact your administrator.", 403)

    if not user.password or not verify_password(password, user.password):
        raise AuthError("Incorrect password. Please try again.", 401)

    expires_delta = timedelta(days=REMEMBER_TOKEN_EXPIRE_DAYS) if remember_me else timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=expires_delta,
    )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_initials": user.avatar_initials or user.full_name.split()[0][0] + (user.full_name.split()[1][0] if len(user.full_name.split()) > 1 else ""),
        },
    }


def get_current_user(db: Session, token: str) -> Optional[User]:
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except (ValueError, TypeError):
        return None


def validate_session(db: Session, token: str) -> Optional[dict]:
    user = get_current_user(db, token)
    if not user:
        return None
    if user.status != "active":
        return None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "avatar_initials": user.avatar_initials or (user.full_name.split()[0][0] + (user.full_name.split()[1][0] if len(user.full_name.split()) > 1 else "")),
    }


def has_role(user: Optional[User], required_roles: list[str]) -> bool:
    if not user:
        return False
    return user.role in required_roles
