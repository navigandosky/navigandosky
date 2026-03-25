# SmartDomo - PRD

## Stato Attuale (25/03/2026)

### Completato Oggi (25/03/2026) - Sessione 2

#### Dati Live per TUTTI i Tipi di Sensore nei POI 3D
- **Problema**: I POI sensori (temperatura, umidita, porte) non mostravano valori live nel pannello dettaglio
- **Soluzione implementata**:
  1. **Backend**: Endpoint `/api/elettrodomestici/by-poi/{poi_id}/live-sensor` esteso per gestire POI senza elettrodomestico collegato
  2. **Auto-matching**: POI automaticamente abbinati a dispositivi eWeLink per nome (matching salvato in DB per lookup futuri)
  3. **Sensori porta eWeLink** (DW2/SNZB-04): Aggiunto parsing parametro `lock` (0=chiusa, 1=aperta), `battery`, `trigTime`
  4. **Normalizzazione temperatura migliorata**: Euristica corretta per valori 100-999 (se /10 > 50°C → usa /100)
  5. **Frontend**: Pannello dati live unificato indipendente dall'elettrodomestico collegato
- **Tipi sensori supportati**: Energia (W/V/A), Temperatura/Umidita, Porta (APERTA/CHIUSA), Switch ON/OFF, Batteria
- **Testato**: Backend 100% (17/17), Frontend 100% - iteration_9.json

#### Fix precedenti nella sessione
- **Tag Click 3D Viewer**: Sottoscrizione evento Mattertag.Event.CLICK per selezionare POI dalla vista 3D
- **Fix SDK Tag Loading**: API legacy Mattertag.getData() come primaria
- **Fix Timeout Sessione (P2)**: Health check corretto, token preservato su errori di rete
- **Testato**: iteration_8.json - 100%

---

### Completato (24/03/2026)
- Fix Matterport Space ID multi-tenancy
- Fix URL OAuth eWeLink e token refresh
- Fix Viewer Matterport per utente specifico
- Fix Matterport SDK loading (script tag injection)
- Fix variable name collision SensorReport.js

### Completato (19/02/2026)
- Fix Vista 3D - Dati Live e Controllo Switch eWeLink
- Fix 4 Bug: System Status, Consumo Lavatrice, Report Sensori, Switch ON/OFF
- Fix Bug Multi-Tenancy P0 (12+ endpoint)

---

## Integrazioni Attive

| Integrazione | Stato | Note |
|---|---|---|
| Matterport SDK | FUNZIONANTE | Vista 3D con 36 POI, tag click events |
| eWeLink | FUNZIONANTE | 27 dispositivi (22 online), refresh token automatico |
| SmartThings | TOKEN SCADUTO | Richiede nuovo PAT da utente |
| EZVIZ | FUNZIONANTE | Snapshot refresh |
| Balin GPS | FUNZIONANTE | Tracciamento veicoli |

## Issues Aperti

### P1 - SmartThings Disconnesso
- **Stato**: BLOCCATO - Richiede azione utente
- **Azione**: Generare nuovo PAT su https://account.smartthings.com/tokens

### P1 - Schema `ewelink_tokens` senza `user_id`
- **Rischio**: Conflitti se secondo utente connette eWeLink

## Task Futuri

### P0
- [ ] Refactoring `server.py` (9291 righe) in moduli separati

### P1
- [ ] Token refresh automatico SmartThings
- [ ] Refactoring `App.js` - state management
- [ ] Aggiungere `user_id` a collection `ewelink_tokens`

### P2
- [ ] Implementare creazione POI per MPSKIN
- [ ] Video live HLS/RTMP per telecamere
- [ ] QR Code scanning
- [ ] App Mobile (PWA)

## Credenziali
- **Admin**: Admin / SmartMaster2026
- **Nadir**: Nadir / (password sconosciuta nel contesto)

## Architettura
```
/app/
├── backend/
│   └── server.py (9291 righe)
└── frontend/src/
    ├── App.js, MatterportManager.js, MatterportViewer.js
    ├── SensorReport.js, PropertyConfig.js
    ├── SmartBuildingDashboard.js, VehicleTracker.js
    └── VideoCameraManager.js, ElettrodomesticoForm.js
```
