# 📋 ARCHIVIO COMMESSE - SMARTBUILDING

**Progetto:** SmartBuilding - Gestione Immobili Intelligente  
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
- Architettura multi-tenant (multi-utente)

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
| 1.5 | Assistente AI | 🔄 In sviluppo | 0% |
| 2 | Matterport SDK | ⏳ In attesa credenziali | 10% |
| 3 | Multi-Utente | 📋 Pianificata | 0% |
| 4 | Smart Home | 📋 Futura | 0% |

**Avanzamento globale:** ~25%

---

## 📝 NOTE E DECISIONI

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

- **Preview App:** https://building-portal-hub.preview.emergentagent.com
- **Matterport Space Test:** SxQL3iGyoDo
- **Documentazione Matterport SDK:** https://matterport.github.io/showcase-sdk/

---

## 📞 CONTATTI

**Progetto collegato a:** Trivor.it

---

*Ultimo aggiornamento: 26 Dicembre 2024*
