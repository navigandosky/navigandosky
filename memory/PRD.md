# SmartDomo - PRD

## Stato Attuale (10/01/2026)

### ✅ Funzionalità Completate

#### SmartThings (22 dispositivi)
- Caching backend (TTL 2 min) per evitare 429 errors
- LED stato in lista POI (🔴 ON, ⚫ OFF)
- Pulsante Power per on/off
- Dialog collegamento POI ↔ Device
- Token aggiornato (10/01/2026): `4066cd17-6bb5-45d1-887f-1dd84e2a204c`

#### Pagina Configurazione Proprietà (NUOVO 10/01/2026)
- Tab "Proprietà" nel menu principale
- **Generale**: Nome, descrizione, meteo (città, lat/lon)
- **Dati Catastali**: Indirizzo, foglio/particella/subalterno, categoria, rendita, superficie, classe energetica, vani, anno costruzione
- **Integrazioni**: SmartThings (token), eWeLink (email/password), Ezviz (credenziali)
- **Matterport**: Space ID, SDK Key
- Inizializzazione automatica da .env esistente

#### Indicatore Stato negli Elettrodomestici
- Badge "Smart" con stato ACCESO/SPENTO
- LED rosso lampeggiante se ON
- LED grigio se OFF
- Aggiornamento automatico

#### Navigazione POI 
- Metodo 1: `navigateToTag()` per tag Matterport
- Metodo 2: `Sweep.moveTo()` con sweep_id salvato
- Metodo 3: Ricerca dinamica sweep più vicino
- **VERIFICA UTENTE PENDENTE**

## Note Tecniche

### Database Collections
- `property_config` - Configurazione proprietà centralizzata
- `matterport_pois` - POI con link SmartThings
- `elettrodomestici`, `manutenzioni`, `tickets`, `centri_assistenza`

### API Nuove
- `POST /api/property` - Crea proprietà
- `GET /api/property/active` - Proprietà attiva
- `PUT /api/property/{id}` - Aggiorna proprietà
- `POST /api/property/init-from-env` - Inizializza da .env

## Prossimi Task
1. Verifica "Vai a POI" da parte utente
2. Integrazione eWeLink (quando pronto)
3. Sistema Multi-Utente con ruoli
4. Revisione menu header

## File Modificati (Sessione 10/01/2026)
- `backend/server.py` - Modelli PropertyConfig + API
- `backend/.env` - Token SmartThings
- `frontend/src/PropertyConfig.js` - NUOVO
- `frontend/src/App.js` - Tab Proprietà

---
*Ultimo aggiornamento: 10 Gennaio 2026*
