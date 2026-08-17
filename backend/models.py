import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50), default="")
    department = Column(String(100), default="")
    role = Column(String(20), default="user")
    avatar = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="active")
    password = Column(String(255), default="")
    last_login = Column(DateTime, nullable=True)
    avatar_initials = Column(String(10), default="")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_number = Column(String(50), unique=True, nullable=False)
    issue = Column(Text, nullable=False)
    category = Column(String(100), default="")
    department = Column(String(100), default="")
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="Open")
    ai_diagnosis = Column(Text, default="")
    possible_cause = Column(Text, default="")
    assigned_team = Column(String(100), default="")
    assigned_engineer = Column(String(100), default="")
    estimated_response = Column(String(100), default="")
    reporter = Column(String(255), default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, nullable=False)
    sender = Column(String(50), default="")
    message = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_number = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    detail = Column(String(500), default="")
    actor = Column(String(100), default="system")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, autoincrement=True)
    article_number = Column(String(20), unique=True, nullable=False, default="")
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="")
    summary = Column(Text, default="")
    problem = Column(Text, default="")
    root_cause = Column(Text, default="")
    solution = Column(Text, default="")
    tags = Column(String(500), default="")
    status = Column(String(20), default="draft")
    author = Column(String(100), default="")
    views = Column(Integer, default=0)
    reading_time = Column(Integer, default=5)
    is_featured = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
