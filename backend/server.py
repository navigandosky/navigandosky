from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
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

# ====== MULTILINGUAL SUPPORT ======
SUPPORTED_LANGUAGES = {
    "it": {
        "name": "Italiano",
        "flag": "🇮🇹",
        "welcome": "Ciao! 👋 Sono l'assistente virtuale dell'Aeroporto di Olbia Costa Smeralda. Come posso aiutarti?",
        "online_status": "Online - Pronto ad aiutarti",
        "input_placeholder": "Scrivi un messaggio...",
        "typing": "Sto scrivendo...",
        "suggestions_title": "Domande frequenti:",
        "powered_by": "Powered by",
        "new_conversation": "Nuova conversazione",
        "system_prompt": "Rispondi SEMPRE in italiano. Sii cortese e professionale."
    },
    "en": {
        "name": "English",
        "flag": "🇬🇧",
        "welcome": "Hello! 👋 I'm the virtual assistant of Olbia Costa Smeralda Airport. How can I help you?",
        "online_status": "Online - Ready to help",
        "input_placeholder": "Type a message...",
        "typing": "Typing...",
        "suggestions_title": "Frequently asked:",
        "powered_by": "Powered by",
        "new_conversation": "New conversation",
        "system_prompt": "ALWAYS respond in English. Be polite and professional."
    },
    "de": {
        "name": "Deutsch",
        "flag": "🇩🇪",
        "welcome": "Hallo! 👋 Ich bin der virtuelle Assistent des Flughafens Olbia Costa Smeralda. Wie kann ich Ihnen helfen?",
        "online_status": "Online - Bereit zu helfen",
        "input_placeholder": "Nachricht eingeben...",
        "typing": "Schreibt...",
        "suggestions_title": "Häufige Fragen:",
        "powered_by": "Powered by",
        "new_conversation": "Neues Gespräch",
        "system_prompt": "Antworte IMMER auf Deutsch. Sei höflich und professionell."
    },
    "fr": {
        "name": "Français",
        "flag": "🇫🇷",
        "welcome": "Bonjour! 👋 Je suis l'assistant virtuel de l'Aéroport d'Olbia Costa Smeralda. Comment puis-je vous aider?",
        "online_status": "En ligne - Prêt à vous aider",
        "input_placeholder": "Écrivez un message...",
        "typing": "En train d'écrire...",
        "suggestions_title": "Questions fréquentes:",
        "powered_by": "Powered by",
        "new_conversation": "Nouvelle conversation",
        "system_prompt": "Réponds TOUJOURS en français. Sois poli et professionnel."
    },
    "es": {
        "name": "Español",
        "flag": "🇪🇸",
        "welcome": "¡Hola! 👋 Soy el asistente virtual del Aeropuerto de Olbia Costa Smeralda. ¿Cómo puedo ayudarte?",
        "online_status": "En línea - Listo para ayudar",
        "input_placeholder": "Escribe un mensaje...",
        "typing": "Escribiendo...",
        "suggestions_title": "Preguntas frecuentes:",
        "powered_by": "Powered by",
        "new_conversation": "Nueva conversación",
        "system_prompt": "Responde SIEMPRE en español. Sé cortés y profesional."
    },
    "ru": {
        "name": "Русский",
        "flag": "🇷🇺",
        "welcome": "Привет! 👋 Я виртуальный помощник аэропорта Ольбия Коста Смеральда. Чем могу помочь?",
        "online_status": "Онлайн - Готов помочь",
        "input_placeholder": "Напишите сообщение...",
        "typing": "Печатает...",
        "suggestions_title": "Частые вопросы:",
        "powered_by": "Powered by",
        "new_conversation": "Новый разговор",
        "system_prompt": "ВСЕГДА отвечай на русском языке. Будь вежливым и профессиональным."
    }
}

# Country to language mapping
COUNTRY_TO_LANGUAGE = {
    "IT": "it", "SM": "it", "VA": "it",  # Italian
    "GB": "en", "US": "en", "AU": "en", "NZ": "en", "CA": "en", "IE": "en",  # English
    "DE": "de", "AT": "de", "CH": "de", "LI": "de",  # German
    "FR": "fr", "BE": "fr", "MC": "fr", "LU": "fr",  # French
    "ES": "es", "MX": "es", "AR": "es", "CO": "es", "CL": "es",  # Spanish
    "RU": "ru", "BY": "ru", "KZ": "ru",  # Russian
}

# Suggested questions per language
SUGGESTED_QUESTIONS = {
    "it": [
        {"id": "1", "question": "Dove trovo il check-in Ryanair?", "short": "Check-in Ryanair"},
        {"id": "2", "question": "Quali negozi ci sono?", "short": "Negozi"},
        {"id": "3", "question": "Dove posso mangiare?", "short": "Ristorazione"},
        {"id": "4", "question": "Assistenza speciale?", "short": "Assistenza"}
    ],
    "en": [
        {"id": "1", "question": "Where is the Ryanair check-in?", "short": "Ryanair Check-in"},
        {"id": "2", "question": "What shops are available?", "short": "Shops"},
        {"id": "3", "question": "Where can I eat?", "short": "Restaurants"},
        {"id": "4", "question": "Special assistance?", "short": "Assistance"}
    ],
    "de": [
        {"id": "1", "question": "Wo ist der Ryanair Check-in?", "short": "Ryanair Check-in"},
        {"id": "2", "question": "Welche Geschäfte gibt es?", "short": "Geschäfte"},
        {"id": "3", "question": "Wo kann ich essen?", "short": "Restaurants"},
        {"id": "4", "question": "Besondere Unterstützung?", "short": "Hilfe"}
    ],
    "fr": [
        {"id": "1", "question": "Où est l'enregistrement Ryanair?", "short": "Ryanair Check-in"},
        {"id": "2", "question": "Quels magasins y a-t-il?", "short": "Boutiques"},
        {"id": "3", "question": "Où puis-je manger?", "short": "Restauration"},
        {"id": "4", "question": "Assistance spéciale?", "short": "Assistance"}
    ],
    "es": [
        {"id": "1", "question": "¿Dónde está el check-in de Ryanair?", "short": "Check-in Ryanair"},
        {"id": "2", "question": "¿Qué tiendas hay?", "short": "Tiendas"},
        {"id": "3", "question": "¿Dónde puedo comer?", "short": "Restaurantes"},
        {"id": "4", "question": "¿Asistencia especial?", "short": "Asistencia"}
    ],
    "ru": [
        {"id": "1", "question": "Где регистрация Ryanair?", "short": "Регистрация Ryanair"},
        {"id": "2", "question": "Какие магазины есть?", "short": "Магазины"},
        {"id": "3", "question": "Где можно поесть?", "short": "Рестораны"},
        {"id": "4", "question": "Специальная помощь?", "short": "Помощь"}
    ]
}

# Default Knowledge Base
DEFAULT_KNOWLEDGE_BASE = """
# Aeroporto di Olbia Costa Smeralda - Complete Guide

## General Information
Olbia Costa Smeralda Airport (IATA: OLB) is the main airport in northeastern Sardinia, located about 4 km from Olbia city center. It's the gateway to the famous Costa Smeralda and serves millions of passengers annually.

## Check-in Areas
- Check-in Desk 17-31: Main area (Aeroitalia, EasyJet, Ryanair)
- Check-in Desk 1-16: Volotea and other airlines

## Services
- Special Assistance for passengers with reduced mobility
- Showers, Toilets in all areas
- Oversized luggage storage, Lost & Found
- 5 baggage claim carousels (Carousel 1-5)
- Pharmacy, Medical devices
- ATM in arrivals hall
- Sardinia Information Point
- Chapel (first floor)

## Shopping
- Island Crafts, Typical Sardinian Products
- Polo Ralph Lauren, Max & Co., Boggi, Carpisa
- Priarone Optics

## Food & Beverage
- Grain & Grapes, Self-service Karafood
- Vending machines

## Gates
- Gates B: B1-B6
- Gates A: separate access

## Virtual Tour
https://tour.fairsgate.com/tour/olbia-ultimo

## Live Flights
https://www.geasar.it/en/flights/live-flights
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
    language: Optional[str] = "it"

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
    welcome_message: str = "Ciao! 👋 Sono l'assistente virtuale dell'Aeroporto di Olbia Costa Smeralda. Come posso aiutarti?"
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
    status: str = "pending"
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

# ====== IP GEOLOCATION ======
async def get_country_from_ip(ip: str) -> str:
    """Get country code from IP address using free API"""
    if ip in ["127.0.0.1", "localhost", "::1"] or ip.startswith("10.") or ip.startswith("192.168."):
        return "IT"  # Default for local IPs
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Using ip-api.com (free, no key required)
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=countryCode")
            if response.status_code == 200:
                data = response.json()
                return data.get("countryCode", "IT")
    except Exception as e:
        logging.error(f"IP geolocation error: {e}")
    
    return "IT"  # Default to Italian

def get_language_from_country(country_code: str) -> str:
    """Map country code to language"""
    return COUNTRY_TO_LANGUAGE.get(country_code.upper(), "en")  # Default to English for unknown

# ====== WEB SCRAPING FUNCTIONS ======
async def extract_content_from_url(url: str) -> tuple[str, str]:
    """Extract text content from a URL. Returns (content, error_message)"""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe']):
                element.decompose()
            
            text = soup.get_text(separator='\n', strip=True)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            lines = [line for line in lines if len(line) > 20 or any(c in line for c in ['.', ':', '-'])]
            
            content = '\n'.join(lines[:200])
            
            if len(content) > 10000:
                content = content[:10000] + "\n... [content truncated]"
            
            return content, ""
            
    except httpx.TimeoutException:
        return "", "Timeout: site not responding"
    except httpx.HTTPStatusError as e:
        return "", f"HTTP Error: {e.response.status_code}"
    except Exception as e:
        return "", f"Error: {str(e)}"

async def fetch_web_source(source_id: str):
    """Background task to fetch and extract content from a web source"""
    await db.web_sources.update_one(
        {"id": source_id},
        {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    source = await db.web_sources.find_one({"id": source_id}, {"_id": 0})
    if not source:
        return
    
    content, error = await extract_content_from_url(source["url"])
    
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
    
    chat_instances.clear()

# ====== HELPER FUNCTIONS ======
async def get_dynamic_knowledge_base():
    """Build knowledge base from database entries and web sources"""
    kb_content = DEFAULT_KNOWLEDGE_BASE + "\n\n"
    
    entries = await db.knowledge_entries.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    if entries:
        kb_content += "\n# Additional Information\n\n"
        categories = {}
        for entry in entries:
            cat = entry.get("category", "Other")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(entry)
        
        for cat_name, items in categories.items():
            kb_content += f"## {cat_name}\n\n"
            for item in items:
                kb_content += f"### {item.get('title', '')}\n"
                kb_content += f"{item.get('content', '')}\n\n"
    
    web_sources = await db.web_sources.find(
        {"is_active": True, "status": "completed"},
        {"_id": 0}
    ).to_list(100)
    
    if web_sources:
        kb_content += "\n# Information from Web Sources\n\n"
        for source in web_sources:
            if source.get("extracted_content"):
                kb_content += f"## {source.get('name', 'Web Source')}\n"
                if source.get('description'):
                    kb_content += f"*{source.get('description')}*\n\n"
                kb_content += f"{source.get('extracted_content', '')}\n\n"
    
    return kb_content

async def get_system_prompt(language: str = "it"):
    """Build system prompt with current settings, knowledge, and language"""
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    
    if not settings:
        settings = ChatbotSettings().model_dump()
    
    knowledge = await get_dynamic_knowledge_base()
    
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["it"])
    lang_instruction = lang_config["system_prompt"]
    
    return f"""You are a friendly and knowledgeable virtual assistant for Olbia Costa Smeralda Airport.

IMPORTANT LANGUAGE INSTRUCTION: {lang_instruction}

Your task is to help travelers by providing accurate information about airport services, areas, and points of interest.

Here is your knowledge base:

{knowledge}

Guidelines:
1. Be concise but complete in your responses
2. Use a friendly and professional tone
3. If appropriate, suggest related services
4. For real-time flight information, direct to {settings.get('live_flights_url', 'www.geasar.it/en/flights/live-flights')}
5. Mention the virtual tour when relevant: {settings.get('virtual_tour_url', 'https://tour.fairsgate.com/tour/olbia-ultimo')}
6. If the question is not about the airport, politely explain that you specialize only in airport assistance
7. ALWAYS respond in the language specified above
"""

# ====== PUBLIC API ROUTES ======
@api_router.get("/")
async def root():
    return {"message": "Trivor Virtual Assistant API - Multilingual"}

@api_router.get("/detect-language")
async def detect_language(request: Request):
    """Detect language based on IP address"""
    # Get client IP
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "127.0.0.1"
    
    country = await get_country_from_ip(ip)
    language = get_language_from_country(country)
    
    return {
        "ip": ip,
        "country": country,
        "language": language,
        "language_name": SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en"])["name"]
    }

@api_router.get("/languages")
async def get_supported_languages():
    """Get all supported languages with their configurations"""
    return {
        "languages": [
            {
                "code": code,
                "name": config["name"],
                "flag": config["flag"]
            }
            for code, config in SUPPORTED_LANGUAGES.items()
        ],
        "default": "it"
    }

@api_router.get("/language-config/{lang_code}")
async def get_language_config(lang_code: str):
    """Get full configuration for a specific language"""
    if lang_code not in SUPPORTED_LANGUAGES:
        lang_code = "en"  # Fallback to English
    
    config = SUPPORTED_LANGUAGES[lang_code]
    questions = SUGGESTED_QUESTIONS.get(lang_code, SUGGESTED_QUESTIONS["en"])
    
    return {
        "code": lang_code,
        **config,
        "suggested_questions": questions
    }

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
async def get_suggested_questions(lang: str = "it"):
    """Get suggested questions for a language"""
    # First check database
    questions = await db.suggested_questions.find({}, {"_id": 0}).to_list(100)
    if questions:
        return questions
    
    # Return language-specific defaults
    return SUGGESTED_QUESTIONS.get(lang, SUGGESTED_QUESTIONS["en"])

@api_router.get("/chatbot-settings")
async def get_chatbot_settings_public():
    settings = await db.chatbot_settings.find_one({"id": "main_settings"}, {"_id": 0})
    if not settings:
        settings = ChatbotSettings().model_dump()
    return {
        "bot_name": settings.get("bot_name", "Assistente Olbia Airport"),
        "welcome_message": settings.get("welcome_message", "Ciao! 👋 Sono l'assistente virtuale. Come posso aiutarti?"),
        "virtual_tour_url": settings.get("virtual_tour_url", ""),
        "live_flights_url": settings.get("live_flights_url", "")
    }

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    session_id = request.session_id or str(uuid.uuid4())
    language = request.language if request.language in SUPPORTED_LANGUAGES else "it"
    
    # Create unique key for session + language
    cache_key = f"{session_id}_{language}"
    
    # Get system prompt for the language
    system_prompt = await get_system_prompt(language)
    
    if cache_key not in chat_instances:
        chat_instances[cache_key] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=cache_key,
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
    
    chat_instance = chat_instances[cache_key]
    
    try:
        user_msg = UserMessage(text=request.message)
        response = await chat_instance.send_message(user_msg)
        
        chat_doc = {
            "session_id": session_id,
            "language": language,
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
    # Clear all language variants
    keys_to_remove = [k for k in chat_instances.keys() if k.startswith(session_id)]
    for key in keys_to_remove:
        del chat_instances[key]
    await db.chat_history.delete_many({"session_id": session_id})
    return {"message": "Session cleared", "session_id": session_id}

# ====== ADMIN API ROUTES ======

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
    background_tasks.add_task(fetch_web_source, source_obj.id)
    
    return {"id": source_obj.id, "message": "Source added, extracting content..."}

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
    
    await db.web_sources.update_one(
        {"id": source_id},
        {"$set": {"status": "pending", "error_message": ""}}
    )
    
    background_tasks.add_task(fetch_web_source, source_id)
    
    return {"message": "Refreshing..."}

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
    
    # Language stats
    pipeline = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}}}
    ]
    lang_stats = await db.chat_history.aggregate(pipeline).to_list(100)
    
    recent = await db.chat_history.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "total_knowledge": total_knowledge,
        "total_web_sources": total_web_sources,
        "language_stats": {item["_id"]: item["count"] for item in lang_stats if item["_id"]},
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
