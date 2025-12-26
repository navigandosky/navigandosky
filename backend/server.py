from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# OpenAI client for AI Assistant (using Emergent LLM Key via emergentintegrations)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Import emergentintegrations for LLM
from emergentintegrations.llm.openai import LlmChat, UserMessage

# Directory for uploaded manuals
MANUALS_DIR = ROOT_DIR / "manuals"
MANUALS_DIR.mkdir(exist_ok=True)

# Directory for QR codes
QRCODES_DIR = ROOT_DIR / "qrcodes"
QRCODES_DIR.mkdir(exist_ok=True)

# Directory for floor plans (planimetrie)
PLANIMETRIE_DIR = ROOT_DIR / "planimetrie"
PLANIMETRIE_DIR.mkdir(exist_ok=True)

# Email configuration (optional - can be configured via env)
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', '')

# Frontend URL for QR codes
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://smartdomo-central.preview.emergentagent.com')


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
    TUYA = "tuya"
    SHELLY = "shelly"
    TAPO = "tapo"
    MEROSS = "meross"
    ALTRO = "altro"
    NESSUNO = "nessuno"


class StatoManutenzione(str, Enum):
    PIANIFICATA = "pianificata"
    IN_CORSO = "in_corso"
    COMPLETATA = "completata"
    ANNULLATA = "annullata"


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
    stato: StatoManutenzione = StatoManutenzione.PIANIFICATA
    costo: Optional[float] = None
    # Centro assistenza (usa quello dell'elettrodomestico o uno specifico)
    usa_centro_assistenza_elettrodomestico: bool = True
    centro_assistenza_id: Optional[str] = None  # Se non usa quello dell'elettrodomestico
    # Ricorrenza
    ricorrente: bool = False
    frequenza_giorni: Optional[int] = None
    # Extra
    documenti: List[str] = []
    note: Optional[str] = None


class ManutenzioneCreate(ManutenzioneBase):
    pass


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

class StatoTicket(str, Enum):
    APERTO = "aperto"
    CONTATTATO = "contattato"
    IN_LAVORAZIONE = "in_lavorazione"
    RISOLTO = "risolto"
    ANNULLATO = "annullato"


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
    data_contatto: Optional[str] = None
    data_intervento: Optional[str] = None
    data_risoluzione: Optional[str] = None
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
async def create_elettrodomestico(data: ElettrodomesticoCreate):
    elettrodomestico = Elettrodomestico(**data.model_dump())
    doc = serialize_doc(elettrodomestico.model_dump())
    await db.elettrodomestici.insert_one(doc)
    return elettrodomestico


@api_router.get("/elettrodomestici", response_model=List[ElettrodomesticoConDettagli])
async def get_elettrodomestici(
    user_id: str = DEFAULT_USER_ID,
    categoria: Optional[CategoriaElettrodomestico] = None
):
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
async def update_elettrodomestico(elettrodomestico_id: str, data: ElettrodomesticoUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
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
async def get_categorie_custom(user_id: str = DEFAULT_USER_ID):
    """Get custom categories added by user"""
    categorie = await db.categorie_custom.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return categorie


@api_router.post("/categorie-custom")
async def add_categoria_custom(nome: str = Form(...), user_id: str = DEFAULT_USER_ID):
    """Add a custom category"""
    categoria = {
        "id": str(uuid.uuid4()),
        "nome": nome,
        "user_id": user_id,
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
async def create_manutenzione(data: ManutenzioneCreate):
    manutenzione = Manutenzione(**data.model_dump())
    doc = serialize_doc(manutenzione.model_dump())
    await db.manutenzioni.insert_one(doc)
    return manutenzione


@api_router.get("/manutenzioni", response_model=List[ManutenzioneConDettagli])
async def get_manutenzioni(
    user_id: str = DEFAULT_USER_ID,
    stato: Optional[StatoManutenzione] = None,
    elettrodomestico_id: Optional[str] = None
):
    query = {"user_id": user_id}
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
async def update_manutenzione(manutenzione_id: str, data: ManutenzioneUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.manutenzioni.update_one(
        {"id": manutenzione_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    
    updated = await db.manutenzioni.find_one({"id": manutenzione_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/manutenzioni/{manutenzione_id}")
async def delete_manutenzione(manutenzione_id: str):
    result = await db.manutenzioni.delete_one({"id": manutenzione_id})
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
    """Aggiorna un ticket"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
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
    """Chiudi un ticket e opzionalmente crea una manutenzione"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    manutenzione_id = None
    
    # Crea manutenzione se richiesto
    if crea_manutenzione:
        manutenzione = {
            "id": str(uuid.uuid4()),
            "user_id": ticket.get('user_id', DEFAULT_USER_ID),
            "elettrodomestico_id": ticket.get('elettrodomestico_id'),
            "tipo": "straordinaria",
            "descrizione": f"{ticket.get('titolo')}\n\n{ticket.get('descrizione')}\n\nRisoluzione: {note_risoluzione or 'Completata'}",
            "data_programmata": ticket.get('created_at'),
            "data_completamento": datetime.now(timezone.utc).isoformat(),
            "stato": "completata",
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
                "stato": StatoTicket.RISOLTO.value,
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
        "manutenzione_id": manutenzione_id
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
        {"user_id": user_id, "stato": {"$nin": ["risolto", "annullato"]}},
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
        "stato": {"$in": ["pianificata", "in_corso"]},
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
        "stato": "pianificata",
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

@api_router.get("/smartthings/locations")
async def get_smartthings_locations():
    """Get all SmartThings locations"""
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # First get all locations
            loc_response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
                    headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all locations
            loc_response = await client.get(
                f"{SMARTTHINGS_API_URL}/locations",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
                    headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
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
    """Get all SmartThings devices"""
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
            )
            response.raise_for_status()
            data = response.json()
            
            devices = []
            for item in data.get("items", []):
                device = {
                    "id": item.get("deviceId"),
                    "name": item.get("label") or item.get("name"),
                    "type": item.get("deviceTypeName", "Unknown"),
                    "status": "online",
                    "capabilities": [cap.get("id") for cap in item.get("components", [{}])[0].get("capabilities", [])],
                    "roomId": item.get("roomId"),
                    "locationId": item.get("locationId")
                }
                devices.append(device)
            
            return {"devices": devices, "count": len(devices)}
    except httpx.HTTPError as e:
        logger.error(f"SmartThings API error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.get("/smartthings/device/{device_id}/status")
async def get_smartthings_device_status(device_id: str):
    """Get status of a specific SmartThings device"""
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"SmartThings device status error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


@api_router.post("/smartthings/device/{device_id}/command")
async def send_smartthings_command(device_id: str, command: dict):
    """Send a command to a SmartThings device"""
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/commands",
                headers={
                    "Authorization": f"Bearer {SMARTTHINGS_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={"commands": [command]}
            )
            response.raise_for_status()
            return {"status": "success", "result": response.json()}
    except httpx.HTTPError as e:
        logger.error(f"SmartThings command error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


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
    if not SMARTTHINGS_TOKEN:
        raise HTTPException(status_code=500, detail="SmartThings token not configured")
    
    try:
        # First find the temperature sensor device
        async with httpx.AsyncClient() as client:
            devices_response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
            )
            devices_response.raise_for_status()
            devices = devices_response.json().get("items", [])
            
            # Find temperature sensor
            temp_device = None
            for d in devices:
                name = (d.get("label") or d.get("name", "")).lower()
                caps = []
                if d.get("components"):
                    for comp in d.get("components", []):
                        caps.extend([c.get("id") for c in comp.get("capabilities", [])])
                
                if "temperaturemeasurement" in [c.lower() for c in caps]:
                    temp_device = d
                    break
            
            if not temp_device:
                return {
                    "temperatura": None,
                    "umidita": None,
                    "device_name": None,
                    "error": "Nessun sensore temperatura trovato"
                }
            
            # Get device status
            device_id = temp_device.get("deviceId")
            status_response = await client.get(
                f"{SMARTTHINGS_API_URL}/devices/{device_id}/status",
                headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
            )
            status_response.raise_for_status()
            status = status_response.json()
            
            # Extract temperature and humidity
            main = status.get("components", {}).get("main", {})
            
            temp_data = main.get("temperatureMeasurement", {}).get("temperature", {})
            humidity_data = main.get("relativeHumidityMeasurement", {}).get("humidity", {})
            
            return {
                "temperatura": temp_data.get("value"),
                "temperatura_unit": temp_data.get("unit", "C"),
                "umidita": humidity_data.get("value"),
                "umidita_unit": humidity_data.get("unit", "%"),
                "device_id": device_id,
                "device_name": temp_device.get("label") or temp_device.get("name"),
                "timestamp": temp_data.get("timestamp"),
                "online": True
            }
            
    except httpx.HTTPError as e:
        logger.error(f"SmartThings clima error: {e}")
        raise HTTPException(status_code=500, detail=f"SmartThings API error: {str(e)}")


# ============== EZVIZ CAMERA INTEGRATION ==============

EZVIZ_USERNAME = os.environ.get('EZVIZ_USERNAME', '')
EZVIZ_PASSWORD = os.environ.get('EZVIZ_PASSWORD', '')
EZVIZ_REGION = os.environ.get('EZVIZ_REGION', 'eu')

# Ezviz session cache
ezviz_client = None
ezviz_token = None

async def get_ezviz_token():
    """Get Ezviz API token using pyezvizapi"""
    global ezviz_client, ezviz_token
    
    if not EZVIZ_USERNAME or not EZVIZ_PASSWORD:
        raise HTTPException(status_code=500, detail="Ezviz credentials not configured")
    
    try:
        from pyezvizapi import EzvizClient
        
        if ezviz_client is None:
            ezviz_client = EzvizClient(EZVIZ_USERNAME, EZVIZ_PASSWORD, EZVIZ_REGION)
            ezviz_client.login()
        
        return ezviz_client
    except Exception as e:
        logger.error(f"Ezviz login error: {e}")
        ezviz_client = None
        raise HTTPException(status_code=500, detail=f"Ezviz authentication error: {str(e)}")


@api_router.get("/ezviz/cameras")
async def get_ezviz_cameras():
    """Get all Ezviz cameras"""
    try:
        client = await get_ezviz_token()
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
            
            camera = {
                "id": cam_info.get("serial"),
                "serial": cam_info.get("serial"),
                "name": cam_info.get("name", "Camera"),
                "model": cam_info.get("device_type", "Unknown"),
                "status": status,
                "image_url": cam_info.get("cover", "")
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


@api_router.get("/ezviz/camera/{serial}/snapshot")
async def get_ezviz_camera_snapshot(serial: str):
    """Get latest snapshot from Ezviz camera"""
    try:
        client = await get_ezviz_token()
        cameras_data = client.get_all_cameras_info()
        
        if serial in cameras_data:
            cover_url = cameras_data[serial].get("cover", "")
            return {"serial": serial, "image_url": cover_url}
        
        raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz snapshot error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


@api_router.get("/ezviz/camera/{serial}/stream")
async def get_ezviz_camera_stream_url(serial: str):
    """Get stream URL for Ezviz camera"""
    try:
        client = await get_ezviz_token()
        
        # Try to get live stream URL
        try:
            url = client.get_camera_live_url(serial)
            return {"serial": serial, "stream_url": url}
        except:
            # Fallback - return the cover image URL
            cameras_data = client.get_all_cameras_info()
            if serial in cameras_data:
                return {"serial": serial, "stream_url": cameras_data[serial].get("cover", "")}
            raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ezviz stream error: {e}")
        raise HTTPException(status_code=500, detail=f"Ezviz API error: {str(e)}")


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
        "ezviz_connected": bool(EZVIZ_USERNAME and EZVIZ_PASSWORD),
        "matterport_configured": bool(MATTERPORT_SPACE_ID)
    }
    
    # Check SmartThings devices
    if SMARTTHINGS_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{SMARTTHINGS_API_URL}/devices",
                    headers={"Authorization": f"Bearer {SMARTTHINGS_TOKEN}"}
                )
                if response.status_code == 200:
                    devices = response.json().get("items", [])
                    status["totali"] += len(devices)
                    status["ok"] += len(devices)  # Assume all connected devices are OK
        except:
            pass
    
    # Check Ezviz cameras
    if EZVIZ_USERNAME and EZVIZ_PASSWORD:
        try:
            client = await get_ezviz_token()
            cameras = client.get_all_cameras_info()
            for cam in cameras.values():
                status["totali"] += 1
                if cam.get("status", 0) == 1:
                    status["ok"] += 1
                else:
                    status["critici"] += 1
        except:
            pass
    
    return status


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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
