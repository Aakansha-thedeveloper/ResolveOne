# ResolveOne AI

ResolveOne is an AI-assisted IT support ticket management system. Users submit support tickets, an AI assistant helps diagnose issues, and support engineers and administrators track, resolve, and analyze tickets through role-based dashboards.

## Purpose

ResolveOne simulates a complete enterprise IT help desk. It combines an AI chat assistant that produces structured issue analysis with a full ticket workflow covering users, engineers, and administrators. It is built as a portfolio / milestone project demonstrating a full-stack web application with AI integration.

## Implemented Features

### User features
- Create and track support tickets
- AI chat assistant for diagnosing IT issues
- View and search the knowledge base
- Help center with self-service guidance
- Profile and account settings
- Ticket statistics and reports

### Support engineer features
- Engineer dashboard with assigned tickets
- View and update ticket status, priority, and assignment
- Resolve tickets with internal notes and activity logs
- Ticket reports
- Engineer profile management

### Admin features
- User management (create, edit, delete, role assignment)
- Knowledge base management (create, edit, publish, archive, bulk actions, import)
- Ticket KPI dashboard (open, in progress, SLA breaches, resolved today, trends)
- Reports and analytics

### AI assistant
- Chat endpoint backed by a local LLM
- The model response is parsed for a structured JSON analysis (category, cause, etc.) and stored with the ticket

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| Authentication | JWT (python-jose) with bcrypt password hashing (passlib) |
| AI | Ollama local LLM (Llama 3.2) via HTTP |

Note: The AI assistant integrates with a locally running Ollama instance. There is no RAG, vector database, or embeddings-based retrieval implemented; the knowledge base is queried with standard SQL filters and text search.

## Project Structure

```
.
├── backend/                  # FastAPI application
│   ├── main.py               # Entry point, startup seeding, /chat AI endpoint
│   ├── database.py           # SQLAlchemy engine/session setup
│   ├── models.py             # ORM models (User, Ticket, Conversation, ActivityLog, KnowledgeBase)
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── security.py           # JWT + bcrypt helpers
│   ├── routes/               # API routers
│   │   ├── auth.py           # /api/auth/* (register, login, logout, me, validate)
│   │   ├── tickets.py        # /api/tickets, /api/admin/tickets/*, conversations, notes, activity
│   │   ├── users.py          # /api/users CRUD, /api/user profile
│   │   ├── knowledge_base.py # /api/kb CRUD, analytics, bulk, import
│   │   └── migrate.py        # /api/migrate (legacy ticket import)
│   └── services/
│       └── auth_service.py   # Authentication business logic
├── css/                      # Stylesheets
├── js/                       # Vanilla JavaScript
│   ├── modules/              # Page-specific modules
│   └── vendor/               # Third-party libs (chart.js, lucide icons)
└── *.html                    # Frontend pages (user/engineer/admin dashboards)
```

## API Overview

- `POST /api/auth/register` — create a user or support engineer account
- `POST /api/auth/login` — authenticate and receive a JWT
- `GET /api/auth/me`, `GET /api/auth/validate` — session checks
- `GET/POST /api/tickets`, `GET/PUT /api/ticket/{id}` — ticket lifecycle
- `GET /api/admin/tickets/kpi`, `GET /api/admin/tickets/filters` — admin analytics
- `GET /api/admin/ticket/{id}/conversations`, `POST /api/admin/ticket/{id}/note`, `GET /api/admin/ticket/{id}/activity`
- `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` — user management
- `GET/POST /api/kb`, `GET/PUT/DELETE /api/kb/{id}` — knowledge base articles
- `POST /api/kb/bulk`, `POST /api/kb/import` — knowledge base utilities
- `POST /chat` — AI assistant chat
- `GET /health` — health check

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js (optional, for frontend dev scripts)
- Ollama installed locally with a Llama 3.2 model pulled (e.g., `ollama pull llama3.2`)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On startup the app creates the SQLite database (`resolveone.db`) and seeds a default user, admin, support engineer, and knowledge base articles.

### AI assistant

The `/chat` endpoint calls Ollama at `http://localhost:11434/api/generate` with model `llama3.2:latest`. Start Ollama and ensure the model is available before using the assistant.

### Frontend

The FastAPI server serves the static frontend from the project root. Open `http://localhost:8000` in a browser.

## Default Accounts

Seeded on first startup:

| Role | Email | Password |
|------|-------|----------|
| User | `neha.kapoor@resolveone.com` | `ResolveOne@2024` |
| Admin | `admin@resolveone.com` | `ResolveOne@2024` |
| Support Engineer | `raj.mehta@resolveone.com` | `ResolveOne@2024` |

New accounts can also be registered via `/api/auth/register` or the registration page.

## Current Project Status

Working local implementation covering user, engineer, and admin workflows, JWT authentication, and local LLM AI chat. The frontend is static HTML/CSS/JavaScript served by FastAPI; there is no separate build step. There is no RAG/vector search, no cloud deployment, and no production hosting configured.

## Security Notes

- The JWT secret key and default seed password are hardcoded for local development (see `backend/security.py` and `backend/main.py`). Replace these with environment-managed values before any production deployment.
- CORS is configured with `allow_origins=["*"]` for local development; restrict origins in production.
- Local artifacts (databases, virtual environments, logs, `node_modules`, QA scripts) are excluded via `.gitignore` and are not part of the repository.

## License

This project is provided as a portfolio/milestone demonstration. See repository history for attribution.
