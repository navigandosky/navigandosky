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
from emergentintegrations.llm.openai import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Airport Knowledge Base - Information about Olbia Costa Smeralda Airport
AIRPORT_KNOWLEDGE_BASE = """
# Aeroporto di Olbia Costa Smeralda - Guida Completa

## Informazioni Generali
L'Aeroporto di Olbia Costa Smeralda (codice IATA: OLB) è il principale aeroporto della Sardegna nord-orientale, situato a circa 4 km dal centro di Olbia. È la porta d'accesso alla famosa Costa Smeralda e serve milioni di passeggeri ogni anno.

## Aree Check-in

### Check-in Desk 17-31
- Area principale per le compagnie aeree
- Check-in Aeroitalia
- Check-in EasyJet
- Check-in Ryanair

### Check-in Desk 1-16
- Check-in Volotea
- Altre compagnie aeree

## Servizi Disponibili

### Assistenza Speciale
- Servizio di assistenza per passeggeri a mobilità ridotta
- Sedie a rotelle disponibili
- Personale dedicato

### Servizi Igienici e Comfort
- Docce disponibili per i viaggiatori
- Toilets in tutte le aree
- Toilets anche nell'area Gates B

### Bagagli
- Deposito bagagli oversize
- Lost & Found (oggetti smarriti)
- 5 nastri ritiro bagagli (Carousel 1-5)

### Servizi Medici
- Farmacia
- Dispositivi medici

### Servizi Finanziari
- ATM nella hall arrivi
- Multipli bancomat disponibili

### Informazioni e Biglietteria
- Punto Informazioni Sardegna (Hall Arrivi)
- Biglietteria (Ticket Office)
- Emettitrice biglietti trasporto pubblico
- Tabellone orari voli

### Servizi Religiosi
- Cappella (al primo piano)

### Altri Servizi
- Meet & Greet
- Ascensori
- Scale per il primo piano

## Shopping

### Prodotti Tipici Sardi
- Island Crafts - Artigianato sardo
- The Best Selection of Typical Sardinian Products - Prodotti tipici
- Saint Martin - Vini e prodotti locali

### Moda e Accessori
- Polo Ralph Lauren
- Max & Co.
- Boggi
- Carpisa - Borse e accessori
- Ambrosio

### Altro
- Priarone Optics - Ottica e occhiali

## Ristorazione

### Bar e Ristoranti
- Grain & Grapes - Bar e ristorazione
- Self-service Karafood

### Distributori Automatici
- Vending Machine disponibili in varie aree

## Gates di Imbarco

### Gates B
- Gate B1
- Gate B2
- Gate B3
- Gate B4
- Gate B5
- Gate B6

### Gates A
- Accesso separato ai Gates A

### Accesso ai Gates
- Controlli di sicurezza prima dell'accesso
- Toilets disponibili nell'area gates

## Sicurezza e Polizia
- Polizia di Frontiera
- Carabinieri
- Controlli arrivi

## Uscite

### Partenze
- Ingresso partenze principale

### Arrivi
- Uscita arrivi
- Uscita "Nulla da dichiarare"
- Uscita "Articoli da dichiarare" (dogana)

## Intrattenimento e Cultura

### Mostra Mont'e Prama
Esposizione dedicata ai famosi Giganti di Mont'e Prama, antiche statue nuragiche ritrovate in Sardegna. Una collezione unica che rappresenta un importante patrimonio archeologico della civiltà nuragica.

## Sponsor e Partner
- Mercedes-Benz
- Rolex
- Saint Martin

## Collegamenti e Social
- Voli in tempo reale: www.geasar.it/en/flights/live-flights
- Facebook: OlbiaAirport
- LinkedIn: Geasar SpA
- YouTube: Aeroporto Olbia Costa Smeralda

## Informazioni sulla Costa Smeralda
La Costa Smeralda è una rinomata destinazione turistica della Sardegna nord-orientale, famosa per:
- Spiagge di sabbia bianca e acque cristalline
- Porto Cervo - centro mondano e porto turistico di lusso
- Hotel e resort di alta gamma
- Vita notturna esclusiva
- Ristoranti gourmet
- Campi da golf
- Sport acquatici

## Tour Virtuale
È disponibile un tour virtuale interattivo dell'aeroporto che permette di esplorare tutti gli spazi e i servizi: https://tour.fairsgate.com/tour/olbia-ultimo
"""

SYSTEM_PROMPT = f"""Sei un assistente virtuale amichevole e competente dell'Aeroporto di Olbia Costa Smeralda. 
Il tuo compito è aiutare i viaggiatori fornendo informazioni accurate sui servizi, le aree e i punti di interesse dell'aeroporto.

Rispondi sempre in italiano in modo cortese e professionale. Se non conosci una risposta specifica, suggerisci di contattare il punto informazioni dell'aeroporto.

Ecco la base di conoscenza dell'aeroporto:

{AIRPORT_KNOWLEDGE_BASE}

Linee guida:
1. Sii conciso ma completo nelle risposte
2. Usa un tono amichevole e professionale
3. Se appropriato, suggerisci servizi correlati
4. Per informazioni sui voli in tempo reale, indirizza a www.geasar.it/en/flights/live-flights
5. Menziona il tour virtuale quando rilevante: https://tour.fairsgate.com/tour/olbia-ultimo
6. Se la domanda non riguarda l'aeroporto, rispondi gentilmente che sei specializzato solo nell'assistenza aeroportuale
"""

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

class SuggestedQuestion(BaseModel):
    id: str
    question: str
    category: str

# Store active chat instances
chat_instances = {}

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Olbia Airport Virtual Assistant API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.get("/suggested-questions", response_model=List[SuggestedQuestion])
async def get_suggested_questions():
    """Return pre-set suggested questions for the chatbot"""
    questions = [
        SuggestedQuestion(
            id="1",
            question="Dove trovo i banchi check-in Ryanair?",
            category="Check-in"
        ),
        SuggestedQuestion(
            id="2",
            question="Quali negozi ci sono in aeroporto?",
            category="Shopping"
        ),
        SuggestedQuestion(
            id="3",
            question="Dove posso mangiare qualcosa?",
            category="Ristorazione"
        ),
        SuggestedQuestion(
            id="4",
            question="Come richiedo assistenza speciale?",
            category="Servizi"
        ),
        SuggestedQuestion(
            id="5",
            question="Dove ritiro i bagagli?",
            category="Bagagli"
        ),
        SuggestedQuestion(
            id="6",
            question="C'è una farmacia in aeroporto?",
            category="Servizi"
        ),
        SuggestedQuestion(
            id="7",
            question="Quali sono i gates di imbarco?",
            category="Gates"
        ),
        SuggestedQuestion(
            id="8",
            question="Cos'è la mostra Mont'e Prama?",
            category="Cultura"
        ),
        SuggestedQuestion(
            id="9",
            question="Dove trovo un bancomat/ATM?",
            category="Servizi"
        ),
        SuggestedQuestion(
            id="10",
            question="Come raggiungo la Costa Smeralda?",
            category="Trasporti"
        )
    ]
    return questions

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return AI response"""
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get or create chat instance
    if session_id not in chat_instances:
        chat_instances[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o-mini")
    
    chat_instance = chat_instances[session_id]
    
    try:
        # Create user message
        user_msg = UserMessage(text=request.message)
        
        # Get response from LLM
        response = await chat_instance.send_message(user_msg)
        
        # Save to database
        chat_doc = {
            "session_id": session_id,
            "user_message": request.message,
            "assistant_response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_history.insert_one(chat_doc)
        
        return ChatResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    history = await db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    return {"session_id": session_id, "messages": history}

@api_router.delete("/chat/session/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear a chat session"""
    if session_id in chat_instances:
        del chat_instances[session_id]
    
    await db.chat_history.delete_many({"session_id": session_id})
    
    return {"message": "Session cleared", "session_id": session_id}

@api_router.get("/airport-info")
async def get_airport_info():
    """Return structured airport information"""
    return {
        "name": "Aeroporto di Olbia Costa Smeralda",
        "code": "OLB",
        "virtual_tour": "https://tour.fairsgate.com/tour/olbia-ultimo",
        "live_flights": "https://www.geasar.it/en/flights/live-flights",
        "social": {
            "facebook": "https://www.facebook.com/OlbiaAirport",
            "linkedin": "https://www.linkedin.com/company/geasar-spa/",
            "youtube": "https://www.youtube.com/@aeroportoolbiacostasmerald7728/videos"
        },
        "airlines": ["Ryanair", "EasyJet", "Aeroitalia", "Volotea"],
        "categories": {
            "check_in": ["Desk 17-31", "Desk 1-16"],
            "gates": ["B1", "B2", "B3", "B4", "B5", "B6", "Gates A"],
            "food": ["Grain & Grapes", "Self-service Karafood", "Vending Machines"],
            "shopping": [
                "Island Crafts", "Max & Co.", "Polo Ralph Lauren",
                "Priarone Optics", "Ambrosio", "Boggi", "Carpisa",
                "Typical Sardinian Products"
            ],
            "services": [
                "Farmacia", "Assistenza Speciale", "Docce", "Lost & Found",
                "ATM", "Info Point", "Cappella", "Medical Device"
            ]
        }
    }

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
