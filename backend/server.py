from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import io
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Fixed credentials
FIXED_USERNAME = "DigitalTwin26"
FIXED_PASSWORD = "Dgt_26$"

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', 'associazionedigitaltwinsitalia@gmail.com')
SMTP_PASS = os.environ.get('SMTP_PASS', 'digitaltwins25')
SMTP_FROM = os.environ.get('SMTP_FROM', 'associazionedigitaltwinsitalia@gmail.com')

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None

class DocumentoAllegato(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descrizione: str
    data_caricamento: str
    file_id: str
    filename: str
    content_type: str
    size: int

class SocioBase(BaseModel):
    nome: str
    cognome: str
    citta: Optional[str] = ""
    regione: Optional[str] = ""
    indirizzo: Optional[str] = ""
    codice_fiscale: Optional[str] = ""
    telefono: Optional[str] = ""
    pec: Optional[str] = ""
    email: Optional[str] = ""
    tipo_dispositivo: Optional[str] = ""
    carica: Optional[str] = ""
    data_iscrizione: Optional[str] = ""
    qualifica: Optional[str] = ""
    sito_web: Optional[str] = ""
    zona_copertura: Optional[str] = ""
    documenti: List[DocumentoAllegato] = []

class SocioCreate(SocioBase):
    pass

class SocioUpdate(SocioBase):
    pass

class Socio(SocioBase):
    id: str

class DropdownOption(BaseModel):
    id: str
    value: str
    category: str

class DropdownOptionCreate(BaseModel):
    value: str
    category: str

# Comunicazioni Models
class AllegatoComunicazione(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_id: str
    content_type: str
    size: int

class DestinatarioComunicazione(BaseModel):
    socio_id: str
    nome: str
    cognome: str
    email: str
    inviato: bool = False
    data_invio: Optional[str] = None
    errore: Optional[str] = None

class ComunicazioneBase(BaseModel):
    tipo: str
    oggetto: str
    descrizione: str

class ComunicazioneCreate(ComunicazioneBase):
    destinatari_ids: List[str]

class Comunicazione(ComunicazioneBase):
    id: str
    data_creazione: str
    data_invio: Optional[str] = None
    stato: str  # "bozza", "in_invio", "inviata", "errore"
    destinatari: List[DestinatarioComunicazione] = []
    allegati: List[AllegatoComunicazione] = []
    totale_destinatari: int = 0
    totale_inviati: int = 0

# Authentication
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    if request.username == FIXED_USERNAME and request.password == FIXED_PASSWORD:
        token = str(uuid.uuid4())
        return LoginResponse(success=True, message="Login effettuato", token=token)
    raise HTTPException(status_code=401, detail="Credenziali non valide")

# Soci CRUD
@api_router.post("/soci", response_model=Socio)
async def create_socio(socio: SocioCreate):
    socio_dict = socio.model_dump()
    socio_dict['id'] = str(uuid.uuid4())
    socio_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.soci.insert_one(socio_dict)
    return Socio(**socio_dict)

@api_router.get("/soci", response_model=List[Socio])
async def get_soci(search: Optional[str] = None, regione: Optional[str] = None, carica: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cognome": {"$regex": search, "$options": "i"}},
            {"citta": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if regione:
        query["regione"] = {"$regex": regione, "$options": "i"}
    if carica:
        query["carica"] = {"$regex": carica, "$options": "i"}
    
    soci = await db.soci.find(query, {"_id": 0}).to_list(1000)
    return [Socio(**s) for s in soci]

@api_router.get("/soci/{socio_id}", response_model=Socio)
async def get_socio(socio_id: str):
    socio = await db.soci.find_one({"id": socio_id}, {"_id": 0})
    if not socio:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    return Socio(**socio)

@api_router.put("/soci/{socio_id}", response_model=Socio)
async def update_socio(socio_id: str, socio: SocioUpdate):
    existing = await db.soci.find_one({"id": socio_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    
    socio_dict = socio.model_dump()
    socio_dict['id'] = socio_id
    socio_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.soci.update_one({"id": socio_id}, {"$set": socio_dict})
    updated = await db.soci.find_one({"id": socio_id}, {"_id": 0})
    return Socio(**updated)

@api_router.delete("/soci/{socio_id}")
async def delete_socio(socio_id: str):
    result = await db.soci.delete_one({"id": socio_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    return {"message": "Socio eliminato"}

# File upload/download
@api_router.post("/soci/{socio_id}/documenti")
async def upload_documento(
    socio_id: str,
    file: UploadFile = File(...),
    descrizione: str = Form("")
):
    socio = await db.soci.find_one({"id": socio_id})
    if not socio:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    
    if file.size and file.size > 6 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File troppo grande (max 6MB)")
    
    content = await file.read()
    file_id = await fs.upload_from_stream(
        file.filename,
        io.BytesIO(content),
        metadata={"content_type": file.content_type, "socio_id": socio_id}
    )
    
    doc = DocumentoAllegato(
        descrizione=descrizione,
        data_caricamento=datetime.now(timezone.utc).isoformat(),
        file_id=str(file_id),
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size=len(content)
    )
    
    await db.soci.update_one(
        {"id": socio_id},
        {"$push": {"documenti": doc.model_dump()}}
    )
    
    return doc

@api_router.get("/documenti/{file_id}")
async def download_documento(file_id: str):
    from bson import ObjectId
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
        content = await grid_out.read()
        return Response(
            content=content,
            media_type=grid_out.metadata.get("content_type", "application/octet-stream"),
            headers={"Content-Disposition": f"attachment; filename={grid_out.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="File non trovato")

@api_router.delete("/soci/{socio_id}/documenti/{doc_id}")
async def delete_documento(socio_id: str, doc_id: str):
    from bson import ObjectId
    socio = await db.soci.find_one({"id": socio_id})
    if not socio:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    
    doc_to_delete = None
    for doc in socio.get("documenti", []):
        if doc["id"] == doc_id:
            doc_to_delete = doc
            break
    
    if doc_to_delete:
        try:
            await fs.delete(ObjectId(doc_to_delete["file_id"]))
        except:
            pass
        await db.soci.update_one(
            {"id": socio_id},
            {"$pull": {"documenti": {"id": doc_id}}}
        )
    
    return {"message": "Documento eliminato"}

# Dropdown options
@api_router.get("/dropdown/{category}", response_model=List[DropdownOption])
async def get_dropdown_options(category: str):
    options = await db.dropdown_options.find({"category": category}, {"_id": 0}).to_list(100)
    return [DropdownOption(**o) for o in options]

@api_router.post("/dropdown", response_model=DropdownOption)
async def add_dropdown_option(option: DropdownOptionCreate):
    existing = await db.dropdown_options.find_one({
        "category": option.category,
        "value": option.value
    })
    if existing:
        return DropdownOption(**{**existing, "_id": None} if "_id" in existing else existing)
    
    opt_dict = option.model_dump()
    opt_dict['id'] = str(uuid.uuid4())
    await db.dropdown_options.insert_one(opt_dict)
    return DropdownOption(**opt_dict)

# Statistics for dashboard and map
@api_router.get("/stats")
async def get_stats():
    total = await db.soci.count_documents({})
    
    pipeline = [
        {"$group": {"_id": "$regione", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_regione = await db.soci.aggregate(pipeline).to_list(100)
    
    pipeline_carica = [
        {"$group": {"_id": "$carica", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_carica = await db.soci.aggregate(pipeline_carica).to_list(100)
    
    pipeline_qualifica = [
        {"$group": {"_id": "$qualifica", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_qualifica = await db.soci.aggregate(pipeline_qualifica).to_list(100)
    
    return {
        "totale_soci": total,
        "per_regione": [{"regione": r["_id"] or "Non specificata", "count": r["count"]} for r in by_regione],
        "per_carica": [{"carica": c["_id"] or "Non specificata", "count": c["count"]} for c in by_carica],
        "per_qualifica": [{"qualifica": q["_id"] or "Non specificata", "count": q["count"]} for q in by_qualifica]
    }

@api_router.get("/map-data")
async def get_map_data():
    pipeline = [
        {"$group": {
            "_id": {"regione": "$regione", "citta": "$citta"},
            "soci": {"$push": {
                "id": "$id",
                "nome": "$nome",
                "cognome": "$cognome",
                "citta": "$citta",
                "telefono": "$telefono",
                "email": "$email",
                "sito_web": "$sito_web",
                "carica": "$carica",
                "tipo_dispositivo": "$tipo_dispositivo"
            }},
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": "$_id.regione",
            "citta": {"$push": {
                "nome": "$_id.citta",
                "soci": "$soci",
                "count": "$count"
            }},
            "totale": {"$sum": "$count"}
        }}
    ]
    results = await db.soci.aggregate(pipeline).to_list(100)
    
    return [
        {
            "regione": r["_id"] or "Non specificata",
            "totale": r["totale"],
            "citta": r["citta"]
        }
        for r in results
    ]

# Seed initial data
@api_router.post("/seed")
async def seed_data():
    # Add default dropdown options
    dispositivi = ["PRO2", "PRO3", "Altro"]
    qualifiche = ["Socio Fondatore", "Socio", "Socio Sostenitore", "Socio Onorario"]
    cariche = ["Presidente", "Vice Presidente", "Segretario", "Tesoriere", "Consigliere", "Socio"]
    
    for d in dispositivi:
        await db.dropdown_options.update_one(
            {"category": "dispositivo", "value": d},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "category": "dispositivo", "value": d}},
            upsert=True
        )
    
    for q in qualifiche:
        await db.dropdown_options.update_one(
            {"category": "qualifica", "value": q},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "category": "qualifica", "value": q}},
            upsert=True
        )
    
    for c in cariche:
        await db.dropdown_options.update_one(
            {"category": "carica", "value": c},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "category": "carica", "value": c}},
            upsert=True
        )
    
    # Seed soci from Excel data
    soci_data = [
        {"nome": "Andrea", "cognome": "Faggi", "regione": "TOSCANA", "zona_copertura": "TOSCANA", "tipo_dispositivo": "PRO3", "email": "faggiandrea13@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Andrea", "cognome": "Curci", "regione": "PIEMONTE", "zona_copertura": "PIEMONTE", "tipo_dispositivo": "PRO3", "email": "andreacurci1981@libero.it", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Antonio", "cognome": "Deiana", "regione": "SARDEGNA", "zona_copertura": "SARDEGNA", "tipo_dispositivo": "PRO3", "email": "navigandosky@yahoo.it", "carica": "Segretario", "qualifica": "Socio Fondatore"},
        {"nome": "Antonio", "cognome": "Mazzei", "regione": "CAMPANIA", "zona_copertura": "CAMPANIA", "tipo_dispositivo": "PRO3", "email": "antoniomazzei1967@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Domenico", "cognome": "Zoccoli", "regione": "CALABRIA", "zona_copertura": "CALABRIA, BASILICATA, PUGLIA", "tipo_dispositivo": "PRO2", "email": "zoccoli.consulenze@gmail.com", "carica": "Tesoriere", "qualifica": "Socio Fondatore"},
        {"nome": "Enzo", "cognome": "Vindigni", "regione": "SICILIA", "zona_copertura": "SICILIA - RAGUSA", "tipo_dispositivo": "PRO3", "email": "vincenzovindigni@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Federico", "cognome": "Biancospino", "regione": "CALABRIA", "zona_copertura": "CALABRIA - BASILICATA - PUGLIA", "tipo_dispositivo": "PRO3", "email": "federicobiancospino73@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Gaspare", "cognome": "Voce", "regione": "CALABRIA", "zona_copertura": "CALABRIA - BASILICATA - PUGLIA", "tipo_dispositivo": "PRO3", "email": "gasvoce@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Giancarlo", "cognome": "Piccinin", "regione": "", "zona_copertura": "", "tipo_dispositivo": "", "email": "giancarlopiccinin@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Giovanni", "cognome": "Fancello", "regione": "SARDEGNA", "zona_copertura": "SARDEGNA", "tipo_dispositivo": "PRO2", "email": "giovannifancello71@yahoo.it", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Giuliano", "cognome": "Iannone", "regione": "CALABRIA", "zona_copertura": "ABRUZZO, MARCHE, MOLISE, EMILIA, UMBRIA", "tipo_dispositivo": "PRO3", "email": "giulianoioannone@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Giuseppe", "cognome": "Maugeri", "regione": "SICILIA", "zona_copertura": "TUTTA LA SICILIA", "tipo_dispositivo": "PRO3", "email": "info@surveyorfreelance.eu", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Greta", "cognome": "Lederer", "regione": "FRIULI VENEZIA GIULIA", "zona_copertura": "FRIULI V.G. - VENEZIA E TREVISO", "tipo_dispositivo": "PRO3", "email": "studiolederer@gmail.com", "carica": "Consigliere", "qualifica": "Socio"},
        {"nome": "Lorena", "cognome": "Amazo Sossa", "regione": "LOMBARDIA", "zona_copertura": "LOMBARDIA", "tipo_dispositivo": "PRO3", "email": "info@studiomaroccolo.it", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Lorenzo", "cognome": "Serrao", "regione": "CALABRIA", "zona_copertura": "CALABRIA", "tipo_dispositivo": "PRO3", "email": "lorenzoserrao1969@libero.it", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Luciano", "cognome": "Tagliente", "regione": "PUGLIA", "zona_copertura": "PUGLIA", "tipo_dispositivo": "PRO3", "email": "geometratagliente@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Luigi", "cognome": "Rosso", "regione": "LOMBARDIA", "zona_copertura": "BERGAMO, PIEMONTE", "tipo_dispositivo": "PRO3", "email": "gigiored@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Marcello", "cognome": "Amorati", "regione": "EMILIA ROMAGNA", "zona_copertura": "EMILIA ROMAGNA", "tipo_dispositivo": "PRO2 - PRO3", "email": "marcelloamorati@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Marco", "cognome": "Montanari", "regione": "MARCHE", "zona_copertura": "MARCHE", "tipo_dispositivo": "PRO2", "email": "marco@marcheconsul.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Marco", "cognome": "Rambaldi", "regione": "EMILIA ROMAGNA", "zona_copertura": "EMILIA ROMAGNA", "tipo_dispositivo": "PRO3", "email": "info@marcorambaldi.it", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Massimo", "cognome": "Cerutti", "regione": "PIEMONTE", "zona_copertura": "Nord Lomb. Nord. Piem. Valdaos", "tipo_dispositivo": "PRO2", "email": "massimo.comtec@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Massimo", "cognome": "Gatti", "regione": "PUGLIA", "zona_copertura": "PUGLIA", "tipo_dispositivo": "PRO2 - PRO3", "email": "massimogatti87@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Melissa Anne", "cognome": "Deep", "regione": "TOSCANA", "zona_copertura": "TOSCANA, LOMBARDIA", "tipo_dispositivo": "PRO2 - PRO3", "email": "melissa@virtique.it", "carica": "Vice Presidente", "qualifica": "Socio Fondatore"},
        {"nome": "Natalino", "cognome": "Cavallaro", "regione": "SICILIA", "zona_copertura": "SICILIA - RAGUSA", "tipo_dispositivo": "", "email": "natcav1968@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Paolo", "cognome": "Moi", "regione": "SARDEGNA", "zona_copertura": "SARDEGNA", "tipo_dispositivo": "PRO2", "email": "studiogeo.moi@gmail.com", "carica": "Socio", "qualifica": "Socio"},
        {"nome": "Pasquale", "cognome": "Mastroianni", "regione": "CALABRIA", "zona_copertura": "CALABRIA - BASILICATA - PUGLIA", "tipo_dispositivo": "PRO2 - PRO3", "email": "visionspacecalabria@gmail.com", "carica": "Presidente", "qualifica": "Socio Fondatore"},
        {"nome": "Pierluca", "cognome": "Fiaschetti", "regione": "LAZIO", "zona_copertura": "LATINA, ROMA, LAZIO", "tipo_dispositivo": "PRO2", "email": "redigit3d@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Roberto", "cognome": "Ismari", "regione": "LIGURIA", "zona_copertura": "LIGURIA (ALCUNE PR DI EMILIA)", "tipo_dispositivo": "PRO3", "email": "studioismari@gmail.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Sebastiano", "cognome": "Ortu", "regione": "ABRUZZO", "zona_copertura": "ABRUZZO, MOLISE, MARCHE, FROSINONE", "tipo_dispositivo": "PRO2 - PRO3", "email": "info@nuvola3d.it", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Simone", "cognome": "Castelli", "regione": "EMILIA ROMAGNA", "zona_copertura": "EMILIA ROMAGNA", "tipo_dispositivo": "PRO3", "email": "s.castelli@fairsgate.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Stefano", "cognome": "Amato", "regione": "LOMBARDIA", "zona_copertura": "LOMBARDIA", "tipo_dispositivo": "PRO2 - PRO3", "email": "stefano.amato@asdigitale360.com", "carica": "Socio", "qualifica": "Socio Fondatore"},
        {"nome": "Salvatore", "cognome": "Rinzo", "regione": "", "zona_copertura": "", "tipo_dispositivo": "", "email": "salvatorerinzo@yahoo.it", "carica": "Socio", "qualifica": "Socio"},
    ]
    
    for socio in soci_data:
        existing = await db.soci.find_one({"email": socio["email"]})
        if not existing:
            socio['id'] = str(uuid.uuid4())
            socio['citta'] = ""
            socio['indirizzo'] = ""
            socio['codice_fiscale'] = ""
            socio['telefono'] = ""
            socio['pec'] = ""
            socio['data_iscrizione'] = ""
            socio['sito_web'] = ""
            socio['documenti'] = []
            socio['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.soci.insert_one(socio)
    
    return {"message": "Dati inizializzati", "soci_count": len(soci_data)}

# Comunicazioni CRUD
@api_router.get("/comunicazioni", response_model=List[Comunicazione])
async def get_comunicazioni():
    comunicazioni = await db.comunicazioni.find({}, {"_id": 0}).sort("data_creazione", -1).to_list(100)
    return [Comunicazione(**c) for c in comunicazioni]

@api_router.get("/comunicazioni/{com_id}", response_model=Comunicazione)
async def get_comunicazione(com_id: str):
    com = await db.comunicazioni.find_one({"id": com_id}, {"_id": 0})
    if not com:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    return Comunicazione(**com)

@api_router.post("/comunicazioni", response_model=Comunicazione)
async def create_comunicazione(com: ComunicazioneCreate):
    # Get destinatari info from soci
    destinatari = []
    for socio_id in com.destinatari_ids:
        socio = await db.soci.find_one({"id": socio_id}, {"_id": 0})
        if socio and socio.get("email"):
            destinatari.append(DestinatarioComunicazione(
                socio_id=socio_id,
                nome=socio.get("nome", ""),
                cognome=socio.get("cognome", ""),
                email=socio.get("email", "")
            ).model_dump())
    
    com_dict = {
        "id": str(uuid.uuid4()),
        "tipo": com.tipo,
        "oggetto": com.oggetto,
        "descrizione": com.descrizione,
        "data_creazione": datetime.now(timezone.utc).isoformat(),
        "data_invio": None,
        "stato": "bozza",
        "destinatari": destinatari,
        "allegati": [],
        "totale_destinatari": len(destinatari),
        "totale_inviati": 0
    }
    
    await db.comunicazioni.insert_one(com_dict)
    return Comunicazione(**com_dict)

@api_router.put("/comunicazioni/{com_id}", response_model=Comunicazione)
async def update_comunicazione(com_id: str, com: ComunicazioneCreate):
    existing = await db.comunicazioni.find_one({"id": com_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    
    # Update destinatari
    destinatari = []
    for socio_id in com.destinatari_ids:
        socio = await db.soci.find_one({"id": socio_id}, {"_id": 0})
        if socio and socio.get("email"):
            destinatari.append(DestinatarioComunicazione(
                socio_id=socio_id,
                nome=socio.get("nome", ""),
                cognome=socio.get("cognome", ""),
                email=socio.get("email", "")
            ).model_dump())
    
    update_data = {
        "tipo": com.tipo,
        "oggetto": com.oggetto,
        "descrizione": com.descrizione,
        "destinatari": destinatari,
        "totale_destinatari": len(destinatari)
    }
    
    await db.comunicazioni.update_one({"id": com_id}, {"$set": update_data})
    updated = await db.comunicazioni.find_one({"id": com_id}, {"_id": 0})
    return Comunicazione(**updated)

@api_router.delete("/comunicazioni/{com_id}")
async def delete_comunicazione(com_id: str):
    from bson import ObjectId
    com = await db.comunicazioni.find_one({"id": com_id})
    if not com:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    
    # Delete attachments from GridFS
    for allegato in com.get("allegati", []):
        try:
            await fs.delete(ObjectId(allegato["file_id"]))
        except:
            pass
    
    await db.comunicazioni.delete_one({"id": com_id})
    return {"message": "Comunicazione eliminata"}

# Upload allegato comunicazione
@api_router.post("/comunicazioni/{com_id}/allegati")
async def upload_allegato_comunicazione(
    com_id: str,
    file: UploadFile = File(...)
):
    com = await db.comunicazioni.find_one({"id": com_id})
    if not com:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    
    if file.size and file.size > 6 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File troppo grande (max 6MB)")
    
    content = await file.read()
    file_id = await fs.upload_from_stream(
        file.filename,
        io.BytesIO(content),
        metadata={"content_type": file.content_type, "comunicazione_id": com_id}
    )
    
    allegato = AllegatoComunicazione(
        filename=file.filename,
        file_id=str(file_id),
        content_type=file.content_type or "application/octet-stream",
        size=len(content)
    )
    
    await db.comunicazioni.update_one(
        {"id": com_id},
        {"$push": {"allegati": allegato.model_dump()}}
    )
    
    return allegato

@api_router.delete("/comunicazioni/{com_id}/allegati/{allegato_id}")
async def delete_allegato_comunicazione(com_id: str, allegato_id: str):
    from bson import ObjectId
    com = await db.comunicazioni.find_one({"id": com_id})
    if not com:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    
    allegato_to_delete = None
    for allegato in com.get("allegati", []):
        if allegato["id"] == allegato_id:
            allegato_to_delete = allegato
            break
    
    if allegato_to_delete:
        try:
            await fs.delete(ObjectId(allegato_to_delete["file_id"]))
        except:
            pass
        await db.comunicazioni.update_one(
            {"id": com_id},
            {"$pull": {"allegati": {"id": allegato_id}}}
        )
    
    return {"message": "Allegato eliminato"}

# Send email function
def send_email_smtp(to_email: str, subject: str, body: str, attachments: list = None):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        # Add attachments if any
        if attachments:
            for att in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(att['content'])
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename={att["filename"]}')
                msg.attach(part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        return True, None
    except Exception as e:
        return False, str(e)

# Send comunicazione
@api_router.post("/comunicazioni/{com_id}/invia")
async def invia_comunicazione(com_id: str, background_tasks: BackgroundTasks):
    from bson import ObjectId
    
    com = await db.comunicazioni.find_one({"id": com_id})
    if not com:
        raise HTTPException(status_code=404, detail="Comunicazione non trovata")
    
    if com.get("stato") == "inviata":
        raise HTTPException(status_code=400, detail="Comunicazione già inviata")
    
    # Update stato to in_invio
    await db.comunicazioni.update_one(
        {"id": com_id},
        {"$set": {"stato": "in_invio"}}
    )
    
    # Get attachments content
    attachments = []
    for allegato in com.get("allegati", []):
        try:
            grid_out = await fs.open_download_stream(ObjectId(allegato["file_id"]))
            content = await grid_out.read()
            attachments.append({
                "filename": allegato["filename"],
                "content": content
            })
        except:
            pass
    
    # Prepare email body
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1E90FF;">Associazione Digital Twins Italia</h2>
        <h3>{com.get('oggetto', '')}</h3>
        <div style="white-space: pre-wrap;">{com.get('descrizione', '')}</div>
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
            Questa comunicazione è stata inviata dall'Associazione Digital Twins Italia.<br>
            Per info: associazionedigitaltwinsitalia@gmail.com
        </p>
    </body>
    </html>
    """
    
    # Send to each destinatario
    totale_inviati = 0
    destinatari_updated = []
    
    for dest in com.get("destinatari", []):
        success, error = send_email_smtp(
            dest["email"],
            com.get("oggetto", "Comunicazione DTI"),
            body,
            attachments
        )
        
        dest_update = {
            **dest,
            "inviato": success,
            "data_invio": datetime.now(timezone.utc).isoformat() if success else None,
            "errore": error
        }
        destinatari_updated.append(dest_update)
        
        if success:
            totale_inviati += 1
    
    # Update comunicazione
    final_stato = "inviata" if totale_inviati > 0 else "errore"
    await db.comunicazioni.update_one(
        {"id": com_id},
        {"$set": {
            "stato": final_stato,
            "data_invio": datetime.now(timezone.utc).isoformat(),
            "destinatari": destinatari_updated,
            "totale_inviati": totale_inviati
        }}
    )
    
    return {
        "message": f"Invio completato: {totale_inviati}/{len(destinatari_updated)} email inviate",
        "totale_inviati": totale_inviati,
        "totale_destinatari": len(destinatari_updated)
    }

# Get tipi comunicazione
@api_router.get("/comunicazioni-tipi")
async def get_tipi_comunicazione():
    return [
        {"value": "circolare", "label": "Circolare"},
        {"value": "convocazione", "label": "Convocazione Assemblea"},
        {"value": "newsletter", "label": "Newsletter"},
        {"value": "avviso", "label": "Avviso"},
        {"value": "promemoria", "label": "Promemoria"},
        {"value": "altro", "label": "Altro"}
    ]

@api_router.get("/")
async def root():
    return {"message": "Digital Twins Italia API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
