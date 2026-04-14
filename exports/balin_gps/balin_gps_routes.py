"""
SmartDomo - Balin GPS Routes
Estratto da server.py per uso standalone o integrazione in altro progetto.

Endpoint:
  GET /api/balin/status              - Stato connessione Balin GPS
  GET /api/balin/devices             - Lista veicoli/dispositivi GPS
  GET /api/balin/device/{imei}       - Dettaglio singolo dispositivo
  GET /api/balin/device/{imei}/history - Storico posizioni (max 1 giorno, 30gg indietro)
  GET /api/balin/device/{imei}/trips   - Storico viaggi (max 90 giorni)

Dipendenze esterne:
  - httpx (async HTTP client)
  - fastapi
  - motor (MongoDB async driver)
  - pydantic

Configurazione DB richiesta:
  - Collection: property_config
  - Campo: integrations.balin.enabled, integrations.balin.email, integrations.balin.api_token
"""

import base64
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("smartdomo.balin")

# ============================================================
# MODELLO DATI
# ============================================================

class BalinConfig(BaseModel):
    """Configurazione Balin GPS Tracker"""
    enabled: bool = False
    email: Optional[str] = None
    api_token: Optional[str] = None


# ============================================================
# COSTANTI
# ============================================================

BALIN_API_BASE = "https://api.balin.app/external_api/v1"


# ============================================================
# FUNZIONI HELPER
# ============================================================

async def get_balin_credentials(db, user_id: str = None) -> Optional[Dict[str, str]]:
    """
    Get Balin credentials from property config with priority:
    1. From property_config for specific user (if user_id provided)
    2. From any active property_config (excluding default-user which may have old/no config)
    3. From any active property_config as fallback
    
    Args:
        db: Motor database instance
        user_id: Optional user ID to filter by
    
    Returns:
        Dict with 'email' and 'api_token' or None
    """
    try:
        # First try to get for specific user
        if user_id:
            prop = await db.property_config.find_one(
                {"user_id": user_id, "is_active": True}, 
                {"_id": 0, "integrations.balin": 1}
            )
            if prop and prop.get("integrations", {}).get("balin", {}).get("enabled"):
                balin_config = prop["integrations"]["balin"]
                email = balin_config.get("email")
                api_token = balin_config.get("api_token")
                if email and api_token and len(api_token) > 5:
                    return {"email": email, "api_token": api_token}
        
        # Then try any active property (excluding default-user)
        prop = await db.property_config.find_one(
            {"is_active": True, "user_id": {"$ne": "default-user"}, "integrations.balin.enabled": True}, 
            {"_id": 0, "integrations.balin": 1}
        )
        if prop:
            balin_config = prop.get("integrations", {}).get("balin", {})
            email = balin_config.get("email")
            api_token = balin_config.get("api_token")
            if email and api_token and len(api_token) > 5:
                return {"email": email, "api_token": api_token}
        
        # Fallback to any active property with balin enabled
        prop = await db.property_config.find_one(
            {"is_active": True, "integrations.balin.enabled": True}, 
            {"_id": 0, "integrations.balin": 1}
        )
        if prop:
            balin_config = prop.get("integrations", {}).get("balin", {})
            email = balin_config.get("email")
            api_token = balin_config.get("api_token")
            if email and api_token and len(api_token) > 5:
                return {"email": email, "api_token": api_token}
                
    except Exception as e:
        logger.debug(f"Could not get Balin credentials from DB: {e}")
    
    return None


async def balin_api_request(db, path: str, method: str = "GET", user_id: str = None, params: Dict = None) -> Dict:
    """
    Make authenticated request to Balin API.
    
    Args:
        db: Motor database instance
        path: API path (e.g. "/devices")
        method: HTTP method (GET, POST, DELETE)
        user_id: User ID for credential lookup
        params: Query params (GET) or JSON body (POST)
    
    Returns:
        JSON response as dict
    
    Raises:
        HTTPException on auth/rate-limit/server errors
    """
    creds = await get_balin_credentials(db, user_id)
    if not creds:
        raise HTTPException(status_code=400, detail="Balin GPS non configurato. Configura email e API token in Setup -> Integrazioni")
    
    auth_string = f"{creds['email']}:{creds['api_token']}"
    auth_bytes = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
    
    headers = {
        "Authorization": f"Basic {auth_bytes}",
        "Content-Type": "application/json"
    }
    
    url = f"{BALIN_API_BASE}{path}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=headers, params=params)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=params)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            raise HTTPException(status_code=400, detail=f"Metodo HTTP non supportato: {method}")
        
        if response.status_code == 401:
            error_data = response.json() if response.text else {}
            error_type = error_data.get("type", 0)
            error_messages = {
                1: "Autenticazione errata. Verifica email e API token.",
                2: "Nessun utente trovato con questa email su Balin.",
                3: "Servizio API non abilitato. Attivalo dal portale Balin.",
                4: "Account non appartenente a Balin.",
                5: "Pagamento in sospeso sull'account Balin."
            }
            detail = error_messages.get(error_type, "Errore autenticazione Balin")
            raise HTTPException(status_code=401, detail=detail)
        
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Limite API Balin superato. Riprova tra poco.")
        
        if response.status_code >= 400:
            error_data = response.json() if response.text else {}
            raise HTTPException(status_code=response.status_code, detail=error_data.get("description", "Errore API Balin"))
        
        return response.json()


def _enrich_device(device: dict) -> dict:
    """Arricchisce i dati di un dispositivo Balin con campi formattati."""
    last_position_ts = device.get("timestamp_position")
    last_trip_change_ts = device.get("timestamp_last_trip_change")
    
    enriched = {
        **device,
        "last_position_formatted": None,
        "last_trip_change_formatted": None,
        "status_text": "In movimento" if device.get("moving") else "Fermo",
        "connection_status": "Online" if device.get("is_connected") else "Offline",
        "power_status": "Alimentato" if device.get("is_power_on") else "Non alimentato",
        "gps_status": "GPS OK" if device.get("has_GPS") else "No GPS"
    }
    
    if last_position_ts:
        try:
            dt = datetime.fromtimestamp(last_position_ts / 1000, tz=timezone.utc)
            enriched["last_position_formatted"] = dt.strftime("%d/%m/%Y %H:%M:%S")
        except Exception:
            pass
    
    if last_trip_change_ts:
        try:
            dt = datetime.fromtimestamp(last_trip_change_ts / 1000, tz=timezone.utc)
            enriched["last_trip_change_formatted"] = dt.strftime("%d/%m/%Y %H:%M:%S")
        except Exception:
            pass
    
    return enriched


# ============================================================
# FACTORY: Crea il router con le dipendenze iniettate
# ============================================================

def create_balin_router(db, get_user_from_token) -> APIRouter:
    """
    Crea un APIRouter FastAPI con tutti gli endpoint Balin GPS.
    
    Args:
        db: Motor database instance (es. motor_client["smartdomo"])
        get_user_from_token: Async function(token: str) -> dict con almeno {"id": "..."}
    
    Returns:
        APIRouter da includere nell'app FastAPI
    
    Esempio di utilizzo:
        from balin_gps_routes import create_balin_router
        
        balin_router = create_balin_router(db, get_user_from_token)
        app.include_router(balin_router, prefix="/api")
    """
    router = APIRouter(prefix="/balin", tags=["Balin GPS"])

    @router.get("/status")
    async def balin_status(token: Optional[str] = None):
        """Check Balin GPS connection status"""
        user = await get_user_from_token(token)
        creds = await get_balin_credentials(db, user["id"])
        
        if not creds:
            return {
                "connected": False,
                "message": "Non configurato",
                "email": None
            }
        
        try:
            devices = await balin_api_request(db, "/devices", user_id=user["id"])
            return {
                "connected": True,
                "message": f"Connesso - {len(devices)} veicoli",
                "email": creds["email"],
                "device_count": len(devices)
            }
        except HTTPException as e:
            return {
                "connected": False,
                "message": e.detail,
                "email": creds["email"]
            }
        except Exception as e:
            return {
                "connected": False,
                "message": str(e),
                "email": creds["email"]
            }

    @router.get("/devices")
    async def get_balin_devices(token: Optional[str] = None):
        """
        Get all GPS devices/vehicles from Balin.
        Returns list of devices with current position and status.
        """
        user = await get_user_from_token(token)
        
        try:
            devices = await balin_api_request(db, "/devices", user_id=user["id"])
            enriched_devices = [_enrich_device(d) for d in devices]
            
            return {
                "devices": enriched_devices,
                "count": len(enriched_devices)
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Balin devices: {e}")
            raise HTTPException(status_code=500, detail=f"Errore recupero veicoli: {str(e)}")

    @router.get("/device/{imei}")
    async def get_balin_device(imei: str, token: Optional[str] = None):
        """Get single GPS device details by IMEI."""
        user = await get_user_from_token(token)
        
        try:
            device = await balin_api_request(db, f"/device/{imei}", user_id=user["id"])
            return _enrich_device(device)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Balin device {imei}: {e}")
            raise HTTPException(status_code=500, detail=f"Errore recupero veicolo: {str(e)}")

    @router.get("/device/{imei}/history")
    async def get_balin_device_history(
        imei: str, 
        start: int,
        stop: int,
        token: Optional[str] = None,
        skip: int = 0,
        limit: int = 1500,
        filter_type: Optional[List[int]] = Query(None)
    ):
        """
        Get position history for a device.
        - start/stop: timestamps in milliseconds
        - Max range: 1 day
        - Max history: 30 days back
        """
        user = await get_user_from_token(token)
        
        params = {
            "start": start,
            "stop": stop,
            "skip": skip,
            "limit": limit
        }
        
        if filter_type:
            params["filter_type"] = filter_type
        
        try:
            result = await balin_api_request(db, f"/positionsHistory/{imei}", user_id=user["id"], params=params)
            return result
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Balin history for {imei}: {e}")
            raise HTTPException(status_code=500, detail=f"Errore recupero storico: {str(e)}")

    @router.get("/device/{imei}/trips")
    async def get_balin_device_trips(
        imei: str, 
        start: int,
        stop: int,
        token: Optional[str] = None,
        skip: int = 0,
        limit: int = 1500
    ):
        """
        Get trip history for a device (start/stop events only).
        - start/stop: timestamps in milliseconds
        - Max range: 90 days
        - Max history: 90 days back
        """
        user = await get_user_from_token(token)
        
        params = {
            "start": start,
            "stop": stop,
            "skip": skip,
            "limit": limit
        }
        
        try:
            result = await balin_api_request(db, f"/tripPositionsHistory/{imei}", user_id=user["id"], params=params)
            return result
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Balin trips for {imei}: {e}")
            raise HTTPException(status_code=500, detail=f"Errore recupero viaggi: {str(e)}")

    return router


# ============================================================
# FRONTEND COMPONENT: VehicleTracker.js
# Percorso: /app/frontend/src/VehicleTracker.js
# ============================================================
# Il componente React che consuma questi endpoint si trova in:
#   /app/frontend/src/VehicleTracker.js
#
# Endpoint chiamati dal frontend:
#   - GET ${API_URL}/api/balin/status?token=...
#   - GET ${API_URL}/api/balin/devices?token=...
#   - GET ${API_URL}/api/balin/device/${imei}?token=...
#   - GET ${API_URL}/api/balin/device/${imei}/history?token=...&start=...&stop=...
#   - GET ${API_URL}/api/balin/device/${imei}/trips?token=...&start=...&stop=...
