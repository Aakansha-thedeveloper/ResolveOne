from pydantic import BaseModel
from typing import Optional, Any


class TicketCreate(BaseModel):
    id: Optional[str] = None
    issue: str
    category: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "Open"
    ai_diagnosis: Optional[str] = None
    aiDiagnosis: Optional[str] = None
    possible_cause: Optional[str] = None
    assigned_team: Optional[str] = None
    assignedTeam: Optional[str] = None
    assigned_engineer: Optional[str] = None
    estimated_response: Optional[str] = None
    eta: Optional[str] = None
    created: Optional[str] = None
    reporter: Optional[str] = None
    timeline: Optional[Any] = None
    similarIssue: Optional[str] = None
    suggestedFix: Optional[str] = None
    fixWorked: Optional[bool] = None
    originalMessage: Optional[str] = None
    conversation: Optional[list] = None
    affected_systems: Optional[str] = None
    confidence: Optional[int] = None


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_team: Optional[str] = None
    assignedTeam: Optional[str] = None
    assigned_engineer: Optional[str] = None
    ai_diagnosis: Optional[str] = None
    aiDiagnosis: Optional[str] = None
    estimated_response: Optional[str] = None
    eta: Optional[str] = None
    department: Optional[str] = None


class TicketResponse(BaseModel):
    id: str
    issue: str
    category: Optional[str] = None
    department: Optional[str] = None
    priority: str = "medium"
    status: str = "Open"
    aiDiagnosis: Optional[str] = None
    assignedTeam: Optional[str] = None
    assignedEngineer: Optional[str] = None
    reporter: Optional[str] = None
    eta: Optional[str] = None
    created: Optional[str] = None
    timeline: Optional[Any] = None
    similarIssue: Optional[str] = None
    suggestedFix: Optional[str] = None
    fixWorked: Optional[bool] = None
    originalMessage: Optional[str] = None
    possibleCause: Optional[str] = None
    affectedSystems: Optional[str] = None
    confidence: Optional[int] = None


class ConversationEntry(BaseModel):
    sender: str
    message: str
    timestamp: Optional[str] = None


class ActivityEntry(BaseModel):
    action: str
    detail: Optional[str] = ""
    actor: Optional[str] = "system"
    timestamp: Optional[str] = None


class UserProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None


class UserResponse(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: Optional[str] = None


class AdminUserCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = ""
    department: Optional[str] = ""
    role: Optional[str] = "user"
    status: Optional[str] = "active"
    password: Optional[str] = ""
    avatar_initials: Optional[str] = ""


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    avatar_initials: Optional[str] = None


class UserFullResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str = ""
    department: str = ""
    role: str = "user"
    avatar: str = ""
    status: str = "active"
    last_login: Optional[str] = None
    avatar_initials: str = ""
    created_at: str = ""
    ticket_counts: Optional[dict] = None


class UserActivityEntry(BaseModel):
    action: str
    detail: Optional[str] = ""
    actor: Optional[str] = "system"
    timestamp: Optional[str] = None


# ── New clean User CRUD schemas ──

class UserCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    department: str = ""
    role: str = "user"
    status: str = "active"
    temporary_password: str = ""
    password: str = ""  # alias accepted from frontend


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    temporary_password: Optional[str] = None
    password: Optional[str] = None  # alias accepted from frontend


class MigrateRequest(BaseModel):
    tickets: list[Any]


class MigrateResponse(BaseModel):
    migrated: int
    skipped: int


class NoteCreate(BaseModel):
    message: str
    sender: Optional[str] = "admin"


class KBCreate(BaseModel):
    title: str
    category: Optional[str] = None
    summary: Optional[str] = None
    problem: Optional[str] = None
    root_cause: Optional[str] = None
    solution: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = "draft"
    author: Optional[str] = None


class KBUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    problem: Optional[str] = None
    root_cause: Optional[str] = None
    solution: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    author: Optional[str] = None
    views: Optional[int] = None
    reading_time: Optional[int] = None
    is_featured: Optional[bool] = None
