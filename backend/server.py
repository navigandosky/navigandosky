from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
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
from emergentintegrations.llm.chat import LlmChat, UserMessage, ChatError
import shutil
import base64
import httpx
from bs4 import BeautifulSoup
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Admin credentials for CMS
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'tadasuni2025')

# Chatbot Admin credentials
CHATBOT_ADMIN_USERNAME = os.environ.get('CHATBOT_ADMIN_USERNAME', 'chatbotadmin')
CHATBOT_ADMIN_PASSWORD = os.environ.get('CHATBOT_ADMIN_PASSWORD', 'ChatBot2025$')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    language: str = "it"
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    consent: bool

class ContactResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    success: bool
    message: str

# Event/Article Models for CMS
class EventImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    caption: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_es: Optional[str] = None
    title_de: Optional[str] = None
    content: str
    content_en: Optional[str] = None
    content_fr: Optional[str] = None
    content_es: Optional[str] = None
    content_de: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = "evento"
    published: bool = True

class EventUpdate(BaseModel):
    title: Optional[str] = None
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_es: Optional[str] = None
    title_de: Optional[str] = None
    content: Optional[str] = None
    content_en: Optional[str] = None
    content_fr: Optional[str] = None
    content_es: Optional[str] = None
    content_de: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    published: Optional[bool] = None

class EventResponse(BaseModel):
    id: str
    title: str
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_es: Optional[str] = None
    title_de: Optional[str] = None
    content: str
    content_en: Optional[str] = None
    content_fr: Optional[str] = None
    content_es: Optional[str] = None
    content_de: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    images: List[EventImage] = []
    published: bool = True
    created_at: str
    updated_at: str

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str

# Chatbot Knowledge Base Models
class ChatbotSourceCreate(BaseModel):
    url: str
    name: str
    description: Optional[str] = None
    auto_refresh: bool = False
    refresh_hours: int = 24

class ChatbotSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    auto_refresh: Optional[bool] = None
    refresh_hours: Optional[int] = None
    active: Optional[bool] = None

class ChatbotSourceResponse(BaseModel):
    id: str
    url: str
    name: str
    description: Optional[str] = None
    content: Optional[str] = None
    content_summary: Optional[str] = None
    auto_refresh: bool = False
    refresh_hours: int = 24
    active: bool = True
    last_fetched: Optional[str] = None
    created_at: str
    updated_at: str
    status: str = "pending"
    error_message: Optional[str] = None

class ChatbotCustomKnowledge(BaseModel):
    title: str
    content: str

class ChatbotSettingsUpdate(BaseModel):
    welcome_message: Optional[str] = None
    welcome_message_en: Optional[str] = None
    welcome_message_fr: Optional[str] = None
    welcome_message_es: Optional[str] = None
    welcome_message_de: Optional[str] = None
    system_prompt: Optional[str] = None
    bot_name: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None

# Tadasuni knowledge base
TADASUNI_CONTEXT = """
Tadasuni è un piccolissimo borgo della Sardegna centrale, situato nella regione storica del Barigadu, in provincia di Oristano.
È uno dei comuni meno popolosi dell'isola, con circa 150 abitanti.

POSIZIONE:
- Sorge su un rilievo collinare a circa 180 metri di altitudine
- Affacciato sul lago formato dalla diga di Santa Chiara sul fiume Tirso
- Panorama dominato dal Tirso e dal vicino Lago Omodeo
- Ambiente circondato da boschi, macchia mediterranea e campi coltivati

ATTRAZIONI PRINCIPALI:
1. Chiese:
   - Chiesa di Santa Croce (XVIII secolo)
   - Chiesa di San Nicola di Bari
   - Chiesa di San Michele

2. Luoghi di interesse:
   - Casa Pinna (edificio storico)
   - Monumento ai Caduti
   - Parco Comunale
   - Ceramiche artistiche tradizionali
   - Murales dell'Età Nuragica

3. Itinerari:
   - Itinerario delle Ceramiche
   - Itinerario delle Chiese
   - Giardini
   - Necropoli Sas Perderas

EVENTI:
- Dromos Festival: festival musicale internazionale che si tiene ad agosto
  - "Isole d'altri mari": tre giorni di musica, incontri e contaminazioni
  - Concerti in Piazza Santa Croce e nel Parco Comunale

COME ARRIVARE:
- Aeroporti: Cagliari, Olbia Costa Smeralda
- Strada: da Oristano o Nuoro
- Traghetto: da Olbia o Cagliari

SERVIZI NELLE VICINANZE:
- Terme di Fordongianus
- Banche: Unicredit, Intesa San Paolo, Banco di Sardegna
- Ufficio Postale
- Stazione ferroviaria
- Polizia
- Poliambulatorio

GEMELLO DIGITALE:
Tadasuni offre un tour virtuale 3D del borgo attraverso il Digital Twin di Fairsgate,
che permette di esplorare virtualmente le strade, le chiese e i luoghi di interesse.

PROGETTO "INVEST IN TADASUNI":
"Sognare, Credere, Fare" - un progetto per attirare nuovi residenti e investimenti nel borgo.
Slogan: "Tra lago, colline e tradizioni: la tua nuova vita comincia a Tadasuni"
"""

LANGUAGE_PROMPTS = {
    "it": "Rispondi sempre in italiano in modo cordiale e informativo.",
    "en": "Always respond in English in a friendly and informative manner.",
    "fr": "Répondez toujours en français de manière cordiale et informative.",
    "es": "Responde siempre en español de manera cordial e informativa.",
    "de": "Antworten Sie immer auf Deutsch auf freundliche und informative Weise."
}

@api_router.get("/")
async def root():
    return {"message": "Visit Tadasuni API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    language_instruction = LANGUAGE_PROMPTS.get(request.language, LANGUAGE_PROMPTS["it"])
    
    system_prompt = f"""Sei un assistente virtuale per Visit Tadasuni, il sito turistico del borgo di Tadasuni in Sardegna.
Usa le seguenti informazioni per rispondere alle domande:

{TADASUNI_CONTEXT}

{language_instruction}
Se non conosci la risposta, suggerisci di contattare il Comune di Tadasuni o visitare il gemello digitale.
Sii conciso ma completo nelle risposte."""
    
    # Build initial messages from history
    initial_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.history[-10:]:
        initial_messages.append({"role": msg.role, "content": msg.content})
    
    try:
        # Create chat instance with system message
        chat_instance = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_prompt,
            initial_messages=initial_messages
        ).with_model("openai", "gpt-4o-mini")
        
        # Send user message
        ai_response = await chat_instance.send_message(UserMessage(text=request.message))
        
        return ChatResponse(response=ai_response)
        
    except ChatError as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/contact", response_model=ContactResponse)
async def submit_contact(request: ContactRequest):
    if not request.consent:
        raise HTTPException(status_code=400, detail="Consent required")
    
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "message": request.message,
        "consent": request.consent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contacts.insert_one(contact_doc)
    
    return ContactResponse(
        id=contact_doc["id"],
        success=True,
        message="Message received successfully"
    )

@api_router.get("/contacts", response_model=List[dict])
async def get_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(100)
    return contacts

# ============== ADMIN AUTH ==============
@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLogin):
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        # Simple token generation (in production use JWT)
        token = base64.b64encode(f"{request.username}:{datetime.now().isoformat()}".encode()).decode()
        return AdminLoginResponse(success=True, token=token, message="Login successful")
    raise HTTPException(status_code=401, detail="Invalid credentials")

# ============== EVENTS CMS API ==============
@api_router.get("/events", response_model=List[EventResponse])
async def get_events(published_only: bool = True):
    """Get all events, optionally filtered by published status"""
    query = {"published": True} if published_only else {}
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return events

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    """Get a single event by ID"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate):
    """Create a new event"""
    now = datetime.now(timezone.utc).isoformat()
    event_doc = {
        "id": str(uuid.uuid4()),
        **event.model_dump(),
        "images": [],
        "created_at": now,
        "updated_at": now
    }
    await db.events.insert_one(event_doc)
    if "_id" in event_doc:
        del event_doc["_id"]
    return event_doc

@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event: EventUpdate):
    """Update an existing event"""
    existing = await db.events.find_one({"id": event_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in event.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete an event and its images"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete associated images
    for img in event.get("images", []):
        img_path = UPLOADS_DIR / img["url"].split("/")[-1]
        if img_path.exists():
            img_path.unlink()
    
    await db.events.delete_one({"id": event_id})
    return {"success": True, "message": "Event deleted"}

@api_router.post("/events/{event_id}/images")
async def upload_event_image(
    event_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None)
):
    """Upload an image for an event (max 3 images per event)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if len(event.get("images", [])) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images per event")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Add image to event
    image_data = {
        "id": str(uuid.uuid4()),
        "url": f"/uploads/{filename}",
        "caption": caption
    }
    
    await db.events.update_one(
        {"id": event_id},
        {
            "$push": {"images": image_data},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "image": image_data}

@api_router.delete("/events/{event_id}/images/{image_id}")
async def delete_event_image(event_id: str, image_id: str):
    """Delete an image from an event"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Find and delete the image file
    image_to_delete = None
    for img in event.get("images", []):
        if img["id"] == image_id:
            image_to_delete = img
            break
    
    if not image_to_delete:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete file from disk
    filename = image_to_delete["url"].split("/")[-1]
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        filepath.unlink()
    
    # Remove from database
    await db.events.update_one(
        {"id": event_id},
        {
            "$pull": {"images": {"id": image_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": "Image deleted"}

# Include router
app.include_router(api_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
