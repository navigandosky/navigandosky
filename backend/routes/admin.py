"""
Routes per Admin CMS - Gestione progetti, messaggi, impostazioni sito
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
import uuid
import shutil

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db, UPLOADS_DIR
from auth import verify_admin_credentials
from models import (
    Project, ProjectCreate, ProjectUpdate,
    ContactMessage, SiteSettingsUpdate
)

router = APIRouter(prefix="/admin", tags=["Admin CMS"])

# =============================================================================
# IMAGE UPLOAD
# =============================================================================

@router.post("/upload")
async def upload_image(file: UploadFile = File(...), username: str = Depends(verify_admin_credentials)):
    """Upload an image file (admin only)"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo file non supportato. Usa: JPG, PNG, GIF, WEBP"
        )
    
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")
    
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/{unique_filename}",
        "message": "Immagine caricata con successo"
    }

@router.get("/verify")
async def verify_admin(username: str = Depends(verify_admin_credentials)):
    """Verify admin credentials"""
    return {"authenticated": True, "username": username}

# =============================================================================
# PROJECTS
# =============================================================================

@router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate, username: str = Depends(verify_admin_credentials)):
    """Create a new project (admin only)"""
    project_obj = Project(**input.model_dump())
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    return project_obj

@router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate, username: str = Depends(verify_admin_credentials)):
    """Update a project (admin only)"""
    existing = await db.projects.find_one({"id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, username: str = Depends(verify_admin_credentials)):
    """Delete a project (admin only)"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"deleted": True, "id": project_id}

# =============================================================================
# CONTACT MESSAGES
# =============================================================================

@router.get("/messages")
async def get_contact_messages(username: str = Depends(verify_admin_credentials)):
    """Get all contact messages (admin only)"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

@router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, username: str = Depends(verify_admin_credentials)):
    """Mark a message as read (admin only)"""
    result = await db.contact_messages.update_one({"id": message_id}, {"$set": {"read": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"success": True}

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, username: str = Depends(verify_admin_credentials)):
    """Delete a contact message (admin only)"""
    result = await db.contact_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"deleted": True, "id": message_id}

# =============================================================================
# STATISTICS
# =============================================================================

@router.get("/stats")
async def get_admin_stats(username: str = Depends(verify_admin_credentials)):
    """Get admin dashboard statistics"""
    projects_count = await db.projects.count_documents({})
    messages_count = await db.contact_messages.count_documents({})
    unread_messages = await db.contact_messages.count_documents({"read": False})
    
    return {
        "projects": projects_count,
        "messages": messages_count,
        "unread_messages": unread_messages
    }

# =============================================================================
# SITE SETTINGS
# =============================================================================

@router.put("/settings")
async def update_site_settings(input: SiteSettingsUpdate, username: str = Depends(verify_admin_credentials)):
    """Update site settings (admin only)"""
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['id'] = "site_settings"
    
    await db.site_settings.update_one(
        {"id": "site_settings"}, 
        {"$set": update_data}, 
        upsert=True
    )
    
    updated = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    return updated

# =============================================================================
# SEED DATA
# =============================================================================

@router.post("/seed")
async def seed_data(username: str = Depends(verify_admin_credentials)):
    """Seed initial project data (admin only)"""
    
    existing = await db.projects.count_documents({})
    if existing > 0:
        return {"message": "Database già popolato", "projects": existing}
    
    initial_projects = [
        {
            "id": str(uuid.uuid4()),
            "title": "Smart Building Dashboard",
            "client": "Navigandosky",
            "category": "Smart Building",
            "description": "Piattaforma di gestione edifici smart con gemelli digitali Matterport, monitoraggio manutenzioni e domotica integrata.",
            "image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
            "link": "https://trivorplatform.preview.emergentagent.com",
            "featured": True,
            "order": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Tour Virtuali Sardegna",
            "client": "Regione Sardegna",
            "category": "Beni Culturali",
            "description": "Digitalizzazione di siti archeologici e grotte con tour virtuali 360° per la valorizzazione del patrimonio culturale sardo.",
            "image_url": "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&q=80",
            "link": None,
            "featured": True,
            "order": 2,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "CMS Tracciamento Progetti",
            "client": "Trivor SRL",
            "category": "Gestionale",
            "description": "Sistema di gestione progetti con tracking ore, crediti, sessioni di lavoro ed export dati per monitoraggio attività. Adattabile anche ad altre esigenze aziendali.",
            "image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
            "link": None,
            "featured": True,
            "order": 3,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.projects.insert_many(initial_projects)
    return {"message": "Database popolato con successo", "projects": len(initial_projects)}
