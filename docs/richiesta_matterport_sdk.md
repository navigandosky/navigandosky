# Richiesta Matterport SDK - SmartBuilding

## Informazioni Invio

- **Destinatario:** Matterport Support (support@matterport.com)
- **Oggetto:** Richiesta SDK Bundle API Access per Integrazione Applicazione Gestione Immobili

---

## Testo della Richiesta

Gentile Team Matterport,

Stiamo sviluppando un'applicazione di gestione immobili (SmartBuilding) che integra i vostri spazi 3D con un sistema di gestione elettrodomestici e manutenzioni.

Per completare l'integrazione abbiamo bisogno di accesso alle seguenti funzionalità SDK:

---

### 1. Credenziali Richieste

| Credenziale | Scopo |
|-------------|-------|
| **SDK Key** | Per inizializzare l'SDK Matterport nel nostro viewer embedded |
| **SDK Secret / Token** | Per autenticazione API lato server |
| **Client ID & Client Secret** | Per OAuth2 se necessario per le API REST |

---

### 2. Funzionalità SDK Necessarie

Abbiamo bisogno di accesso programmatico per le seguenti funzionalità:

- **`Mattertag.getData()`** - Leggere la lista dei tag esistenti nello spazio
- **`Mattertag.navigateToTag(tagId)`** - Navigare programmaticamente a un tag specifico
- **`Camera.moveTo()`** - Controllo della camera per posizionamento
- **`Model.getData()`** - Ottenere metadati dello spazio
- **`Tag.add()` / `Tag.editPosition()`** - Creare e modificare tag (se disponibile)

---

### 3. API REST Necessarie (se disponibili)

- Endpoint per ottenere lista tag di uno spazio via API
- Endpoint per ottenere dettagli spazio (floor plans, rooms, sweeps, etc.)
- Endpoint per gestione tag via backend

---

### 4. Dettagli Tecnici del Nostro Progetto

| Aspetto | Dettaglio |
|---------|-----------|
| **Nome Progetto** | SmartBuilding - Gestione Immobili Intelligente |
| **Piattaforma** | Applicazione Web |
| **Frontend** | React.js |
| **Backend** | Python (FastAPI) |
| **Database** | MongoDB |
| **Hosting** | Cloud |

**Caso d'uso principale:**
Gestione multi-proprietà immobiliare con navigazione bidirezionale tra archivio elettrodomestici/dispositivi e la loro posizione esatta nello spazio 3D Matterport.

**Funzionalità desiderata:**
1. L'utente seleziona un elettrodomestico dall'archivio
2. Clicca "Vai nello spazio"
3. Il viewer Matterport naviga automaticamente al tag associato a quell'elettrodomestico
4. Viceversa: cliccando un tag nel viewer, si visualizzano le info dell'elettrodomestico

**Account Matterport:** [INSERIRE EMAIL ACCOUNT]

**Space ID di test:** SxQL3iGyoDo (o inserire i vostri spazi)

---

### 5. Domande Specifiche

1. **Piano di abbonamento:** Quale piano include l'accesso SDK completo con le funzionalità sopra elencate (Mattertag navigation, Camera control)?

2. **Multi-spazio:** È possibile usare un singolo SDK Key per più spazi sotto lo stesso account?

3. **Limiti:** Ci sono limiti di chiamate API o sessioni SDK simultanee? Se sì, quali?

4. **Multi-tenant:** L'SDK Bundle supporta l'uso in applicazioni multi-tenant? (più utenti finali che accedono all'applicazione, stesso account Matterport come backend)

5. **Pricing:** Qual è il costo del piano SDK Bundle? Esistono piani annuali o enterprise?

6. **Trial:** È disponibile un periodo di prova per testare l'SDK prima dell'acquisto?

---

### 6. Documentazione Richiesta

Chiediamo cortesemente di ricevere o avere accesso a:

- [ ] Guida all'integrazione SDK per React/JavaScript
- [ ] Riferimento API completo per Mattertag e Camera controls
- [ ] Esempi di codice per navigazione programmatica a tag
- [ ] Best practices per applicazioni multi-tenant
- [ ] Changelog delle versioni SDK

---

### 7. Contatti

**Nome:** [INSERIRE NOME]

**Azienda:** [INSERIRE AZIENDA]

**Email:** [INSERIRE EMAIL]

**Telefono:** [INSERIRE TELEFONO]

**Paese:** Italia

---

Grazie per il supporto. Restiamo in attesa di ricevere le credenziali e le informazioni sul piano più adatto alle nostre esigenze.

Cordiali saluti,

[FIRMA]

---

---

## Checklist - Cosa Ricevere da Matterport

Quando ricevi la risposta, verifica di avere:

### Credenziali
- [ ] **SDK Key** (stringa alfanumerica)
- [ ] **SDK Secret/Token** (per autenticazione)
- [ ] **Client ID** (se OAuth2)
- [ ] **Client Secret** (se OAuth2)

### Conferme
- [ ] Conferma piano con accesso SDK Bundle
- [ ] Conferma supporto multi-tenant
- [ ] Limiti di utilizzo (chiamate API, sessioni, spazi)
- [ ] Costi e fatturazione

### Documentazione
- [ ] Link documentazione SDK
- [ ] Esempi di codice
- [ ] API Reference

---

## Note per l'Implementazione

Una volta ricevute le credenziali, comunicale per procedere con:

1. **Integrazione SDK** nel viewer esistente
2. **Lettura tag** automatica dallo spazio
3. **Selector tag** nel form elettrodomestico
4. **Pulsante "Vai nello spazio"** per navigazione
5. **Pannello info** quando si clicca un tag nel viewer

### Variabili da aggiungere al file .env del backend:

```
MATTERPORT_SDK_KEY=xxxxxxxxxxxxxx
MATTERPORT_SDK_SECRET=xxxxxxxxxxxxxx
MATTERPORT_CLIENT_ID=xxxxxxxxxxxxxx
MATTERPORT_CLIENT_SECRET=xxxxxxxxxxxxxx
```

---

*Documento generato per il progetto SmartBuilding*
