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

# Mount static files for uploads under /api/uploads so it works with Kubernetes ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBasic()

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Trivor2024$")

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

# Site Settings Model (for Hero images, etc.)
class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    hero_images: List[dict] = []  # List of {url, title}
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    hero_images: Optional[List[dict]] = None

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

# Download endpoint for files
from fastapi.responses import FileResponse

@api_router.get("/download/{filename}")
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

# Image Upload endpoint
@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), username: str = Depends(verify_credentials)):
    """Upload an image file (admin only)"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo file non supportato. Usa: JPG, PNG, GIF, WEBP"
        )
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")
    
    # Return the URL
    # The URL will be served via the /api/uploads static mount
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/{unique_filename}",
        "message": "Immagine caricata con successo"
    }

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

# Site Settings - Public endpoint
@api_router.get("/settings")
async def get_site_settings():
    """Get site settings (public)"""
    settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "id": "site_settings",
            "hero_images": [
                {"url": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1920&q=80", "title": "Costa Smeralda"},
                {"url": "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80", "title": "Grotte Marine"},
                {"url": "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80", "title": "Borghi Storici"}
            ]
        }
    return settings

# Site Settings - Admin endpoint
@api_router.put("/admin/settings")
async def update_site_settings(input: SiteSettingsUpdate, username: str = Depends(verify_credentials)):
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
            "link": "https://triv-dashboard.preview.emergentagent.com",
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

# =============================================================================
# TRIVORDOC - GESTIONE DOCUMENTALE
# =============================================================================

# TRIVORDOC Credentials
TRIVORDOC_USERNAME = "Trivor_doc"
TRIVORDOC_PASSWORD = "Doc_trivor$"
TRIVORDOC_DELETE_PASSWORD = "Docanc"

def verify_trivordoc_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, TRIVORDOC_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, TRIVORDOC_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali TRIVORDOC non valide",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# TRIVORDOC Models
class ProgettoSchema(BaseModel):
    descrizione: str = ""
    azione: str = ""
    cliente: str = ""
    valore: float = 0
    data_inizio: Optional[str] = None
    data_fine: Optional[str] = None

class AllegatoSchema(BaseModel):
    nome: str
    url: str
    tipo: str
    size: int

class DocumentoCreate(BaseModel):
    gruppo: str
    tipo_documento: str
    data_creazione: str
    autore: str
    keywords: List[str] = []
    categoria: str
    descrizione: str = ""
    progetto: Optional[ProgettoSchema] = None

class DocumentoUpdate(BaseModel):
    gruppo: Optional[str] = None
    tipo_documento: Optional[str] = None
    data_creazione: Optional[str] = None
    autore: Optional[str] = None
    keywords: Optional[List[str]] = None
    categoria: Optional[str] = None
    descrizione: Optional[str] = None
    progetto: Optional[ProgettoSchema] = None

class DeleteRequest(BaseModel):
    password: str

# Generate unique document ID
async def generate_doc_id():
    year = datetime.now().year
    count = await db.trivordoc_documents.count_documents({})
    return f"DOC-{year}-{str(count + 1).zfill(4)}"

# TRIVORDOC API Endpoints

@api_router.post("/trivordoc/login")
async def trivordoc_login(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify TRIVORDOC login"""
    if credentials.username == TRIVORDOC_USERNAME and credentials.password == TRIVORDOC_PASSWORD:
        return {"success": True, "message": "Login effettuato"}
    raise HTTPException(status_code=401, detail="Credenziali non valide")

@api_router.get("/trivordoc/documents")
async def get_documents(
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    tipo: Optional[str] = None,
    autore: Optional[str] = None,
    progetto: Optional[str] = None,
    data_da: Optional[str] = None,
    data_a: Optional[str] = None,
    keyword: Optional[str] = None,
    username: str = Depends(verify_trivordoc_credentials)
):
    """Get all documents with advanced filtering"""
    query = {}
    
    # Text search across multiple fields
    if search:
        query["$or"] = [
            {"gruppo": {"$regex": search, "$options": "i"}},
            {"descrizione": {"$regex": search, "$options": "i"}},
            {"autore": {"$regex": search, "$options": "i"}},
            {"keywords": {"$regex": search, "$options": "i"}},
            {"progetto.cliente": {"$regex": search, "$options": "i"}},
            {"progetto.descrizione": {"$regex": search, "$options": "i"}},
        ]
    
    if categoria and categoria != "all":
        query["categoria"] = categoria
    
    if tipo and tipo != "all":
        query["tipo_documento"] = tipo
    
    if autore:
        query["autore"] = {"$regex": autore, "$options": "i"}
    
    if progetto:
        query["progetto.cliente"] = {"$regex": progetto, "$options": "i"}
    
    if keyword:
        query["keywords"] = {"$in": [keyword]}
    
    if data_da:
        query["data_creazione"] = {"$gte": data_da}
    
    if data_a:
        if "data_creazione" in query:
            query["data_creazione"]["$lte"] = data_a
        else:
            query["data_creazione"] = {"$lte": data_a}
    
    documents = await db.trivordoc_documents.find(query, {"_id": 0}).sort("data_caricamento", -1).to_list(1000)
    return documents

@api_router.get("/trivordoc/documents/{doc_id}")
async def get_document(doc_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get single document by ID"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    return doc

@api_router.post("/trivordoc/documents")
async def create_document(documento: DocumentoCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create a new document"""
    doc_id = await generate_doc_id()
    
    doc_data = {
        "id": doc_id,
        **documento.model_dump(),
        "allegati": [],
        "data_caricamento": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivordoc_documents.insert_one(doc_data)
    
    # Log the action
    await db.trivordoc_logs.insert_one({
        "action": "CREATE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} creato"
    })
    
    # Add category if new
    if documento.categoria:
        await db.trivordoc_categories.update_one(
            {"name": documento.categoria},
            {"$set": {"name": documento.categoria}},
            upsert=True
        )
    
    return {"id": doc_id, "message": "Documento creato con successo"}

@api_router.put("/trivordoc/documents/{doc_id}")
async def update_document(doc_id: str, documento: DocumentoUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update a document"""
    update_data = {k: v for k, v in documento.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Log the action
    await db.trivordoc_logs.insert_one({
        "action": "UPDATE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} aggiornato"
    })
    
    # Add category if new
    if documento.categoria:
        await db.trivordoc_categories.update_one(
            {"name": documento.categoria},
            {"$set": {"name": documento.categoria}},
            upsert=True
        )
    
    updated = await db.trivordoc_documents.find_one({"id": doc_id}, {"_id": 0})
    return updated

@api_router.delete("/trivordoc/documents/{doc_id}")
async def delete_document(doc_id: str, request: DeleteRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Delete a document (requires deletion password)"""
    if request.password != TRIVORDOC_DELETE_PASSWORD:
        raise HTTPException(status_code=403, detail="Password di eliminazione non corretta")
    
    # Get document to delete its files
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Delete associated files
    for allegato in doc.get("allegati", []):
        file_path = UPLOADS_DIR / allegato["url"].split("/uploads/")[-1]
        if file_path.exists():
            file_path.unlink()
    
    # Delete document
    await db.trivordoc_documents.delete_one({"id": doc_id})
    
    # Log the action
    await db.trivordoc_logs.insert_one({
        "action": "DELETE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} eliminato"
    })
    
    return {"message": "Documento eliminato con successo"}

@api_router.post("/trivordoc/documents/{doc_id}/upload")
async def upload_attachment(
    doc_id: str,
    file: UploadFile = File(...),
    username: str = Depends(verify_trivordoc_credentials)
):
    """Upload an attachment to a document (max 5)"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    if len(doc.get("allegati", [])) >= 20:
        raise HTTPException(status_code=400, detail="Massimo 20 allegati per documento")
    
    # Save file
    file_ext = Path(file.filename).suffix.lower()
    file_id = str(uuid.uuid4())[:8]
    filename = f"trivordoc_{doc_id}_{file_id}{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Determine file type
    tipo_map = {
        ".pdf": "pdf",
        ".doc": "word", ".docx": "word",
        ".xls": "excel", ".xlsx": "excel",
        ".png": "immagine", ".jpg": "immagine", ".jpeg": "immagine", ".gif": "immagine",
        ".txt": "testo",
    }
    tipo = tipo_map.get(file_ext, "altro")
    
    allegato = {
        "nome": file.filename,
        "url": f"/uploads/{filename}",
        "tipo": tipo,
        "size": len(content)
    }
    
    await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {
            "$push": {"allegati": allegato},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Allegato caricato", "allegato": allegato}

@api_router.delete("/trivordoc/documents/{doc_id}/attachments/{filename}")
async def delete_attachment(doc_id: str, filename: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete an attachment from a document"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Remove from database
    await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {
            "$pull": {"allegati": {"nome": filename}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Allegato rimosso"}

@api_router.get("/trivordoc/categories")
async def get_categories(username: str = Depends(verify_trivordoc_credentials)):
    """Get all categories"""
    categories = await db.trivordoc_categories.find({}, {"_id": 0}).to_list(100)
    # Default categories
    defaults = ["Lettere", "Preventivi", "Ordini", "Fatture", "Contratti", "Progetti", "Altro"]
    existing = [c["name"] for c in categories]
    for d in defaults:
        if d not in existing:
            categories.append({"name": d})
    return categories

@api_router.post("/trivordoc/categories")
async def add_category(name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Add a new category"""
    await db.trivordoc_categories.update_one(
        {"name": name},
        {"$set": {"name": name}},
        upsert=True
    )
    return {"message": "Categoria aggiunta"}

@api_router.get("/trivordoc/stats")
async def get_stats(username: str = Depends(verify_trivordoc_credentials)):
    """Get dashboard statistics"""
    total_docs = await db.trivordoc_documents.count_documents({})
    
    # Documents by category
    pipeline_cat = [
        {"$group": {"_id": "$categoria", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_category = await db.trivordoc_documents.aggregate(pipeline_cat).to_list(20)
    
    # Documents by type
    pipeline_type = [
        {"$group": {"_id": "$tipo_documento", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type = await db.trivordoc_documents.aggregate(pipeline_type).to_list(20)
    
    # Top keywords
    pipeline_keywords = [
        {"$unwind": "$keywords"},
        {"$group": {"_id": "$keywords", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    top_keywords = await db.trivordoc_documents.aggregate(pipeline_keywords).to_list(20)
    
    # Recent documents
    recent = await db.trivordoc_documents.find({}, {"_id": 0}).sort("data_caricamento", -1).limit(5).to_list(5)
    
    # Top clients/projects
    pipeline_clients = [
        {"$match": {"progetto.cliente": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$progetto.cliente", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_clients = await db.trivordoc_documents.aggregate(pipeline_clients).to_list(10)
    
    return {
        "total_documents": total_docs,
        "by_category": by_category,
        "by_type": by_type,
        "top_keywords": top_keywords,
        "recent_documents": recent,
        "top_clients": top_clients
    }

@api_router.get("/trivordoc/keywords")
async def get_keywords(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique keywords for autocomplete"""
    pipeline = [
        {"$unwind": "$keywords"},
        {"$group": {"_id": "$keywords"}},
        {"$sort": {"_id": 1}}
    ]
    keywords = await db.trivordoc_documents.aggregate(pipeline).to_list(500)
    return [k["_id"] for k in keywords]

@api_router.get("/trivordoc/authors")
async def get_authors(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique authors for autocomplete"""
    pipeline = [
        {"$group": {"_id": "$autore"}},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$sort": {"_id": 1}}
    ]
    authors = await db.trivordoc_documents.aggregate(pipeline).to_list(100)
    return [a["_id"] for a in authors]

@api_router.get("/trivordoc/logs")
async def get_logs(limit: int = 50, username: str = Depends(verify_trivordoc_credentials)):
    """Get recent activity logs"""
    logs = await db.trivordoc_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# =============================================================================
# CHECKDB - DATABASE MONITORING
# =============================================================================

@api_router.get("/checkdb/databases")
async def get_all_databases(username: str = Depends(verify_trivordoc_credentials)):
    """Get list of all databases in the cluster"""
    try:
        # List all databases - need to convert cursor to list
        db_list = await client.list_database_names()
        databases = []
        
        for db_name in db_list:
            if db_name not in ["admin", "local", "config"]:
                # Get database stats for size info
                try:
                    target_db = client[db_name]
                    db_stats = await target_db.command("dbStats")
                    databases.append({
                        "name": db_name,
                        "sizeOnDisk": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                        "empty": db_stats.get("objects", 0) == 0
                    })
                except Exception:
                    databases.append({
                        "name": db_name,
                        "sizeOnDisk": 0,
                        "empty": True
                    })
        
        return {
            "databases": sorted(databases, key=lambda x: x["name"]),
            "count": len(databases)
        }
    except Exception as e:
        return {"error": str(e), "databases": [], "count": 0}

@api_router.get("/checkdb/database/{db_name}/status")
async def get_specific_db_status(db_name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get status for a specific database"""
    try:
        # Connect to the specific database
        target_db = client[db_name]
        
        # Get database stats
        db_stats = await target_db.command("dbStats")
        
        # Get all collections
        collections = await target_db.list_collection_names()
        
        # Get stats for each collection
        collection_stats = []
        for coll_name in collections:
            try:
                coll_stats = await target_db.command("collStats", coll_name)
                collection_stats.append({
                    "name": coll_name,
                    "count": coll_stats.get("count", 0),
                    "size": coll_stats.get("size", 0),
                    "avgObjSize": coll_stats.get("avgObjSize", 0),
                    "storageSize": coll_stats.get("storageSize", 0),
                    "totalIndexSize": coll_stats.get("totalIndexSize", 0),
                    "nindexes": coll_stats.get("nindexes", 0),
                })
            except Exception as e:
                collection_stats.append({
                    "name": coll_name,
                    "count": await target_db[coll_name].count_documents({}),
                    "size": 0,
                    "error": str(e)
                })
        
        # Sort by size descending
        collection_stats.sort(key=lambda x: x.get("size", 0), reverse=True)
        
        return {
            "database": {
                "name": db_name,
                "collections": len(collections),
                "dataSize": db_stats.get("dataSize", 0),
                "storageSize": db_stats.get("storageSize", 0),
                "indexSize": db_stats.get("indexSize", 0),
                "totalSize": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                "objects": db_stats.get("objects", 0),
                "avgObjSize": db_stats.get("avgObjSize", 0),
            },
            "collections": collection_stats,
        }
    except Exception as e:
        return {"error": str(e), "database": {"name": db_name}, "collections": []}

@api_router.get("/checkdb/status")
async def get_db_status(username: str = Depends(verify_trivordoc_credentials)):
    """Get comprehensive database status and statistics"""
    try:
        # Get database stats
        db_stats = await db.command("dbStats")
        
        # Get all collections
        collections = await db.list_collection_names()
        
        # Get stats for each collection
        collection_stats = []
        for coll_name in collections:
            try:
                coll_stats = await db.command("collStats", coll_name)
                collection_stats.append({
                    "name": coll_name,
                    "count": coll_stats.get("count", 0),
                    "size": coll_stats.get("size", 0),
                    "avgObjSize": coll_stats.get("avgObjSize", 0),
                    "storageSize": coll_stats.get("storageSize", 0),
                    "totalIndexSize": coll_stats.get("totalIndexSize", 0),
                    "nindexes": coll_stats.get("nindexes", 0),
                })
            except Exception as e:
                collection_stats.append({
                    "name": coll_name,
                    "count": await db[coll_name].count_documents({}),
                    "size": 0,
                    "error": str(e)
                })
        
        # Sort by size descending
        collection_stats.sort(key=lambda x: x.get("size", 0), reverse=True)
        
        return {
            "database": {
                "name": db.name,
                "collections": len(collections),
                "dataSize": db_stats.get("dataSize", 0),
                "storageSize": db_stats.get("storageSize", 0),
                "indexSize": db_stats.get("indexSize", 0),
                "totalSize": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                "objects": db_stats.get("objects", 0),
                "avgObjSize": db_stats.get("avgObjSize", 0),
            },
            "collections": collection_stats,
            "server_info": {
                "ok": db_stats.get("ok", 0),
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "database": {"name": db.name},
            "collections": []
        }

@api_router.get("/checkdb/collections/{collection_name}")
async def get_collection_details(collection_name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get detailed info about a specific collection"""
    try:
        # Get sample documents
        samples = await db[collection_name].find({}, {"_id": 0}).limit(5).to_list(5)
        
        # Get count
        count = await db[collection_name].count_documents({})
        
        # Get indexes
        indexes = []
        async for idx in db[collection_name].list_indexes():
            indexes.append({
                "name": idx.get("name"),
                "key": dict(idx.get("key", {})),
                "unique": idx.get("unique", False)
            })
        
        return {
            "name": collection_name,
            "count": count,
            "indexes": indexes,
            "sample_documents": samples,
            "fields": list(samples[0].keys()) if samples else []
        }
    except Exception as e:
        return {"error": str(e)}

@api_router.get("/checkdb/health")
async def get_db_health(username: str = Depends(verify_trivordoc_credentials)):
    """Quick health check of database connection"""
    try:
        # Ping the database
        await client.admin.command('ping')
        
        # Get server status
        server_info = await client.server_info()
        
        return {
            "status": "healthy",
            "connected": True,
            "server_version": server_info.get("version", "unknown"),
            "database": db.name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Include the router in the main app (after all routes are defined)
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Trivor API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
