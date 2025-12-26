# 📋 ARCHIVIO COMMESSE - SMARTBUILDING

**Progetto:** SmartBuilding - Gestione Immobili Intelligente  
**Sottocomponente:** smartdomo-central  
**Cliente:** Trivor.it  
**Avvio:** Dicembre 2024  
**Ultimo aggiornamento:** 26 Dicembre 2024

---

## 🎯 OBIETTIVO PROGETTO

Applicazione web per la gestione intelligente di immobili con:
- Visualizzazione 3D tramite Matterport
- Gestione elettrodomestici con monitoraggio consumi
- Pianificazione manutenzioni
- Integrazione smart home (prese intelligenti)
- Integrazione SmartThings (22 dispositivi) ✅
- Integrazione telecamere Ezviz (7 telecamere) ✅
- Architettura multi-tenant (multi-utente)

---

## 🆕 FASE 2.2 - INTEGRAZIONI COMPLETE (26/12/2024) - COMPLETATA ✅

### Integrazione Ezviz ✅
- [x] 7 telecamere connesse e funzionanti
- [x] Endpoint EU corretto: `https://ieuopen.ezvizlife.com`
- [x] AccessToken configurato (valido fino 2026)
- [x] Telecamere:
  - Veranda (K40858151) - CS-C8C-A0-1F2WFL1
  - Via Corbezzoli (BB1774574) - CS-C8W-A0-1F4WKFL
  - X5S DVR (F38838622) - CS-X5S-8W
  - Cortile dependance (J23290565) - CS-CTQ3N-A0-3G2WFL1
  - Cortile Sx (G52097644) - CS-C8C-A0-1F2WF
  - Via letto Tetto (J23290698) - CS-CTQ3N-A0-3G2WFL1
  - Muro viale Murichessa (G52097546) - CS-C8C-A0-1F2WF

### Integrazione SmartThings ✅
- [x] 22 dispositivi connessi in 6 stanze
- [x] Token: 9a9bd2a1-6484-40c2-aa38-e77dd72cc36e
- [x] Sensore temperatura/umidità funzionante (24.1°C, 46%)
- [x] Stanze configurate:
  - Accessi esterni (3 dispositivi): Cancelli auto/pedonale
  - Acqua (3 dispositivi): Autoclave, Abbanoa, Idropulitrice
  - All'aperto (6 dispositivi): Irrigazione, zone H2O
  - Living (4 dispositivi): Temperatura, TV Samsung, Monitor
  - Luci esterne (5 dispositivi): Veranda, Applique, Pedoni
  - Studio (1 dispositivo): Condizionatore aria Samsung

### Stato Sistema ✅
- [x] 29 dispositivi totali (22 SmartThings + 7 Ezviz)
- [x] Tutti i dispositivi OK
- [x] API `/api/system/status` funzionante

---

## 🆕 FASE 2.1 - MIGLIORAMENTI UX E WORKFLOW (26/12/2024) - COMPLETATA ✅

### Modifiche Completate ✅
- [x] Icone colorate nell'header di navigazione (ogni tab ha colore distintivo)
- [x] Gestione aggiornamento stato ticket (modale dedicata con workflow stati)
- [x] Campo costo manutenzioni: input libero da tastiera (supporta testo e numeri)
- [x] Creazione automatica ticket quando si pianifica manutenzione (checkbox opzionale)
- [x] Formattazione date in formato gg.mm.aaaa (funzione formatDateIT)
- [x] Calendario default su data corrente (già implementato)

---

## 🆕 FASE 2.0 - ELETTRODOMESTICI AVANZATI (27/12/2024) - IN CORSO

### Form Elettrodomestici Migliorato ✅
- [x] Tab "Info" con foto opzionale
- [x] Tab "Acquisto" con:
  - [x] Data acquisto e scadenza garanzia
  - [x] Costo iniziale (€)
  - [x] Valore attuale (€)
  - [x] Upload fattura/documenti acquisto
- [x] Tab "Consumi" con calcolo automatico kWh/costo
- [x] Tab "Smart" con selezione dispositivi SmartThings
- [x] Tab "Assistenza" con:
  - [x] Centro assistenza collegato
  - [x] Upload manuali PDF
  - [x] Link sito manuale
  - [x] Upload video istruzioni
  - [x] Upload PDF istruzioni pratiche

### Categorie e Marche Custom ✅
- [x] API /api/categorie-custom (aggiunta categorie personalizzate)
- [x] API /api/marche-custom (aggiunta marche personalizzate)
- [x] Pulsanti "Aggiungi" nel form

### Upload File ✅
- [x] API /api/upload/{tipo} (fattura, foto, manuale, video, pdf_istruzioni)
- [x] API /api/files/{tipo}/{filename} (servire file)
- [x] Validazione estensioni per tipo
- [x] Cartella upload: /app/uploads/

### Dispositivi SmartThings per Stanza ✅
- [x] API /api/smartthings/devices-by-room
- [x] API /api/smartthings/rooms
- [x] Tab Domotica con stanze espandibili (6 stanze, 22 dispositivi)

### Da Completare
- [ ] Visualizzare totale consumi stimati nella Dashboard principale
- [ ] Test completo upload file
- [ ] Test creazione elettrodomestico con tutti i campi

---

## ✅ FASE 1.9 - SMARTDOMO DASHBOARD (27/12/2024) - COMPLETATA

### Nuova Interfaccia SmartDomo ✅
- [x] Tema scuro professionale (bg-[#09090B])
- [x] Header con status sistema (22 OK, 0 Attenzione, 0 Critici)
- [x] Sidebar con:
  - [x] Stato Sistema (contatori colorati)
  - [x] Accesso Rapido (Elettrodomestici, Manutenzioni, Calendario)
  - [x] Prossime Manutenzioni
- [x] Matterport 3D LIVE (Space ID: j1r4zUjanif)
- [x] 4 Tab interattivi:
  - [x] 🌡️ Clima (temperatura, umidità, dispositivi clima)
  - [x] ⚡ Domotica (22 dispositivi SmartThings)
  - [x] 🛡️ Sicurezza (placeholder telecamere Ezviz)
  - [x] ☀️ Meteo (previsioni 7 giorni - Nuoro)

### Integrazione SmartThings ✅
- [x] API /api/smartthings/devices (22 dispositivi collegati)
- [x] API /api/smartthings/device/{id}/status
- [x] API /api/smartthings/device/{id}/switch/{on|off}
- [x] Token configurato: 9a9bd2a1-6484-40c2-aa38-e77dd72cc36e
- [x] Dispositivi rilevati:
  - Luci (blu can, pedoni, veranda, applique, dependance)
  - Irrigazione (Area 1, 2, 3 prato, fioriera, aiuole)
  - Cancelli (auto, pedonale)
  - Clima (condizionatore Samsung, sensore temperatura living)
  - TV Samsung (M5 27", 7 Series 55")
  - Utility (autoclave, idropulitrice, Abbanoa)

### Integrazione Ezviz ✅ (26/12/2024)
- [x] API /api/ezviz/cameras funzionante
- [x] Credenziali configurate (navigandosky@yahoo.it)
- [x] AccessToken EU: at.7qkjj29zbh7a2f1h10kgi2te2j4zkul1-3k8hmhjy8r-0d9ljq5-16epyxcyq
- [x] Endpoint EU: https://ieuopen.ezvizlife.com
- [x] 7 telecamere connesse e tutte ONLINE

### API Meteo ✅
- [x] API /api/weather (Open-Meteo)
- [x] Città: Nuoro (40.3125, 9.3125)
- [x] Temperatura attuale, umidità, vento
- [x] Previsioni 7 giorni con icone

---

## ✅ FASE 1 - STRUTTURA BASE (COMPLETATA)

### Backend (FastAPI + MongoDB)
- [x] Setup progetto FastAPI con MongoDB
- [x] API CRUD Centri Assistenza
- [x] API CRUD Elettrodomestici
  - [x] Info base (nome, marca, modello, categoria, posizione)
  - [x] Consumi energetici (kW/h + ore uso → calcolo automatico)
  - [x] Collegamento Smart Plug (provider + ID dispositivo)
  - [x] Collegamento Centro Assistenza
- [x] API CRUD Manutenzioni
  - [x] Collegamento a elettrodomestico
  - [x] Ereditarietà centro assistenza da elettrodomestico
  - [x] Gestione ricorrenze
- [x] Dashboard statistiche
  - [x] Consumi totali (giornaliero/mensile/annuale)
  - [x] Consumi per categoria
  - [x] Costi stimati
  - [x] Manutenzioni pianificate/in scadenza
  - [x] Stato garanzie

### Frontend (React + Tailwind + shadcn/ui)
- [x] Dashboard con KPI cards
- [x] Grafico consumi per categoria
- [x] Vista 3D Matterport (embed iframe)
- [x] CMS Elettrodomestici (CRUD completo)
- [x] CMS Manutenzioni (CRUD completo)
- [x] CMS Centri Assistenza (CRUD completo)
- [x] Filtri e ricerca
- [x] Form con tabs organizzati

### Predisposizione Multi-Tenant
- [x] Campo `user_id` in tutti i record
- [x] Query filtrate per `user_id`
- [x] Pronto per autenticazione (attualmente user fisso "default-user")

---

## 🤖 FASE 1.5 - ASSISTENTE AI SMARTBUILDING (COMPLETATA)

### Funzionalità Assistente ✅
- [x] Chat assistente nel frontend
- [x] Interrogazione archivi in linguaggio naturale
  - "Quanti frigoriferi ho in casa?"
  - "Quanto consuma la lavatrice?"
  - "Quali manutenzioni ho in scadenza?"
- [x] Supporto tecnico intelligente (Risolvi Problema)
  - "Come faccio la sintonia della TV?"
  - "La lavatrice fa rumore, cosa può essere?"
- [x] Ricerca manuali online con AI
- [ ] Gestione manuali PDF (API pronte, UI da completare)
  - [x] Upload manuali per elettrodomestico (API)
  - [x] Ricerca automatica manuali online (API)
  - [ ] Estrazione testo e indicizzazione (parziale)
  - [ ] UI upload nel frontend
- [ ] Navigazione Matterport (quando SDK disponibile)
  - "Portami alla lavatrice"
- [x] Italiano default

### Tecnologie Usate
- **LLM:** Emergent LLM Key via emergentintegrations
- **PDF Parsing:** PyPDF2 per estrazione testo manuali
- **Web Search:** AI-powered suggestions per trovare manuali

---

## 📅 FASE 1.6 - CALENDARIO, TICKET E QR CODE (COMPLETATA)

### Calendario Manutenzioni ✅
- [x] Vista calendario mensile interattiva
- [x] Visualizzazione manutenzioni programmate
- [x] Visualizzazione scadenze garanzie
- [x] Visualizzazione ticket aperti
- [x] Panel "Prossimi 14 giorni"
- [x] Navigazione mese precedente/successivo
- [x] Click su evento per dettagli

### Sistema Ticket Assistenza ✅
- [x] Apertura ticket per manutenzione straordinaria
- [x] Assegnazione priorità (bassa, media, alta, urgente)
- [x] Collegamento automatico a elettrodomestico e centro assistenza
- [x] Stati ticket (aperto, contattato, in_lavorazione, risolto, annullato)
- [x] Contatto automatico via WhatsApp (link precompilato)
- [x] Contatto automatico via Email (SMTP o copia messaggio)
- [x] Numero ticket progressivo (TKT-2025-0001)
- [x] Chiusura ticket con:
  - [x] Costo intervento
  - [x] Valutazione servizio (1-5 stelle)
  - [x] Note risoluzione
  - [x] Creazione automatica manutenzione nell'archivio

### 📧 Configurazione Email SMTP ✅ (27/12/2024)
- [x] Server SMTP Gmail configurato
- [x] Account: navigandosky@gmail.com
- [x] Password per le App generata e configurata
- [x] Invio email automatico ai centri assistenza funzionante

### QR Code Elettrodomestici ✅
- [x] Generazione QR Code per ogni elettrodomestico
- [x] Card stampabile con:
  - [x] QR Code
  - [x] Nome, marca, modello
  - [x] Numero di serie
  - [x] Centro assistenza e telefono
- [x] Pulsante stampa diretta
- [x] Link a scheda elettrodomestico

### API Backend (tutte funzionanti)
- `POST /api/tickets` - Crea ticket
- `GET /api/tickets` - Lista ticket
- `PUT /api/tickets/{id}` - Aggiorna ticket
- `POST /api/tickets/{id}/contatta` - Contatta assistenza (email/whatsapp)
- `POST /api/tickets/{id}/chiudi` - Chiudi ticket e crea manutenzione
- `GET /api/elettrodomestici/{id}/qrcode` - Genera QR PNG
- `GET /api/elettrodomestici/{id}/qrcode-card` - Dati per card stampabile
- `GET /api/calendario/eventi` - Eventi per calendario
- `GET /api/calendario/prossimi` - Prossimi N giorni

---

## 🗺️ FASE 1.7 - PLANIMETRIE E ASSISTENTE PROATTIVO (COMPLETATA)

### Planimetria Interattiva 2D ✅
- [x] Upload planimetria (PNG, JPG, WEBP, PDF)
- [x] Gestione multi-planimetria (es. piani diversi)
- [x] Modalità modifica per posizionare elettrodomestici
- [x] Drag & click per posizionare icone sulla mappa
- [x] Click su icona → apre scheda elettrodomestico
- [x] Legenda con lista elettrodomestici posizionati
- [x] Salvataggio posizioni in database
- [x] Coesiste con Matterport (non si escludono)

### Assistente Proattivo ✅
- [x] Analisi automatica dati elettrodomestici
- [x] Badge notifiche nell'header con conteggio
- [x] Suggerimenti per tipo:
  - 🔧 **Manutenzione**: interventi in ritardo, controlli consigliati
  - 🛡️ **Garanzia**: scadenze imminenti o già scadute
  - 💰 **Risparmio**: consumi elevati, ottimizzazione orari
  - ♻️ **Sostituzione**: elettrodomestici datati
- [x] Priorità: Urgente (rosso) / Attenzione (arancione) / Info (blu)
- [x] Azioni suggerite per ogni avviso
- [x] Pulsante "Nascondi" per dismissare suggerimenti
- [x] Filtro per priorità
- [x] Refresh automatico conteggio ogni minuto

### API Backend (tutte funzionanti)
- `POST /api/planimetrie` - Carica planimetria
- `GET /api/planimetrie` - Lista planimetrie
- `GET /api/planimetrie/{id}` - Dettagli con punti
- `GET /api/planimetrie/{id}/image` - Immagine planimetria
- `PUT /api/planimetrie/{id}/punti` - Salva posizioni elettrodomestici
- `POST /api/planimetrie/{id}/punti` - Aggiungi punto
- `DELETE /api/planimetrie/{id}/punti/{elettro_id}` - Rimuovi punto
- `GET /api/suggerimenti` - Lista suggerimenti proattivi
- `GET /api/suggerimenti/count` - Conteggio per badge

---

## ⏳ FASE 2 - INTEGRAZIONE MATTERPORT SDK (IN ATTESA)

### Richiesto a Matterport
- [ ] SDK Key
- [ ] SDK Secret/Token
- [ ] Client ID & Secret (se OAuth2)
- [ ] Documentazione SDK

**File richiesta creato:** `/app/docs/richiesta_matterport_sdk.md`

### Da implementare (dopo ricezione credenziali)
- [ ] Integrazione Matterport SDK nel viewer
- [ ] Lettura tag esistenti dallo spazio
- [ ] Selector tag nel form elettrodomestico
- [ ] Pulsante "Vai nello spazio" → navigazione automatica al tag
- [ ] Click su tag → visualizza info elettrodomestico associato
- [ ] Sincronizzazione bidirezionale archivio ↔ spazio 3D
- [ ] Integrazione con assistente AI ("Portami al dispositivo X")

---

## 🔜 FASE 3 - MULTI-UTENTE (PIANIFICATA)

### Autenticazione
- [ ] Sistema login/registrazione (JWT o Google OAuth)
- [ ] Gestione sessioni
- [ ] Recupero password

### Gestione Utenti
- [ ] Profilo utente (nominativo, città, contatti)
- [ ] Configurazione API keys per utente
- [ ] Impostazioni preferenze

### Multi-Tenant
- [ ] Dashboard per utente
- [ ] Spazi Matterport multipli per utente
- [ ] Isolamento dati completo tra utenti
- [ ] Un account Matterport backend, più utenti frontend

---

## 🔌 FASE 4 - INTEGRAZIONE SMART HOME (FUTURA)

### Provider Supportati (predisposti)
- [ ] SmartThings
- [ ] Tuya
- [ ] Shelly
- [ ] TP-Link Tapo
- [ ] Meross

### Funzionalità
- [ ] Lettura stato presa (online/offline)
- [ ] Lettura consumo in tempo reale
- [ ] Storico consumi reali vs stimati
- [ ] Notifiche anomalie consumo

---

## 📁 STRUTTURA FILE PROGETTO

```
/app/
├── backend/
│   ├── server.py          # API FastAPI completa
│   ├── requirements.txt   # Dipendenze Python
│   └── .env               # Configurazione (MONGO_URL, MATTERPORT_SPACE_ID)
├── frontend/
│   ├── src/
│   │   ├── App.js         # Applicazione React principale
│   │   ├── App.css        # Stili
│   │   └── components/ui/ # Componenti shadcn/ui
│   └── .env               # REACT_APP_BACKEND_URL
├── docs/
│   ├── commesse.md        # Questo file
│   └── richiesta_matterport_sdk.md  # Richiesta per Matterport
└── tests/
```

---

## 📊 STATO AVANZAMENTO

| Fase | Descrizione | Stato | % |
|------|-------------|-------|---|
| 1 | Struttura Base | ✅ Completata | 100% |
| 1.5 | Assistente AI | ✅ Completata | 90% |
| 1.6 | Calendario/Ticket/QR | ✅ Completata | 100% |
| 1.7 | Planimetria/Proattivo | ✅ Completata | 100% |
| 2 | Matterport SDK | ⏳ In attesa credenziali | 10% |
| 3 | Multi-Utente | 📋 Pianificata | 0% |
| 4 | Smart Home | 📋 Futura | 0% |

**Avanzamento globale:** ~75%

---

## 📝 NOTE E DECISIONI

### 27/12/2024
- Configurato SMTP Gmail per invio email automatico
- Account: navigandosky@gmail.com
- Generata Password per le App (sicurezza Google)
- Sistema ticket ora può inviare email reali ai centri assistenza

### 26/12/2024
- Completata struttura base con tutti i CMS
- Aggiunto calcolo consumi automatico (kW/h × ore = consumo giornaliero/mensile/annuale)
- Predisposto collegamento smart plug (provider + ID)
- Centro assistenza collegabile a elettrodomestico e ereditato nelle manutenzioni
- Creata richiesta formale per Matterport SDK
- Architettura multi-tenant ready (user_id presente in tutti i record)

### Decisioni architetturali
- **Database:** MongoDB (flessibilità schema)
- **ID:** UUID (no ObjectId MongoDB per serializzazione JSON)
- **Multi-tenant:** user_id in ogni documento, filtro lato query
- **Matterport:** Account condiviso backend, space_id per utente
- **Costo energia:** 0.25€/kWh (configurabile)

---

## 🔗 COLLEGAMENTI

- **Preview App:** https://smartdomo-central.preview.emergentagent.com
- **Matterport Space Test:** SxQL3iGyoDo
- **Documentazione Matterport SDK:** https://matterport.github.io/showcase-sdk/

---

## 📞 CONTATTI

**Progetto collegato a:** Trivor.it

---

*Ultimo aggiornamento: 27 Dicembre 2024*
