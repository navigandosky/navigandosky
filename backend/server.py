"""
Trivor API - Server principale
Versione modulare con router separati per ogni applicazione
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging

from config import UPLOADS_DIR

# Import routers
from routes.public import router as public_router
from routes.admin import router as admin_router
from routes.trivordoc import router as trivordoc_router
from routes.trivorweb import router as trivorweb_router
from routes.contacts import router as contacts_router
from routes.checkdb import router as checkdb_router
from routes.digital_twins import router as digital_twins_router

# Create the main app
app = FastAPI(
    title="Trivor API",
    version="2.0.0",
    description="API modulare per Trivor Suite - Gestione documentale, siti web, contatti e altro"
)

# Mount static files for uploads under /api/uploads
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include all routers with /api prefix
app.include_router(public_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(trivordoc_router, prefix="/api")
app.include_router(trivorweb_router, prefix="/api")
app.include_router(contacts_router, prefix="/api")
app.include_router(checkdb_router, prefix="/api")
app.include_router(digital_twins_router, prefix="/api")

# CORS Middleware
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

logger.info("🚀 Trivor API v2.0.0 - Modular Edition started successfully")
