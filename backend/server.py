from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
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
import httpx
from bs4 import BeautifulSoup
import re


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
- Check-in Desk 17-31: Area principale (Aeroitalia, EasyJet, Ryanair)
- Check-in Desk 1-16: Volotea e altre compagnie

## Servizi
- Assistenza Speciale per passeggeri a mobilità ridotta
- Docce, Toilets in tutte le aree
- Deposito bagagli oversize, Lost & Found
- 5 nastri ritiro bagagli (Carousel 1-5)
- Farmacia, Dispositivi medici
- ATM nella hall arrivi
- Punto Informazioni Sardegna
- Cappella (primo piano)

## Shopping
- Island Crafts, Prodotti Tipici Sardi
- Polo Ralph Lauren, Max & Co., Boggi, Carpisa
- Priarone Optics

## Ristorazione
- Grain & Grapes, Self-service Karafood
- Distributori automatici

## Gates
- Gates B: B1-B6
- Gates A: accesso separato

## Tour Virtuale
https://tour.fairsgate.com/tour/olbia-ultimo
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

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

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

# ====== WEB SOURCE MODELS ======
class WebSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    name: str
    description: str = ""
    extracted_content: str = ""
    is_active: bool = True
    status: str = "pending"  # pending, processing, completed, error
    last_fetched: Optional[datetime] = None
    error_message: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebSourceCreate(BaseModel):
    url: str
    name: str
    description: str = ""

class WebSourceUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# Store active chat instances
chat_instances = {}

# ====== WEB SCRAPING FUNCTIONS ======
async def extract_content_from_url(url: str) -> tuple[str, str]:
    """Extract text content from a URL. Returns (content, error_message)"""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe']):
                element.decompose()
            
            # Get text
            text = soup.get_text(separator='\n', strip=True)
            
            # Clean up text
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            # Remove very short lines (likely navigation items)
            lines = [line for line in lines if len(line) > 20 or any(c in line for c in ['.', ':', '-'])]
            
            # Limit content length
            content = '\n'.join(lines[:200])  # First 200 meaningful lines
            
            if len(content) > 10000:
                content = content[:10000] + "\n... [contenuto troncato]"
            
            return content, ""
            
    except httpx.TimeoutException:
        return "", "Timeout: il sito non risponde"
    except httpx.HTTPStatusError as e:
        return "", f"Errore HTTP: {e.response.status_code}"
    except Exception as e:
        return "", f"Errore: {str(e)}"

async def fetch_web_source(source_id: str):
    """Background task to fetch and extract content from a web source"""
    # Update status to processing
    await db.web_sources.update_one(
        {"id": source_id},
        {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get the source
    source = await db.web_sources.find_one({"id": source_id}, {"_id": 0})
    if not source:
        return
    
    # Extract content
    content, error = await extract_content_from_url(source["url"])
    
    # Update source
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_fetched": datetime.now(timezone.utc).isoformat()
    }
    
    if error:
        update_data["status"] = "error"
        update_data["error_message"] = error
    else:
        update_data["status"] = "completed"
        update_data["extracted_content"] = content
        update_data["error_message"] = ""
    
    await db.web_sources.update_one(
        {"id": source_id},
        {"$set": update_data}
    )
    
    # Clear chat instances to use new knowledge
    chat_instances.clear()

# ====== HELPER FUNCTIONS ======
async def get_dynamic_knowledge_base():
    """Build knowledge base from database entries and web sources"""
    kb_content = DEFAULT_KNOWLEDGE_BASE + "\n\n"
    
    # Get manual entries
    entries = await db.knowledge_entries.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if entries:
        kb_content += "\n# Informazioni Aggiuntive\n\n"
        categories = {}
        for entry in entries:
            cat = entry.get("category", "Altro")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(entry)
        
        for cat_name, items in categories.items():
            kb_content += f"## {cat_name}\n\n"
            for item in items:
                kb_content += f"### {item.get('title', '')}\n"
                kb_content += f"{item.get('content', '')}\n\n"
    
    # Get web sources content
    web_sources = await db.web_sources.find(
        {"is_active": True, "status": "completed"},
        {"_id": 0}
    ).to_list(100)
    
    if web_sources:
        kb_content += "\n# Informazioni da Fonti Web\n\n"
        for source in web_sources:
            if source.get("extracted_content"):
                kb_content += f"## {source.get('name', 'Fonte Web')}\n"
                if source.get('description'):
                    kb_content += f"*{source.get('description')}*\n\n"
                kb_content += f"{source.get('extracted_content', '')}\n\n"
    
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
    questions = await db.suggested_questions.find({}, {"_id": 0}).to_list(100)
    if not questions:
        return [
            {"id": "1", "question": "Dove trovo i banchi check-in Ryanair?", "category": "Check-in"},
            {"id": "2", "question": "Quali negozi ci sono in aeroporto?", "category": "Shopping"},
            {"id": "3", "question": "Dove posso mangiare qualcosa?", "category": "Ristorazione"},
            {"id": "4", "question": "Come richiedo assistenza speciale?", "category": "Servizi"}
        ]
    return questions

@api_router.get("/chatbot-settings")
async def get_chatbot_settings_public():
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
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    session_id = request.session_id or str(uuid.uuid4())
    system_prompt = await get_system_prompt()
    
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
    entries = await db.knowledge_entries.find({}, {"_id": 0}).sort("category", 1).to_list(1000)
    return entries

@api_router.post("/admin/knowledge")
async def admin_create_knowledge_entry(entry: KnowledgeEntryCreate):
    entry_obj = KnowledgeEntry(**entry.model_dump())
    doc = entry_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.knowledge_entries.insert_one(doc)
    chat_instances.clear()
    return entry_obj

@api_router.put("/admin/knowledge/{entry_id}")
async def admin_update_knowledge_entry(entry_id: str, update: KnowledgeEntryUpdate):
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
    result = await db.knowledge_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    chat_instances.clear()
    return {"message": "Deleted successfully"}

# Web Sources Management
@api_router.get("/admin/web-sources")
async def admin_get_web_sources():
    sources = await db.web_sources.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sources

@api_router.post("/admin/web-sources")
async def admin_create_web_source(source: WebSourceCreate, background_tasks: BackgroundTasks):
    source_obj = WebSource(**source.model_dump())
    doc = source_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_fetched'):
        doc['last_fetched'] = doc['last_fetched'].isoformat()
    
    await db.web_sources.insert_one(doc)
    
    # Start background task to fetch content
    background_tasks.add_task(fetch_web_source, source_obj.id)
    
    return {"id": source_obj.id, "message": "Fonte aggiunta, estrazione contenuto in corso..."}

@api_router.put("/admin/web-sources/{source_id}")
async def admin_update_web_source(source_id: str, update: WebSourceUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.web_sources.update_one(
        {"id": source_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    chat_instances.clear()
    return {"message": "Updated successfully"}

@api_router.delete("/admin/web-sources/{source_id}")
async def admin_delete_web_source(source_id: str):
    result = await db.web_sources.delete_one({"id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    chat_instances.clear()
    return {"message": "Deleted successfully"}

@api_router.post("/admin/web-sources/{source_id}/refresh")
async def admin_refresh_web_source(source_id: str, background_tasks: BackgroundTasks):
    source = await db.web_sources.find_one({"id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Reset status and start fetching
    await db.web_sources.update_one(
        {"id": source_id},
        {"$set": {"status": "pending", "error_message": ""}}
    )
    
    background_tasks.add_task(fetch_web_source, source_id)
    
    return {"message": "Aggiornamento in corso..."}

# Suggested Questions Management
@api_router.get("/admin/questions")
async def admin_get_questions():
    questions = await db.suggested_questions.find({}, {"_id": 0}).to_list(100)
    return questions

@api_router.post("/admin/questions")
async def admin_create_question(question: SuggestedQuestionCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "question": question.question,
        "category": question.category
    }
    await db.suggested_questions.insert_one(doc)
    return doc

@api_router.put("/admin/questions/{question_id}")
async def admin_update_question(question_id: str, update: SuggestedQuestionUpdate):
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
    result = await db.suggested_questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Deleted successfully"}

# Chatbot Settings Management
@api_router.get("/admin/settings")
async def admin_get_settings():
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    if not settings:
        settings = ChatbotSettings().model_dump()
        settings['updated_at'] = settings['updated_at'].isoformat()
    return settings

@api_router.put("/admin/settings")
async def admin_update_settings(update: ChatbotSettingsUpdate):
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
    total_messages = await db.chat_history.count_documents({})
    total_sessions = len(await db.chat_history.distinct("session_id"))
    total_knowledge = await db.knowledge_entries.count_documents({})
    total_web_sources = await db.web_sources.count_documents({})
    
    recent = await db.chat_history.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "total_knowledge": total_knowledge,
        "total_web_sources": total_web_sources,
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
