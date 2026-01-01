# 📚 TRIVOR COMPONENT CATALOG

> Catalogo completo delle componenti riutilizzabili del progetto Trivor.
> Aggiornato: 1 Gennaio 2026

---

## 🎯 Come Usare Questo Catalogo

Per riutilizzare un modulo in un nuovo progetto, dire all'agente:

```
"Crea un nuovo progetto per [Cliente X]. 
Usa i moduli [NomeModulo1] e [NomeModulo2] dal catalogo in /app/memory/COMPONENT_CATALOG.md"
```

---

## 📋 Indice Moduli

| Modulo | Descrizione | Dipendenze |
|--------|-------------|------------|
| [TrivorSuite](#trivorsuite) | Dashboard launcher principale | Auth |
| [TRIVORDOC](#trivordoc) | Gestione documentale | Auth, TrivorContacts (opz.) |
| [TrivorWEB](#trivorweb) | Gestione siti e hosting | Auth |
| [TrivorContacts](#trivorcontacts) | Rubrica contatti condivisa | Auth |
| [TrivorMEET](#trivormeet) | Video conferenze (Jitsi) | Auth |
| [CheckDB](#checkdb) | Monitoraggio database | Auth |
| [AdminCMS](#admincms) | Pannello admin sito pubblico | Auth (diversa) |
| [DigitalTwin](#digitaltwin) | Galleria tour virtuali | AdminCMS |

---

## 🔐 AUTENTICAZIONE

### File Backend
- `/app/backend/config.py` - Configurazione credenziali
- `/app/backend/auth.py` - Funzioni di verifica

### Credenziali Default
```python
# Admin CMS (sito pubblico)
ADMIN_USERNAME = "Trivor"
ADMIN_PASSWORD = "Trivor2024$"

# TrivorSuite (app interne)
TRIVORDOC_USERNAME = "Trivor"
TRIVORDOC_PASSWORD = "Trivorsuite26$"
TRIVORDOC_DELETE_PASSWORD = "Docanc"
```

### Come Personalizzare
1. Modificare valori in `/app/backend/config.py`
2. Oppure usare variabili ambiente: `ADMIN_USERNAME`, `ADMIN_PASSWORD`

---

## 🏠 TRIVORSUITE

### Descrizione
Dashboard centrale per lanciare tutte le applicazioni Trivor. Include card per ogni app con animazioni e stato.

### File Frontend
```
/app/frontend/src/TrivorSuite.js
```

### File Backend
Nessuno specifico - usa solo autenticazione

### Database
Nessuna collezione specifica

### Dipendenze
- Autenticazione TrivorSuite

### Configurazione
Modificare array `apps` in `TrivorSuite.js` per aggiungere/rimuovere applicazioni.

### Screenshot
Dashboard con card colorate per ogni app: TRIVORDOC, TrivorWEB, CheckDB, TrivorContacts, TrivorMEET.

---

## 📄 TRIVORDOC

### Descrizione
Sistema completo di gestione documentale con:
- Creazione/modifica documenti
- Upload allegati (max 20 per documento)
- Ricerca avanzata (include nomi allegati)
- Condivisione via Email e WhatsApp
- Statistiche e log attività

### File Frontend
```
/app/frontend/src/TrivorDoc.js
```

### File Backend
```
/app/backend/routes/trivordoc.py
/app/backend/models/__init__.py (modelli Documento*)
```

### Database Collections
```javascript
// trivordoc_documents
{
  id: "DOC-2025-0001",
  gruppo: "string",
  tipo_documento: "string",
  data_creazione: "ISO date",
  autore: "string",
  keywords: ["array"],
  categoria: "string",
  descrizione: "string",
  progetto: { cliente, descrizione, valore, ... },
  allegati: [{ nome, url, tipo, size }],
  created_at: "ISO",
  updated_at: "ISO"
}

// trivordoc_categories
{ name: "Fatture" }

// trivordoc_logs
{ action, doc_id, user, timestamp, details }
```

### API Endpoints
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/trivordoc/login | Login |
| GET | /api/trivordoc/documents | Lista documenti |
| POST | /api/trivordoc/documents | Crea documento |
| PUT | /api/trivordoc/documents/{id} | Modifica |
| DELETE | /api/trivordoc/documents/{id} | Elimina |
| POST | /api/trivordoc/documents/{id}/upload | Upload allegato |
| GET | /api/trivordoc/categories | Categorie |
| GET | /api/trivordoc/stats | Statistiche |
| POST | /api/trivordoc/share/email | Condividi email |
| POST | /api/trivordoc/share/whatsapp | Condividi WhatsApp |

### Dipendenze
- Autenticazione TrivorSuite
- Gmail SMTP (per condivisione email)
- TrivorContacts (opzionale, per selezionare destinatari)

### Configurazione SMTP
```python
# In /app/backend/config.py
GMAIL_USER = "email@gmail.com"
GMAIL_APP_PASSWORD = "app_password"
```

---

## 🌐 TRIVORWEB

### Descrizione
CMS per gestione siti web clienti:
- Anagrafica siti con dominio, hosting, FTP, database
- Gestione credenziali di accesso (tab Account)
- Alert scadenze hosting
- Statistiche costi

### File Frontend
```
/app/frontend/src/TrivorWeb.js
```

### File Backend
```
/app/backend/routes/trivorweb.py
/app/backend/models/__init__.py (modelli SitoWeb*, Hosting*, etc.)
```

### Database Collections
```javascript
// trivorweb_sites
{
  id: "SITE-2025-0001",
  nome_progetto: "string",
  dominio: "string",
  stato: "attivo|in_sviluppo|sospeso|scaduto",
  cliente: { nome, azienda, email, telefono, ... },
  hosting: { provider, tipo, piano, data_scadenza, ... },
  ftp: { host, username, password, porta },
  databases: [{ provider, tipo, host, username, password }],
  accounts: [{ servizio, username, password }],
  tecnologie: ["WordPress", "React"],
  costo_realizzazione: 0,
  costo_manutenzione_annuale: 0
}

// trivorweb_logs
{ action, site_id, user, timestamp, details }
```

### API Endpoints
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/trivorweb/sites | Lista siti |
| POST | /api/trivorweb/sites | Crea sito |
| PUT | /api/trivorweb/sites/{id} | Modifica |
| DELETE | /api/trivorweb/sites/{id} | Elimina |
| GET | /api/trivorweb/stats | Statistiche |

### Dipendenze
- Autenticazione TrivorSuite

---

## 👥 TRIVORCONTACTS

### Descrizione
Rubrica contatti condivisa con:
- Gestione contatti completa
- Gruppi/etichette
- Preferiti
- Integrazione con TRIVORDOC per condivisione

### File Frontend
```
/app/frontend/src/TrivorContacts.js
```

### File Backend
```
/app/backend/routes/contacts.py
/app/backend/models/__init__.py (modelli Contact*, Group*)
```

### Database Collections
```javascript
// trivor_contacts
{
  id: "CONT-00001",
  nome: "string",
  cognome: "string",
  email: "string",
  telefono: "string",
  whatsapp: "string",
  azienda: "string",
  ruolo: "string",
  indirizzo: "string",
  note: "string",
  gruppi: ["GRP-0001"],
  preferito: false,
  avatar_color: "#3B82F6"
}

// trivor_groups
{
  id: "GRP-0001",
  nome: "Clienti",
  descrizione: "string",
  colore: "#3B82F6"
}
```

### API Endpoints
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/contacts | Lista contatti |
| POST | /api/contacts | Crea contatto |
| PUT | /api/contacts/{id} | Modifica |
| DELETE | /api/contacts/{id} | Elimina |
| GET | /api/contacts/groups/list | Lista gruppi |
| POST | /api/contacts/groups | Crea gruppo |

### Dipendenze
- Autenticazione TrivorSuite

---

## 🎥 TRIVORMEET

### Descrizione
Video conferenze tramite Jitsi Meet (gratuito, senza limiti di tempo).
Apre le riunioni in una nuova scheda del browser.

### File Frontend
```
/app/frontend/src/TrivorMeet.js
```

### File Backend
Nessuno - integrazione client-side con Jitsi

### Come Funziona
```javascript
// Genera URL Jitsi dinamico
const meetingUrl = `https://meet.jit.si/trivor-${Date.now()}`;
window.open(meetingUrl, '_blank');
```

### Dipendenze
- Autenticazione TrivorSuite
- Nessuna API key richiesta

---

## 🔍 CHECKDB

### Descrizione
Utility per monitoraggio database MongoDB:
- Lista database e collezioni
- Statistiche dimensioni
- Health check
- Anteprima documenti

### File Frontend
Integrato in `TrivorSuite.js` come card

### File Backend
```
/app/backend/routes/checkdb.py
```

### API Endpoints
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/checkdb/databases | Lista DB |
| GET | /api/checkdb/status | Status DB corrente |
| GET | /api/checkdb/health | Health check |
| GET | /api/checkdb/collections/{name} | Dettaglio collezione |

### Dipendenze
- Autenticazione TrivorSuite

---

## ⚙️ ADMINCMS

### Descrizione
Pannello amministrazione sito pubblico:
- Gestione progetti portfolio
- Immagini hero homepage
- Messaggi contatto
- Digital Twin gallery

### File Frontend
```
/app/frontend/src/App.js (componente AdminDashboard)
```

### File Backend
```
/app/backend/routes/admin.py
/app/backend/routes/public.py
/app/backend/routes/spaces.py
```

### Database Collections
```javascript
// projects
{ id, title, client, category, description, image_url, featured, order }

// contact_messages
{ id, name, email, phone, subject, message, read }

// site_settings
{ id: "site_settings", hero_images: [{url, title}] }

// trivor_spaces (Digital Twin)
{ id, name_it, name_en, description_it, image_url, matterport_id, mpskin_url, is_public }
```

### Dipendenze
- Autenticazione Admin (diversa da TrivorSuite)

---

## 🏛️ DIGITALTWIN

### Descrizione
Galleria tour virtuali per homepage pubblica.
Supporta Matterport e MPSkin.

### File Frontend
```
/app/frontend/src/App.js (componente TourVirtualiSection)
```

### File Backend
```
/app/backend/routes/spaces.py
```

### API Endpoints
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/spaces | Lista pubblici |
| GET | /api/spaces/all | Lista tutti (admin) |
| POST | /api/spaces | Crea (admin) |
| PUT | /api/spaces/{id} | Modifica (admin) |
| DELETE | /api/spaces/{id} | Elimina (admin) |

### Dipendenze
- AdminCMS

---

## 📁 Struttura File Completa

```
/app/backend/
├── server.py           # Entry point principale
├── config.py           # Configurazione condivisa
├── auth.py             # Funzioni autenticazione
├── models/
│   └── __init__.py     # Tutti i modelli Pydantic
├── routes/
│   ├── __init__.py
│   ├── public.py       # Route pubbliche
│   ├── admin.py        # Admin CMS
│   ├── trivordoc.py    # Gestione documenti
│   ├── trivorweb.py    # Gestione siti
│   ├── contacts.py     # Rubrica contatti
│   ├── checkdb.py      # Monitoraggio DB
│   └── spaces.py       # Digital Twin
└── uploads/            # File caricati

/app/frontend/src/
├── App.js              # Homepage + Admin + Routing
├── TrivorSuite.js      # Dashboard launcher
├── TrivorDoc.js        # Gestione documentale
├── TrivorWeb.js        # Gestione siti
├── TrivorContacts.js   # Rubrica contatti
├── TrivorMeet.js       # Video conferenze
└── components/ui/      # Componenti Shadcn
```

---

## 🚀 Quick Start per Nuovo Progetto

1. **Copiare file base:**
   - `/app/backend/config.py`
   - `/app/backend/auth.py`
   - `/app/backend/models/__init__.py`
   - `/app/backend/server.py`

2. **Copiare i moduli desiderati:**
   - Selezionare da `/app/backend/routes/`
   - Selezionare da `/app/frontend/src/`

3. **Modificare `server.py`:**
   - Rimuovere import dei router non necessari
   - Rimuovere `app.include_router()` corrispondenti

4. **Personalizzare credenziali:**
   - Modificare `/app/backend/config.py`

5. **Personalizzare UI:**
   - Colori in componenti Frontend
   - Logo in `/app/frontend/public/`

---

*Documento generato automaticamente - Trivor Component Library v1.0*
