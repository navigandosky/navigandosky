"""
Routes per TrivorWEB - Gestione siti web e hosting
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db, TRIVORDOC_DELETE_PASSWORD
from auth import verify_trivordoc_credentials
from models import SitoWebCreate, SitoWebUpdate, DeleteRequest

router = APIRouter(prefix="/trivorweb", tags=["TrivorWEB"])

# =============================================================================
# HELPERS
# =============================================================================

async def generate_site_id():
    year = datetime.now().year
    count = await db.trivorweb_sites.count_documents({})
    return f"SITE-{year}-{str(count + 1).zfill(4)}"

# =============================================================================
# SITES CRUD
# =============================================================================

@router.get("/sites")
async def get_sites(
    search: Optional[str] = None,
    stato: Optional[str] = None,
    provider: Optional[str] = None,
    scadenza_entro_giorni: Optional[int] = None,
    username: str = Depends(verify_trivordoc_credentials)
):
    """Get all sites with filtering"""
    query = {}
    
    if search:
        query["$or"] = [
            {"nome_progetto": {"$regex": search, "$options": "i"}},
            {"dominio": {"$regex": search, "$options": "i"}},
            {"cliente.nome": {"$regex": search, "$options": "i"}},
            {"cliente.azienda": {"$regex": search, "$options": "i"}},
            {"hosting.provider": {"$regex": search, "$options": "i"}},
        ]
    
    if stato and stato != "all":
        query["stato"] = stato
    
    if provider:
        query["hosting.provider"] = {"$regex": provider, "$options": "i"}
    
    sites = await db.trivorweb_sites.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    if scadenza_entro_giorni:
        oggi = datetime.now(timezone.utc).date()
        limite = oggi + timedelta(days=scadenza_entro_giorni)
        filtered = []
        for site in sites:
            if site.get("hosting", {}).get("data_scadenza"):
                try:
                    scadenza = datetime.fromisoformat(site["hosting"]["data_scadenza"]).date()
                    if scadenza <= limite:
                        filtered.append(site)
                except:
                    pass
        sites = filtered
    
    return sites

@router.get("/sites/{site_id}")
async def get_site(site_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get single site by ID"""
    site = await db.trivorweb_sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Sito non trovato")
    return site

@router.post("/sites")
async def create_site(sito: SitoWebCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create a new site"""
    site_id = await generate_site_id()
    
    site_data = {
        "id": site_id,
        **sito.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivorweb_sites.insert_one(site_data)
    
    await db.trivorweb_logs.insert_one({
        "action": "CREATE",
        "site_id": site_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Sito {site_id} ({sito.dominio}) creato"
    })
    
    return {"id": site_id, "message": "Sito creato con successo"}

@router.put("/sites/{site_id}")
async def update_site(site_id: str, sito: SitoWebUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update a site"""
    update_data = {k: v for k, v in sito.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivorweb_sites.update_one(
        {"id": site_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sito non trovato")
    
    await db.trivorweb_logs.insert_one({
        "action": "UPDATE",
        "site_id": site_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Sito {site_id} aggiornato"
    })
    
    updated = await db.trivorweb_sites.find_one({"id": site_id}, {"_id": 0})
    return updated

@router.delete("/sites/{site_id}")
async def delete_site(site_id: str, request: DeleteRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Delete a site (requires deletion password)"""
    if request.password != TRIVORDOC_DELETE_PASSWORD:
        raise HTTPException(status_code=403, detail="Password di eliminazione non corretta")
    
    site = await db.trivorweb_sites.find_one({"id": site_id})
    if not site:
        raise HTTPException(status_code=404, detail="Sito non trovato")
    
    await db.trivorweb_sites.delete_one({"id": site_id})
    
    await db.trivorweb_logs.insert_one({
        "action": "DELETE",
        "site_id": site_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Sito {site_id} eliminato"
    })
    
    return {"message": "Sito eliminato con successo"}

# =============================================================================
# STATISTICS
# =============================================================================

@router.get("/stats")
async def get_trivorweb_stats(username: str = Depends(verify_trivordoc_credentials)):
    """Get dashboard statistics for TrivorWEB"""
    total_sites = await db.trivorweb_sites.count_documents({})
    
    pipeline_status = [
        {"$group": {"_id": "$stato", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_status = await db.trivorweb_sites.aggregate(pipeline_status).to_list(10)
    
    pipeline_provider = [
        {"$group": {"_id": "$hosting.provider", "count": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_provider = await db.trivorweb_sites.aggregate(pipeline_provider).to_list(10)
    
    oggi = datetime.now(timezone.utc)
    limite_30 = (oggi + timedelta(days=30)).isoformat()[:10]
    expiring_soon = []
    
    sites = await db.trivorweb_sites.find({}, {"_id": 0}).to_list(500)
    for site in sites:
        scadenza = site.get("hosting", {}).get("data_scadenza")
        if scadenza and scadenza <= limite_30 and scadenza >= oggi.isoformat()[:10]:
            expiring_soon.append({
                "id": site["id"],
                "nome_progetto": site["nome_progetto"],
                "dominio": site["dominio"],
                "data_scadenza": scadenza,
                "provider": site.get("hosting", {}).get("provider", "N/A")
            })
    
    expired = []
    for site in sites:
        scadenza = site.get("hosting", {}).get("data_scadenza")
        if scadenza and scadenza < oggi.isoformat()[:10]:
            expired.append({
                "id": site["id"],
                "nome_progetto": site["nome_progetto"],
                "dominio": site["dominio"],
                "data_scadenza": scadenza
            })
    
    total_hosting_cost = sum(
        site.get("hosting", {}).get("costo_annuale", 0) or 0 
        for site in sites
    )
    total_maintenance_cost = sum(
        site.get("costo_manutenzione_annuale", 0) or 0 
        for site in sites
    )
    
    recent = await db.trivorweb_sites.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_sites": total_sites,
        "by_status": by_status,
        "by_provider": by_provider,
        "expiring_soon": sorted(expiring_soon, key=lambda x: x["data_scadenza"]),
        "expired": expired,
        "total_hosting_cost": total_hosting_cost,
        "total_maintenance_cost": total_maintenance_cost,
        "recent_sites": recent
    }

# =============================================================================
# HELPERS
# =============================================================================

@router.get("/providers")
async def get_providers(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique hosting providers"""
    pipeline = [
        {"$group": {"_id": "$hosting.provider"}},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$sort": {"_id": 1}}
    ]
    providers = await db.trivorweb_sites.aggregate(pipeline).to_list(50)
    return [p["_id"] for p in providers]

@router.get("/technologies")
async def get_technologies(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique technologies"""
    pipeline = [
        {"$unwind": "$tecnologie"},
        {"$group": {"_id": "$tecnologie"}},
        {"$sort": {"_id": 1}}
    ]
    techs = await db.trivorweb_sites.aggregate(pipeline).to_list(100)
    return [t["_id"] for t in techs]

@router.get("/logs")
async def get_trivorweb_logs(limit: int = 50, username: str = Depends(verify_trivordoc_credentials)):
    """Get recent activity logs"""
    logs = await db.trivorweb_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs
