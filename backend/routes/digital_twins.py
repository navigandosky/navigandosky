"""
Routes per Digital Twin - Gestione tour virtuali
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db
from auth import verify_admin_credentials

router = APIRouter(prefix="/digital-twins", tags=["Digital Twin"])

# =============================================================================
# MODELS (mantenuti come erano)
# =============================================================================

class DigitalTwinCreate(BaseModel):
    nome: str
    nome_en: str = ""
    nome_fr: str = ""
    nome_de: str = ""
    descrizione: str = ""
    descrizione_en: str = ""
    descrizione_fr: str = ""
    descrizione_de: str = ""
    matterport_id: str = ""
    mpskin_url: str = ""
    immagine_copertina: str = ""
    attivo: bool = True
    ordine: int = 0

class DigitalTwinUpdate(BaseModel):
    nome: Optional[str] = None
    nome_en: Optional[str] = None
    nome_fr: Optional[str] = None
    nome_de: Optional[str] = None
    descrizione: Optional[str] = None
    descrizione_en: Optional[str] = None
    descrizione_fr: Optional[str] = None
    descrizione_de: Optional[str] = None
    matterport_id: Optional[str] = None
    mpskin_url: Optional[str] = None
    immagine_copertina: Optional[str] = None
    attivo: Optional[bool] = None
    ordine: Optional[int] = None

# =============================================================================
# HELPERS
# =============================================================================

async def generate_twin_id():
    count = await db.digital_twins.count_documents({})
    return f"DT-{str(count + 1).zfill(4)}"

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("")
async def get_digital_twins(attivo: Optional[bool] = None):
    """Get all digital twins (public)"""
    query = {}
    if attivo is not None:
        query["attivo"] = attivo
    twins = await db.digital_twins.find(query, {"_id": 0}).sort("ordine", 1).to_list(100)
    return twins

@router.get("/all")
async def get_all_twins(username: str = Depends(verify_admin_credentials)):
    """Get all digital twins (admin)"""
    twins = await db.digital_twins.find({}, {"_id": 0}).sort("ordine", 1).to_list(100)
    return twins

@router.get("/{twin_id}")
async def get_digital_twin(twin_id: str):
    """Get a single digital twin"""
    twin = await db.digital_twins.find_one({"id": twin_id}, {"_id": 0})
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trovato")
    return twin

@router.post("")
async def create_digital_twin(twin: DigitalTwinCreate, username: str = Depends(verify_admin_credentials)):
    """Create a new digital twin (admin only)"""
    twin_id = await generate_twin_id()
    twin_dict = twin.model_dump()
    twin_dict["id"] = twin_id
    twin_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    twin_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.digital_twins.insert_one(twin_dict)
    return {k: v for k, v in twin_dict.items() if k != "_id"}

@router.put("/{twin_id}")
async def update_digital_twin(twin_id: str, twin: DigitalTwinUpdate, username: str = Depends(verify_admin_credentials)):
    """Update a digital twin (admin only)"""
    update_data = {k: v for k, v in twin.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.digital_twins.update_one(
        {"id": twin_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Digital Twin non trovato")
    
    updated = await db.digital_twins.find_one({"id": twin_id}, {"_id": 0})
    return updated

@router.delete("/{twin_id}")
async def delete_digital_twin(twin_id: str, username: str = Depends(verify_admin_credentials)):
    """Delete a digital twin (admin only)"""
    result = await db.digital_twins.delete_one({"id": twin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Digital Twin non trovato")
    return {"message": "Digital Twin eliminato"}
