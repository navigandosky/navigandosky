# SmartDomo - PRD

## Stato Attuale (10/01/2026)

### ✅ Funzionalità Completate

#### SmartThings (22 dispositivi)
- Caching backend (TTL 2 min) per evitare 429 errors
- LED stato in lista POI (🔴 ON, ⚫ OFF)
- Pulsante Power per on/off
- Dialog collegamento POI ↔ Device

#### Indicatore Stato negli Elettrodomestici
- Badge "Smart" con stato ACCESO/SPENTO
- LED rosso lampeggiante se ON
- LED grigio se OFF
- Aggiornamento automatico

#### Navigazione POI (Fix)
- Metodo 1: `navigateToTag()` per tag Matterport
- Metodo 2: `Sweep.moveTo()` con sweep_id salvato
- Metodo 3: Ricerca dinamica sweep più vicino
- Logging dettagliato in console

## Note Tecniche

### Il caricamento SmartThings NON modifica stati
- `loadSmartThingsDevices()` fa solo GET
- `loadSmartThingsStates()` fa solo GET
- Solo `toggleSmartThingsDevice()` modifica (POST)

### Navigazione POI
Se la navigazione fallisce con "Impossibile navigare":
1. Controllare console (F12) per log
2. Il tag Matterport potrebbe non esistere più nel modello
3. Usare la navigazione manuale nella vista 3D

## File Modificati
- `backend/server.py` - Caching SmartThings
- `frontend/src/MatterportManager.js` - Navigazione migliorata
- `frontend/src/App.js` - Stato SmartThings in Elettrodomestici

---
*Ultimo aggiornamento: 10 Gennaio 2026*
