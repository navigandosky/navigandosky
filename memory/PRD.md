# SmartDomo - PRD

## Stato Attuale (01/06/2026)

### Completato Oggi (01/06/2026) - Sessione 5

#### Nuova Funzione: Inventario Ambienti con AI Vision
- **Backend**: 10 nuovi endpoint CRUD per ambienti e oggetti + endpoint AI per scansione immagini
  - `GET/POST /api/inventario/ambienti` - CRUD ambienti
  - `POST /api/inventario/ambienti/{id}/immagini` - Upload immagini (base64 + paste)
  - `POST /api/inventario/ambienti/{id}/elabora` - Analisi AI con GPT-4o vision
  - `GET/POST/PUT/DELETE /api/inventario/oggetti` - CRUD oggetti inventario
- **Frontend**: Nuovo componente `Inventario.js` con:
  - Gestione ambienti (crea/modifica/elimina)
  - Upload multiplo immagini (paste Ctrl+V + pulsante Aggiungi Foto)
  - Pulsante "Elabora con AI" che analizza immagini e identifica oggetti
  - Tabella oggetti con: codice, descrizione, quantita, valore nuovo, valore attuale, seriale, POI link
  - Associazione POI Matterport per ogni oggetto
  - Card riepilogative con totali
- **File**: `frontend/src/Inventario.js`, `backend/server.py` (endpoint aggiunti)

#### Riorganizzazione Navigazione con Gruppi Colorati
- Gruppo 1 (Blu): Vista 3D, Video Cam, SmartDomo, Report Sensori
- Gruppo 2 (Ambra): Manutenzioni, Calendario, Apparati, Ticket
- Gruppo 3 (Verde): Veicoli
- Gruppo 4 (Viola): Assistente, Inventario
- Gruppo 5 (Grigio): Setup, Utenti

#### Fix Errore insertBefore / Error Overlay
- Rimosso Error Boundary che causava loop infinito di refresh
- Disabilitato error overlay del dev server via craco.config.js
- Aggiunto translate="no" per bloccare Google Translate
- Tornato a early-return rendering (approccio originale stabile)
- Rimosso React StrictMode che conflittava con Matterport SDK
- Spostato Toaster nel wrapper App() stabile

#### Fix "t is not defined" in CentroAssistenzaDialog
- Aggiunto useLanguage() hook nei componenti CentroAssistenzaDialog e ManutenzioneDialog

### Completato (25/03/2026) - Sessione 3-4
- Fix regressione click Tag 3D Matterport
- Fix timeout sessione P2
- Dati live sensori temperatura/umidita nel pannello 3D
- Stato Aperto/Chiuso per sensori porta nel pannello 3D
- Sistema i18n multi-lingua (IT, EN, FR, ES)

---

## Integrazioni Attive

| Integrazione | Stato | Note |
|---|---|---|
| Matterport SDK | FUNZIONANTE | Vista 3D con 36 POI |
| eWeLink | FUNZIONANTE | 27 dispositivi |
| SmartThings | TOKEN SCADUTO | Richiede nuovo PAT |
| EZVIZ | FUNZIONANTE | |
| Balin GPS | FUNZIONANTE | |
| GPT-4o Vision | FUNZIONANTE | Per analisi inventario |

## Issues Aperti

### P1 - SmartThings Disconnesso
- **Stato**: BLOCCATO - Richiede azione utente
- **Azione**: Generare nuovo PAT su https://account.smartthings.com/tokens

## Task Futuri

### P0
- [ ] Refactoring `server.py` (9500+ righe) in moduli separati

### P1
- [ ] Token refresh automatico SmartThings
- [ ] Refactoring `App.js`
- [ ] Aggiungere `user_id` a collection `ewelink_tokens`

### P2
- [ ] Creazione POI per MPSKIN
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
│   └── server.py (9500+ righe)
└── frontend/src/
    ├── App.js
    ├── Inventario.js (NUOVO)
    ├── MatterportManager.js, MatterportViewer.js
    ├── SensorReport.js, PropertyConfig.js
    ├── SmartBuildingDashboard.js, VehicleTracker.js
    ├── VideoCameraManager.js, ElettrodomesticoForm.js
    ├── AuthPage.js, PlanimetriaSuggerimenti.js
    └── i18n/ (LanguageContext.js, LanguageSelector.js, translations/)
```
