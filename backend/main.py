from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import requests
import json
import re

from database import init_db, SessionLocal, engine
from models import User, KnowledgeBase
from routes.tickets import router as tickets_router
from routes.users import router as users_router
from routes.knowledge_base import router as kb_router
from routes.migrate import router as migrate_router
from routes.auth import router as auth_router
from security import hash_password

app = FastAPI(title="ResolveOne AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache_static(request, call_next):
    import time
    response = await call_next(request)
    path = request.url.path
    if not path.startswith("/api") and path != "/chat":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:latest"

SYSTEM_PROMPT = """You are ResolveOne AI, an enterprise IT support assistant.

Your job is to:
- diagnose IT issues based on the user's reported problem
- ask relevant follow-up questions to gather more information
- recommend troubleshooting steps
- remain concise
- avoid unnecessary explanations
- never answer unrelated questions
- keep responses professional.

When the user asks you to analyze an issue, base your analysis ONLY on the specific issue the user reported. Do NOT default to network/VPN issues. Derive the category, cause, and systems from the user's actual description.

If the user asks something outside IT support, politely redirect them back to IT support."""


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    analysis: Optional[dict] = None


def extract_json(text: str) -> Optional[dict]:
    try:
        cleaned = text.strip().replace('```json', '').replace('```', '').strip()
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and 'category' in parsed:
            return parsed
    except Exception:
        pass
    try:
        match = re.search(r'\{[^{}]*\}', text)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, dict) and 'category' in parsed:
                return parsed
    except Exception:
        pass
    return None


def _migrate_db():
    import sqlalchemy as sa
    try:
        inspector = sa.inspect(engine)
        users_cols = {c["name"] for c in inspector.get_columns("users")}
        kb_cols = {c["name"] for c in inspector.get_columns("knowledge_base")}
    except Exception:
        return
    user_columns = {
        "status": "ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'",
        "password": "ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''",
        "last_login": "ALTER TABLE users ADD COLUMN last_login DATETIME",
        "avatar_initials": "ALTER TABLE users ADD COLUMN avatar_initials VARCHAR(10) NOT NULL DEFAULT ''",
    }
    kb_columns = {
        "article_number": "ALTER TABLE knowledge_base ADD COLUMN article_number VARCHAR(20) NOT NULL DEFAULT ''",
        "problem": "ALTER TABLE knowledge_base ADD COLUMN problem TEXT NOT NULL DEFAULT ''",
        "root_cause": "ALTER TABLE knowledge_base ADD COLUMN root_cause TEXT NOT NULL DEFAULT ''",
        "status": "ALTER TABLE knowledge_base ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'",
        "author": "ALTER TABLE knowledge_base ADD COLUMN author VARCHAR(100) NOT NULL DEFAULT ''",
        "views": "ALTER TABLE knowledge_base ADD COLUMN views INTEGER NOT NULL DEFAULT 0",
        "reading_time": "ALTER TABLE knowledge_base ADD COLUMN reading_time INTEGER NOT NULL DEFAULT 5",
        "is_featured": "ALTER TABLE knowledge_base ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0",
        "created_at": "ALTER TABLE knowledge_base ADD COLUMN created_at DATETIME",
        "updated_at": "ALTER TABLE knowledge_base ADD COLUMN updated_at DATETIME",
    }
    with engine.connect() as conn:
        for col_name, ddl in user_columns.items():
            if col_name not in users_cols:
                conn.execute(sa.text(ddl))
        for col_name, ddl in kb_columns.items():
            if col_name not in kb_cols:
                conn.execute(sa.text(ddl))
        conn.commit()


@app.on_event("startup")
def startup():
    init_db()
    _migrate_db()
    _seed_data()


def _seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            default_password = hash_password("ResolveOne@2024")
            user = User(
                full_name="Neha Kapoor",
                email="neha.kapoor@resolveone.com",
                phone="+1 (555) 289-1746",
                department="IT Support",
                role="user",
                password=default_password,
            )
            db.add(user)
            admin = User(
                full_name="Admin User",
                email="admin@resolveone.com",
                phone="+1 (555) 000-0001",
                department="IT Administration",
                role="admin",
                password=default_password,
            )
            db.add(admin)
            engineer = User(
                full_name="Raj Mehta",
                email="raj.mehta@resolveone.com",
                phone="+1 (555) 000-0002",
                department="Engineering",
                role="support_engineer",
                password=default_password,
            )
            db.add(engineer)

        existing_users = db.query(User).filter(User.password == "").all()
        if existing_users:
            default_password = hash_password("ResolveOne@2024")
            for u in existing_users:
                u.password = default_password

        if db.query(KnowledgeBase).count() == 0:
            import datetime
            now = datetime.datetime.utcnow()
            articles = [
                KnowledgeBase(article_number="KB-0001", category="Network & Connectivity", title="VPN not connecting after Windows Update", summary="Troubleshoot and resolve VPN connectivity failures triggered by Windows 11 cumulative updates.", solution="Uninstall the problematic update, restart, flush DNS.", status="published", author="Admin", views=1240, reading_time=8, is_featured=1, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0002", category="Network & Connectivity", title="Slow Wi-Fi in office", summary="Diagnose and fix slow wireless network performance in the corporate office.", solution="Switch to 5 GHz band, check signal strength, report AP location to IT.", status="published", author="Admin", views=870, reading_time=6, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0003", category="Network & Connectivity", title="VPN Error 691", summary="Resolve VPN authentication error 691 caused by incorrect credentials or RADIUS misconfiguration.", solution="Verify domain password, clear stored credentials in Credential Manager.", status="published", author="Admin", views=720, reading_time=5, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0004", category="Email & Collaboration", title="Outlook keeps asking for password", summary="Fix the persistent Outlook password prompt loop caused by Modern Authentication or cached credentials.", solution="Clear Windows Credentials for MicrosoftOffice, repair Office installation.", status="published", author="Admin", views=1530, reading_time=7, is_featured=1, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0005", category="Email & Collaboration", title="Teams microphone not working", summary="Diagnose and fix Microsoft Teams microphone issues in meetings.", solution="Check Windows privacy settings, select correct device in Teams audio settings.", status="draft", author="Admin", views=0, reading_time=5, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0006", category="Account & Access", title="Password reset guide", summary="Complete walkthrough for resetting your corporate account password.", solution="Use self-service portal at https://password.company.com, complete MFA.", status="published", author="Admin", views=1870, reading_time=4, is_featured=1, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0007", category="Hardware", title="Laptop battery draining fast", summary="Identify causes and solutions for rapid laptop battery drain.", solution="Generate battery report, close high-CPU apps, enable Battery Saver.", status="published", author="Admin", views=780, reading_time=6, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0008", category="Printer", title="Printer offline or not responding", summary="Fix corporate network printers showing offline status.", solution="Restart print spooler service, clear print queue, reconnect printer.", status="published", author="Admin", views=1360, reading_time=5, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0009", category="Cloud & SaaS", title="OneDrive sync stuck", summary="Resolve OneDrive file synchronization issues and stuck sync status.", solution="Reset OneDrive, check for file path length issues, relink account.", status="review_required", author="Admin", views=1290, reading_time=6, created_at=now, updated_at=now),
                KnowledgeBase(article_number="KB-0010", category="Windows & OS", title="Windows Blue Screen after update", summary="Diagnose and fix Windows blue screen errors after system updates.", solution="Boot to Safe Mode, uninstall latest update, run SFC and DISM.", status="published", author="Admin", views=1680, reading_time=8, is_featured=1, created_at=now, updated_at=now),
            ]
            db.add_all(articles)

        db.commit()
    finally:
        db.close()


# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        payload = {
            "model": MODEL_NAME,
            "prompt": req.message,
            "system": SYSTEM_PROMPT,
            "stream": False,
        }
        resp = requests.post(OLLAMA_URL, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        llm_text = data.get("response", "")
        analysis = extract_json(llm_text)
        return ChatResponse(response=llm_text, analysis=analysis)
    except Exception as e:
        print(e)
        return ChatResponse(response=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(tickets_router)
app.include_router(users_router)
app.include_router(kb_router)
app.include_router(migrate_router)
app.include_router(auth_router)

import os
frontend_dir = os.path.join(os.path.dirname(__file__), "..")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
