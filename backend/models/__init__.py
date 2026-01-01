"""
Modelli Pydantic per tutte le applicazioni Trivor
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

# =============================================================================
# BASE / COMMON MODELS
# =============================================================================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class DeleteRequest(BaseModel):
    password: str

# =============================================================================
# PORTFOLIO / PROJECTS
# =============================================================================

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

# =============================================================================
# SITE SETTINGS
# =============================================================================

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    hero_images: List[dict] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    hero_images: Optional[List[dict]] = None

# =============================================================================
# CONTACT MESSAGES
# =============================================================================

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
# TRIVORDOC MODELS
# =============================================================================

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

class EmailShareRequest(BaseModel):
    document_ids: List[str]
    recipient_email: str
    subject: Optional[str] = "Documenti condivisi da Trivor"
    message: Optional[str] = ""

class WhatsAppShareRequest(BaseModel):
    document_ids: List[str]
    phone_number: str
    message: Optional[str] = ""

# =============================================================================
# TRIVORWEB MODELS
# =============================================================================

class DatabaseInfoSchema(BaseModel):
    provider: str = ""
    tipo: str = ""
    host: str = ""
    nome_db: str = ""
    username: str = ""
    password: str = ""
    porta: int = 3306
    spazio_mb: float = 0
    costo_annuale: float = 0
    note: str = ""

class AccountInfoSchema(BaseModel):
    servizio: str = ""
    username: str = ""
    password: str = ""

class FtpInfoSchema(BaseModel):
    host: str = ""
    username: str = ""
    password: str = ""
    porta: int = 21
    percorso_root: str = "/"

class HostingInfoSchema(BaseModel):
    provider: str = ""
    tipo: str = ""
    piano: str = ""
    spazio_gb: float = 0
    costo_annuale: float = 0
    data_acquisto: Optional[str] = None
    data_scadenza: Optional[str] = None
    alert_giorni: int = 30
    pannello_url: str = ""
    pannello_user: str = ""
    pannello_password: str = ""
    note: str = ""

class ClienteInfoSchema(BaseModel):
    nome: str = ""
    azienda: str = ""
    email: str = ""
    telefono: str = ""
    pec: str = ""
    indirizzo: str = ""
    partita_iva: str = ""
    codice_fiscale: str = ""
    note: str = ""

class SitoWebCreate(BaseModel):
    nome_progetto: str
    dominio: str
    stato: str = "attivo"
    cliente: ClienteInfoSchema = ClienteInfoSchema()
    data_inizio: Optional[str] = None
    data_online: Optional[str] = None
    hosting: HostingInfoSchema = HostingInfoSchema()
    ftp: FtpInfoSchema = FtpInfoSchema()
    databases: List[DatabaseInfoSchema] = []
    accounts: List[AccountInfoSchema] = []
    tecnologie: List[str] = []
    url_staging: str = ""
    url_produzione: str = ""
    note_tecniche: str = ""
    note_generali: str = ""
    costo_realizzazione: float = 0
    costo_manutenzione_annuale: float = 0

class SitoWebUpdate(BaseModel):
    nome_progetto: Optional[str] = None
    dominio: Optional[str] = None
    stato: Optional[str] = None
    cliente: Optional[ClienteInfoSchema] = None
    data_inizio: Optional[str] = None
    data_online: Optional[str] = None
    hosting: Optional[HostingInfoSchema] = None
    ftp: Optional[FtpInfoSchema] = None
    databases: Optional[List[DatabaseInfoSchema]] = None
    accounts: Optional[List[AccountInfoSchema]] = None
    tecnologie: Optional[List[str]] = None
    url_staging: Optional[str] = None
    url_produzione: Optional[str] = None
    note_tecniche: Optional[str] = None
    note_generali: Optional[str] = None
    costo_realizzazione: Optional[float] = None
    costo_manutenzione_annuale: Optional[float] = None

# =============================================================================
# TRIVOR CONTACTS MODELS
# =============================================================================

class ContactCreate(BaseModel):
    nome: str
    cognome: str = ""
    email: str = ""
    telefono: str = ""
    whatsapp: str = ""
    azienda: str = ""
    ruolo: str = ""
    indirizzo: str = ""
    note: str = ""
    gruppi: List[str] = []
    preferito: bool = False
    avatar_color: str = ""

class ContactUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    azienda: Optional[str] = None
    ruolo: Optional[str] = None
    indirizzo: Optional[str] = None
    note: Optional[str] = None
    gruppi: Optional[List[str]] = None
    preferito: Optional[bool] = None
    avatar_color: Optional[str] = None

class GroupCreate(BaseModel):
    nome: str
    descrizione: str = ""
    colore: str = "#3B82F6"

class GroupUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    colore: Optional[str] = None

# =============================================================================
# DIGITAL TWIN / SPACES MODELS
# =============================================================================

class SpaceCreate(BaseModel):
    name_it: str
    name_en: str = ""
    description_it: str = ""
    description_en: str = ""
    image_url: str = ""
    matterport_id: str = ""
    mpskin_url: str = ""
    order: int = 0
    is_public: bool = True

class SpaceUpdate(BaseModel):
    name_it: Optional[str] = None
    name_en: Optional[str] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    matterport_id: Optional[str] = None
    mpskin_url: Optional[str] = None
    order: Optional[int] = None
    is_public: Optional[bool] = None
