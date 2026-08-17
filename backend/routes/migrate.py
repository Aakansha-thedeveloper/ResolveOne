import json
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Ticket
from schemas import MigrateRequest, MigrateResponse

router = APIRouter()


@router.post("/api/migrate", response_model=MigrateResponse)
def migrate_tickets(req: MigrateRequest, db: Session = Depends(get_db)):
    migrated = 0
    skipped = 0

    for item in req.tickets:
        if not isinstance(item, dict):
            skipped += 1
            continue

        ticket_id = item.get("id", "")
        if not ticket_id:
            skipped += 1
            continue

        existing = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
        if existing:
            skipped += 1
            continue

        meta = {}
        for key in ("timeline", "similarIssue", "suggestedFix", "fixWorked", "originalMessage"):
            if key in item:
                meta[key] = item[key]

        created_str = item.get("created")
        created_dt = None
        if created_str:
            try:
                created_dt = datetime.datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                created_dt = datetime.datetime.utcnow()
        else:
            created_dt = datetime.datetime.utcnow()

        ticket = Ticket(
            ticket_number=ticket_id,
            issue=item.get("issue", ""),
            category=item.get("category", ""),
            department=item.get("department", ""),
            priority=item.get("priority", "medium"),
            status=item.get("status", "Open"),
            ai_diagnosis=item.get("aiDiagnosis", item.get("ai_diagnosis", "")),
            assigned_team=item.get("assignedTeam", item.get("assigned_team", "")),
            estimated_response=item.get("eta", item.get("estimated_response", "")),
            metadata_json=json.dumps(meta),
            created_at=created_dt,
        )
        db.add(ticket)
        migrated += 1

    db.commit()
    return MigrateResponse(migrated=migrated, skipped=skipped)
