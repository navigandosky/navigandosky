===============================================
    VISIT TADASUNI - SITO WEB MODERNO + CMS
===============================================

CONTENUTO DEL PACCHETTO:
------------------------
- index.html        : Homepage del sito
- static/           : Cartella con CSS e JavaScript
  - css/            : Fogli di stile
  - js/             : Script JavaScript

PAGINE DISPONIBILI:
-------------------
- /              : Homepage
- /eventi        : Pagina eventi pubblica
- /admin         : Pannello CMS amministrativo

CREDENZIALI ADMIN:
------------------
Username: admin
Password: tadasuni2025

COME PUBBLICARE VIA FTP:
------------------------
1. Carica TUTTI i file e le cartelle sul tuo server web
2. Assicurati che index.html sia nella root del dominio
3. Mantieni la struttura delle cartelle intatta

NOTA IMPORTANTE SUL BACKEND:
----------------------------
Questo sito RICHIEDE il backend per:
- Chatbot AI
- Sistema CMS eventi
- Form di contatto

CONFIGURAZIONE BACKEND (NECESSARIO):
------------------------------------
Il backend Python FastAPI è in /app/backend/

1. Requisiti server:
   - Python 3.11+
   - MongoDB

2. Installazione:
   cd /app/backend
   pip install -r requirements.txt

3. Variabili ambiente (.env):
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="tadasuni_db"
   CORS_ORIGINS="*"
   EMERGENT_LLM_KEY="tua-chiave-llm"
   ADMIN_USERNAME="admin"
   ADMIN_PASSWORD="tadasuni2025"

4. Avvio server:
   uvicorn server:app --host 0.0.0.0 --port 8001

5. Aggiorna l'URL del backend nel frontend:
   Modifica REACT_APP_BACKEND_URL in /app/frontend/.env

FUNZIONALITÀ CMS:
-----------------
✓ Crea/Modifica/Elimina eventi
✓ Upload fino a 3 immagini per evento
✓ Supporto multilingue (IT, EN, FR, ES, DE)
✓ Pubblica/Nascondi eventi
✓ Categorie: evento, notizia, cultura, musica, tradizione

SUPPORTO LINGUE:
----------------
- Italiano (default)
- English
- Français
- Español
- Deutsch

CARATTERISTICHE:
----------------
✓ Design moderno e responsive
✓ Hero section con immagine panoramica
✓ Sezione Gemello Digitale (iframe Fairsgate)
✓ Pagina eventi con CMS
✓ Pannello admin per gestione contenuti
✓ Upload immagini (max 3 per evento)
✓ Chatbot AI (OpenAI)
✓ Form di contatto con database
✓ Multilingue completo

CREDITI:
--------
Sviluppato per il Comune di Tadasuni
Gemello Digitale powered by Fairsgate
