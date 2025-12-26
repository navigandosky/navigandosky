from fastapi import FastAPI, APIRouter, HTTPException, Query
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
from enum import Enum


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
    posizione: Optional[str] = None
    data_acquisto: Optional[str] = None
    data_scadenza_garanzia: Optional[str] = None
    # Consumi energetici
    consumo_orario_kw: float = 0.0
    ore_uso_giornaliero_stimate: float = 0.0
    # Smart Plug
    smart_plug_provider: SmartPlugProvider = SmartPlugProvider.NESSUNO
    smart_plug_id: Optional[str] = None
    # Centro assistenza
    centro_assistenza_id: Optional[str] = None
    # Matterport
    matterport_tag_id: Optional[str] = None
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
    posizione: Optional[str] = None
    data_acquisto: Optional[str] = None
    data_scadenza_garanzia: Optional[str] = None
    consumo_orario_kw: Optional[float] = None
    ore_uso_giornaliero_stimate: Optional[float] = None
    smart_plug_provider: Optional[SmartPlugProvider] = None
    smart_plug_id: Optional[str] = None
    centro_assistenza_id: Optional[str] = None
    matterport_tag_id: Optional[str] = None
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
