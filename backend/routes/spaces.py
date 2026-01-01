"""
Routes per Digital Twin / Spaces - Gestione tour virtuali
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db
from auth import verify_admin_credentials
from models import SpaceCreate, SpaceUpdate

router = APIRouter(prefix="/spaces", tags=["Digital Twin"])

# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get("")
async def get_public_spaces():
    """Get all public spaces for homepage"""
    spaces = await db.trivor_spaces.find(
        {"is_public": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return spaces

@router.get("/all")
async def get_all_spaces(username: str = Depends(verify_admin_credentials)):
    """Get all spaces (admin)"""
    spaces = await db.trivor_spaces.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return spaces

@router.get("/{space_id}")
async def get_space(space_id: str):
    """Get single space by ID"""
    space = await db.trivor_spaces.find_one({"id": space_id}, {"_id": 0})
    if not space:
        raise HTTPException(status_code=404, detail="Space non trovato")
    return space

# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.post("")
async def create_space(space: SpaceCreate, username: str = Depends(verify_admin_credentials)):
    """Create a new space (admin only)"""
    space_id = str(uuid.uuid4())
    
    space_data = {
        "id": space_id,
        **space.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivor_spaces.insert_one(space_data)
    return {"id": space_id, "message": "Space creato con successo"}

@router.put("/{space_id}")
async def update_space(space_id: str, space: SpaceUpdate, username: str = Depends(verify_admin_credentials)):
    """Update a space (admin only)"""
    update_data = {k: v for k, v in space.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivor_spaces.update_one(
        {"id": space_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Space non trovato")
    
    updated = await db.trivor_spaces.find_one({"id": space_id}, {"_id": 0})
    return updated

@router.delete("/{space_id}")
async def delete_space(space_id: str, username: str = Depends(verify_admin_credentials)):
    """Delete a space (admin only)"""
    result = await db.trivor_spaces.delete_one({"id": space_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Space non trovato")
    return {"deleted": True, "id": space_id}
