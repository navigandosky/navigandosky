# SmartDomo - PRD

## Stato Attuale (18/02/2026)

### ✅ Completato Oggi (18/02/2026)

#### Integrazione Balin GPS Tracker ✅
- **Richiesta**: Integrare il servizio Balin GPS per tracciare la posizione dei veicoli
- **Documentazione API**: Fornita dall'utente - REST API con Basic Auth (email + api_token)
- **Implementazione Backend**:
  - Nuovo modello `BalinConfig` per configurazione (email, api_token)
  - Aggiunto `balin` a `IntegrationsConfig` nel modello PropertyConfig
  - Funzione `get_balin_credentials()` per recuperare credenziali da DB
  - Funzione `balin_api_request()` per chiamate autenticate a Balin API
  - **5 nuovi endpoint**:
    - `GET /api/balin/status` - Stato connessione
    - `GET /api/balin/devices` - Lista veicoli con posizione
    - `GET /api/balin/device/{imei}` - Dettaglio singolo veicolo
    - `GET /api/balin/device/{imei}/history` - Storico posizioni (max 1 giorno, 30 gg indietro)
    - `GET /api/balin/device/{imei}/trips` - Storico viaggi (max 90 gg)
- **Implementazione Frontend**:
  - Nuovo componente `VehicleTracker.js` con:
    - **MAPPA INTERATTIVA Leaflet** con markers veicoli colorati (blu=movimento, verde=online, grigio=offline)
    - Sidebar lista veicoli compatta
    - Popup su marker con dettagli veicolo
    - Pulsante espandi/riduci mappa
    - Toggle vista Mappa/Lista
    - Auto-refresh ogni 30 secondi
    - **STORICO PERCORSI**:
      - Pannello "Storico Percorsi" che appare quando si seleziona un veicolo
      - Selezione periodo: Oggi, Ieri, 7 giorni, 30 giorni, Personalizzato
      - Visualizzazione percorso sulla mappa con polyline blu tratteggiata
      - Punti partenza (verde) e sosta (rosso) sulla mappa
      - Lista tappe con timestamp, velocità e chilometri
      - Legenda percorso in basso a sinistra
  - Tab "Veicoli" spostata **prima di Setup** nel menu
  - Card configurazione "Balin GPS Tracker" in Setup → Integrazioni
- **File creati**: 
  - `frontend/src/VehicleTracker.js`
- **File modificati**: 
  - `backend/server.py` (modelli, endpoint Balin)
  - `frontend/src/PropertyConfig.js` (card Balin, BalinStatus)
  - `frontend/src/App.js` (import, tab Veicoli)
- **Dipendenze aggiunte**: `react-leaflet`, `leaflet`
- **Testato**: ✅ Backend 100% (9/9), Frontend 100% (14/14) - iteration_4.json

#### Fix SmartThings Token ✅
- **Problema**: Il token SmartThings non veniva letto correttamente perché esistevano più documenti `property_config` con token diversi
- **Fix**: Modificata la funzione `get_smartthings_token()` per:
  1. Cercare prima la configurazione dell'utente specifico
  2. Poi cercare configurazioni attive escludendo `default-user`
  3. Fallback a qualsiasi configurazione attiva
- **Risultato**: SmartThings connesso con 35 dispositivi

---

## Stato Attuale (06/02/2026)

### ✅ Completati (06/02/2026)

#### Nuova Sezione "Video Cam" Dedicata ✅
- **Richiesta**: Creare interfaccia dedicata per le videocamere EZVIZ con Matterport viewer
- **Implementazione**:
  - Nuova tab "Video Cam" nel menu principale (tra Vista 3D e SmartDomo)
  - Icona rossa video per identificazione immediata
  - Sidebar con lista delle 9 camere EZVIZ (8 online, 1 offline)
  - Card camera con: thumbnail, nome, modello, stato (verde/rosso), POI collegato
  - Matterport viewer integrato per navigazione 3D
  - Pannello dettagli camera con azioni
- **File creato**: `frontend/src/VideoCameraManager.js`
- **File modificato**: `frontend/src/App.js` (aggiunta tab e import)

#### Associazione Camera-POI per Navigazione ✅
- **Richiesta**: Permettere di collegare ogni camera EZVIZ a un POI Matterport per navigazione
- **Implementazione Backend**:
  - Nuova collection `camera_poi_associations` nel database
  - Endpoint `GET /api/ezviz/cameras` ora include `poi_id` per ogni camera
  - Endpoint `POST /api/ezviz/camera/{serial}/link-poi` per creare/rimuovere associazione
  - Endpoint `GET /api/ezviz/camera/{serial}/poi` per recuperare POI associato
- **Implementazione Frontend**:
  - Dialog "Collega Camera a POI" con dropdown POI disponibili
  - Visualizzazione del POI collegato in verde nella card camera (📍 Nome POI)
  - Pulsante "Vai al POI" per navigazione nel Matterport viewer
  - Pulsante "Modifica POI" per cambiare associazione
- **File modificato**: `backend/server.py` (3 nuovi endpoint)
- **Testato**: Camera "Veranda ingresso pedonale" → POI "Porta Veranda" ✅

---

## Stato Attuale (02/02/2026)

### ✅ Completati Oggi (02/02/2026)

#### Supporto Dispositivi Multi-Canale SonOff/eWeLink ✅
- **Richiesta**: Visualizzare e controllare individualmente ogni canale dei dispositivi SonOff a 4 canali (IRRIGAZIONE e SERVIZI CANCELLO)
- **Implementazione Backend**:
  - Modificato `/api/ewelink/devices` per "esplodere" dispositivi multi-canale in canali virtuali separati
  - Modificato `get_ewelink_devices_internal()` per includere la stessa logica di espansione
  - Ogni canale ha ID formato `{parent_id}_ch{n}` (es: `1000bab658_ch0`)
  - UIIDs multi-canale supportati: 2, 3, 4, 7, 8, 77, 78, 112, 113, 114, 138, 139, 140, 141, 190
  - Toggle endpoint supporta IDs canale (es: `POST /api/ewelink/device/1000bab658_ch0/switch/on`)
- **Implementazione Frontend**:
  - `DeviceCard` aggiornata per leggere stato `switch` correttamente per canali
  - Badge "CH1", "CH2", "CH3", "CH4" visibili su ogni card canale
  - Toggle ON/OFF funzionante per ogni singolo canale
- **File modificati**:
  - `backend/server.py` (espansione multi-canale in 2 endpoint + toggle)
  - `frontend/src/SmartBuildingDashboard.js` (DeviceCard con supporto canali)
- **Dispositivi testati**:
  - "Irrigazione prato" (ID: 1000bab658) → 4 canali CH1-CH4 ✅
  - "Serv cancello" (ID: 10017b82bf) → 4 canali CH1-CH4 ✅
- **Testato**: ✅ Backend 100%, Frontend 100% (testing agent iteration_3)

#### Visualizzazione Dati Sensori Porta (Contact Sensors) ✅
- **Richiesta**: Mostrare stato (aperto/chiuso), batteria e ultimo movimento per sensori porta eWeLink
- **Implementazione Backend**:
  - Identificati UIID 7003 e 7014 come sensori porta reali (non più confusi con dispositivi multi-canale)
  - Aggiunto estrazione `contact` (aperto/chiuso), `battery`, `last_trigger` in `/api/ewelink/devices`
  - Aggiunto questi dati in `get_ewelink_devices_internal()` e `get_devices_with_sensor_values()`
  - Aggiunto campi nell'endpoint `/api/elettrodomestici/by-poi/{poi_id}/live-sensor`
  - Aggiunto campi nell'endpoint `/api/elettrodomestici/poi-sensors`
- **Implementazione Frontend**:
  - Pannello POI: mostra 🚪 APERTA / 🔒 CHIUSA con colore (arancione/verde)
  - Pannello POI: mostra 🔋 livello batteria con colore (verde/giallo/rosso)
  - Pannello POI: mostra ultimo movimento in formato italiano
  - Tab Sensori: stesso display per sensori porta nella lista laterale
- **File modificati**:
  - `backend/server.py` (4+ endpoint aggiornati)
  - `frontend/src/MatterportManager.js` (pannello POI + tab Sensori)
- **Sensori testati**:
  - "Porta Studio" (UIID 7003) - 🔒 CHIUSA, 🔋 100%
  - "Ingresso cucina veranda" (UIID 7003) - 🔒 CHIUSA, 🔋 100%

#### Fix Duplicazione Sensori nella Tab "Sensori" Vista 3D ✅
- **Problema**: Nella tab "Sensori" alcuni dispositivi apparivano duplicati (es. "Termosifone Studio" 2 volte)
- **Causa**: L'endpoint `/api/elettrodomestici/poi-sensors` aggiungeva lo stesso sensore con sia `poi_id` che `matterport_tag_id` come chiavi
- **Soluzione**: Modificato backend per usare solo una chiave per sensore (`poi_id || tag_id`)
- **File modificato**: `backend/server.py` (endpoint poi-sensors)
- **Risultato**: 5 sensori unici invece di 8 con duplicati

#### Fix Lista POI Non Aggiornata (Tag Importati Mancanti) ✅
- **Problema**: Tag Matterport importati come "Porta Veranda" e "Porta Studio" non apparivano nella lista POI
- **Causa**: Il frontend usava `activeSpace.id` (UUID interno) per filtrare i POI, ma i POI nel DB avevano `space_id` = ID Matterport
- **Soluzione**: Modificato tutti i `loadPois(activeSpace.id)` in `loadPois(activeSpace.space_id || activeSpace.id)`
- **File modificato**: `frontend/src/MatterportManager.js` (13+ occorrenze)
- **Risultato**: 30 POI caricati correttamente inclusi "Porta Veranda" e "Porta Studio Sensore"

---

### ✅ Completati Sessione Precedente (01/02/2026)

#### Logo Trivor sulla Pagina Login ✅
- **Richiesta**: Sostituire/coprire il logo "Made with Emergent" con logo Trivor
- **Implementazione**: Aggiunto overlay fisso in basso a destra con sfondo gradiente che copre il watermark
- **File modificato**: `frontend/src/AuthPage.js`
- **Risultato**: Logo Trivor visibile sia nella pagina login che nell'app autenticata

#### Verifica Dialogo "Modifica POI" ✅
- **Stato**: Già completamente implementato nella sessione precedente
- **Funzionalità confermate**:
  - ✅ Pulsante "Acquisisci posizione dalla vista" - acquisisce coordinate 3D dalla vista corrente
  - ✅ Dropdown "Seleziona un tag Matterport" - acquisisce posizione da tag esistenti  
  - ✅ Pulsante "Elimina" (rosso) - elimina il POI con conferma
  - ✅ Modifica titolo, descrizione, categoria, icona
- **File**: `frontend/src/MatterportManager.js` (linee 2739-2950)

---

### 🎯 Test Suite - 100% PASSED ✅

| Test Category | Status |
|--------------|--------|
| Authentication (Admin, Geasar, Invalid) | ✅ |
| Token Verification | ✅ |
| Multi-Tenant Data Isolation | ✅ |
| Matterport POIs | ✅ |
| SmartThings/eWeLink Integration | ✅ |
| Manutenzioni CRUD | ✅ |
| Config Endpoints | ✅ |
| **Apparato-POI Integration** | ✅ |
| **eWeLink Device Control** | ✅ |
| **POI Sensor Overlays 3D** | ✅ NEW |
| **Apparati POI Badge** | ✅ NEW |

### 📊 Multi-Tenant Isolation Verified

| Utente | Elettrodomestici | Manutenzioni | POI | Space |
|--------|-----------------|--------------|-----|-------|
| Admin | 11 | 16 | 7 | j1r4zUjanif |
| Geasar | 0 | 0 | 99 | cmf7H5A4JdY |

### 🔧 Credenziali Test
- **Admin**: `Admin` / `SmartMaster2026` (Space: `j1r4zUjanif`)
- **Geasar**: `Geasar` / `Geasar2026` (Space: `cmf7H5A4JdY`)

---

### ✅ Bug Fix e Feature Recenti

#### Fix Toggle ON/OFF eWeLink Power Meter ✅ (27/01/2026)
- **Problema**: Il toggle per dispositivi come "Energia V Pc studio" (UIID 190) non funzionava
- **Causa 1**: UIID 190 era nella lista `power_monitor_uiids` che disabilitava erroneamente `canSwitch`
- **Causa 2**: Il dispositivo usava formato `switches` array invece di `switch` singolo per i comandi
- **Soluzione**:
  - Rimosso UIID 190 dalla lista dei "power monitor only"
  - Migliorata logica: ora controlla se `"switches"` è presente nei params per determinare il formato comando
  - Aggiunto UIID 190 alla lista `multi_channel_uiids`
- **File modificati**: 
  - `backend/server.py` (2 occorrenze: endpoint `/ewelink/devices` e fallback SmartThings)
- **Testato**: ✅ Backend curl + Frontend toggle funzionante

#### Fix Normalizzazione Dati Energia ✅ (27/01/2026)
- **Problema**: I valori potenza/consumo erano sbagliati (951W invece di 27W, 1.49kWh invece di 0.38kWh)
- **Causa**: I dati eWeLink S60TPF sono x100 ma la normalizzazione usava soglie errate
- **Soluzione**:
  1. Corretta normalizzazione power: divide per 100 se > 100W
  2. Corretta normalizzazione current: sempre divide per 100
  3. Script pulizia DB per normalizzare dati storici errati
  4. Modificato `energy-summary` per usare dati REALI `dayKwh`/`monthKwh` da eWeLink (non stime)
- **Risultato**:
  - Potenza: 27.9W ✅ (era 951W)
  - Consumo Giornaliero: 0.38 kWh ✅ (era 1.49kWh)
  - Consumo Mensile: 21.6 kWh ✅
- **File modificati**: `backend/server.py`

#### Dati Live sui POI 3D (P1) ✅ (27/01/2026)
- **Feature**: Visualizzazione dati sensore in tempo reale sui tag 3D Matterport
- **Implementazione**:
  - Nuovo endpoint `GET /api/elettrodomestici/poi-sensors` per ottenere tutti i dati sensore dei POI con apparati collegati
  - Modificato `MatterportManager.js` per caricare periodicamente (ogni 30s) i dati sensore
  - Funzione `updatePoiSensorOverlays()` crea tag overlay con temperatura/potenza/stato
  - Colori dinamici: verde (temperatura normale), arancione (caldo), blu (freddo), giallo (potenza attiva)
- **File modificati**:
  - `backend/server.py` (nuovo endpoint poi-sensors)
  - `frontend/src/MatterportManager.js` (loadPoiSensorData, updatePoiSensorOverlays)

#### Indicatore Visivo Apparati con POI (P2) ✅ (27/01/2026)
- **Feature**: Badge "📦 POI 3D" visibile sulle card degli apparati nella lista principale
- **Implementazione**: Aggiunto Badge con icona Box quando `e.matterport_tag_id` è presente
- **Stile**: Badge cyan con bordo, visibile accanto al badge "Smart"
- **File modificati**: `frontend/src/App.js`

#### Fix Calcolo Media Temperature ✅ (01/02/2026)
- **Problema**: Media temperature impossibile (es: Media 1.2°C con Min/Max 2.5°C)
- **Causa**: Dati non normalizzati nel database (244°C invece di 24.4°C) inquinavano la media
- **Soluzione**: 
  1. Script pulizia DB per dividere per 100 valori temperatura > 100
  2. Verificato che la normalizzazione nel collector funziona correttamente
- **Risultato**: Termosifone Studio ora mostra Min=2.4, Media=2.4, Max=2.4 ✅
- **File modificati**: Nessuno (solo cleanup database)

#### Fix Creazione Elettrodomestici senza Token ✅ (27/01/2026)
- **Problema**: Gli elettrodomestici creati non apparivano nella lista perché salvati con `user_id=default-user`
- **Causa**: Le chiamate POST/PUT in `handleSaveElettro` non passavano il token di autenticazione
- **Soluzione**: Aggiunto `?token=${authToken}` alle chiamate axios.post e axios.put
- **Cleanup**: Corretti manualmente gli elettrodomestici già creati (Termosifone Studio, Autoclave, Energia V Pc studio) assegnandoli all'utente corretto
- **File modificati**: `frontend/src/App.js`

#### Normalizzazione Dati Sensori ✅ (26/01/2026)
- **Problema 1**: Potenza mostrava valori x10 (es. 1912W invece di 191W)
  - Fix: Aggiunta normalizzazione /10 per power > 100W in tutti gli endpoint
- **Problema 2**: Card Energia mostrava valori non normalizzati
  - Fix: Normalizzazione /10 in energy-summary per current, min, max, avg
- **Problema 3**: Grafico temperatura non visibile
  - Fix: Il grafico c'era ma era sotto la fold - ora verificato funzionante
- **Risultati dopo fix**:
  - Potenza Attuale: 181W ✅
  - Consumo Giornaliero: 2.37 kWh ✅
  - Stima Mensile: 72.3 kWh (€18.07) ✅
  - Grafico temperatura funzionante ✅
- **File modificati**: 
  - `backend/server.py` (normalizzazione power in devices, report, energy-summary)

#### Fix Sensore Enervia VP Studio + Tab Energia ✅ (26/01/2026)
- **Problema 1**: Sensore "Energia V Pc studio" non rilevato - stato mostrato come SPENTO invece di ACCESO
  - **Fix**: Usato `switchState` invece di `switch` per lo stato
- **Problema 2**: Dati potenza non salvati dal background collector
  - **Fix**: Background collector ora usa `get_devices_with_sensor_values()` che include power meters
- **Problema 3**: Tab Energia mancante in Report Sensori
  - **Fix**: Creata nuova tab "Energia" con:
    - 4 Card riepilogo: Potenza Attuale, Consumo Giornaliero, Stima Mensile, Costo kWh
    - Lista sensori di consumo con grafico storico
- **Risultato**: 
  - Sensore mostra **2785W** in tempo reale
  - Stato **"⚡ ACCESO"** corretto
  - Tab Energia mostra consumi e costi stimati
- **File modificati**: 
  - `backend/server.py` (switchState fix, background collector)
  - `frontend/src/SensorReport.js` (tab Energia, energySummary state)

#### Pulsante "Vai al POI" su Apparati ✅ (26/01/2026)
- **Feature**: Pulsante navigazione (icona freccia cyan) nella card apparato quando ha un POI collegato
- **Comportamento**: Clicca → Naviga automaticamente a Vista 3D → Seleziona POI → Mostra dettagli apparato
- **File modificati**: 
  - `frontend/src/App.js` (handleNavigateToPoi, navigateToPoiId state, pulsante in card)
  - `frontend/src/MatterportManager.js` (props navigateToPoiId, useEffect per navigazione automatica)
- **Testato**: ✅ Funzionante - testato con "Lavatrice Samsung" collegata a "Test POI Import"

#### Bug Fix Creazione POI ✅ (26/01/2026)
- **Problema**: I nuovi POI creati non apparivano nella lista perché usavano `space_id` locale invece di `matterport_space_id`
- **Causa**: Il frontend passava `activeSpace.id` (ID locale DB) invece di `activeSpace.space_id` (ID Matterport)
- **Fix Backend**: Ora usa sempre `user.matterport_space_id` quando disponibile
- **Fix Frontend**: Modificato per usare `activeSpace.space_id` come priorità
- **File modificati**: 
  - `backend/server.py` (endpoint create_poi)
  - `frontend/src/MatterportManager.js` (handleCreatePoiAtPosition)
- **Testato**: ✅ POI creati correttamente e visibili nella lista

#### Indicatori Live sui POI 3D ✅ (24/01/2026)
- **Feature**: Dati sensore in tempo reale visibili quando si seleziona un POI collegato
- **Dati mostrati**: Temperatura, Umidità, Potenza, Voltaggio, Stato ON/OFF
- **Auto-refresh**: Ogni 15 secondi quando il POI è selezionato
- **Endpoint**: `GET /api/elettrodomestici/by-poi/{poi_id}/live-sensor`
- **Badge status**: Online/Offline per ogni sensore
- **File modificati**: 
  - `backend/server.py` (endpoint live-sensor)
  - `frontend/src/MatterportManager.js` (liveSensorData state, UI pannello)
- **Testato**: ✅ Endpoint funzionante

#### Manuale Istruzioni ✅ (24/01/2026)
- Creato `/app/MANUALE_POI_APPARATI_SENSORI.md`
- Guida completa per creare POI, associare apparati e sensori

#### Raccolta Automatica Dati Sensori ✅ (24/01/2026)
- **Feature**: Background job che raccoglie automaticamente i dati dai sensori eWeLink ogni 5 minuti
- **Dati raccolti**: Temperatura, umidità, potenza, voltaggio, corrente
- **Endpoint**:
  - `GET /api/sensors/collection-status` - Stato della raccolta automatica
  - `POST /api/sensors/force-collect` - Forza raccolta manuale
- **Frontend**: Banner verde in Report Sensori mostra stato raccolta, letture ultima ora e oggi
- **File modificati**: 
  - `backend/server.py` (background_sensor_collector, startup/shutdown events)
  - `frontend/src/SensorReport.js` (collection status banner)
- **Testato**: ✅ Background collector attivo, 31 letture nell'ultima ora

#### Associazione Apparati-POI Matterport ✅ (24/01/2026)
- **Feature**: Collegare un apparato a un POI nella vista 3D per creare un vero digital twin
- **Form Apparato**: Aggiunto dropdown POI nella tab "Smart" per selezionare il punto di interesse
- **Vista 3D**: Quando si seleziona un POI collegato, vengono mostrati i dettagli dell'apparato
- **Backend**: Nuovo endpoint `/api/elettrodomestici/by-poi/{poi_id}` per recuperare l'apparato associato
- **Bug Fix**: Corretto bug nella creazione elettrodomestici dove user_id non veniva impostato dal token
- **File modificati**: 
  - `backend/server.py` (nuovo endpoint by-poi, fix user_id)
  - `frontend/src/App.js` (loadMatterportPois, passaggio prop pois)
  - `frontend/src/ElettrodomesticoForm.js` (dropdown POI selector)
  - `frontend/src/MatterportManager.js` (linkedApparato state, dettagli apparato nel pannello POI)
- **Testato**: ✅ Backend 100% (13/13), Frontend 100%

#### Property Configuration Multi-Tenant ✅ (20/01/2026)
- **Problema**: L'Admin vedeva i dati della proprietà di Geasar (GEASAR SPA) invece dei propri dati nella pagina Setup
- **Causa**: L'endpoint `/property/active` non usava il token dell'utente corrente, ma un `DEFAULT_USER_ID` hardcoded
- **Soluzione**: 
  - Modificato `/api/property/active` per accettare `token` come query param e usare `get_user_from_token()`
  - Modificato `/api/property/init-from-env` per creare proprietà con il corretto `user_id`
  - Aggiornato `PropertyConfig.js` per passare `authToken` agli endpoint
- **File modificati**: `backend/server.py`, `frontend/src/PropertyConfig.js`
- **Testato**: ✅ Admin ora vede "La Mia Proprietà" con spazio Matterport `j1r4zUjanif`

#### Fallback SmartThings → eWeLink ✅ (20/01/2026)
- **Problema**: SmartThings restituiva 401 Unauthorized (token scaduto) e i sensori non si caricavano
- **Soluzione**: Implementato fallback automatico a eWeLink nell'endpoint `/smartthings/devices-with-sensors`
- **Normalizzazione dati**: I valori eWeLink (spesso x100) vengono convertiti correttamente (es. 2210 → 22.1°C)
- **File modificati**: `backend/server.py` (aggiunto `get_ewelink_devices_internal()`, logica fallback)
- **Testato**: ✅ 21 dispositivi eWeLink caricati, sensori mostrano valori corretti (22.1°C, 51%)

#### Creazione Manutenzione da Scheda Apparato ✅ (19/01/2026)
- **Problema**: Cliccando "Nuova Manutenzione" dalla scheda apparato, la manutenzione non veniva creata ("Errore nel salvataggio")
- **Causa**: Il codice impostava `editingManut = { elettrodomestico_id: ... }` che il sistema interpretava come richiesta di MODIFICA invece di CREAZIONE
- **Soluzione**: Introdotto nuovo stato `preselectedElettroId` separato per pre-compilare l'elettrodomestico senza interferire con la logica edit/create
- **File modificato**: `frontend/src/App.js` (ManutenzioneDialog, handleSaveManut, onClick del pulsante nella scheda)
- **Testato**: ✅ Backend con curl, Frontend con Playwright

#### Assegnazione Spazio Matterport agli Utenti ✅ (19/01/2026)
- **Problema**: I campi `matterport_space_id` e `matterport_space_name` non venivano salvati nella creazione utente
- **Soluzione**: Aggiunto i campi mancanti nel costruttore `User` e nella response `UserResponse` in `server.py`
- **Bug fix 2**: Login e verify session ora restituiscono `matterport_space_id` per l'utente
- **Bug fix 3**: `SmartBuildingDashboard` e `MatterportManager` ora usano lo spazio assegnato all'utente invece del default globale
- **Utente Geasar**: Testato con spazio `cmf7H5A4JdY` (GEASAR - Aeroporto Olbia) ✅

#### Supporto MPSKIN Tour ✅ (19/01/2026)
- **Nuovo campo**: `mpskin_url` aggiunto al modello utente
- **Gestione Utenti**: Campo "MPSKIN Tour URL" nel dialog di modifica utente
- **Dashboard Dinamica**: Se l'utente ha `mpskin_url` configurato, mostra iframe MPSKIN invece di Matterport nativo
- **Badge Visuale**: Indicatore "MPSKIN Tour" viola nella lista utenti e nel viewer
- **Setup Allineato**: Tab Matterport in Setup mostra e permette di modificare MPSKIN URL dell'utente
- **Dati Utente Pre-popolati**: Space ID e MPSKIN URL vengono caricati automaticamente dal profilo utente
- **Utente Geasar**: Configurato con `https://tour.fairsgate.com/it/tour/mppdp7qpem`

### ✅ Funzionalità Completate

#### 1. Sistema Multi-Utente con Multi-Tenant
- **Login Page**: Interfaccia moderna con autenticazione
- **Admin Master**: User=Admin, Password=SmartMaster2026
- **Ruoli**: Admin e User
- **Multi-Tenant**: Ogni utente vede solo i propri dati
- **Selezione Spazio Matterport**: Ogni utente può avere uno spazio assegnato
- **Migration completata**: Tutti i dati migrati all'Admin

#### 2. Sincronizzazione POI su Matterport Cloud ✅
- **"Sincronizza su Cloud"**: Pulsante per ogni POI
- **Badge stato**: "Sincronizzato su Cloud" verde / "Non sincronizzato" grigio
- **Risincronizza**: Pulsante per aggiornare POI già sincronizzati
- **POI Test**: Sensore_T1 sincronizzato con tag ID `7ngjGPepnE4`
- **API GraphQL**: `addMattertag` mutation con floor detection automatico

#### 3. Filtro Categorie Dinamico ✅
- **Endpoint**: `GET /api/categorie-all` - Ritorna tutte le categorie
- **Categorie standard**: 16 (frigorifero, lavatrice, climatizzatore, etc.)
- **Categorie custom**: Supporto per categorie personalizzate
- **Frontend**: Dropdown aggiornato con liste dinamiche

#### 4. Menu e UI Refactoring ✅
- **"Proprietà"** → **"Setup"**
- **"Elettrodomestici"** → **"Apparati"**
- **"Centri Assistenza"** spostato dentro Setup
- **"Utenti"**: Tab visibile solo per Admin

#### 5. Scheda Apparato ✅ (19/01/2026)
- **Pulsante "Apri Scheda"**: Su ogni card apparato
- **Dialog con Tabs**:
  - Tab "Manutenzioni": Lista completa interventi con stato, tipo, data, costo
  - Tab "Dettagli": Info complete apparato (marca, modello, seriale, garanzia)
  - Tab "Documenti": Placeholder per allegati
- **Riepilogo**: Interventi totali, completate, totale speso (€)
- **Azione rapida**: "+ Nuova Manutenzione" dal dialog

#### 6. Layout Vista 3D Ottimizzato ✅ (19/01/2026)
- **Viewer 3D grande**: ~80% dello schermo
- **Sidebar compatta**: Lista POI/Spazi a destra
- **Sidebar collassabile**: Toggle per espandere/comprimere
- **Tabs nella sidebar**: "POI" e "Spazi" separati
- **Indicatori sensori**: Temperatura/umidità live nei POI

#### 7. Percorso Navigazione POI ✅ (19/01/2026)
- **State navigationPath**: Array punti navigazione
- **Dots animati**: Pulse animation con delay progressivo
- **Pulsante "Clear"**: Per pulire il percorso
- **Indicatore**: "{n} punti" nel header

#### 8. Matterport Cloud API ✅
- **Autenticazione**: Basic Auth (Token ID + Token Secret)
- **Spazi disponibili**: 10 modelli dall'account
- **Endpoint funzionanti**:
  - `GET /api/matterport/cloud/spaces` - Lista spazi
  - `POST /api/matterport/cloud/test-connection` - Test credenziali
  - `POST /api/matterport/cloud/sync-poi/{poi_id}` - Sincronizza POI
  - `POST /api/matterport/cloud/models/{model_id}/tags` - Crea Mattertag

### Integrazioni Attive

| Integrazione | Stato | Note |
|--------------|-------|------|
| Matterport SDK | ✅ FUNZIONANTE | Vista 3D con 10 POI |
| Matterport Cloud API | ✅ FUNZIONANTE | Sincronizzazione tag |
| SmartThings | ⚠️ Token scaduto | Richiede rigenerazione |
| eWeLink | ✅ FUNZIONANTE | OAuth2, 17 dispositivi |
| Ezviz | ✅ WORKAROUND | Snapshot refresh 5s |

### Database Collections

| Collection | Dati |
|------------|------|
| users | 2 utenti (Admin, Geasar) |
| elettrodomestici | 11 apparati |
| pois | 10 POI (1 sincronizzato su cloud) |
| manutenzioni | 12 |
| tickets | 11 |
| sessions | Token attivi |

### Credenziali

#### Admin Master
- **Username**: Admin
- **Password**: SmartMaster2026

#### Matterport API
- **Token ID**: 90ec1bd71e4935b5
- **Token Secret**: c9c684136ae5797fdecf3ed6bc0aca61

### API Autenticazione

```
POST /api/auth/login - Login
POST /api/auth/logout - Logout
GET /api/auth/verify - Verifica sessione
GET /api/users - Lista utenti (admin)
POST /api/users - Crea utente (admin)
```

### API Multi-Tenant

Tutte le API principali ora accettano `?token=...` per filtrare i dati per utente:
- `GET /api/elettrodomestici?token=...`
- `GET /api/manutenzioni?token=...`
- `GET /api/matterport/pois?token=...`
- `GET /api/categorie-all?token=...`

## Task Futuri

### P0 (Alta Priorità)
- [x] ~~Associazione Apparati con POI Matterport~~ ✅ COMPLETATO 24/01/2026
- [x] ~~Raccolta automatica dati sensori (background job eWeLink)~~ ✅ COMPLETATO 24/01/2026
- [x] ~~Indicatori di stato sui POI 3D (temperatura/consumo live sui tag)~~ ✅ COMPLETATO 24/01/2026

### P1 (Media Priorità)
- [ ] Notifiche push per eventi critici (temperatura troppo alta/bassa)
- [ ] Dashboard statistiche per utente
- [ ] Alert manutenzione scaduta

### P2 (Bassa Priorità)
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] Traduzione POI automatica multilingua
- [ ] App Mobile (PWA o React Native)
