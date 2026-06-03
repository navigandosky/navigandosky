# SmartDomo - PRD

## Stato Attuale (03/06/2026)

### Completato Oggi (03/06/2026) - Sessione 7

#### Nuovo Modulo: DIPENDENTI (HR) - COMPLETATO ✅
- **Backend** (`/app/backend/dipendenti_routes.py`, nuovo router): 
  - CRUD Sedi, Tipi Contratto, Dipendenti (con filtri sede/mansione/stato/q)
  - Upload documenti per dipendente (base64 in MongoDB)
  - CRUD Assunzioni (con bonus extra, contratto allegato, auto-update `dipendente.stato='assunto'`)
  - CRUD Buste Paga + Pagamenti (acconti) con calcolo Dovuto/Pagato/Residuo
  - PDF: elenco dipendenti, scheda dipendente, busta paga (reportlab)
  - Email PDF via **Resend** (`POST /api/dipendenti/email/send`) con destinatari multipli
- **Frontend** (`/app/frontend/src/Dipendenti.js`, nuovo): 3 subtab (Archivio, Assunzioni, Stipendi)
  - Dialog completo per dipendente (anagrafica, contatti, professionale, documenti)
  - Dialog assunzione (contratto, ore, tariffe, bonus, allegato)
  - Dialog busta paga + dialog acconto pagamento
  - Dialog invio email con destinatari multipli (+ aggiungi)
  - Filtri attivi, esportazione PDF + invio mail
- **Module Config**: `dipendenti` aggiunto ai moduli toggleable (default ON), card rose nella nav
- **Integrazione**: aggiunti `RESEND_API_KEY` e `SENDER_EMAIL=onboarding@resend.dev` in `/app/backend/.env`; installati `resend==2.30.1` e `reportlab==4.5.1`
- **Testing**: 37/37 pytest backend pass, frontend smoke OK. Test files: `/app/backend/tests/test_dipendenti.py`

#### Fix Bug Inventario AI
- Errore "float() argument must be ... not 'NoneType'" risolto con helper `_safe_int`/`_safe_float` quando l'AI ritorna valori `null`

## Stato Precedente (02/06/2026) - Sessione 6

#### Configurazione Moduli per Utente - COMPLETATO
- **Backend**:
  - `PUT /api/users/{user_id}/modules` salva `modules_enabled` per utente
  - `/auth/login` e `/auth/verify` ora restituiscono `modules_enabled`
- **Frontend (PropertyConfig.js)**:
  - Sezione admin "Configurazione Moduli" con toggle on/off per moduli secondari
  - Moduli sempre attivi: Vista 3D, Video Cam, SmartDomo, Report Sensori, Setup
  - Moduli configurabili: Manutenzioni, Calendario, Apparati, Ticket, Veicoli, Assistente AI, Inventario
- **Frontend (App.js)**:
  - Helper `isModuleEnabled(moduleId)` controlla `currentUser.modules_enabled`
  - Tab dei moduli disabilitati nascosti dalla navigazione raggruppata
  - Auto-redirect a "matterport" se l'`activeTab` corrente diventa disabilitato
  - Default: tutti i moduli abilitati (`!== false`)
- **Test E2E**: Disabilitati `manutenzioni` + `tickets` via API, verificato che spariscono dalla nav e che `calendario` + `veicoli` rimangono visibili. Ripristinati per Admin.

## Stato Precedente (01/06/2026) - Sessione 5

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
