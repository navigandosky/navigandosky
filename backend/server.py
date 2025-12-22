from fastapi import FastAPI, APIRouter, HTTPException
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
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI configuration via Emergent
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
OPENAI_API_URL = "https://llm.emergent.sh/v1/chat/completions"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    language: str = "it"
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    consent: bool

class ContactResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    success: bool
    message: str

# Tadasuni knowledge base
TADASUNI_CONTEXT = """
Tadasuni è un piccolissimo borgo della Sardegna centrale, situato nella regione storica del Barigadu, in provincia di Oristano.
È uno dei comuni meno popolosi dell'isola, con circa 150 abitanti.

POSIZIONE:
- Sorge su un rilievo collinare a circa 180 metri di altitudine
- Affacciato sul lago formato dalla diga di Santa Chiara sul fiume Tirso
- Panorama dominato dal Tirso e dal vicino Lago Omodeo
- Ambiente circondato da boschi, macchia mediterranea e campi coltivati

ATTRAZIONI PRINCIPALI:
1. Chiese:
   - Chiesa di Santa Croce (XVIII secolo)
   - Chiesa di San Nicola di Bari
   - Chiesa di San Michele

2. Luoghi di interesse:
   - Casa Pinna (edificio storico)
   - Monumento ai Caduti
   - Parco Comunale
   - Ceramiche artistiche tradizionali
   - Murales dell'Età Nuragica

3. Itinerari:
   - Itinerario delle Ceramiche
   - Itinerario delle Chiese
   - Giardini
   - Necropoli Sas Perderas

EVENTI:
- Dromos Festival: festival musicale internazionale che si tiene ad agosto
  - "Isole d'altri mari": tre giorni di musica, incontri e contaminazioni
  - Concerti in Piazza Santa Croce e nel Parco Comunale

COME ARRIVARE:
- Aeroporti: Cagliari, Olbia Costa Smeralda
- Strada: da Oristano o Nuoro
- Traghetto: da Olbia o Cagliari

SERVIZI NELLE VICINANZE:
- Terme di Fordongianus
- Banche: Unicredit, Intesa San Paolo, Banco di Sardegna
- Ufficio Postale
- Stazione ferroviaria
- Polizia
- Poliambulatorio

GEMELLO DIGITALE:
Tadasuni offre un tour virtuale 3D del borgo attraverso il Digital Twin di Fairsgate,
che permette di esplorare virtualmente le strade, le chiese e i luoghi di interesse.

PROGETTO "INVEST IN TADASUNI":
"Sognare, Credere, Fare" - un progetto per attirare nuovi residenti e investimenti nel borgo.
Slogan: "Tra lago, colline e tradizioni: la tua nuova vita comincia a Tadasuni"
"""

LANGUAGE_PROMPTS = {
    "it": "Rispondi sempre in italiano in modo cordiale e informativo.",
    "en": "Always respond in English in a friendly and informative manner.",
    "fr": "Répondez toujours en français de manière cordiale et informative.",
    "es": "Responde siempre en español de manera cordial e informativa.",
    "de": "Antworten Sie immer auf Deutsch auf freundliche und informative Weise."
}

@api_router.get("/")
async def root():
    return {"message": "Visit Tadasuni API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    language_instruction = LANGUAGE_PROMPTS.get(request.language, LANGUAGE_PROMPTS["it"])
    
    system_prompt = f"""Sei un assistente virtuale per Visit Tadasuni, il sito turistico del borgo di Tadasuni in Sardegna.
Usa le seguenti informazioni per rispondere alle domande:

{TADASUNI_CONTEXT}

{language_instruction}
Se non conosci la risposta, suggerisci di contattare il Comune di Tadasuni o visitare il gemello digitale.
Sii conciso ma completo nelle risposte."""
    
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Add conversation history
    for msg in request.history[-10:]:  # Keep last 10 messages
        messages.append({"role": msg.role, "content": msg.content})
    
    messages.append({"role": "user", "content": request.message})
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.text}")
                raise HTTPException(status_code=500, detail="Error communicating with AI service")
            
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            
            return ChatResponse(response=ai_response)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/contact", response_model=ContactResponse)
async def submit_contact(request: ContactRequest):
    if not request.consent:
        raise HTTPException(status_code=400, detail="Consent required")
    
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "message": request.message,
        "consent": request.consent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contacts.insert_one(contact_doc)
    
    return ContactResponse(
        id=contact_doc["id"],
        success=True,
        message="Message received successfully"
    )

@api_router.get("/contacts", response_model=List[dict])
async def get_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(100)
    return contacts

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
