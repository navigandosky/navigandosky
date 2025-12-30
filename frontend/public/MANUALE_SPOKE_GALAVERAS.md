# SPOKE GALAVERAS
## Manuale Tecnico e Guida Utente

---

**Versione:** 1.0  
**Data:** Dicembre 2025  
**Realizzato da:** Trivor srl  

---

## INDICE

1. [Panoramica del Sistema](#1-panoramica-del-sistema)
2. [Architettura Tecnica](#2-architettura-tecnica)
3. [Funzionalità Principali](#3-funzionalità-principali)
4. [Guida all'Uso del Pannello Admin](#4-guida-alluso-del-pannello-admin)
5. [Struttura del Database](#5-struttura-del-database)
6. [API Endpoints](#6-api-endpoints)
7. [Integrazioni](#7-integrazioni)
8. [Informazioni di Deployment](#8-informazioni-di-deployment)
9. [Credenziali di Accesso](#9-credenziali-di-accesso)
10. [Manutenzione e Supporto](#10-manutenzione-e-supporto)

---

## 1. PANORAMICA DEL SISTEMA

### 1.1 Descrizione
**Spoke Galaveras** è una piattaforma web innovativa dedicata alla valorizzazione e fruizione digitale del patrimonio culturale sardo, con particolare focus sull'arte del ricamo tradizionale e i costumi tipici della Sardegna.

Il sistema implementa il concetto di **Digital Twin** (Gemello Digitale), permettendo la creazione di repliche virtuali di spazi espositivi reali attraverso la tecnologia Matterport.

### 1.2 Obiettivi
- Preservare la memoria storica delle mostre in formato digitale
- Rendere accessibili le esposizioni senza limiti di tempo e spazio
- Catalogare i costumi tradizionali sardi con dettagli e audioguide
- Fornire un'esperienza immersiva multilingue

### 1.3 Caratteristiche Principali
- ✅ Tour virtuali 3D con tecnologia Matterport
- ✅ Sistema multilingue (Italiano, English, Français, Deutsch)
- ✅ Archivio costumi con schede dettagliate
- ✅ Audioguide generate automaticamente (Text-to-Speech)
- ✅ Traduzione automatica dei contenuti
- ✅ Pannello di amministrazione protetto
- ✅ Design responsive per tutti i dispositivi

---

## 2. ARCHITETTURA TECNICA

### 2.1 Stack Tecnologico

| Componente | Tecnologia | Versione |
|------------|------------|----------|
| **Frontend** | React.js | 18.x |
| **Backend** | FastAPI (Python) | 0.100+ |
| **Database** | MongoDB Atlas | Cloud |
| **Styling** | Tailwind CSS | 3.x |
| **UI Components** | Shadcn/ui | Latest |
| **Tour 3D** | Matterport SDK | Latest |
| **Hosting** | Emergent Platform | Cloud |

### 2.2 Struttura delle Directory

```
/app
├── backend/
│   ├── .env                    # Variabili d'ambiente
│   ├── requirements.txt        # Dipendenze Python
│   └── server.py              # API FastAPI
│
└── frontend/
    ├── .env                    # Variabili d'ambiente
    ├── package.json           # Dipendenze Node.js
    ├── public/
    │   └── index.html         # HTML principale
    └── src/
        ├── App.js             # Router principale
        ├── components/        # Componenti riutilizzabili
        │   ├── Layout.jsx     # Layout principale
        │   ├── AdminLayout.jsx # Layout admin
        │   └── ui/            # Componenti UI
        ├── hooks/
        │   └── useLanguage.js # Hook per gestione lingua
        └── pages/
            ├── Home.jsx           # Homepage
            ├── Exhibitions.jsx    # Lista mostre
            ├── ExhibitionDetail.jsx # Dettaglio mostra + Matterport
            ├── CostumesArchive.jsx  # Archivio costumi
            ├── CostumeDetail.jsx    # Dettaglio costume
            ├── Project.jsx          # Pagina progetto
            └── admin/               # Sezione amministrazione
                ├── AdminLogin.jsx
                ├── AdminDashboard.jsx
                ├── SpacesManagement.jsx
                ├── POIsManagement.jsx
                ├── CostumesManagement.jsx
                └── ProjectManagement.jsx
```

### 2.3 Diagramma dell'Architettura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Browser       │────▶│   Frontend      │────▶│   Backend       │
│   (Utente)      │     │   (React)       │     │   (FastAPI)     │
│                 │     │   Port: 3000    │     │   Port: 8001    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │                 │              │
                        │  MongoDB Atlas  │◀─────────────┘
                        │  (Database)     │
                        │                 │
                        └─────────────────┘
                        
                        ┌─────────────────┐
                        │                 │
                        │   Matterport    │
                        │   (Tour 3D)     │
                        │                 │
                        └─────────────────┘
```

---

## 3. FUNZIONALITÀ PRINCIPALI

### 3.1 Sito Pubblico

#### Homepage
- Hero section con immagine di sfondo personalizzata
- Navigazione rapida alle sezioni principali
- Citazione tematica
- Selettore lingua

#### Le Mostre (Digital Twin)
- Elenco delle mostre disponibili con card visive
- Per ogni mostra:
  - Viewer Matterport 3D integrato
  - Navigazione immersiva dello spazio
  - Lista dei Punti di Interesse (POI)
  - Audioguide per ogni POI

#### Archivio Costumi
- Catalogo completo dei costumi tradizionali
- Ricerca per ID, descrizione o ricamatrice
- Scheda dettagliata per ogni costume con:
  - Galleria fotografica
  - Dati identificativi (ID Risorsa)
  - Ricamatrice
  - Proprietà
  - Valore stimato
  - Data di realizzazione
  - Audioguida

#### Il Progetto
- Descrizione del progetto Spoke
- Documentazione allegata (PDF, DOCX)
- Contenuti in 4 lingue

### 3.2 Pannello Amministratore

#### Dashboard
- Panoramica con conteggi:
  - Spazi Matterport
  - Punti di Interesse
  - Costumi catalogati
- Accesso rapido alle sezioni di gestione

#### Gestione Spazi Matterport
- Creazione nuovo spazio con:
  - Model ID Matterport
  - Nome (4 lingue)
  - Descrizione (4 lingue)
  - Immagine di copertina
  - Stato attivo/inattivo
- Modifica ed eliminazione spazi

#### Gestione Punti di Interesse (POI)
- Creazione POI associati a uno spazio
- Campi multilingue per nome e descrizione
- Generazione automatica audioguide (TTS)
- Associazione a Mattertag esistenti

#### Gestione Archivio Costumi
- Creazione scheda costume con tutti i campi
- Upload multiplo di fotografie
- Generazione audioguide automatiche
- Traduzione automatica delle descrizioni

#### Gestione Progetto
- Editor di testo per la descrizione
- Supporto 4 lingue
- Upload documenti allegati

---

## 4. GUIDA ALL'USO DEL PANNELLO ADMIN

### 4.1 Accesso al Pannello

1. Navigare all'URL: `https://virtualspoke.emergent.host/admin`
2. Inserire le credenziali:
   - **Username:** Galaveras2025
   - **Password:** Gala2025$
3. Cliccare "Accedi"

### 4.2 Aggiungere una Nuova Mostra

1. Dal Dashboard, cliccare su "Spazi Matterport" → "Gestisci"
2. Cliccare "Nuovo Spazio"
3. Compilare i campi:
   - **Model ID:** Inserire l'ID dello spazio Matterport (es. "3JCgBo4FgT5")
   - **Nome:** Inserire il nome in Italiano, poi usare "Traduci" per le altre lingue
   - **Descrizione:** Inserire la descrizione in Italiano, poi usare "Traduci"
   - **Immagine:** Inserire URL immagine o caricare file
4. Cliccare "Salva"

### 4.3 Aggiungere un Costume

1. Dal Dashboard, cliccare su "Archivio Costumi" → "Gestisci"
2. Cliccare "Nuovo Costume"
3. Compilare:
   - **ID Risorsa:** Codice identificativo (es. "cost01")
   - **Descrizione:** Testo descrittivo
   - **Ricamatrice:** Nome dell'artigiana
   - **Proprietà:** Nome del proprietario
   - **Valore:** Stima in euro
   - **Data realizzazione:** Formato libero
   - **Foto:** Upload multiplo
   - **Spazio associato:** Selezionare la mostra collegata
4. Cliccare "Genera Audio" per creare le audioguide
5. Cliccare "Salva"

### 4.4 Generare Audioguide

Il sistema genera automaticamente audioguide in 4 lingue:

1. Inserire il testo descrittivo in Italiano
2. Cliccare "Traduci" per tradurre nelle altre lingue
3. Cliccare "Genera Audio" per ogni lingua
4. Gli audio vengono salvati automaticamente

### 4.5 Modificare il Testo del Progetto

1. Dal Dashboard, cliccare su "Progetto Spoke" → "Gestisci"
2. Modificare il testo nelle varie lingue
3. Caricare eventuali documenti allegati
4. Cliccare "Salva"

---

## 5. STRUTTURA DEL DATABASE

### 5.1 Configurazione MongoDB

- **Cluster:** Trivor (MongoDB Atlas)
- **Database:** spoke_galaveras
- **Collezioni:** spaces, pois, costumes, project

### 5.2 Schema delle Collezioni

#### Collezione: spaces
```json
{
  "id": "uuid",
  "model_id": "string (Matterport Model ID)",
  "name": {
    "it": "string",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "description": {
    "it": "string",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "cover_image": "string (URL)",
  "is_active": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Collezione: pois
```json
{
  "id": "uuid",
  "space_id": "uuid (riferimento a spaces)",
  "matterport_tag_id": "string",
  "name": {
    "it": "string",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "description": {
    "it": "string",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "audio_urls": {
    "it": "string (URL)",
    "en": "string (URL)",
    "fr": "string (URL)",
    "de": "string (URL)"
  },
  "position": {
    "x": "float",
    "y": "float",
    "z": "float"
  },
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Collezione: costumes
```json
{
  "id": "uuid",
  "id_risorsa": "string",
  "description": {
    "it": "string",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "ricamatrice": "string",
  "proprieta": "string",
  "valore": "string",
  "data_realizzazione": "string",
  "photos": ["string (URLs)"],
  "matterport_tag_id": "string",
  "space_id": "uuid",
  "audio_url": {
    "it": "string (URL)",
    "en": "string (URL)",
    "fr": "string (URL)",
    "de": "string (URL)"
  },
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Collezione: project
```json
{
  "type": "main",
  "content": {
    "it": "string (testo lungo)",
    "en": "string",
    "fr": "string",
    "de": "string"
  },
  "documents": [
    {
      "id": "uuid",
      "filename": "string",
      "original_name": "string",
      "file_type": "string",
      "description": "string",
      "url": "string",
      "uploaded_at": "datetime"
    }
  ],
  "updated_at": "datetime"
}
```

---

## 6. API ENDPOINTS

### 6.1 Base URL
- **Produzione:** `https://virtualspoke.emergent.host/api`

### 6.2 Endpoints Pubblici

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/spaces` | Lista tutti gli spazi Matterport |
| GET | `/spaces/{id}` | Dettaglio singolo spazio |
| GET | `/pois` | Lista tutti i POI |
| GET | `/pois/space/{space_id}` | POI di uno spazio specifico |
| GET | `/costumes` | Lista tutti i costumi |
| GET | `/costumes/{id}` | Dettaglio singolo costume |
| GET | `/project` | Contenuto pagina progetto |

### 6.3 Endpoints Admin (richiedono autenticazione)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/admin/login` | Autenticazione admin |
| POST | `/spaces` | Crea nuovo spazio |
| PUT | `/spaces/{id}` | Modifica spazio |
| DELETE | `/spaces/{id}` | Elimina spazio |
| POST | `/pois` | Crea nuovo POI |
| PUT | `/pois/{id}` | Modifica POI |
| DELETE | `/pois/{id}` | Elimina POI |
| POST | `/costumes` | Crea nuovo costume |
| PUT | `/costumes/{id}` | Modifica costume |
| DELETE | `/costumes/{id}` | Elimina costume |
| PUT | `/project` | Aggiorna testo progetto |

### 6.4 Endpoints Servizi

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/translate` | Traduzione automatica testo |
| POST | `/tts` | Generazione audio da testo |
| POST | `/upload/image` | Upload immagine |
| POST | `/upload/document` | Upload documento |

### 6.5 Esempio Chiamata API

**Request:**
```bash
curl -X GET "https://virtualspoke.emergent.host/api/spaces" \
     -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "id": "47aca892-714b-4864-8c35-2d8c78f4e4e5",
    "model_id": "3JCgBo4FgT5",
    "name": {
      "it": "Ilos de Seda e de Oro - Mostra 2024",
      "en": "Threads of Silk and Gold - Exhibition 2024",
      "fr": "Fils de Soie et d'Or - Exposition 2024",
      "de": "Fäden aus Seide und Gold - Ausstellung 2024"
    },
    "description": {...},
    "cover_image": "https://...",
    "is_active": true
  }
]
```

---

## 7. INTEGRAZIONI

### 7.1 Matterport

**Descrizione:** Piattaforma per la creazione di tour virtuali 3D

**Configurazione:**
- SDK Key: Configurata nel backend
- Model ID: Inserito per ogni spazio nel database

**Funzionalità:**
- Visualizzazione tour 3D immersivi
- Navigazione nello spazio virtuale
- Visualizzazione Mattertag (punti di interesse)

**Limitazioni Note:**
- L'SDK per funzionalità avanzate (import tag automatico) richiede configurazione specifica dell'account Matterport

### 7.2 OpenAI (via Emergent)

**Descrizione:** Servizi di intelligenza artificiale

**Servizi Utilizzati:**
- **Text-to-Speech (TTS):** Generazione audioguide
- **GPT Translation:** Traduzione automatica contenuti

**Lingue Supportate:**
- Italiano (it)
- Inglese (en)
- Francese (fr)
- Tedesco (de)

### 7.3 MongoDB Atlas

**Descrizione:** Database cloud NoSQL

**Caratteristiche:**
- Alta disponibilità
- Backup automatici
- Scalabilità
- Sicurezza enterprise

---

## 8. INFORMAZIONI DI DEPLOYMENT

### 8.1 URL di Produzione

| Risorsa | URL |
|---------|-----|
| **Sito Web** | https://virtualspoke.emergent.host |
| **Admin Panel** | https://virtualspoke.emergent.host/admin |
| **API Backend** | https://virtualspoke.emergent.host/api |

### 8.2 Piattaforma di Hosting

- **Provider:** Emergent Platform
- **Tipo:** Cloud Managed
- **Uptime:** 24/7
- **SSL:** Incluso (HTTPS)

### 8.3 Redirect Personalizzato

Per raggiungere il sito da un dominio personalizzato (es. www.trivor.it/spokegalaveras), creare un file `index.html` con redirect:

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=https://virtualspoke.emergent.host">
    <title>Spoke Galaveras</title>
</head>
<body>
    <p>Reindirizzamento in corso... 
       <a href="https://virtualspoke.emergent.host">Clicca qui</a>
    </p>
</body>
</html>
```

### 8.4 Aggiornamenti

Per aggiornare il sito dopo modifiche:
1. Accedere all'ambiente Emergent
2. Effettuare le modifiche necessarie
3. Cliccare "Redeploy"
4. Attendere 10-15 minuti per il completamento

---

## 9. CREDENZIALI DI ACCESSO

### 9.1 Pannello Amministratore

| Campo | Valore |
|-------|--------|
| **URL** | https://virtualspoke.emergent.host/admin |
| **Username** | Galaveras2025 |
| **Password** | Gala2025$ |

### 9.2 Database MongoDB Atlas

| Campo | Valore |
|-------|--------|
| **Cluster** | Trivor |
| **Database** | spoke_galaveras |
| **Accesso** | Tramite stringa di connessione nel backend |

### 9.3 Matterport

| Campo | Valore |
|-------|--------|
| **SDK Key** | Configurata nel sistema |
| **Dashboard** | my.matterport.com |

> ⚠️ **NOTA SICUREZZA:** Conservare queste credenziali in modo sicuro. Non condividerle con persone non autorizzate.

---

## 10. MANUTENZIONE E SUPPORTO

### 10.1 Backup

- **Database:** Backup automatici gestiti da MongoDB Atlas
- **File Media:** Conservati su cloud storage Emergent
- **Codice:** Versionato su piattaforma Emergent

### 10.2 Monitoraggio

- Health check automatico dopo ogni deploy
- Logs disponibili nella console Emergent

### 10.3 Supporto Tecnico

Per assistenza tecnica contattare:
- **Trivor srl**
- Email: [inserire email supporto]
- Tel: [inserire telefono]

### 10.4 Procedure di Emergenza

**Sito non raggiungibile:**
1. Verificare lo stato del deployment su Emergent
2. Controllare i logs per errori
3. Effettuare un redeploy se necessario

**Dati non visualizzati:**
1. Verificare connessione al database
2. Controllare le variabili d'ambiente
3. Verificare che il database contenga i dati

---

## APPENDICE A: GLOSSARIO

| Termine | Definizione |
|---------|-------------|
| **Digital Twin** | Replica digitale di uno spazio fisico |
| **Matterport** | Tecnologia per scansione e visualizzazione 3D |
| **POI** | Point of Interest - Punto di Interesse |
| **TTS** | Text-to-Speech - Conversione testo in audio |
| **API** | Application Programming Interface |
| **CMS** | Content Management System |

---

## APPENDICE B: CHANGELOG

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | Dicembre 2025 | Rilascio iniziale |

---

**© 2025 Trivor srl - Tutti i diritti riservati**

*Documento generato per il progetto Spoke Galaveras*
