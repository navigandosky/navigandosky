"""
Routes per configurazione sito - Dati aziendali dinamici
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db
from auth import verify_admin_credentials

router = APIRouter(prefix="/site-config", tags=["Site Config"])

# =============================================================================
# MODELS
# =============================================================================

class SiteConfigUpdate(BaseModel):
    # Dati Azienda
    nome_azienda: Optional[str] = None
    ragione_sociale: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    slogan: Optional[str] = None
    descrizione: Optional[str] = None
    logo_url: Optional[str] = None
    
    # Contatti
    email: Optional[str] = None
    email_pec: Optional[str] = None
    telefono_1: Optional[str] = None
    telefono_2: Optional[str] = None
    whatsapp: Optional[str] = None
    
    # Sede
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    cap: Optional[str] = None
    paese: Optional[str] = None
    
    # Social
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    
    # Links
    link_progetti: Optional[List[dict]] = None  # [{nome, url}]

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("")
async def get_site_config():
    """Get site configuration (public)"""
    config = await db.site_config.find_one({"id": "main"}, {"_id": 0})
    
    if not config:
        # Return defaults
        return {
            "id": "main",
            "nome_azienda": "Trivor",
            "ragione_sociale": "Trivor SRL",
            "partita_iva": "IT 03774710929",
            "slogan": "Heritage Digitale e Innovazione per la Sardegna",
            "descrizione": "Partner per l'innovazione digitale",
            "logo_url": "https://customer-assets.emergentagent.com/job_9ae566ba-cbe1-4f57-8e5e-483d01cf8ff3/artifacts/p9qzdaz3_TRIVOR_Logo_Oro_Trasparente.png",
            "email": "trivorsrl@gmail.com",
            "email_pec": "trivor@pec.it",
            "telefono_1": "+39 393 92 55 552",
            "telefono_2": "+39 320 808 38 39",
            "whatsapp": "+393939255552",
            "indirizzo": "",
            "citta": "",
            "provincia": "",
            "cap": "",
            "paese": "Italia",
            "facebook_url": "",
            "instagram_url": "",
            "linkedin_url": "",
            "twitter_url": "",
            "youtube_url": "",
            "link_progetti": [
                {"nome": "Spoke Ghivine", "url": "https://www.trivor.it/spokeghivine"},
                {"nome": "Spoke Galaveras", "url": "https://www.trivor.it/spokegalaveras"}
            ]
        }
    
    return config

@router.put("")
async def update_site_config(config: SiteConfigUpdate, username: str = Depends(verify_admin_credentials)):
    """Update site configuration (admin only)"""
    update_data = {k: v for k, v in config.model_dump().items() if v is not None}
    update_data["id"] = "main"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.site_config.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.site_config.find_one({"id": "main"}, {"_id": 0})
    return updated

@router.post("/init")
async def init_site_config(username: str = Depends(verify_admin_credentials)):
    """Initialize site config with defaults"""
    existing = await db.site_config.find_one({"id": "main"})
    if existing:
        return {"message": "Config già esistente"}
    
    default_config = {
        "id": "main",
        "nome_azienda": "Trivor",
        "ragione_sociale": "Trivor SRL",
        "partita_iva": "IT 03774710929",
        "slogan": "Heritage Digitale e Innovazione per la Sardegna",
        "descrizione": "Partner per l'innovazione digitale",
        "logo_url": "https://customer-assets.emergentagent.com/job_9ae566ba-cbe1-4f57-8e5e-483d01cf8ff3/artifacts/p9qzdaz3_TRIVOR_Logo_Oro_Trasparente.png",
        "email": "trivorsrl@gmail.com",
        "email_pec": "trivor@pec.it",
        "telefono_1": "+39 393 92 55 552",
        "telefono_2": "+39 320 808 38 39",
        "whatsapp": "+393939255552",
        "indirizzo": "",
        "citta": "",
        "provincia": "",
        "cap": "",
        "paese": "Italia",
        "facebook_url": "",
        "instagram_url": "",
        "linkedin_url": "",
        "twitter_url": "",
        "youtube_url": "",
        "link_progetti": [
            {"nome": "Spoke Ghivine", "url": "https://www.trivor.it/spokeghivine"},
            {"nome": "Spoke Galaveras", "url": "https://www.trivor.it/spokegalaveras"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.site_config.insert_one(default_config)
    return {"message": "Config inizializzata"}
