# SmartDomo - PRD

## Stato Attuale (25/03/2026)

### Completato Oggi (25/03/2026)

#### Fix Regressione Vista 3D - Dati Live e Switch ON/OFF
- **Problema**: Segnalata regressione del pannello dati live e controllo switch nella vista 3D Matterport
- **Investigazione**: Verificato che la funzionalita' era operativa dalla sidebar. Il pannello mostra potenza, tensione, corrente e switch ON/OFF per i POI collegati a dispositivi eWeLink
- **Miglioramenti applicati**:
  1. **Tag Click nel 3D Viewer**: Aggiunta sottoscrizione evento click tag Matterport (`mpSdk.on(Mattertag.Event.CLICK)`) - ora cliccando un tag nella vista 3D seleziona il POI corrispondente e mostra il pannello dati
  2. **Fix SDK Tag Loading**: Invertito ordine API (legacy `Mattertag.getData()` prima di `Tag.data.collect()`) - elimina errore console `Tag.data.collect is not a function`
  3. **Prop `onTagClick`** aggiunta a `MatterportViewer.js` e gestita in `MatterportManager.js`
- **Testato**: Backend 100% (10/10), Frontend 100% - iteration_8.json
- **File modificati**: `frontend/src/MatterportViewer.js`, `frontend/src/MatterportManager.js`

#### Fix Timeout Sessione Frequenti (P2)
- **Problema**: L'utente veniva disconnesso frequentemente senza motivo
- **Causa Root**: 
  1. Health check ogni 3 secondi usava `/auth/verify?token=health_check` (endpoint sbagliato)
  2. `window.location.reload()` automatico dopo 3 fallimenti consecutivi causava reload pagina
  3. La verifica sessione al reload cancellava il token su errori di rete (non solo sessioni invalide)
- **Fix Applicato**:
  1. Health check usa `/api/health` (endpoint corretto) ogni 15 secondi
  2. Rimosso auto-reload aggressivo della pagina
  3. Verifica sessione ora preserva token su errori di rete, cancella solo su 401/403 espliciti
  4. Aggiunto fallback su utente cached da localStorage quando backend non raggiungibile
- **Testato**: Sessione persiste dopo reload pagina
- **File modificati**: `frontend/src/App.js`

---

### Completato (24/03/2026)

#### Fix Matterport Space ID - Bug Multi-Tenancy P0
- **Fix**: Endpoint `PUT /api/property/{property_id}` ora verifica user_id dal token
- **File**: `backend/server.py`, `frontend/src/PropertyConfig.js`

#### Fix URL OAuth eWeLink
- **Fix**: Token rinnovato via refresh_token, header HMAC-SHA256 corretto
- **Risultato**: eWeLink connesso con 27 dispositivi (22 online)

#### Fix Viewer Matterport per utente specifico
- **Fix**: `loadSpaces()` prioritizza `currentUser.matterport_space_id`

---

### Completato (19/02/2026)

#### Fix Vista 3D - Dati Live e Controllo Switch
- Endpoint `get_poi_live_sensor_data()` ora include dispositivi eWeLink
- Conversione valori eWeLink (power/voltage/current divisi per 100)

#### Fix 4 Bug Segnalati dall'Utente
1. System Status: 95 dispositivi totali (91 OK, 4 Attenzione)
2. Consumo Lavatrice: 11.12 kWh (corretto da 111.2)
3. Report Sensori: 18 sensori con grafici funzionanti
4. Switch ON/OFF: Funzionante

#### Fix Bug Multi-Tenancy P0 - Dati Non Visualizzati
- 12+ endpoint fixati per usare `user_id` dal token

---

## Integrazioni Attive

| Integrazione | Stato | Note |
|---|---|---|
| Matterport SDK | FUNZIONANTE | Vista 3D con 36 POI, tag click events |
| Matterport Cloud API | FUNZIONANTE | Sincronizzazione tag |
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
- **Azione**: Aggiungere campo `user_id` alla collection

## Task Futuri

### P0 (Alta Priorita')
- [ ] Refactoring `server.py` (9190 righe) in moduli separati

### P1 (Media Priorita')
- [ ] Token refresh automatico SmartThings
- [ ] Refactoring `App.js` - state management
- [ ] Notifiche push per eventi critici

### P2 (Bassa Priorita')
- [ ] Implementare creazione POI per MPSKIN
- [ ] Video live HLS/RTMP per telecamere
- [ ] Raggruppamento dispositivi multi-canale in card espandibile
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] App Mobile (PWA o React Native)

## Credenziali

### Admin Master
- **Username**: Admin
- **Password**: SmartMaster2026

### Matterport API
- **Token ID**: 90ec1bd71e4935b5
- **Token Secret**: c9c684136ae5797fdecf3ed6bc0aca61

## Architettura

```
/app/
├── backend/
│   └── server.py (9190 righe - NECESSITA REFACTORING)
└── frontend/
    └── src/
        ├── App.js
        ├── AuthPage.js
        ├── MatterportManager.js
        ├── MatterportViewer.js
        ├── PropertyConfig.js
        ├── SensorReport.js
        ├── SmartBuildingDashboard.js
        ├── VehicleTracker.js
        ├── VideoCameraManager.js
        └── ElettrodomesticoForm.js
```
