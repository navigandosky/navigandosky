from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import secrets
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'trivor_db')]

# Create the main app without a prefix
app = FastAPI(title="Trivor API", version="1.0.0")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBasic()

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "trivor2024")

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali non valide",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# =============================================================================
# MODELS
# =============================================================================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Portfolio/Project Model
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    client: str
    category: str
    description: str
    image_url: Optional[str] = None
    link: Optional[str] = None
    featured: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    title: str
    client: str
    category: str
    description: str
    image_url: Optional[str] = None
    link: Optional[str] = None
    featured: bool = False
    order: int = 0

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    client: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    featured: Optional[bool] = None
    order: Optional[int] = None

# Contact Message Model
class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str

# =============================================================================
# ROUTES - Public
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "Trivor API v1.0", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Projects - Public endpoints
@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects (public)"""
    projects = await db.projects.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return projects

@api_router.get("/projects/featured", response_model=List[Project])
async def get_featured_projects():
    """Get featured projects for homepage"""
    projects = await db.projects.find({"featured": True}, {"_id": 0}).sort("order", 1).to_list(10)
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
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

# Contact - Public endpoint
@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(input: ContactMessageCreate):
    """Submit a contact form message"""
    message_obj = ContactMessage(**input.model_dump())
    doc = message_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contact_messages.insert_one(doc)
    return message_obj

# =============================================================================
# ROUTES - Admin (Protected)
# =============================================================================

@api_router.get("/admin/verify")
async def verify_admin(username: str = Depends(verify_credentials)):
    """Verify admin credentials"""
    return {"authenticated": True, "username": username}

# Projects - Admin endpoints
@api_router.post("/admin/projects", response_model=Project)
async def create_project(input: ProjectCreate, username: str = Depends(verify_credentials)):
    """Create a new project (admin only)"""
    project_obj = Project(**input.model_dump())
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    return project_obj

@api_router.put("/admin/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate, username: str = Depends(verify_credentials)):
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

@api_router.delete("/admin/projects/{project_id}")
async def delete_project(project_id: str, username: str = Depends(verify_credentials)):
    """Delete a project (admin only)"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"deleted": True, "id": project_id}

# Contact Messages - Admin endpoints
@api_router.get("/admin/messages", response_model=List[ContactMessage])
async def get_contact_messages(username: str = Depends(verify_credentials)):
    """Get all contact messages (admin only)"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

@api_router.put("/admin/messages/{message_id}/read")
async def mark_message_read(message_id: str, username: str = Depends(verify_credentials)):
    """Mark a message as read (admin only)"""
    result = await db.contact_messages.update_one({"id": message_id}, {"$set": {"read": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"success": True}

@api_router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, username: str = Depends(verify_credentials)):
    """Delete a contact message (admin only)"""
    result = await db.contact_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"deleted": True, "id": message_id}

# Stats for Admin Dashboard
@api_router.get("/admin/stats")
async def get_admin_stats(username: str = Depends(verify_credentials)):
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
# SEED DATA
# =============================================================================

@api_router.post("/admin/seed")
async def seed_data(username: str = Depends(verify_credentials)):
    """Seed initial project data (admin only)"""
    
    # Check if projects already exist
    existing = await db.projects.count_documents({})
    if existing > 0:
        return {"message": "Database già popolato", "projects": existing}
    
    # Initial projects
    initial_projects = [
        {
            "id": str(uuid.uuid4()),
            "title": "Smart Building Dashboard",
            "client": "Navigandosky",
            "category": "Smart Building",
            "description": "Piattaforma di gestione edifici smart con gemelli digitali Matterport, monitoraggio manutenzioni e domotica integrata.",
            "image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
            "link": "https://buildingdash.preview.emergentagent.com",
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("Trivor API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
