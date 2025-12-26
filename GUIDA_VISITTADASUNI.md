# 📖 GUIDA COMPLETA - VISITTADASUNI

## Panoramica del Progetto
Sito web turistico per il borgo di Tadasuni (Sardegna) con CMS integrato per la gestione dei contenuti.

---

## 🌐 STRUTTURA DEL SITO

### Pagine Pubbliche
| Pagina | URL | Descrizione |
|--------|-----|-------------|
| Homepage | `/#/` | Pagina principale con hero, sezioni informative, chatbot |
| Eventi | `/#/eventi` | Lista eventi del borgo |
| Scopri Tadasuni | `/#/attrazioni` | Attrazioni, ristoranti, alloggi, itinerari |

### Pannelli Admin
| Pannello | URL | Credenziali |
|----------|-----|-------------|
| CMS Eventi | `/#/admin` | visittadasuni / Tadasuni2025$ |
| CMS Attrazioni | `/#/attrazioni-admin` | visittadasuni / Tadasuni2025$ |
| Chatbot Admin | `/#/chatbot-admin` | chatbotadmin / ChatBot2025$ |

---

## 🎯 FUNZIONALITÀ IMPLEMENTATE

### 1. 🏠 HOMEPAGE
- **Hero Section**: Titolo "Tadasuni Borgo Experience" con immagine di sfondo
- **Sezione "Il Borgo"**: Descrizione del paese
- **Sezione "Gemello Digitale"**: Presentazione del progetto digitale
- **Sezione Contatti**: Form di contatto e mappa
- **Footer**: Link utili, copyright "Trivor srl - Fairsgate srl"

### 2. 🌍 MULTILINGUA
Supporto completo per 5 lingue:
- 🇮🇹 Italiano (default)
- 🇬🇧 English
- 🇫🇷 Français
- 🇪🇸 Español
- 🇩🇪 Deutsch

**Selettore lingua**: Icone bandiera nel header

### 3. 🤖 CHATBOT AI
- **Tecnologia**: OpenAI GPT (via Emergent LLM Key)
- **Funzione**: Assistente virtuale per informazioni turistiche
- **Posizione**: Icona chat in basso a destra
- **Admin Panel**: Gestione fonti di conoscenza tramite scraping URL

### 4. 📅 CMS EVENTI
**Accesso**: `/#/admin`

**Funzionalità**:
- ✅ Creazione eventi con titolo e contenuto multilingue
- ✅ Upload fino a 3 immagini per evento
- ✅ Pubblicazione/bozza
- ✅ Modifica e eliminazione
- ✅ Data di creazione automatica

**Campi evento**:
- Titolo (IT, EN, FR, ES, DE)
- Contenuto (IT, EN, FR, ES, DE)
- Immagini (max 3)
- Stato pubblicazione

### 5. 🏛️ CMS ATTRAZIONI ESTESO
**Accesso**: `/#/attrazioni-admin`

#### Categorie Disponibili:

**🏛️ ATTRAZIONI**
- Chiesa
- Monumento
- Sito Archeologico
- Natura
- Museo

**🍽️ DOVE MANGIARE**
- Ristorante
- Pizzeria
- Bar / Caffè
- Agriturismo (ristorazione)

**🏨 DOVE DORMIRE**
- Hotel
- B&B
- Agriturismo
- Casa Vacanze

**🚶 ITINERARI**
- Percorsi turistici con tappe

#### Campi Base (tutti i tipi):
- Nome (multilingue: IT, EN, FR, ES, DE)
- Descrizione (multilingue)
- Categoria
- Link Google Maps (coordinate estratte automaticamente)
- Orari di apertura
- Prezzo/Ingresso
- Contatto
- Link esterno
- Immagini (max 3)
- Audio guide (multilingue)
- Stato pubblicazione

#### Campi Specifici per RISTORANTI:
- Tipo cucina (Sarda, Italiana, Pizza, Pesce, Carne, Vegetariano, Misto)
- Fascia prezzo (€, €€, €€€)
- Link prenotazione

#### Campi Specifici per ALLOGGI:
- Stelle (1-5)
- Link prenotazione (Booking, ecc.)
- Servizi (WiFi, Parcheggio, Piscina, ecc.)

#### Campi Specifici per ITINERARI:
- Durata (es. "2 ore", "mezza giornata")
- Difficoltà (Facile, Medio, Difficile)
- Distanza (es. "5 km")
- **Tappe**: Lista ordinata di punti con:
  - Nome tappa
  - Descrizione breve
  - Link Google Maps
  - Ordine (riordinabile con frecce su/giù)

### 6. 🔧 FUNZIONALITÀ ADMIN

**Filtri per categoria**:
- Tutti (con conteggio)
- Attrazioni
- Dove Mangiare
- Dove Dormire
- Itinerari

**Gestione contenuti**:
- Creazione rapida con form modale
- Modifica in-place
- Toggle pubblicazione (occhio)
- Eliminazione con conferma
- Upload immagini drag & drop
- Upload audio per ogni lingua

### 7. 📱 RESPONSIVE DESIGN
- Desktop: Menu orizzontale completo
- Tablet/Mobile: Menu hamburger
- Immagini ottimizzate
- Touch-friendly

---

## 🔑 INTEGRAZIONI ATTIVE

| Servizio | Utilizzo | Chiave |
|----------|----------|--------|
| OpenAI GPT | Chatbot AI | Emergent LLM Key |
| Google Maps | Mappe e coordinate | API Key utente |
| MongoDB | Database | MONGO_URL (env) |

---

## 📁 STRUTTURA FILE

```
/app/
├── backend/
│   ├── server.py          # API FastAPI (tutto il backend)
│   ├── .env               # Variabili ambiente
│   ├── requirements.txt   # Dipendenze Python
│   └── uploads/           # File caricati (immagini, audio)
│
├── frontend/
│   ├── src/
│   │   └── App.js         # Tutto il frontend React
│   ├── public/
│   │   ├── index.html
│   │   └── logo-tadasuni.jpg
│   ├── package.json
│   └── .env               # URL backend
│
└── visittadasuni-website.zip  # Build statico per FTP
```

---

## 🚀 DEPLOYMENT

### Frontend (Statico - FTP)
1. Scarica `visittadasuni-website.zip`
2. Estrai i file
3. Carica via FTP nella root del hosting

### Backend (Server Python)
Richiede:
- Python 3.9+
- MongoDB
- Variabili ambiente configurate

---

## 📊 RIEPILOGO FUNZIONALITÀ

| Funzionalità | Stato | Note |
|--------------|-------|------|
| Homepage responsive | ✅ | Multilingue |
| Chatbot AI | ✅ | OpenAI GPT |
| Admin Chatbot | ✅ | Scraping URL |
| CMS Eventi | ✅ | CRUD + immagini |
| CMS Attrazioni | ✅ | 6 categorie |
| CMS Ristoranti | ✅ | Cucina, prezzo |
| CMS Alloggi | ✅ | Stelle, servizi |
| CMS Itinerari | ✅ | Tappe ordinabili |
| Multilingua | ✅ | 5 lingue |
| Google Maps | ✅ | Coordinate auto |
| Audio Guide | ✅ | 5 lingue |
| Upload Immagini | ✅ | Max 3 per item |

---

## 📞 SUPPORTO

**Sviluppato da**: Emergent AI
**Copyright**: Trivor srl - Fairsgate srl

---

*Ultimo aggiornamento: Dicembre 2025*
