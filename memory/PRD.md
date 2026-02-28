# VisitTadasuni & Home Tadasuni - PRD

## Problema Originale
Modernizzare il sito web www.visittadasuni.it con interfaccia multilingue, chatbot AI e CMS per la gestione di eventi, attrazioni e immobili del borgo di Tadasuni in Sardegna.

## User Personas
- **Turisti**: Visitatori che cercano informazioni sul borgo, attrazioni, dove mangiare/dormire
- **Amministratori comunali**: Gestiscono contenuti, eventi e immobili tramite CMS
- **Potenziali residenti/investitori**: Cercano proprietà immobiliari da acquistare

## Requisiti Core

### 1. Sito Marketing Multilingue (VisitTadasuni)
- Landing page con hero section e info sul borgo
- Sezioni: Attrazioni, Eventi, Come Arrivare, Contatti
- Supporto 5 lingue: IT, EN, FR, ES, DE
- Chatbot AI integrato con GPT

### 2. CMS Eventi
- CRUD eventi con traduzioni multilingue
- Upload immagini multiple
- Gestione date e location

### 3. CMS Attrazioni Unificato
- Attrazioni turistiche (chiese, monumenti, natura)
- Dove Mangiare (ristoranti, bar, pizzerie)
- Dove Dormire (hotel, B&B, agriturismi)
- Itinerari turistici con waypoint

### 4. Home Tadasuni - CMS Immobili (COMPLETATO)
Sistema completo per la gestione immobiliare con:

#### Tab Anagrafica
- Denominazione, Ente Proprietario, Indirizzo
- **Dati Proprietario**: Nome, Cognome, Data Nascita, CF, Residenza, Telefono, Email, Riferimenti, Note
- Allegati sezione

#### Tab Classificazione
- Tipo Bene (edificato/non edificato)
- Tipologia (casa singola, villetta, appartamento, etc.)
- Destinazione d'uso
- Allegati sezione

#### Tab Dati Catastali
- Catasto Fabbricati: Sezione Urbana, Foglio, Particella, Subalterno, Categoria
- Catasto Terreni: Foglio, Particella
- Allegati sezione

#### Tab Dimensioni
- Superfici: Lorda, Fondiaria, Coperta, Scoperta
- N. Edifici, Piani F.T., Piani E.T., N. Vani
- Volumi E.T. e F.T.
- **Planimetrie Presenti** (checkbox)
- Allegati sezione

#### Tab Ubicazione
- Localizzazione OMI, Coordinate GPS
- Link Gemello Digitale
- Allegati sezione

#### Tab Certificazioni
- Certificato Energetico e Classe
- CDU (Certificato Destinazione Urbanistica)
- Allegati sezione

#### Tab Stato e Conservazione
- Anno Costruzione, Stato Conservazione
- **Data Ultima Manutenzione**
- Stato Occupazione con dettagli occupante
- Allegati sezione

#### Tab Vincoli e Conformità
- Presenza Vincoli e tipo
- Conformità Urbanistica e Catastale
- **Destinazione Urbanistica Dinamica** (lista con aggiunta nuove opzioni)
- Destinazione Prevista, Iter Cambio

#### Tab Impianti
- Checkbox: Idrico, Elettrico, Fognario, Riscaldamento, Internet
- **Lista Impianti Certificati** (dinamica con descrizione e data certificazione)
- Allegati sezione

#### Tab Marketing
- Prezzo Richiesto e al mq
- Flag "Mostra Prezzo Pubblicamente"
- Descrizione Narrativa, Punti di Forza
- Target Ideale, Potenzialità d'Uso
- Allegati sezione

#### Tab Referenti
- **Lista Referenti** (dinamica con nominativo e contatti)
- Checkbox "Pubblica nella Vetrina"

#### Funzionalità Aggiuntive
- **Galleria Immagini V2**: Upload, thumbnail preview, eliminazione singola foto
- **Export Excel/PDF**: Pulsanti nella toolbar per esportazione dati
- **Vetrina Pubblica**: Pagina ricerca con filtri avanzati

## Architettura Tecnica

### Stack
- **Frontend**: React, Tailwind CSS, React Router (HashRouter)
- **Backend**: FastAPI, Pydantic, Motor
- **Database**: MongoDB
- **AI**: OpenAI GPT via Emergent LLM Key

### File Principali
- `/app/frontend/src/App.js` (~4500 linee)
- `/app/backend/server.py` (~1710 linee)

### Credenziali CMS
- Events/Attractions: `visittadasuni` / `Tadasuni2025$`
- Chatbot: `chatbotadmin` / `ChatBot2025$`
- Immobili: `visittadasuni` / `Tadasuni2025$`

## Stato Implementazione

### Bug Fix (Febbraio 2026)
- [x] Fix messaggio errore salvataggio - ora mostra dettagli specifici
- [x] Fix aggiornamento allegati nelle tab - ora refresha editingImmobile dopo upload
- [x] Fix conversione campi numerici vuoti (da stringa vuota a null)
- [x] Aggiunta conferma prima di eliminare allegato
- [x] Aggiunto link "Borgo Experience" e "CMS Immobili" nella sezione Il Borgo

### Galleria Fotografica e 360° (Febbraio 2026)
- [x] Galleria fotografica con lightbox grande (1000x1000+)
- [x] Navigazione tra immagini con frecce e contatore
- [x] Supporto immagini 360° (Insta360 X5) con Photo Sphere Viewer
- [x] Backend: flag `is_360` per immagini panoramiche
- [x] Admin: pulsanti separati "+ Foto" e "+ 360°" per upload
- [x] Badge "360°" su thumbnail per foto panoramiche
- [x] Viewer panoramico interattivo (trascina per esplorare)

### Digital Twin Home - Tour Virtuale (Febbraio 2026)
- [x] Backend completo: API per Digital Twin, stanze, hotspot
- [x] Modelli: DigitalTwinHome, TwinRoom, TwinHotspot
- [x] Upload planimetria per ogni immobile
- [x] Upload stanze 360° con posizionamento sulla planimetria
- [x] Sistema di hotspot per collegare le stanze tra loro
- [x] Admin CMS: Tab "Digital Twin" con editor completo
- [x] Vetrina Pubblica: pulsante "Digital Twin Home" nel dettaglio immobile
- [x] Viewer interattivo con:
  - Sidebar planimetria con punti navigabili
  - Lista stanze con navigazione rapida
  - Hotspot per passare da una stanza all'altra
  - Vista 360° a schermo intero

### Completato (Dicembre 2025)
- [x] Sito marketing multilingue
- [x] Chatbot AI con knowledge base
- [x] CMS Eventi
- [x] CMS Attrazioni unificato (POI + Mangiare + Dormire + Itinerari)
- [x] CMS Immobili completo con tutti i campi richiesti
- [x] Dati proprietario completi
- [x] Allegati per ogni sezione
- [x] Liste dinamiche (Impianti, Referenti, Destinazioni Urbanistiche)
- [x] Planimetrie checkbox
- [x] Data ultima manutenzione
- [x] Galleria immagini con delete
- [x] Export Excel/PDF
- [x] Vetrina pubblica con filtri
- [x] Fix URL immagini per visualizzazione corretta

### Backlog Futuro
- [ ] Refactoring: Separare App.js in componenti modulari
- [ ] Refactoring: Separare server.py con APIRouter
- [ ] Integrazione Digital Twin (Trivor Workspace)
- [ ] Notifiche email per nuove richieste
- [ ] Dashboard analytics

## API Endpoints Chiave

### Immobili
- `GET/POST /api/immobili` - Lista/Crea
- `PUT/DELETE /api/immobili/{id}` - Modifica/Elimina
- `POST /api/immobili/{id}/images` - Upload immagine
- `DELETE /api/immobili/{id}/images/{img_id}` - Elimina immagine
- `POST /api/immobili/{id}/attachments` - Upload allegato
- `DELETE /api/immobili/{id}/attachments/{att_id}` - Elimina allegato
- `GET /api/immobili/export/excel` - Export CSV
- `GET /api/immobili/export/pdf` - Export PDF

## Note Tecniche Importanti
- URL immagini/allegati: `/api/uploads/{filename}`
- Uploads serviti da: `app.mount("/api/uploads", StaticFiles(...))`
- Frontend usa `BACKEND_URL + url` per costruire path completi
