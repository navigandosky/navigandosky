# Trivor Suite - Product Requirements Document

## Original Problem Statement
Suite aziendale completa per Trivor SRL che include:
1. **Sito Web Pubblico**: Landing page corporate con portfolio progetti
2. **TrivorSuite**: Dashboard centrale per applicazioni aziendali
3. **TRIVORDOC**: Sistema gestione documentale avanzato
4. **TrivorWEB**: CMS per gestione siti web clienti
5. **CheckDB**: Utility monitoraggio database MongoDB
6. **Archivio Contatti**: Rubrica condivisa centralizzata
7. **TrivorMEET**: Videoconferenze con Jitsi (gratuito, senza limiti)
8. **Gallery Digital Twin**: Tour virtuali Matterport/MPSkin dinamici

---

## Completed Features ✅

### Sito Pubblico (31 Dicembre 2025)
- ✅ Landing page con Hero dinamico
- ✅ Nuovo slogan: "Valorizziamo il Patrimonio Turistico, Ambientale Culturale"
- ✅ Sottotitolo: "Innovazione e Tecnologia al Servizio del Turismo e della Cultura"
- ✅ Logo oro trasparente in header e footer
- ✅ Gallery Digital Twin (ex Tour Virtuali) - Dinamica da CMS
- ✅ Popup viewer per tour Matterport/MPSkin a schermo intero
- ✅ Pulsanti Admin + Trivor Suite sia in header che footer
- ✅ Hero images più visibili (ridotta opacità overlay)

### Admin CMS (`/#/admin`)
- ✅ Credenziali: `Trivor` / `Trivor2024$`
- ✅ Gestione Progetti portfolio
- ✅ **Gestione Digital Twin** (NUOVO):
  - Immagine copertina (upload o URL)
  - Nome multilingua (IT/EN)
  - Descrizione multilingua
  - Model ID Matterport
  - URL MPSkin alternativo
  - Ordine visualizzazione
  - Toggle visibilità
- ✅ Gestione Immagini Hero
- ✅ Visualizzazione messaggi

### TrivorSuite (`/#/suite`)
- ✅ Credenziali: `Trivor` / `Trivorsuite26$`
- ✅ Dashboard con 5 applicazioni:
  - TRIVORDOC (blu)
  - TrivorWEB (viola)
  - CheckDB (verde)
  - Archivio Contatti (cyan)
  - TrivorMEET (rosa)

### TRIVORDOC
- ✅ Dashboard statistiche documenti
- ✅ Griglia documenti con multi-selezione
- ✅ Upload multiplo allegati (max 20)
- ✅ Condivisione via Email/WhatsApp
- ✅ Selettore contatti integrato nel modal condivisione
- ✅ Preview allegati
- ✅ **Ricerca estesa ai nomi file allegati** (NUOVO)

### TrivorWEB
- ✅ CRUD siti web clienti
- ✅ Fix lampeggio pagina (useCallback)
- ✅ Campi URL accettano formati flessibili (www.sito.it o https://...)
- ✅ Tab Cliente: Azienda a sx, Referente a dx
- ✅ **Tab Account** (NUOVO):
  - Lista credenziali servizi (Servizio, Username, Password)
  - Copia negli appunti
  - Mostra/nascondi password

### Archivio Contatti
- ✅ CRUD completo contatti con gruppi
- ✅ Fix lampeggio pagina (useCallback)
- ✅ Integrato in TRIVORDOC e TrivorMEET

### TrivorMEET
- ✅ Videoconferenze con Jitsi Meet
- ✅ **Link diretto** (nessun limite di tempo)
- ✅ Creazione riunioni con selezione partecipanti
- ✅ Chiamata rapida da contatti
- ✅ Condivisione link via WhatsApp/Email
- ✅ Storico riunioni

---

## Credentials

| Applicazione | Username | Password |
|-------------|----------|----------|
| Admin CMS | Trivor | Trivor2024$ |
| TrivorSuite | Trivor | Trivorsuite26$ |
| TRIVORDOC | Trivor | Trivorsuite26$ |

---

## API Endpoints Principali

- `/api/digital-twins` - CRUD Gallery Digital Twin
- `/api/contacts` - CRUD Contatti
- `/api/trivordoc/documents` - Documenti (ricerca include allegati)
- `/api/trivorweb/sites` - Siti web (include tab accounts)

---

## Files Reference

### Frontend
- `/app/frontend/src/App.js` - Sito pubblico + Admin CMS
- `/app/frontend/src/TrivorSuite.js` - Dashboard suite
- `/app/frontend/src/TrivorDoc.js` - Gestione documenti
- `/app/frontend/src/TrivorWeb.js` - Gestione siti web
- `/app/frontend/src/TrivorContacts.js` - Archivio contatti
- `/app/frontend/src/TrivorMeet.js` - Videoconferenze

### Backend
- `/app/backend/server.py` - Tutte le API

---

## Backlog (P2-P3)

### Prossimi sviluppi
- Verifica completa pre-deploy
- Test regressione tutte le funzionalità
- Ottimizzazione performance

### Futuri
- TrivorCRM: Gestione clienti
- TrivorTask: Gestione attività
- POI (Points of Interest) per Digital Twin con audioguide
- Import/Export CSV contatti

---

## Logo Assets
- **Logo oro trasparente**: `https://customer-assets.emergentagent.com/job_9ae566ba-cbe1-4f57-8e5e-483d01cf8ff3/artifacts/p9qzdaz3_TRIVOR_Logo_Oro_Trasparente.png`

---

*Ultimo aggiornamento: 31 Dicembre 2025*
