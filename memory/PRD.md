# Trivor Suite - Product Requirements Document

## Original Problem Statement
Suite aziendale completa per Trivor SRL che include:
1. **Sito Web Pubblico**: Landing page corporate con portfolio progetti
2. **TrivorSuite**: Dashboard centrale per applicazioni aziendali
3. **TRIVORDOC**: Sistema gestione documentale avanzato
4. **TrivorWEB**: CMS per gestione siti web clienti
5. **CheckDB**: Utility monitoraggio database MongoDB
6. **Archivio Contatti**: Rubrica condivisa centralizzata
7. **TrivorMEET**: Videoconferenze con Jitsi (gratuito, senza limiti)
8. **Gallery Digital Twin**: Tour virtuali Matterport/MPSkin dinamici

---

## Completed Features ✅

### Sito Pubblico (31 Dicembre 2025)
- ✅ Landing page con Hero dinamico
- ✅ Nuovo slogan: "Valorizziamo il Patrimonio Turistico, Ambientale Culturale"
- ✅ Sottotitolo: "Innovazione e Tecnologia al Servizio del Turismo e della Cultura"
- ✅ Logo oro trasparente in header e footer
- ✅ Gallery Digital Twin (ex Tour Virtuali) - Dinamica da CMS
- ✅ Popup viewer per tour Matterport/MPSkin a schermo intero
- ✅ Pulsanti Admin + Trivor Suite sia in header che footer
- ✅ Hero images più visibili (ridotta opacità overlay)

### Admin CMS (`/#/admin`)
- ✅ Credenziali: `Trivor` / `Trivor2024$`
- ✅ Gestione Progetti portfolio
- ✅ **Gestione Digital Twin** (NUOVO):
  - Immagine copertina (upload o URL)
  - Nome multilingua (IT/EN)
  - Descrizione multilingua
  - Model ID Matterport
  - URL MPSkin alternativo
  - Ordine visualizzazione
  - Toggle visibilità
- ✅ Gestione Immagini Hero
- ✅ Visualizzazione messaggi
- ✅ **Catalogo Moduli** - Documentazione componenti per sviluppatori
- ✅ **Utenti Account** - Gestione utenti TrivorAccount
- ✅ **Configurazione Sito** (NUOVO 1 Gennaio 2026):
  - Dati azienda (nome, ragione sociale, P.IVA, slogan, logo)
  - Contatti (email, PEC, telefoni, WhatsApp)
  - Sede legale (indirizzo, città, provincia, CAP)
  - Social media (Facebook, Instagram, LinkedIn, Twitter, YouTube)
  - Link progetti personalizzabili
  - Footer dinamico che legge i dati dall'API

### TrivorSuite (`/#/suite`)
- ✅ Credenziali: `Trivor` / `Trivorsuite26$`
- ✅ Dashboard con 6 applicazioni:
  - TRIVORDOC (blu)
  - TrivorWEB (viola)
  - CheckDB (verde)
  - Archivio Contatti (cyan)
  - TrivorMEET (rosa)
  - **TrivorAccount (ambra) - NUOVO**

### TRIVORDOC
- ✅ Dashboard statistiche documenti
- ✅ Griglia documenti con multi-selezione
- ✅ Upload multiplo allegati (max 20)
- ✅ Condivisione via Email/WhatsApp
- ✅ Selettore contatti integrato nel modal condivisione
- ✅ Preview allegati
- ✅ **Ricerca estesa ai nomi file allegati** (NUOVO)

### TrivorWEB
- ✅ CRUD siti web clienti
- ✅ Fix lampeggio pagina (useCallback)
- ✅ Campi URL accettano formati flessibili (www.sito.it o https://...)
- ✅ Tab Cliente: Azienda a sx, Referente a dx
- ✅ **Tab Account** (NUOVO):
  - Lista credenziali servizi (Servizio, Username, Password)
  - Copia negli appunti
  - Mostra/nascondi password

### Archivio Contatti
- ✅ CRUD completo contatti con gruppi
- ✅ Fix lampeggio pagina (useCallback)
- ✅ Integrato in TRIVORDOC e TrivorMEET

### TrivorMEET
- ✅ Videoconferenze con Jitsi Meet
- ✅ **Link diretto** (nessun limite di tempo)
- ✅ Creazione riunioni con selezione partecipanti
- ✅ Chiamata rapida da contatti
- ✅ Condivisione link via WhatsApp/Email
- ✅ Storico riunioni

### TrivorAccount (`/#/trivoraccount`) - NUOVO 1 Gennaio 2026
- ✅ Archivio credenziali con categorie personalizzabili
- ✅ Campi: Categoria, Servizio, Link, User, Password, OTP, 2FA
- ✅ Supporto doppia verifica (Mail, SMS, App Authenticator)
- ✅ Ricerca multipla su servizio, user, link
- ✅ Filtro per categoria
- ✅ Condivisione credenziali via email (Gmail SMTP)
- ✅ Export Excel con o senza filtri
- ✅ Copia rapida user/password negli appunti
- ✅ Toggle visibilità password
- ✅ Statistiche: totale account, con OTP, con 2FA

---

## Credentials

| Applicazione | Username | Password |
|-------------|----------|----------|
| Admin CMS | Trivor | Trivor2024$ |
| TrivorSuite | Trivor | Trivorsuite26$ |
| TRIVORDOC | Trivor | Trivorsuite26$ |

---

## API Endpoints Principali

- `/api/digital-twins` - CRUD Gallery Digital Twin
- `/api/contacts` - CRUD Contatti
- `/api/trivordoc/documents` - Documenti (ricerca include allegati)
- `/api/trivorweb/sites` - Siti web (include tab accounts)
- `/api/trivoraccount/accounts` - Gestione credenziali e password
- `/api/account-users/users` - Gestione utenti TrivorAccount
- `/api/site-config` - Configurazione sito (GET pubblico, PUT admin)

---

## Files Reference

### Frontend
- `/app/frontend/src/App.js` - Sito pubblico + Admin CMS
- `/app/frontend/src/TrivorSuite.js` - Dashboard suite
- `/app/frontend/src/TrivorDoc.js` - Gestione documenti
- `/app/frontend/src/TrivorWeb.js` - Gestione siti web
- `/app/frontend/src/TrivorContacts.js` - Archivio contatti
- `/app/frontend/src/TrivorMeet.js` - Videoconferenze
- `/app/frontend/src/TrivorAccount.js` - Gestione credenziali

### Backend (Refactored - 1 Gennaio 2026)
- `/app/backend/server.py` - Entry point principale (57 righe)
- `/app/backend/config.py` - Configurazione condivisa
- `/app/backend/auth.py` - Funzioni autenticazione
- `/app/backend/models/__init__.py` - Modelli Pydantic
- `/app/backend/routes/`
  - `admin.py` - Admin CMS
  - `public.py` - Route pubbliche
  - `trivordoc.py` - Gestione documenti
  - `trivorweb.py` - Gestione siti web
  - `contacts.py` - Rubrica contatti
  - `trivoraccount.py` - Gestione credenziali
  - `checkdb.py` - Monitoraggio DB
  - `digital_twins.py` - Digital Twin gallery

---

## Component Catalog
📚 Catalogo completo moduli: `/app/memory/COMPONENT_CATALOG.md`

---

## Backlog (P2-P3)

### Prossimi sviluppi
- Verifica completa pre-deploy
- Test regressione tutte le funzionalità
- Ottimizzazione performance

### Futuri
- TrivorCRM: Gestione clienti
- TrivorTask: Gestione attività
- POI (Points of Interest) per Digital Twin con audioguide
- Import/Export CSV contatti

---

## Logo Assets
- **Logo oro trasparente**: `https://customer-assets.emergentagent.com/job_9ae566ba-cbe1-4f57-8e5e-483d01cf8ff3/artifacts/p9qzdaz3_TRIVOR_Logo_Oro_Trasparente.png`

---

---

## Changelog

### 1 Gennaio 2026 - TrivorAccount + Backend Refactoring
- ✅ **NUOVO MODULO: TrivorAccount**
  - Gestione credenziali e password
  - Categorie personalizzabili (Mail, Banca, Servizi Web, etc.)
  - Supporto OTP e doppia verifica
  - Export Excel con filtri
  - Invio credenziali via email
- ✅ **REFACTORING BACKEND COMPLETATO**
  - Diviso `server.py` (1926 righe) in 12 file modulari
  - Creato catalogo componenti `/app/memory/COMPONENT_CATALOG.md`
  - Catalogo visibile nel CMS Admin
- ✅ **FIX URL IMMAGINI**
  - Corretto problema URL assoluti/relativi per hero e digital twins

### 31 Dicembre 2025
- Digital Twin Gallery dinamica
- Tab Account in TrivorWEB
- Ricerca allegati in TRIVORDOC
- Fix lampeggio pagina (useCallback)
- TrivorMEET con Jitsi

---

*Ultimo aggiornamento: 1 Gennaio 2026*
