# SmartDomo - PRD

## Stato Attuale (19/01/2026)

### ✅ Bug Fix Recenti

#### Assegnazione Spazio Matterport agli Utenti ✅ (19/01/2026)
- **Problema**: I campi `matterport_space_id` e `matterport_space_name` non venivano salvati nella creazione utente
- **Soluzione**: Aggiunto i campi mancanti nel costruttore `User` e nella response `UserResponse` in `server.py`
- **Utente Geasar**: Aggiornato con spazio `cmf7H5A4JdY` (GEASAR)

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
