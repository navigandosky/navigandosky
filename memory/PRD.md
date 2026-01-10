# SmartDomo - PRD (Product Requirements Document)

## Problema Originale
Costruire un'applicazione "SmartDomo" per la gestione di un edificio smart con:
- Gestione elettrodomestici, centri assistenza, manutenzioni e ticket
- Integrazione SmartThings, Ezviz e Matterport
- Gemello digitale 3D interattivo

## Architettura
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Integrazioni**: SmartThings, Ezviz, Matterport SDK, Open-Meteo, Emergent LLM

## Funzionalità Implementate

### Core Features
- [x] Dashboard principale con tab multipli
- [x] Gestione elettrodomestici (CRUD completo)
- [x] Gestione centri assistenza
- [x] Sistema ticket con stati unificati
- [x] Calendario manutenzioni
- [x] Assistente AI con azioni interattive
- [x] Generazione QR code
- [x] Gestione planimetrie

### Integrazioni
- [ ] **SmartThings** - ⚠️ RICHIEDE TOKEN VALIDO (attualmente 401 Unauthorized)
- [x] **Ezviz** - 7 telecamere (API EU Open Platform)
- [x] **Open-Meteo** - Meteo in tempo reale
- [x] **Matterport SDK** - Integrazione completa ✅

### Matterport SDK Integration (10/01/2026)
- [x] SDK Key configurata: `59wwqhip77fxkqiurcae74fed`
- [x] Space ID: `j1r4zUjanif`
- [x] Connessione SDK con badge "SDK Connesso"
- [x] Caricamento automatico Mattertag (5 POI dal modello)
- [x] Navigazione programmatica ai tag importati
- [x] Controlli fullscreen e refresh
- [x] Creazione POI con visualizzazione in 3D
- [x] Acquisizione coordinate dalla vista 3D
- [x] Tag visibili nella vista Matterport
- [x] **Lista POI compatta e numerata** ✅
- [x] **Tour guidato automatico** ✅
- [x] **Layout più ampio** ✅

### Gestione Spazi 3D & POI (10/01/2026)
- [x] Archivio spazi Matterport multi-spazio
- [x] Import selettivo tag da Matterport
- [x] Database POI con traduzioni multilingue (IT, EN, DE, FR, ES)
- [x] Traduzione automatica via AI (GPT)
- [x] Generazione audio TTS per audioguide
- [x] Upload allegati (PDF, immagini, video)
- [x] Creazione POI da coordinate 3D

### UI/UX Improvements
- [x] Migliorato contrasto colori nei dialog
- [x] Sfondo dialog: `bg-slate-800` per migliore leggibilità
- [x] Input con sfondo `bg-slate-700` e testo bianco
- [x] Box verde per posizione acquisita
- [x] Pulsanti con colori distintivi (cyan/green)
- [x] Lista POI compatta con numeri progressivi
- [x] Tour guidato con progress bar e possibilità di interruzione

## Problemi Noti

### P0 - SmartThings Token Non Valido (CRITICO)
- **Descrizione**: `SMARTTHINGS_TOKEN=domoticbrain` non è un PAT valido
- **Impatto**: Tutti gli endpoint SmartThings falliscono con 401/520
- **Soluzione**: Utente deve fornire il PAT corretto da https://account.smartthings.com/tokens

### P1 - Navigazione POI Creati Manualmente (LIMITAZIONE SDK)
- **Descrizione**: I POI creati con `Mattertag.add()` sono temporanei e non navigabili dopo reload
- **Causa Root**: L'SDK Matterport non persiste i tag creati dinamicamente nel modello originale
- **Impatto**: La funzione "Vai al POI" non funziona per POI creati manualmente
- **Workaround implementato**: Navigazione per coordinate usando lo sweep più vicino
- **Stato**: Il fallback per coordinate è implementato ma dipende dall'API `Sweep.data` che richiede subscription asincrona

### P2 - SmartThings Rate Limiting (dopo fix token)
- **Descrizione**: Errori 429 quando troppe chiamate API simultanee
- **Impatto**: Dati mancanti al caricamento iniziale (Clima, Stato Sistema)
- **Soluzione proposta**: Implementare caching backend con TTL 60-120s

## Nota Tecnica su Matterport

### Tag Nativi vs Tag Dinamici
1. **Tag Nativi** (importati dal modello): Navigazione funziona perfettamente con `navigateToTag()`
2. **Tag Dinamici** (creati con `Mattertag.add()`): 
   - Visibili nella sessione corrente
   - Non persistono dopo reload
   - Non navigabili con `navigateToTag()` - restituisce "does not map to a valid Tag"
   - Serve navigazione per coordinate come fallback

### API di Navigazione per Coordinate
```javascript
// L'API corretta per ottenere gli sweep:
sdk.Sweep.data.subscribe({
  onCollectionUpdated: (collection) => {
    // collection è un oggetto iterabile, non un array
    const sweeps = [];
    for (const item of collection) {
      sweeps.push(item);
    }
    // Trova lo sweep più vicino alle coordinate del POI
  }
});
```

## API Endpoints Principali

### Matterport
- `GET /api/matterport/spaces` - Lista spazi
- `POST /api/matterport/spaces` - Crea spazio
- `GET /api/matterport/pois` - Lista POI (12 POI attualmente)
- `POST /api/matterport/spaces/{id}/import-tags` - Importa tag
- `POST /api/matterport/pois` - Crea nuovo POI
- `PUT /api/matterport/pois/{id}` - Aggiorna POI
- `DELETE /api/matterport/pois/{id}` - Elimina POI
- `POST /api/matterport/pois/{id}/translate` - Traduci POI
- `POST /api/matterport/pois/{id}/generate-audio` - Genera audio TTS

## File di Riferimento
- `backend/server.py` - API monolitica (da refactorare)
- `frontend/src/MatterportViewer.js` - Componente SDK Matterport
- `frontend/src/MatterportManager.js` - Gestione Spazi e POI
- `frontend/src/SmartBuildingDashboard.js` - Dashboard SmartDomo

## Prossimi Task

### P0 - Alta Priorità
1. ⏳ Ricevere token SmartThings valido da utente
2. ⏳ Implementare caching SmartThings (dopo fix token)
3. ⏳ Migliorare navigazione POI manuali (ricerca soluzione alternativa)

### P1 - Media Priorità
4. Refactoring server.py in moduli
5. Test end-to-end completo

### P2 - Bassa Priorità
6. Multi-tenancy
7. Analisi storica consumi
8. QR code scanning
9. Notifiche push
10. Restauro sito Trivor.it

## Credenziali (Backend .env)
- `MATTERPORT_SDK_KEY`: 59wwqhip77fxkqiurcae74fed
- `MATTERPORT_SPACE_ID`: j1r4zUjanif
- `EZVIZ_APPKEY`: Configurato (AccessToken EU)
- `SMARTTHINGS_TOKEN`: **DA CONFIGURARE** (attuale `domoticbrain` è placeholder)
- `EMERGENT_LLM_KEY`: Configurato

---
*Ultimo aggiornamento: 10 Gennaio 2026*
