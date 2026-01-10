# SmartDomo - PRD

## Stato Attuale (10/01/2026)

### ✅ Integrazioni Funzionanti
- **SmartThings**: 22 dispositivi con caching (TTL 2 min)
- **Matterport SDK**: Spazio con 8+ POI
- **Ezviz, Open-Meteo, Emergent LLM**

## Funzionalità SmartThings nei POI

### LED Stato Dispositivo
- 🔴 **LED rosso + pulse** = Dispositivo ACCESO
- ⚫ **LED grigio** = Dispositivo SPENTO
- Match automatico POI ↔ Device per nome

### Controllo Remoto
- **Pulsante Power** nella lista POI per on/off
- **Pulsante grande** nel pannello dettagli
- Aggiornamento stato immediato

### Collegamento Manuale
- Dialog per collegare POI a device SmartThings
- Lista dispositivi con stato LED
- Possibilità di scollegare

## API con Caching
- `GET /api/smartthings/devices` - Cache 2 min
- `GET /api/smartthings/device/{id}/status` - Cache 30 sec
- `POST /api/smartthings/cache/clear` - Pulisce cache

## File Modificati
- `backend/server.py` - Caching SmartThings
- `frontend/src/MatterportManager.js` - LED, controlli, dialog

---
*Ultimo aggiornamento: 10 Gennaio 2026*
