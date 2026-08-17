import traceback, datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from database import get_db
from models import KnowledgeBase
from schemas import KBCreate, KBUpdate

router = APIRouter()


def _kb_to_dict(k: KnowledgeBase) -> dict:
    return {
        "id": k.id,
        "article_number": k.article_number or "",
        "title": k.title,
        "category": k.category or "",
        "summary": k.summary or "",
        "problem": k.problem or "",
        "root_cause": k.root_cause or "",
        "solution": k.solution or "",
        "tags": k.tags or "",
        "status": k.status or "draft",
        "author": k.author or "",
        "views": k.views or 0,
        "reading_time": k.reading_time or 5,
        "is_featured": bool(k.is_featured),
        "created_at": k.created_at.isoformat() if k.created_at else "",
        "updated_at": k.updated_at.isoformat() if k.updated_at else "",
    }


def _next_article_number(db: Session) -> str:
    count = db.query(func.count(KnowledgeBase.id)).scalar() or 0
    return f"KB-{count + 1:04d}"


@router.get("/api/kb")
def list_kb(
    search: Optional[str] = Query(""),
    category: Optional[str] = Query(""),
    status: Optional[str] = Query(""),
    author: Optional[str] = Query(""),
    sort: Optional[str] = Query("updated_at"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    try:
        q = db.query(KnowledgeBase)
        if search:
            like = f"%{search}%"
            q = q.filter(
                KnowledgeBase.title.ilike(like)
                | KnowledgeBase.summary.ilike(like)
                | KnowledgeBase.tags.ilike(like)
            )
        if category:
            q = q.filter(KnowledgeBase.category == category)
        if status:
            q = q.filter(KnowledgeBase.status == status)
        if author:
            q = q.filter(KnowledgeBase.author.ilike(f"%{author}%"))
        sort_map = {
            "title": KnowledgeBase.title,
            "category": KnowledgeBase.category,
            "status": KnowledgeBase.status,
            "views": KnowledgeBase.views,
            "reading_time": KnowledgeBase.reading_time,
            "created_at": KnowledgeBase.created_at,
            "updated_at": KnowledgeBase.updated_at,
        }
        order = sort_map.get(sort, KnowledgeBase.updated_at)
        q = q.order_by(order.desc())
        total = q.count()
        articles = q.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "articles": [_kb_to_dict(a) for a in articles],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page if total else 0,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/api/kb/analytics")
def kb_analytics(db: Session = Depends(get_db)):
    try:
        total = db.query(func.count(KnowledgeBase.id)).scalar() or 0
        published = db.query(func.count(KnowledgeBase.id)).filter(KnowledgeBase.status == "published").scalar() or 0
        drafts = db.query(func.count(KnowledgeBase.id)).filter(KnowledgeBase.status == "draft").scalar() or 0
        total_views = db.query(func.sum(KnowledgeBase.views)).scalar() or 0
        archived = db.query(func.count(KnowledgeBase.id)).filter(KnowledgeBase.status == "archived").scalar() or 0
        review = db.query(func.count(KnowledgeBase.id)).filter(KnowledgeBase.status == "review_required").scalar() or 0
        return {
            "total": total,
            "published": published,
            "drafts": drafts,
            "total_views": total_views,
            "archived": archived,
            "review_required": review,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/kb/statistics")
def kb_statistics(db: Session = Depends(get_db)):
    try:
        most_viewed = (
            db.query(KnowledgeBase).order_by(KnowledgeBase.views.desc()).limit(5).all()
        )
        recently_updated = (
            db.query(KnowledgeBase).order_by(KnowledgeBase.updated_at.desc()).limit(5).all()
        )
        pending_review = (
            db.query(KnowledgeBase).filter(KnowledgeBase.status == "review_required").count()
        )
        no_updates = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.updated_at == KnowledgeBase.created_at,
                KnowledgeBase.status != "archived",
            )
            .count()
        )
        return {
            "most_viewed": [_kb_to_dict(a) for a in most_viewed],
            "recently_updated": [_kb_to_dict(a) for a in recently_updated],
            "pending_review": pending_review,
            "no_updates": no_updates,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/kb/categories")
def kb_categories(db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(KnowledgeBase.category, func.count(KnowledgeBase.id))
            .filter(KnowledgeBase.category != "")
            .group_by(KnowledgeBase.category)
            .order_by(func.count(KnowledgeBase.id).desc())
            .all()
        )
        return [{"name": r[0], "count": r[1]} for r in rows]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/kb/authors")
def kb_authors(db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(KnowledgeBase.author, func.count(KnowledgeBase.id))
            .filter(KnowledgeBase.author != "")
            .group_by(KnowledgeBase.author)
            .order_by(func.count(KnowledgeBase.id).desc())
            .all()
        )
        return [{"name": r[0], "count": r[1]} for r in rows]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/kb/{kb_id}")
def get_kb(kb_id: int, db: Session = Depends(get_db)):
    try:
        article = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        article.views = (article.views or 0) + 1
        db.commit()
        return _kb_to_dict(article)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/kb", status_code=status.HTTP_201_CREATED)
def create_kb(req: KBCreate, db: Session = Depends(get_db)):
    try:
        if not req.title or not req.title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        article = KnowledgeBase(
            article_number=_next_article_number(db),
            title=req.title.strip(),
            category=req.category or "",
            summary=req.summary or "",
            problem=req.problem or "",
            root_cause=req.root_cause or "",
            solution=req.solution or "",
            tags=req.tags or "",
            status=req.status or "draft",
            author=req.author or "",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(article)
        db.commit()
        db.refresh(article)
        return _kb_to_dict(article)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create article: {str(e)}")


@router.put("/api/kb/{kb_id}")
def update_kb(kb_id: int, req: KBUpdate, db: Session = Depends(get_db)):
    try:
        article = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        if req.title is not None:
            article.title = req.title.strip()
        if req.category is not None:
            article.category = req.category
        if req.summary is not None:
            article.summary = req.summary
        if req.problem is not None:
            article.problem = req.problem
        if req.root_cause is not None:
            article.root_cause = req.root_cause
        if req.solution is not None:
            article.solution = req.solution
        if req.tags is not None:
            article.tags = req.tags
        if req.status is not None:
            article.status = req.status
        if req.author is not None:
            article.author = req.author
        if req.views is not None:
            article.views = req.views
        if req.reading_time is not None:
            article.reading_time = req.reading_time
        if req.is_featured is not None:
            article.is_featured = 1 if req.is_featured else 0
        article.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(article)
        return _kb_to_dict(article)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update article: {str(e)}")


@router.delete("/api/kb/{kb_id}")
def delete_kb(kb_id: int, db: Session = Depends(get_db)):
    try:
        article = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        db.delete(article)
        db.commit()
        return {"success": True, "message": "Article deleted"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete article: {str(e)}")


@router.post("/api/kb/bulk")
def bulk_action(
    action: str = Query(...),
    ids: list[int] = Query(...),
    db: Session = Depends(get_db),
):
    try:
        articles = db.query(KnowledgeBase).filter(KnowledgeBase.id.in_(ids)).all()
        if not articles:
            raise HTTPException(status_code=404, detail="No articles found")
        if action == "delete":
            for a in articles:
                db.delete(a)
        elif action == "publish":
            for a in articles:
                a.status = "published"
        elif action == "archive":
            for a in articles:
                a.status = "archived"
        elif action == "draft":
            for a in articles:
                a.status = "draft"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
        db.commit()
        return {"success": True, "message": f"{len(articles)} article(s) updated"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/kb/import")
def import_kb(articles: list[KBCreate], db: Session = Depends(get_db)):
    try:
        created = 0
        skipped = 0
        for req in articles:
            if not req.title:
                skipped += 1
                continue
            existing = db.query(KnowledgeBase).filter(KnowledgeBase.title == req.title.strip()).first()
            if existing:
                skipped += 1
                continue
            article = KnowledgeBase(
                article_number=_next_article_number(db),
                title=req.title.strip(),
                category=req.category or "",
                summary=req.summary or "",
                problem=req.problem or "",
                root_cause=req.root_cause or "",
                solution=req.solution or "",
                tags=req.tags or "",
                status=req.status or "draft",
                author=req.author or "",
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            db.add(article)
            created += 1
        db.commit()
        return {"success": True, "created": created, "skipped": skipped}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
