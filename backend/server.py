from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import aiofiles
import base64
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create directories for uploads
UPLOAD_DIR = ROOT_DIR / "uploads"
AUDIO_DIR = UPLOAD_DIR / "audio"
IMAGES_DIR = UPLOAD_DIR / "images"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Spoke Galaveras API")
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class Translation(BaseModel):
    it: str = ""
    en: str = ""
    fr: str = ""
    de: str = ""

class SpaceCreate(BaseModel):
    model_id: str
    name: Translation
    description: Translation
    cover_image: Optional[str] = None
    is_active: bool = True
    mpskin_url: Optional[str] = None  # URL alternativo per overlay (es. Mpskin)

class Space(SpaceCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class POICreate(BaseModel):
    space_id: str
    matterport_tag_id: Optional[str] = None
    name: Translation
    description: Translation
    audio_url: Optional[Dict[str, str]] = None  # {it: url, en: url, ...}
    position: Optional[Dict] = None  # x, y, z coordinates

class POI(POICreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CostumeCreate(BaseModel):
    id_risorsa: str
    description: Translation
    ricamatrice: Optional[str] = None
    proprieta: Optional[str] = None
    valore: Optional[str] = None
    data_realizzazione: Optional[str] = None
    photos: List[str] = []
    matterport_tag_id: Optional[str] = None
    space_id: Optional[str] = None
    audio_url: Optional[Dict[str, str]] = None

class Costume(CostumeCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectContent(BaseModel):
    content: Translation
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminLogin(BaseModel):
    username: str
    password: str

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "it"
    target_langs: List[str] = ["en", "fr", "de"]

class TTSRequest(BaseModel):
    text: str
    lang: str = "it"

# ============== AUTH ==============

ADMIN_USER = os.environ.get('ADMIN_USER', 'Galaveras2025')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Gala2025$')
MATTERPORT_API_TOKEN = os.environ.get('MATTERPORT_API_TOKEN', '24d3cb54e67b9246')

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    if credentials.username == ADMIN_USER and credentials.password == ADMIN_PASSWORD:
        return {"success": True, "token": "admin_authenticated"}
    raise HTTPException(status_code=401, detail="Credenziali non valide")

# ============== SPACES ==============

@api_router.get("/spaces", response_model=List[Space])
async def get_spaces():
    spaces = await db.spaces.find({}, {"_id": 0}).to_list(100)
    return spaces

@api_router.get("/spaces/{space_id}", response_model=Space)
async def get_space(space_id: str):
    space = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    if not space:
        raise HTTPException(status_code=404, detail="Spazio non trovato")
    return space

@api_router.post("/spaces", response_model=Space, status_code=201)
async def create_space(space_data: SpaceCreate):
    space = Space(**space_data.model_dump())
    await db.spaces.insert_one(space.model_dump())
    return space

@api_router.put("/spaces/{space_id}", response_model=Space)
async def update_space(space_id: str, space_data: SpaceCreate):
    existing = await db.spaces.find_one({"id": space_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Spazio non trovato")
    
    update_data = space_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.spaces.update_one({"id": space_id}, {"$set": update_data})
    updated = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    return updated

@api_router.delete("/spaces/{space_id}")
async def delete_space(space_id: str):
    result = await db.spaces.delete_one({"id": space_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Spazio non trovato")
    # Delete associated POIs
    await db.pois.delete_many({"space_id": space_id})
    return {"success": True}

# ============== POIs ==============

@api_router.get("/pois", response_model=List[POI])
async def get_pois(space_id: Optional[str] = None):
    query = {"space_id": space_id} if space_id else {}
    pois = await db.pois.find(query, {"_id": 0}).to_list(500)
    return pois

@api_router.get("/pois/{poi_id}", response_model=POI)
async def get_poi(poi_id: str):
    poi = await db.pois.find_one({"id": poi_id}, {"_id": 0})
    if not poi:
        raise HTTPException(status_code=404, detail="POI non trovato")
    return poi

@api_router.post("/pois", response_model=POI, status_code=201)
async def create_poi(poi_data: POICreate):
    poi = POI(**poi_data.model_dump())
    await db.pois.insert_one(poi.model_dump())
    return poi

@api_router.put("/pois/{poi_id}", response_model=POI)
async def update_poi(poi_id: str, poi_data: POICreate):
    existing = await db.pois.find_one({"id": poi_id})
    if not existing:
        raise HTTPException(status_code=404, detail="POI non trovato")
    
    update_data = poi_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pois.update_one({"id": poi_id}, {"$set": update_data})
    updated = await db.pois.find_one({"id": poi_id}, {"_id": 0})
    return updated

@api_router.delete("/pois/{poi_id}")
async def delete_poi(poi_id: str):
    result = await db.pois.delete_one({"id": poi_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="POI non trovato")
    return {"success": True}

# ============== MATTERPORT API IMPORT ==============

class ImportTagsRequest(BaseModel):
    space_id: str
    model_id: str

@api_router.post("/import-matterport-tags")
async def import_matterport_tags(request: ImportTagsRequest):
    """
    Importa i Mattertag da uno spazio Matterport via API.
    Usa l'API Graph di Matterport per recuperare i tag.
    """
    try:
        # Matterport API endpoint
        api_url = f"https://api.matterport.com/api/models/{request.model_id}"
        
        headers = {
            "Authorization": f"Bearer {MATTERPORT_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Try to get model data with mattertags
            response = await client.get(
                f"https://my.matterport.com/api/v1/player/models/{request.model_id}/mattertags",
                headers={"x-matterport-token": MATTERPORT_API_TOKEN},
                timeout=30.0
            )
            
            if response.status_code != 200:
                # Try alternative API endpoint
                response = await client.get(
                    f"https://api.matterport.com/api/models/{request.model_id}",
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                mattertags = data.get("mattertags", data.get("tags", []))
                
                if not mattertags:
                    # Return info about what we found
                    return {
                        "success": True,
                        "imported": 0,
                        "message": "Nessun tag trovato tramite API. Usa l'importazione manuale o SDK.",
                        "api_response": str(data)[:500]
                    }
                
                imported_count = 0
                skipped_count = 0
                
                for tag in mattertags:
                    tag_sid = tag.get("sid") or tag.get("id") or str(uuid.uuid4())
                    
                    # Check if already exists
                    existing = await db.pois.find_one({
                        "space_id": request.space_id,
                        "matterport_tag_id": tag_sid
                    })
                    
                    if existing:
                        skipped_count += 1
                        continue
                    
                    # Create POI from tag
                    label = tag.get("label") or tag.get("name") or f"Tag {tag_sid[:8]}"
                    description = tag.get("description") or ""
                    
                    poi_data = {
                        "id": str(uuid.uuid4()),
                        "space_id": request.space_id,
                        "matterport_tag_id": tag_sid,
                        "name": {
                            "it": label,
                            "en": label,
                            "fr": label,
                            "de": label
                        },
                        "description": {
                            "it": description,
                            "en": description,
                            "fr": description,
                            "de": description
                        },
                        "position": tag.get("anchorPosition") or tag.get("position"),
                        "audio_url": None,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.pois.insert_one(poi_data)
                    imported_count += 1
                
                return {
                    "success": True,
                    "imported": imported_count,
                    "skipped": skipped_count,
                    "message": f"Importati {imported_count} tag, {skipped_count} già esistenti"
                }
            else:
                return {
                    "success": False,
                    "message": f"Errore API Matterport: {response.status_code}",
                    "detail": response.text[:500]
                }
                
    except Exception as e:
        logging.error(f"Error importing Matterport tags: {e}")
        return {
            "success": False,
            "message": str(e)
        }

# ============== COSTUMES ==============

@api_router.get("/costumes", response_model=List[Costume])
async def get_costumes(search: Optional[str] = None, space_id: Optional[str] = None):
    query = {}
    if space_id:
        query["space_id"] = space_id
    if search:
        query["$or"] = [
            {"id_risorsa": {"$regex": search, "$options": "i"}},
            {"description.it": {"$regex": search, "$options": "i"}},
            {"ricamatrice": {"$regex": search, "$options": "i"}}
        ]
    costumes = await db.costumes.find(query, {"_id": 0}).to_list(500)
    return costumes

@api_router.get("/costumes/{costume_id}", response_model=Costume)
async def get_costume(costume_id: str):
    costume = await db.costumes.find_one({"id": costume_id}, {"_id": 0})
    if not costume:
        raise HTTPException(status_code=404, detail="Costume non trovato")
    return costume

@api_router.post("/costumes", response_model=Costume, status_code=201)
async def create_costume(costume_data: CostumeCreate):
    costume = Costume(**costume_data.model_dump())
    await db.costumes.insert_one(costume.model_dump())
    return costume

@api_router.put("/costumes/{costume_id}", response_model=Costume)
async def update_costume(costume_id: str, costume_data: CostumeCreate):
    existing = await db.costumes.find_one({"id": costume_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Costume non trovato")
    
    update_data = costume_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.costumes.update_one({"id": costume_id}, {"$set": update_data})
    updated = await db.costumes.find_one({"id": costume_id}, {"_id": 0})
    return updated

@api_router.delete("/costumes/{costume_id}")
async def delete_costume(costume_id: str):
    result = await db.costumes.delete_one({"id": costume_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Costume non trovato")
    return {"success": True}

# ============== PROJECT CONTENT ==============

class ProjectDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_type: str  # pdf, docx, xlsx, jpg
    description: str = ""
    url: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/project")
async def get_project():
    project = await db.project.find_one({"type": "main"}, {"_id": 0})
    if not project:
        return {"content": {"it": "", "en": "", "fr": "", "de": ""}, "documents": []}
    return project

@api_router.put("/project")
async def update_project(content: ProjectContent):
    await db.project.update_one(
        {"type": "main"},
        {"$set": {"content": content.content.model_dump() if hasattr(content.content, 'model_dump') else content.content, "updated_at": datetime.now(timezone.utc).isoformat(), "type": "main"}},
        upsert=True
    )
    return {"success": True}

# Upload documento progetto
@api_router.post("/project/documents")
async def upload_project_document(
    file: UploadFile = File(...),
    description: str = Form("")
):
    # Allowed file types
    allowed_types = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'image/jpeg': 'jpg',
        'image/png': 'png'
    }
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo file non supportato. Usa PDF, Word, Excel o immagini.")
    
    file_type = allowed_types[file.content_type]
    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}_{file.filename}"
    
    # Create documents directory
    docs_dir = UPLOAD_DIR / "documents"
    docs_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = docs_dir / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    doc = {
        "id": doc_id,
        "filename": filename,
        "original_name": file.filename,
        "file_type": file_type,
        "description": description,
        "url": f"/api/documents/{filename}",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to project documents array
    await db.project.update_one(
        {"type": "main"},
        {"$push": {"documents": doc}},
        upsert=True
    )
    
    return doc

# Get document
@api_router.get("/documents/{filename}")
async def serve_document(filename: str):
    filepath = UPLOAD_DIR / "documents" / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    # Determine media type
    ext = filename.split('.')[-1].lower()
    media_types = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    }
    
    return FileResponse(filepath, media_type=media_types.get(ext, 'application/octet-stream'))

# Delete document
@api_router.delete("/project/documents/{doc_id}")
async def delete_project_document(doc_id: str):
    project = await db.project.find_one({"type": "main"})
    if not project or "documents" not in project:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    doc = next((d for d in project.get("documents", []) if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Delete file
    filepath = UPLOAD_DIR / "documents" / doc["filename"]
    if filepath.exists():
        filepath.unlink()
    
    # Remove from database
    await db.project.update_one(
        {"type": "main"},
        {"$pull": {"documents": {"id": doc_id}}}
    )
    
    return {"success": True}

# ============== TRANSLATION SERVICE ==============

@api_router.post("/translate")
async def translate_text(request: TranslateRequest):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        results = {request.source_lang: request.text}
        
        lang_names = {
            "it": "Italian",
            "en": "English", 
            "fr": "French",
            "de": "German"
        }
        
        for target in request.target_langs:
            if target == request.source_lang:
                continue
                
            chat = LlmChat(
                api_key=api_key,
                session_id=f"translate_{uuid.uuid4()}",
                system_message=f"You are a professional translator. Translate the following text from {lang_names.get(request.source_lang, request.source_lang)} to {lang_names.get(target, target)}. Return ONLY the translated text, nothing else."
            ).with_model("openai", "gpt-4o-mini")
            
            response = await chat.send_message(UserMessage(text=request.text))
            results[target] = response.strip()
        
        return {"translations": results}
    except Exception as e:
        logging.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== TTS SERVICE ==============

@api_router.post("/tts")
async def generate_tts(request: TTSRequest):
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        # Select voice based on language
        voice_map = {
            "it": "nova",    # Warm female voice
            "en": "alloy",   # Neutral
            "fr": "shimmer", # Bright
            "de": "echo"     # Clear
        }
        
        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=request.text,
            model="tts-1",
            voice=voice_map.get(request.lang, "alloy")
        )
        
        # Save audio file
        filename = f"{uuid.uuid4()}_{request.lang}.mp3"
        filepath = AUDIO_DIR / filename
        
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(audio_bytes)
        
        return {"audio_url": f"/api/audio/{filename}"}
    except Exception as e:
        logging.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== FILE UPLOAD ==============

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = IMAGES_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/images/{filename}"}

@api_router.post("/upload/audio")
async def upload_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="Il file deve essere un audio")
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = AUDIO_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/audio/{filename}"}

# ============== SERVE STATIC FILES ==============

@api_router.get("/audio/{filename}")
async def serve_audio(filename: str):
    filepath = AUDIO_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(filepath, media_type="audio/mpeg")

@api_router.get("/images/{filename}")
async def serve_image(filename: str):
    filepath = IMAGES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(filepath)

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "Spoke Galaveras API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
