# SmartDomo - PRD (Product Requirements Document)

## Stato Attuale (10/01/2026)

### ✅ Integrazioni Funzionanti
- **SmartThings**: 22 dispositivi (Token: `ddde0bd8-0d53-48c7-a94d-4cb55c890fd0`)
- **Matterport SDK**: Spazio `j1r4zUjanif` con 8+ POI
- **Ezviz**: 7 telecamere
- **Open-Meteo**: Meteo in tempo reale
- **Emergent LLM**: Assistente AI

## Funzionalità Implementate Oggi

### 1. LED SmartThings nei POI ✅
- **Match automatico** POI ↔ Device SmartThings per nome
- **LED rosso lampeggiante** se dispositivo ACCESO (es. "Luci Pedoni")
- **LED grigio** se dispositivo SPENTO
- **Aggiornamento automatico** ogni 30 secondi
- Campo `smartthings_device_id` aggiunto al modello POI per collegamento diretto

### 2. Badge Sorgente POI ✅
- **"MP"** (blu) = Importato da Matterport
- **"✓ MAN"** (verde) = Manuale con navigazione
- **"⚠ MAN"** (arancione) = Manuale senza navigazione

### 3. Logo TRIVOR ✅
- Posizionato nell'angolo in basso a destra
- Copre completamente il watermark "Made with Emergent"

### 4. Percorso Navigazione ✅
- Calcolo percorso con algoritmo A*
- Toast con numero di punti nel percorso

## Lista POI con Indicatori
| # | POI | Badge | LED SmartThings | In 3D |
|---|-----|-------|-----------------|-------|
| 1 | Sensore_T1 | MP | - | ● |
| 2 | Caldaia_01 | MP | - | ● |
| 3 | Luci Pedoni | MP | 🔴 ACCESO | ● |
| 4 | CLIMA SAMSUNG_STUDIO | MP | - | ● |
| 5 | Tavolo_1 | MP | - | ● |
| 6 | Test Nuovo POI 2 | ⚠ MAN | - | ● |
| 7 | Porta ingresso | ⚠ MAN | - | ● |
| 8 | Scala Legno | ⚠ MAN | - | ● |

## Sistema LED SmartThings

### Logica di Match
```javascript
getDeviceForPoi(poi):
  1. Se poi.smartthings_device_id → usa direttamente
  2. Altrimenti → match per nome (case-insensitive)
     "Luci Pedoni" ↔ "Luci pedoni"
```

### Visualizzazione LED
- **Rosso + glow + pulse**: Dispositivo ACCESO
- **Grigio**: Dispositivo SPENTO
- **Nessun LED**: POI non collegato a SmartThings

## API Endpoints
- `GET /api/smartthings/devices` - Lista 22 dispositivi
- `GET /api/smartthings/device/{id}/status` - Stato dispositivo (on/off)
- `GET /api/matterport/pois` - Lista POI con `smartthings_device_id`

## File Modificati
- `backend/server.py` - Aggiunto `smartthings_device_id` al modello POI
- `frontend/src/MatterportManager.js` - LED SmartThings, caricamento stati
- `frontend/src/App.js` - Logo Trivor overlay

## Prossimi Task
1. Permettere collegamento manuale POI ↔ Device SmartThings
2. Controllo dispositivi dalla lista POI (accendi/spegni)
3. Caching SmartThings per rate limiting

## Credenziali
- `SMARTTHINGS_TOKEN`: ddde0bd8-0d53-48c7-a94d-4cb55c890fd0
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed

---
*Ultimo aggiornamento: 10 Gennaio 2026*
