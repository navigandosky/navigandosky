"""
Routes per gestione utenti TrivorAccount
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import hashlib
import secrets

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db
from auth import verify_admin_credentials

router = APIRouter(prefix="/account-users", tags=["Account Users"])

# =============================================================================
# MODELS
# =============================================================================

class AccountUserCreate(BaseModel):
    username: str
    password: str
    nome: str = ""
    email: str = ""
    attivo: bool = True

class AccountUserUpdate(BaseModel):
    password: Optional[str] = None
    nome: Optional[str] = None
    email: Optional[str] = None
    attivo: Optional[bool] = None

class AccountUserLogin(BaseModel):
    username: str
    password: str

# =============================================================================
# HELPERS
# =============================================================================

def hash_password(password: str) -> str:
    """Hash password with SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

# =============================================================================
# ADMIN ENDPOINTS (gestione utenti)
# =============================================================================

@router.get("/users")
async def get_users(admin: str = Depends(verify_admin_credentials)):
    """Get all TrivorAccount users (admin only)"""
    users = await db.trivor_account_users.find({}, {"_id": 0, "password_hash": 0}).sort("username", 1).to_list(100)
    return users

@router.post("/users")
async def create_user(user: AccountUserCreate, admin: str = Depends(verify_admin_credentials)):
    """Create new TrivorAccount user (admin only)"""
    # Check if username exists
    existing = await db.trivor_account_users.find_one({"username": user.username.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Username già esistente")
    
    user_id = f"ACCU-{secrets.token_hex(4).upper()}"
    user_data = {
        "id": user_id,
        "username": user.username.lower(),
        "password_hash": hash_password(user.password),
        "nome": user.nome,
        "email": user.email,
        "attivo": user.attivo,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None
    }
    
    await db.trivor_account_users.insert_one(user_data)
    return {"id": user_id, "message": f"Utente {user.username} creato con successo"}

@router.put("/users/{user_id}")
async def update_user(user_id: str, user: AccountUserUpdate, admin: str = Depends(verify_admin_credentials)):
    """Update TrivorAccount user (admin only)"""
    update_data = {}
    
    if user.password is not None:
        update_data["password_hash"] = hash_password(user.password)
    if user.nome is not None:
        update_data["nome"] = user.nome
    if user.email is not None:
        update_data["email"] = user.email
    if user.attivo is not None:
        update_data["attivo"] = user.attivo
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    result = await db.trivor_account_users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return {"message": "Utente aggiornato"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: str = Depends(verify_admin_credentials)):
    """Delete TrivorAccount user and their accounts (admin only)"""
    # Delete user
    result = await db.trivor_account_users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Delete user's accounts
    await db.trivor_accounts.delete_many({"user_id": user_id})
    
    return {"message": "Utente e relativi account eliminati"}

# =============================================================================
# LOGIN ENDPOINT
# =============================================================================

@router.post("/login")
async def login_account_user(credentials: AccountUserLogin):
    """Login for TrivorAccount users"""
    user = await db.trivor_account_users.find_one(
        {"username": credentials.username.lower()},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    if not user.get("attivo", True):
        raise HTTPException(status_code=401, detail="Utente disattivato")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Update last login
    await db.trivor_account_users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "user_id": user["id"],
        "username": user["username"],
        "nome": user.get("nome", ""),
        "message": "Login effettuato"
    }

@router.get("/me")
async def get_current_user(user_id: str):
    """Get current user info"""
    user = await db.trivor_account_users.find_one(
        {"id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return user
