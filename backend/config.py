"""
Configurazione condivisa per tutti i moduli Trivor
"""
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import HTTPBasic
import os

# Paths
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'trivor_db')]

# Security
security = HTTPBasic()

# Credentials
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "Trivor")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Trivor2024$")
TRIVORDOC_USERNAME = "Trivor"
TRIVORDOC_PASSWORD = "Trivorsuite26$"
TRIVORDOC_DELETE_PASSWORD = "Docanc"

# Gmail SMTP Configuration
GMAIL_USER = "trivorsrl@gmail.com"
GMAIL_APP_PASSWORD = "tapgdyhwnxfasgsk"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
