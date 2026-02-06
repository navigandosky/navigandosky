from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Body
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import aiofiles
import httpx
import PyPDF2
import io
import json
import qrcode
from urllib.parse import quote
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import lru_cache
import time


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Simple in-memory cache for SmartThings API
class SmartThingsCache:
    def __init__(self, ttl_seconds=120):
        self.ttl = ttl_seconds
        self._cache = {}
        self._timestamps = {}
    
    def get(self, key):
        if key in self._cache:
            if time.time() - self._timestamps.get(key, 0) < self.ttl:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None
    
    def set(self, key, value):
        self._cache[key] = value
        self._timestamps[key] = time.time()
    
    def clear(self):
        self._cache.clear()
        self._timestamps.clear()

smartthings_cache = SmartThingsCache(ttl_seconds=120)  # 2 minutes cache

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'smartbuilding')]

# Create the main app without a prefix
app = FastAPI(title="SmartBuilding API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Default user ID for single-user mode (multi-tenant ready)
DEFAULT_USER_ID = "default-user"

# Matterport Space ID (can be configured per user in multi-tenant mode)
MATTERPORT_SPACE_ID = os.environ.get('MATTERPORT_SPACE_ID', 'SxQL3iGyoDo')


# Helper function to get user from session token
async def get_user_from_token(token: Optional[str]) -> dict:
    """Get user info from session token. Returns default user if no token."""
    if not token:
        return {"id": DEFAULT_USER_ID, "username": "default", "role": "user", "matterport_space_id": None}
    
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        return {"id": DEFAULT_USER_ID, "username": "default", "role": "user", "matterport_space_id": None}
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        return {"id": DEFAULT_USER_ID, "username": "default", "role": "user", "matterport_space_id": None}
    
    return {
        "id": user.get("id", DEFAULT_USER_ID),
        "username": user.get("username", "default"),
        "role": user.get("role", "user"),
        "matterport_space_id": user.get("matterport_space_id"),
        "matterport_space_name": user.get("matterport_space_name")
    }


# OpenAI client for AI Assistant (using Emergent LLM Key via emergentintegrations)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Import emergentintegrations for LLM
from emergentintegrations.llm.openai import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAITextToSpeech

# Directory for uploaded manuals
MANUALS_DIR = ROOT_DIR / "manuals"
MANUALS_DIR.mkdir(exist_ok=True)

# Directory for QR codes
QRCODES_DIR = ROOT_DIR / "qrcodes"
QRCODES_DIR.mkdir(exist_ok=True)

# Directory for floor plans (planimetrie)
PLANIMETRIE_DIR = ROOT_DIR / "planimetrie"
PLANIMETRIE_DIR.mkdir(exist_ok=True)

# Directory for POI files (audio, attachments)
POI_FILES_DIR = ROOT_DIR / "poi_files"
POI_FILES_DIR.mkdir(exist_ok=True)
POI_AUDIO_DIR = POI_FILES_DIR / "audio"
POI_AUDIO_DIR.mkdir(exist_ok=True)
POI_ATTACHMENTS_DIR = POI_FILES_DIR / "attachments"
POI_ATTACHMENTS_DIR.mkdir(exist_ok=True)

# Email configuration (optional - can be configured via env)
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', '')

# Frontend URL for QR codes
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://smarthome3d.preview.emergentagent.com')


# ============== ENUMS ==============

class CategoriaElettrodomestico(str, Enum):
    CUCINA = "cucina"
    LAVANDERIA = "lavanderia"
    CLIMATIZZAZIONE = "climatizzazione"
    INTRATTENIMENTO = "intrattenimento"
    ILLUMINAZIONE = "illuminazione"
    PULIZIA = "pulizia"
    SICUREZZA = "sicurezza"
    ALTRO = "altro"


class SmartPlugProvider(str, Enum):
    SMARTTHINGS = "smartthings"
    EWELINK = "ewelink"
    TUYA = "tuya"
    SHELLY = "shelly"
    TAPO = "tapo"
    MEROSS = "meross"
    ALTRO = "altro"
    NESSUNO = "nessuno"


class StatoManutenzione(str, Enum):
    """Stati unificati per Manutenzioni e Ticket"""
    APERTO = "aperto"           # Nuovo/Pianificato
    CONTATTATO = "contattato"   # Centro assistenza contattato
    IN_LAVORAZIONE = "in_lavorazione"  # Lavoro in corso
    COMPLETATO = "completato"   # Risolto/Completato
    ANNULLATO = "annullato"     # Annullato

# Alias per retrocompatibilità
StatoTicket = StatoManutenzione


class TipoManutenzione(str, Enum):
    ORDINARIA = "ordinaria"
    STRAORDINARIA = "straordinaria"
    RIPARAZIONE = "riparazione"
    CONTROLLO = "controllo"
    PULIZIA = "pulizia"
    SOSTITUZIONE = "sostituzione"


# ============== MODELS ==============

# Centro Assistenza
class CentroAssistenzaBase(BaseModel):
    nome_azienda: str
    referente: Optional[str] = None
    telefono: str
    email: Optional[str] = None
    indirizzo: Optional[str] = None
    specializzazioni: List[str] = []
    note: Optional[str] = None


class CentroAssistenzaCreate(CentroAssistenzaBase):
    pass


class CentroAssistenzaUpdate(BaseModel):
    nome_azienda: Optional[str] = None
    referente: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    indirizzo: Optional[str] = None
    specializzazioni: Optional[List[str]] = None
    note: Optional[str] = None


class CentroAssistenza(CentroAssistenzaBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Elettrodomestico
class ElettrodomesticoBase(BaseModel):
    nome: str
    marca: Optional[str] = None
    modello: Optional[str] = None
    numero_serie: Optional[str] = None
    categoria: CategoriaElettrodomestico = CategoriaElettrodomestico.ALTRO
    categoria_custom: Optional[str] = None  # Per categorie aggiunte dall'utente
    posizione: Optional[str] = None
    data_acquisto: Optional[str] = None
    data_scadenza_garanzia: Optional[str] = None
    # Costi e valore
    costo_acquisto: Optional[float] = None
    valore_attuale: Optional[float] = None
    # Documenti acquisto
    fattura_url: Optional[str] = None
    documenti_acquisto: List[str] = []
    # Consumi energetici
    consumo_orario_kw: float = 0.0
    ore_uso_giornaliero_stimate: float = 0.0
    # Smart Plug / SmartThings
    smart_plug_provider: SmartPlugProvider = SmartPlugProvider.NESSUNO
    smart_plug_id: Optional[str] = None
    smartthings_device_id: Optional[str] = None  # Collegamento a dispositivo SmartThings
    smartthings_device_name: Optional[str] = None
    # Marca custom
    marca_custom: Optional[str] = None  # Per marche non in lista
    # Centro assistenza
    centro_assistenza_id: Optional[str] = None
    # Matterport
    matterport_tag_id: Optional[str] = None
    # Foto e media
    foto_url: Optional[str] = None
    foto_lista: List[str] = []
    # Manuali e documentazione
    manuali_urls: List[str] = []  # Upload manuali PDF
    manuale_link_sito: Optional[str] = None  # Link al sito del manuale
    video_istruzioni: List[str] = []  # Video istruzioni pratiche
    pdf_istruzioni: List[str] = []  # PDF istruzioni pratiche
    # Extra
    documenti: List[str] = []
    note: Optional[str] = None


class ElettrodomesticoCreate(ElettrodomesticoBase):
    pass


class ElettrodomesticoUpdate(BaseModel):
    nome: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    numero_serie: Optional[str] = None
    categoria: Optional[CategoriaElettrodomestico] = None
    categoria_custom: Optional[str] = None
    posizione: Optional[str] = None
    data_acquisto: Optional[str] = None
    data_scadenza_garanzia: Optional[str] = None
    costo_acquisto: Optional[float] = None
    valore_attuale: Optional[float] = None
    fattura_url: Optional[str] = None
    documenti_acquisto: Optional[List[str]] = None
    consumo_orario_kw: Optional[float] = None
    ore_uso_giornaliero_stimate: Optional[float] = None
    smart_plug_provider: Optional[SmartPlugProvider] = None
    smart_plug_id: Optional[str] = None
    smartthings_device_id: Optional[str] = None
    smartthings_device_name: Optional[str] = None
    marca_custom: Optional[str] = None
    centro_assistenza_id: Optional[str] = None
    matterport_tag_id: Optional[str] = None
    foto_url: Optional[str] = None
    foto_lista: Optional[List[str]] = None
    manuali_urls: Optional[List[str]] = None
    manuale_link_sito: Optional[str] = None
    video_istruzioni: Optional[List[str]] = None
    pdf_istruzioni: Optional[List[str]] = None
    documenti: Optional[List[str]] = None
    note: Optional[str] = None


class Elettrodomestico(ElettrodomesticoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ElettrodomesticoConDettagli(Elettrodomestico):
    """Elettrodomestico con dettagli centro assistenza e consumi calcolati"""
    centro_assistenza: Optional[CentroAssistenza] = None
    consumo_giornaliero_kw: float = 0.0
    consumo_mensile_kw: float = 0.0
    consumo_annuale_kw: float = 0.0
    smart_plug_online: Optional[bool] = None
    smart_plug_potenza_attuale: Optional[float] = None


# Manutenzione
class ManutenzioneBase(BaseModel):
    elettrodomestico_id: Optional[str] = None
    tipo: TipoManutenzione = TipoManutenzione.ORDINARIA
    descrizione: str
    data_programmata: Optional[str] = None
    data_completamento: Optional[str] = None
    stato: StatoManutenzione = StatoManutenzione.APERTO
    costo: Optional[float] = None
    # Centro assistenza (usa quello dell'elettrodomestico o uno specifico)
    usa_centro_assistenza_elettrodomestico: bool = True
    centro_assistenza_id: Optional[str] = None  # Se non usa quello dell'elettrodomestico
    # Ricorrenza
    ricorrente: bool = False
    frequenza_giorni: Optional[int] = None
    # Campi aggiuntivi allineati con Ticket
    priorita: Optional[str] = "media"
    titolo: Optional[str] = None  # Titolo breve
    contatto_preferito: Optional[str] = None
    valutazione: Optional[int] = None  # 1-5 stelle
    note_risoluzione: Optional[str] = None
    # Extra
    documenti: List[str] = []
    note: Optional[str] = None
    # Collegamento Ticket
    ticket_id: Optional[str] = None


class ManutenzioneCreate(ManutenzioneBase):
    crea_ticket_automatico: bool = False


class ManutenzioneUpdate(BaseModel):
    elettrodomestico_id: Optional[str] = None
    tipo: Optional[TipoManutenzione] = None
    descrizione: Optional[str] = None
    data_programmata: Optional[str] = None
    data_completamento: Optional[str] = None
    stato: Optional[StatoManutenzione] = None
    costo: Optional[float] = None
    usa_centro_assistenza_elettrodomestico: Optional[bool] = None
    centro_assistenza_id: Optional[str] = None
    ricorrente: Optional[bool] = None
    frequenza_giorni: Optional[int] = None
    documenti: Optional[List[str]] = None
    note: Optional[str] = None


class Manutenzione(ManutenzioneBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ManutenzioneConDettagli(Manutenzione):
    """Manutenzione con dettagli elettrodomestico e centro assistenza"""
    elettrodomestico: Optional[Elettrodomestico] = None
    centro_assistenza: Optional[CentroAssistenza] = None


# Dashboard / Statistics
class ConsumiTotali(BaseModel):
    consumo_giornaliero_kw: float = 0.0
    consumo_mensile_kw: float = 0.0
    consumo_annuale_kw: float = 0.0
    costo_stimato_mensile_euro: float = 0.0  # Assumendo 0.25€/kWh
    costo_stimato_annuale_euro: float = 0.0
    numero_elettrodomestici: int = 0
    elettrodomestici_smart_online: int = 0


class DashboardStats(BaseModel):
    consumi: ConsumiTotali
    manutenzioni_pianificate: int = 0
    manutenzioni_in_scadenza: int = 0  # Prossimi 7 giorni
    elettrodomestici_in_garanzia: int = 0
    elettrodomestici_garanzia_scaduta: int = 0


# ============== TICKET MODELS ==============

class PrioritaTicket(str, Enum):
    BASSA = "bassa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


class TicketBase(BaseModel):
    elettrodomestico_id: str
    titolo: str
    descrizione: str
    priorita: PrioritaTicket = PrioritaTicket.MEDIA
    centro_assistenza_id: Optional[str] = None
    contatto_preferito: str = "email"  # "email", "whatsapp", "telefono"
    note_interne: Optional[str] = None
    # Campi allineati con Manutenzione
    tipo: Optional[str] = "riparazione"  # ordinaria, straordinaria, riparazione, controllo
    data_programmata: Optional[str] = None  # Data prevista intervento
    data_completamento: Optional[str] = None  # Alias di data_risoluzione


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    titolo: Optional[str] = None
    descrizione: Optional[str] = None
    stato: Optional[StatoTicket] = None
    priorita: Optional[PrioritaTicket] = None
    centro_assistenza_id: Optional[str] = None
    contatto_preferito: Optional[str] = None
    note_interne: Optional[str] = None
    tipo: Optional[str] = None
    data_programmata: Optional[str] = None
    data_contatto: Optional[str] = None
    data_intervento: Optional[str] = None
    data_risoluzione: Optional[str] = None
    data_completamento: Optional[str] = None
    costo_intervento: Optional[float] = None
    valutazione: Optional[int] = None  # 1-5
    note_risoluzione: Optional[str] = None


class Ticket(TicketBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    stato: StatoTicket = StatoTicket.APERTO
    numero_ticket: str = ""  # Generato automaticamente
    data_contatto: Optional[str] = None
    data_intervento: Optional[str] = None
    data_risoluzione: Optional[str] = None
    costo_intervento: Optional[float] = None
    valutazione: Optional[int] = None
    note_risoluzione: Optional[str] = None
    manutenzione_id: Optional[str] = None  # Collegamento a manutenzione creata
    messaggi_inviati: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketConDettagli(Ticket):
    """Ticket con dettagli elettrodomestico e centro assistenza"""
    elettrodomestico: Optional[Dict] = None
    centro_assistenza: Optional[Dict] = None


# Calendar Event Model
class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    tipo: str  # "manutenzione", "garanzia", "ticket"
    color: str
    extendedProps: Dict[str, Any] = {}


# ============== PLANIMETRIA MODELS ==============

class PuntoMappa(BaseModel):
    """Posizione di un elettrodomestico sulla planimetria"""
    elettrodomestico_id: str
    x: float  # Percentuale 0-100
    y: float  # Percentuale 0-100
    label: Optional[str] = None


class PlanimetriaBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    piano: Optional[str] = None  # es. "Piano Terra", "Primo Piano"


class PlanimetriaCreate(PlanimetriaBase):
    pass


class Planimetria(PlanimetriaBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    filename: str = ""
    original_filename: str = ""
    punti: List[PuntoMappa] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== SUGGERIMENTI PROATTIVI MODELS ==============

class TipoSuggerimento(str, Enum):
    MANUTENZIONE = "manutenzione"
    GARANZIA = "garanzia"
    RISPARMIO = "risparmio"
    SICUREZZA = "sicurezza"
    SOSTITUZIONE = "sostituzione"


class PrioritaSuggerimento(str, Enum):
    INFO = "info"
    ATTENZIONE = "attenzione"
    URGENTE = "urgente"


class Suggerimento(BaseModel):
    id: str
    tipo: TipoSuggerimento
    priorita: PrioritaSuggerimento
    titolo: str
    messaggio: str
    elettrodomestico_id: Optional[str] = None
    elettrodomestico_nome: Optional[str] = None
    azione_suggerita: Optional[str] = None
    link_azione: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_doc(doc: dict) -> dict:
    """Serialize document for MongoDB"""
    for key, value in doc.items():
        doc[key] = serialize_datetime(value)
    return doc


def deserialize_datetime(doc: dict) -> dict:
    """Convert ISO strings back to datetime"""
    for key in ['created_at', 'updated_at']:
        if key in doc and isinstance(doc[key], str):
            doc[key] = datetime.fromisoformat(doc[key])
    return doc


async def generate_ticket_number() -> str:
    """Generate unique ticket number like TKT-2024-0001"""
    year = datetime.now().year
    count = await db.tickets.count_documents({"numero_ticket": {"$regex": f"^TKT-{year}"}})
    return f"TKT-{year}-{str(count + 1).zfill(4)}"


async def send_email_notification(to_email: str, subject: str, body_html: str) -> bool:
    """Send email notification"""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        logger.warning("SMTP not configured, skipping email")
        return False
    
    try:
        message = MIMEMultipart("alternative")
        message["From"] = SMTP_FROM or SMTP_USER
        message["To"] = to_email
        message["Subject"] = subject
        
        message.attach(MIMEText(body_html, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True
        )
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False


def generate_whatsapp_link(phone: str, message: str) -> str:
    """Generate WhatsApp click-to-chat link"""
    # Pulisci il numero di telefono
    clean_phone = ''.join(filter(str.isdigit, phone))
    if clean_phone.startswith('0'):
        clean_phone = '39' + clean_phone[1:]  # Italia
    elif not clean_phone.startswith('39'):
        clean_phone = '39' + clean_phone
    
    encoded_message = quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded_message}"


# ============== PROPERTY CONFIGURATION MODELS ==============

class CadastralData(BaseModel):
    """Dati catastali dell'immobile"""
    address: Optional[str] = None
    comune: Optional[str] = None
    provincia: Optional[str] = None
    cap: Optional[str] = None
    foglio: Optional[str] = None
    particella: Optional[str] = None
    subalterno: Optional[str] = None
    categoria: Optional[str] = None  # A/2, A/7, etc.
    rendita: Optional[float] = None
    superficie_mq: Optional[float] = None
    vani: Optional[int] = None
    classe_energetica: Optional[str] = None  # A, B, C, D, E, F, G
    anno_costruzione: Optional[int] = None
    note: Optional[str] = None


class MatterportConfig(BaseModel):
    """Configurazione Matterport"""
    space_id: str
    sdk_key: Optional[str] = None
    enabled: bool = True
    # Matterport Cloud API credentials (for persistent tags)
    api_client_id: Optional[str] = None
    api_client_secret: Optional[str] = None


class SmartThingsConfig(BaseModel):
    """Configurazione SmartThings"""
    enabled: bool = False
    token: Optional[str] = None
    location_id: Optional[str] = None  # "auto" per auto-detect


class EwelinkConfig(BaseModel):
    """Configurazione eWeLink"""
    enabled: bool = False
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    region: str = "eu"  # eu, us, cn, as
    # Legacy fields (deprecated, use OAuth2)
    email: Optional[str] = None
    password: Optional[str] = None


class EzvizConfig(BaseModel):
    """Configurazione Ezviz telecamere"""
    enabled: bool = False
    username: Optional[str] = None
    password: Optional[str] = None
    app_key: Optional[str] = None
    secret: Optional[str] = None
    region: str = "eu"


class WeatherConfig(BaseModel):
    """Configurazione meteo"""
    enabled: bool = True
    city: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class IntegrationsConfig(BaseModel):
    """Tutte le integrazioni smart home"""
    smartthings: SmartThingsConfig = SmartThingsConfig()
    ewelink: EwelinkConfig = EwelinkConfig()


class PropertyConfigBase(BaseModel):
    """Configurazione completa della proprietà"""
    name: str
    description: Optional[str] = None
    
    # Dati catastali
    cadastral: CadastralData = CadastralData()
    
    # Matterport
    matterport: Optional[MatterportConfig] = None
    
    # Integrazioni Smart Home
    integrations: IntegrationsConfig = IntegrationsConfig()
    
    # Telecamere
    ezviz: EzvizConfig = EzvizConfig()
    
    # Meteo
    weather: WeatherConfig = WeatherConfig()
    
    # Attivo
    is_active: bool = True


class PropertyConfigCreate(PropertyConfigBase):
    pass


class PropertyConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cadastral: Optional[CadastralData] = None
    matterport: Optional[MatterportConfig] = None
    integrations: Optional[IntegrationsConfig] = None
    ezviz: Optional[EzvizConfig] = None
    weather: Optional[WeatherConfig] = None
    is_active: Optional[bool] = None


class PropertyConfig(PropertyConfigBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== MATTERPORT SPACE & POI MODELS ==============

# Supported languages for translations
SUPPORTED_LANGUAGES = ["it", "en", "de", "fr", "es"]
LANGUAGE_NAMES = {
    "it": "Italiano",
    "en": "English", 
    "de": "Deutsch",
    "fr": "Français",
    "es": "Español"
}

class MatterportSpaceBase(BaseModel):
    """Matterport 3D Space configuration"""
    space_id: str  # Matterport space ID (e.g., "j1r4zUjanif")
    name: str  # Display name
    description: Optional[str] = None
    sdk_key: Optional[str] = None  # SDK key (can override global)
    thumbnail_url: Optional[str] = None
    is_active: bool = True  # Currently displayed space
    
class MatterportSpaceCreate(MatterportSpaceBase):
    pass

class MatterportSpaceUpdate(BaseModel):
    space_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sdk_key: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None

class MatterportSpace(MatterportSpaceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    poi_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# POI/Tag Translations model
class POITranslation(BaseModel):
    """Multilingual translation for a POI"""
    language: str  # Language code: it, en, de, fr, es
    title: str
    description: str
    audio_url: Optional[str] = None  # Generated TTS audio URL
    audio_generated_at: Optional[datetime] = None


# POI/Tag Position in 3D space
class POIPosition(BaseModel):
    """3D coordinates for POI placement"""
    model_config = ConfigDict(extra="ignore")
    x: float
    y: float
    z: float
    # Optional: floor info - can be int or string from Matterport
    floor_id: Optional[Any] = None
    floor_name: Optional[str] = None


# POI Attachment
class POIAttachment(BaseModel):
    """Attached file to a POI"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_type: str  # pdf, image, video, document
    file_url: str
    file_size: int = 0
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class POIBase(BaseModel):
    """Point of Interest linked to Matterport Tag"""
    space_id: str  # Reference to MatterportSpace.id
    matterport_tag_id: Optional[str] = None  # Original Matterport tag ID (if imported)
    nearest_sweep_id: Optional[str] = None  # Nearest sweep ID for navigation fallback
    smartthings_device_id: Optional[str] = None  # SmartThings device ID for status
    
    # Position (from Matterport or manually set)
    position: Optional[POIPosition] = None
    
    # Translations (5 languages)
    translations: List[POITranslation] = []
    
    # Linked entities
    elettrodomestico_id: Optional[str] = None
    
    # Attachments
    attachments: List[POIAttachment] = []
    
    # Metadata
    icon: Optional[str] = None  # Icon name/emoji
    color: Optional[Any] = None  # Hex color or RGB object for marker
    category: Optional[str] = "general"  # POI category
    is_imported: bool = False  # True if imported from Matterport
    is_visible: bool = True


class POICreate(POIBase):
    pass


class POIUpdate(BaseModel):
    space_id: Optional[str] = None
    matterport_tag_id: Optional[str] = None
    nearest_sweep_id: Optional[str] = None
    smartthings_device_id: Optional[str] = None
    position: Optional[POIPosition] = None
    translations: Optional[List[POITranslation]] = None
    elettrodomestico_id: Optional[str] = None
    attachments: Optional[List[POIAttachment]] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    is_imported: Optional[bool] = None
    is_visible: Optional[bool] = None


class POI(POIBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Matterport Cloud sync fields
    synced_to_cloud: Optional[bool] = False
    matterport_cloud_tag_id: Optional[str] = None


class POIWithDetails(POI):
    """POI with linked elettrodomestico details"""
    elettrodomestico: Optional[Elettrodomestico] = None
    space: Optional[MatterportSpace] = None


# Request models for translation and audio generation
class TranslationRequest(BaseModel):
    """Request to translate POI description"""
    source_language: str = "it"
    source_text: str
    target_languages: List[str] = ["en", "de", "fr", "es"]


class AudioGenerationRequest(BaseModel):
    """Request to generate TTS audio for a POI"""
    poi_id: str
    languages: List[str] = ["it", "en", "de", "fr", "es"]
    voice: str = "alloy"  # OpenAI TTS voice
    model: str = "tts-1"  # tts-1 or tts-1-hd


# ============== SENSOR HISTORY MODELS ==============

class SensorReading(BaseModel):
    """Single sensor reading"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    device_name: Optional[str] = None
    poi_id: Optional[str] = None  # Link to POI if available
    sensor_type: str  # "temperature", "humidity", "power", "energy", "battery", "motion", "contact"
    value: float
    unit: str = ""  # "C", "%", "W", "kWh", etc.
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str = DEFAULT_USER_ID


class SensorReadingCreate(BaseModel):
    """Create a sensor reading"""
    device_id: str
    device_name: Optional[str] = None
    poi_id: Optional[str] = None
    sensor_type: str
    value: float
    unit: str = ""


class SensorHistoryQuery(BaseModel):
    """Query parameters for sensor history"""
    device_id: Optional[str] = None
    poi_id: Optional[str] = None
    sensor_type: Optional[str] = None  # "temperature", "humidity", etc.
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    interval: str = "hour"  # "minute", "hour", "day", "week", "month"
    limit: int = 1000


class SensorStats(BaseModel):
    """Aggregated sensor statistics"""
    sensor_type: str
    device_id: str
    device_name: Optional[str] = None
    min_value: float
    max_value: float
    avg_value: float
    count: int
    unit: str
    period_start: datetime
    period_end: datetime


class SensorReport(BaseModel):
    """Complete sensor report with history and stats"""
    device_id: str
    device_name: Optional[str] = None
    sensor_type: str
    unit: str
    current_value: Optional[float] = None
    stats: Optional[SensorStats] = None
    readings: List[Dict[str, Any]] = []  # Time series data


# ============== USER / AUTH MODELS ==============

import hashlib
import secrets

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True
    matterport_space_id: Optional[str] = None
    matterport_space_name: Optional[str] = None
    mpskin_url: Optional[str] = None  # URL per tour MPSKIN (es: https://tour.fairsgate.com/it/tour/xxx)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    matterport_space_id: Optional[str] = None
    matterport_space_name: Optional[str] = None
    mpskin_url: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    """User response without password"""
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
    matterport_space_id: Optional[str] = None
    matterport_space_name: Optional[str] = None
    mpskin_url: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user: Optional[UserResponse] = None
    token: Optional[str] = None
    message: str = ""

class SessionToken(BaseModel):
    """Session token for authentication"""
    token: str
    user_id: str
    username: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))


# Helper functions for auth
def hash_password(password: str) -> str:
    """Hash password with SHA256 + salt"""
    salt = "smartdomo2026"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

def generate_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)


# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "SmartBuilding API v1.0.0"}


@api_router.get("/config")
async def get_config():
    """Get app configuration including Matterport space ID"""
    return {
        "matterport_space_id": MATTERPORT_SPACE_ID,
        "app_name": "SmartBuilding",
        "version": "1.0.0"
    }


# ------------ AUTHENTICATION / USERS ------------

@api_router.post("/auth/init-admin")
async def init_admin_user():
    """Initialize admin user if not exists (run once)"""
    existing = await db.users.find_one({"username": "Admin"})
    if existing:
        return {"message": "Admin già esistente", "admin_exists": True}
    
    admin_user = User(
        username="Admin",
        email="admin@smartdomo.local",
        full_name="Amministratore",
        role=UserRole.ADMIN,
        is_active=True,
        password_hash=hash_password("SmartMaster2026")
    )
    
    doc = serialize_doc(admin_user.model_dump())
    await db.users.insert_one(doc)
    
    return {"message": "Admin creato con successo", "admin_exists": True}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    """User login"""
    user = await db.users.find_one({"username": data.username}, {"_id": 0})
    
    if not user:
        return LoginResponse(success=False, message="Utente non trovato")
    
    if not user.get("is_active", True):
        return LoginResponse(success=False, message="Account disabilitato")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        return LoginResponse(success=False, message="Password errata")
    
    # Create session token
    token = generate_token()
    session = SessionToken(
        token=token,
        user_id=user["id"],
        username=user["username"],
        role=UserRole(user.get("role", "user"))
    )
    
    # Store session
    await db.sessions.delete_many({"user_id": user["id"]})  # Remove old sessions
    await db.sessions.insert_one(serialize_doc(session.model_dump()))
    
    user_response = UserResponse(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=UserRole(user.get("role", "user")),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at", datetime.now(timezone.utc)),
        matterport_space_id=user.get("matterport_space_id"),
        matterport_space_name=user.get("matterport_space_name"),
        mpskin_url=user.get("mpskin_url")
    )
    
    return LoginResponse(success=True, user=user_response, token=token, message="Login effettuato")


@api_router.post("/auth/logout")
async def logout(token: str = Query(...)):
    """User logout"""
    await db.sessions.delete_many({"token": token})
    return {"message": "Logout effettuato"}


@api_router.get("/auth/verify")
async def verify_session(token: str = Query(...)):
    """Verify session token"""
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    
    if not session:
        return {"valid": False, "message": "Sessione non valida"}
    
    # Check expiration
    expires_at = session.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if datetime.now(timezone.utc) > expires_at:
            await db.sessions.delete_one({"token": token})
            return {"valid": False, "message": "Sessione scaduta"}
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user or not user.get("is_active", True):
        return {"valid": False, "message": "Utente non valido"}
    
    return {
        "valid": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "matterport_space_id": user.get("matterport_space_id"),
            "matterport_space_name": user.get("matterport_space_name"),
            "mpskin_url": user.get("mpskin_url")
        }
    }


@api_router.get("/users", response_model=List[UserResponse])
async def get_users(token: str = Query(...)):
    """Get all users (admin only)"""
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session or session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [UserResponse(**u) for u in users]


@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, token: str = Query(...)):
    """Create a new user (admin only)"""
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session or session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin può creare utenti")
    
    # Check if username exists
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username già in uso")
    
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        is_active=data.is_active,
        password_hash=hash_password(data.password),
        matterport_space_id=data.matterport_space_id,
        matterport_space_name=data.matterport_space_name,
        mpskin_url=data.mpskin_url
    )
    
    doc = serialize_doc(user.model_dump())
    await db.users.insert_one(doc)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        matterport_space_id=user.matterport_space_id,
        matterport_space_name=user.matterport_space_name,
        mpskin_url=user.mpskin_url
    )


@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, token: str = Query(...)):
    """Update a user (admin only, or self)"""
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    # Admin can edit anyone, users can edit themselves
    is_admin = session.get("role") == "admin"
    is_self = session.get("user_id") == user_id
    
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Non-admin cannot change role
    if not is_admin and data.role is not None:
        data.role = None
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Hash password if provided
    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**user)


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, token: str = Query(...)):
    """Delete a user (admin only)"""
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session or session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin può eliminare utenti")
    
    # Cannot delete self
    if session.get("user_id") == user_id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Delete user sessions
    await db.sessions.delete_many({"user_id": user_id})
    
    return {"message": "Utente eliminato"}


# ------------ PROPERTY CONFIGURATION ------------

@api_router.post("/property", response_model=PropertyConfig)
async def create_property(data: PropertyConfigCreate):
    """Crea una nuova configurazione proprietà"""
    prop = PropertyConfig(**data.model_dump())
    doc = serialize_doc(prop.model_dump())
    await db.property_config.insert_one(doc)
    return prop


@api_router.get("/property", response_model=List[PropertyConfig])
async def get_properties(user_id: str = DEFAULT_USER_ID):
    """Ottiene tutte le proprietà dell'utente"""
    properties = await db.property_config.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(100)
    return [deserialize_datetime(p) for p in properties]


@api_router.get("/property/active", response_model=Optional[PropertyConfig])
async def get_active_property(token: Optional[str] = Query(None)):
    """Ottiene la proprietà attiva dell'utente corrente o la property globale attiva"""
    user = await get_user_from_token(token)
    user_id = user.get("id", DEFAULT_USER_ID)
    
    # First, try to find property for this specific user
    prop = await db.property_config.find_one(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    )
    
    # If not found, fallback to any active property (shared/global property)
    if not prop:
        prop = await db.property_config.find_one(
            {"is_active": True}, {"_id": 0}
        )
    
    if prop:
        return deserialize_datetime(prop)
    return None


@api_router.get("/property/{property_id}", response_model=PropertyConfig)
async def get_property(property_id: str):
    """Ottiene una proprietà specifica"""
    prop = await db.property_config.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Proprietà non trovata")
    return deserialize_datetime(prop)


@api_router.put("/property/{property_id}", response_model=PropertyConfig)
async def update_property(property_id: str, data: PropertyConfigUpdate):
    """Aggiorna una proprietà"""
    update_data = {}
    
    # Handle nested objects properly
    data_dict = data.model_dump(exclude_unset=True)
    for key, value in data_dict.items():
        if value is not None:
            if isinstance(value, dict):
                # For nested objects, update each field individually
                for nested_key, nested_value in value.items():
                    if nested_value is not None:
                        update_data[f"{key}.{nested_key}"] = nested_value
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.property_config.update_one(
        {"id": property_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proprietà non trovata")
    
    return await get_property(property_id)


@api_router.delete("/property/{property_id}")
async def delete_property(property_id: str):
    """Elimina una proprietà"""
    result = await db.property_config.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proprietà non trovata")
    return {"message": "Proprietà eliminata"}


@api_router.post("/property/init-from-env")
async def init_property_from_env(token: Optional[str] = Query(None)):
    """Inizializza una proprietà dai valori .env esistenti per l'utente corrente"""
    user = await get_user_from_token(token)
    user_id = user.get("id", DEFAULT_USER_ID)
    
    # Check if property already exists for this user
    existing = await db.property_config.find_one({"user_id": user_id}, {"_id": 0})
    if existing:
        return {"message": "Proprietà già esistente", "property": deserialize_datetime(existing)}
    
    # Also check for global active property and return it (shared property scenario)
    global_prop = await db.property_config.find_one({"is_active": True}, {"_id": 0})
    if global_prop:
        return {"message": "Proprietà globale disponibile", "property": deserialize_datetime(global_prop)}
    
    # Create property from env values
    prop = PropertyConfig(
        name="La Mia Proprietà",
        description="Proprietà principale",
        user_id=user_id,  # Set correct user_id
        matterport=MatterportConfig(
            space_id=user.get("matterport_space_id") or os.environ.get('MATTERPORT_SPACE_ID', 'j1r4zUjanif'),
            sdk_key=os.environ.get('MATTERPORT_SDK_KEY', ''),
            enabled=True
        ),
        integrations=IntegrationsConfig(
            smartthings=SmartThingsConfig(
                enabled=bool(os.environ.get('SMARTTHINGS_TOKEN')),
                token=os.environ.get('SMARTTHINGS_TOKEN', ''),
                location_id="auto"
            ),
            ewelink=EwelinkConfig(enabled=False)
        ),
        ezviz=EzvizConfig(
            enabled=bool(os.environ.get('EZVIZ_USERNAME')),
            username=os.environ.get('EZVIZ_USERNAME', ''),
            password=os.environ.get('EZVIZ_PASSWORD', ''),
            app_key=os.environ.get('EZVIZ_APPKEY', ''),
            secret=os.environ.get('EZVIZ_SECRET', ''),
            region=os.environ.get('EZVIZ_REGION', 'eu')
        ),
        weather=WeatherConfig(
            enabled=True,
            city=os.environ.get('WEATHER_CITY', 'Nuoro'),
            lat=float(os.environ.get('WEATHER_LAT', 40.3125)),
            lon=float(os.environ.get('WEATHER_LON', 9.3125))
        ),
        is_active=True
    )
    
    doc = serialize_doc(prop.model_dump())
    await db.property_config.insert_one(doc)
    
    return {"message": "Proprietà creata da configurazione esistente", "property": prop}


# ------------ CENTRI ASSISTENZA ------------

@api_router.post("/centri-assistenza", response_model=CentroAssistenza)
async def create_centro_assistenza(data: CentroAssistenzaCreate):
    centro = CentroAssistenza(**data.model_dump())
    doc = serialize_doc(centro.model_dump())
    await db.centri_assistenza.insert_one(doc)
    return centro


@api_router.get("/centri-assistenza", response_model=List[CentroAssistenza])
async def get_centri_assistenza(user_id: str = DEFAULT_USER_ID):
    centri = await db.centri_assistenza.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)
    return [deserialize_datetime(c) for c in centri]


# ------------ RICERCA CENTRI ASSISTENZA WEB (deve essere PRIMA di {centro_id}) ------------

# Lista brand principali elettrodomestici
BRAND_PRINCIPALI = [
    "Samsung", "LG", "Bosch", "Siemens", "Whirlpool", "Electrolux",
    "Miele", "AEG", "Philips", "Sony", "Panasonic", "Haier",
    "Candy", "Indesit", "Beko", "Hotpoint", "De'Longhi", "Smeg",
    "Daikin", "Mitsubishi", "Hisense", "TCL", "Ariston", "Zanussi",
    "Liebherr", "Gorenje", "Bauknecht", "Neff", "Gaggenau", "Teka",
    "Franke", "Rex", "Ignis", "Hoover", "Rowenta", "Tefal", "Moulinex",
    "Braun", "Dyson", "iRobot", "Roborock", "Xiaomi", "Huawei",
    "Apple", "Microsoft", "HP", "Dell", "Lenovo", "Asus", "Acer"
]

@api_router.get("/centri-assistenza/brands")
async def get_brand_list():
    """Get list of major appliance brands for search"""
    return {"brands": sorted(BRAND_PRINCIPALI)}


@api_router.get("/centri-assistenza/cerca-web")
async def cerca_centri_assistenza_web(
    marca: str = Query(..., description="Brand/marca da cercare"),
    localita: str = Query(..., description="Città o zona di ricerca")
):
    """
    Cerca centri assistenza tramite web search
    Restituisce risultati dalla ricerca web
    """
    try:
        # Costruisci query di ricerca
        search_query = f"centro assistenza {marca} {localita} Italia telefono indirizzo"
        
        # Restituisci link di ricerca diretti (più affidabile)
        results = [
            {
                "titolo": f"Cerca su Google: Centro Assistenza {marca} {localita}",
                "url": f"https://www.google.com/search?q=centro+assistenza+{quote(marca)}+{quote(localita)}",
                "descrizione": f"Clicca per cercare centri assistenza {marca} nella zona di {localita}",
                "marca": marca,
                "localita": localita,
                "tipo": "link_ricerca"
            },
            {
                "titolo": f"Google Maps - Assistenza {marca} vicino a {localita}",
                "url": f"https://www.google.com/maps/search/centro+assistenza+{quote(marca)}+{quote(localita)}",
                "descrizione": f"Trova centri assistenza {marca} su Google Maps con indicazioni stradali",
                "marca": marca,
                "localita": localita,
                "tipo": "link_ricerca"
            },
            {
                "titolo": f"Pagine Gialle - {marca} {localita}",
                "url": f"https://www.paginegialle.it/ricerca/assistenza%20{quote(marca)}/{quote(localita)}",
                "descrizione": f"Cerca su Pagine Gialle centri assistenza {marca}",
                "marca": marca,
                "localita": localita,
                "tipo": "link_ricerca"
            },
            {
                "titolo": f"Sito ufficiale {marca} - Assistenza Italia",
                "url": f"https://www.google.com/search?q={quote(marca)}+assistenza+clienti+italia+sito+ufficiale",
                "descrizione": f"Trova il sito ufficiale {marca} per assistenza e supporto",
                "marca": marca,
                "localita": localita,
                "tipo": "link_ricerca"
            },
            {
                "titolo": f"Numero Verde {marca}",
                "url": f"https://www.google.com/search?q={quote(marca)}+numero+verde+assistenza+clienti",
                "descrizione": f"Cerca il numero verde e contatti diretti {marca}",
                "marca": marca,
                "localita": localita,
                "tipo": "link_ricerca"
            }
        ]
        
        return {
            "query": f"{marca} {localita}",
            "risultati": results,
            "totale": len(results),
            "suggerimento": f"Clicca sui link per cercare centri assistenza {marca} a {localita}"
        }
        
    except Exception as e:
        logger.error(f"Errore ricerca centri assistenza: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella ricerca: {str(e)}")


# ------------ CENTRI ASSISTENZA - ROUTES CON ID ------------

@api_router.get("/centri-assistenza/{centro_id}", response_model=CentroAssistenza)
async def get_centro_assistenza(centro_id: str):
    centro = await db.centri_assistenza.find_one({"id": centro_id}, {"_id": 0})
    if not centro:
        raise HTTPException(status_code=404, detail="Centro assistenza non trovato")
    return deserialize_datetime(centro)


@api_router.put("/centri-assistenza/{centro_id}", response_model=CentroAssistenza)
async def update_centro_assistenza(centro_id: str, data: CentroAssistenzaUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.centri_assistenza.update_one(
        {"id": centro_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Centro assistenza non trovato")
    
    return await get_centro_assistenza(centro_id)


@api_router.delete("/centri-assistenza/{centro_id}")
async def delete_centro_assistenza(centro_id: str):
    result = await db.centri_assistenza.delete_one({"id": centro_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Centro assistenza non trovato")
    return {"message": "Centro assistenza eliminato"}


# ------------ ELETTRODOMESTICI ------------

@api_router.post("/elettrodomestici", response_model=Elettrodomestico)
async def create_elettrodomestico(data: dict = Body(...), token: Optional[str] = Query(None)):
    # Get user from token for multi-tenant
    user = await get_user_from_token(token)
    
    # Log for debugging
    logger.info(f"Creating elettrodomestico for user: {user['username']} (ID: {user['id'][:8]}...), token provided: {bool(token)}")
    
    # Handle custom categoria - any value starting with "custom" should map to "altro"
    categoria = data.get('categoria', '')
    if categoria and (categoria == 'custom' or categoria.startswith('custom_')):
        data['categoria'] = 'altro'
    
    # Set user_id from session
    data['user_id'] = user["id"]
    
    # Validate with Pydantic model
    try:
        validated_data = ElettrodomesticoCreate(**data)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    # Create Elettrodomestico with user_id from session
    elettrodomestico = Elettrodomestico(**validated_data.model_dump(), user_id=user["id"])
    doc = serialize_doc(elettrodomestico.model_dump())
    await db.elettrodomestici.insert_one(doc)
    return elettrodomestico


@api_router.get("/elettrodomestici", response_model=List[ElettrodomesticoConDettagli])
async def get_elettrodomestici(
    token: Optional[str] = Query(None),
    categoria: Optional[CategoriaElettrodomestico] = None
):
    # Get user from token for multi-tenant filtering
    user = await get_user_from_token(token)
    user_id = user["id"]
    
    query = {"user_id": user_id}
    if categoria:
        query["categoria"] = categoria.value
    
    elettrodomestici = await db.elettrodomestici.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for e in elettrodomestici:
        e = deserialize_datetime(e)
        
        # Calcola consumi
        consumo_orario = e.get('consumo_orario_kw', 0)
        ore_giorno = e.get('ore_uso_giornaliero_stimate', 0)
        consumo_giornaliero = consumo_orario * ore_giorno
        consumo_mensile = consumo_giornaliero * 30
        consumo_annuale = consumo_giornaliero * 365
        
        e['consumo_giornaliero_kw'] = round(consumo_giornaliero, 2)
        e['consumo_mensile_kw'] = round(consumo_mensile, 2)
        e['consumo_annuale_kw'] = round(consumo_annuale, 2)
        
        # Carica centro assistenza se presente
        if e.get('centro_assistenza_id'):
            centro = await db.centri_assistenza.find_one(
                {"id": e['centro_assistenza_id']}, {"_id": 0}
            )
            if centro:
                e['centro_assistenza'] = deserialize_datetime(centro)
        
        # Smart plug status (placeholder - da implementare con API reali)
        if e.get('smart_plug_id') and e.get('smart_plug_provider') != 'nessuno':
            e['smart_plug_online'] = None  # Da implementare
            e['smart_plug_potenza_attuale'] = None  # Da implementare
        
        result.append(e)
    
    return result


@api_router.get("/elettrodomestici/poi-sensors")
async def get_all_poi_sensors(token: Optional[str] = None):
    """
    Get live sensor data for ALL appliances that have a POI (matterport_tag_id).
    Returns a map of matterport_tag_id -> sensor data for displaying on 3D tags.
    MUST be defined BEFORE /{elettrodomestico_id} routes due to path matching order.
    """
    user = await get_user_from_token(token)
    
    # Find all appliances with POI and smart plug
    query = {
        "matterport_tag_id": {"$ne": None, "$exists": True},
        "$or": [
            {"smart_plug_id": {"$ne": None, "$exists": True}},
            {"smartthings_device_id": {"$ne": None, "$exists": True}}
        ]
    }
    if user["id"] != DEFAULT_USER_ID:
        query["user_id"] = user["id"]
    
    elettros = await db.elettrodomestici.find(query, {"_id": 0}).to_list(100)
    
    if not elettros:
        return {"poi_sensors": {}, "count": 0}
    
    # Get all device data at once
    try:
        devices_response = await get_devices_with_sensor_values()
        devices = devices_response.get("devices", [])
        sensors = devices_response.get("sensors", {})
        states = devices_response.get("states", {})
        
        # Build device lookup
        device_lookup = {d.get("id"): d for d in devices}
        
        # Build POI -> sensor data map (keyed by both matterport_tag_id AND poi_id for frontend compatibility)
        poi_sensors = {}
        for elettro in elettros:
            tag_id = elettro.get("matterport_tag_id")
            poi_id = elettro.get("poi_id")  # Also support poi_id
            device_id = elettro.get("smart_plug_id") or elettro.get("smartthings_device_id")
            
            if not device_id:
                continue
            
            device = device_lookup.get(device_id)
            sensor_values = sensors.get(device_id, {})
            
            sensor_data = {
                "apparato_id": elettro.get("id"),
                "apparato_nome": elettro.get("nome"),
                "device_id": device_id,
                "device_name": device.get("name") if device else None,
                "online": device.get("online", False) if device else False,
                "switch_state": states.get(device_id) or (device.get("switchState") if device else None),
                "can_switch": device.get("canSwitch", False) if device else False,
                "temperature": sensor_values.get("temperature"),
                "humidity": sensor_values.get("humidity"),
                "power": sensor_values.get("power"),
                "voltage": sensor_values.get("voltage"),
                "current": sensor_values.get("current"),
                "provider": elettro.get("smart_plug_provider", "ewelink"),
                # Door/window contact sensor data
                "contact": device.get("contact") if device else None,  # "open" or "closed"
                "is_contact_sensor": device.get("is_contact_sensor", False) if device else False,
                "battery": device.get("battery") if device else None,
                "last_trigger": device.get("last_trigger") if device else None
            }
            
            # Add to map - prefer poi_id as key, fallback to tag_id
            # Use only one key per sensor to avoid duplicates
            key = poi_id if poi_id else tag_id
            if key:
                poi_sensors[key] = sensor_data
        
        return {
            "poi_sensors": poi_sensors,
            "count": len(poi_sensors),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching POI sensors: {e}")
        return {"poi_sensors": {}, "count": 0, "error": str(e)}


@api_router.get("/elettrodomestici/{elettrodomestico_id}", response_model=ElettrodomesticoConDettagli)
async def get_elettrodomestico(elettrodomestico_id: str):
    e = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    e = deserialize_datetime(e)
    
    # Calcola consumi
    consumo_orario = e.get('consumo_orario_kw', 0)
    ore_giorno = e.get('ore_uso_giornaliero_stimate', 0)
    e['consumo_giornaliero_kw'] = round(consumo_orario * ore_giorno, 2)
    e['consumo_mensile_kw'] = round(e['consumo_giornaliero_kw'] * 30, 2)
    e['consumo_annuale_kw'] = round(e['consumo_giornaliero_kw'] * 365, 2)
    
    # Carica centro assistenza
    if e.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one(
            {"id": e['centro_assistenza_id']}, {"_id": 0}
        )
        if centro:
            e['centro_assistenza'] = deserialize_datetime(centro)
    
    return e


@api_router.put("/elettrodomestici/{elettrodomestico_id}", response_model=Elettrodomestico)
async def update_elettrodomestico(elettrodomestico_id: str, data: dict = Body(...)):
    # Handle custom categoria - any value starting with "custom" should map to "altro"
    categoria = data.get('categoria', '')
    if categoria and (categoria == 'custom' or categoria.startswith('custom_')):
        data['categoria'] = 'altro'
    
    # Validate with Pydantic
    try:
        validated_data = ElettrodomesticoUpdate(**data)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    update_data = {k: v for k, v in validated_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.elettrodomestici.update_one(
        {"id": elettrodomestico_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    updated = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/elettrodomestici/{elettrodomestico_id}")
async def delete_elettrodomestico(elettrodomestico_id: str):
    result = await db.elettrodomestici.delete_one({"id": elettrodomestico_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    return {"message": "Elettrodomestico eliminato"}


@api_router.get("/elettrodomestici/by-poi/{poi_id}")
async def get_elettrodomestico_by_poi(poi_id: str, token: Optional[str] = None):
    """Get elettrodomestico associated with a Matterport POI"""
    # First try to find by poi_id (frontend POI database ID)
    query = {"$or": [
        {"matterport_tag_id": poi_id},  # Try tag ID
        {"poi_id": poi_id}  # Try POI database ID
    ]}
    if token:
        session = await db.sessions.find_one({"token": token})
        if session:
            query["user_id"] = session["user_id"]
    
    elettro = await db.elettrodomestici.find_one(query, {"_id": 0})
    if not elettro:
        return None
    return deserialize_datetime(elettro)


@api_router.get("/elettrodomestici/by-poi/{poi_id}/live-sensor")
async def get_poi_live_sensor_data(poi_id: str, token: Optional[str] = None):
    """Get live sensor data for the appliance associated with a POI"""
    # Find the appliance linked to this POI - try both poi_id and matterport_tag_id
    query = {"$or": [
        {"matterport_tag_id": poi_id},  # Try tag ID
        {"poi_id": poi_id}  # Try POI database ID
    ]}
    if token:
        session = await db.sessions.find_one({"token": token})
        if session:
            query["user_id"] = session["user_id"]
    
    elettro = await db.elettrodomestici.find_one(query, {"_id": 0})
    if not elettro:
        return {"has_sensor": False, "message": "Nessun apparato collegato a questo POI"}
    
    # Check if appliance has a linked smart device
    device_id = elettro.get("smart_plug_id") or elettro.get("smartthings_device_id")
    if not device_id:
        return {
            "has_sensor": False, 
            "apparato": {
                "nome": elettro.get("nome"),
                "marca": elettro.get("marca"),
                "modello": elettro.get("modello")
            },
            "message": "Apparato non collegato a un sensore smart"
        }
    
    # Get live sensor data from eWeLink - use devices-with-sensors to get all devices including power meters
    try:
        # First try to get from devices-with-sensors which includes all devices
        devices_response = await get_devices_with_sensor_values()
        devices = devices_response.get("devices", [])
        sensors = devices_response.get("sensors", {})
        
        # Find the matching device
        device_data = None
        for device in devices:
            if device.get("id") == device_id:
                device_data = device
                break
        
        if device_data:
            # Get sensor values for this device
            sensor_values = sensors.get(device_id, {})
            
            return {
                "has_sensor": True,
                "apparato": {
                    "id": elettro.get("id"),
                    "nome": elettro.get("nome"),
                    "marca": elettro.get("marca"),
                    "modello": elettro.get("modello"),
                    "posizione": elettro.get("posizione"),
                    "consumo_orario_kw": elettro.get("consumo_orario_kw")
                },
                "sensor": {
                    "device_id": device_id,
                    "device_name": device_data.get("name"),
                    "online": device_data.get("online", False),
                    "temperature": sensor_values.get("temperature"),
                    "humidity": sensor_values.get("humidity"),
                    "power": sensor_values.get("power"),
                    "voltage": sensor_values.get("voltage"),
                    "current": sensor_values.get("current"),
                    "switch_state": device_data.get("switchState") or device_data.get("switch"),
                    "can_switch": device_data.get("canSwitch", False),
                    "source": devices_response.get("source", "ewelink"),
                    # Door/window contact sensor data
                    "contact": device_data.get("contact"),  # "open" or "closed"
                    "is_contact_sensor": device_data.get("is_contact_sensor", False),
                    "battery": device_data.get("battery"),
                    "last_trigger": device_data.get("last_trigger")
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            return {
                "has_sensor": True,
                "apparato": {
                    "nome": elettro.get("nome"),
                    "marca": elettro.get("marca"),
                    "modello": elettro.get("modello")
                },
                "sensor": {
                    "device_id": device_id,
                    "online": False
                },
                "message": "Sensore offline o non trovato"
            }
    except Exception as e:
        logger.error(f"Error fetching live sensor for POI {poi_id}: {e}")
        return {
            "has_sensor": False,
            "apparato": {
                "nome": elettro.get("nome")
            },
            "error": str(e)
        }




# ------------ FILE UPLOAD ------------

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/upload/{tipo}")
async def upload_file(
    tipo: str,
    file: UploadFile = File(...),
    elettrodomestico_id: Optional[str] = Form(None)
):
    """
    Upload file per elettrodomestici
    tipo: fattura, foto, manuale, video, pdf_istruzioni, documento
    """
    allowed_types = {
        'fattura': ['.pdf', '.jpg', '.jpeg', '.png'],
        'foto': ['.jpg', '.jpeg', '.png', '.webp'],
        'manuale': ['.pdf'],
        'video': ['.mp4', '.mov', '.avi', '.webm'],
        'pdf_istruzioni': ['.pdf'],
        'documento': ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    }
    
    if tipo not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Tipo non valido. Usa: {list(allowed_types.keys())}")
    
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_types[tipo]:
        raise HTTPException(
            status_code=400, 
            detail=f"Estensione {ext} non permessa per {tipo}. Permesse: {allowed_types[tipo]}"
        )
    
    # Create subdirectory for type
    type_dir = UPLOAD_DIR / tipo
    type_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename}"
    file_path = type_dir / safe_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Generate URL
    file_url = f"/api/files/{tipo}/{safe_filename}"
    
    # If elettrodomestico_id provided, update the record
    if elettrodomestico_id:
        field_map = {
            'fattura': 'fattura_url',
            'foto': 'foto_url',
            'manuale': 'manuali_urls',
            'video': 'video_istruzioni',
            'pdf_istruzioni': 'pdf_istruzioni',
            'documento': 'documenti_acquisto'
        }
        
        field = field_map.get(tipo)
        if field:
            # Check if it's a list field or single field
            list_fields = ['manuali_urls', 'video_istruzioni', 'pdf_istruzioni', 'documenti_acquisto', 'foto_lista']
            if field in list_fields:
                await db.elettrodomestici.update_one(
                    {"id": elettrodomestico_id},
                    {"$push": {field: file_url}}
                )
            else:
                await db.elettrodomestici.update_one(
                    {"id": elettrodomestico_id},
                    {"$set": {field: file_url}}
                )
    
    return {
        "success": True,
        "url": file_url,
        "filename": safe_filename,
        "tipo": tipo
    }


@api_router.get("/files/{tipo}/{filename}")
async def get_file(tipo: str, filename: str):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / tipo / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    # Determine content type
    ext = file_path.suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm'
    }
    
    return FileResponse(file_path, media_type=content_types.get(ext, 'application/octet-stream'))


# ------------ CATEGORIE CUSTOM ------------

@api_router.get("/categorie-custom")
async def get_categorie_custom(token: Optional[str] = Query(None)):
    """Get custom categories added by user"""
    user = await get_user_from_token(token)
    categorie = await db.categorie_custom.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return categorie


@api_router.get("/categorie-all")
async def get_all_categorie(token: Optional[str] = Query(None)):
    """Get all categories (standard + custom + in-use) for filtering"""
    user = await get_user_from_token(token)
    
    # Standard categories from enum
    standard = [
        {"id": "frigorifero", "nome": "Frigorifero"},
        {"id": "lavatrice", "nome": "Lavatrice"},
        {"id": "lavastoviglie", "nome": "Lavastoviglie"},
        {"id": "forno", "nome": "Forno"},
        {"id": "microonde", "nome": "Microonde"},
        {"id": "climatizzatore", "nome": "Climatizzatore"},
        {"id": "tv", "nome": "TV"},
        {"id": "computer", "nome": "Computer"},
        {"id": "stampante", "nome": "Stampante"},
        {"id": "aspirapolvere", "nome": "Aspirapolvere"},
        {"id": "asciugatrice", "nome": "Asciugatrice"},
        {"id": "scaldabagno", "nome": "Scaldabagno"},
        {"id": "caldaia", "nome": "Caldaia"},
        {"id": "condizionatore", "nome": "Condizionatore"},
        {"id": "deumidificatore", "nome": "Deumidificatore"},
        {"id": "altro", "nome": "Altro"},
    ]
    
    # Get custom categories
    custom = await db.categorie_custom.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "nome": 1}).to_list(100)
    
    # Get distinct categories from elettrodomestici (in case custom names stored directly)
    in_use = await db.elettrodomestici.distinct("categoria_custom", {"user_id": user["id"]})
    in_use_categorie = [{"id": c, "nome": c, "custom": True} for c in in_use if c and c not in [s["id"] for s in standard]]
    
    # Merge all
    all_categorie = standard + [{"id": c["id"], "nome": c["nome"], "custom": True} for c in custom]
    
    # Add any in-use categories not already in list
    existing_ids = [c["id"] for c in all_categorie]
    for c in in_use_categorie:
        if c["id"] not in existing_ids:
            all_categorie.append(c)
    
    return all_categorie


@api_router.post("/categorie-custom")
async def add_categoria_custom(nome: str = Form(...), token: Optional[str] = Query(None)):
    """Add a custom category"""
    user = await get_user_from_token(token)
    categoria = {
        "id": str(uuid.uuid4()),
        "nome": nome,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categorie_custom.insert_one(categoria)
    return {"id": categoria["id"], "nome": nome}


# ------------ MARCHE CUSTOM ------------

@api_router.get("/marche-custom")
async def get_marche_custom(user_id: str = DEFAULT_USER_ID):
    """Get custom brands added by user"""
    marche = await db.marche_custom.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return marche


@api_router.post("/marche-custom")
async def add_marca_custom(nome: str = Form(...), user_id: str = DEFAULT_USER_ID):
    """Add a custom brand"""
    marca = {
        "id": str(uuid.uuid4()),
        "nome": nome,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.marche_custom.insert_one(marca)
    return {"id": marca["id"], "nome": nome}


# ------------ MANUTENZIONI ------------

@api_router.post("/manutenzioni", response_model=Manutenzione)
async def create_manutenzione(data: ManutenzioneCreate, token: Optional[str] = Query(None)):
    # Get user from token
    user = await get_user_from_token(token)
    
    # Estrai crea_ticket_automatico prima di creare manutenzione
    crea_ticket = data.crea_ticket_automatico
    data_dict = data.model_dump()
    data_dict.pop('crea_ticket_automatico', None)
    
    manutenzione = Manutenzione(**data_dict)
    manutenzione.user_id = user["id"]  # Set correct user_id
    doc = serialize_doc(manutenzione.model_dump())
    await db.manutenzioni.insert_one(doc)
    
    # Se richiesto, crea automaticamente un ticket
    if crea_ticket and manutenzione.elettrodomestico_id:
        try:
            # Ottieni info elettrodomestico
            elettro = await db.elettrodomestici.find_one(
                {"id": manutenzione.elettrodomestico_id}, {"_id": 0}
            )
            if elettro:
                # Determina centro assistenza
                centro_id = None
                if manutenzione.usa_centro_assistenza_elettrodomestico:
                    centro_id = elettro.get('centro_assistenza_id')
                else:
                    centro_id = manutenzione.centro_assistenza_id
                
                # Crea ticket
                ticket = Ticket(
                    elettrodomestico_id=manutenzione.elettrodomestico_id,
                    titolo=f"Manutenzione: {manutenzione.descrizione[:50]}",
                    descrizione=f"Ticket generato automaticamente dalla pianificazione manutenzione.\n\nDescrizione: {manutenzione.descrizione}\nData programmata: {manutenzione.data_programmata or 'Da definire'}\nTipo: {manutenzione.tipo}",
                    priorita=PrioritaTicket.MEDIA,
                    centro_assistenza_id=centro_id,
                    contatto_preferito="email",
                    note_interne=f"Manutenzione ID: {manutenzione.id}",
                )
                ticket.numero_ticket = await generate_ticket_number()
                ticket.manutenzione_id = manutenzione.id
                
                ticket_doc = serialize_doc(ticket.model_dump())
                await db.tickets.insert_one(ticket_doc)
        except Exception as e:
            # Log errore ma non fallire la creazione manutenzione
            print(f"Errore creazione ticket automatico: {e}")
    
    return manutenzione


@api_router.get("/manutenzioni", response_model=List[ManutenzioneConDettagli])
async def get_manutenzioni(
    token: Optional[str] = Query(None),
    stato: Optional[StatoManutenzione] = None,
    elettrodomestico_id: Optional[str] = None
):
    user = await get_user_from_token(token)
    query = {"user_id": user["id"]}
    if stato:
        query["stato"] = stato.value
    if elettrodomestico_id:
        query["elettrodomestico_id"] = elettrodomestico_id
    
    manutenzioni = await db.manutenzioni.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for m in manutenzioni:
        m = deserialize_datetime(m)
        
        # Carica elettrodomestico se presente
        if m.get('elettrodomestico_id'):
            elettro = await db.elettrodomestici.find_one(
                {"id": m['elettrodomestico_id']}, {"_id": 0}
            )
            if elettro:
                m['elettrodomestico'] = deserialize_datetime(elettro)
                
                # Se usa centro assistenza dell'elettrodomestico
                if m.get('usa_centro_assistenza_elettrodomestico') and elettro.get('centro_assistenza_id'):
                    centro = await db.centri_assistenza.find_one(
                        {"id": elettro['centro_assistenza_id']}, {"_id": 0}
                    )
                    if centro:
                        m['centro_assistenza'] = deserialize_datetime(centro)
        
        # Carica centro assistenza specifico se non usa quello dell'elettrodomestico
        if not m.get('usa_centro_assistenza_elettrodomestico') and m.get('centro_assistenza_id'):
            centro = await db.centri_assistenza.find_one(
                {"id": m['centro_assistenza_id']}, {"_id": 0}
            )
            if centro:
                m['centro_assistenza'] = deserialize_datetime(centro)
        
        result.append(m)
    
    return result


@api_router.get("/manutenzioni/{manutenzione_id}", response_model=ManutenzioneConDettagli)
async def get_manutenzione(manutenzione_id: str):
    m = await db.manutenzioni.find_one({"id": manutenzione_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    
    m = deserialize_datetime(m)
    
    # Carica elettrodomestico
    if m.get('elettrodomestico_id'):
        elettro = await db.elettrodomestici.find_one(
            {"id": m['elettrodomestico_id']}, {"_id": 0}
        )
        if elettro:
            m['elettrodomestico'] = deserialize_datetime(elettro)
            if m.get('usa_centro_assistenza_elettrodomestico') and elettro.get('centro_assistenza_id'):
                centro = await db.centri_assistenza.find_one(
                    {"id": elettro['centro_assistenza_id']}, {"_id": 0}
                )
                if centro:
                    m['centro_assistenza'] = deserialize_datetime(centro)
    
    if not m.get('usa_centro_assistenza_elettrodomestico') and m.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one(
            {"id": m['centro_assistenza_id']}, {"_id": 0}
        )
        if centro:
            m['centro_assistenza'] = deserialize_datetime(centro)
    
    return m


@api_router.put("/manutenzioni/{manutenzione_id}", response_model=Manutenzione)
async def update_manutenzione(manutenzione_id: str, data: ManutenzioneUpdate, token: Optional[str] = Query(None)):
    user = await get_user_from_token(token)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.manutenzioni.update_one(
        {"id": manutenzione_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    
    updated = await db.manutenzioni.find_one({"id": manutenzione_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/manutenzioni/{manutenzione_id}")
async def delete_manutenzione(manutenzione_id: str, token: Optional[str] = Query(None)):
    user = await get_user_from_token(token)
    result = await db.manutenzioni.delete_one({"id": manutenzione_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    return {"message": "Manutenzione eliminata"}


# ------------ DASHBOARD / STATISTICS ------------

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user_id: str = DEFAULT_USER_ID):
    # Calcola consumi totali
    elettrodomestici = await db.elettrodomestici.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)
    
    totale_giornaliero = 0.0
    smart_online = 0
    in_garanzia = 0
    garanzia_scaduta = 0
    oggi = datetime.now(timezone.utc).date()
    
    for e in elettrodomestici:
        consumo = e.get('consumo_orario_kw', 0) * e.get('ore_uso_giornaliero_stimate', 0)
        totale_giornaliero += consumo
        
        # Check garanzia
        if e.get('data_scadenza_garanzia'):
            try:
                scadenza = datetime.fromisoformat(e['data_scadenza_garanzia']).date()
                if scadenza >= oggi:
                    in_garanzia += 1
                else:
                    garanzia_scaduta += 1
            except:
                pass
        
        # Smart plug (placeholder)
        if e.get('smart_plug_id') and e.get('smart_plug_provider') != 'nessuno':
            # Da implementare: check reale status
            pass
    
    consumi = ConsumiTotali(
        consumo_giornaliero_kw=round(totale_giornaliero, 2),
        consumo_mensile_kw=round(totale_giornaliero * 30, 2),
        consumo_annuale_kw=round(totale_giornaliero * 365, 2),
        costo_stimato_mensile_euro=round(totale_giornaliero * 30 * 0.25, 2),
        costo_stimato_annuale_euro=round(totale_giornaliero * 365 * 0.25, 2),
        numero_elettrodomestici=len(elettrodomestici),
        elettrodomestici_smart_online=smart_online
    )
    
    # Conta manutenzioni
    manutenzioni_pianificate = await db.manutenzioni.count_documents({
        "user_id": user_id,
        "stato": StatoManutenzione.PIANIFICATA.value
    })
    
    # Manutenzioni in scadenza (prossimi 7 giorni)
    from datetime import timedelta
    prossima_settimana = (oggi + timedelta(days=7)).isoformat()
    oggi_iso = oggi.isoformat()
    
    manutenzioni_in_scadenza = await db.manutenzioni.count_documents({
        "user_id": user_id,
        "stato": StatoManutenzione.PIANIFICATA.value,
        "data_programmata": {"$gte": oggi_iso, "$lte": prossima_settimana}
    })
    
    return DashboardStats(
        consumi=consumi,
        manutenzioni_pianificate=manutenzioni_pianificate,
        manutenzioni_in_scadenza=manutenzioni_in_scadenza,
        elettrodomestici_in_garanzia=in_garanzia,
        elettrodomestici_garanzia_scaduta=garanzia_scaduta
    )


@api_router.get("/dashboard/consumi-per-categoria")
async def get_consumi_per_categoria(user_id: str = DEFAULT_USER_ID):
    """Consumi raggruppati per categoria elettrodomestico"""
    elettrodomestici = await db.elettrodomestici.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)
    
    consumi_per_cat = {}
    for e in elettrodomestici:
        cat = e.get('categoria', 'altro')
        consumo_giornaliero = e.get('consumo_orario_kw', 0) * e.get('ore_uso_giornaliero_stimate', 0)
        
        if cat not in consumi_per_cat:
            consumi_per_cat[cat] = {
                'categoria': cat,
                'consumo_giornaliero_kw': 0,
                'consumo_mensile_kw': 0,
                'numero_elettrodomestici': 0
            }
        
        consumi_per_cat[cat]['consumo_giornaliero_kw'] += consumo_giornaliero
        consumi_per_cat[cat]['consumo_mensile_kw'] += consumo_giornaliero * 30
        consumi_per_cat[cat]['numero_elettrodomestici'] += 1
    
    # Arrotonda i valori
    for cat in consumi_per_cat:
        consumi_per_cat[cat]['consumo_giornaliero_kw'] = round(consumi_per_cat[cat]['consumo_giornaliero_kw'], 2)
        consumi_per_cat[cat]['consumo_mensile_kw'] = round(consumi_per_cat[cat]['consumo_mensile_kw'], 2)
    
    return list(consumi_per_cat.values())


# ------------ MANUALI / DOCUMENTI ------------

class ManualeInfo(BaseModel):
    id: str
    elettrodomestico_id: str
    filename: str
    original_filename: str
    tipo: str  # "uso", "installazione", "riparazione", "altro"
    uploaded_at: datetime
    size_bytes: int
    text_extracted: bool = False


@api_router.post("/elettrodomestici/{elettrodomestico_id}/manuali")
async def upload_manuale(
    elettrodomestico_id: str,
    file: UploadFile = File(...),
    tipo: str = Form("uso")
):
    """Upload a PDF manual for an appliance"""
    # Verifica che l'elettrodomestico esista
    elettro = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    # Genera ID univoco per il file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext != ".pdf":
        raise HTTPException(status_code=400, detail="Solo file PDF sono supportati")
    
    # Salva il file
    stored_filename = f"{file_id}{file_ext}"
    file_path = MANUALS_DIR / stored_filename
    
    content = await file.read()
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Estrai testo dal PDF
    text_content = ""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in pdf_reader.pages:
            text_content += page.extract_text() + "\n"
    except Exception as e:
        logger.error(f"Errore estrazione testo PDF: {e}")
    
    # Salva info nel database
    manuale_doc = {
        "id": file_id,
        "elettrodomestico_id": elettrodomestico_id,
        "user_id": DEFAULT_USER_ID,
        "filename": stored_filename,
        "original_filename": file.filename,
        "tipo": tipo,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "size_bytes": len(content),
        "text_content": text_content,
        "text_extracted": len(text_content) > 0
    }
    
    await db.manuali.insert_one(manuale_doc)
    
    return {
        "id": file_id,
        "filename": file.filename,
        "tipo": tipo,
        "size_bytes": len(content),
        "text_extracted": len(text_content) > 0
    }


@api_router.get("/elettrodomestici/{elettrodomestico_id}/manuali")
async def get_manuali(elettrodomestico_id: str):
    """Get all manuals for an appliance"""
    manuali = await db.manuali.find(
        {"elettrodomestico_id": elettrodomestico_id},
        {"_id": 0, "text_content": 0}
    ).to_list(100)
    return manuali


@api_router.delete("/manuali/{manuale_id}")
async def delete_manuale(manuale_id: str):
    """Delete a manual"""
    manuale = await db.manuali.find_one({"id": manuale_id})
    if not manuale:
        raise HTTPException(status_code=404, detail="Manuale non trovato")
    
    # Elimina file fisico
    file_path = MANUALS_DIR / manuale["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Elimina da database
    await db.manuali.delete_one({"id": manuale_id})
    return {"message": "Manuale eliminato"}


@api_router.get("/manuali/{manuale_id}/download")
async def download_manuale(manuale_id: str):
    """Download a manual PDF"""
    manuale = await db.manuali.find_one({"id": manuale_id})
    if not manuale:
        raise HTTPException(status_code=404, detail="Manuale non trovato")
    
    file_path = MANUALS_DIR / manuale["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    return FileResponse(
        file_path,
        filename=manuale["original_filename"],
        media_type="application/pdf"
    )


# ------------ RICERCA MANUALI ONLINE ------------

@api_router.get("/ricerca-manuale")
async def ricerca_manuale_online(
    marca: str = Query(..., description="Marca dell'elettrodomestico"),
    modello: str = Query(..., description="Modello dell'elettrodomestico"),
    tipo_doc: str = Query("manuale uso", description="Tipo documento cercato")
):
    """Cerca manuali online per un elettrodomestico"""
    
    query = f"{marca} {modello} {tipo_doc} PDF filetype:pdf"
    
    # Siti comuni per manuali
    siti_manuali = [
        f"https://www.manualslib.com/brand/{marca.lower()}/",
        f"https://www.manualslib.com/search/?q={marca}+{modello}",
        f"https://www.manualpdf.it/marca/{marca.lower()}/",
    ]
    
    # Costruisci suggerimenti
    suggerimenti = {
        "query_google": f"https://www.google.com/search?q={marca}+{modello}+manuale+PDF",
        "siti_consigliati": siti_manuali,
        "consigli": [
            f"Cerca su Google: '{marca} {modello} manuale PDF'",
            f"Visita il sito ufficiale {marca.lower()}.com nella sezione Supporto/Download",
            "Prova ManualsLib.com - grande archivio di manuali",
            "Controlla se c'è un QR code sul prodotto che porta al manuale"
        ]
    }
    
    # Se abbiamo la chiave AI, usa per suggerimenti intelligenti
    if EMERGENT_LLM_KEY:
        try:
            session_id = str(uuid.uuid4())
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message="Sei un assistente che aiuta a trovare manuali di elettrodomestici. Fornisci link diretti e consigli utili in italiano."
            )
            
            ai_response = await chat.send_message(
                UserMessage(text=f"Devo trovare il manuale PDF per: {marca} {modello}. Dammi i link più probabili dove trovarlo e consigli su come cercarlo.")
            )
            suggerimenti["ai_suggerimenti"] = ai_response
        except Exception as e:
            logger.error(f"Errore AI search: {e}")
            suggerimenti["ai_suggerimenti"] = None
    
    return suggerimenti


# ------------ ASSISTENTE AI ------------

class ChatMessage(BaseModel):
    role: str  # "user" o "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    elettrodomestico_id: Optional[str] = None  # Se la domanda è su un dispositivo specifico


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []  # Fonti usate (manuale, database, web)
    suggested_actions: List[Dict[str, Any]] = []  # Azioni suggerite (vai a matterport, chiama assistenza, etc.)


async def get_context_data(user_id: str = DEFAULT_USER_ID, elettrodomestico_id: Optional[str] = None) -> str:
    """Raccoglie dati di contesto dagli archivi per l'AI"""
    
    context_parts = []
    
    # Elettrodomestici
    if elettrodomestico_id:
        elettro = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
        if elettro:
            context_parts.append(f"ELETTRODOMESTICO SELEZIONATO:\n{json.dumps(elettro, indent=2, default=str)}")
            
            # Carica manuali per questo elettrodomestico
            manuali = await db.manuali.find(
                {"elettrodomestico_id": elettrodomestico_id}
            ).to_list(10)
            
            for m in manuali:
                if m.get("text_content"):
                    context_parts.append(f"CONTENUTO MANUALE ({m.get('original_filename', 'N/A')}):\n{m['text_content'][:10000]}")
            
            # Centro assistenza
            if elettro.get('centro_assistenza_id'):
                centro = await db.centri_assistenza.find_one({"id": elettro['centro_assistenza_id']}, {"_id": 0})
                if centro:
                    context_parts.append(f"CENTRO ASSISTENZA:\n{json.dumps(centro, indent=2, default=str)}")
    else:
        # Tutti gli elettrodomestici
        elettrodomestici = await db.elettrodomestici.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(100)
        
        if elettrodomestici:
            context_parts.append(f"ELENCO ELETTRODOMESTICI ({len(elettrodomestici)} totali):")
            for e in elettrodomestici:
                consumo = e.get('consumo_orario_kw', 0) * e.get('ore_uso_giornaliero_stimate', 0)
                context_parts.append(
                    f"- {e.get('nome')} ({e.get('marca', 'N/A')} {e.get('modello', 'N/A')}): "
                    f"posizione={e.get('posizione', 'N/A')}, categoria={e.get('categoria', 'N/A')}, "
                    f"consumo={consumo:.2f} kWh/giorno, id={e.get('id')}"
                )
    
    # Manutenzioni
    manutenzioni = await db.manutenzioni.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(50)
    
    if manutenzioni:
        context_parts.append(f"\nMANUTENZIONI ({len(manutenzioni)} totali):")
        for m in manutenzioni:
            context_parts.append(
                f"- {m.get('descrizione')}: stato={m.get('stato')}, "
                f"data={m.get('data_programmata', 'N/A')}, tipo={m.get('tipo')}"
            )
    
    # Centri assistenza
    centri = await db.centri_assistenza.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(20)
    
    if centri:
        context_parts.append(f"\nCENTRI ASSISTENZA ({len(centri)} totali):")
        for c in centri:
            context_parts.append(
                f"- {c.get('nome_azienda')}: tel={c.get('telefono')}, "
                f"specializzazioni={', '.join(c.get('specializzazioni', []))}"
            )
    
    return "\n".join(context_parts)


@api_router.post("/assistente/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """Chat con l'assistente AI SmartBuilding"""
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(
            status_code=503, 
            detail="Assistente AI non configurato. Manca EMERGENT_LLM_KEY."
        )
    
    # Raccogli contesto
    context = await get_context_data(DEFAULT_USER_ID, request.elettrodomestico_id)
    
    # System prompt
    system_prompt = """Sei l'Assistente SmartBuilding, un aiutante intelligente per la gestione della casa.

Il tuo compito è:
1. Rispondere a domande sugli elettrodomestici dell'utente (quanti sono, dove sono, quanto consumano)
2. Fornire supporto tecnico basato sui manuali caricati
3. Aiutare con problemi e malfunzionamenti cercando soluzioni
4. Dare informazioni su manutenzioni programmate
5. Fornire contatti dei centri assistenza quando necessario

REGOLE:
- Rispondi SEMPRE in italiano
- Sii conciso ma completo
- Se hai informazioni dal manuale, citalo
- Se non trovi la risposta nei dati, suggerisci di cercare online o contattare l'assistenza
- Quando parli di un elettrodomestico specifico, indica sempre marca e modello
- Per problemi tecnici, dai istruzioni passo-passo numerate
- Se l'utente chiede di "andare" o "vedere" un dispositivo, suggerisci di usare la vista 3D Matterport

DATI DISPONIBILI:
""" + context
    
    try:
        # Crea sessione chat
        session_id = str(uuid.uuid4())
        
        # Prepara messaggi iniziali dalla history
        initial_messages = []
        for msg in request.conversation_history[-10:]:
            initial_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt,
            initial_messages=initial_messages if initial_messages else None
        )
        
        # Invia messaggio
        ai_response = await chat.send_message(UserMessage(text=request.message))
        
        # Determina le fonti usate
        sources = []
        if "manuale" in ai_response.lower():
            sources.append("manuale")
        if context:
            sources.append("database")
        
        # Suggerisci azioni
        suggested_actions = []
        
        # Se menziona un elettrodomestico, suggerisci vista 3D
        if request.elettrodomestico_id:
            suggested_actions.append({
                "type": "navigate_matterport",
                "label": "Vai nello spazio 3D",
                "elettrodomestico_id": request.elettrodomestico_id
            })
        
        # Se menziona assistenza o problemi gravi
        if any(word in ai_response.lower() for word in ["assistenza", "tecnico", "riparare", "chiamare"]):
            suggested_actions.append({
                "type": "contact_support",
                "label": "Contatta assistenza"
            })
        
        return ChatResponse(
            response=ai_response,
            sources=sources,
            suggested_actions=suggested_actions
        )
        
    except Exception as e:
        logger.error(f"Errore chat AI: {e}")
        raise HTTPException(status_code=500, detail=f"Errore comunicazione AI: {str(e)}")


@api_router.post("/assistente/risolvi-problema")
async def risolvi_problema(
    elettrodomestico_id: str = Query(...),
    problema: str = Query(..., description="Descrizione del problema")
):
    """Cerca di risolvere un problema specifico di un elettrodomestico"""
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Assistente AI non configurato")
    
    # Carica info elettrodomestico
    elettro = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    # Carica manuali
    manuali_content = ""
    manuali = await db.manuali.find({"elettrodomestico_id": elettrodomestico_id}).to_list(10)
    for m in manuali:
        if m.get("text_content"):
            manuali_content += f"\n\n--- MANUALE: {m.get('original_filename')} ---\n{m['text_content'][:15000]}"
    
    # Carica centro assistenza
    centro_info = ""
    if elettro.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one({"id": elettro['centro_assistenza_id']}, {"_id": 0})
        if centro:
            centro_info = f"\n\nCENTRO ASSISTENZA: {centro.get('nome_azienda')} - Tel: {centro.get('telefono')}"
    
    system_message = "Sei un tecnico esperto di elettrodomestici. Rispondi sempre in italiano con istruzioni chiare e precise."
    
    prompt = f"""L'utente ha un problema con:

ELETTRODOMESTICO:
- Nome: {elettro.get('nome')}
- Marca: {elettro.get('marca', 'N/A')}
- Modello: {elettro.get('modello', 'N/A')}
- Posizione: {elettro.get('posizione', 'N/A')}

PROBLEMA SEGNALATO:
{problema}

{f"CONTENUTO MANUALI DISPONIBILI:{manuali_content}" if manuali_content else "Nessun manuale caricato."}
{centro_info}

ISTRUZIONI:
1. Analizza il problema
2. Se trovi la soluzione nel manuale, fornisci i passaggi esatti con riferimento alla pagina/sezione
3. Se non trovi nel manuale, fornisci una soluzione basata sulla tua conoscenza
4. Dai istruzioni passo-passo numerate
5. Indica quando è necessario chiamare un tecnico

Fornisci la risposta in questo formato:
📋 DIAGNOSI: [breve diagnosi]
🔧 SOLUZIONE:
1. [passo 1]
2. [passo 2]
...
⚠️ ATTENZIONE: [eventuali avvertenze]
📞 ASSISTENZA: [quando chiamare il tecnico]
"""

    try:
        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        )
        
        ai_response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "elettrodomestico": {
                "nome": elettro.get('nome'),
                "marca": elettro.get('marca'),
                "modello": elettro.get('modello')
            },
            "problema": problema,
            "soluzione": ai_response,
            "manuale_disponibile": len(manuali) > 0,
            "centro_assistenza": centro_info if centro_info else None
        }
        
    except Exception as e:
        logger.error(f"Errore risoluzione problema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ------------ TICKET ASSISTENZA ------------

@api_router.post("/tickets", response_model=Ticket)
async def create_ticket(data: TicketCreate):
    """Crea un nuovo ticket di assistenza"""
    # Verifica elettrodomestico
    elettro = await db.elettrodomestici.find_one({"id": data.elettrodomestico_id}, {"_id": 0})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    # Se non specificato centro assistenza, usa quello dell'elettrodomestico
    centro_id = data.centro_assistenza_id or elettro.get('centro_assistenza_id')
    
    ticket = Ticket(**data.model_dump())
    ticket.centro_assistenza_id = centro_id
    ticket.numero_ticket = await generate_ticket_number()
    
    doc = serialize_doc(ticket.model_dump())
    await db.tickets.insert_one(doc)
    
    return ticket


@api_router.get("/tickets", response_model=List[TicketConDettagli])
async def get_tickets(
    user_id: str = DEFAULT_USER_ID,
    stato: Optional[StatoTicket] = None,
    elettrodomestico_id: Optional[str] = None
):
    """Ottieni tutti i ticket"""
    query = {"user_id": user_id}
    if stato:
        query["stato"] = stato.value
    if elettrodomestico_id:
        query["elettrodomestico_id"] = elettrodomestico_id
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for t in tickets:
        t = deserialize_datetime(t)
        
        # Carica elettrodomestico
        if t.get('elettrodomestico_id'):
            elettro = await db.elettrodomestici.find_one(
                {"id": t['elettrodomestico_id']}, {"_id": 0}
            )
            if elettro:
                t['elettrodomestico'] = deserialize_datetime(elettro)
        
        # Carica centro assistenza
        if t.get('centro_assistenza_id'):
            centro = await db.centri_assistenza.find_one(
                {"id": t['centro_assistenza_id']}, {"_id": 0}
            )
            if centro:
                t['centro_assistenza'] = deserialize_datetime(centro)
        
        result.append(t)
    
    return result


@api_router.get("/tickets/{ticket_id}", response_model=TicketConDettagli)
async def get_ticket(ticket_id: str):
    """Ottieni dettagli ticket"""
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    t = deserialize_datetime(t)
    
    if t.get('elettrodomestico_id'):
        elettro = await db.elettrodomestici.find_one(
            {"id": t['elettrodomestico_id']}, {"_id": 0}
        )
        if elettro:
            t['elettrodomestico'] = deserialize_datetime(elettro)
    
    if t.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one(
            {"id": t['centro_assistenza_id']}, {"_id": 0}
        )
        if centro:
            t['centro_assistenza'] = deserialize_datetime(centro)
    
    return t


@api_router.put("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, data: TicketUpdate):
    """Aggiorna un ticket e sincronizza la manutenzione collegata"""
    # Ottieni ticket corrente
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    # Se il ticket ha una manutenzione collegata, aggiorna anche quella
    manutenzione_id = ticket.get('manutenzione_id')
    if manutenzione_id:
        manutenzione_update = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        # Sincronizza costo
        if data.costo_intervento is not None:
            manutenzione_update["costo"] = data.costo_intervento
        
        # Sincronizza note
        if data.note_interne:
            # Aggiungi nota alla manutenzione
            manutenzione = await db.manutenzioni.find_one({"id": manutenzione_id}, {"_id": 0})
            if manutenzione:
                note_esistenti = manutenzione.get('note', '') or ''
                nuova_nota = f"\n[{datetime.now().strftime('%d.%m.%Y %H:%M')}] {data.note_interne}"
                manutenzione_update["note"] = note_esistenti + nuova_nota
        
        # Sincronizza stato
        if data.stato:
            stato_ticket = data.stato.value if hasattr(data.stato, 'value') else data.stato
            if stato_ticket == "completato":
                manutenzione_update["stato"] = "completato"
                manutenzione_update["data_completamento"] = datetime.now(timezone.utc).isoformat()
            elif stato_ticket == "in_lavorazione":
                manutenzione_update["stato"] = "in_lavorazione"
            elif stato_ticket == "annullato":
                manutenzione_update["stato"] = "annullata"
        
        if manutenzione_update:
            await db.manutenzioni.update_one(
                {"id": manutenzione_id},
                {"$set": manutenzione_update}
            )
    
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.post("/tickets/{ticket_id}/contatta")
async def contatta_assistenza(
    ticket_id: str,
    metodo: str = Query("email", description="email o whatsapp")
):
    """Contatta il centro assistenza per un ticket"""
    # Carica ticket con dettagli
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    # Carica elettrodomestico
    elettro = await db.elettrodomestici.find_one(
        {"id": ticket['elettrodomestico_id']}, {"_id": 0}
    )
    
    # Carica centro assistenza
    centro = None
    if ticket.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one(
            {"id": ticket['centro_assistenza_id']}, {"_id": 0}
        )
    
    if not centro:
        raise HTTPException(status_code=400, detail="Nessun centro assistenza associato")
    
    # Prepara messaggio
    messaggio = f"""Richiesta Assistenza - {ticket.get('numero_ticket', 'N/A')}

Salve,

Richiedo assistenza per il seguente problema:

ELETTRODOMESTICO:
- Tipo: {elettro.get('nome', 'N/A')}
- Marca: {elettro.get('marca', 'N/A')}
- Modello: {elettro.get('modello', 'N/A')}
- N. Serie: {elettro.get('numero_serie', 'N/A')}

PROBLEMA:
{ticket.get('titolo', '')}

DESCRIZIONE:
{ticket.get('descrizione', '')}

PRIORITÀ: {ticket.get('priorita', 'media').upper()}

Resto in attesa di un vostro riscontro.

Cordiali saluti
---
Ticket #{ticket.get('numero_ticket')} - SmartBuilding
"""
    
    result = {"metodo": metodo, "destinatario": centro}
    
    if metodo == "whatsapp" and centro.get('telefono'):
        # Genera link WhatsApp
        whatsapp_link = generate_whatsapp_link(centro['telefono'], messaggio)
        result["whatsapp_link"] = whatsapp_link
        result["messaggio"] = messaggio
        
    elif metodo == "email" and centro.get('email'):
        # Invia email
        subject = f"Richiesta Assistenza - {ticket.get('numero_ticket')} - {elettro.get('marca')} {elettro.get('modello')}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Richiesta Assistenza - {ticket.get('numero_ticket')}</h2>
            
            <h3>Elettrodomestico</h3>
            <ul>
                <li><strong>Tipo:</strong> {elettro.get('nome', 'N/A')}</li>
                <li><strong>Marca:</strong> {elettro.get('marca', 'N/A')}</li>
                <li><strong>Modello:</strong> {elettro.get('modello', 'N/A')}</li>
                <li><strong>N. Serie:</strong> {elettro.get('numero_serie', 'N/A')}</li>
            </ul>
            
            <h3>Problema</h3>
            <p><strong>{ticket.get('titolo', '')}</strong></p>
            <p>{ticket.get('descrizione', '').replace(chr(10), '<br>')}</p>
            
            <p><strong>Priorità:</strong> <span style="color: {'red' if ticket.get('priorita') == 'urgente' else 'orange' if ticket.get('priorita') == 'alta' else 'blue'};">{ticket.get('priorita', 'media').upper()}</span></p>
            
            <hr>
            <p style="color: gray; font-size: 12px;">Ticket #{ticket.get('numero_ticket')} - SmartBuilding</p>
        </body>
        </html>
        """
        
        email_sent = await send_email_notification(centro['email'], subject, html_body)
        result["email_sent"] = email_sent
        result["messaggio"] = messaggio
        
        if not email_sent:
            result["note"] = "SMTP non configurato. Copia il messaggio e invialo manualmente."
    
    # Aggiorna ticket
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "stato": StatoTicket.CONTATTATO.value,
                "data_contatto": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "messaggi_inviati": {
                    "metodo": metodo,
                    "destinatario": centro.get('email') or centro.get('telefono'),
                    "data": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return result


@api_router.post("/tickets/{ticket_id}/chiudi")
async def chiudi_ticket(
    ticket_id: str,
    costo: Optional[float] = Query(None),
    valutazione: Optional[int] = Query(None, ge=1, le=5),
    note_risoluzione: Optional[str] = Query(None),
    crea_manutenzione: bool = Query(True, description="Crea record manutenzione dall'intervento")
):
    """Chiudi un ticket e aggiorna/crea la manutenzione collegata"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    manutenzione_id = ticket.get('manutenzione_id')
    
    # Se il ticket ha già una manutenzione collegata, aggiornala
    if manutenzione_id:
        manutenzione_update = {
            "stato": "completato",
            "data_completamento": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if costo is not None:
            manutenzione_update["costo"] = costo
        if note_risoluzione:
            manutenzione = await db.manutenzioni.find_one({"id": manutenzione_id}, {"_id": 0})
            note_esistenti = manutenzione.get('note', '') if manutenzione else ''
            manutenzione_update["note"] = f"{note_esistenti}\n[Risoluzione] {note_risoluzione}".strip()
        
        await db.manutenzioni.update_one(
            {"id": manutenzione_id},
            {"$set": manutenzione_update}
        )
    elif crea_manutenzione:
        # Crea nuova manutenzione solo se non ce n'è una collegata
        manutenzione = {
            "id": str(uuid.uuid4()),
            "user_id": ticket.get('user_id', DEFAULT_USER_ID),
            "elettrodomestico_id": ticket.get('elettrodomestico_id'),
            "tipo": "straordinaria",
            "descrizione": f"{ticket.get('titolo')}\n\n{ticket.get('descrizione')}\n\nRisoluzione: {note_risoluzione or 'Completata'}",
            "data_programmata": ticket.get('created_at'),
            "data_completamento": datetime.now(timezone.utc).isoformat(),
            "stato": "completato",
            "costo": costo,
            "usa_centro_assistenza_elettrodomestico": False,
            "centro_assistenza_id": ticket.get('centro_assistenza_id'),
            "ricorrente": False,
            "documenti": [],
            "note": f"Generata da Ticket #{ticket.get('numero_ticket')}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.manutenzioni.insert_one(manutenzione)
        manutenzione_id = manutenzione['id']
    
    # Aggiorna ticket
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "stato": StatoTicket.COMPLETATO.value,
                "data_risoluzione": datetime.now(timezone.utc).isoformat(),
                "costo_intervento": costo,
                "valutazione": valutazione,
                "note_risoluzione": note_risoluzione,
                "manutenzione_id": manutenzione_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Ticket chiuso con successo",
        "manutenzione_id": manutenzione_id,
        "manutenzione_aggiornata": bool(ticket.get('manutenzione_id'))
    }


# ------------ QR CODE ------------

@api_router.get("/elettrodomestici/{elettrodomestico_id}/qrcode")
async def get_qrcode(elettrodomestico_id: str, size: int = Query(200, ge=100, le=500)):
    """Genera QR code per un elettrodomestico"""
    elettro = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    # URL che punterà alla scheda elettrodomestico
    url = f"{FRONTEND_URL}?elettro={elettrodomestico_id}"
    
    # Genera QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Salva in memory
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    return StreamingResponse(
        img_buffer,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=qr_{elettrodomestico_id}.png"}
    )


@api_router.get("/elettrodomestici/{elettrodomestico_id}/qrcode-card")
async def get_qrcode_card(elettrodomestico_id: str):
    """Genera dati per card QR stampabile"""
    elettro = await db.elettrodomestici.find_one({"id": elettrodomestico_id}, {"_id": 0})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    # Carica centro assistenza se presente
    centro = None
    if elettro.get('centro_assistenza_id'):
        centro = await db.centri_assistenza.find_one(
            {"id": elettro['centro_assistenza_id']}, {"_id": 0}
        )
    
    url = f"{FRONTEND_URL}?elettro={elettrodomestico_id}"
    
    return {
        "qr_url": f"/api/elettrodomestici/{elettrodomestico_id}/qrcode",
        "target_url": url,
        "elettrodomestico": {
            "nome": elettro.get('nome'),
            "marca": elettro.get('marca'),
            "modello": elettro.get('modello'),
            "numero_serie": elettro.get('numero_serie'),
            "posizione": elettro.get('posizione')
        },
        "centro_assistenza": {
            "nome": centro.get('nome_azienda') if centro else None,
            "telefono": centro.get('telefono') if centro else None
        } if centro else None
    }


# ------------ CALENDARIO ------------

@api_router.get("/calendario/eventi", response_model=List[CalendarEvent])
async def get_calendar_events(
    user_id: str = DEFAULT_USER_ID,
    start: Optional[str] = None,
    end: Optional[str] = None
):
    """Ottieni eventi per il calendario"""
    events = []
    
    # Manutenzioni
    manut_query = {"user_id": user_id}
    if start and end:
        manut_query["$or"] = [
            {"data_programmata": {"$gte": start, "$lte": end}},
            {"data_completamento": {"$gte": start, "$lte": end}}
        ]
    
    manutenzioni = await db.manutenzioni.find(manut_query, {"_id": 0}).to_list(500)
    
    for m in manutenzioni:
        if m.get('data_programmata'):
            color = "#3b82f6"  # blue
            if m.get('stato') == 'completata':
                color = "#22c55e"  # green
            elif m.get('stato') == 'in_corso':
                color = "#eab308"  # yellow
            
            # Carica nome elettrodomestico
            elettro_nome = "Generale"
            if m.get('elettrodomestico_id'):
                elettro = await db.elettrodomestici.find_one(
                    {"id": m['elettrodomestico_id']}, {"nome": 1}
                )
                if elettro:
                    elettro_nome = elettro.get('nome', 'N/A')
            
            events.append(CalendarEvent(
                id=m['id'],
                title=f"🔧 {m.get('tipo', 'Manutenzione').capitalize()} - {elettro_nome}",
                start=m['data_programmata'],
                end=m.get('data_completamento'),
                tipo="manutenzione",
                color=color,
                extendedProps={
                    "descrizione": m.get('descrizione'),
                    "stato": m.get('stato'),
                    "elettrodomestico_id": m.get('elettrodomestico_id'),
                    "costo": m.get('costo')
                }
            ))
    
    # Scadenze garanzia
    elettrodomestici = await db.elettrodomestici.find(
        {"user_id": user_id, "data_scadenza_garanzia": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(500)
    
    for e in elettrodomestici:
        if e.get('data_scadenza_garanzia'):
            events.append(CalendarEvent(
                id=f"garanzia-{e['id']}",
                title=f"📋 Scadenza Garanzia - {e.get('nome')}",
                start=e['data_scadenza_garanzia'],
                tipo="garanzia",
                color="#f97316",  # orange
                extendedProps={
                    "elettrodomestico_id": e['id'],
                    "marca": e.get('marca'),
                    "modello": e.get('modello')
                }
            ))
    
    # Ticket aperti
    tickets = await db.tickets.find(
        {"user_id": user_id, "stato": {"$nin": ["completato", "annullato"]}},
        {"_id": 0}
    ).to_list(100)
    
    for t in tickets:
        color = "#ef4444"  # red per urgente
        if t.get('priorita') == 'alta':
            color = "#f97316"  # orange
        elif t.get('priorita') == 'media':
            color = "#eab308"  # yellow
        elif t.get('priorita') == 'bassa':
            color = "#6b7280"  # gray
        
        events.append(CalendarEvent(
            id=t['id'],
            title=f"🎫 Ticket {t.get('numero_ticket')} - {t.get('titolo', 'N/A')[:30]}",
            start=t.get('created_at', datetime.now(timezone.utc).isoformat())[:10],
            tipo="ticket",
            color=color,
            extendedProps={
                "numero_ticket": t.get('numero_ticket'),
                "stato": t.get('stato'),
                "priorita": t.get('priorita'),
                "descrizione": t.get('descrizione')
            }
        ))
    
    return events


@api_router.get("/calendario/prossimi")
async def get_prossimi_eventi(
    user_id: str = DEFAULT_USER_ID,
    giorni: int = Query(7, ge=1, le=90)
):
    """Ottieni eventi dei prossimi N giorni"""
    oggi = datetime.now(timezone.utc).date()
    fine = oggi + timedelta(days=giorni)
    
    oggi_str = oggi.isoformat()
    fine_str = fine.isoformat()
    
    eventi = []
    
    # Manutenzioni programmate
    manutenzioni = await db.manutenzioni.find({
        "user_id": user_id,
        "stato": {"$in": ["aperto", "in_lavorazione"]},
        "data_programmata": {"$gte": oggi_str, "$lte": fine_str}
    }, {"_id": 0}).to_list(50)
    
    for m in manutenzioni:
        elettro_nome = "Generale"
        if m.get('elettrodomestico_id'):
            elettro = await db.elettrodomestici.find_one(
                {"id": m['elettrodomestico_id']}, {"nome": 1}
            )
            if elettro:
                elettro_nome = elettro.get('nome', 'N/A')
        
        eventi.append({
            "tipo": "manutenzione",
            "data": m['data_programmata'],
            "titolo": f"Manutenzione {m.get('tipo', '')} - {elettro_nome}",
            "descrizione": m.get('descrizione'),
            "id": m['id']
        })
    
    # Garanzie in scadenza
    garanzie = await db.elettrodomestici.find({
        "user_id": user_id,
        "data_scadenza_garanzia": {"$gte": oggi_str, "$lte": fine_str}
    }, {"_id": 0}).to_list(50)
    
    for g in garanzie:
        eventi.append({
            "tipo": "garanzia",
            "data": g['data_scadenza_garanzia'],
            "titolo": f"Scadenza Garanzia - {g.get('nome')}",
            "descrizione": f"{g.get('marca')} {g.get('modello')}",
            "id": g['id']
        })
    
    # Ordina per data
    eventi.sort(key=lambda x: x['data'])
    
    return eventi


# ------------ PLANIMETRIE ------------

@api_router.post("/planimetrie")
async def create_planimetria(
    nome: str = Form(...),
    descrizione: Optional[str] = Form(None),
    piano: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Carica una nuova planimetria"""
    # Verifica tipo file
    allowed_types = [".png", ".jpg", ".jpeg", ".webp", ".pdf"]
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Tipo file non supportato. Usa: {', '.join(allowed_types)}")
    
    # Genera ID e salva file
    plan_id = str(uuid.uuid4())
    stored_filename = f"{plan_id}{file_ext}"
    file_path = PLANIMETRIE_DIR / stored_filename
    
    content = await file.read()
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Salva in database
    planimetria = Planimetria(
        id=plan_id,
        nome=nome,
        descrizione=descrizione,
        piano=piano,
        filename=stored_filename,
        original_filename=file.filename
    )
    
    doc = serialize_doc(planimetria.model_dump())
    await db.planimetrie.insert_one(doc)
    
    return planimetria


@api_router.get("/planimetrie", response_model=List[Planimetria])
async def get_planimetrie(user_id: str = DEFAULT_USER_ID):
    """Ottieni tutte le planimetrie"""
    planimetrie = await db.planimetrie.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(50)
    return [deserialize_datetime(p) for p in planimetrie]


@api_router.get("/planimetrie/{planimetria_id}")
async def get_planimetria(planimetria_id: str):
    """Ottieni una planimetria con dettagli elettrodomestici"""
    plan = await db.planimetrie.find_one({"id": planimetria_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    # Arricchisci i punti con i dettagli degli elettrodomestici
    punti_dettagliati = []
    for punto in plan.get('punti', []):
        elettro = await db.elettrodomestici.find_one(
            {"id": punto['elettrodomestico_id']}, {"_id": 0}
        )
        if elettro:
            punti_dettagliati.append({
                **punto,
                "elettrodomestico": deserialize_datetime(elettro)
            })
    
    plan['punti_dettagliati'] = punti_dettagliati
    return deserialize_datetime(plan)


@api_router.get("/planimetrie/{planimetria_id}/image")
async def get_planimetria_image(planimetria_id: str):
    """Scarica l'immagine della planimetria"""
    plan = await db.planimetrie.find_one({"id": planimetria_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    file_path = PLANIMETRIE_DIR / plan['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    return FileResponse(file_path, filename=plan['original_filename'])


@api_router.put("/planimetrie/{planimetria_id}/punti")
async def update_planimetria_punti(planimetria_id: str, punti: List[PuntoMappa]):
    """Aggiorna i punti (posizioni elettrodomestici) sulla planimetria"""
    result = await db.planimetrie.update_one(
        {"id": planimetria_id},
        {
            "$set": {
                "punti": [p.model_dump() for p in punti],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    return {"message": "Punti aggiornati", "count": len(punti)}


@api_router.post("/planimetrie/{planimetria_id}/punti")
async def add_punto_planimetria(planimetria_id: str, punto: PuntoMappa):
    """Aggiungi un singolo punto alla planimetria"""
    # Verifica che l'elettrodomestico esista
    elettro = await db.elettrodomestici.find_one({"id": punto.elettrodomestico_id})
    if not elettro:
        raise HTTPException(status_code=404, detail="Elettrodomestico non trovato")
    
    result = await db.planimetrie.update_one(
        {"id": planimetria_id},
        {
            "$push": {"punti": punto.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    return {"message": "Punto aggiunto"}


@api_router.delete("/planimetrie/{planimetria_id}/punti/{elettrodomestico_id}")
async def remove_punto_planimetria(planimetria_id: str, elettrodomestico_id: str):
    """Rimuovi un punto dalla planimetria"""
    result = await db.planimetrie.update_one(
        {"id": planimetria_id},
        {
            "$pull": {"punti": {"elettrodomestico_id": elettrodomestico_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    return {"message": "Punto rimosso"}


@api_router.delete("/planimetrie/{planimetria_id}")
async def delete_planimetria(planimetria_id: str):
    """Elimina una planimetria"""
    plan = await db.planimetrie.find_one({"id": planimetria_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Planimetria non trovata")
    
    # Elimina file
    file_path = PLANIMETRIE_DIR / plan['filename']
    if file_path.exists():
        file_path.unlink()
    
    await db.planimetrie.delete_one({"id": planimetria_id})
    return {"message": "Planimetria eliminata"}


# ------------ ASSISTENTE PROATTIVO ------------

@api_router.get("/suggerimenti", response_model=List[Suggerimento])
async def get_suggerimenti_proattivi(user_id: str = DEFAULT_USER_ID):
    """Genera suggerimenti proattivi basati sui dati degli elettrodomestici"""
    suggerimenti = []
    oggi = datetime.now(timezone.utc).date()
    
    # Carica tutti gli elettrodomestici
    elettrodomestici = await db.elettrodomestici.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(500)
    
    for e in elettrodomestici:
        elettro_id = e['id']
        elettro_nome = f"{e.get('nome')} ({e.get('marca', '')} {e.get('modello', '')})"
        
        # 1. GARANZIE IN SCADENZA
        if e.get('data_scadenza_garanzia'):
            try:
                scadenza = datetime.fromisoformat(e['data_scadenza_garanzia']).date()
                giorni_rimanenti = (scadenza - oggi).days
                
                if giorni_rimanenti < 0:
                    suggerimenti.append(Suggerimento(
                        id=f"garanzia-scaduta-{elettro_id}",
                        tipo=TipoSuggerimento.GARANZIA,
                        priorita=PrioritaSuggerimento.INFO,
                        titolo="Garanzia scaduta",
                        messaggio=f"La garanzia di {elettro_nome} è scaduta da {abs(giorni_rimanenti)} giorni. Considera di estendere la copertura o programmare un controllo.",
                        elettrodomestico_id=elettro_id,
                        elettrodomestico_nome=e.get('nome'),
                        azione_suggerita="Verifica opzioni estensione garanzia"
                    ))
                elif giorni_rimanenti <= 30:
                    suggerimenti.append(Suggerimento(
                        id=f"garanzia-{elettro_id}",
                        tipo=TipoSuggerimento.GARANZIA,
                        priorita=PrioritaSuggerimento.URGENTE if giorni_rimanenti <= 7 else PrioritaSuggerimento.ATTENZIONE,
                        titolo="Garanzia in scadenza",
                        messaggio=f"La garanzia di {elettro_nome} scade tra {giorni_rimanenti} giorni ({scadenza.strftime('%d/%m/%Y')}). Valuta se estenderla prima della scadenza.",
                        elettrodomestico_id=elettro_id,
                        elettrodomestico_nome=e.get('nome'),
                        azione_suggerita="Contatta il produttore per estensione"
                    ))
            except:
                pass
        
        # 2. ELETTRODOMESTICI VECCHI - SUGGERIMENTO SOSTITUZIONE
        if e.get('data_acquisto'):
            try:
                acquisto = datetime.fromisoformat(e['data_acquisto']).date()
                anni = (oggi - acquisto).days / 365
                
                # Suggerimenti basati su categoria e età
                limiti_eta = {
                    "lavanderia": 10,
                    "cucina": 12,
                    "climatizzazione": 10,
                    "intrattenimento": 7,
                    "pulizia": 8
                }
                
                categoria = e.get('categoria', 'altro')
                limite = limiti_eta.get(categoria, 10)
                
                if anni >= limite:
                    suggerimenti.append(Suggerimento(
                        id=f"vecchio-{elettro_id}",
                        tipo=TipoSuggerimento.SOSTITUZIONE,
                        priorita=PrioritaSuggerimento.INFO,
                        titolo="Elettrodomestico datato",
                        messaggio=f"{elettro_nome} ha {int(anni)} anni. I modelli recenti sono più efficienti e potrebbero farti risparmiare energia. Valuta una sostituzione.",
                        elettrodomestico_id=elettro_id,
                        elettrodomestico_nome=e.get('nome'),
                        azione_suggerita="Confronta modelli nuovi"
                    ))
                elif anni >= limite - 2:
                    # Suggerimento controllo preventivo
                    suggerimenti.append(Suggerimento(
                        id=f"controllo-{elettro_id}",
                        tipo=TipoSuggerimento.MANUTENZIONE,
                        priorita=PrioritaSuggerimento.INFO,
                        titolo="Controllo consigliato",
                        messaggio=f"{elettro_nome} ha {int(anni)} anni. Potrebbe essere utile un controllo preventivo per garantirne la longevità.",
                        elettrodomestico_id=elettro_id,
                        elettrodomestico_nome=e.get('nome'),
                        azione_suggerita="Programma manutenzione preventiva"
                    ))
            except:
                pass
        
        # 3. CONSUMI ELEVATI - RISPARMIO ENERGETICO
        consumo_mensile = e.get('consumo_orario_kw', 0) * e.get('ore_uso_giornaliero_stimate', 0) * 30
        costo_mensile = consumo_mensile * 0.25
        
        if costo_mensile > 30:  # Più di 30€/mese
            suggerimenti.append(Suggerimento(
                id=f"consumo-alto-{elettro_id}",
                tipo=TipoSuggerimento.RISPARMIO,
                priorita=PrioritaSuggerimento.ATTENZIONE,
                titolo="Consumo elevato rilevato",
                messaggio=f"{elettro_nome} consuma circa €{costo_mensile:.0f}/mese. Verifica che funzioni correttamente o considera un modello più efficiente.",
                elettrodomestico_id=elettro_id,
                elettrodomestico_nome=e.get('nome'),
                azione_suggerita="Verifica efficienza energetica"
            ))
        
        # 4. SMART PLUG NON CONFIGURATO
        if e.get('smart_plug_provider') and e['smart_plug_provider'] != 'nessuno' and not e.get('smart_plug_id'):
            suggerimenti.append(Suggerimento(
                id=f"smart-{elettro_id}",
                tipo=TipoSuggerimento.RISPARMIO,
                priorita=PrioritaSuggerimento.INFO,
                titolo="Smart plug da configurare",
                messaggio=f"Hai indicato una presa smart per {e.get('nome')} ma non hai inserito l'ID dispositivo. Configurala per monitorare i consumi reali.",
                elettrodomestico_id=elettro_id,
                elettrodomestico_nome=e.get('nome'),
                azione_suggerita="Completa configurazione smart plug"
            ))
    
    # 5. MANUTENZIONI SCADUTE O IN RITARDO
    manutenzioni_scadute = await db.manutenzioni.find({
        "user_id": user_id,
        "stato": "aperto",
        "data_programmata": {"$lt": oggi.isoformat()}
    }, {"_id": 0}).to_list(50)
    
    for m in manutenzioni_scadute:
        elettro_nome = "Generale"
        if m.get('elettrodomestico_id'):
            elettro = await db.elettrodomestici.find_one(
                {"id": m['elettrodomestico_id']}, {"nome": 1, "marca": 1}
            )
            if elettro:
                elettro_nome = elettro.get('nome', 'N/A')
        
        suggerimenti.append(Suggerimento(
            id=f"manut-scaduta-{m['id']}",
            tipo=TipoSuggerimento.MANUTENZIONE,
            priorita=PrioritaSuggerimento.URGENTE,
            titolo="Manutenzione in ritardo",
            messaggio=f"La manutenzione '{m.get('descrizione', 'N/A')[:50]}' per {elettro_nome} era programmata per il {m.get('data_programmata')} ed è in ritardo.",
            elettrodomestico_id=m.get('elettrodomestico_id'),
            elettrodomestico_nome=elettro_nome,
            azione_suggerita="Riprogramma o completa la manutenzione"
        ))
    
    # 6. TICKET APERTI DA TROPPO TEMPO
    una_settimana_fa = (oggi - timedelta(days=7)).isoformat()
    tickets_vecchi = await db.tickets.find({
        "user_id": user_id,
        "stato": {"$in": ["aperto", "contattato"]},
        "created_at": {"$lt": una_settimana_fa}
    }, {"_id": 0}).to_list(50)
    
    for t in tickets_vecchi:
        suggerimenti.append(Suggerimento(
            id=f"ticket-vecchio-{t['id']}",
            tipo=TipoSuggerimento.MANUTENZIONE,
            priorita=PrioritaSuggerimento.ATTENZIONE,
            titolo="Ticket in sospeso",
            messaggio=f"Il ticket #{t.get('numero_ticket')} '{t.get('titolo', 'N/A')[:40]}' è aperto da più di 7 giorni. Verifica lo stato con l'assistenza.",
            elettrodomestico_id=t.get('elettrodomestico_id'),
            azione_suggerita="Sollecita assistenza"
        ))
    
    # 7. SUGGERIMENTI GENERICI RISPARMIO ENERGETICO
    totale_consumo = sum(
        e.get('consumo_orario_kw', 0) * e.get('ore_uso_giornaliero_stimate', 0) * 30
        for e in elettrodomestici
    )
    
    if totale_consumo > 300:  # Più di 300 kWh/mese
        suggerimenti.append(Suggerimento(
            id="risparmio-generale",
            tipo=TipoSuggerimento.RISPARMIO,
            priorita=PrioritaSuggerimento.INFO,
            titolo="Consiglio risparmio energetico",
            messaggio=f"Il consumo totale stimato è {totale_consumo:.0f} kWh/mese (~€{totale_consumo*0.25:.0f}). Considera di usare gli elettrodomestici nelle fasce orarie a minor costo.",
            azione_suggerita="Ottimizza orari di utilizzo"
        ))
    
    # Ordina per priorità
    ordine_priorita = {"urgente": 0, "attenzione": 1, "info": 2}
    suggerimenti.sort(key=lambda x: ordine_priorita.get(x.priorita, 3))
    
    return suggerimenti


@api_router.get("/suggerimenti/count")
async def get_suggerimenti_count(user_id: str = DEFAULT_USER_ID):
    """Conta suggerimenti per priorità (per badge notifiche)"""
    suggerimenti = await get_suggerimenti_proattivi(user_id)
    
    return {
        "totale": len(suggerimenti),
        "urgenti": sum(1 for s in suggerimenti if s.priorita == PrioritaSuggerimento.URGENTE),
        "attenzione": sum(1 for s in suggerimenti if s.priorita == PrioritaSuggerimento.ATTENZIONE),
        "info": sum(1 for s in suggerimenti if s.priorita == PrioritaSuggerimento.INFO)
    }


# ============== SMARTTHINGS INTEGRATION ==============

SMARTTHINGS_TOKEN = os.environ.get('SMARTTHINGS_TOKEN', '')
SMARTTHINGS_API_URL = "https://api.smartthings.com/v1"


async def get_smartthings_token():
    """
    Get SmartThings token with priority:
    1. From property_config in database (persistent)
    2. From environment variable (fallback)
    """
    try:
        # Try to get from database first
        prop = await db.property_config.find_one(
            {"is_active": True}, 
            {"integrations.smartthings.token": 1, "_id": 0}
        )
        if prop:
            db_token = prop.get("integrations", {}).get("smartthings", {}).get("token")
            if db_token and len(db_token) > 10:
                return db_token
    except Exception as e:
        logger.debug(f"Could not get token from DB: {e}")
    
    # Fallback to environment variable
    return SMARTTHINGS_TOKEN


@api_router.get("/smartthings/locations")
async def get_smartthings_locations():
    """Get all SmartThings locations"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            data = response.json()
            return {"locations": data.get("items", [])}
    except httpx.HTTPError as e:
        logger.error(f"SmartThings locations error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.get("/smartthings/rooms")
async def get_smartthings_rooms():
    """Get all rooms from all locations"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # First get all locations
            loc_response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {token}"}
            )
            loc_response.raise_for_status()
            locations = loc_response.json().get("items", [])
            
            all_rooms = []
            for loc in locations:
                location_id = loc.get("locationId")
                location_name = loc.get("name")
                
                # Get rooms for this location
                rooms_response = await client.get(
                    f"{SMARTTHINGS_API_URL}/locations/{location_id}/rooms",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if rooms_response.status_code == 200:
                    rooms = rooms_response.json().get("items", [])
                    for room in rooms:
                        room["locationName"] = location_name
                        all_rooms.append(room)
            
            return {"rooms": all_rooms, "count": len(all_rooms)}
    except httpx.HTTPError as e:
        logger.error(f"SmartThings rooms error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.get("/smartthings/devices-by-room")
async def get_smartthings_devices_by_room():
    """Get all SmartThings devices grouped by room"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all locations
            loc_response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {token}"}
            )
            loc_response.raise_for_status()
            locations = loc_response.json().get("items", [])
            
            # Build rooms map
            rooms_map = {}
            for loc in locations:
                location_id = loc.get("locationId")
                location_name = loc.get("name")
                
                rooms_response = await client.get(
                    f"{SMARTTHINGS_API_URL}/locations/{location_id}/rooms",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if rooms_response.status_code == 200:
                    rooms = rooms_response.json().get("items", [])
                    for room in rooms:
                        rooms_map[room.get("roomId")] = {
                            "id": room.get("roomId"),
                            "name": room.get("name"),
                            "locationId": location_id,
                            "locationName": location_name
                        }
            
            # Get all devices
            dev_response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {token}"}
            )
            dev_response.raise_for_status()
            devices_data = dev_response.json().get("items", [])
            
            # Group devices by room
            grouped = {}
            no_room_devices = []
            
            for item in devices_data:
                device = {
                    "id": item.get("deviceId"),
                    "name": item.get("label") or item.get("name"),
                    "type": item.get("deviceTypeName", "Unknown"),
                    "status": "online",
                    "capabilities": [cap.get("id") for cap in item.get("components", [{}])[0].get("capabilities", [])],
                    "roomId": item.get("roomId"),
                    "locationId": item.get("locationId")
                }
                
                room_id = item.get("roomId")
                if room_id and room_id in rooms_map:
                    room_name = rooms_map[room_id]["name"]
                    if room_name not in grouped:
                        grouped[room_name] = {
                            "roomId": room_id,
                            "roomName": room_name,
                            "locationName": rooms_map[room_id].get("locationName", ""),
                            "devices": []
                        }
                    grouped[room_name]["devices"].append(device)
                else:
                    no_room_devices.append(device)
            
            # Convert to list and add "No Room" group if needed
            result = list(grouped.values())
            if no_room_devices:
                result.append({
                    "roomId": None,
                    "roomName": "Senza Stanza",
                    "locationName": "",
                    "devices": no_room_devices
                })
            
            # Sort by room name
            result.sort(key=lambda x: x["roomName"])
            
            total_devices = sum(len(r["devices"]) for r in result)
            
            return {
                "rooms": result,
                "totalRooms": len(result),
                "totalDevices": total_devices
            }
    except httpx.HTTPError as e:
        logger.error(f"SmartThings devices-by-room error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.get("/smartthings/devices")
async def get_smartthings_devices():
    """Get all SmartThings devices with their current status (cached for 2 minutes)"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    # Check cache first
    cached = smartthings_cache.get("devices")
    if cached:
        logger.info("SmartThings devices returned from cache")
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            data = response.json()
            
            devices = []
            for item in data.get("items", []):
                caps = [cap.get("id") for cap in item.get("components", [{}])[0].get("capabilities", [])]
                device = {
                    "id": item.get("deviceId"),
                    "name": item.get("label") or item.get("name"),
                    "type": item.get("deviceTypeName", "Unknown"),
                    "status": "online",
                    "capabilities": caps,
                    "roomId": item.get("roomId"),
                    "locationId": item.get("locationId"),
                    "switchState": None  # Default, non modifichiamo lo stato
                }
                
                # Fetch stato switch solo se ha la capability (evita modifiche)
                # NON facciamo fetch dello stato per non sovraccaricare l'API
                # Lo stato verrà letto solo quando l'utente interagisce
                
                devices.append(device)
            
            result = {"devices": devices, "count": len(devices)}
            smartthings_cache.set("devices", result)
            logger.info(f"SmartThings devices fetched and cached: {len(devices)}")
            return result
    except httpx.HTTPError as e:
        logger.error(f"SmartThings API error: {e}")
        # Return cached data if available, even if expired
        cached = smartthings_cache.get("devices")
        if cached:
            logger.info("Returning stale cache due to API error")
            return cached
        
        # Try eWeLink fallback
        try:
            logger.info("SmartThings failed, trying eWeLink fallback for devices...")
            ewelink_devices = await get_ewelink_devices_internal()
            if ewelink_devices and ewelink_devices.get("devices"):
                devices = []
                for device in ewelink_devices.get("devices", []):
                    devices.append({
                        "id": device.get("deviceid"),
                        "name": device.get("name", "Dispositivo eWeLink"),
                        "type": "ewelink",
                        "status": "online" if device.get("online") else "offline",
                        "capabilities": [],
                        "roomId": None,
                        "locationId": None,
                        "switchState": device.get("params", {}).get("switch"),
                        "source": "ewelink"
                    })
                result = {"devices": devices, "count": len(devices), "source": "ewelink"}
                logger.info(f"eWeLink fallback devices: {len(devices)}")
                return result
        except Exception as ewelink_error:
            logger.error(f"eWeLink fallback also failed: {ewelink_error}")
        
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}. eWeLink fallback unavailable.")


@api_router.get("/smartthings/devices-with-states")
async def get_smartthings_devices_with_states():
    """Get all SmartThings devices WITH their current switch states (cached for 2 minutes)"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    # Check cache first
    cached = smartthings_cache.get("devices_with_states")
    if cached:
        logger.info("SmartThings devices with states returned from cache")
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # First get all devices
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            data = response.json()
            
            devices = []
            for item in data.get("items", []):
                caps = [cap.get("id") for cap in item.get("components", [{}])[0].get("capabilities", [])]
                device = {
                    "id": item.get("deviceId"),
                    "name": item.get("label") or item.get("name"),
                    "type": item.get("deviceTypeName", "Unknown"),
                    "status": "online",
                    "capabilities": caps,
                    "roomId": item.get("roomId"),
                    "locationId": item.get("locationId"),
                    "switchState": None
                }
                devices.append(device)
            
            # Now fetch switch states for devices with switch capability (in batches)
            switch_devices = [d for d in devices if "switch" in d.get("capabilities", [])]
            
            import asyncio
            
            async def fetch_device_state(device_id):
                try:
                    status_response = await client.get(
                        f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        switch_state = status_data.get("components", {}).get("main", {}).get("switch", {}).get("switch", {}).get("value")
                        return device_id, switch_state
                except Exception as e:
                    logger.debug(f"Could not get state for {device_id}: {e}")
                return device_id, None
            
            # Fetch states in batches of 5
            batch_size = 5
            for i in range(0, len(switch_devices), batch_size):
                batch = switch_devices[i:i+batch_size]
                tasks = [fetch_device_state(d["id"]) for d in batch]
                results = await asyncio.gather(*tasks)
                
                for device_id, state in results:
                    for d in devices:
                        if d["id"] == device_id and state:
                            d["switchState"] = state
                            break
                
                # Small delay between batches
                if i + batch_size < len(switch_devices):
                    await asyncio.sleep(0.3)
            
            result = {"devices": devices, "count": len(devices)}
            smartthings_cache.set("devices_with_states", result)
            logger.info(f"SmartThings devices with states fetched and cached: {len(devices)}")
            return result
    except httpx.HTTPError as e:
        logger.error(f"SmartThings API error: {e}")
        cached = smartthings_cache.get("devices_with_states")
        if cached:
            return cached
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.get("/smartthings/device/{device_id}/status")
async def get_smartthings_device_status(device_id: str):
    """Get status of a specific SmartThings device (cached for 30 seconds)"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    # Check cache first
    cache_key = f"device_status_{device_id}"
    cached = smartthings_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            result = response.json()
            # Cache for 30 seconds (shorter TTL for status)
            smartthings_cache._cache[cache_key] = result
            smartthings_cache._timestamps[cache_key] = time.time()
            return result
    except httpx.HTTPError as e:
        logger.error(f"SmartThings device status error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.post("/smartthings/device/{device_id}/command")
async def send_smartthings_command(device_id: str, command: dict):
    """Send a command to a SmartThings device"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/commands",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={"commands": [command]}
            )
            response.raise_for_status()
            # Clear cache for this device
            cache_key = f"device_status_{device_id}"
            if cache_key in smartthings_cache._cache:
                del smartthings_cache._cache[cache_key]
            return {"status": "success", "result": response.json()}
    except httpx.HTTPError as e:
        logger.error(f"SmartThings command error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.post("/smartthings/cache/clear")
async def clear_smartthings_cache():
    """Clear SmartThings cache to force refresh"""
    smartthings_cache.clear()
    return {"status": "cache cleared"}


@api_router.get("/device/{device_id}/consumption")
async def get_device_consumption(device_id: str):
    """
    Get consumption data for a specific smart plug/power meter device.
    Returns power (W), current (A), voltage (V), daily kWh, monthly kWh.
    """
    try:
        # Try to get from eWeLink first
        ewelink_devices = await get_ewelink_devices_internal()
        if ewelink_devices and ewelink_devices.get("devices"):
            for device in ewelink_devices.get("devices", []):
                if device.get("id") == device_id:
                    params = device.get("params", {})
                    
                    # Extract consumption data
                    consumption = {
                        "device_id": device_id,
                        "device_name": device.get("name", "Unknown"),
                        "online": device.get("online", False),
                        "switch": params.get("switches", [{}])[0].get("switch") if params.get("switches") else device.get("switch"),
                        "has_consumption_data": False
                    }
                    
                    # Power (x100 for S60TPF)
                    if params.get("power") is not None:
                        power_val = float(params.get("power", 0))
                        if power_val > 100:
                            power_val = power_val / 100
                        consumption["power_w"] = round(power_val, 2)
                        consumption["has_consumption_data"] = True
                    
                    # Current (in cA, divide by 100)
                    if params.get("current") is not None:
                        current_val = float(params.get("current", 0)) / 100
                        consumption["current_a"] = round(current_val, 2)
                        consumption["has_consumption_data"] = True
                    
                    # Voltage (x100)
                    if params.get("voltage") is not None:
                        voltage_val = float(params.get("voltage", 0))
                        if voltage_val > 1000:
                            voltage_val = voltage_val / 100
                        consumption["voltage_v"] = round(voltage_val, 1)
                        consumption["has_consumption_data"] = True
                    
                    # Daily and Monthly kWh - eWeLink S60TPF sends values x10
                    # e.g., 24 raw = 2.4 kWh actual, 224 raw = 22.4 kWh
                    if params.get("dayKwh") is not None:
                        daily_kwh = float(params.get("dayKwh", 0)) / 10
                        consumption["daily_kwh"] = round(daily_kwh, 2)
                        consumption["has_consumption_data"] = True
                    
                    if params.get("monthKwh") is not None:
                        monthly_kwh = float(params.get("monthKwh", 0)) / 10
                        consumption["monthly_kwh"] = round(monthly_kwh, 2)
                        consumption["has_consumption_data"] = True
                    
                    # Calculated cost (assuming 0.25 €/kWh average in Italy)
                    if consumption.get("daily_kwh"):
                        consumption["daily_cost_eur"] = round(consumption["daily_kwh"] * 0.25, 2)
                    if consumption.get("monthly_kwh"):
                        consumption["monthly_cost_eur"] = round(consumption["monthly_kwh"] * 0.25, 2)
                    
                    return consumption
        
        # Device not found
        return {
            "device_id": device_id,
            "online": False,
            "has_consumption_data": False,
            "error": "Device not found or offline"
        }
        
    except Exception as e:
        logger.error(f"Error getting consumption for device {device_id}: {e}")
        return {
            "device_id": device_id,
            "online": False,
            "has_consumption_data": False,
            "error": str(e)
        }


@api_router.get("/smartthings/devices-with-sensors")
async def get_devices_with_sensor_values():
    """
    Get all SmartThings devices with their current states AND sensor values.
    Returns switch states (on/off) and sensor readings (temperature, humidity, power).
    """
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    # Check cache first
    cache_key = "devices_with_sensors"
    cached = smartthings_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get all devices first
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            devices = response.json().get("items", [])
            
            result = {
                "devices": [],
                "states": {},      # deviceId -> "on"/"off"
                "sensors": {},     # deviceId -> { temperature, humidity, power, etc }
                "count": len(devices)
            }
            
            # Get status for each device (limited batch to avoid rate limits)
            for device in devices[:25]:  # Limit to 25 devices
                device_id = device.get("deviceId")
                device_info = {
                    "id": device_id,
                    "name": device.get("name") or device.get("label", "Dispositivo"),
                    "type": device.get("deviceTypeName", ""),
                    "capabilities": [cap.get("id") for cap in device.get("components", [{}])[0].get("capabilities", [])]
                }
                result["devices"].append(device_info)
                
                try:
                    # Get device status
                    status_response = await client.get(
                        f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if status_response.status_code == 200:
                        status = status_response.json()
                        main_component = status.get("components", {}).get("main", {})
                        
                        # Extract switch state
                        switch_value = main_component.get("switch", {}).get("switch", {}).get("value")
                        if switch_value:
                            result["states"][device_id] = switch_value
                        
                        # Extract sensor values
                        sensors = {}
                        
                        # Temperature
                        temp = main_component.get("temperatureMeasurement", {}).get("temperature", {})
                        if temp.get("value") is not None:
                            sensors["temperature"] = temp.get("value")
                            sensors["temperatureUnit"] = temp.get("unit", "C")
                        
                        # Humidity
                        humidity = main_component.get("relativeHumidityMeasurement", {}).get("humidity", {})
                        if humidity.get("value") is not None:
                            sensors["humidity"] = humidity.get("value")
                        
                        # Power/Energy
                        power = main_component.get("powerMeter", {}).get("power", {})
                        if power.get("value") is not None:
                            sensors["power"] = power.get("value")
                        
                        energy = main_component.get("energyMeter", {}).get("energy", {})
                        if energy.get("value") is not None:
                            sensors["energy"] = energy.get("value")
                        
                        # Battery
                        battery = main_component.get("battery", {}).get("battery", {})
                        if battery.get("value") is not None:
                            sensors["battery"] = battery.get("value")
                        
                        # Motion
                        motion = main_component.get("motionSensor", {}).get("motion", {})
                        if motion.get("value") is not None:
                            sensors["motion"] = motion.get("value")  # "active" or "inactive"
                        
                        # Contact (door/window)
                        contact = main_component.get("contactSensor", {}).get("contact", {})
                        if contact.get("value") is not None:
                            sensors["contact"] = contact.get("value")  # "open" or "closed"
                        
                        # Illuminance
                        illuminance = main_component.get("illuminanceMeasurement", {}).get("illuminance", {})
                        if illuminance.get("value") is not None:
                            sensors["illuminance"] = illuminance.get("value")
                        
                        if sensors:
                            result["sensors"][device_id] = sensors
                
                except Exception as e:
                    logger.debug(f"Could not get status for device {device_id}: {e}")
                    continue
            
            # Cache for 60 seconds
            smartthings_cache._cache[cache_key] = result
            smartthings_cache._timestamps[cache_key] = time.time()
            
            return result
            
    except httpx.HTTPError as e:
        logger.error(f"SmartThings devices with sensors error: {e}")
        # Try eWeLink fallback if SmartThings fails
        try:
            logger.info("SmartThings failed, trying eWeLink fallback...")
            ewelink_devices = await get_ewelink_devices_internal()
            if ewelink_devices and ewelink_devices.get("devices"):
                result = {
                    "devices": [],
                    "states": {},
                    "sensors": {},
                    "count": len(ewelink_devices.get("devices", [])),
                    "source": "ewelink",
                    "smartthings_error": str(e)
                }
                for device in ewelink_devices.get("devices", []):
                    device_id = device.get("deviceid") or device.get("id")
                    uiid = device.get("uiid", 0)
                    params = device.get("params", {})
                    
                    # Check if this is a multi-channel device channel
                    is_channel = device.get("is_channel", False)
                    channel = device.get("channel")
                    has_channels = device.get("has_channels", False)
                    channel_count = device.get("channel_count", 0)
                    
                    # Determine if device supports switch
                    sensor_only_uiids = [1770, 7014, 7017, 102, 1000, 1009, 1256, 1257, 1258, 1259, 3026]
                    # Note: UIID 190 (S60TPF) is a smart plug WITH switch capability
                    power_monitor_only_uiids = [5, 32, 182]
                    camera_uiids = [87, 260]
                    has_switch_params = ("switch" in params or "switches" in params)
                    can_switch = (
                        has_switch_params and
                        uiid not in sensor_only_uiids and 
                        uiid not in power_monitor_only_uiids and
                        uiid not in camera_uiids
                    ) or is_channel  # Multi-channel devices always support switch
                    
                    # Get switch state - for channels, use the device's switch directly
                    switch_state = device.get("switch") or params.get("switch")
                    if not switch_state and "switches" in params and len(params.get("switches", [])) > 0:
                        switch_state = params["switches"][0].get("switch")
                    
                    device_info = {
                        "id": device_id,
                        "name": device.get("name", "Dispositivo eWeLink"),
                        "type": "ewelink",
                        "capabilities": [],
                        "source": "ewelink",
                        "online": device.get("online", False),
                        "canSwitch": can_switch,
                        "switchState": switch_state,
                        "switch": switch_state,
                        "is_channel": is_channel,
                        "channel": channel,
                        "has_channels": has_channels,
                        "channel_count": channel_count
                    }
                    
                    # Add door/window contact sensor data
                    # The data comes from get_ewelink_devices_internal which already processed these
                    if device.get("contact"):
                        device_info["contact"] = device.get("contact")
                    if device.get("is_contact_sensor"):
                        device_info["is_contact_sensor"] = True
                    if device.get("battery") is not None:
                        device_info["battery"] = device.get("battery")
                    if device.get("last_trigger"):
                        device_info["last_trigger"] = device.get("last_trigger")
                    
                    result["devices"].append(device_info)
                    
                    # Extract sensor values from eWeLink device
                    # Note: eWeLink often sends values x100 (e.g., 2210 = 22.10°C)
                    # Values can be strings or numbers
                    params = device.get("params", {})
                    sensors = {}
                    
                    raw_temp = params.get("temperature")
                    if raw_temp is not None:
                        try:
                            temp = float(raw_temp)
                            # If temp > 100, it's likely x100 format, convert
                            if temp > 100:
                                temp = temp / 100
                            sensors["temperature"] = round(temp, 1)
                            sensors["temperatureUnit"] = "C"
                        except (ValueError, TypeError):
                            pass
                    
                    raw_humid = params.get("humidity")
                    if raw_humid is not None:
                        try:
                            humid = float(raw_humid)
                            # If humidity > 100, it's likely x100 format, convert
                            if humid > 100:
                                humid = humid / 100
                            sensors["humidity"] = round(humid, 1)
                        except (ValueError, TypeError):
                            pass
                    
                    if params.get("power") is not None:
                        try:
                            power_val = float(params.get("power"))
                            # eWeLink S60TPF power values are x100, normalize to actual watts
                            # e.g., 2703 raw = 27.03W actual
                            if power_val > 100:
                                power_val = power_val / 100
                            sensors["power"] = round(power_val, 2)
                        except (ValueError, TypeError):
                            pass
                    
                    # Voltage (usually x100, e.g., 23008 = 230.08V)
                    if params.get("voltage") is not None:
                        try:
                            voltage_val = float(params.get("voltage"))
                            if voltage_val > 1000:
                                voltage_val = voltage_val / 100
                            sensors["voltage"] = round(voltage_val, 1)
                        except (ValueError, TypeError):
                            pass
                    
                    # Current - eWeLink S60TPF sends current in cA (centi-amperes)
                    # e.g., 81 raw = 0.81A actual
                    # Always divide by 100 for power monitoring devices
                    if params.get("current") is not None:
                        try:
                            current_val = float(params.get("current"))
                            # Always normalize current (eWeLink sends in cA = 0.01A units)
                            current_val = current_val / 100
                            sensors["current"] = round(current_val, 2)
                        except (ValueError, TypeError):
                            pass
                    
                    # Air quality sensors (PM10, PM2.5, CO2)
                    if params.get("pm10") is not None:
                        try:
                            sensors["pm10"] = int(params.get("pm10"))
                            device_info["pm10"] = sensors["pm10"]
                        except (ValueError, TypeError):
                            pass
                    if params.get("pm2_5") is not None:
                        try:
                            sensors["pm2_5"] = int(params.get("pm2_5"))
                            device_info["pm2_5"] = sensors["pm2_5"]
                        except (ValueError, TypeError):
                            pass
                    if params.get("co2") is not None:
                        try:
                            sensors["co2"] = int(params.get("co2"))
                            device_info["co2"] = sensors["co2"]
                        except (ValueError, TypeError):
                            pass
                    
                    # Also add temperature/humidity directly to device_info for easier access
                    if sensors.get("temperature") is not None:
                        device_info["temperature"] = sensors["temperature"]
                    if sensors.get("humidity") is not None:
                        device_info["humidity"] = sensors["humidity"]
                    
                    # Switch state
                    if params.get("switch"):
                        result["states"][device_id] = params.get("switch")
                    
                    if sensors:
                        result["sensors"][device_id] = sensors
                
                return result
        except Exception as ewelink_error:
            logger.error(f"eWeLink fallback also failed: {ewelink_error}")
        
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}. eWeLink fallback also unavailable.")


async def get_ewelink_devices_internal():
    """Internal function to get eWeLink devices for fallback - includes multi-channel expansion"""
    try:
        token = await get_ewelink_token()
        if not token:
            return None
        
        config = await get_ewelink_config()
        region = config.get("region", "eu")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://{region}-apia.coolkit.cc/v2/device/thing",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            if response.status_code == 200:
                data = response.json()
                things = data.get("data", {}).get("thingList", [])
                devices = []
                for thing in things:
                    item_data = thing.get("itemData", {})
                    params = item_data.get("params", {})
                    uiid = item_data.get("extra", {}).get("uiid", 0)
                    
                    base_device = {
                        "deviceid": item_data.get("deviceid"),
                        "id": item_data.get("deviceid"),
                        "name": item_data.get("name"),
                        "brandName": item_data.get("brandName", "eWeLink"),
                        "productModel": item_data.get("productModel"),
                        "params": params,
                        "online": item_data.get("online", False),
                        "uiid": uiid
                    }
                    
                    # Handle multi-channel devices - expand into separate virtual devices
                    switches = params.get("switches", [])
                    if len(switches) > 1:
                        # Multi-channel device - create a device for each channel
                        base_name = item_data.get("name", "Dispositivo")
                        base_id = item_data.get("deviceid")
                        
                        for i, sw in enumerate(switches):
                            channel_device = {
                                "deviceid": f"{base_id}_ch{i}",
                                "id": f"{base_id}_ch{i}",
                                "parent_id": base_id,
                                "channel": i,
                                "name": f"{base_name} - CH{i+1}",
                                "brandName": item_data.get("brandName", "Sonoff"),
                                "productModel": item_data.get("productModel", ""),
                                "params": {"switch": sw.get("switch")},
                                "online": item_data.get("online", False),
                                "uiid": uiid,
                                "is_channel": True,
                                "switch": sw.get("switch")
                            }
                            devices.append(channel_device)
                        
                        # Also add the parent device with first channel state
                        base_device["switch"] = switches[0].get("switch") if switches else None
                        base_device["has_channels"] = True
                        base_device["channel_count"] = len(switches)
                        devices.append(base_device)
                    else:
                        # Single channel device
                        if "switch" in params:
                            base_device["switch"] = params["switch"]
                        elif "switches" in params and len(params["switches"]) > 0:
                            base_device["switch"] = params["switches"][0].get("switch")
                        
                        # Handle door/window contact sensors (UIID 7003, 7014 - SNZB-04, DW2)
                        contact_sensor_uiids = [7003, 7014]
                        if uiid in contact_sensor_uiids and "lock" in params:
                            base_device["contact"] = "open" if params["lock"] == 1 else "closed"
                            base_device["is_contact_sensor"] = True
                        if "battery" in params:
                            base_device["battery"] = params["battery"]
                        if uiid in contact_sensor_uiids and "trigTime" in params:
                            try:
                                trig_ts = int(params["trigTime"]) / 1000
                                base_device["last_trigger"] = datetime.fromtimestamp(trig_ts, tz=timezone.utc).isoformat()
                            except:
                                pass
                        
                        devices.append(base_device)
                
                return {"devices": devices, "count": len(devices)}
    except Exception as e:
        logger.error(f"eWeLink internal devices error: {e}")
        return None


@api_router.post("/smartthings/device/{device_id}/switch/{action}")
async def smartthings_switch_control(device_id: str, action: str):
    """Turn on/off a SmartThings switch device"""
    if action not in ["on", "off"]:
        raise HTTPException(status_code=400, detail="Action must be 'on' or 'off'")
    
    command = {
        "component": "main",
        "capability": "switch",
        "command": action,
        "arguments": []
    }
    return await send_smartthings_command(device_id, command)


@api_router.get("/smartthings/clima")
async def get_smartthings_clima():
    """Get climate data from SmartThings temperature sensor (Temperatura living)"""
    token = await get_smartthings_token()
    if not token:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all devices
            devices_response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {token}"}
            )
            devices_response.raise_for_status()
            devices = devices_response.json().get("items", [])
            
            # Find temperature sensor - look for "Temperatura" in name or temperatureMeasurement capability
            temp_device = None
            for d in devices:
                name = (d.get("label") or d.get("name", "")).lower()
                
                # Check if it's a temperature sensor by name
                if "temperatura" in name:
                    temp_device = d
                    break
                
                # Or check capabilities in components
                for comp in d.get("components", []):
                    cap_ids = [c.get("id", "").lower() for c in comp.get("capabilities", [])]
                    if "temperaturemeasurement" in cap_ids:
                        temp_device = d
                        break
                if temp_device:
                    break
            
            if not temp_device:
                return {
                    "temperature": None,
                    "humidity": None,
                    "device_name": None,
                    "online": False,
                    "error": "Nessun sensore temperatura trovato"
                }
            
            # Get device status
            device_id = temp_device.get("deviceId")
            status_response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            status_response.raise_for_status()
            status = status_response.json()
            
            # Extract temperature and humidity from main component
            main = status.get("components", {}).get("main", {})
            
            temp_data = main.get("temperatureMeasurement", {}).get("temperature", {})
            humidity_data = main.get("relativeHumidityMeasurement", {}).get("humidity", {})
            
            return {
                "temperature": temp_data.get("value"),
                "temperature_unit": temp_data.get("unit", "C"),
                "humidity": humidity_data.get("value"),
                "humidity_unit": humidity_data.get("unit", "%"),
                "device_id": device_id,
                "device_name": temp_device.get("label") or temp_device.get("name"),
                "timestamp": temp_data.get("timestamp"),
                "online": True
            }
            
    except httpx.HTTPError as e:
        logger.error(f"SmartThings clima error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


# ============== EWELINK/SONOFF INTEGRATION ==============
# Integrazione diretta con eWeLink per dispositivi Sonoff

EWELINK_APPID = os.environ.get('EWELINK_APPID', '')
EWELINK_APP_SECRET = os.environ.get('EWELINK_APP_SECRET', '')
EWELINK_REGION = os.environ.get('EWELINK_REGION', 'eu')
EWELINK_REDIRECT_URI = os.environ.get('EWELINK_REDIRECT_URI', '')

# eWeLink API URLs per regione
EWELINK_API_URLS = {
    'eu': 'https://eu-apia.coolkit.cc',
    'us': 'https://us-apia.coolkit.cc',
    'cn': 'https://cn-apia.coolkit.cn',
    'as': 'https://as-apia.coolkit.cc',
}

EWELINK_AUTH_URL = "https://c2ccdn.coolkit.cc/oauth/index.html"

# eWeLink token cache
ewelink_access_token = None
ewelink_refresh_token = None
ewelink_token_expires = None

# Models for eWeLink
class EwelinkTokenData(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    region: str = "eu"
    user_info: Optional[Dict[str, Any]] = None


async def get_ewelink_config():
    """Get eWeLink configuration from database"""
    try:
        prop = await db.property_config.find_one(
            {"is_active": True}, 
            {"integrations.ewelink": 1, "_id": 0}
        )
        if prop:
            return prop.get("integrations", {}).get("ewelink", {})
    except Exception as e:
        logger.debug(f"Could not get eWeLink config from DB: {e}")
    return {}


async def get_ewelink_token():
    """
    Get eWeLink access token from database.
    """
    global ewelink_access_token, ewelink_token_expires
    
    # Check cached token
    if ewelink_access_token and ewelink_token_expires and datetime.now(timezone.utc) < ewelink_token_expires:
        return ewelink_access_token
    
    # Try to get from database
    try:
        token_doc = await db.ewelink_tokens.find_one(
            {"region": EWELINK_REGION},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        if token_doc:
            expires_at = token_doc.get("expires_at")
            if expires_at and isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            
            if expires_at and datetime.now(timezone.utc) < expires_at:
                ewelink_access_token = token_doc.get("access_token")
                ewelink_token_expires = expires_at
                return ewelink_access_token
            
            # Token expired, try to refresh
            refresh_token = token_doc.get("refresh_token")
            if refresh_token:
                new_token = await refresh_ewelink_token(refresh_token)
                if new_token:
                    return new_token
    except Exception as e:
        logger.error(f"Error getting eWeLink token: {e}")
    
    return None


async def refresh_ewelink_token(refresh_token: str):
    """Refresh eWeLink access token using refresh token"""
    global ewelink_access_token, ewelink_token_expires
    
    base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/v2/user/refresh",
                json={
                    "rt": refresh_token
                },
                headers={
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("error") == 0:
                    new_token = data.get("data", {})
                    access_token = new_token.get("at")
                    new_refresh = new_token.get("rt", refresh_token)
                    expires_in = new_token.get("atExpiredTime", 86400)
                    
                    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                    
                    # Update cache
                    ewelink_access_token = access_token
                    ewelink_token_expires = expires_at
                    
                    # Update database
                    await db.ewelink_tokens.update_one(
                        {"refresh_token": refresh_token},
                        {
                            "$set": {
                                "access_token": access_token,
                                "refresh_token": new_refresh,
                                "expires_at": expires_at.isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    return access_token
    except Exception as e:
        logger.error(f"Error refreshing eWeLink token: {e}")
    
    return None


class EwelinkLoginRequest(BaseModel):
    email: str
    password: str
    region: str = "eu"


def make_ewelink_auth_sign(app_secret: str, body: dict) -> str:
    """Generate eWeLink API authorization signature - HMAC-SHA256 of JSON body"""
    import hmac
    import hashlib
    import base64
    
    body_str = json.dumps(body, separators=(',', ':'), ensure_ascii=False)
    signature = hmac.new(
        app_secret.encode('utf-8'),
        body_str.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    return base64.b64encode(signature).decode('utf-8')


@api_router.post("/ewelink/login")
async def ewelink_direct_login(login_data: EwelinkLoginRequest):
    """
    Login direttamente con email e password eWeLink.
    Più affidabile dell'OAuth per alcune configurazioni.
    """
    global ewelink_access_token, ewelink_refresh_token, ewelink_token_expires
    
    if not EWELINK_APPID or not EWELINK_APP_SECRET:
        raise HTTPException(status_code=500, detail="eWeLink credentials not configured")
    
    base_url = EWELINK_API_URLS.get(login_data.region, EWELINK_API_URLS['eu'])
    
    try:
        # Build request body
        body = {
            "email": login_data.email,
            "password": login_data.password,
            "countryCode": "+39"
        }
        
        # Generate signature from body
        sign = make_ewelink_auth_sign(EWELINK_APP_SECRET, body)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # eWeLink API v2 login endpoint
            response = await client.post(
                f"{base_url}/v2/user/login",
                json=body,
                headers={
                    "X-CK-Appid": EWELINK_APPID,
                    "Authorization": f"Sign {sign}",
                    "Content-Type": "application/json"
                }
            )
            
            data = response.json()
            logger.info(f"eWeLink login response: error={data.get('error')}, msg={data.get('msg')}")
            
            if response.status_code != 200 or data.get("error") != 0:
                error_msg = data.get("msg", "Login fallito")
                raise HTTPException(status_code=401, detail=error_msg)
            
            user_data = data.get("data", {})
            user_info = user_data.get("user", {})
            access_token = user_data.get("at")
            refresh_token = user_data.get("rt")
            
            if not access_token:
                raise HTTPException(status_code=400, detail="Nessun token ricevuto")
            
            # Calculate expiration (default 30 days)
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            # Update cache
            ewelink_access_token = access_token
            ewelink_refresh_token = refresh_token
            ewelink_token_expires = expires_at
            
            # Store in database
            await db.ewelink_tokens.update_one(
                {"region": login_data.region},
                {
                    "$set": {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "expires_at": expires_at.isoformat(),
                        "region": login_data.region,
                        "user_info": user_info,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Update property config
            await db.property_config.update_one(
                {"is_active": True},
                {
                    "$set": {
                        "integrations.ewelink.enabled": True,
                        "integrations.ewelink.region": login_data.region,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(f"eWeLink login successful! User: {user_info.get('email', 'unknown')}")
            
            return {
                "success": True,
                "message": "Login eWeLink riuscito!",
                "user": {
                    "email": user_info.get("email"),
                    "nickname": user_info.get("nickname"),
                    "countryCode": user_info.get("countryCode")
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink login error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore login: {str(e)}")


@api_router.get("/ewelink/auth-url")
async def get_ewelink_auth_url():
    """
    Generate eWeLink OAuth2 authorization URL with proper signature.
    """
    import hmac
    import hashlib
    import base64
    import secrets
    import time
    
    if not EWELINK_APPID or not EWELINK_APP_SECRET:
        raise HTTPException(status_code=500, detail="eWeLink credentials not configured")
    
    # Generate required parameters
    seq = str(int(time.time() * 1000))  # Timestamp in milliseconds
    nonce = ''.join(secrets.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(8))
    state = secrets.token_urlsafe(16)
    
    # Calculate authorization signature: HMAC-SHA256({clientId}_{seq}) with clientSecret as key
    message = f"{EWELINK_APPID}_{seq}"
    signature = hmac.new(
        EWELINK_APP_SECRET.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    authorization = base64.b64encode(signature).decode('utf-8')
    
    # Store state in database for verification
    await db.ewelink_auth_states.insert_one({
        "state": state,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Build authorization URL with all required parameters
    redirect_uri = EWELINK_REDIRECT_URI or f"{FRONTEND_URL}/api/ewelink/callback"
    
    # URL encode the redirect URI
    encoded_redirect = quote(redirect_uri, safe='')
    encoded_auth = quote(authorization, safe='')
    
    auth_url = (
        f"{EWELINK_AUTH_URL}"
        f"?clientId={EWELINK_APPID}"
        f"&seq={seq}"
        f"&authorization={encoded_auth}"
        f"&redirectUrl={encoded_redirect}"
        f"&grantType=authorization_code"
        f"&state={state}"
        f"&nonce={nonce}"
    )
    
    logger.info(f"Generated eWeLink auth URL with seq={seq}, nonce={nonce}")
    
    return {
        "auth_url": auth_url,
        "state": state,
        "redirect_uri": redirect_uri
    }


@api_router.get("/ewelink/callback")
async def ewelink_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    region: Optional[str] = "eu"
):
    """
    Handle OAuth2 callback from eWeLink.
    Exchange authorization code for access token.
    """
    global ewelink_access_token, ewelink_refresh_token, ewelink_token_expires
    
    logger.info(f"eWeLink OAuth callback received: code={code[:20] if code else 'None'}..., state={state}, error={error}")
    
    if error:
        logger.error(f"eWeLink OAuth error: {error}")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{FRONTEND_URL}?ewelink_auth=error&message={quote(error)}",
            status_code=302
        )
    
    if not code:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{FRONTEND_URL}?ewelink_auth=error&message=No%20authorization%20code",
            status_code=302
        )
    
    # Verify state if provided
    if state:
        state_doc = await db.ewelink_auth_states.find_one({"state": state})
        if not state_doc:
            logger.warning(f"Invalid state parameter: {state}")
        else:
            await db.ewelink_auth_states.delete_one({"state": state})
    
    # Exchange code for token
    base_url = EWELINK_API_URLS.get(region, EWELINK_API_URLS['eu'])
    redirect_uri = EWELINK_REDIRECT_URI or f"{FRONTEND_URL}/api/ewelink/callback"
    
    try:
        # Build request body - order matters for signature!
        token_body = {
            "grantType": "authorization_code",
            "code": code,
            "redirectUrl": redirect_uri
        }
        
        # Calculate signature on the EXACT body string we'll send
        # Use compact JSON without spaces
        body_str = json.dumps(token_body, separators=(',', ':'), ensure_ascii=False)
        
        # Calculate HMAC-SHA256 signature
        import hmac
        import hashlib
        import base64
        signature = hmac.new(
            EWELINK_APP_SECRET.encode('utf-8'),
            body_str.encode('utf-8'),
            hashlib.sha256
        ).digest()
        sign = base64.b64encode(signature).decode('utf-8')
        
        logger.info(f"eWeLink token exchange: body_str={body_str}")
        logger.info(f"eWeLink token exchange: sign={sign}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/v2/user/oauth/token",
                headers={
                    "X-CK-Appid": EWELINK_APPID,
                    "Authorization": f"Sign {sign}",
                    "Content-Type": "application/json"
                },
                content=body_str  # Send the EXACT same string used for signature
            )
            
            logger.info(f"eWeLink token response status: {response.status_code}")
            data = response.json()
            logger.info(f"eWeLink token response: {data}")
            
            if response.status_code != 200 or data.get("error") != 0:
                error_msg = data.get("msg", "Token exchange failed")
                raise HTTPException(status_code=400, detail=error_msg)
            
            token_data = data.get("data", {})
            access_token = token_data.get("accessToken") or token_data.get("at")
            refresh_token = token_data.get("refreshToken") or token_data.get("rt")
            # atExpiredTime is a timestamp in MILLISECONDS, not seconds
            at_expired_time = token_data.get("atExpiredTime", 0)
            user_info = token_data.get("user", {})
            
            if not access_token:
                raise HTTPException(status_code=400, detail="No access token in response")
            
            # Calculate expiration - atExpiredTime is already an absolute timestamp in ms
            if at_expired_time > 1000000000000:  # It's a timestamp in milliseconds
                expires_at = datetime.fromtimestamp(at_expired_time / 1000, tz=timezone.utc)
            elif at_expired_time > 0:  # It's seconds from now
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=at_expired_time)
            else:  # Default to 30 days
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            # Update cache
            ewelink_access_token = access_token
            ewelink_refresh_token = refresh_token
            ewelink_token_expires = expires_at
            
            # Store token in database
            await db.ewelink_tokens.update_one(
                {"region": region},
                {
                    "$set": {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "expires_at": expires_at.isoformat(),
                        "region": region,
                        "user_info": user_info,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Also update property config
            await db.property_config.update_one(
                {"is_active": True},
                {
                    "$set": {
                        "integrations.ewelink.enabled": True,
                        "integrations.ewelink.region": region,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(f"eWeLink OAuth successful. User: {user_info.get('email', 'unknown')}")
            
            # Redirect to frontend with success
            from fastapi.responses import RedirectResponse
            return RedirectResponse(
                url=f"{FRONTEND_URL}?ewelink_auth=success&email={user_info.get('email', '')}",
                status_code=302
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@api_router.get("/ewelink/status")
async def get_ewelink_status():
    """Check eWeLink connection status"""
    token = await get_ewelink_token()
    
    if not token:
        return {
            "connected": False,
            "message": "Non autenticato. Effettua il login eWeLink.",
            "auth_required": True
        }
    
    # Try to fetch user info to verify token
    base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{base_url}/v2/user/profile",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            data = response.json()
            if response.status_code == 200 and data.get("error") == 0:
                user = data.get("data", {})
                return {
                    "connected": True,
                    "message": "Connesso",
                    "user": {
                        "email": user.get("email"),
                        "nickname": user.get("nickname"),
                        "countryCode": user.get("countryCode")
                    },
                    "region": EWELINK_REGION
                }
            else:
                return {
                    "connected": False,
                    "message": data.get("msg", "Token non valido"),
                    "auth_required": True
                }
    except Exception as e:
        logger.error(f"eWeLink status check error: {e}")
        return {
            "connected": False,
            "message": f"Errore connessione: {str(e)}",
            "auth_required": True
        }


@api_router.get("/ewelink/devices")
async def get_ewelink_devices():
    """Get all eWeLink/Sonoff devices"""
    token = await get_ewelink_token()
    
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="eWeLink non autenticato. Effettua prima il login."
        )
    
    base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{base_url}/v2/device/thing",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            data = response.json()
            logger.info(f"eWeLink devices response: error={data.get('error')}, count={len(data.get('data', {}).get('thingList', []))}")
            
            if response.status_code != 200 or data.get("error") != 0:
                error_msg = data.get("msg", "Failed to fetch devices")
                if data.get("error") == 401:
                    raise HTTPException(status_code=401, detail="Token scaduto. Rieffettua il login.")
                raise HTTPException(status_code=400, detail=error_msg)
            
            things = data.get("data", {}).get("thingList", [])
            
            # Parse and format devices
            devices = []
            for thing in things:
                item_data = thing.get("itemData", {})
                uiid = item_data.get("extra", {}).get("uiid", 0)
                params = item_data.get("params", {})
                
                # Determine if device supports switch control
                # Sensor-only UIIDs that don't support switch
                sensor_only_uiids = [1770, 7014, 7017, 102, 1000, 1009, 1256, 1257, 1258, 1259, 3026]
                # Power monitoring UIIDs that DON'T support switch (pure monitors only)
                # Note: UIID 190 (S60TPF) is a smart plug WITH switch capability, so it's not included here
                power_monitor_only_uiids = [5, 32, 182]
                # Camera UIIDs
                camera_uiids = [87, 260]
                
                # Device can switch if:
                # 1. It has "switch" or "switches" in params (actual capability indicator)
                # 2. AND it's not a sensor-only or camera device
                has_switch_params = ("switch" in params or "switches" in params)
                can_switch = (
                    has_switch_params and
                    uiid not in sensor_only_uiids and 
                    uiid not in power_monitor_only_uiids and
                    uiid not in camera_uiids
                )
                
                device = {
                    "id": item_data.get("deviceid"),
                    "name": item_data.get("name", "Dispositivo Sconosciuto"),
                    "model": item_data.get("productModel", ""),
                    "brand": item_data.get("brandName", "Sonoff"),
                    "online": item_data.get("online", False),
                    "params": params,
                    "type": "ewelink",
                    "source": "ewelink",
                    "uiid": uiid,
                    "canSwitch": can_switch
                }
                
                # Extract common sensor values
                if "temperature" in params:
                    device["temperature"] = params["temperature"]
                if "humidity" in params:
                    device["humidity"] = params["humidity"]
                if "currentTemperature" in params:
                    device["temperature"] = params["currentTemperature"]
                if "currentHumidity" in params:
                    device["humidity"] = params["currentHumidity"]
                if "battery" in params:
                    device["battery"] = params["battery"]
                if "switch" in params:
                    device["switch"] = params["switch"]
                
                # Handle door/window contact sensors (UIID 7003 - SNZB-04)
                # lock: 0 = closed, lock: 1 = open
                # Only for UIID 7003 which is actual door/window sensor
                contact_sensor_uiids = [7003, 7014]  # SNZB-04, DW2 sensors
                if uiid in contact_sensor_uiids and "lock" in params:
                    device["contact"] = "open" if params["lock"] == 1 else "closed"
                    device["is_contact_sensor"] = True
                if uiid in contact_sensor_uiids and "trigTime" in params:
                    # Convert timestamp (milliseconds) to ISO format
                    try:
                        trig_ts = int(params["trigTime"]) / 1000
                        device["last_trigger"] = datetime.fromtimestamp(trig_ts, tz=timezone.utc).isoformat()
                    except:
                        pass
                
                # Extract air quality values (PM10, PM2.5, CO2)
                if "pm10" in params:
                    device["pm10"] = params["pm10"]
                if "pm2_5" in params:
                    device["pm2_5"] = params["pm2_5"]
                if "co2" in params:
                    device["co2"] = params["co2"]
                
                # Handle multi-channel devices (UIID 4, 7, 77, 78, etc.)
                # Expand into separate virtual devices for each channel
                switches = params.get("switches", [])
                if len(switches) > 1:
                    # Multi-channel device - create a device for each channel
                    base_name = item_data.get("name", "Dispositivo")
                    base_id = item_data.get("deviceid")
                    
                    for i, sw in enumerate(switches):
                        channel_device = {
                            "id": f"{base_id}_ch{i}",
                            "parent_id": base_id,
                            "channel": i,
                            "name": f"{base_name} - CH{i+1}",
                            "model": item_data.get("productModel", ""),
                            "brand": item_data.get("brandName", "Sonoff"),
                            "online": item_data.get("online", False),
                            "type": "ewelink",
                            "source": "ewelink",
                            "uiid": uiid,
                            "canSwitch": True,
                            "switch": sw.get("switch"),
                            "is_channel": True
                        }
                        devices.append(channel_device)
                    
                    # Also add the parent device with first channel state
                    device["switch"] = switches[0].get("switch") if switches else None
                    device["has_channels"] = True
                    device["channel_count"] = len(switches)
                    devices.append(device)
                else:
                    # Single channel device or device without switches array
                    if "switches" in params and len(params["switches"]) > 0:
                        device["switch"] = params["switches"][0].get("switch")
                    devices.append(device)
            
            return {
                "devices": devices,
                "count": len(devices),
                "source": "ewelink"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink devices error: {e}")
        raise HTTPException(status_code=500, detail=f"eWeLink API error: {str(e)}")


@api_router.get("/ewelink/device/{device_id}/status")
async def get_ewelink_device_status(device_id: str):
    """Get status of a specific eWeLink device"""
    token = await get_ewelink_token()
    
    if not token:
        raise HTTPException(status_code=401, detail="eWeLink non autenticato")
    
    base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{base_url}/v2/device/thing/status",
                params={"type": 1, "id": device_id},
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            data = response.json()
            
            if response.status_code != 200 or data.get("error") != 0:
                raise HTTPException(status_code=400, detail=data.get("msg", "Failed to get status"))
            
            params = data.get("data", {}).get("params", {})
            
            return {
                "device_id": device_id,
                "online": data.get("data", {}).get("online", False),
                "params": params,
                "temperature": params.get("temperature") or params.get("currentTemperature"),
                "humidity": params.get("humidity") or params.get("currentHumidity"),
                "battery": params.get("battery"),
                "switch": params.get("switch")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink device status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ewelink/device/{device_id}/switch/{action}")
async def control_ewelink_device(device_id: str, action: str):
    """Control eWeLink device (on/off) - supports multi-channel devices"""
    if action not in ["on", "off"]:
        raise HTTPException(status_code=400, detail="Action must be 'on' or 'off'")
    
    token = await get_ewelink_token()
    
    if not token:
        raise HTTPException(status_code=401, detail="eWeLink non autenticato")
    
    base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
    
    # Check if this is a channel-specific device (e.g., "10017b82bf_ch0")
    actual_device_id = device_id
    channel = None
    if "_ch" in device_id:
        parts = device_id.rsplit("_ch", 1)
        actual_device_id = parts[0]
        try:
            channel = int(parts[1])
        except ValueError:
            pass
    
    try:
        # First, get device info to check online status and UIID
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Get device list to check if device is online
            devices_response = await client.get(
                f"{base_url}/v2/device/thing",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            device_info = None
            if devices_response.status_code == 200:
                things = devices_response.json().get("data", {}).get("thingList", [])
                for thing in things:
                    item_data = thing.get("itemData", {})
                    if item_data.get("deviceid") == actual_device_id:
                        device_info = item_data
                        break
            
            if device_info and not device_info.get("online", False):
                raise HTTPException(status_code=400, detail="Dispositivo offline. Verificare la connessione.")
            
            # Determine params based on UIID
            uiid = device_info.get("extra", {}).get("uiid", 0) if device_info else 0
            params_data = device_info.get("params", {}) if device_info else {}
            
            # UIIDs that use "switches" array format (multi-channel devices)
            multi_channel_uiids = [2, 3, 4, 7, 8, 77, 78, 112, 113, 114, 138, 139, 140, 141, 190]
            
            # Also check if device actually has "switches" in params (more reliable)
            uses_switches_format = uiid in multi_channel_uiids or "switches" in params_data
            
            if uses_switches_format:
                # Multi-channel format - use specified channel or default to 0
                outlet = channel if channel is not None else 0
                params = {
                    "switches": [{"switch": action, "outlet": outlet}]
                }
            else:
                # Single channel format
                params = {
                    "switch": action
                }
            
            # Send control command
            response = await client.post(
                f"{base_url}/v2/device/thing/status",
                json={
                    "type": 1,
                    "id": actual_device_id,
                    "params": params
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CK-Appid": EWELINK_APPID,
                    "Content-Type": "application/json"
                }
            )
            
            data = response.json()
            logger.info(f"eWeLink control response for {device_id}: {data}")
            
            if response.status_code != 200 or data.get("error") != 0:
                error_msg = data.get("msg", "Control failed")
                logger.error(f"eWeLink control error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Errore controllo: {error_msg}")
            
            return {
                "success": True,
                "device_id": device_id,
                "action": action,
                "message": f"Dispositivo {action}"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink control error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/ewelink/sensors")
async def get_ewelink_sensors():
    """Get all eWeLink temperature/humidity sensors with current values"""
    token = await get_ewelink_token()
    
    if not token:
        raise HTTPException(status_code=401, detail="eWeLink non autenticato")
    
    # Get all devices
    devices_response = await get_ewelink_devices()
    all_devices = devices_response.get("devices", [])
    
    # Filter sensors (devices with temperature or humidity)
    sensors = []
    for device in all_devices:
        has_temp = device.get("temperature") is not None or "temperature" in device.get("params", {}) or "currentTemperature" in device.get("params", {})
        has_humidity = device.get("humidity") is not None or "humidity" in device.get("params", {}) or "currentHumidity" in device.get("params", {})
        
        if has_temp or has_humidity:
            sensors.append({
                "id": device["id"],
                "name": device["name"],
                "model": device.get("model", ""),
                "online": device.get("online", False),
                "temperature": device.get("temperature"),
                "humidity": device.get("humidity"),
                "battery": device.get("battery"),
                "source": "ewelink"
            })
    
    return {
        "sensors": sensors,
        "count": len(sensors),
        "source": "ewelink"
    }


@api_router.post("/ewelink/sensors/collect")
async def collect_ewelink_sensor_data():
    """Collect and store sensor readings from eWeLink devices"""
    try:
        sensors_response = await get_ewelink_sensors()
        sensors = sensors_response.get("sensors", [])
        
        readings_saved = 0
        for sensor in sensors:
            if not sensor.get("online"):
                continue
            
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Save temperature
            if sensor.get("temperature") is not None:
                await db.sensor_readings.insert_one({
                    "id": str(uuid.uuid4()),
                    "device_id": sensor["id"],
                    "device_name": sensor["name"],
                    "sensor_type": "temperature",
                    "value": float(sensor["temperature"]),
                    "unit": "C",
                    "source": "ewelink",
                    "timestamp": timestamp,
                    "user_id": DEFAULT_USER_ID
                })
                readings_saved += 1
            
            # Save humidity
            if sensor.get("humidity") is not None:
                await db.sensor_readings.insert_one({
                    "id": str(uuid.uuid4()),
                    "device_id": sensor["id"],
                    "device_name": sensor["name"],
                    "sensor_type": "humidity",
                    "value": float(sensor["humidity"]),
                    "unit": "%",
                    "source": "ewelink",
                    "timestamp": timestamp,
                    "user_id": DEFAULT_USER_ID
                })
                readings_saved += 1
            
            # Save battery
            if sensor.get("battery") is not None:
                await db.sensor_readings.insert_one({
                    "id": str(uuid.uuid4()),
                    "device_id": sensor["id"],
                    "device_name": sensor["name"],
                    "sensor_type": "battery",
                    "value": float(sensor["battery"]),
                    "unit": "%",
                    "source": "ewelink",
                    "timestamp": timestamp,
                    "user_id": DEFAULT_USER_ID
                })
                readings_saved += 1
        
        return {
            "success": True,
            "message": f"Raccolti {readings_saved} valori da {len(sensors)} sensori eWeLink",
            "readings_saved": readings_saved,
            "sensors_count": len(sensors)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"eWeLink sensor collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/sensors/collection-status")
async def get_sensor_collection_status():
    """Get the status of automatic sensor data collection"""
    global sensor_collection_task
    
    # Get latest readings
    latest_reading = await db.sensor_readings.find_one(
        {"source": "ewelink"},
        sort=[("timestamp", -1)]
    )
    
    # Count readings in last hour
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    readings_last_hour = await db.sensor_readings.count_documents({
        "source": "ewelink",
        "timestamp": {"$gte": one_hour_ago}
    })
    
    # Count total readings today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    readings_today = await db.sensor_readings.count_documents({
        "source": "ewelink",
        "timestamp": {"$gte": today_start}
    })
    
    return {
        "background_collector_active": sensor_collection_task is not None and not sensor_collection_task.done(),
        "collection_interval_seconds": SENSOR_COLLECTION_INTERVAL,
        "collection_interval_minutes": SENSOR_COLLECTION_INTERVAL // 60,
        "last_reading_timestamp": latest_reading.get("timestamp") if latest_reading else None,
        "readings_last_hour": readings_last_hour,
        "readings_today": readings_today,
        "source": "ewelink"
    }


@api_router.post("/sensors/force-collect")
async def force_sensor_collection():
    """Force immediate sensor data collection (manual trigger)"""
    try:
        # Use the existing eWeLink collection endpoint
        result = await collect_ewelink_sensor_data()
        return {
            "success": True,
            "message": "Raccolta manuale completata",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== EZVIZ CAMERA INTEGRATION ==============
# Supporta sia l'API ufficiale Open Platform (con AppKey) che pyezvizapi (fallback)

EZVIZ_USERNAME = os.environ.get('EZVIZ_USERNAME', '')
EZVIZ_PASSWORD = os.environ.get('EZVIZ_PASSWORD', '')
EZVIZ_REGION = os.environ.get('EZVIZ_REGION', 'eu')
EZVIZ_APPKEY = os.environ.get('EZVIZ_APPKEY', '')
EZVIZ_SECRET = os.environ.get('EZVIZ_SECRET', '')

# Ezviz session cache
ezviz_access_token = None
ezviz_token_expires = None
ezviz_client = None

# API URLs per regione - EU usa ieuopen.ezvizlife.com
EZVIZ_API_URLS = {
    'eu': 'https://ieuopen.ezvizlife.com',
    'it': 'https://ieuopen.ezvizlife.com',  # Italia usa EU
    'us': 'https://open.ys7.com',
    'asia': 'https://open.ys7.com',
    'global': 'https://isgpopen.ezvizlife.com',
}

async def get_ezviz_api_token():
    """Get Ezviz API token - usa AccessToken preconfigurato o genera nuovo"""
    global ezviz_access_token, ezviz_token_expires
    
    import httpx
    from datetime import datetime, timedelta
    
    # Se EZVIZ_APPKEY contiene già un AccessToken (inizia con "at."), usalo direttamente
    if EZVIZ_APPKEY and EZVIZ_APPKEY.startswith('at.'):
        logger.info("Using pre-configured Ezviz AccessToken")
        return EZVIZ_APPKEY
    
    # Se abbiamo un token valido in cache, usalo
    if ezviz_access_token and ezviz_token_expires and datetime.now() < ezviz_token_expires:
        return ezviz_access_token
    
    # Altrimenti prova a generare un nuovo token
    if not EZVIZ_APPKEY or not EZVIZ_SECRET:
        raise HTTPException(status_code=500, detail="Ezviz AppKey/Secret not configured")
    
    base_url = EZVIZ_API_URLS.get(EZVIZ_REGION.lower(), EZVIZ_API_URLS['eu'])
    token_url = f"{base_url}/api/lapp/token/get"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                token_url,
                data={
                    "appKey": EZVIZ_APPKEY,
                    "appSecret": EZVIZ_SECRET
                }
            )
            
            data = response.json()
            logger.info(f"Ezviz token response code: {data.get('code')}")
            
            if data.get('code') == '200' or data.get('code') == 200:
                ezviz_access_token = data['data']['accessToken']
                # Token valido per 6 giorni (default Ezviz)
                ezviz_token_expires = datetime.now() + timedelta(days=6)
                logger.info("Ezviz token obtained successfully!")
                return ezviz_access_token
            else:
                error_msg = data.get('msg', 'Unknown error')
                logger.error(f"Ezviz token failed: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Ezviz token failed: {error_msg}")
                
    except httpx.RequestError as e:
        logger.error(f"Ezviz API request error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API connection error: {str(e)}")
    except Exception as e:
        logger.error(f"Ezviz token error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz authentication error: {str(e)}")


async def get_ezviz_token():
    """Get Ezviz client - prova prima API ufficiale, poi fallback a pyezvizapi"""
    global ezviz_client
    
    # Se abbiamo AppKey, usa l'API ufficiale
    if EZVIZ_APPKEY:
        token = await get_ezviz_api_token()
        return {"type": "api", "token": token}
    
    # Fallback a pyezvizapi
    if not EZVIZ_USERNAME or not EZVIZ_PASSWORD:
        raise HTTPException(status_code=500, detail="Ezviz credentials not configured")
    
    try:
        from pyezvizapi import EzvizClient
        
        if ezviz_client is None:
            ezviz_client = EzvizClient(EZVIZ_USERNAME, EZVIZ_PASSWORD, EZVIZ_REGION)
            ezviz_client.login()
        
        return {"type": "client", "client": ezviz_client}
    except Exception as e:
        logger.error(f"Ezviz login error: {e}")
        ezviz_client = None
        raise HTTPException(status_code=500, detail=f"Ezviz authentication error: {str(e)}")


async def ezviz_api_request(endpoint: str, method: str = "GET", data: dict = None):
    """Make authenticated request to Ezviz Open Platform API (EU)"""
    import httpx
    
    token = await get_ezviz_api_token()
    base_url = EZVIZ_API_URLS.get(EZVIZ_REGION.lower(), EZVIZ_API_URLS['eu'])
    url = f"{base_url}{endpoint}"
    
    # L'API EU Ezviz richiede accessToken nel form-data, non nell'header
    request_data = data.copy() if data else {}
    request_data['accessToken'] = token
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method.upper() == "GET":
            response = await client.get(url, params=request_data)
        else:
            # Usa form-data invece di JSON per API EU
            response = await client.post(url, data=request_data)
        
        return response.json()


@api_router.get("/ezviz/access-token")
async def get_ezviz_access_token():
    """Get Ezviz access token for EZUIKit player"""
    global ezviz_access_token
    try:
        auth = await get_ezviz_token()
        if auth["type"] == "api" and ezviz_access_token:
            return {
                "accessToken": ezviz_access_token,
                "domain": "https://ieuopen.ezvizlife.com"  # EU domain
            }
        raise HTTPException(status_code=500, detail="Token not available")
    except Exception as e:
        logger.error(f"Ezviz token error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Camera-POI associations collection
# Format: { "camera_serial": "xxx", "poi_id": "xxx", "user_id": "xxx" }

@api_router.get("/ezviz/cameras")
async def get_ezviz_cameras(token: Optional[str] = Query(None)):
    """Get all Ezviz cameras with POI associations"""
    user = await get_user_from_token(token)
    
    try:
        auth = await get_ezviz_token()
        
        # Get camera-POI associations from database
        associations = {}
        async for assoc in db.camera_poi_associations.find({"user_id": user["id"]}, {"_id": 0}):
            associations[assoc["camera_serial"]] = assoc.get("poi_id")
        
        if auth["type"] == "api":
            # Usa API ufficiale Open Platform
            result = await ezviz_api_request("/api/lapp/device/list", "POST", {
                "pageStart": 0,
                "pageSize": 50
            })
            
            logger.info(f"Ezviz devices response: {result}")
            
            if result.get('code') != '200' and result.get('code') != 200:
                error_msg = result.get('msg', 'Unknown error')
                raise HTTPException(status_code=500, detail=f"Ezviz API error: {error_msg}")
            
            cameras = []
            online_count = 0
            offline_count = 0
            
            device_list = result.get('data', [])
            if isinstance(device_list, dict):
                device_list = device_list.get('deviceList', [])
            
            for device in device_list:
                status = "online" if device.get("status", 0) == 1 else "offline"
                if status == "online":
                    online_count += 1
                else:
                    offline_count += 1
                
                serial = device.get("deviceSerial")
                camera = {
                    "id": serial,
                    "serial": serial,
                    "name": device.get("deviceName", "Camera"),
                    "model": device.get("deviceType", "Unknown"),
                    "status": status,
                    "image_url": device.get("picUrl", ""),
                    "poi_id": associations.get(serial)
                }
                cameras.append(camera)
            
            return {
                "cameras": cameras,
                "total": len(cameras),
                "online": online_count,
                "offline": offline_count
            }
        else:
            # Usa pyezvizapi (fallback)
            client = auth["client"]
            cameras_data = client.get_all_cameras_info()
            
            cameras = []
            online_count = 0
            offline_count = 0
            
            for cam_info in cameras_data.values():
                status = "online" if cam_info.get("status", 0) == 1 else "offline"
                if status == "online":
                    online_count += 1
                else:
                    offline_count += 1
                
                serial = cam_info.get("serial")
                camera = {
                    "id": serial,
                    "serial": serial,
                    "name": cam_info.get("name", "Camera"),
                    "model": cam_info.get("device_type", "Unknown"),
                    "status": status,
                    "image_url": cam_info.get("cover", ""),
                    "poi_id": associations.get(serial)
                }
                cameras.append(camera)
            
            return {
                "cameras": cameras,
                "total": len(cameras),
                "online": online_count,
                "offline": offline_count
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz cameras error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


@api_router.post("/ezviz/camera/{serial}/link-poi")
async def link_camera_to_poi(serial: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    """Link a camera to a POI for navigation"""
    user = await get_user_from_token(token)
    poi_id = data.get("poi_id")
    
    if not poi_id:
        # Remove association
        await db.camera_poi_associations.delete_one({
            "camera_serial": serial,
            "user_id": user["id"]
        })
        return {"success": True, "message": "Association removed"}
    
    # Create or update association
    await db.camera_poi_associations.update_one(
        {"camera_serial": serial, "user_id": user["id"]},
        {"$set": {
            "camera_serial": serial,
            "poi_id": poi_id,
            "user_id": user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Camera linked to POI", "poi_id": poi_id}


@api_router.get("/ezviz/camera/{serial}/poi")
async def get_camera_poi(serial: str, token: Optional[str] = Query(None)):
    """Get POI associated with a camera"""
    user = await get_user_from_token(token)
    
    assoc = await db.camera_poi_associations.find_one({
        "camera_serial": serial,
        "user_id": user["id"]
    }, {"_id": 0})
    
    if not assoc or not assoc.get("poi_id"):
        return {"poi": None}
    
    poi = await db.pois.find_one({"id": assoc["poi_id"]}, {"_id": 0})
    if poi:
        poi = deserialize_datetime(poi)
    
    return {"poi": poi}


@api_router.get("/ezviz/camera/{serial}/snapshot")
async def get_ezviz_camera_snapshot(serial: str):
    """Get latest snapshot from Ezviz camera"""
    try:
        auth = await get_ezviz_token()
        
        if auth["type"] == "api":
            # Usa API ufficiale - richiedi capture
            result = await ezviz_api_request("/api/lapp/device/capture", "POST", {
                "deviceSerial": serial,
                "channelNo": 1
            })
            
            if result.get('code') == '200' or result.get('code') == 200:
                pic_url = result.get('data', {}).get('picUrl', '')
                return {"serial": serial, "image_url": pic_url, "url": pic_url}
            else:
                # Fallback - prendi dalla lista dispositivi
                cameras = await get_ezviz_cameras()
                for cam in cameras.get('cameras', []):
                    if cam['serial'] == serial:
                        return {"serial": serial, "image_url": cam.get('image_url', ''), "url": cam.get('image_url', '')}
                raise HTTPException(status_code=404, detail="Camera not found")
        else:
            # Usa pyezvizapi
            client = auth["client"]
            cameras_data = client.get_all_cameras_info()
            
            if serial in cameras_data:
                cover_url = cameras_data[serial].get("cover", "")
                return {"serial": serial, "image_url": cover_url, "url": cover_url}
            
            raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz snapshot error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


@api_router.get("/ezviz/camera/{serial}/capture")
async def capture_ezviz_camera_snapshot(serial: str):
    """Force capture a new snapshot from Ezviz camera"""
    try:
        auth = await get_ezviz_token()
        
        if auth["type"] == "api":
            # Force new capture
            result = await ezviz_api_request("/api/lapp/device/capture", "POST", {
                "deviceSerial": serial,
                "channelNo": 1
            })
            
            logger.info(f"Ezviz capture result for {serial}: code={result.get('code')}")
            
            if result.get('code') == '200' or result.get('code') == 200:
                pic_url = result.get('data', {}).get('picUrl', '')
                if pic_url:
                    return {"serial": serial, "url": pic_url, "image_url": pic_url, "success": True}
            
            # If capture failed, try to get existing image
            error_msg = result.get('msg', 'Capture failed')
            logger.warning(f"Ezviz capture failed for {serial}: {error_msg}")
            
            # Fallback to device info
            cameras = await get_ezviz_cameras()
            for cam in cameras.get('cameras', []):
                if cam['serial'] == serial:
                    img_url = cam.get('image_url', '')
                    if img_url:
                        return {"serial": serial, "url": img_url, "image_url": img_url, "success": True, "fallback": True}
            
            raise HTTPException(status_code=400, detail=error_msg)
        else:
            # Usa pyezvizapi
            client = auth["client"]
            cameras_data = client.get_all_cameras_info()
            
            if serial in cameras_data:
                cover_url = cameras_data[serial].get("cover", "")
                return {"serial": serial, "url": cover_url, "image_url": cover_url, "success": True}
            
            raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz capture error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


@api_router.get("/ezviz/camera/{serial}/stream")
async def get_ezviz_camera_stream_url(serial: str, protocol: int = 2, quality: int = 1):
    """
    Get stream URL for Ezviz camera
    protocol: 1=ezopen, 2=hls, 3=rtmp
    quality: 1=HD, 2=SD
    """
    try:
        auth = await get_ezviz_token()
        
        if auth["type"] == "api":
            # Try HLS first (protocol 2)
            result = await ezviz_api_request("/api/lapp/live/address/get", "POST", {
                "deviceSerial": serial,
                "channelNo": 1,
                "protocol": protocol,
                "quality": quality
            })
            
            logger.info(f"Ezviz stream response for {serial}: code={result.get('code')}, msg={result.get('msg')}")
            
            if result.get('code') == '200' or result.get('code') == 200:
                stream_url = result.get('data', {}).get('url', '')
                return {
                    "serial": serial, 
                    "stream_url": stream_url,
                    "protocol": protocol,
                    "quality": quality
                }
            
            # If HLS failed, try all protocols
            for try_protocol in [1, 2, 3]:
                if try_protocol == protocol:
                    continue
                result2 = await ezviz_api_request("/api/lapp/live/address/get", "POST", {
                    "deviceSerial": serial,
                    "channelNo": 1,
                    "protocol": try_protocol,
                    "quality": quality
                })
                if result2.get('code') == '200' or result2.get('code') == 200:
                    return {
                        "serial": serial, 
                        "stream_url": result2.get('data', {}).get('url', ''),
                        "protocol": try_protocol,
                        "quality": quality
                    }
            
            # Return error with message
            error_msg = result.get('msg', 'Stream non disponibile')
            if '9053' in str(result):
                error_msg = "Crittografia video attiva. Disabilitala nell'app Ezviz: Impostazioni > Crittografia Video > OFF"
            raise HTTPException(status_code=400, detail=error_msg)
        else:
            # Usa pyezvizapi
            client = auth["client"]
            try:
                url = client.get_camera_live_url(serial)
                return {"serial": serial, "stream_url": url}
            except:
                cameras_data = client.get_all_cameras_info()
                if serial in cameras_data:
                    return {"serial": serial, "stream_url": cameras_data[serial].get("cover", "")}
                raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz stream error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


# ============== MATTERPORT SPACES & POI API ==============

# --- Matterport Spaces ---

@api_router.get("/matterport/spaces", response_model=List[MatterportSpace])
async def get_matterport_spaces():
    """Get all Matterport spaces"""
    spaces = await db.matterport_spaces.find(
        {"user_id": DEFAULT_USER_ID},
        {"_id": 0}
    ).to_list(100)
    
    # Count POIs for each space
    for space in spaces:
        poi_count = await db.pois.count_documents({
            "space_id": space["id"],
            "user_id": DEFAULT_USER_ID
        })
        space["poi_count"] = poi_count
    
    return spaces


@api_router.get("/matterport/spaces/active")
async def get_active_matterport_space():
    """Get the currently active Matterport space"""
    space = await db.matterport_spaces.find_one(
        {"user_id": DEFAULT_USER_ID, "is_active": True},
        {"_id": 0}
    )
    if not space:
        # Return default space from env
        return {
            "space_id": MATTERPORT_SPACE_ID,
            "name": "Spazio Principale",
            "is_active": True,
            "sdk_key": os.environ.get('MATTERPORT_SDK_KEY', '')
        }
    return space


@api_router.post("/matterport/spaces", response_model=MatterportSpace)
async def create_matterport_space(space: MatterportSpaceCreate):
    """Create a new Matterport space"""
    space_dict = space.model_dump()
    space_dict["id"] = str(uuid.uuid4())
    space_dict["user_id"] = DEFAULT_USER_ID
    space_dict["poi_count"] = 0
    space_dict["created_at"] = datetime.now(timezone.utc)
    space_dict["updated_at"] = datetime.now(timezone.utc)
    
    # If this space is active, deactivate others
    if space_dict.get("is_active"):
        await db.matterport_spaces.update_many(
            {"user_id": DEFAULT_USER_ID},
            {"$set": {"is_active": False}}
        )
    
    await db.matterport_spaces.insert_one(space_dict)
    space_dict.pop("_id", None)
    return space_dict


@api_router.put("/matterport/spaces/{space_id}", response_model=MatterportSpace)
async def update_matterport_space(space_id: str, space: MatterportSpaceUpdate):
    """Update a Matterport space"""
    update_data = {k: v for k, v in space.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If activating this space, deactivate others
    if update_data.get("is_active"):
        await db.matterport_spaces.update_many(
            {"user_id": DEFAULT_USER_ID, "id": {"$ne": space_id}},
            {"$set": {"is_active": False}}
        )
    
    result = await db.matterport_spaces.find_one_and_update(
        {"id": space_id, "user_id": DEFAULT_USER_ID},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Space not found")
    result.pop("_id", None)
    return result


@api_router.delete("/matterport/spaces/{space_id}")
async def delete_matterport_space(space_id: str):
    """Delete a Matterport space and its POIs"""
    result = await db.matterport_spaces.delete_one({
        "id": space_id, "user_id": DEFAULT_USER_ID
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Space not found")
    
    # Also delete all POIs associated with this space
    await db.pois.delete_many({"space_id": space_id})
    
    return {"message": "Space and associated POIs deleted"}


@api_router.post("/matterport/spaces/{space_id}/activate")
async def activate_matterport_space(space_id: str):
    """Set a space as the active one"""
    # Deactivate all others
    await db.matterport_spaces.update_many(
        {"user_id": DEFAULT_USER_ID},
        {"$set": {"is_active": False}}
    )
    
    # Activate this one
    result = await db.matterport_spaces.find_one_and_update(
        {"id": space_id, "user_id": DEFAULT_USER_ID},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Space not found")
    result.pop("_id", None)
    return result


# --- POI Management ---

@api_router.get("/matterport/pois", response_model=List[POI])
async def get_all_pois(space_id: Optional[str] = None, token: Optional[str] = Query(None)):
    """Get all POIs, optionally filtered by space and user"""
    user = await get_user_from_token(token)
    query = {"user_id": user["id"]}
    
    # If user has a specific space assigned, filter by it
    if user.get("matterport_space_id"):
        query["space_id"] = user["matterport_space_id"]
    elif space_id:
        query["space_id"] = space_id
    
    pois = await db.pois.find(query, {"_id": 0}).to_list(500)
    return pois


@api_router.get("/matterport/pois/{poi_id}", response_model=POIWithDetails)
async def get_poi(poi_id: str, token: Optional[str] = Query(None)):
    """Get a single POI with details"""
    user = await get_user_from_token(token)
    poi = await db.pois.find_one(
        {"id": poi_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    # Get linked elettrodomestico if any
    if poi.get("elettrodomestico_id"):
        elettro = await db.elettrodomestici.find_one(
            {"id": poi["elettrodomestico_id"]},
            {"_id": 0}
        )
        poi["elettrodomestico"] = elettro
    
    # Get space info
    space = await db.matterport_spaces.find_one(
        {"id": poi["space_id"]},
        {"_id": 0}
    )
    poi["space"] = space
    
    return poi


@api_router.post("/matterport/pois", response_model=POI)
async def create_poi(poi: POICreate, token: Optional[str] = Query(None)):
    """Create a new POI"""
    user = await get_user_from_token(token)
    poi_dict = poi.model_dump()
    poi_dict["id"] = str(uuid.uuid4())
    poi_dict["user_id"] = user["id"]
    poi_dict["created_at"] = datetime.now(timezone.utc)
    poi_dict["updated_at"] = datetime.now(timezone.utc)
    
    # IMPORTANT: Always use user's matterport_space_id if available
    # This ensures POIs are created with the correct space_id for filtering
    if user.get("matterport_space_id"):
        poi_dict["space_id"] = user["matterport_space_id"]
    elif poi_dict.get("space_id", "").startswith("user_"):
        # Handle virtual space IDs (user_xxx) - use user's matterport_space_id
        user_id_from_space = poi_dict["space_id"].replace("user_", "")
        user_doc = await db.users.find_one({"id": user_id_from_space}, {"_id": 0})
        if user_doc and user_doc.get("matterport_space_id"):
            poi_dict["space_id"] = user_doc["matterport_space_id"]
    else:
        # Try to find the matterport space_id from local space
        local_space = await db.matterport_spaces.find_one({"id": poi_dict.get("space_id")}, {"_id": 0})
        if local_space and local_space.get("space_id"):
            poi_dict["space_id"] = local_space["space_id"]
    
    await db.pois.insert_one(poi_dict)
    poi_dict.pop("_id", None)
    return poi_dict


@api_router.put("/matterport/pois/{poi_id}", response_model=POI)
async def update_poi(poi_id: str, poi: POIUpdate, token: Optional[str] = Query(None)):
    """Update a POI"""
    user = await get_user_from_token(token)
    update_data = {k: v for k, v in poi.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Handle nested objects properly
    if "position" in update_data and update_data["position"]:
        update_data["position"] = update_data["position"] if isinstance(update_data["position"], dict) else update_data["position"].model_dump()
    if "translations" in update_data:
        update_data["translations"] = [t if isinstance(t, dict) else t.model_dump() for t in update_data["translations"]]
    if "attachments" in update_data:
        update_data["attachments"] = [a if isinstance(a, dict) else a.model_dump() for a in update_data["attachments"]]
    
    result = await db.pois.find_one_and_update(
        {"id": poi_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="POI not found")
    result.pop("_id", None)
    return result


@api_router.delete("/matterport/pois/{poi_id}")
async def delete_poi(poi_id: str, token: Optional[str] = Query(None)):
    """Delete a POI and its files"""
    user = await get_user_from_token(token)
    
    # Get POI first to delete associated files
    poi = await db.pois.find_one({"id": poi_id, "user_id": user["id"]})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    # Delete audio files
    for trans in poi.get("translations", []):
        if trans.get("audio_url"):
            audio_path = POI_AUDIO_DIR / Path(trans["audio_url"]).name
            if audio_path.exists():
                audio_path.unlink()
    
    # Delete attachments
    for att in poi.get("attachments", []):
        att_path = POI_ATTACHMENTS_DIR / att.get("filename", "")
        if att_path.exists():
            att_path.unlink()
    
    await db.pois.delete_one({"id": poi_id, "user_id": user["id"]})
    return {"message": "POI deleted"}


# --- Import Tags from Matterport ---

@api_router.post("/matterport/spaces/{space_id}/import-tags")
async def import_matterport_tags(space_id: str, tags: List[Dict[str, Any]], token: str = Query(None)):
    """
    Import selected tags from Matterport SDK into POIs.
    Frontend sends the tags data fetched from SDK.
    """
    # Get user from token
    user_id = DEFAULT_USER_ID
    if token:
        session = await db.sessions.find_one({"token": token}, {"_id": 0})
        if session:
            user_id = session.get("user_id", DEFAULT_USER_ID)
    
    # Handle virtual space IDs (user_xxx) - extract real space_id
    actual_space_id = space_id
    if space_id.startswith("user_"):
        # This is a virtual space, need to get the real matterport space_id from user
        user_doc = await db.users.find_one({"id": space_id.replace("user_", "")}, {"_id": 0})
        if user_doc and user_doc.get("matterport_space_id"):
            actual_space_id = user_doc["matterport_space_id"]
    
    imported_count = 0
    skipped_count = 0
    
    for tag in tags:
        # Check if tag already imported
        existing = await db.pois.find_one({
            "space_id": actual_space_id,
            "matterport_tag_id": tag.get("sid") or tag.get("id"),
            "user_id": user_id
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Extract position
        position = None
        if tag.get("anchorPosition"):
            pos = tag["anchorPosition"]
            position = {
                "x": pos.get("x", 0),
                "y": pos.get("y", 0),
                "z": pos.get("z", 0),
                "floor_id": tag.get("floorId"),
                "floor_name": tag.get("floorName")
            }
        
        # Create initial Italian translation from tag data
        translations = []
        label = tag.get("label") or tag.get("name") or "POI"
        description = tag.get("description") or tag.get("stemLabel") or ""
        
        translations.append({
            "language": "it",
            "title": label,
            "description": description,
            "audio_url": None,
            "audio_generated_at": None
        })
        
        # Create POI
        poi_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "space_id": actual_space_id,
            "matterport_tag_id": tag.get("sid") or tag.get("id"),
            "position": position,
            "translations": translations,
            "elettrodomestico_id": None,
            "attachments": [],
            "icon": tag.get("icon"),
            "color": tag.get("color"),
            "is_imported": True,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.pois.insert_one(poi_dict)
        imported_count += 1
    
    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "message": f"Importati {imported_count} POI, {skipped_count} già esistenti"
    }


# --- Translation Service ---

@api_router.post("/matterport/pois/{poi_id}/translate")
async def translate_poi(poi_id: str, request: TranslationRequest):
    """
    Translate POI description to multiple languages using AI.
    Uses Emergent LLM Key with GPT for translation.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    poi = await db.pois.find_one(
        {"id": poi_id, "user_id": DEFAULT_USER_ID}
    )
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    translations = poi.get("translations", [])
    source_lang_name = LANGUAGE_NAMES.get(request.source_language, request.source_language)
    
    # Find source translation title
    source_trans = next((t for t in translations if t["language"] == request.source_language), None)
    source_title = source_trans.get("title", "POI") if source_trans else "POI"
    
    try:
        llm = LlmChat(api_key=EMERGENT_LLM_KEY)
        
        for target_lang in request.target_languages:
            if target_lang == request.source_language:
                continue
            
            target_lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)
            
            # Translate title and description
            prompt = f"""Traduci il seguente testo da {source_lang_name} a {target_lang_name}.
Rispondi SOLO con il JSON, senza spiegazioni.

Testo da tradurre:
Titolo: {source_title}
Descrizione: {request.source_text}

Rispondi in formato JSON:
{{"title": "titolo tradotto", "description": "descrizione tradotta"}}"""

            response = await llm.chat([UserMessage(content=prompt)])
            
            # Parse JSON response
            try:
                # Clean response - remove markdown code blocks if present
                response_text = response.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                response_text = response_text.strip()
                
                translated = json.loads(response_text)
                translated_title = translated.get("title", source_title)
                translated_desc = translated.get("description", request.source_text)
            except json.JSONDecodeError:
                # Fallback: use whole response as description
                translated_title = source_title
                translated_desc = response.strip()
            
            # Update or add translation
            existing_idx = next((i for i, t in enumerate(translations) if t["language"] == target_lang), None)
            
            new_trans = {
                "language": target_lang,
                "title": translated_title,
                "description": translated_desc,
                "audio_url": translations[existing_idx].get("audio_url") if existing_idx is not None else None,
                "audio_generated_at": translations[existing_idx].get("audio_generated_at") if existing_idx is not None else None
            }
            
            if existing_idx is not None:
                translations[existing_idx] = new_trans
            else:
                translations.append(new_trans)
        
        # Update POI
        await db.pois.update_one(
            {"id": poi_id},
            {"$set": {"translations": translations, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "message": "Traduzioni completate",
            "translations": translations
        }
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


# --- Audio Generation (TTS) ---

@api_router.post("/matterport/pois/{poi_id}/generate-audio")
async def generate_poi_audio(poi_id: str, request: AudioGenerationRequest):
    """
    Generate TTS audio for POI translations.
    Uses OpenAI TTS via Emergent integration.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    poi = await db.pois.find_one(
        {"id": poi_id, "user_id": DEFAULT_USER_ID}
    )
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    translations = poi.get("translations", [])
    generated_count = 0
    
    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        
        for lang in request.languages:
            # Find translation for this language
            trans_idx = next((i for i, t in enumerate(translations) if t["language"] == lang), None)
            
            if trans_idx is None:
                continue
            
            trans = translations[trans_idx]
            text_to_speak = f"{trans.get('title', '')}. {trans.get('description', '')}"
            
            if not text_to_speak.strip():
                continue
            
            # Generate audio
            audio_bytes = await tts.generate_speech(
                text=text_to_speak[:4000],  # Max 4096 chars
                model=request.model,
                voice=request.voice,
                response_format="mp3"
            )
            
            # Save audio file
            filename = f"{poi_id}_{lang}.mp3"
            audio_path = POI_AUDIO_DIR / filename
            
            async with aiofiles.open(audio_path, "wb") as f:
                await f.write(audio_bytes)
            
            # Update translation with audio URL
            translations[trans_idx]["audio_url"] = f"/api/matterport/files/audio/{filename}"
            translations[trans_idx]["audio_generated_at"] = datetime.now(timezone.utc).isoformat()
            generated_count += 1
        
        # Update POI
        await db.pois.update_one(
            {"id": poi_id},
            {"$set": {"translations": translations, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "message": f"Audio generato per {generated_count} lingue",
            "generated_count": generated_count,
            "translations": translations
        }
        
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation error: {str(e)}")


# --- File serving for POI files ---

@api_router.get("/matterport/files/audio/{filename}")
async def get_poi_audio(filename: str):
    """Serve POI audio file"""
    file_path = POI_AUDIO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg")


@api_router.get("/matterport/files/attachment/{filename}")
async def get_poi_attachment(filename: str):
    """Serve POI attachment file"""
    file_path = POI_ATTACHMENTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Determine media type
    suffix = file_path.suffix.lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".mp4": "video/mp4",
        ".webm": "video/webm"
    }
    media_type = media_types.get(suffix, "application/octet-stream")
    
    return FileResponse(file_path, media_type=media_type)


# --- Upload attachment to POI ---

@api_router.post("/matterport/pois/{poi_id}/attachments")
async def upload_poi_attachment(poi_id: str, file: UploadFile = File(...)):
    """Upload an attachment to a POI"""
    poi = await db.pois.find_one(
        {"id": poi_id, "user_id": DEFAULT_USER_ID}
    )
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{poi_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = POI_ATTACHMENTS_DIR / unique_filename
    
    # Determine file type
    file_types = {
        ".pdf": "pdf",
        ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".webp": "image",
        ".mp4": "video", ".webm": "video", ".mov": "video",
        ".doc": "document", ".docx": "document", ".txt": "document"
    }
    file_type = file_types.get(file_ext, "document")
    
    # Save file
    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    # Create attachment record
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "file_type": file_type,
        "file_url": f"/api/matterport/files/attachment/{unique_filename}",
        "file_size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to POI
    attachments = poi.get("attachments", [])
    attachments.append(attachment)
    
    await db.pois.update_one(
        {"id": poi_id},
        {"$set": {"attachments": attachments, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return attachment


@api_router.delete("/matterport/pois/{poi_id}/attachments/{attachment_id}")
async def delete_poi_attachment(poi_id: str, attachment_id: str):
    """Delete an attachment from a POI"""
    poi = await db.pois.find_one(
        {"id": poi_id, "user_id": DEFAULT_USER_ID}
    )
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    
    attachments = poi.get("attachments", [])
    att_idx = next((i for i, a in enumerate(attachments) if a.get("id") == attachment_id), None)
    
    if att_idx is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file
    att = attachments[att_idx]
    file_path = POI_ATTACHMENTS_DIR / att.get("filename", "")
    if file_path.exists():
        file_path.unlink()
    
    # Remove from list
    attachments.pop(att_idx)
    
    await db.pois.update_one(
        {"id": poi_id},
        {"$set": {"attachments": attachments, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Attachment deleted"}


# --- Create POI from navigation (acquire coordinates) ---

@api_router.post("/matterport/spaces/{space_id}/create-poi-at-position")
async def create_poi_at_position(
    space_id: str,
    position: POIPosition,
    title: str = Form(...),
    description: str = Form("")
):
    """
    Create a new POI at a specific position in the 3D space.
    Used when user clicks on a point in the Matterport viewer to create a new POI.
    """
    # Verify space exists
    space = await db.matterport_spaces.find_one(
        {"id": space_id, "user_id": DEFAULT_USER_ID}
    )
    if not space:
        # Create default space if it doesn't exist
        space = {
            "id": space_id,
            "space_id": space_id,
            "name": "Spazio Principale",
            "user_id": DEFAULT_USER_ID,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.matterport_spaces.insert_one(space)
    
    # Create POI with Italian translation
    poi_dict = {
        "id": str(uuid.uuid4()),
        "user_id": DEFAULT_USER_ID,
        "space_id": space_id,
        "matterport_tag_id": None,
        "position": position.model_dump(),
        "translations": [{
            "language": "it",
            "title": title,
            "description": description,
            "audio_url": None,
            "audio_generated_at": None
        }],
        "elettrodomestico_id": None,
        "attachments": [],
        "icon": None,
        "color": "#00BFFF",  # Default cyan color
        "is_imported": False,
        "is_visible": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.pois.insert_one(poi_dict)
    poi_dict.pop("_id", None)
    
    return poi_dict


# ============== WEATHER API ==============

WEATHER_CITY = os.environ.get('WEATHER_CITY', 'Nuoro')
WEATHER_LAT = os.environ.get('WEATHER_LAT', '40.3125')
WEATHER_LON = os.environ.get('WEATHER_LON', '9.3125')

@api_router.get("/weather")
async def get_weather():
    """Get current weather and forecast using Open-Meteo API"""
    try:
        async with httpx.AsyncClient() as client:
            # Current weather
            current_url = f"https://api.open-meteo.com/v1/forecast?latitude={WEATHER_LAT}&longitude={WEATHER_LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Rome"
            current_response = await client.get(current_url)
            current_data = current_response.json()
            
            # Forecast
            forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={WEATHER_LAT}&longitude={WEATHER_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Rome&forecast_days=7"
            forecast_response = await client.get(forecast_url)
            forecast_data = forecast_response.json()
            
            # Weather code to description and icon mapping
            weather_codes = {
                0: ("Sereno", "☀️"),
                1: ("Prevalentemente sereno", "🌤️"),
                2: ("Parzialmente nuvoloso", "⛅"),
                3: ("Nuvoloso", "☁️"),
                45: ("Nebbia", "🌫️"),
                48: ("Nebbia con brina", "🌫️"),
                51: ("Pioviggine leggera", "🌧️"),
                53: ("Pioviggine moderata", "🌧️"),
                55: ("Pioviggine intensa", "🌧️"),
                61: ("Pioggia leggera", "🌧️"),
                63: ("Pioggia moderata", "🌧️"),
                65: ("Pioggia intensa", "🌧️"),
                71: ("Neve leggera", "🌨️"),
                73: ("Neve moderata", "🌨️"),
                75: ("Neve intensa", "🌨️"),
                80: ("Rovesci leggeri", "🌦️"),
                81: ("Rovesci moderati", "🌦️"),
                82: ("Rovesci violenti", "🌦️"),
                95: ("Temporale", "⛈️"),
                96: ("Temporale con grandine", "⛈️"),
                99: ("Temporale violento", "⛈️")
            }
            
            current_code = current_data.get("current", {}).get("weather_code", 0)
            weather_desc, weather_icon = weather_codes.get(current_code, ("Sconosciuto", "❓"))
            
            # Build current weather object
            current = {
                "city": WEATHER_CITY,
                "latitude": float(WEATHER_LAT),
                "longitude": float(WEATHER_LON),
                "elevation": current_data.get("elevation", 0),
                "temperature": current_data.get("current", {}).get("temperature_2m", 0),
                "humidity": current_data.get("current", {}).get("relative_humidity_2m", 0),
                "wind_speed": current_data.get("current", {}).get("wind_speed_10m", 0),
                "weather_code": current_code,
                "weather_description": weather_desc,
                "weather_icon": weather_icon
            }
            
            # Build forecast
            daily = forecast_data.get("daily", {})
            forecast = []
            if daily.get("time"):
                for i in range(min(7, len(daily["time"]))):
                    code = daily.get("weather_code", [0])[i] if i < len(daily.get("weather_code", [])) else 0
                    desc, icon = weather_codes.get(code, ("Sconosciuto", "❓"))
                    forecast.append({
                        "date": daily["time"][i],
                        "temp_max": daily.get("temperature_2m_max", [0])[i] if i < len(daily.get("temperature_2m_max", [])) else 0,
                        "temp_min": daily.get("temperature_2m_min", [0])[i] if i < len(daily.get("temperature_2m_min", [])) else 0,
                        "weather_code": code,
                        "weather_description": desc,
                        "weather_icon": icon
                    })
            
            return {
                "current": current,
                "forecast": forecast,
                "city": WEATHER_CITY
            }
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        raise HTTPException(status_code=500, detail=f"Weather API error: {str(e)}")


# ============== SYSTEM STATUS ==============

@api_router.get("/system/status")
async def get_system_status():
    """Get overall system status"""
    status = {
        "ok": 0,
        "attenzione": 0,
        "critici": 0,
        "totali": 0,
        "smartthings_connected": bool(SMARTTHINGS_TOKEN),
        "ezviz_connected": bool((EZVIZ_USERNAME and EZVIZ_PASSWORD) or EZVIZ_APPKEY),
        "matterport_configured": bool(MATTERPORT_SPACE_ID)
    }
    
    # Check SmartThings devices
    if SMARTTHINGS_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{SMARTTHINGS_API_URL}/devices",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if response.status_code == 200:
                    devices = response.json().get("items", [])
                    status["totali"] += len(devices)
                    status["ok"] += len(devices)  # Assume all connected devices are OK
        except:
            pass
    
    # Check Ezviz cameras
    if (EZVIZ_USERNAME and EZVIZ_PASSWORD) or EZVIZ_APPKEY:
        try:
            cameras_result = await get_ezviz_cameras()
            for cam in cameras_result.get("cameras", []):
                status["totali"] += 1
                if cam.get("status") == "online":
                    status["ok"] += 1
                else:
                    status["critici"] += 1
        except:
            pass
    
    return status


# ============== SENSOR HISTORY ENDPOINTS ==============

@api_router.post("/sensors/readings")
async def store_sensor_reading(reading: SensorReadingCreate):
    """Store a single sensor reading"""
    doc = SensorReading(**reading.model_dump()).model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.sensor_readings.insert_one(doc)
    return {"status": "stored", "id": doc["id"]}


@api_router.post("/sensors/readings/batch")
async def store_sensor_readings_batch(readings: List[SensorReadingCreate]):
    """Store multiple sensor readings at once"""
    docs = []
    for r in readings:
        doc = SensorReading(**r.model_dump()).model_dump()
        doc["timestamp"] = doc["timestamp"].isoformat()
        docs.append(doc)
    
    if docs:
        await db.sensor_readings.insert_many(docs)
    return {"status": "stored", "count": len(docs)}


@api_router.post("/sensors/collect")
async def collect_and_store_sensor_data():
    """
    Collect current sensor values from SmartThings or eWeLink and store them.
    This endpoint should be called periodically (e.g., every 5 minutes via cron).
    Falls back to eWeLink if SmartThings is unavailable.
    """
    stored_count = 0
    source = "smartthings"
    
    # Try SmartThings first
    token = await get_smartthings_token()
    smartthings_failed = False
    
    if token:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get all devices
                response = await client.get(
                    f"{SMARTTHINGS_API_URL}/devices",
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                devices = response.json().get("items", [])
                
                readings_to_store = []
                
                for device in devices[:25]:
                    device_id = device.get("deviceId")
                    # Prefer label over name (label is user-friendly, name is technical)
                    device_name = device.get("label") or device.get("name", "Dispositivo")
                    
                    try:
                        status_response = await client.get(
                            f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                            headers={"Authorization": f"Bearer {token}"}
                        )
                        if status_response.status_code != 200:
                            continue
                            
                        status = status_response.json()
                        main = status.get("components", {}).get("main", {})
                        
                        # Temperature
                        temp = main.get("temperatureMeasurement", {}).get("temperature", {})
                        if temp.get("value") is not None:
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "temperature",
                                "value": float(temp.get("value")),
                                "unit": temp.get("unit", "C")
                            })
                        
                        # Humidity
                        humidity = main.get("relativeHumidityMeasurement", {}).get("humidity", {})
                        if humidity.get("value") is not None:
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "humidity",
                                "value": float(humidity.get("value")),
                                "unit": "%"
                            })
                        
                        # Power
                        power = main.get("powerMeter", {}).get("power", {})
                        if power.get("value") is not None:
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "power",
                                "value": float(power.get("value")),
                                "unit": "W"
                            })
                        
                        # Energy
                        energy = main.get("energyMeter", {}).get("energy", {})
                        if energy.get("value") is not None:
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "energy",
                                "value": float(energy.get("value")),
                                "unit": "kWh"
                            })
                        
                        # Battery
                        battery = main.get("battery", {}).get("battery", {})
                        if battery.get("value") is not None:
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "battery",
                                "value": float(battery.get("value")),
                                "unit": "%"
                            })
                            
                    except Exception as e:
                        logger.debug(f"Error getting status for {device_id}: {e}")
                        continue
                
                # Store all readings
                if readings_to_store:
                    docs = []
                    for r in readings_to_store:
                        doc = SensorReading(**r).model_dump()
                        doc["timestamp"] = doc["timestamp"].isoformat()
                        docs.append(doc)
                    await db.sensor_readings.insert_many(docs)
                    stored_count = len(docs)
                    return {"status": "collected", "readings_stored": stored_count, "source": "smartthings"}
                    
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.warning("SmartThings token expired, falling back to eWeLink")
                smartthings_failed = True
            else:
                raise
        except Exception as e:
            logger.error(f"SmartThings error: {e}")
            smartthings_failed = True
    else:
        smartthings_failed = True
    
    # Fallback to eWeLink
    if smartthings_failed:
        logger.info("Using eWeLink fallback for sensor collection")
        source = "ewelink"
        
        try:
            ewelink_devices = await get_ewelink_devices_internal()
            if ewelink_devices and ewelink_devices.get("devices"):
                readings_to_store = []
                
                for device in ewelink_devices.get("devices", []):
                    device_id = device.get("deviceid")
                    device_name = device.get("name", "Dispositivo eWeLink")
                    params = device.get("params", {})
                    
                    # Temperature (normalize if > 100)
                    temp = params.get("temperature") or params.get("currentTemperature")
                    if temp is not None:
                        try:
                            temp_val = float(temp)
                            if temp_val > 100:
                                temp_val = temp_val / 100
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "temperature",
                                "value": round(temp_val, 1),
                                "unit": "C"
                            })
                        except (ValueError, TypeError):
                            pass
                    
                    # Humidity (normalize if > 100)
                    humidity = params.get("humidity") or params.get("currentHumidity")
                    if humidity is not None:
                        try:
                            humid_val = float(humidity)
                            if humid_val > 100:
                                humid_val = humid_val / 100
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "humidity",
                                "value": round(humid_val, 1),
                                "unit": "%"
                            })
                        except (ValueError, TypeError):
                            pass
                    
                    # Power (normalize - eWeLink S60TPF sends values x100, e.g., 2789 = 27.89W)
                    power = params.get("power")
                    if power is not None and power != "on" and power != "off":
                        try:
                            power_val = float(power)
                            # eWeLink POW devices send power x100 (e.g., 2789 = 27.89W)
                            # Normal home power is < 3000W, raw values > 100 need normalization
                            if power_val > 100:
                                power_val = power_val / 100
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "power",
                                "value": round(power_val, 2),
                                "unit": "W"
                            })
                        except (ValueError, TypeError):
                            pass
                    
                    # Voltage (normalize - eWeLink sends values x100)
                    voltage = params.get("voltage")
                    if voltage is not None:
                        try:
                            voltage_val = float(voltage)
                            if voltage_val > 1000:
                                voltage_val = voltage_val / 100
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "voltage",
                                "value": round(voltage_val, 1),
                                "unit": "V"
                            })
                        except (ValueError, TypeError):
                            pass
                    
                    # Current (normalize - eWeLink S60TPF sends values x100, e.g., 22 = 0.22A)
                    current = params.get("current")
                    if current is not None:
                        try:
                            current_val = float(current)
                            # eWeLink POW devices ALWAYS send current x100 (e.g., 22 = 0.22A)
                            # Typical home current is < 20A, so divide all values by 100
                            current_val = current_val / 100
                            readings_to_store.append({
                                "device_id": device_id,
                                "device_name": device_name,
                                "sensor_type": "current",
                                "value": round(current_val, 2),
                                "unit": "A"
                            })
                        except (ValueError, TypeError):
                            pass
                
                # Store all readings
                if readings_to_store:
                    docs = []
                    for r in readings_to_store:
                        doc = SensorReading(**r).model_dump()
                        doc["timestamp"] = doc["timestamp"].isoformat()
                        docs.append(doc)
                    await db.sensor_readings.insert_many(docs)
                    stored_count = len(docs)
                    
                return {"status": "collected", "readings_stored": stored_count, "source": "ewelink"}
                
        except Exception as e:
            logger.error(f"eWeLink sensor collection error: {e}")
            raise HTTPException(status_code=500, detail=f"Both SmartThings and eWeLink failed: {str(e)}")
    
    return {"status": "collected", "readings_stored": stored_count, "source": source}


@api_router.get("/sensors/history")
async def get_sensor_history(
    device_id: Optional[str] = None,
    sensor_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 500
):
    """Get sensor reading history with optional filters"""
    query = {"user_id": DEFAULT_USER_ID}
    
    if device_id:
        query["device_id"] = device_id
    if sensor_type:
        query["sensor_type"] = sensor_type
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    readings = await db.sensor_readings.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"readings": readings, "count": len(readings)}


@api_router.get("/sensors/history/{device_id}")
async def get_device_sensor_history(
    device_id: str,
    sensor_type: Optional[str] = None,
    hours: int = 24,
    limit: int = 500
):
    """Get sensor history for a specific device"""
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    query = {
        "device_id": device_id,
        "user_id": DEFAULT_USER_ID,
        "timestamp": {"$gte": start_time}
    }
    
    if sensor_type:
        query["sensor_type"] = sensor_type
    
    readings = await db.sensor_readings.find(
        query, {"_id": 0}
    ).sort("timestamp", 1).limit(limit).to_list(limit)
    
    return {"device_id": device_id, "readings": readings, "count": len(readings)}


@api_router.get("/sensors/stats/{device_id}")
async def get_sensor_stats(
    device_id: str,
    sensor_type: str = "temperature",
    hours: int = 24
):
    """Get aggregated statistics for a sensor"""
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    pipeline = [
        {
            "$match": {
                "device_id": device_id,
                "sensor_type": sensor_type,
                "user_id": DEFAULT_USER_ID,
                "timestamp": {"$gte": start_time}
            }
        },
        {
            "$group": {
                "_id": {
                    "device_id": "$device_id",
                    "sensor_type": "$sensor_type"
                },
                "min_value": {"$min": "$value"},
                "max_value": {"$max": "$value"},
                "avg_value": {"$avg": "$value"},
                "count": {"$sum": 1},
                "unit": {"$first": "$unit"},
                "device_name": {"$first": "$device_name"},
                "first_reading": {"$min": "$timestamp"},
                "last_reading": {"$max": "$timestamp"}
            }
        }
    ]
    
    results = await db.sensor_readings.aggregate(pipeline).to_list(1)
    
    if not results:
        return {
            "device_id": device_id,
            "sensor_type": sensor_type,
            "message": "Nessun dato disponibile",
            "stats": None
        }
    
    r = results[0]
    return {
        "device_id": device_id,
        "sensor_type": sensor_type,
        "device_name": r.get("device_name"),
        "unit": r.get("unit", ""),
        "stats": {
            "min": round(r["min_value"], 2),
            "max": round(r["max_value"], 2),
            "avg": round(r["avg_value"], 2),
            "count": r["count"],
            "period_start": r["first_reading"],
            "period_end": r["last_reading"]
        }
    }


@api_router.get("/sensors/report")
async def get_sensors_report(hours: int = 24):
    """
    Get a comprehensive report of all sensors with stats and recent readings.
    Perfect for dashboard display.
    """
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    # Get device names from SmartThings for better display
    device_names = {}
    try:
        token = await get_smartthings_token()
        if token:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{SMARTTHINGS_API_URL}/devices",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if response.status_code == 200:
                    devices = response.json().get("items", [])
                    for dev in devices:
                        dev_id = dev.get("deviceId")
                        # Prefer label (user-friendly) over name (technical)
                        friendly_name = dev.get("label") or dev.get("name", "")
                        if dev_id and friendly_name:
                            device_names[dev_id] = friendly_name
    except Exception as e:
        logger.debug(f"Could not fetch SmartThings device names: {e}")
    
    # Get unique device/sensor combinations
    pipeline = [
        {
            "$match": {
                "user_id": DEFAULT_USER_ID,
                "timestamp": {"$gte": start_time}
            }
        },
        {
            "$group": {
                "_id": {
                    "device_id": "$device_id",
                    "sensor_type": "$sensor_type"
                },
                "device_name": {"$first": "$device_name"},
                "unit": {"$first": "$unit"},
                "min_value": {"$min": "$value"},
                "max_value": {"$max": "$value"},
                "avg_value": {"$avg": "$value"},
                "last_value": {"$last": "$value"},
                "count": {"$sum": 1},
                "last_timestamp": {"$max": "$timestamp"}
            }
        },
        {"$sort": {"_id.sensor_type": 1, "_id.device_id": 1}}
    ]
    
    results = await db.sensor_readings.aggregate(pipeline).to_list(100)
    
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period_hours": hours,
        "sensors": []
    }
    
    for r in results:
        device_id = r["_id"]["device_id"]
        sensor_type = r["_id"]["sensor_type"]
        # Use SmartThings label if available, fallback to stored name
        stored_name = r.get("device_name", "")
        display_name = device_names.get(device_id, stored_name)
        # If stored name is technical (like c2c-humidity), prefer SmartThings name
        if stored_name and stored_name.startswith("c2c-") or stored_name.startswith("switch"):
            display_name = device_names.get(device_id) or stored_name
        
        # Get raw values
        current_val = r["last_value"]
        min_val = r["min_value"]
        max_val = r["max_value"]
        avg_val = r["avg_value"]
        
        # Normalize old data that wasn't divided properly
        if sensor_type == "temperature":
            if current_val and current_val > 100:
                current_val = current_val / 100
            if min_val and min_val > 100:
                min_val = min_val / 100
            if max_val and max_val > 100:
                max_val = max_val / 100
            if avg_val and avg_val > 100:
                avg_val = avg_val / 100
        elif sensor_type == "humidity":
            if current_val and current_val > 100:
                current_val = current_val / 100
            if min_val and min_val > 100:
                min_val = min_val / 100
            if max_val and max_val > 100:
                max_val = max_val / 100
            if avg_val and avg_val > 100:
                avg_val = avg_val / 100
        elif sensor_type == "power":
            # Power values are already normalized in DB, no additional normalization needed
            # Only normalize if we detect clearly wrong values (> 10000W is unrealistic for home)
            if current_val and current_val > 10000:
                current_val = current_val / 100
            if min_val and min_val > 10000:
                min_val = min_val / 100
            if max_val and max_val > 10000:
                max_val = max_val / 100
            if avg_val and avg_val > 10000:
                avg_val = avg_val / 100
        elif sensor_type == "voltage":
            # Voltage > 1000V is likely not normalized
            if min_val and min_val > 1000:
                min_val = min_val / 100
            if max_val and max_val > 1000:
                max_val = max_val / 100
            if avg_val and avg_val > 1000:
                avg_val = avg_val / 100
        elif sensor_type == "current":
            # Current > 50A is likely not normalized
            if min_val and min_val > 50:
                min_val = min_val / 100
            if max_val and max_val > 50:
                max_val = max_val / 100
            if avg_val and avg_val > 50:
                avg_val = avg_val / 100
        
        sensor_data = {
            "device_id": device_id,
            "device_name": display_name or stored_name or "Sensore",
            "sensor_type": sensor_type,
            "unit": r.get("unit", ""),
            "current_value": round(current_val, 1) if current_val else None,
            "min": round(min_val, 1) if min_val else None,
            "max": round(max_val, 1) if max_val else None,
            "avg": round(avg_val, 1) if avg_val else None,
            "readings_count": r["count"],
            "last_update": r["last_timestamp"]
        }
        report["sensors"].append(sensor_data)
    
    return report



@api_router.get("/sensors/energy-summary")
async def get_energy_summary(hours: int = 24):
    """
    Get energy consumption summary with power, voltage, current stats.
    Returns real-time and historical data for energy monitoring.
    """
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    # Get power/voltage/current readings
    pipeline = [
        {
            "$match": {
                "user_id": DEFAULT_USER_ID,
                "sensor_type": {"$in": ["power", "voltage", "current"]},
                "timestamp": {"$gte": start_time}
            }
        },
        {
            "$group": {
                "_id": {
                    "device_id": "$device_id",
                    "sensor_type": "$sensor_type"
                },
                "device_name": {"$first": "$device_name"},
                "unit": {"$first": "$unit"},
                "min_value": {"$min": "$value"},
                "max_value": {"$max": "$value"},
                "avg_value": {"$avg": "$value"},
                "last_value": {"$last": "$value"},
                "count": {"$sum": 1},
                "last_timestamp": {"$max": "$timestamp"}
            }
        },
        {"$sort": {"_id.device_id": 1, "_id.sensor_type": 1}}
    ]
    
    results = await db.sensor_readings.aggregate(pipeline).to_list(100)
    
    # Organize by device
    devices = {}
    for r in results:
        device_id = r["_id"]["device_id"]
        sensor_type = r["_id"]["sensor_type"]
        
        if device_id not in devices:
            devices[device_id] = {
                "device_id": device_id,
                "device_name": r.get("device_name", "Dispositivo"),
                "power": None,
                "voltage": None,
                "current": None,
                "readings_count": 0,
                "last_update": None
            }
        
        stat_data = {
            "current": round(r["last_value"], 2) if r["last_value"] else None,
            "min": round(r["min_value"], 2),
            "max": round(r["max_value"], 2),
            "avg": round(r["avg_value"], 2),
            "unit": r.get("unit", ""),
            "count": r["count"]
        }
        
        # Data is already normalized in DB, only normalize clearly wrong values
        # Home power is typically < 10000W
        if sensor_type == "power":
            # Power > 10000W is unrealistic, likely not normalized
            if stat_data["current"] and stat_data["current"] > 10000:
                stat_data["current"] = round(stat_data["current"] / 100, 2)
            if stat_data["min"] and stat_data["min"] > 10000:
                stat_data["min"] = round(stat_data["min"] / 100, 2)
            if stat_data["max"] and stat_data["max"] > 10000:
                stat_data["max"] = round(stat_data["max"] / 100, 2)
            if stat_data["avg"] and stat_data["avg"] > 10000:
                stat_data["avg"] = round(stat_data["avg"] / 100, 2)
        elif sensor_type == "voltage":
            # Voltage > 500V is likely not normalized
            if stat_data["min"] and stat_data["min"] > 500:
                stat_data["min"] = round(stat_data["min"] / 100, 2)
            if stat_data["max"] and stat_data["max"] > 500:
                stat_data["max"] = round(stat_data["max"] / 100, 2)
            if stat_data["avg"] and stat_data["avg"] > 500:
                stat_data["avg"] = round(stat_data["avg"] / 100, 2)
        elif sensor_type == "current":
            # Current > 20A for home devices is likely not normalized
            if stat_data["min"] and stat_data["min"] > 20:
                stat_data["min"] = round(stat_data["min"] / 100, 2)
            if stat_data["max"] and stat_data["max"] > 20:
                stat_data["max"] = round(stat_data["max"] / 100, 2)
            if stat_data["avg"] and stat_data["avg"] > 20:
                stat_data["avg"] = round(stat_data["avg"] / 100, 2)
        
        devices[device_id][sensor_type] = stat_data
        devices[device_id]["readings_count"] += r["count"]
        
        if r["last_timestamp"]:
            if not devices[device_id]["last_update"] or r["last_timestamp"] > devices[device_id]["last_update"]:
                devices[device_id]["last_update"] = r["last_timestamp"]
    
    # Calculate totals
    total_power = sum(d["power"]["current"] for d in devices.values() if d.get("power") and d["power"].get("current"))
    avg_power = sum(d["power"]["avg"] for d in devices.values() if d.get("power") and d["power"].get("avg"))
    
    # Try to get REAL daily/monthly consumption from eWeLink devices
    real_daily_kwh = None
    real_monthly_kwh = None
    try:
        token = await get_ewelink_token()
        if token:
            base_url = EWELINK_API_URLS.get(EWELINK_REGION, EWELINK_API_URLS['eu'])
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{base_url}/v2/device/thing",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-CK-Appid": EWELINK_APPID,
                        "Content-Type": "application/json"
                    }
                )
                if response.status_code == 200:
                    things = response.json().get("data", {}).get("thingList", [])
                    for thing in things:
                        params = thing.get("itemData", {}).get("params", {})
                        # dayKwh and monthKwh are sent x100 (e.g., 38 = 0.38 kWh)
                        day_kwh_raw = params.get("dayKwh")
                        month_kwh_raw = params.get("monthKwh")
                        if day_kwh_raw is not None:
                            real_daily_kwh = (real_daily_kwh or 0) + (float(day_kwh_raw) / 100)
                        if month_kwh_raw is not None:
                            real_monthly_kwh = (real_monthly_kwh or 0) + (float(month_kwh_raw) / 100)
    except Exception as e:
        logger.warning(f"Could not get real kWh from eWeLink: {e}")
    
    # Use real values if available, otherwise estimate from average power
    if real_daily_kwh is not None:
        daily_kwh = round(real_daily_kwh, 2)
    else:
        daily_kwh = round((avg_power * 24) / 1000, 2) if avg_power else 0
    
    if real_monthly_kwh is not None:
        monthly_kwh = round(real_monthly_kwh, 2)
    else:
        monthly_kwh = round(daily_kwh * 30.5, 2) if daily_kwh else 0
    
    # Estimate cost (assuming 0.25 €/kWh average Italian tariff)
    cost_per_kwh = 0.25
    daily_cost = round(daily_kwh * cost_per_kwh, 2)
    monthly_cost = round(monthly_kwh * cost_per_kwh, 2)
    
    return {
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_power_w": round(total_power, 2),
        "avg_power_w": round(avg_power, 2),
        "consumption": {
            "daily_kwh": daily_kwh,
            "monthly_kwh": monthly_kwh,
            "daily_cost_eur": daily_cost,
            "monthly_cost_eur": monthly_cost,
            "cost_per_kwh": cost_per_kwh
        },
        "devices": list(devices.values()),
        "device_count": len(devices)
    }


@api_router.get("/sensors/chart-data/{device_id}")
async def get_sensor_chart_data(
    device_id: str,
    sensor_type: str = "temperature",
    hours: int = 24,
    interval: str = "hour"  # minute, hour, day
):
    """
    Get sensor data formatted for charts.
    Aggregates data by interval for smoother visualization.
    """
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Define date format based on interval
    if interval == "minute":
        date_format = "%Y-%m-%dT%H:%M"
    elif interval == "hour":
        date_format = "%Y-%m-%dT%H:00"
    else:  # day
        date_format = "%Y-%m-%d"
    
    pipeline = [
        {
            "$match": {
                "device_id": device_id,
                "sensor_type": sensor_type,
                "user_id": DEFAULT_USER_ID,
                "timestamp": {"$gte": start_time.isoformat()}
            }
        },
        {
            "$addFields": {
                "timestamp_date": {
                    "$dateFromString": {
                        "dateString": "$timestamp"
                    }
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": date_format,
                        "date": "$timestamp_date"
                    }
                },
                "avg_value": {"$avg": "$value"},
                "min_value": {"$min": "$value"},
                "max_value": {"$max": "$value"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.sensor_readings.aggregate(pipeline).to_list(500)
    
    # Format for chart.js or similar
    chart_data = {
        "device_id": device_id,
        "sensor_type": sensor_type,
        "interval": interval,
        "hours": hours,
        "labels": [],
        "datasets": {
            "avg": [],
            "min": [],
            "max": []
        }
    }
    
    for r in results:
        avg_val = r["avg_value"]
        min_val = r["min_value"]
        max_val = r["max_value"]
        
        # Normalize old data that wasn't divided by 100
        # Temperature > 100 is likely not normalized (eWeLink sends 2210 for 22.1°C)
        # Humidity > 100 is likely not normalized (eWeLink sends 5100 for 51%)
        if sensor_type == "temperature":
            if avg_val and avg_val > 100:
                avg_val = avg_val / 100
            if min_val and min_val > 100:
                min_val = min_val / 100
            if max_val and max_val > 100:
                max_val = max_val / 100
        elif sensor_type == "humidity":
            if avg_val and avg_val > 100:
                avg_val = avg_val / 100
            if min_val and min_val > 100:
                min_val = min_val / 100
            if max_val and max_val > 100:
                max_val = max_val / 100
        
        chart_data["labels"].append(r["_id"])
        chart_data["datasets"]["avg"].append(round(avg_val, 1) if avg_val else None)
        chart_data["datasets"]["min"].append(round(min_val, 1) if min_val else None)
        chart_data["datasets"]["max"].append(round(max_val, 1) if max_val else None)
    
    return chart_data


@api_router.delete("/sensors/history/cleanup")
async def cleanup_old_sensor_data(days: int = 30):
    """Delete sensor readings older than specified days"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    result = await db.sensor_readings.delete_many({
        "user_id": DEFAULT_USER_ID,
        "timestamp": {"$lt": cutoff_date}
    })
    
    return {
        "deleted_count": result.deleted_count,
        "cutoff_date": cutoff_date
    }


@api_router.post("/sensors/history/normalize")
async def normalize_sensor_history():
    """Normalize all old sensor readings that weren't divided correctly"""
    normalized_count = 0
    
    # Fix temperature readings > 100 (should be divided by 100)
    temp_result = await db.sensor_readings.update_many(
        {"sensor_type": "temperature", "value": {"$gt": 100}},
        [{"$set": {"value": {"$divide": ["$value", 100]}}}]
    )
    normalized_count += temp_result.modified_count
    
    # Fix humidity readings > 100 (should be divided by 100)
    humid_result = await db.sensor_readings.update_many(
        {"sensor_type": "humidity", "value": {"$gt": 100}},
        [{"$set": {"value": {"$divide": ["$value", 100]}}}]
    )
    normalized_count += humid_result.modified_count
    
    # Fix power readings > 1000 (should be divided by 10)
    power_result = await db.sensor_readings.update_many(
        {"sensor_type": "power", "value": {"$gt": 1000}},
        [{"$set": {"value": {"$divide": ["$value", 10]}}}]
    )
    normalized_count += power_result.modified_count
    
    # Fix voltage readings > 10000 (should be divided by 100)
    volt_result = await db.sensor_readings.update_many(
        {"sensor_type": "voltage", "value": {"$gt": 1000}},
        [{"$set": {"value": {"$divide": ["$value", 10]}}}]
    )
    normalized_count += volt_result.modified_count
    
    # Fix current readings > 100 (should be divided by 100)
    curr_result = await db.sensor_readings.update_many(
        {"sensor_type": "current", "value": {"$gt": 100}},
        [{"$set": {"value": {"$divide": ["$value", 100]}}}]
    )
    normalized_count += curr_result.modified_count
    
    return {
        "normalized_count": normalized_count,
        "details": {
            "temperature": temp_result.modified_count,
            "humidity": humid_result.modified_count,
            "power": power_result.modified_count,
            "voltage": volt_result.modified_count,
            "current": curr_result.modified_count
        }
    }


# ============== MATTERPORT CLOUD API ==============
# For creating persistent Mattertags that appear on my.matterport.com

class MatterportCloudCredentials(BaseModel):
    """Credentials for Matterport Cloud API"""
    client_id: str
    client_secret: str


class MatterportTagCreate(BaseModel):
    """Data for creating a Matterport tag via Cloud API"""
    label: str
    description: Optional[str] = None
    position: Dict[str, float]  # {x, y, z}
    stem_vector: Optional[Dict[str, float]] = None  # {x, y, z}
    color: Optional[Dict[str, float]] = None  # {r, g, b}


import base64

def get_matterport_basic_auth(token_id: str, token_secret: str) -> str:
    """Generate Basic Auth header for Matterport API"""
    credentials = f"{token_id}:{token_secret}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


@api_router.post("/matterport/cloud/test-connection")
async def test_matterport_cloud_connection(credentials: MatterportCloudCredentials):
    """Test Matterport Cloud API connection using Basic Auth"""
    # Matterport API uses Basic Auth with Token ID:Token Secret
    auth_header = get_matterport_basic_auth(credentials.client_id, credentials.client_secret)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.matterport.com/api/models/graph",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json"
                },
                json={
                    "query": "query { models { totalResults } }"
                }
            )
            
            print(f"Matterport test response: {response.status_code} - {response.text[:500]}")
            
            if response.status_code == 200:
                data = response.json()
                if "errors" in data:
                    error_msg = data["errors"][0].get("message", "Errore sconosciuto")
                    return {
                        "connected": False,
                        "error": f"Errore GraphQL: {error_msg}"
                    }
                total = data.get("data", {}).get("models", {}).get("totalResults", 0)
                return {
                    "connected": True,
                    "message": f"Connesso! Trovati {total} modelli nel tuo account.",
                    "models_count": total
                }
            elif response.status_code == 401:
                return {
                    "connected": False,
                    "error": "Credenziali non valide. Verifica Token ID e Token Secret."
                }
            else:
                return {
                    "connected": False,
                    "error": f"Errore API: {response.status_code} - {response.text[:200]}"
                }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


@api_router.get("/matterport/cloud/spaces")
async def get_matterport_spaces():
    """Get list of Matterport spaces (models) from the connected account"""
    # Get credentials from property config
    prop = await db.property_config.find_one({"is_active": True}, {"_id": 0})
    if not prop or not prop.get("matterport"):
        return {"spaces": [], "error": "Configurazione Matterport non trovata"}
    
    mp_config = prop["matterport"]
    if not mp_config.get("api_client_id") or not mp_config.get("api_client_secret"):
        return {"spaces": [], "error": "Credenziali API Matterport non configurate"}
    
    auth_header = get_matterport_basic_auth(
        mp_config["api_client_id"], 
        mp_config["api_client_secret"]
    )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.matterport.com/api/models/graph",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json"
                },
                json={
                    "query": """
                    query {
                        models(query: "*") {
                            totalResults
                            results {
                                id
                                name
                                created
                                modified
                                visibility
                            }
                        }
                    }
                    """
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if "errors" in data:
                    return {"spaces": [], "error": data["errors"][0].get("message", "Errore GraphQL")}
                
                models = data.get("data", {}).get("models", {}).get("results", [])
                spaces = []
                for m in models:
                    spaces.append({
                        "id": m.get("id"),
                        "name": m.get("name", "Senza nome"),
                        "visibility": m.get("visibility", "private"),
                        "created": m.get("created"),
                        "modified": m.get("modified")
                    })
                
                return {
                    "spaces": spaces,
                    "total": len(spaces)
                }
            else:
                return {"spaces": [], "error": f"Errore API: {response.status_code}"}
    except Exception as e:
        return {"spaces": [], "error": str(e)}


@api_router.post("/matterport/cloud/models/{model_id}/tags")
async def create_matterport_cloud_tag(
    model_id: str, 
    tag_data: MatterportTagCreate,
    client_id: str = None,
    client_secret: str = None
):
    """
    Create a persistent Mattertag in Matterport Cloud.
    The tag will appear on my.matterport.com for this model.
    """
    # Get credentials from property config if not provided
    if not client_id or not client_secret:
        prop = await db.property_config.find_one({"is_active": True}, {"_id": 0})
        if prop and prop.get("matterport"):
            client_id = prop["matterport"].get("api_client_id")
            client_secret = prop["matterport"].get("api_client_secret")
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400, 
            detail="Credenziali API Matterport non configurate. Vai su Setup > Matterport."
        )
    
    # Use Basic Auth
    auth_header = get_matterport_basic_auth(client_id, client_secret)
    
    # First, get the floor ID for this model
    floor_query = """
    query GetFloors($modelId: ID!) {
        model(id: $modelId) {
            floors {
                id
            }
        }
    }
    """
    
    floor_id = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            floor_response = await client.post(
                "https://api.matterport.com/api/models/graph",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json"
                },
                json={
                    "query": floor_query,
                    "variables": {"modelId": model_id}
                }
            )
            if floor_response.status_code == 200:
                floor_data = floor_response.json()
                floors = floor_data.get("data", {}).get("model", {}).get("floors", [])
                if floors:
                    floor_id = floors[0]["id"]  # Use first floor
    except Exception as e:
        print(f"Error getting floors: {e}")
    
    if not floor_id:
        # Try a default floor ID or return error
        return {
            "success": False,
            "error": "Impossibile determinare il piano del modello"
        }
    
    # GraphQL mutation to add a Mattertag
    mutation = """
    mutation AddMattertag($modelId: ID!, $tag: MattertagDetails!) {
      addMattertag(modelId: $modelId, mattertag: $tag) {
        id
        label
        description
        anchorPosition { x y z }
      }
    }
    """
    
    # Build tag data with required fields
    tag_input = {
        "label": tag_data.label,
        "description": tag_data.description or "",
        "anchorPosition": tag_data.position,
        "enabled": True,
        "floorId": floor_id
    }
    
    # Add optional fields
    if tag_data.stem_vector:
        tag_input["stemDirection"] = tag_data.stem_vector
    if tag_data.color:
        # Convert RGB dict to hex color string
        if isinstance(tag_data.color, dict):
            r = int(tag_data.color.get("r", 0) * 255)
            g = int(tag_data.color.get("g", 0.75) * 255)
            b = int(tag_data.color.get("b", 1) * 255)
            tag_input["color"] = f"#{r:02x}{g:02x}{b:02x}"
    
    variables = {
        "modelId": model_id,
        "tag": tag_input
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.matterport.com/api/models/graph",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json"
                },
                json={
                    "query": mutation,
                    "variables": variables
                }
            )
            
            print(f"Matterport addMattertag response: {response.status_code} - {response.text[:500]}")
            
            if response.status_code == 200:
                data = response.json()
                if "errors" in data:
                    raise HTTPException(status_code=400, detail=data["errors"][0].get("message", "GraphQL error"))
                
                created_tag = data.get("data", {}).get("addMattertag", {})
                return {
                    "success": True,
                    "message": "Tag creato su Matterport Cloud!",
                    "tag": created_tag
                }
            else:
                raise HTTPException(status_code=response.status_code, detail="Errore API Matterport")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/matterport/cloud/sync-poi/{poi_id}")
async def sync_poi_to_matterport_cloud(poi_id: str):
    """
    Sync a local POI to Matterport Cloud as a persistent Mattertag.
    """
    # Get POI
    poi = await db.pois.find_one({"id": poi_id, "user_id": DEFAULT_USER_ID}, {"_id": 0})
    if not poi:
        raise HTTPException(status_code=404, detail="POI non trovato")
    
    # Get property config for credentials
    prop = await db.property_config.find_one({"is_active": True}, {"_id": 0})
    if not prop or not prop.get("matterport"):
        raise HTTPException(status_code=400, detail="Configurazione Matterport non trovata")
    
    mp_config = prop["matterport"]
    if not mp_config.get("api_client_id") or not mp_config.get("api_client_secret"):
        raise HTTPException(
            status_code=400, 
            detail="Credenziali API Matterport Cloud non configurate"
        )
    
    if not poi.get("position"):
        raise HTTPException(status_code=400, detail="POI senza posizione")
    
    # Get title from translations
    title = "POI"
    description = ""
    if poi.get("translations"):
        first_trans = poi["translations"][0]
        title = first_trans.get("title", "POI")
        description = first_trans.get("description", "")
    
    # Extract only x, y, z from position
    pos = poi["position"]
    position_xyz = {
        "x": float(pos.get("x", 0)),
        "y": float(pos.get("y", 0)),
        "z": float(pos.get("z", 0))
    }
    
    # Create tag in Matterport Cloud
    tag_data = MatterportTagCreate(
        label=title,
        description=description,
        position=position_xyz
    )
    
    result = await create_matterport_cloud_tag(
        model_id=mp_config["space_id"],
        tag_data=tag_data,
        client_id=mp_config["api_client_id"],
        client_secret=mp_config["api_client_secret"]
    )
    
    # Update POI with cloud tag ID
    if result.get("success") and result.get("tag", {}).get("id"):
        await db.pois.update_one(
            {"id": poi_id},
            {"$set": {
                "matterport_cloud_tag_id": result["tag"]["id"],
                "synced_to_cloud": True,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    return result


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

# Background task control
sensor_collection_task = None
SENSOR_COLLECTION_INTERVAL = 300  # 5 minutes in seconds

async def background_sensor_collector():
    """Background task that collects sensor data every 5 minutes"""
    while True:
        try:
            logger.info("🔄 Background sensor collection starting...")
            
            # Get ALL eWeLink devices with sensor values (including power meters)
            devices_response = await get_devices_with_sensor_values()
            devices = devices_response.get("devices", [])
            sensors_data = devices_response.get("sensors", {})
            
            readings_saved = 0
            for device in devices:
                if not device.get("online"):
                    continue
                
                timestamp = datetime.now(timezone.utc).isoformat()
                device_id = device.get("id", "")
                device_name = device.get("name", "Unknown")
                
                # Get sensor values for this device
                sensor = sensors_data.get(device_id, {})
                
                # Save temperature
                if sensor.get("temperature") is not None:
                    await db.sensor_readings.insert_one({
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "device_name": device_name,
                        "sensor_type": "temperature",
                        "value": float(sensor["temperature"]),
                        "unit": "C",
                        "source": "ewelink",
                        "timestamp": timestamp,
                        "user_id": DEFAULT_USER_ID
                    })
                    readings_saved += 1
                
                # Save humidity
                if sensor.get("humidity") is not None:
                    await db.sensor_readings.insert_one({
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "device_name": device_name,
                        "sensor_type": "humidity",
                        "value": float(sensor["humidity"]),
                        "unit": "%",
                        "source": "ewelink",
                        "timestamp": timestamp,
                        "user_id": DEFAULT_USER_ID
                    })
                    readings_saved += 1
                
                # Save power consumption
                if sensor.get("power") is not None:
                    await db.sensor_readings.insert_one({
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "device_name": device_name,
                        "sensor_type": "power",
                        "value": float(sensor["power"]),
                        "unit": "W",
                        "source": "ewelink",
                        "timestamp": timestamp,
                        "user_id": DEFAULT_USER_ID
                    })
                    readings_saved += 1
                
                # Save voltage
                if sensor.get("voltage") is not None:
                    await db.sensor_readings.insert_one({
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "device_name": device_name,
                        "sensor_type": "voltage",
                        "value": float(sensor["voltage"]),
                        "unit": "V",
                        "source": "ewelink",
                        "timestamp": timestamp,
                        "user_id": DEFAULT_USER_ID
                    })
                    readings_saved += 1
                
                # Save current
                if sensor.get("current") is not None:
                    await db.sensor_readings.insert_one({
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "device_name": device_name,
                        "sensor_type": "current",
                        "value": float(sensor["current"]),
                        "unit": "A",
                        "source": "ewelink",
                        "timestamp": timestamp,
                        "user_id": DEFAULT_USER_ID
                    })
                    readings_saved += 1
            
            logger.info(f"✅ Background sensor collection: saved {readings_saved} readings from {len(devices)} devices")
            
        except Exception as e:
            logger.error(f"❌ Background sensor collection error: {e}")
        
        # Wait for next collection cycle
        await asyncio.sleep(SENSOR_COLLECTION_INTERVAL)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on app startup"""
    global sensor_collection_task
    logger.info("🚀 Starting SmartDomo API server...")
    
    # Start background sensor collector
    sensor_collection_task = asyncio.create_task(background_sensor_collector())
    logger.info("✅ Background sensor collector started (interval: 5 minutes)")

@app.on_event("shutdown")
async def shutdown_db_client():
    global sensor_collection_task
    # Cancel background task
    if sensor_collection_task:
        sensor_collection_task.cancel()
        try:
            await sensor_collection_task
        except asyncio.CancelledError:
            pass
        logger.info("🛑 Background sensor collector stopped")
    client.close()
