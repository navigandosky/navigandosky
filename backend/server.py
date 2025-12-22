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

# Default Knowledge Base
DEFAULT_KNOWLEDGE_BASE = """
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

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatMessage(BaseModel):
    role: str
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

# ====== ADMIN MODELS ======
class KnowledgeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    title: str
    content: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KnowledgeEntryCreate(BaseModel):
    category: str
    title: str
    content: str
    is_active: bool = True

class KnowledgeEntryUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class SuggestedQuestionCreate(BaseModel):
    question: str
    category: str

class SuggestedQuestionUpdate(BaseModel):
    question: Optional[str] = None
    category: Optional[str] = None

class ChatbotSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "main_settings"
    bot_name: str = "Assistente Olbia Airport"
    welcome_message: str = "Ciao! \ud83d\udc4b Sono l'assistente virtuale dell'Aeroporto di Olbia Costa Smeralda. Come posso aiutarti?"
    system_prompt_prefix: str = "Sei un assistente virtuale amichevole e competente dell'Aeroporto di Olbia Costa Smeralda."
    virtual_tour_url: str = "https://tour.fairsgate.com/tour/olbia-ultimo"
    live_flights_url: str = "https://www.geasar.it/en/flights/live-flights"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatbotSettingsUpdate(BaseModel):
    bot_name: Optional[str] = None
    welcome_message: Optional[str] = None
    system_prompt_prefix: Optional[str] = None
    virtual_tour_url: Optional[str] = None
    live_flights_url: Optional[str] = None

# Store active chat instances
chat_instances = {}

# Cache for knowledge base
knowledge_cache = {
    "content": None,
    "last_updated": None
}

# ====== HELPER FUNCTIONS ======
async def get_dynamic_knowledge_base():
    """Build knowledge base from database entries"""
    entries = await db.knowledge_entries.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if not entries:
        return DEFAULT_KNOWLEDGE_BASE
    
    # Group by category
    categories = {}
    for entry in entries:
        cat = entry.get("category", "Altro")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(entry)
    
    # Build markdown
    kb_content = "# Informazioni Aeroporto di Olbia Costa Smeralda\n\n"
    
    for cat_name, items in categories.items():
        kb_content += f"## {cat_name}\n\n"
        for item in items:
            kb_content += f"### {item.get('title', '')}\n"
            kb_content += f"{item.get('content', '')}\n\n"
    
    return kb_content

async def get_system_prompt():
    """Build system prompt with current settings and knowledge"""
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    
    if not settings:
        settings = ChatbotSettings().model_dump()
    
    knowledge = await get_dynamic_knowledge_base()
    
    return f"""{settings.get('system_prompt_prefix', 'Sei un assistente virtuale amichevole e competente.')}

Il tuo compito è aiutare i viaggiatori fornendo informazioni accurate sui servizi, le aree e i punti di interesse dell'aeroporto.

Rispondi sempre in italiano in modo cortese e professionale. Se non conosci una risposta specifica, suggerisci di contattare il punto informazioni dell'aeroporto.

Ecco la base di conoscenza:

{knowledge}

Linee guida:
1. Sii conciso ma completo nelle risposte
2. Usa un tono amichevole e professionale
3. Se appropriato, suggerisci servizi correlati
4. Per informazioni sui voli in tempo reale, indirizza a {settings.get('live_flights_url', 'www.geasar.it/en/flights/live-flights')}
5. Menziona il tour virtuale quando rilevante: {settings.get('virtual_tour_url', 'https://tour.fairsgate.com/tour/olbia-ultimo')}
6. Se la domanda non riguarda l'aeroporto, rispondi gentilmente che sei specializzato solo nell'assistenza aeroportuale
"""

# ====== PUBLIC API ROUTES ======
@api_router.get("/")
async def root():
    return {"message": "Trivor Virtual Assistant API"}

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

@api_router.get("/suggested-questions")
async def get_suggested_questions():
    """Return suggested questions from database or defaults"""
    questions = await db.suggested_questions.find({}, {"_id": 0}).to_list(100)
    
    if not questions:
        # Return defaults
        return [
            {"id": "1", "question": "Dove trovo i banchi check-in Ryanair?", "category": "Check-in"},
            {"id": "2", "question": "Quali negozi ci sono in aeroporto?", "category": "Shopping"},
            {"id": "3", "question": "Dove posso mangiare qualcosa?", "category": "Ristorazione"},
            {"id": "4", "question": "Come richiedo assistenza speciale?", "category": "Servizi"}
        ]
    
    return questions

@api_router.get("/chatbot-settings")
async def get_chatbot_settings_public():
    """Get public chatbot settings (for widget)"""
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    
    if not settings:
        settings = ChatbotSettings().model_dump()
    
    return {
        "bot_name": settings.get("bot_name", "Assistente Olbia Airport"),
        "welcome_message": settings.get("welcome_message", "Ciao! \ud83d\udc4b Sono l'assistente virtuale. Come posso aiutarti?"),
        "virtual_tour_url": settings.get("virtual_tour_url", ""),
        "live_flights_url": settings.get("live_flights_url", "")
    }

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return AI response"""
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get dynamic system prompt
    system_prompt = await get_system_prompt()
    
    # Get or create chat instance
    if session_id not in chat_instances:
        chat_instances[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
    
    chat_instance = chat_instances[session_id]
    
    try:
        user_msg = UserMessage(text=request.message)
        response = await chat_instance.send_message(user_msg)
        
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
    history = await db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return {"session_id": session_id, "messages": history}

@api_router.delete("/chat/session/{session_id}")
async def clear_chat_session(session_id: str):
    if session_id in chat_instances:
        del chat_instances[session_id]
    await db.chat_history.delete_many({"session_id": session_id})
    return {"message": "Session cleared", "session_id": session_id}

# ====== ADMIN API ROUTES ======

# Knowledge Base Management
@api_router.get("/admin/knowledge")
async def admin_get_knowledge_entries():
    """Get all knowledge entries"""
    entries = await db.knowledge_entries.find({}, {"_id": 0}).sort("category", 1).to_list(1000)
    return entries

@api_router.post("/admin/knowledge")
async def admin_create_knowledge_entry(entry: KnowledgeEntryCreate):
    """Create a new knowledge entry"""
    entry_obj = KnowledgeEntry(**entry.model_dump())
    doc = entry_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.knowledge_entries.insert_one(doc)
    # Clear chat instances to use new knowledge
    chat_instances.clear()
    return entry_obj

@api_router.put("/admin/knowledge/{entry_id}")
async def admin_update_knowledge_entry(entry_id: str, update: KnowledgeEntryUpdate):
    """Update a knowledge entry"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.knowledge_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    chat_instances.clear()
    return {"message": "Updated successfully"}

@api_router.delete("/admin/knowledge/{entry_id}")
async def admin_delete_knowledge_entry(entry_id: str):
    """Delete a knowledge entry"""
    result = await db.knowledge_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    chat_instances.clear()
    return {"message": "Deleted successfully"}

# Suggested Questions Management
@api_router.get("/admin/questions")
async def admin_get_questions():
    """Get all suggested questions"""
    questions = await db.suggested_questions.find({}, {"_id": 0}).to_list(100)
    return questions

@api_router.post("/admin/questions")
async def admin_create_question(question: SuggestedQuestionCreate):
    """Create a new suggested question"""
    doc = {
        "id": str(uuid.uuid4()),
        "question": question.question,
        "category": question.category
    }
    await db.suggested_questions.insert_one(doc)
    return doc

@api_router.put("/admin/questions/{question_id}")
async def admin_update_question(question_id: str, update: SuggestedQuestionUpdate):
    """Update a suggested question"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    result = await db.suggested_questions.update_one(
        {"id": question_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Updated successfully"}

@api_router.delete("/admin/questions/{question_id}")
async def admin_delete_question(question_id: str):
    """Delete a suggested question"""
    result = await db.suggested_questions.delete_one({"id": question_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Deleted successfully"}

# Chatbot Settings Management
@api_router.get("/admin/settings")
async def admin_get_settings():
    """Get chatbot settings"""
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    
    if not settings:
        settings = ChatbotSettings().model_dump()
        settings['created_at'] = settings['updated_at'].isoformat()
        settings['updated_at'] = settings['updated_at'].isoformat()
    
    return settings

@api_router.put("/admin/settings")
async def admin_update_settings(update: ChatbotSettingsUpdate):
    """Update chatbot settings"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.chatbot_settings.update_one(
        {"id": "main_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    chat_instances.clear()
    return {"message": "Settings updated successfully"}

# Chat Analytics
@api_router.get("/admin/analytics")
async def admin_get_analytics():
    """Get chat analytics"""
    total_messages = await db.chat_history.count_documents({})
    total_sessions = len(await db.chat_history.distinct("session_id"))
    
    # Recent messages
    recent = await db.chat_history.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "recent_conversations": recent
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
