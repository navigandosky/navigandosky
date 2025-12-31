# Trivor Suite - Product Requirements Document

## Original Problem Statement
Sviluppare una suite aziendale completa per Trivor SRL che includa:
1. **Sito Web Pubblico**: Landing page corporate con portfolio progetti
2. **TrivorSuite**: Dashboard centrale per accedere alle applicazioni aziendali
3. **TRIVORDOC**: Sistema di gestione documentale sicuro e avanzato
4. **TrivorWEB**: CMS per gestione dati siti web clienti (credenziali, hosting, FTP)
5. **CheckDB**: Utility per monitoraggio database MongoDB
6. **Archivio Contatti**: Rubrica condivisa centralizzata per la suite
7. **TrivorMEET**: Modulo videoconferenze private

## User Personas
- **Admin Trivor**: Gestisce contenuti sito pubblico, utenti e configurazioni
- **Utente Suite**: Accede alle applicazioni aziendali per lavoro quotidiano

## Core Requirements

### Completed Features ✅

#### Sito Pubblico
- Landing page con hero dinamico
- Sezioni: Servizi, Tour Virtuali, Portfolio, Chi Siamo, Contatti
- Admin CMS per gestione progetti e immagini hero

#### TrivorSuite Dashboard
- Login con autenticazione Basic
- Dashboard con launcher per 5 applicazioni:
  - TRIVORDOC (blu)
  - TrivorWEB (viola)
  - CheckDB (verde)
  - Archivio Contatti (cyan)
  - TrivorMEET (rosa)

#### TRIVORDOC
- Dashboard statistiche documenti
- Griglia documenti con multi-selezione
- Form creazione/modifica documenti completo
- Upload multiplo allegati (max 20)
- Condivisione via Email (Gmail SMTP) e WhatsApp
- Preview allegati
- Integrazione selettore contatti nel modal condivisione

#### TrivorWEB
- CRUD completo per siti web clienti
- Campi: cliente, hosting, dominio, FTP, database, costi
- Gestione scadenze hosting/dominio

#### CheckDB
- Monitoraggio salute cluster MongoDB
- Statistiche per database e collezioni
- Visualizzazione documenti esempio

#### Archivio Contatti (NUOVO - Dicembre 2025)
- CRUD completo contatti
- Campi: nome, cognome, email, telefono, WhatsApp, azienda, ruolo, indirizzo, note
- Gestione gruppi/categorie
- Preferiti con toggle
- Ricerca e filtri
- Avatar colorati con iniziali
- Integrato in TRIVORDOC (modal condivisione)
- Integrato in TrivorMEET (selezione partecipanti)

#### TrivorMEET (NUOVO - Dicembre 2025)
- Landing page con hero e quick actions
- Creazione nuove riunioni
- Selezione partecipanti da Archivio Contatti
- Meeting room con:
  - Video webcam locale
  - Toggle audio/video
  - Condivisione schermo
  - Chat integrata
  - Copia link riunione
- Chiamata rapida da contatti recenti
- Storico riunioni (localStorage)

## Technical Architecture

### Frontend
- React 18 con Create React App
- TailwindCSS per styling
- react-router-dom (HashRouter)
- lucide-react per icone

### Backend
- FastAPI (Python)
- Motor per MongoDB async
- Autenticazione Basic Auth
- SMTP Gmail per invio email

### Database
- MongoDB Atlas
- Collezioni:
  - `projects`, `messages`, `site_settings` (sito pubblico)
  - `trivordoc_documents`, `trivordoc_categories`, `trivordoc_logs`
  - `trivorweb_sites`
  - `trivor_contacts`, `trivor_contact_groups`

## API Endpoints

### Contacts API (/api/contacts/*)
- `GET /api/contacts` - Lista contatti con filtri
- `GET /api/contacts/{id}` - Singolo contatto
- `POST /api/contacts` - Crea contatto
- `PUT /api/contacts/{id}` - Aggiorna contatto
- `DELETE /api/contacts/{id}` - Elimina contatto
- `POST /api/contacts/{id}/toggle-preferito` - Toggle preferito

### Groups API (/api/contacts/groups/*)
- `GET /api/contacts/groups` - Lista gruppi
- `POST /api/contacts/groups` - Crea gruppo
- `PUT /api/contacts/groups/{id}` - Aggiorna gruppo
- `DELETE /api/contacts/groups/{id}` - Elimina gruppo

## Test Results (31 Dicembre 2025)
- Backend: 100% (16/16 test passati)
- Frontend: 100% (tutte funzionalità verificate)
- File test: `/app/tests/test_trivor_suite.py`
- Report: `/app/test_reports/iteration_1.json`

## Credentials
- **TrivorSuite**: `Trivor_doc` / `Doc_trivor$`
- **Admin CMS**: `admin` / `Trivor2024$`
- **Password eliminazione doc**: `Docanc`

## Known Limitations
- TrivorMEET: Le videochiamate funzionano solo localmente (no WebRTC peer-to-peer)
- File upload: Max 20 allegati per documento
- Email: Richiede Google App Password configurata

## Backlog (P2-P3)

### P2 - Prossimi Sviluppi
- TrivorMEET: Implementare WebRTC per videochiamate reali peer-to-peer
- TrivorMEET: Registrazione riunioni
- Archivio Contatti: Import/Export CSV

### P3 - Futuri
- TrivorCRM: Gestione clienti e pipeline vendite
- TrivorTask: Gestione attività e progetti
- Portfolio interattivo con gallery avanzata
- Sezione Tecnologie nel sito pubblico

## Files Reference
- `/app/frontend/src/App.js` - Router principale
- `/app/frontend/src/TrivorSuite.js` - Dashboard suite
- `/app/frontend/src/TrivorDoc.js` - Gestione documenti
- `/app/frontend/src/TrivorWeb.js` - Gestione siti web
- `/app/frontend/src/TrivorContacts.js` - Archivio contatti
- `/app/frontend/src/TrivorMeet.js` - Videoconferenze
- `/app/backend/server.py` - API backend
