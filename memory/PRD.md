# SmartDomo - PRD (Product Requirements Document)

## Problema Originale
Costruire un'applicazione "SmartDomo" per la gestione di un edificio smart con:
- Gestione elettrodomestici, centri assistenza, manutenzioni e ticket
- Integrazione SmartThings, Ezviz e Matterport
- Gemello digitale 3D interattivo

## Architettura
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Integrazioni**: SmartThings, Ezviz, Matterport SDK, Open-Meteo, Emergent LLM

## Stato Attuale Integrazioni

### ✅ SmartThings - FUNZIONANTE
- **Token**: `ddde0bd8-0d53-48c7-a94d-4cb55c890fd0`
- **Dispositivi**: 22 rilevati (tutti online)
- **Funzionalità**: Lista dispositivi, stato, controllo switch

### ✅ Ezviz - FUNZIONANTE
- 7 telecamere configurate
- API EU Open Platform

### ✅ Matterport SDK - FUNZIONANTE
- **SDK Key**: `59wwqhip77fxkqiurcae74fed`
- **Space ID**: `j1r4zUjanif`
- **POI**: 12+ nel database
- **Navigazione**: Implementata con sweep_id fallback

### ✅ Open-Meteo - FUNZIONANTE
- Meteo in tempo reale

### ✅ Emergent LLM - FUNZIONANTE
- Assistente AI

## Funzionalità Matterport Implementate

### Core Features
- [x] Connessione SDK con badge "SDK Connesso"
- [x] Caricamento automatico Mattertag (5+ POI dal modello)
- [x] Visualizzazione POI nella vista 3D
- [x] Creazione POI con acquisizione coordinate
- [x] Lista POI compatta e numerata
- [x] Tour guidato automatico

### Sistema di Navigazione (10/01/2026)
- [x] **POI importati**: Navigazione diretta con `navigateToTag()`
- [x] **POI nuovi**: Salvataggio `nearest_sweep_id` alla creazione
- [x] **Navigazione sweep**: `Sweep.moveTo()` per POI senza tag valido
- [x] **Fallback dinamico**: Ricerca sweep più vicino se non salvato

### Gestione POI
- [x] CRUD completo (Crea, Leggi, Aggiorna, Elimina)
- [x] Traduzioni multilingue (IT, EN, DE, FR, ES)
- [x] Traduzione automatica via AI
- [x] Generazione audio TTS
- [x] Upload allegati
- [x] Categorie e icone personalizzabili

## Database Schema

### matterport_pois
```json
{
  "id": "uuid",
  "space_id": "string",
  "matterport_tag_id": "string (nullable)",
  "nearest_sweep_id": "string (nullable)",  // NEW: Per navigazione fallback
  "position": { "x": float, "y": float, "z": float },
  "translations": [{ "language": "it", "title": "", "description": "" }],
  "icon": "string",
  "color": "#hex",
  "category": "string",
  "is_imported": bool,  // true = importato da Matterport
  "is_visible": bool
}
```

## Logica di Navigazione

```
handleNavigateToPoi(poi):
  1. Se poi.is_imported && poi.matterport_tag_id:
     → sdk.Mattertag.navigateToTag() ✓
  
  2. Se poi.nearest_sweep_id:
     → sdk.Sweep.moveTo(nearest_sweep_id) ✓
  
  3. Fallback dinamico:
     → findNearestSweepId(poi.position)
     → sdk.Sweep.moveTo(sweepId)
     → Salva sweepId per usi futuri
```

## API Endpoints

### SmartThings
- `GET /api/smartthings/devices` - 22 dispositivi ✅
- `GET /api/smartthings/location` - Info location
- `GET /api/smartthings/status` - Stato sistema

### Matterport
- `GET /api/matterport/spaces` - Lista spazi
- `GET /api/matterport/pois` - 12+ POI
- `POST /api/matterport/pois` - Crea POI (con nearest_sweep_id)
- `PUT /api/matterport/pois/{id}` - Aggiorna POI
- `DELETE /api/matterport/pois/{id}` - Elimina POI

## File Principali
- `backend/server.py` - API (POI con nearest_sweep_id)
- `frontend/src/MatterportManager.js` - Gestione POI e navigazione
- `frontend/src/MatterportViewer.js` - SDK wrapper

## Prossimi Task

### P1 - Media Priorità
1. Aggiungere sweep_id ai POI esistenti (script di migrazione)
2. Implementare caching SmartThings per rate limiting
3. Refactoring server.py in moduli

### P2 - Bassa Priorità
4. Multi-tenancy
5. Analisi storica consumi
6. Restauro sito Trivor.it

## Credenziali (Backend .env)
- `SMARTTHINGS_TOKEN`: ddde0bd8-0d53-48c7-a94d-4cb55c890fd0 ✅
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed ✅
- `MATTERPORT_SPACE_ID`: j1r4zUjanif
- `EZVIZ_APPKEY`: Configurato
- `EMERGENT_LLM_KEY`: Configurato

---
*Ultimo aggiornamento: 10 Gennaio 2026*
