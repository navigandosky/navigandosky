# SmartDomo - PRD

## Stato Attuale (20/01/2026)

### ✅ Bug Fix Recenti

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
- [ ] Segregazione SmartThings/eWeLink: Usare eWeLink per sensori non-Samsung
- [ ] Rigenerare SmartThings token (solo per dispositivi Samsung)

### P1 (Media Priorità)
- [ ] Raccolta automatica dati sensori (background job)
- [ ] Notifiche push per eventi critici
- [ ] Dashboard statistiche per utente

### P2 (Bassa Priorità)
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] Traduzione POI automatica multilingua
