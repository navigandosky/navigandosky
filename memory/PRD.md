# SmartDomo - PRD

## Stato Attuale (17/01/2026)

### ✅ Funzionalità Completate Oggi

#### Sistema Multi-Utente (NUOVO)
- **Login Page**: Interfaccia moderna con gradiente blu/slate
- **Autenticazione**: Username/password con hash SHA256
- **Ruoli**: Admin e User
- **Admin Master**: User=Admin, Password=SmartMaster2026
- **Gestione Utenti**: Solo admin può creare/modificare/eliminare utenti
- **Sessioni**: Token con scadenza 7 giorni
- **Tab "Utenti"**: Visibile solo agli admin nel menu principale

#### Menu e UI Refactoring
- **Rinominato**: "Elettrodomestici" → "Apparati"  
- **Rinominato**: "Proprietà" → "Setup"
- **Spostato**: "Centri Assistenza" dentro Setup (nuova sottotab)
- **Aggiunta**: Tab "Utenti" per gestione multi-utente (solo admin)
- **Header**: Mostra utente corrente con ruolo e pulsante logout

#### Matterport Cloud API
- Sezione configurazione in Setup → Matterport
- Istruzioni per ottenere Client ID e Client Secret
- Campi per inserire credenziali API
- Backend endpoint `/api/matterport/cloud/sync-poi/{poi_id}` per sincronizzare POI

#### SmartThings Token
- Token aggiornato nel database: `ddde0bd8-0d53-48c7-a94d-4cb55c890fd0`
- Nota: Token potrebbe richiedere rigenerazione da parte utente

### ✅ Funzionalità Precedenti

#### eWeLink Integration (OAuth2)
- OAuth2 completo con firma HMAC-SHA256
- 17 dispositivi visibili
- Alternativa stabile a SmartThings per Sonoff

#### Ezviz Camera
- Workaround con snapshot refresh ogni 5 secondi
- Endpoint `/api/ezviz/camera/{serial}/capture`

#### Altre Funzionalità
- SmartThings caching (TTL 2 min)
- LED stato POI (🔴 ON, ⚫ OFF)
- Navigazione 3D verso POI
- Report Sensori
- Ticket e Manutenzioni
- Calendario
- Configurazione Proprietà completa

## Architettura

### Database Collections
- `users` - Utenti con ruoli
- `sessions` - Token di sessione
- `property_config` - Configurazione proprietà
- `elettrodomestici` - Apparati/Elettrodomestici
- `manutenzioni`, `tickets`, `centri_assistenza`
- `matterport_pois` - POI con link SmartThings

### API Nuove (17/01/2026)
- `POST /api/auth/init-admin` - Crea admin iniziale
- `POST /api/auth/login` - Login utente
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verifica sessione
- `GET /api/users` - Lista utenti (admin)
- `POST /api/users` - Crea utente (admin)
- `PUT /api/users/{id}` - Modifica utente
- `DELETE /api/users/{id}` - Elimina utente (admin)

## Credenziali Test

### Admin Master
- **Username**: Admin
- **Password**: SmartMaster2026

### SmartThings
- Token nel database, da verificare se valido

### eWeLink
- App ID e Secret configurati in backend/.env
- OAuth2 funzionante

### Ezviz
- Credenziali in backend/.env

## Task Futuri

### P0 (Alta Priorità)
- [ ] Testare creazione nuovo utente
- [ ] Verificare login con nuovo utente
- [ ] Verificare SmartThings con nuovo token (potrebbe essere scaduto)

### P1 (Media Priorità)
- [ ] Filtro categorie dinamico (endpoint backend)
- [ ] Raccolta automatica dati sensori (background job)
- [ ] Notifiche intelligenti

### P2 (Bassa Priorità)
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] Traduzione POI multilingua
