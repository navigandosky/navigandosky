# SmartDomo - PRD

## Stato Attuale (26/03/2026)

### Completato Oggi (26/03/2026) - Sessione 4

#### Bug Fix Critico: "t is not defined" in CentroAssistenzaDialog
- **Problema**: L'app crashava con errore runtime `ReferenceError: t is not defined` nel componente `CentroAssistenzaDialog`
- **Causa**: L'implementazione i18n della sessione precedente ha aggiunto riferimenti a `t.common.cancel`, `t.common.save`, `t.maintenance.*` nei componenti `CentroAssistenzaDialog` e `ManutenzioneDialog` senza aggiungere il hook `useLanguage()` a ciascuno
- **Fix**: Aggiunto `const { t } = useLanguage();` in entrambi i componenti
- **File modificato**: `frontend/src/App.js`
- **Testato**: Screenshot login + dashboard + manutenzioni - tutto funzionante

### Completato (25/03/2026) - Sessione 3
- Fix regressione click Tag 3D Matterport
- Fix timeout sessione P2
- Dati live sensori temperatura/umidita nel pannello 3D
- Stato Aperto/Chiuso per sensori porta nel pannello 3D
- Sistema i18n multi-lingua (IT, EN, FR, ES) con selettore bandiere

### Completato (25/03/2026) - Sessione 2
- Dati live per tutti i tipi di sensore nei POI 3D (iteration_9.json 100%)
- Fix Tag Click 3D Viewer
- Fix SDK Tag Loading
- Fix Timeout Sessione P2

### Completato (24/03/2026)
- Fix Matterport Space ID multi-tenancy
- Fix URL OAuth eWeLink e token refresh
- Fix Viewer Matterport per utente specifico
- Fix Matterport SDK loading

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
- [ ] Refactoring `server.py` (9200+ righe) in moduli separati

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
- **Nadir**: navigandosky@yahoo.it / Iberia2021$

## Architettura
```
/app/
├── backend/
│   └── server.py (9200+ righe)
└── frontend/src/
    ├── App.js, MatterportManager.js, MatterportViewer.js
    ├── SensorReport.js, PropertyConfig.js
    ├── SmartBuildingDashboard.js, VehicleTracker.js
    ├── VideoCameraManager.js, ElettrodomesticoForm.js
    ├── AuthPage.js, PlanimetriaSuggerimenti.js
    ├── RicercaCentriAssistenza.js, TicketCalendarQR.js
    └── i18n/ (LanguageContext.js, LanguageSelector.js, translations/)
```
