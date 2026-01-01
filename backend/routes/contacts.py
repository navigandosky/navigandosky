"""
Routes per TrivorContacts - Gestione contatti condivisi
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional, List

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db
from auth import verify_trivordoc_credentials
from models import ContactCreate, ContactUpdate, GroupCreate, GroupUpdate

router = APIRouter(prefix="/contacts", tags=["TrivorContacts"])

# =============================================================================
# HELPERS
# =============================================================================

async def generate_contact_id():
    count = await db.trivor_contacts.count_documents({})
    return f"CONT-{str(count + 1).zfill(5)}"

async def generate_group_id():
    count = await db.trivor_groups.count_documents({})
    return f"GRP-{str(count + 1).zfill(4)}"

# =============================================================================
# CONTACTS CRUD
# =============================================================================

@router.get("")
async def get_contacts(
    search: Optional[str] = None,
    gruppo: Optional[str] = None,
    preferiti: Optional[bool] = None,
    limit: int = 500,
    username: str = Depends(verify_trivordoc_credentials)
):
    """Get all contacts with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cognome": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"telefono": {"$regex": search, "$options": "i"}},
            {"whatsapp": {"$regex": search, "$options": "i"}},
            {"azienda": {"$regex": search, "$options": "i"}},
        ]
    
    if gruppo:
        query["gruppi"] = gruppo
    
    if preferiti:
        query["preferito"] = True
    
    contacts = await db.trivor_contacts.find(query, {"_id": 0}).sort([("preferito", -1), ("nome", 1)]).limit(limit).to_list(limit)
    return contacts

@router.get("/{contact_id}")
async def get_contact(contact_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get single contact"""
    contact = await db.trivor_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contatto non trovato")
    return contact

@router.post("")
async def create_contact(contact: ContactCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create new contact"""
    contact_id = await generate_contact_id()
    
    colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"]
    avatar_color = contact.avatar_color or colors[hash(contact.nome) % len(colors)]
    
    contact_data = {
        "id": contact_id,
        **contact.model_dump(),
        "avatar_color": avatar_color,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivor_contacts.insert_one(contact_data)
    return {"id": contact_id, "message": "Contatto creato con successo"}

@router.put("/{contact_id}")
async def update_contact(contact_id: str, contact: ContactUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update contact"""
    update_data = {k: v for k, v in contact.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivor_contacts.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contatto non trovato")
    
    updated = await db.trivor_contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete contact"""
    result = await db.trivor_contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contatto non trovato")
    return {"message": "Contatto eliminato"}

@router.post("/{contact_id}/toggle-preferito")
async def toggle_preferito(contact_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Toggle contact as favorite"""
    contact = await db.trivor_contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contatto non trovato")
    
    new_value = not contact.get("preferito", False)
    await db.trivor_contacts.update_one(
        {"id": contact_id},
        {"$set": {"preferito": new_value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"preferito": new_value}

# =============================================================================
# GROUPS
# =============================================================================

@router.get("/groups/list")
async def get_groups(username: str = Depends(verify_trivordoc_credentials)):
    """Get all groups"""
    groups = await db.trivor_groups.find({}, {"_id": 0}).sort("nome", 1).to_list(100)
    return groups

@router.post("/groups")
async def create_group(group: GroupCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create new group"""
    group_id = await generate_group_id()
    
    group_data = {
        "id": group_id,
        **group.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivor_groups.insert_one(group_data)
    return {"id": group_id, "message": "Gruppo creato con successo"}

@router.put("/groups/{group_id}")
async def update_group(group_id: str, group: GroupUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update group"""
    update_data = {k: v for k, v in group.model_dump().items() if v is not None}
    
    result = await db.trivor_groups.update_one(
        {"id": group_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gruppo non trovato")
    
    updated = await db.trivor_groups.find_one({"id": group_id}, {"_id": 0})
    return updated

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete group and remove from all contacts"""
    result = await db.trivor_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gruppo non trovato")
    
    await db.trivor_contacts.update_many(
        {"gruppi": group_id},
        {"$pull": {"gruppi": group_id}}
    )
    
    return {"message": "Gruppo eliminato"}
