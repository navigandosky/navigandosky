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

#### Matterport Cloud API ✅ FUNZIONANTE
- **Autenticazione**: Basic Auth con Token ID + Token Secret
- **Test connessione**: Verifica credenziali e conta modelli (16 trovati)
- **Endpoint**: `/api/matterport/cloud/test-connection`
- **Sincronizzazione POI**: `/api/matterport/cloud/sync-poi/{poi_id}`
- **Creazione tag**: `/api/matterport/cloud/models/{model_id}/tags`
- **Istruzioni aggiornate** nel frontend con guide passo-passo

#### SmartThings Token
- Token inserito nel database: `ddde0bd8-0d53-48c7-a94d-4cb55c890fd0`
- ⚠️ Nota: Il token potrebbe richiedere rigenerazione (401 a volte)

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

### API Autenticazione
- `POST /api/auth/init-admin` - Crea admin iniziale
- `POST /api/auth/login` - Login utente
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verifica sessione
- `GET /api/users` - Lista utenti (admin)
- `POST /api/users` - Crea utente (admin)
- `PUT /api/users/{id}` - Modifica utente
- `DELETE /api/users/{id}` - Elimina utente (admin)

### API Matterport Cloud
- `POST /api/matterport/cloud/test-connection` - Testa credenziali
- `POST /api/matterport/cloud/models/{model_id}/tags` - Crea Mattertag
- `POST /api/matterport/cloud/sync-poi/{poi_id}` - Sincronizza POI locale

## Credenziali Test

### Admin Master
- **Username**: Admin
- **Password**: SmartMaster2026

### Matterport API ✅
- **Token ID**: 90ec1bd71e4935b5
- **Token Secret**: c9c684136ae5797fdecf3ed6bc0aca61
- **Modelli trovati**: 16

### eWeLink ✅
- OAuth2 funzionante, 17 dispositivi

### Ezviz ✅
- Snapshot workaround funzionante

## Task Futuri

### P0 (Alta Priorità)
- [ ] Implementare sincronizzazione POI → Mattertag su cloud
- [ ] Testare "Vai a POI" con navigazione Matterport

### P1 (Media Priorità)
- [ ] Filtro categorie dinamico (endpoint backend)
- [ ] Raccolta automatica dati sensori (background job)
- [ ] Rigenerare SmartThings token se necessario

### P2 (Bassa Priorità)
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] Traduzione POI multilingua
- [ ] Notifiche push
