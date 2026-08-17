import json
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from database import get_db
from models import Ticket, Conversation, ActivityLog, User
from schemas import TicketCreate, TicketUpdate, TicketResponse, NoteCreate

router = APIRouter()


def _generate_ticket_number(db: Session) -> str:
    max_num = db.query(func.max(Ticket.ticket_number)).scalar()
    if max_num:
        parts = max_num.split("-")
        try:
            next_num = int(parts[-1]) + 1
        except ValueError:
            next_num = 10000
    else:
        next_num = 10000
    return f"RSV-{next_num}"


def _ticket_to_response(t: Ticket, db: Session = None) -> dict:
    meta = {}
    if t.metadata_json:
        try:
            meta = json.loads(t.metadata_json)
        except (json.JSONDecodeError, TypeError):
            meta = {}

    created_str = t.created_at.isoformat() if t.created_at else None
    updated_str = t.updated_at.isoformat() if t.updated_at else None

    reporter_email = ""
    reporter_phone = ""
    if db and t.reporter:
        reporter_user = db.query(User).filter(User.full_name == t.reporter).first()
        if reporter_user:
            reporter_email = reporter_user.email or ""
            reporter_phone = reporter_user.phone or ""

    return {
        "id": t.ticket_number,
        "updated": updated_str,
        "issue": t.issue,
        "category": t.category or "",
        "department": t.department or "",
        "priority": t.priority,
        "status": t.status,
        "aiDiagnosis": t.ai_diagnosis or meta.get("aiDiagnosis", ""),
        "assignedTeam": t.assigned_team or meta.get("assignedTeam", ""),
        "assignedEngineer": t.assigned_engineer or meta.get("assignedEngineer", ""),
        "reporter": t.reporter or meta.get("reporter", ""),
        "reporterEmail": reporter_email,
        "reporterPhone": reporter_phone,
        "eta": t.estimated_response or meta.get("eta", ""),
        "created": created_str,
        "timeline": meta.get("timeline"),
        "similarIssue": meta.get("similarIssue", ""),
        "suggestedFix": meta.get("suggestedFix", ""),
        "fixWorked": meta.get("fixWorked", False),
        "originalMessage": meta.get("originalMessage", ""),
        "possibleCause": t.possible_cause or meta.get("possibleCause", ""),
        "affectedSystems": meta.get("affectedSystems", ""),
        "confidence": meta.get("confidence"),
        "commentCount": db.query(func.count(Conversation.id)).filter(Conversation.ticket_id == t.id).scalar() or 0 if db else 0,
        "attachmentCount": 0,
    }


def _log_activity(db: Session, ticket_number: str, action: str, detail: str = "", actor: str = "system"):
    log = ActivityLog(
        ticket_number=ticket_number,
        action=action,
        detail=detail,
        actor=actor,
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()


@router.get("/api/tickets")
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return [_ticket_to_response(t, db) for t in tickets]


@router.post("/api/tickets")
def create_ticket(req: TicketCreate, db: Session = Depends(get_db)):
    ticket_number = req.id or _generate_ticket_number(db)

    meta = {}
    if req.timeline:
        meta["timeline"] = req.timeline
    if req.similarIssue:
        meta["similarIssue"] = req.similarIssue
    if req.suggestedFix:
        meta["suggestedFix"] = req.suggestedFix
    if req.fixWorked is not None:
        meta["fixWorked"] = req.fixWorked
    if req.originalMessage:
        meta["originalMessage"] = req.originalMessage
    if req.affected_systems:
        meta["affectedSystems"] = req.affected_systems
    if req.confidence is not None:
        meta["confidence"] = req.confidence
    if req.reporter:
        meta["reporter"] = req.reporter

    assigned_team = req.assignedTeam or req.assigned_team or ""
    assigned_engineer = req.assigned_engineer or ""
    estimated_response = req.eta or req.estimated_response or ""
    ai_diagnosis = req.aiDiagnosis or req.ai_diagnosis or ""
    reporter = req.reporter or ""

    created_dt = None
    if req.created:
        try:
            created_dt = datetime.datetime.fromisoformat(req.created.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            created_dt = datetime.datetime.utcnow()
    else:
        created_dt = datetime.datetime.utcnow()

    ticket = Ticket(
        ticket_number=ticket_number,
        issue=req.issue,
        category=req.category or "",
        department=req.department or "",
        priority=req.priority or "medium",
        status=req.status or "Open",
        ai_diagnosis=ai_diagnosis,
        possible_cause=req.possible_cause or "",
        assigned_team=assigned_team,
        assigned_engineer=assigned_engineer,
        estimated_response=estimated_response,
        reporter=reporter,
        metadata_json=json.dumps(meta),
        created_at=created_dt,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Store conversation messages if provided
    if req.conversation and isinstance(req.conversation, list):
        for msg in req.conversation:
            sender = msg.get("sender", "user")
            message = msg.get("message", "")
            ts_str = msg.get("timestamp")
            ts = None
            if ts_str:
                try:
                    ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    ts = datetime.datetime.utcnow()
            convo = Conversation(
                ticket_id=ticket.id,
                sender=sender,
                message=message,
                timestamp=ts or datetime.datetime.utcnow(),
            )
            db.add(convo)

    # Log activity
    _log_activity(db, ticket_number, "Ticket Created", f"Ticket {ticket_number} created")

    db.commit()
    return _ticket_to_response(ticket, db)


@router.get("/api/ticket/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_to_response(ticket, db)


@router.put("/api/ticket/{ticket_id}")
def update_ticket(ticket_id: str, req: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    changes = []
    if req.status is not None:
        old = ticket.status
        ticket.status = req.status
        changes.append(f"Status changed from {old} to {req.status}")
    if req.priority is not None:
        old = ticket.priority
        ticket.priority = req.priority
        changes.append(f"Priority changed from {old} to {req.priority}")
    if req.assignedTeam is not None or req.assigned_team is not None:
        val = req.assignedTeam if req.assignedTeam is not None else req.assigned_team
        old = ticket.assigned_team
        ticket.assigned_team = val or ""
        changes.append(f"Assigned team changed from {old or 'unassigned'} to {val or 'unassigned'}")
    if req.assigned_engineer is not None:
        old = ticket.assigned_engineer
        ticket.assigned_engineer = req.assigned_engineer or ""
        changes.append(f"Engineer changed from {old or 'unassigned'} to {req.assigned_engineer or 'unassigned'}")
    if req.eta or req.estimated_response:
        ticket.estimated_response = req.eta or req.estimated_response
    if req.aiDiagnosis or req.ai_diagnosis:
        ticket.ai_diagnosis = req.aiDiagnosis or req.ai_diagnosis

    ticket.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    if changes:
        _log_activity(db, ticket_id, "; ".join(changes), actor="admin")

    return _ticket_to_response(ticket, db)


@router.get("/api/admin/tickets/kpi")
def tickets_kpi(db: Session = Depends(get_db)):
    today = datetime.date.today()
    total = db.query(func.count(Ticket.id)).scalar() or 0
    open_count = db.query(func.count(Ticket.id)).filter(Ticket.status == "Open").scalar() or 0
    in_progress_count = (
        db.query(func.count(Ticket.id)).filter(Ticket.status == "In Progress").scalar() or 0
    )
    waiting_user_count = (
        db.query(func.count(Ticket.id)).filter(Ticket.status == "Waiting User").scalar() or 0
    )
    resolved_today = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == "Resolved")
        .filter(cast(Ticket.updated_at, Date) == today)
        .scalar()
        or 0
    )
    high_priority = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.priority == "high")
        .filter(Ticket.status.in_(["Open", "In Progress"]))
        .scalar()
        or 0
    )

    # SLA breached: high priority open > 4h, medium > 24h, low > 72h
    now = datetime.datetime.utcnow()
    sla_breached = 0
    all_active = (
        db.query(Ticket)
        .filter(Ticket.status.in_(["Open", "In Progress", "Waiting User"]))
        .all()
    )
    for t in all_active:
        if not t.created_at:
            continue
        hours = (now - t.created_at).total_seconds() / 3600
        if t.priority == "high" and hours > 4:
            sla_breached += 1
        elif t.priority == "medium" and hours > 24:
            sla_breached += 1
        elif t.priority == "low" and hours > 72:
            sla_breached += 1

    # Previous period counts (for trend)
    yesterday = today - datetime.timedelta(days=1)
    open_yesterday = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == "Open")
        .filter(cast(Ticket.created_at, Date) <= yesterday)
        .scalar()
        or 0
    )
    resolved_yesterday = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == "Resolved")
        .filter(cast(Ticket.updated_at, Date) == yesterday)
        .scalar()
        or 0
    )

    return {
        "total": total,
        "open": open_count,
        "openTrend": open_count - open_yesterday,
        "inProgress": in_progress_count,
        "waitingUser": waiting_user_count,
        "resolvedToday": resolved_today,
        "resolvedTrend": resolved_today - resolved_yesterday,
        "highPriority": high_priority,
        "slaBreached": sla_breached,
    }


REAL_DEPARTMENTS = [
    "Network Operations", "Email & Collaboration", "Cloud Infrastructure",
    "Security Operations", "Identity & Access", "Hardware Support",
    "Desktop Support", "Windows Administration", "Linux Administration",
    "Database Team", "ERP / SAP", "Application Support",
    "DevOps", "Platform Engineering", "AI Operations"
]

REAL_TEAMS = [
    "Tier 1 Support", "Tier 2 Support", "L3 Engineering",
    "Network Operations", "Cloud Team", "Infrastructure",
    "SOC Team", "Windows Team", "Linux Team"
]


@router.get("/api/admin/tickets/filters")
def tickets_filters(db: Session = Depends(get_db)):
    db_depts = [
        r[0] for r in db.query(Ticket.department).filter(Ticket.department != "").distinct().all() if r[0]
    ]
    db_teams = [
        r[0] for r in db.query(Ticket.assigned_team).filter(Ticket.assigned_team != "").distinct().all() if r[0]
    ]
    combined_depts = list(dict.fromkeys(REAL_DEPARTMENTS + db_depts))
    combined_teams = list(dict.fromkeys(REAL_TEAMS + db_teams))
    return {"departments": combined_depts, "teams": combined_teams}


@router.get("/api/admin/engineers")
def list_engineers(db: Session = Depends(get_db)):
    db_admins = (
        db.query(User)
        .filter(User.role.in_(["admin", "engineer"]))
        .order_by(User.full_name)
        .all()
    )
    engineers = [
        {"name": "Rahul Sharma", "email": "rahul.sharma@resolveone.com", "department": "Network Operations"},
        {"name": "Neha Kapoor", "email": "neha.kapoor@resolveone.com", "department": "Cloud Infrastructure"},
        {"name": "Amit Verma", "email": "amit.verma@resolveone.com", "department": "Security Operations"},
        {"name": "Sneha Gupta", "email": "sneha.gupta@resolveone.com", "department": "Desktop Support"},
        {"name": "Priya Singh", "email": "priya.singh@resolveone.com", "department": "Application Support"},
        {"name": "Rohit Tiwari", "email": "rohit.tiwari@resolveone.com", "department": "Database Team"},
        {"name": "Aditya Saxena", "email": "aditya.saxena@resolveone.com", "department": "DevOps"},
        {"name": "Mohit Jain", "email": "mohit.jain@resolveone.com", "department": "Linux Administration"},
    ]
    seen = {e["email"] for e in engineers}
    for u in db_admins:
        if u.email not in seen:
            engineers.append({"name": u.full_name, "email": u.email, "department": u.department})
            seen.add(u.email)
    return engineers


@router.get("/api/admin/ticket/{ticket_id}/conversations")
def ticket_conversations(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    convos = (
        db.query(Conversation)
        .filter(Conversation.ticket_id == ticket.id)
        .order_by(Conversation.timestamp.asc())
        .all()
    )
    return [
        {
            "id": c.id,
            "sender": c.sender,
            "message": c.message,
            "timestamp": c.timestamp.isoformat() if c.timestamp else None,
        }
        for c in convos
    ]


@router.post("/api/admin/ticket/{ticket_id}/note")
def add_ticket_note(ticket_id: str, req: NoteCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    note = Conversation(
        ticket_id=ticket.id,
        sender=req.sender or "admin",
        message=req.message,
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    _log_activity(db, ticket_id, "Internal Note Added", f"Note by {req.sender or 'admin'}", actor=req.sender or "admin")
    return {
        "id": note.id,
        "sender": note.sender,
        "message": note.message,
        "timestamp": note.timestamp.isoformat() if note.timestamp else None,
    }


@router.get("/api/admin/ticket/{ticket_id}/activity")
def ticket_activity(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.ticket_number == ticket_id)
        .order_by(ActivityLog.timestamp.desc())
        .all()
    )
    return [
        {
            "id": l.id,
            "action": l.action,
            "detail": l.detail,
            "actor": l.actor,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]
