# SmartDomo - PRD (Product Requirements Document)

## Problema Originale
Costruire un'applicazione "SmartDomo" per la gestione di un edificio smart con:
- Gestione elettrodomestici, centri assistenza, manutenzioni e ticket
- Integrazione SmartThings, Ezviz e Matterport
- Gemello digitale 3D interattivo

## Architettura
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Integrazioni**: SmartThings, Ezviz, Matterport SDK, Open-Meteo, Emergent LLM

## Funzionalità Implementate

### Core Features
- [x] Dashboard principale con tab multipli
- [x] Gestione elettrodomestici (CRUD completo)
- [x] Gestione centri assistenza
- [x] Sistema ticket con stati unificati
- [x] Calendario manutenzioni
- [x] Assistente AI con azioni interattive
- [x] Generazione QR code
- [x] Gestione planimetrie

### Integrazioni
- [x] **SmartThings** - 22 dispositivi (soggetto a rate-limiting)
- [x] **Ezviz** - 7 telecamere (API EU Open Platform)
- [x] **Open-Meteo** - Meteo in tempo reale
- [x] **Matterport SDK** - Integrazione completa (10/01/2026)

### Matterport SDK Integration (10/01/2026)
- [x] SDK Key configurata: `59wwqhip77fxkqiurcae74fed`
- [x] Space ID: `j1r4zUjanif`
- [x] Connessione SDK con badge "SDK Connesso"
- [x] Caricamento automatico Mattertag (5+ POI)
- [x] Navigazione programmatica ai tag
- [x] Controlli fullscreen e refresh
- [x] **Creazione POI con visualizzazione in 3D** (10/01/2026)
- [x] **Acquisizione coordinate dalla vista 3D** (10/01/2026)
- [x] **Tag visibili nella vista Matterport** (10/01/2026)

### Gestione Spazi 3D & POI (10/01/2026)
- [x] Archivio spazi Matterport multi-spazio
- [x] Import selettivo tag da Matterport
- [x] Database POI con traduzioni multilingue (IT, EN, DE, FR, ES)
- [x] Traduzione automatica via AI (GPT)
- [x] Generazione audio TTS per audioguide
- [x] Upload allegati (PDF, immagini, video)
- [x] Creazione POI da coordinate 3D
- [x] **Visualizzazione POI creati nella vista 3D** (10/01/2026)
- [x] Collegamento POI ↔ Elettrodomestici

### UI/UX Improvements (10/01/2026)
- [x] Migliorato contrasto colori nei dialog
- [x] Sfondo dialog: `bg-slate-800` per migliore leggibilità
- [x] Input con sfondo `bg-slate-700` e testo bianco
- [x] Box verde per posizione acquisita
- [x] Pulsanti con colori distintivi (cyan/green)

### Database Migration (10/01/2026)
- [x] Stati manutenzioni: `pianificata` → `aperto`, `completata` → `completato`
- [x] Stati ticket: `risolto` → `completato`

## Problemi Noti

### P1 - SmartThings Rate Limiting
- **Descrizione**: Errori 429 quando troppe chiamate API simultanee
- **Impatto**: Dati mancanti al caricamento iniziale (Clima, Stato Sistema)
- **Soluzione proposta**: Implementare caching backend con TTL 60-120s
- **Token attuale**: `domoticbrain` (placeholder - RICHIEDE TOKEN VALIDO)

### P2 - Token SmartThings Non Valido
- **Descrizione**: `SMARTTHINGS_TOKEN=domoticbrain` non è un PAT valido
- **Impatto**: Tutti gli endpoint SmartThings falliscono con 401
- **Soluzione**: Utente deve fornire il PAT corretto

## API Endpoints Principali

### Matterport
- `GET /api/matterport/spaces` - Lista spazi
- `POST /api/matterport/spaces` - Crea spazio
- `GET /api/matterport/pois` - Lista POI
- `POST /api/matterport/spaces/{id}/import-tags` - Importa tag
- `POST /api/matterport/pois/{id}/translate` - Traduci POI
- `POST /api/matterport/pois/{id}/generate-audio` - Genera audio TTS
- `POST /api/matterport/pois/{id}/attachments` - Upload allegati

### Altri
- `GET /api/elettrodomestici` - Lista elettrodomestici
- `GET /api/manutenzioni` - Lista manutenzioni
- `GET /api/tickets` - Lista ticket
- `GET /api/smartthings/devices` - Dispositivi SmartThings
- `GET /api/ezviz/cameras` - Telecamere Ezviz

## File di Riferimento
- `backend/server.py` - API monolitica (da refactorare)
- `frontend/src/MatterportViewer.js` - Componente SDK Matterport
- `frontend/src/MatterportManager.js` - Gestione Spazi e POI
- `frontend/src/SmartBuildingDashboard.js` - Dashboard SmartDomo
- `frontend/src/App.js` - Routing principale

## Prossimi Task

### P0 - Alta Priorità
1. ~~Integrazione Matterport SDK~~ ✅ COMPLETATO
2. Implementare caching SmartThings
3. Ricevere token SmartThings valido

### P1 - Media Priorità
4. Refactoring server.py in moduli
5. Test end-to-end completo

### P2 - Bassa Priorità
6. Multi-tenancy
7. Analisi storica consumi
8. QR code scanning
9. Notifiche push

## Credenziali (Backend .env)
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed
- `MATTERPORT_SPACE_ID`: j1r4zUjanif
- `EZVIZ_APPKEY`: Configurato (AccessToken EU)
- `SMARTTHINGS_TOKEN`: **DA CONFIGURARE** (attuale è placeholder)
- `EMERGENT_LLM_KEY`: Configurato

---
*Ultimo aggiornamento: 10 Gennaio 2026*
