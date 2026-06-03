# HANDOFF — Modulo Dipendenti (HR) per marina-management

Copia-incolla TUTTO il contenuto sotto nella chat E1 di **marina-management**.
L'agente ricostruirà il modulo identico (già testato 37/37 backend).

═══════════════════════════════════════════════════════════════════
PROMPT DA INCOLLARE NELLA CHAT DI marina-management
═══════════════════════════════════════════════════════════════════

Ciao, devo aggiungere un modulo "Dipendenti" (HR) completo identico a uno che ho già pronto in un'altra app. Te ne do la specifica completa con file pronti da creare. Per favore implementalo TUTTO d'un colpo poi testa.

## 1. DIPENDENZE BACKEND
```bash
pip install resend reportlab
pip freeze | grep -iE "resend|reportlab" >> /app/backend/requirements.txt
```

## 2. ENV VARS — aggiungi a /app/backend/.env
```
RESEND_API_KEY=re_7mzgiUGw_Ez672sutYGdbURa6VbmxFSGA
SENDER_EMAIL=onboarding@resend.dev
```
Nota: con `onboarding@resend.dev` Resend in test mode invia solo a `info@porticciolodibosamarina.com`. Per destinatari liberi va verificato un dominio su Resend.

## 3. STRUTTURA — cosa fare

### Backend
- Crea file **`/app/backend/dipendenti_routes.py`** (router FastAPI standalone) con il contenuto del file `dipendenti_routes.py` che ti incollo qui sotto.
- In `server.py`, dopo la creazione di `api_router` e prima di `app.include_router(api_router)`, aggiungi:
```python
from dipendenti_routes import dipendenti_router, init_dipendenti_router
init_dipendenti_router(db, get_user_from_token, DEFAULT_USER_ID)
api_router.include_router(dipendenti_router)
```
- Se hai un sistema di "moduli toggleable" per utente, aggiungi `"dipendenti"` al set `allowed`.

### Frontend
- Crea file **`/app/frontend/src/Dipendenti.js`** con il contenuto del file `Dipendenti.js` che ti incollo qui sotto.
- In `App.js`:
  1. Importa: `import Dipendenti from "./Dipendenti";`
  2. Aggiungi un tab nella navigazione (colore consigliato: rose/rosso):
  ```jsx
  <button onClick={() => setActiveTab("dipendenti")} data-testid="nav-dipendenti"
    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md ${activeTab==="dipendenti"?"bg-rose-600 text-white":"text-rose-700 hover:bg-rose-100"}`}>
    <Users className="h-4 w-4" /> Dipendenti
  </button>
  ```
  3. Aggiungi il render:
  ```jsx
  {activeTab === "dipendenti" && <Dipendenti authToken={authToken} />}
  ```
  4. Importa `Users` da `lucide-react` se non già presente.

## 4. CONTENUTO FILE — `dipendenti_routes.py` (696 righe)

Copia ESATTAMENTE il contenuto che trovi nell'altra app al path `/app/backend/dipendenti_routes.py` (te lo allego in chat separata).

## 5. CONTENUTO FILE — `Dipendenti.js` (1165 righe)

Copia ESATTAMENTE il contenuto che trovi nell'altra app al path `/app/frontend/src/Dipendenti.js` (te lo allego in chat separata).

## 6. FUNZIONALITÀ ATTESE

Il modulo ha 3 sub-tab interni:

### Archivio (anagrafica dipendenti)
- Scheda dipendente completa: anagrafica (nome, cognome, CF, data/luogo nascita, indirizzo, città, CAP), contatti (email, telefono), profilo (titolo studio, ruolo, mansione, sede, stato).
- Stati: libero, disoccupato, inoccupato, assunto, altro.
- Documenti allegati: upload file (base64) con descrizione.
- Sedi configurabili: dropdown con "+aggiungi nuova sede".
- Filtri: ricerca testuale, sede, mansione, stato.
- Esportazione PDF lista filtrata + invio email (Resend) con destinatari multipli.
- Esportazione PDF scheda singolo dipendente + email.

### Assunzioni
- Nuova assunzione: scegli dipendente, tipo contratto (con "+aggiungi" inline), data inizio/termine, ore settimanali, tariffa oraria, netto mensile, bonus extra multipli (tipo+importo), allegato contratto, sede lavoro, orario, giorni lavorativi.
- Auto-update: dipendente.stato passa a "assunto" se assunzione è "attivo".

### Stipendi & Pagamenti
- Nuova busta paga: dipendente, anno, mese, data emissione, importo netto, allegato PDF.
- Pagamenti/acconti: data, importo, note → calcolo Dovuto/Pagato/Residuo.
- Esportazione PDF busta + invio email.

## 7. TEST (richiesto)
- Verifica login Admin
- Click nav Dipendenti → 3 subtab visibili
- Crea sede, crea dipendente, modifica, upload documento
- Crea assunzione con bonus
- Crea busta paga, aggiungi pagamento, verifica calcolo residuo
- Esporta PDF lista e PDF scheda
- (Opzionale) Invio email a info@porticciolodibosamarina.com

═══════════════════════════════════════════════════════════════════
FINE PROMPT
═══════════════════════════════════════════════════════════════════
