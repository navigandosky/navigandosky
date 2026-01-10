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
- [ ] **SmartThings** - ⚠️ RICHIEDE TOKEN VALIDO (attualmente 401 Unauthorized)
- [x] **Ezviz** - 7 telecamere (API EU Open Platform)
- [x] **Open-Meteo** - Meteo in tempo reale
- [x] **Matterport SDK** - Integrazione completa ✅

### Matterport SDK Integration (10/01/2026)
- [x] SDK Key configurata: `59wwqhip77fxkqiurcae74fed`
- [x] Space ID: `j1r4zUjanif`
- [x] Connessione SDK con badge "SDK Connesso"
- [x] Caricamento automatico Mattertag (5+ POI)
- [x] Navigazione programmatica ai tag
- [x] Controlli fullscreen e refresh
- [x] Creazione POI con visualizzazione in 3D
- [x] Acquisizione coordinate dalla vista 3D
- [x] Tag visibili nella vista Matterport

### Gestione Spazi 3D & POI (10/01/2026)
- [x] Archivio spazi Matterport multi-spazio
- [x] Import selettivo tag da Matterport
- [x] Database POI con traduzioni multilingue (IT, EN, DE, FR, ES)
- [x] Traduzione automatica via AI (GPT)
- [x] Generazione audio TTS per audioguide
- [x] Upload allegati (PDF, immagini, video)
- [x] Creazione POI da coordinate 3D
- [x] Visualizzazione POI creati nella vista 3D
- [x] **Lista POI compatta e numerata** ✅ (10/01/2026)
- [x] **Tour guidato automatico** ✅ (10/01/2026)
- [x] **Layout più ampio** ✅ (10/01/2026)
- [x] **Fix navigazione con fallback** ✅ (10/01/2026)

### UI/UX Improvements (10/01/2026)
- [x] Migliorato contrasto colori nei dialog
- [x] Sfondo dialog: `bg-slate-800` per migliore leggibilità
- [x] Input con sfondo `bg-slate-700` e testo bianco
- [x] Box verde per posizione acquisita
- [x] Pulsanti con colori distintivi (cyan/green)
- [x] Lista POI compatta con numeri progressivi
- [x] Tour guidato con progress bar e possibilità di interruzione

### Database Migration (10/01/2026)
- [x] Stati manutenzioni: `pianificata` → `aperto`, `completata` → `completato`
- [x] Stati ticket: `risolto` → `completato`

## Problemi Noti

### P0 - SmartThings Token Non Valido (CRITICO)
- **Descrizione**: `SMARTTHINGS_TOKEN=domoticbrain` non è un PAT valido
- **Impatto**: Tutti gli endpoint SmartThings falliscono con 401/520
- **Soluzione**: Utente deve fornire il PAT corretto da https://account.smartthings.com/tokens

### P2 - SmartThings Rate Limiting (dopo fix token)
- **Descrizione**: Errori 429 quando troppe chiamate API simultanee
- **Impatto**: Dati mancanti al caricamento iniziale (Clima, Stato Sistema)
- **Soluzione proposta**: Implementare caching backend con TTL 60-120s

## API Endpoints Principali

### Matterport
- `GET /api/matterport/spaces` - Lista spazi
- `POST /api/matterport/spaces` - Crea spazio
- `GET /api/matterport/pois` - Lista POI (9 POI attualmente)
- `POST /api/matterport/spaces/{id}/import-tags` - Importa tag
- `POST /api/matterport/pois/{id}/translate` - Traduci POI
- `POST /api/matterport/pois/{id}/generate-audio` - Genera audio TTS
- `POST /api/matterport/pois/{id}/attachments` - Upload allegati

### Altri
- `GET /api/elettrodomestici` - Lista elettrodomestici (8)
- `GET /api/manutenzioni` - Lista manutenzioni (8)
- `GET /api/tickets` - Lista ticket
- `GET /api/smartthings/devices` - Dispositivi SmartThings (⚠️ 401 error)
- `GET /api/ezviz/cameras` - Telecamere Ezviz (funzionante)

## File di Riferimento
- `backend/server.py` - API monolitica (da refactorare)
- `frontend/src/MatterportViewer.js` - Componente SDK Matterport
- `frontend/src/MatterportManager.js` - Gestione Spazi e POI
- `frontend/src/SmartBuildingDashboard.js` - Dashboard SmartDomo
- `frontend/src/App.js` - Routing principale

## Prossimi Task

### P0 - Alta Priorità
1. ✅ ~~Integrazione Matterport SDK~~ COMPLETATO
2. ✅ ~~Lista POI compatta e numerata~~ COMPLETATO
3. ✅ ~~Tour guidato~~ COMPLETATO
4. ✅ ~~Fix navigazione POI~~ COMPLETATO
5. ⏳ Ricevere token SmartThings valido da utente
6. ⏳ Implementare caching SmartThings (dopo fix token)

### P1 - Media Priorità
7. Refactoring server.py in moduli
8. Test end-to-end completo

### P2 - Bassa Priorità
9. Multi-tenancy
10. Analisi storica consumi
11. QR code scanning
12. Notifiche push
13. Restauro sito Trivor.it

## Credenziali (Backend .env)
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed
- `MATTERPORT_SPACE_ID`: j1r4zUjanif
- `EZVIZ_APPKEY`: Configurato (AccessToken EU)
- `SMARTTHINGS_TOKEN`: **DA CONFIGURARE** (attuale `domoticbrain` è placeholder)
- `EMERGENT_LLM_KEY`: Configurato

---
*Ultimo aggiornamento: 10 Gennaio 2026*
