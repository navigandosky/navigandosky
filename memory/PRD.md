# Digital Twins Italia - Back Office Soci

## Problem Statement
Sistema di gestione integrata Back Office per i soci dell'Associazione Digital Twins Italia.
Gestione iscrizioni, registri soci con anagrafica completa, ricerca avanzata, visualizzazione geografica su mappa Italia e comunicazioni email ai soci.

## Architecture
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI + Recharts + Leaflet
- **Backend**: FastAPI + Motor (async MongoDB driver) + GridFS per file + SMTP per email
- **Database**: MongoDB Atlas
- **Auth**: Login fisso (DigitalTwin26 / Dgt_26$)
- **Email**: SMTP Gmail (associazionedigitaltwinsitalia@gmail.com)

## User Personas
1. **Amministratore Associazione**: Gestisce anagrafica completa soci, carica documenti, monitora statistiche, invia comunicazioni
2. **Segretario**: Consulta lista soci, cerca per regione/carica, invia circolari e convocazioni

## Core Requirements (Static)
- [x] Login con credenziali fisse
- [x] Tab Dashboard con statistiche
- [x] Tab Anagrafica CRUD soci (tutti i campi richiesti)
- [x] Tab Lista Soci con ricerca multi-testo e filtri
- [x] Tab Mappa Italia interattiva con Leaflet
- [x] Upload documenti allegati (PDF/JPG fino 6MB)
- [x] Dropdown incrementabili (dispositivo, qualifica)
- [x] Pre-caricamento dati dal file Excel (32 soci)
- [x] Tab Comunicazioni con gestione invio email

## What's Been Implemented
**03/01/2025**:
- Sistema completo MVP implementato
- Backend: 15+ API endpoints (auth, CRUD soci, file upload, stats, map-data)
- Frontend: 4 tab funzionanti (Dashboard, Anagrafica, Lista Soci, Mappa)
- 32 soci pre-caricati dal file Excel
- Mappa Italia con GeoJSON regioni e indicatori densità
- Design elegante dark theme (blu/oro) ispirato al sito ufficiale

**03/01/2025 - Update**:
- Fix colore dropdown (testo bianco su sfondo nero)
- Mappa mostra città e dispositivo (PRO2, PRO3) per ogni socio
- Tab Comunicazioni completo:
  - Creazione comunicazioni (tipo, oggetto, descrizione)
  - Selezione destinatari con checkbox e pulsanti Tutti/Nessuno
  - Upload allegati (PDF, JPG, DOC, XLS fino 6MB)
  - Archivio comunicazioni con stati (bozza, inviata, errore)
  - Invio email via SMTP Gmail
- API comunicazioni (CRUD + invio)

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Login authentication
- [x] CRUD soci
- [x] Lista soci con ricerca
- [x] Mappa Italia
- [x] Tab Comunicazioni

### P1 - High Priority (Next)
- [ ] Export lista soci (CSV/Excel)
- [ ] Stampa schede soci
- [ ] Configurare App Password Gmail per SMTP produzione

### P2 - Medium Priority
- [ ] Multi-utente con ruoli
- [ ] Log attività
- [ ] Backup automatico dati
- [ ] Notifiche scadenze quote

### P3 - Low Priority
- [ ] Dashboard avanzata con trend temporali
- [ ] App mobile PWA
- [ ] Integrazione MongoDB Atlas

## Next Tasks
1. Configurare App Password Gmail (2FA) per invio email in produzione
2. Implementare export CSV/Excel della lista soci
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
- GET/POST /api/comunicazioni
- GET/PUT/DELETE /api/comunicazioni/{id}
- POST /api/comunicazioni/{id}/allegati
- POST /api/comunicazioni/{id}/invia
- GET /api/comunicazioni-tipi

## Credentials
- Login: DigitalTwin26 / Dgt_26$
- SMTP: associazionedigitaltwinsitalia@gmail.com / digitaltwins25
- MongoDB Atlas: (da configurare)
