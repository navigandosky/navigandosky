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
- **Selezione Spazio Matterport**: Ogni utente può avere uno spazio Matterport associato

#### Menu e UI Refactoring
- **Rinominato**: "Elettrodomestici" → "Apparati"  
- **Rinominato**: "Proprietà" → "Setup"
- **Spostato**: "Centri Assistenza" dentro Setup (nuova sottotab)
- **Aggiunta**: Tab "Utenti" per gestione multi-utente (solo admin)
- **Header**: Mostra utente corrente con ruolo e pulsante logout

#### Matterport Cloud API ✅ FUNZIONANTE
- **Autenticazione**: Basic Auth con Token ID + Token Secret
- **Lista Spazi**: 10 modelli disponibili nell'account
- **Sincronizza su Cloud**: Pulsante per ogni POI
- **API Endpoints**:
  - `GET /api/matterport/cloud/spaces` - Lista spazi
  - `POST /api/matterport/cloud/test-connection` - Test credenziali
  - `POST /api/matterport/cloud/sync-poi/{poi_id}` - Sincronizza POI
  - `POST /api/matterport/cloud/models/{model_id}/tags` - Crea Mattertag

#### Pannello POI Completo
- **Badge stato sincronizzazione**: "Non sincronizzato" / "Sincronizzato su Cloud"
- **Sezione Matterport Cloud**: Con descrizione e pulsante
- **Traduzioni**: 5 lingue (IT, EN, DE, FR, ES) con pulsante "Traduci"
- **Audio Guide**: Pulsante "Genera Audio"
- **SmartThings**: Collegamento dispositivi con controllo ON/OFF
- **Allegati**: Upload file
- **Navigazione 3D**: "Vai al POI"

### ✅ Funzionalità Precedenti

#### eWeLink Integration (OAuth2)
- OAuth2 completo con firma HMAC-SHA256
- 17 dispositivi visibili

#### Ezviz Camera
- Workaround con snapshot refresh ogni 5 secondi

#### Altre Funzionalità
- SmartThings caching (TTL 2 min)
- LED stato POI (🔴 ON, ⚫ OFF)
- Report Sensori
- Ticket e Manutenzioni
- Calendario

## Architettura

### Database Collections
- `users` - Utenti con ruoli e spazio Matterport
- `sessions` - Token di sessione
- `property_config` - Configurazione proprietà
- `elettrodomestici` - Apparati/Elettrodomestici
- `manutenzioni`, `tickets`, `centri_assistenza`
- `matterport_pois` - POI con sync status

### API Autenticazione
- `POST /api/auth/init-admin` - Crea admin iniziale
- `POST /api/auth/login` - Login utente
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verifica sessione
- `GET /api/users` - Lista utenti (admin)
- `POST /api/users` - Crea utente (admin)
- `PUT /api/users/{id}` - Modifica utente
- `DELETE /api/users/{id}` - Elimina utente

### API Matterport Cloud
- `GET /api/matterport/cloud/spaces` - Lista spazi account
- `POST /api/matterport/cloud/test-connection` - Test connessione
- `POST /api/matterport/cloud/models/{model_id}/tags` - Crea Mattertag
- `POST /api/matterport/cloud/sync-poi/{poi_id}` - Sincronizza POI

## Credenziali

### Admin Master
- **Username**: Admin
- **Password**: SmartMaster2026

### Matterport API ✅
- **Token ID**: 90ec1bd71e4935b5
- **Token Secret**: c9c684136ae5797fdecf3ed6bc0aca61
- **Spazi trovati**: 10 (Aerostazione Costa Smeralda, Viale Murichessa, etc.)

## Task Futuri

### P0 (Alta Priorità)
- [ ] Testare sincronizzazione POI → Mattertag (cliccare "Sincronizza su Cloud")
- [ ] Verificare che il POI appaia su my.matterport.com

### P1 (Media Priorità)
- [ ] Filtro categorie dinamico
- [ ] Raccolta automatica dati sensori
- [ ] Multi-tenant completo (dati separati per utente)

### P2 (Bassa Priorità)
- [ ] QR Code scanning
- [ ] Export dati CSV/Excel
- [ ] Traduzione POI multilingua automatica
