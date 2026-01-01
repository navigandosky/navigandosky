"""
Routes pubbliche - Homepage, progetti, contatti, impostazioni
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from typing import List

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db, UPLOADS_DIR
from models import Project, ContactMessage, ContactMessageCreate

router = APIRouter(tags=["Public"])

# =============================================================================
# GENERAL
# =============================================================================

@router.get("/")
async def root():
    return {"message": "Trivor API v1.0", "status": "online"}

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download a file from uploads folder"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )

# =============================================================================
# PROJECTS
# =============================================================================

@router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects (public)"""
    projects = await db.projects.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return projects

@router.get("/projects/featured", response_model=List[Project])
async def get_featured_projects():
    """Get featured projects for homepage"""
    projects = await db.projects.find({"featured": True}, {"_id": 0}).sort("order", 1).to_list(10)
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return projects

@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a single project by ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project.get('updated_at'), str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return project

# =============================================================================
# CONTACT
# =============================================================================

@router.post("/contact", response_model=ContactMessage)
async def create_contact_message(input: ContactMessageCreate):
    """Submit a contact form message"""
    message_obj = ContactMessage(**input.model_dump())
    doc = message_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contact_messages.insert_one(doc)
    return message_obj

# =============================================================================
# SITE SETTINGS
# =============================================================================

@router.get("/settings")
async def get_site_settings():
    """Get site settings (public)"""
    settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        return {
            "id": "site_settings",
            "hero_images": [
                {"url": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1920&q=80", "title": "Costa Smeralda"},
                {"url": "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80", "title": "Grotte Marine"},
                {"url": "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80", "title": "Borghi Storici"}
            ]
        }
    return settings
