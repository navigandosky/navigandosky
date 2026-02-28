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

# Google Maps API Key
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create audio uploads directory
AUDIO_DIR = ROOT_DIR / 'audio'
AUDIO_DIR.mkdir(exist_ok=True)

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

# Waypoint model for itineraries
class Waypoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None
    order: int = 0

# Attraction Models for CMS
class AttractionCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_es: Optional[str] = None
    name_de: Optional[str] = None
    description: str
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_es: Optional[str] = None
    description_de: Optional[str] = None
    category: str = "monumento"
    google_maps_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[str] = None
    price: Optional[str] = None
    contact: Optional[str] = None
    external_link: Optional[str] = None
    published: bool = True
    # Restaurant specific fields
    cuisine_type: Optional[str] = None  # Italian, Sardinian, Pizza, etc.
    price_range: Optional[str] = None  # €, €€, €€€
    reservation_link: Optional[str] = None
    # Accommodation specific fields
    accommodation_type: Optional[str] = None  # hotel, b&b, agriturismo, casa_vacanze
    stars: Optional[int] = None  # 1-5 stars
    booking_link: Optional[str] = None
    amenities: Optional[str] = None  # WiFi, Parking, Pool, etc.
    # Itinerary specific fields
    duration: Optional[str] = None  # e.g., "2 ore", "mezza giornata"
    difficulty: Optional[str] = None  # facile, medio, difficile
    distance: Optional[str] = None  # e.g., "5 km"
    waypoints: Optional[List[dict]] = None  # List of waypoints

class AttractionUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_es: Optional[str] = None
    name_de: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_es: Optional[str] = None
    description_de: Optional[str] = None
    category: Optional[str] = None
    google_maps_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[str] = None
    price: Optional[str] = None
    contact: Optional[str] = None
    external_link: Optional[str] = None
    published: Optional[bool] = None
    # Restaurant specific fields
    cuisine_type: Optional[str] = None
    price_range: Optional[str] = None
    reservation_link: Optional[str] = None
    # Accommodation specific fields
    accommodation_type: Optional[str] = None
    stars: Optional[int] = None
    booking_link: Optional[str] = None
    amenities: Optional[str] = None
    # Itinerary specific fields
    duration: Optional[str] = None
    difficulty: Optional[str] = None
    distance: Optional[str] = None
    waypoints: Optional[List[dict]] = None

class AttractionImage(BaseModel):
    id: str
    url: str
    caption: Optional[str] = None

class AttractionResponse(BaseModel):
    id: str
    name: str
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_es: Optional[str] = None
    name_de: Optional[str] = None
    description: str
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_es: Optional[str] = None
    description_de: Optional[str] = None
    category: str
    google_maps_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[str] = None
    price: Optional[str] = None
    contact: Optional[str] = None
    external_link: Optional[str] = None
    images: List[AttractionImage] = []
    audio_url: Optional[str] = None
    audio_url_en: Optional[str] = None
    audio_url_fr: Optional[str] = None
    audio_url_es: Optional[str] = None
    audio_url_de: Optional[str] = None
    published: bool = True
    created_at: str
    updated_at: str
    # Restaurant specific fields
    cuisine_type: Optional[str] = None
    price_range: Optional[str] = None
    reservation_link: Optional[str] = None
    # Accommodation specific fields
    accommodation_type: Optional[str] = None
    stars: Optional[int] = None
    booking_link: Optional[str] = None
    amenities: Optional[str] = None
    # Itinerary specific fields
    duration: Optional[str] = None
    difficulty: Optional[str] = None
    distance: Optional[str] = None
    waypoints: Optional[List[dict]] = None

# ============== IMMOBILI (HOME TADASUNI) MODELS ==============

class ImmobileAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    url: str
    description: Optional[str] = None
    section: str  # anagrafica, catastale, dimensioni, stato, certificazioni, marketing
    file_type: str  # image, document, pdf

class ImmobileImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    caption: Optional[str] = None
    is_360: bool = False  # Flag for 360° panoramic images

# ============== DIGITAL TWIN HOME MODELS ==============
class TwinHotspot(BaseModel):
    """Hotspot che collega una stanza a un'altra"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_room_id: str  # ID della stanza di destinazione
    position_yaw: float = 0  # Posizione orizzontale nel panorama (gradi)
    position_pitch: float = 0  # Posizione verticale nel panorama (gradi)
    label: Optional[str] = None  # Es: "Vai al Soggiorno"

class TwinRoom(BaseModel):
    """Una stanza/punto di vista nel tour virtuale"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Es: "Ingresso", "Soggiorno", "Cucina"
    description: Optional[str] = None
    image_360_url: str  # URL dell'immagine 360°
    # Posizione sulla planimetria (percentuale 0-100)
    floor_plan_x: Optional[float] = None
    floor_plan_y: Optional[float] = None
    # Hotspot per navigare ad altre stanze
    hotspots: List[TwinHotspot] = []
    # Configurazione vista iniziale
    default_yaw: float = 0  # Direzione iniziale orizzontale
    default_pitch: float = 0  # Direzione iniziale verticale
    order: int = 0  # Ordine nel tour

class DigitalTwinHome(BaseModel):
    """Tour virtuale completo di un immobile"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    immobile_id: str  # Riferimento all'immobile
    name: str = "Tour Virtuale"
    description: Optional[str] = None
    # Planimetria
    floor_plan_url: Optional[str] = None
    floor_plan_floors: int = 1  # Numero di piani
    # Stanze del tour
    rooms: List[TwinRoom] = []
    # Stanza iniziale
    start_room_id: Optional[str] = None
    # Metadati
    is_published: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

# Referente model for immobili
class Referente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nominativo: str
    contatti: Optional[str] = None

# Impianto model for immobili
class Impianto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descrizione: str
    data_certificazione: Optional[str] = None

class ImmobileCreate(BaseModel):
    # I. ANAGRAFICA GENERALE
    ente_proprietario: Optional[str] = None
    denominazione: str
    indirizzo_via: Optional[str] = None
    indirizzo_comune: str = "Tadasuni"
    indirizzo_provincia: str = "OR"
    indirizzo_regione: str = "Sardegna"
    # Proprietario details
    proprietario_nome: Optional[str] = None
    proprietario_cognome: Optional[str] = None
    proprietario_data_nascita: Optional[str] = None
    proprietario_cf: Optional[str] = None
    proprietario_residenza: Optional[str] = None
    proprietario_telefono: Optional[str] = None
    proprietario_email: Optional[str] = None
    proprietario_riferimenti: Optional[str] = None
    proprietario_note: Optional[str] = None
    
    # II. CLASSIFICAZIONE DEL BENE
    tipo_bene: str = "edificato"  # edificato, non_edificato
    destinazione_uso: Optional[str] = None  # residenziale, commerciale, agricolo, magazzino
    tipologia: Optional[str] = None  # casa_singola, villetta, appartamento, magazzino, ex_stalla
    
    # III. DATI CATASTALI - Catasto Fabbricati
    catasto_sezione_urbana: Optional[str] = None
    catasto_foglio: Optional[str] = None
    catasto_particella: Optional[str] = None
    catasto_subalterno: Optional[str] = None
    catasto_categoria: Optional[str] = None
    # Catasto Terreni
    terreno_foglio: Optional[str] = None
    terreno_particella: Optional[str] = None
    
    # IV. DIMENSIONI E STRUTTURA
    superficie_lorda_mq: Optional[float] = None
    superficie_fondiaria_mq: Optional[float] = None
    n_edifici: Optional[int] = None
    n_piani_fuori_terra: Optional[int] = None
    n_piani_entro_terra: Optional[int] = None
    collegamenti_impianti: Optional[str] = None  # scale, ascensori
    superficie_coperta_mq: Optional[float] = None
    superficie_scoperta_mq: Optional[float] = None
    volume_entro_terra_mc: Optional[float] = None
    volume_fuori_terra_mc: Optional[float] = None
    n_vani: Optional[int] = None
    planimetrie_presenti: bool = False
    
    # V. UBICAZIONE
    localizzazione_omi: Optional[str] = None
    coordinate_gps: Optional[str] = None
    link_gemello_digitale: Optional[str] = None
    
    # VI. CERTIFICAZIONI
    certificato_energetico: bool = False
    classe_energetica: Optional[str] = None
    cdu: bool = False  # Certificato Destinazione Urbanistica
    
    # VII. STATO E CONSERVAZIONE
    anno_costruzione: Optional[int] = None
    stato_conservazione: Optional[str] = None  # ottimo, buono, mediocre, pessimo
    data_ultima_manutenzione: Optional[str] = None
    stato_occupazione: Optional[str] = None  # libero, occupato
    soggetto_occupante: Optional[str] = None
    natura_giuridica_occupazione: Optional[str] = None
    tipo_occupazione_durata: Optional[str] = None
    
    # VIII. VINCOLI E CONFORMITA
    presenza_vincoli: bool = False
    tipo_vincoli: Optional[str] = None
    conformita_urbanistica: bool = False
    destinazione_urbanistica_attuale: Optional[str] = None
    destinazioni_urbanistiche_lista: Optional[List[str]] = None  # Dynamic list
    destinazione_urbanistica_prevista: Optional[str] = None
    iter_cambio_destinazione: Optional[str] = None
    titolo_legittimita: Optional[str] = None
    conformita_catastale: bool = False
    
    # IX. DOTAZIONI/IMPIANTI
    impianto_idrico: bool = False
    impianto_elettrico: bool = False
    impianto_fognario: bool = False
    riscaldamento: bool = False
    tipo_riscaldamento: Optional[str] = None
    connessione_internet: bool = False
    tipo_connessione: Optional[str] = None
    impianti_lista: Optional[List[dict]] = None  # List of {descrizione, data_certificazione}
    
    # X. MARKETING E VALORIZZAZIONE
    prezzo_richiesto: Optional[float] = None
    prezzo_mq: Optional[float] = None
    prezzo_pubblico: bool = False  # Flag per rendere il prezzo visibile pubblicamente
    descrizione_narrativa: Optional[str] = None
    punti_forza: Optional[str] = None  # es. "vista lago, silenzioso"
    target_ideale: Optional[str] = None  # nomadi_digitali, over_55, famiglie, investitori
    potenzialita_uso: Optional[str] = None  # b&b, atelier, smart_working
    
    # XI. REFERENTI (lista dinamica)
    referenti: Optional[List[dict]] = None  # List of {nominativo, contatti}
    
    # Stato pubblicazione
    published: bool = True

class ImmobileUpdate(BaseModel):
    # I. ANAGRAFICA GENERALE
    ente_proprietario: Optional[str] = None
    denominazione: Optional[str] = None
    indirizzo_via: Optional[str] = None
    indirizzo_comune: Optional[str] = None
    indirizzo_provincia: Optional[str] = None
    indirizzo_regione: Optional[str] = None
    # Proprietario details
    proprietario_nome: Optional[str] = None
    proprietario_cognome: Optional[str] = None
    proprietario_data_nascita: Optional[str] = None
    proprietario_cf: Optional[str] = None
    proprietario_residenza: Optional[str] = None
    proprietario_telefono: Optional[str] = None
    proprietario_email: Optional[str] = None
    proprietario_riferimenti: Optional[str] = None
    proprietario_note: Optional[str] = None
    
    # II. CLASSIFICAZIONE DEL BENE
    tipo_bene: Optional[str] = None
    destinazione_uso: Optional[str] = None
    tipologia: Optional[str] = None
    
    # III. DATI CATASTALI
    catasto_sezione_urbana: Optional[str] = None
    catasto_foglio: Optional[str] = None
    catasto_particella: Optional[str] = None
    catasto_subalterno: Optional[str] = None
    catasto_categoria: Optional[str] = None
    terreno_foglio: Optional[str] = None
    terreno_particella: Optional[str] = None
    
    # IV. DIMENSIONI E STRUTTURA
    superficie_lorda_mq: Optional[float] = None
    superficie_fondiaria_mq: Optional[float] = None
    n_edifici: Optional[int] = None
    n_piani_fuori_terra: Optional[int] = None
    n_piani_entro_terra: Optional[int] = None
    collegamenti_impianti: Optional[str] = None
    superficie_coperta_mq: Optional[float] = None
    superficie_scoperta_mq: Optional[float] = None
    volume_entro_terra_mc: Optional[float] = None
    volume_fuori_terra_mc: Optional[float] = None
    n_vani: Optional[int] = None
    planimetrie_presenti: Optional[bool] = None
    
    # V. UBICAZIONE
    localizzazione_omi: Optional[str] = None
    coordinate_gps: Optional[str] = None
    link_gemello_digitale: Optional[str] = None
    
    # VI. CERTIFICAZIONI
    certificato_energetico: Optional[bool] = None
    classe_energetica: Optional[str] = None
    cdu: Optional[bool] = None
    
    # VII. STATO E CONSERVAZIONE
    anno_costruzione: Optional[int] = None
    stato_conservazione: Optional[str] = None
    data_ultima_manutenzione: Optional[str] = None
    stato_occupazione: Optional[str] = None
    soggetto_occupante: Optional[str] = None
    natura_giuridica_occupazione: Optional[str] = None
    tipo_occupazione_durata: Optional[str] = None
    
    # VIII. VINCOLI E CONFORMITA
    presenza_vincoli: Optional[bool] = None
    tipo_vincoli: Optional[str] = None
    conformita_urbanistica: Optional[bool] = None
    destinazione_urbanistica_attuale: Optional[str] = None
    destinazioni_urbanistiche_lista: Optional[List[str]] = None
    destinazione_urbanistica_prevista: Optional[str] = None
    iter_cambio_destinazione: Optional[str] = None
    titolo_legittimita: Optional[str] = None
    conformita_catastale: Optional[bool] = None
    
    # IX. DOTAZIONI/IMPIANTI
    impianto_idrico: Optional[bool] = None
    impianto_elettrico: Optional[bool] = None
    impianto_fognario: Optional[bool] = None
    riscaldamento: Optional[bool] = None
    tipo_riscaldamento: Optional[str] = None
    connessione_internet: Optional[bool] = None
    tipo_connessione: Optional[str] = None
    impianti_lista: Optional[List[dict]] = None
    
    # X. MARKETING E VALORIZZAZIONE
    prezzo_richiesto: Optional[float] = None
    prezzo_mq: Optional[float] = None
    prezzo_pubblico: Optional[bool] = None
    descrizione_narrativa: Optional[str] = None
    punti_forza: Optional[str] = None
    target_ideale: Optional[str] = None
    potenzialita_uso: Optional[str] = None
    
    # XI. REFERENTI
    referenti: Optional[List[dict]] = None
    
    # Stato pubblicazione
    published: Optional[bool] = None

class ImmobileResponse(BaseModel):
    id: str
    # I. ANAGRAFICA GENERALE
    ente_proprietario: Optional[str] = None
    denominazione: str
    indirizzo_via: Optional[str] = None
    indirizzo_comune: str
    indirizzo_provincia: str
    indirizzo_regione: str
    # Proprietario details
    proprietario_nome: Optional[str] = None
    proprietario_cognome: Optional[str] = None
    proprietario_data_nascita: Optional[str] = None
    proprietario_cf: Optional[str] = None
    proprietario_residenza: Optional[str] = None
    proprietario_telefono: Optional[str] = None
    proprietario_email: Optional[str] = None
    proprietario_riferimenti: Optional[str] = None
    proprietario_note: Optional[str] = None
    
    # II. CLASSIFICAZIONE DEL BENE
    tipo_bene: str
    destinazione_uso: Optional[str] = None
    tipologia: Optional[str] = None
    
    # III. DATI CATASTALI
    catasto_sezione_urbana: Optional[str] = None
    catasto_foglio: Optional[str] = None
    catasto_particella: Optional[str] = None
    catasto_subalterno: Optional[str] = None
    catasto_categoria: Optional[str] = None
    terreno_foglio: Optional[str] = None
    terreno_particella: Optional[str] = None
    
    # IV. DIMENSIONI E STRUTTURA
    superficie_lorda_mq: Optional[float] = None
    superficie_fondiaria_mq: Optional[float] = None
    n_edifici: Optional[int] = None
    n_piani_fuori_terra: Optional[int] = None
    n_piani_entro_terra: Optional[int] = None
    collegamenti_impianti: Optional[str] = None
    superficie_coperta_mq: Optional[float] = None
    superficie_scoperta_mq: Optional[float] = None
    volume_entro_terra_mc: Optional[float] = None
    volume_fuori_terra_mc: Optional[float] = None
    n_vani: Optional[int] = None
    planimetrie_presenti: bool = False
    
    # V. UBICAZIONE
    localizzazione_omi: Optional[str] = None
    coordinate_gps: Optional[str] = None
    link_gemello_digitale: Optional[str] = None
    
    # VI. CERTIFICAZIONI
    certificato_energetico: bool = False
    classe_energetica: Optional[str] = None
    cdu: bool = False
    
    # VII. STATO E CONSERVAZIONE
    anno_costruzione: Optional[int] = None
    stato_conservazione: Optional[str] = None
    data_ultima_manutenzione: Optional[str] = None
    stato_occupazione: Optional[str] = None
    soggetto_occupante: Optional[str] = None
    natura_giuridica_occupazione: Optional[str] = None
    tipo_occupazione_durata: Optional[str] = None
    
    # VIII. VINCOLI E CONFORMITA
    presenza_vincoli: bool = False
    tipo_vincoli: Optional[str] = None
    conformita_urbanistica: bool = False
    destinazione_urbanistica_attuale: Optional[str] = None
    destinazioni_urbanistiche_lista: Optional[List[str]] = None
    destinazione_urbanistica_prevista: Optional[str] = None
    iter_cambio_destinazione: Optional[str] = None
    titolo_legittimita: Optional[str] = None
    conformita_catastale: bool = False
    
    # IX. DOTAZIONI/IMPIANTI
    impianto_idrico: bool = False
    impianto_elettrico: bool = False
    impianto_fognario: bool = False
    riscaldamento: bool = False
    tipo_riscaldamento: Optional[str] = None
    connessione_internet: bool = False
    tipo_connessione: Optional[str] = None
    impianti_lista: Optional[List[dict]] = None
    
    # X. MARKETING E VALORIZZAZIONE
    prezzo_richiesto: Optional[float] = None
    prezzo_mq: Optional[float] = None
    prezzo_pubblico: bool = False
    descrizione_narrativa: Optional[str] = None
    punti_forza: Optional[str] = None
    target_ideale: Optional[str] = None
    potenzialita_uso: Optional[str] = None
    
    # XI. REFERENTI
    referenti: Optional[List[dict]] = None
    
    # Media
    images: List[ImmobileImage] = []
    attachments: List[ImmobileAttachment] = []
    
    # Metadata
    published: bool = True
    created_at: str
    updated_at: str

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
    return {"message": "VisitTadasuni API"}

async def build_knowledge_context():
    """Build context from all active sources and custom knowledge"""
    context_parts = [TADASUNI_CONTEXT]
    
    # Get active sources
    sources = await db.chatbot_sources.find({"active": True, "status": "active"}, {"_id": 0}).to_list(50)
    for source in sources:
        if source.get("content"):
            context_parts.append(f"\n--- Fonte: {source['name']} ({source['url']}) ---\n{source['content'][:3000]}")
    
    # Get custom knowledge
    knowledge = await db.chatbot_knowledge.find({}, {"_id": 0}).to_list(50)
    for k in knowledge:
        context_parts.append(f"\n--- {k['title']} ---\n{k['content']}")
    
    return "\n\n".join(context_parts)

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    language_instruction = LANGUAGE_PROMPTS.get(request.language, LANGUAGE_PROMPTS["it"])
    
    # Get settings
    settings = await db.chatbot_settings.find_one({"id": "main"}, {"_id": 0})
    custom_system_prompt = settings.get("system_prompt", "") if settings else ""
    max_tokens = settings.get("max_tokens", 500) if settings else 500
    temperature = settings.get("temperature", 0.7) if settings else 0.7
    
    # Build dynamic knowledge context
    knowledge_context = await build_knowledge_context()
    
    system_prompt = f"""{custom_system_prompt or 'Sei un assistente virtuale per VisitTadasuni, il sito turistico del borgo di Tadasuni in Sardegna.'}

Usa le seguenti informazioni per rispondere alle domande:

{knowledge_context}

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
        "url": f"/api/uploads/{filename}",
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

# ============== ATTRACTIONS CMS API ==============

def extract_coordinates_from_google_maps_link(link: str) -> tuple:
    """Extract latitude and longitude from a Google Maps link"""
    import re
    
    if not link:
        return None, None
    
    # Pattern for various Google Maps URL formats
    patterns = [
        r'@(-?\d+\.\d+),(-?\d+\.\d+)',  # @lat,lng format
        r'll=(-?\d+\.\d+),(-?\d+\.\d+)',  # ll=lat,lng format
        r'q=(-?\d+\.\d+),(-?\d+\.\d+)',  # q=lat,lng format
        r'/place/[^/]+/@(-?\d+\.\d+),(-?\d+\.\d+)',  # /place/@lat,lng format
        r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)',  # !3d lat !4d lng format
    ]
    
    for pattern in patterns:
        match = re.search(pattern, link)
        if match:
            lat, lng = match.groups()
            return float(lat), float(lng)
    
    return None, None

@api_router.get("/attractions", response_model=List[AttractionResponse])
async def get_attractions(published_only: bool = True):
    """Get all attractions"""
    query = {"published": True} if published_only else {}
    attractions = await db.attractions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return attractions

@api_router.get("/attractions/{attraction_id}", response_model=AttractionResponse)
async def get_attraction(attraction_id: str):
    """Get a single attraction by ID"""
    attraction = await db.attractions.find_one({"id": attraction_id}, {"_id": 0})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return attraction

@api_router.post("/attractions", response_model=AttractionResponse)
async def create_attraction(attraction: AttractionCreate):
    """Create a new attraction"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Extract coordinates from Google Maps link if provided
    lat, lng = extract_coordinates_from_google_maps_link(attraction.google_maps_link)
    if lat and lng:
        attraction.latitude = lat
        attraction.longitude = lng
    
    attraction_doc = {
        "id": str(uuid.uuid4()),
        **attraction.model_dump(),
        "images": [],
        "audio_url": None,
        "audio_url_en": None,
        "audio_url_fr": None,
        "audio_url_es": None,
        "audio_url_de": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.attractions.insert_one(attraction_doc)
    if "_id" in attraction_doc:
        del attraction_doc["_id"]
    
    return attraction_doc

@api_router.put("/attractions/{attraction_id}", response_model=AttractionResponse)
async def update_attraction(attraction_id: str, attraction: AttractionUpdate):
    """Update an existing attraction"""
    existing = await db.attractions.find_one({"id": attraction_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    update_data = {k: v for k, v in attraction.model_dump().items() if v is not None}
    
    # Extract coordinates from Google Maps link if updated
    if "google_maps_link" in update_data:
        lat, lng = extract_coordinates_from_google_maps_link(update_data["google_maps_link"])
        if lat and lng:
            update_data["latitude"] = lat
            update_data["longitude"] = lng
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.attractions.update_one({"id": attraction_id}, {"$set": update_data})
    updated = await db.attractions.find_one({"id": attraction_id}, {"_id": 0})
    return updated

@api_router.delete("/attractions/{attraction_id}")
async def delete_attraction(attraction_id: str):
    """Delete an attraction and its files"""
    attraction = await db.attractions.find_one({"id": attraction_id})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    # Delete associated images
    for img in attraction.get("images", []):
        filename = img["url"].split("/")[-1]
        img_path = UPLOADS_DIR / filename
        if img_path.exists():
            img_path.unlink()
    
    # Delete audio files
    for lang in ["", "_en", "_fr", "_es", "_de"]:
        audio_key = f"audio_url{lang}"
        if attraction.get(audio_key):
            filename = attraction[audio_key].split("/")[-1]
            audio_path = AUDIO_DIR / filename
            if audio_path.exists():
                audio_path.unlink()
    
    await db.attractions.delete_one({"id": attraction_id})
    return {"success": True, "message": "Attraction deleted"}

@api_router.post("/attractions/{attraction_id}/images")
async def upload_attraction_image(
    attraction_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None)
):
    """Upload an image for an attraction (max 3 images)"""
    attraction = await db.attractions.find_one({"id": attraction_id})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    if len(attraction.get("images", [])) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images per attraction")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"attr_{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Add image to attraction
    image_data = {
        "id": str(uuid.uuid4()),
        "url": f"/api/uploads/{filename}",
        "caption": caption
    }
    
    await db.attractions.update_one(
        {"id": attraction_id},
        {
            "$push": {"images": image_data},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "image": image_data}

@api_router.delete("/attractions/{attraction_id}/images/{image_id}")
async def delete_attraction_image(attraction_id: str, image_id: str):
    """Delete an image from an attraction"""
    attraction = await db.attractions.find_one({"id": attraction_id})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    # Find and delete the image file
    image_to_delete = None
    for img in attraction.get("images", []):
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
    await db.attractions.update_one(
        {"id": attraction_id},
        {
            "$pull": {"images": {"id": image_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": "Image deleted"}

@api_router.post("/attractions/{attraction_id}/audio")
async def upload_attraction_audio(
    attraction_id: str,
    file: UploadFile = File(...),
    language: str = Form("it")
):
    """Upload an audio guide for an attraction"""
    attraction = await db.attractions.find_one({"id": attraction_id})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    # Validate language
    valid_languages = ["it", "en", "fr", "es", "de"]
    if language not in valid_languages:
        raise HTTPException(status_code=400, detail="Invalid language")
    
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-wav"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: MP3, WAV, OGG")
    
    # Delete old audio file if exists
    audio_field = "audio_url" if language == "it" else f"audio_url_{language}"
    if attraction.get(audio_field):
        old_filename = attraction[audio_field].split("/")[-1]
        old_path = AUDIO_DIR / old_filename
        if old_path.exists():
            old_path.unlink()
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "mp3"
    filename = f"audio_{attraction_id}_{language}_{uuid.uuid4()}.{ext}"
    filepath = AUDIO_DIR / filename
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update attraction
    await db.attractions.update_one(
        {"id": attraction_id},
        {"$set": {
            audio_field: f"/api/audio/{filename}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "audio_url": f"/api/audio/{filename}", "language": language}

@api_router.delete("/attractions/{attraction_id}/audio/{language}")
async def delete_attraction_audio(attraction_id: str, language: str):
    """Delete an audio guide from an attraction"""
    attraction = await db.attractions.find_one({"id": attraction_id})
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    audio_field = "audio_url" if language == "it" else f"audio_url_{language}"
    
    if attraction.get(audio_field):
        filename = attraction[audio_field].split("/")[-1]
        filepath = AUDIO_DIR / filename
        if filepath.exists():
            filepath.unlink()
    
    await db.attractions.update_one(
        {"id": attraction_id},
        {"$set": {
            audio_field: None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Audio deleted"}

@api_router.get("/config/maps")
async def get_maps_config():
    """Get Google Maps API key for frontend"""
    return {"api_key": GOOGLE_MAPS_API_KEY}

# ============== CHATBOT ADMIN API ==============

async def scrape_webpage(url: str) -> dict:
    """Scrape content from a webpage"""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text(separator='\n', strip=True)
            
            # Clean up whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            content = '\n'.join(lines)
            
            # Limit content length
            if len(content) > 15000:
                content = content[:15000] + "..."
            
            # Get title
            title = soup.title.string if soup.title else url
            
            return {
                "success": True,
                "content": content,
                "title": title
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@api_router.post("/chatbot/admin/login", response_model=AdminLoginResponse)
async def chatbot_admin_login(request: AdminLogin):
    """Login for chatbot admin panel"""
    if request.username == CHATBOT_ADMIN_USERNAME and request.password == CHATBOT_ADMIN_PASSWORD:
        token = base64.b64encode(f"chatbot:{request.username}:{datetime.now().isoformat()}".encode()).decode()
        return AdminLoginResponse(success=True, token=token, message="Login successful")
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/chatbot/sources", response_model=List[ChatbotSourceResponse])
async def get_chatbot_sources():
    """Get all chatbot knowledge sources"""
    sources = await db.chatbot_sources.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sources

@api_router.post("/chatbot/sources", response_model=ChatbotSourceResponse)
async def create_chatbot_source(source: ChatbotSourceCreate):
    """Add a new knowledge source from URL"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if URL already exists
    existing = await db.chatbot_sources.find_one({"url": source.url})
    if existing:
        raise HTTPException(status_code=400, detail="URL already exists as a source")
    
    source_doc = {
        "id": str(uuid.uuid4()),
        "url": source.url,
        "name": source.name,
        "description": source.description,
        "content": None,
        "content_summary": None,
        "auto_refresh": source.auto_refresh,
        "refresh_hours": source.refresh_hours,
        "active": True,
        "last_fetched": None,
        "created_at": now,
        "updated_at": now,
        "status": "pending",
        "error_message": None
    }
    
    await db.chatbot_sources.insert_one(source_doc)
    if "_id" in source_doc:
        del source_doc["_id"]
    
    return source_doc

@api_router.post("/chatbot/sources/{source_id}/fetch")
async def fetch_source_content(source_id: str):
    """Fetch/refresh content from a source URL"""
    source = await db.chatbot_sources.find_one({"id": source_id})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    result = await scrape_webpage(source["url"])
    now = datetime.now(timezone.utc).isoformat()
    
    if result["success"]:
        # Generate a summary using AI
        summary = result["content"][:500] + "..." if len(result["content"]) > 500 else result["content"]
        
        await db.chatbot_sources.update_one(
            {"id": source_id},
            {"$set": {
                "content": result["content"],
                "content_summary": summary,
                "last_fetched": now,
                "updated_at": now,
                "status": "active",
                "error_message": None
            }}
        )
        return {"success": True, "message": "Content fetched successfully", "content_length": len(result["content"])}
    else:
        await db.chatbot_sources.update_one(
            {"id": source_id},
            {"$set": {
                "status": "error",
                "error_message": result["error"],
                "updated_at": now
            }}
        )
        raise HTTPException(status_code=400, detail=f"Failed to fetch: {result['error']}")

@api_router.put("/chatbot/sources/{source_id}", response_model=ChatbotSourceResponse)
async def update_chatbot_source(source_id: str, source: ChatbotSourceUpdate):
    """Update a chatbot source"""
    existing = await db.chatbot_sources.find_one({"id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = {k: v for k, v in source.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.chatbot_sources.update_one({"id": source_id}, {"$set": update_data})
    updated = await db.chatbot_sources.find_one({"id": source_id}, {"_id": 0})
    return updated

@api_router.delete("/chatbot/sources/{source_id}")
async def delete_chatbot_source(source_id: str):
    """Delete a chatbot source"""
    result = await db.chatbot_sources.delete_one({"id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"success": True, "message": "Source deleted"}

@api_router.get("/chatbot/custom-knowledge")
async def get_custom_knowledge():
    """Get all custom knowledge entries"""
    knowledge = await db.chatbot_knowledge.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return knowledge

@api_router.post("/chatbot/custom-knowledge")
async def add_custom_knowledge(knowledge: ChatbotCustomKnowledge):
    """Add custom knowledge to chatbot"""
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "title": knowledge.title,
        "content": knowledge.content,
        "created_at": now,
        "updated_at": now
    }
    await db.chatbot_knowledge.insert_one(doc)
    if "_id" in doc:
        del doc["_id"]
    return doc

@api_router.delete("/chatbot/custom-knowledge/{knowledge_id}")
async def delete_custom_knowledge(knowledge_id: str):
    """Delete custom knowledge entry"""
    result = await db.chatbot_knowledge.delete_one({"id": knowledge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return {"success": True, "message": "Knowledge deleted"}

@api_router.get("/chatbot/settings")
async def get_chatbot_settings():
    """Get chatbot settings"""
    settings = await db.chatbot_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        # Default settings
        settings = {
            "id": "main",
            "welcome_message": "Ciao! Sono l'assistente virtuale di VisitTadasuni. Come posso aiutarti?",
            "welcome_message_en": "Hello! I'm the virtual assistant of VisitTadasuni. How can I help you?",
            "welcome_message_fr": "Bonjour! Je suis l'assistant virtuel de VisitTadasuni. Comment puis-je vous aider?",
            "welcome_message_es": "¡Hola! Soy el asistente virtual de VisitTadasuni. ¿Cómo puedo ayudarte?",
            "welcome_message_de": "Hallo! Ich bin der virtuelle Assistent von VisitTadasuni. Wie kann ich Ihnen helfen?",
            "system_prompt": "Sei un assistente virtuale per VisitTadasuni, il sito turistico del borgo di Tadasuni in Sardegna.",
            "bot_name": "Assistente Tadasuni",
            "max_tokens": 500,
            "temperature": 0.7
        }
        await db.chatbot_settings.insert_one(settings)
    return settings

@api_router.put("/chatbot/settings")
async def update_chatbot_settings(settings: ChatbotSettingsUpdate):
    """Update chatbot settings"""
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.chatbot_settings.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    return await get_chatbot_settings()

@api_router.get("/chatbot/stats")
async def get_chatbot_stats():
    """Get chatbot statistics"""
    sources_count = await db.chatbot_sources.count_documents({"active": True})
    knowledge_count = await db.chatbot_knowledge.count_documents({})
    
    return {
        "active_sources": sources_count,
        "custom_knowledge_entries": knowledge_count
    }

# ============== IMMOBILI (HOME TADASUNI) API ==============

@api_router.get("/immobili", response_model=List[ImmobileResponse])
async def get_immobili(published_only: bool = False):
    """Get all properties"""
    query = {"published": True} if published_only else {}
    immobili = await db.immobili.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return immobili

@api_router.get("/immobili/{immobile_id}", response_model=ImmobileResponse)
async def get_immobile(immobile_id: str):
    """Get single property"""
    immobile = await db.immobili.find_one({"id": immobile_id}, {"_id": 0})
    if not immobile:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    return immobile

@api_router.post("/immobili", response_model=ImmobileResponse)
async def create_immobile(immobile: ImmobileCreate):
    """Create a new property"""
    now = datetime.now(timezone.utc).isoformat()
    immobile_dict = immobile.model_dump()
    immobile_dict["id"] = str(uuid.uuid4())
    immobile_dict["images"] = []
    immobile_dict["attachments"] = []
    immobile_dict["created_at"] = now
    immobile_dict["updated_at"] = now
    
    await db.immobili.insert_one(immobile_dict)
    return immobile_dict

@api_router.put("/immobili/{immobile_id}", response_model=ImmobileResponse)
async def update_immobile(immobile_id: str, immobile: ImmobileUpdate):
    """Update a property"""
    existing = await db.immobili.find_one({"id": immobile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    
    update_data = {k: v for k, v in immobile.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.immobili.update_one({"id": immobile_id}, {"$set": update_data})
    updated = await db.immobili.find_one({"id": immobile_id}, {"_id": 0})
    return updated

@api_router.delete("/immobili/{immobile_id}")
async def delete_immobile(immobile_id: str):
    """Delete a property"""
    result = await db.immobili.delete_one({"id": immobile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    return {"success": True, "message": "Immobile eliminato"}

# Immobili Images
@api_router.post("/immobili/{immobile_id}/images")
async def upload_immobile_image(
    immobile_id: str, 
    file: UploadFile = File(...), 
    caption: str = Form(None),
    is_360: bool = Form(False)
):
    """Upload image for property (supports 360° panoramic images)"""
    immobile = await db.immobili.find_one({"id": immobile_id})
    if not immobile:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo file non supportato")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{file_id}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Add to immobile
    image_data = {
        "id": file_id,
        "url": f"/api/uploads/{filename}",
        "caption": caption,
        "is_360": is_360
    }
    
    await db.immobili.update_one(
        {"id": immobile_id},
        {"$push": {"images": image_data}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "image": image_data}

@api_router.delete("/immobili/{immobile_id}/images/{image_id}")
async def delete_immobile_image(immobile_id: str, image_id: str):
    """Delete image from property"""
    immobile = await db.immobili.find_one({"id": immobile_id})
    if not immobile:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    
    # Find and remove image
    images = immobile.get("images", [])
    image_to_delete = next((img for img in images if img["id"] == image_id), None)
    
    if image_to_delete:
        # Delete file
        filename = image_to_delete["url"].split("/")[-1]
        file_path = UPLOADS_DIR / filename
        if file_path.exists():
            file_path.unlink()
        
        # Remove from database
        await db.immobili.update_one(
            {"id": immobile_id},
            {"$pull": {"images": {"id": image_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"success": True}

# Immobili Attachments
@api_router.post("/immobili/{immobile_id}/attachments")
async def upload_immobile_attachment(
    immobile_id: str, 
    file: UploadFile = File(...), 
    description: str = Form(None),
    section: str = Form("generale")
):
    """Upload attachment for property"""
    immobile = await db.immobili.find_one({"id": immobile_id})
    if not immobile:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    filename = f"{file_id}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Determine file type
    file_type = "document"
    if file.content_type and file.content_type.startswith("image/"):
        file_type = "image"
    elif file.content_type == "application/pdf":
        file_type = "pdf"
    
    # Add to immobile
    attachment_data = {
        "id": file_id,
        "filename": file.filename,
        "url": f"/api/uploads/{filename}",
        "description": description,
        "section": section,
        "file_type": file_type
    }
    
    await db.immobili.update_one(
        {"id": immobile_id},
        {"$push": {"attachments": attachment_data}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "attachment": attachment_data}

@api_router.delete("/immobili/{immobile_id}/attachments/{attachment_id}")
async def delete_immobile_attachment(immobile_id: str, attachment_id: str):
    """Delete attachment from property"""
    immobile = await db.immobili.find_one({"id": immobile_id})
    if not immobile:
        raise HTTPException(status_code=404, detail="Immobile non trovato")
    
    # Find and remove attachment
    attachments = immobile.get("attachments", [])
    attachment_to_delete = next((att for att in attachments if att["id"] == attachment_id), None)
    
    if attachment_to_delete:
        # Delete file
        filename = attachment_to_delete["url"].split("/")[-1]
        file_path = UPLOADS_DIR / filename
        if file_path.exists():
            file_path.unlink()
        
        # Remove from database
        await db.immobili.update_one(
            {"id": immobile_id},
            {"$pull": {"attachments": {"id": attachment_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"success": True}

# Export Immobili
@api_router.get("/immobili/export/excel")
async def export_immobili_excel():
    """Export properties to Excel format (returns JSON for frontend to process)"""
    immobili = await db.immobili.find({}, {"_id": 0}).to_list(1000)
    return {"data": immobili, "format": "excel"}

@api_router.get("/immobili/export/pdf")
async def export_immobili_pdf():
    """Export properties to PDF format (returns JSON for frontend to process)"""
    immobili = await db.immobili.find({}, {"_id": 0}).to_list(1000)
    return {"data": immobili, "format": "pdf"}

# Include router
app.include_router(api_router)

# Serve uploaded files
# Mount uploads directory under /api prefix for consistency
api_router_uploads = APIRouter(prefix="/api")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/api/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

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
