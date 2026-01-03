# Digital Twins Italia - Back Office Soci

## Problem Statement
Sistema di gestione integrata Back Office per i soci dell'Associazione Digital Twins Italia.
Gestione iscrizioni, registri soci con anagrafica completa, ricerca avanzata e visualizzazione geografica su mappa Italia.

## Architecture
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI + Recharts + Leaflet
- **Backend**: FastAPI + Motor (async MongoDB driver) + GridFS per file
- **Database**: MongoDB Atlas
- **Auth**: Login fisso (DigitalTwin26 / Dgt_26$)

## User Personas
1. **Amministratore Associazione**: Gestisce anagrafica completa soci, carica documenti, monitora statistiche
2. **Segretario**: Consulta lista soci, cerca per regione/carica, esporta dati

## Core Requirements (Static)
- [x] Login con credenziali fisse
- [x] Tab Dashboard con statistiche
- [x] Tab Anagrafica CRUD soci (tutti i campi richiesti)
- [x] Tab Lista Soci con ricerca multi-testo e filtri
- [x] Tab Mappa Italia interattiva con Leaflet
- [x] Upload documenti allegati (PDF/JPG fino 6MB)
- [x] Dropdown incrementabili (dispositivo, qualifica)
- [x] Pre-caricamento dati dal file Excel (32 soci)

## What's Been Implemented
**03/01/2025**:
- Sistema completo MVP implementato
- Backend: 15+ API endpoints (auth, CRUD soci, file upload, stats, map-data)
- Frontend: 4 tab funzionanti (Dashboard, Anagrafica, Lista Soci, Mappa)
- 32 soci pre-caricati dal file Excel
- Mappa Italia con GeoJSON regioni e indicatori densità
- Design elegante dark theme (blu/oro) ispirato al sito ufficiale

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Login authentication
- [x] CRUD soci
- [x] Lista soci con ricerca
- [x] Mappa Italia

### P1 - High Priority (Next)
- [ ] Export lista soci (CSV/Excel)
- [ ] Stampa schede soci
- [ ] Filtro per qualifica

### P2 - Medium Priority
- [ ] Multi-utente con ruoli
- [ ] Log attività
- [ ] Backup automatico dati
- [ ] Notifiche scadenze quote

### P3 - Low Priority
- [ ] Integrazione email automatiche
- [ ] Dashboard avanzata con trend temporali
- [ ] App mobile PWA

## Next Tasks
1. Implementare export CSV/Excel della lista soci
2. Aggiungere funzione stampa scheda socio
3. Collegare a MongoDB Atlas con le credenziali fornite
4. Seconda fase: CMS per gestione pagine sito (TrivorPlatform)

## API Endpoints
- POST /api/auth/login
- GET/POST /api/soci
- GET/PUT/DELETE /api/soci/{id}
- POST /api/soci/{id}/documenti
- GET /api/documenti/{file_id}
- GET /api/dropdown/{category}
- POST /api/dropdown
- GET /api/stats
- GET /api/map-data
- POST /api/seed

## Credentials
- Login: DigitalTwin26 / Dgt_26$
- MongoDB Atlas: (da configurare in backend/.env)
