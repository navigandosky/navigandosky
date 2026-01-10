# SmartDomo - PRD (Product Requirements Document)

## Problema Originale
Costruire un'applicazione "SmartDomo" per la gestione di un edificio smart con:
- Gestione elettrodomestici, centri assistenza, manutenzioni e ticket
- Integrazione SmartThings, Ezviz e Matterport
- Gemello digitale 3D interattivo

## Stato Attuale (10/01/2026)

### ✅ SmartThings - FUNZIONANTE
- **Token**: `ddde0bd8-0d53-48c7-a94d-4cb55c890fd0`
- **Dispositivi**: 22 rilevati (tutti online)

### ✅ Matterport SDK - FUNZIONANTE
- **SDK Key**: `59wwqhip77fxkqiurcae74fed`
- **Space ID**: `j1r4zUjanif`
- **POI**: 8+ nel database

### ✅ Ezviz, Open-Meteo, Emergent LLM - FUNZIONANTI

## Funzionalità Implementate Oggi

### 1. Badge Sorgente POI nella Lista
- **"MP"** (blu) = POI importati da Matterport → Navigazione diretta
- **"✓ MAN"** (verde) = POI manuali con sweep_id → Navigazione configurata
- **"⚠ MAN"** (arancione) = POI manuali senza sweep_id → Navigazione limitata

### 2. Visualizzazione Percorso (Pollicino)
- Implementata funzione `showPathToSweep()` che:
  - Trova lo sweep corrente dalla posizione camera
  - Crea un grafo con `Sweep.createGraph()` (se disponibile)
  - Calcola il percorso con A* algorithm
  - Mostra toast con numero di punti nel percorso
  - Evidenzia lo sweep di destinazione

### 3. Logo Trivor
- **Dentro la vista 3D**: Logo in basso a destra del viewer Matterport
- **Angolo pagina**: Logo che copre completamente il watermark "Made with Emergent"
- URL: `https://customer-assets.emergentagent.com/job_3837386c.../logo%20trivor...png`

## Sistema di Navigazione POI

### Logica di Navigazione
```
handleNavigateToPoi(poi):
  1. Se poi.is_imported && poi.matterport_tag_id:
     → Mostra percorso con showPathToSweep()
     → sdk.Mattertag.navigateToTag()
  
  2. Se poi.nearest_sweep_id:
     → Mostra percorso con showPathToSweep()
     → sdk.Sweep.moveTo(nearest_sweep_id)
  
  3. Fallback dinamico:
     → findNearestSweepId(poi.position)
     → sdk.Sweep.moveTo(sweepId)
     → Salva sweepId per usi futuri
```

### Indicatori nella Lista POI
| Badge | Significato | Navigazione |
|-------|-------------|-------------|
| MP (blu) | Importato da Matterport | ✅ Diretta |
| ✓ MAN (verde) | Manuale con sweep_id | ✅ Configurata |
| ⚠ MAN (arancione) | Manuale senza sweep_id | ⚠ Limitata |

## File Modificati Oggi
- `frontend/src/MatterportManager.js` - Badge sorgente, percorso Pollicino
- `frontend/src/MatterportViewer.js` - Logo Trivor nella vista 3D
- `frontend/src/App.js` - Logo Trivor overlay (copre watermark)
- `backend/server.py` - Campo `nearest_sweep_id` nel modello POI

## Prossimi Task

### P1 - Media Priorità
1. Popolare `nearest_sweep_id` per POI esistenti
2. Migliorare visualizzazione percorso con pallini animati
3. Caching SmartThings

### P2 - Bassa Priorità
4. Refactoring backend
5. Restauro sito Trivor.it

## Credenziali
- `SMARTTHINGS_TOKEN`: ddde0bd8-0d53-48c7-a94d-4cb55c890fd0
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed

---
*Ultimo aggiornamento: 10 Gennaio 2026*
