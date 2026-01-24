# 📖 Manuale SmartDomo: Creare POI e Associare Apparati con Sensori

Questa guida spiega passo-passo come creare un Digital Twin collegando un **Punto di Interesse (POI)** nella vista 3D a un **Apparato** che ha un **Sensore eWeLink** associato.

---

## 📋 Prerequisiti

Prima di iniziare, assicurati di avere:
- ✅ Accesso come **Amministratore** (Admin/SmartMaster2026)
- ✅ Uno **spazio Matterport** configurato
- ✅ Almeno un **dispositivo eWeLink** collegato (sensore temperatura, presa smart, etc.)

---

## 🔄 Sequenza Completa

### FASE 1: Verificare i Sensori eWeLink Disponibili

1. **Vai alla tab "SmartDomo"** (Dashboard principale)
2. Scorri fino alla sezione **"Domotica"** o **"Clima"**
3. Verifica che i tuoi dispositivi eWeLink siano visibili e **Online**
4. **Prendi nota dell'ID** del sensore che vuoi associare (es. `a48011986e`)

> 💡 I sensori eWeLink sono identificati dal loro ID univoco. Lo troverai nei dettagli del dispositivo.

---

### FASE 2: Creare un POI nella Vista 3D

1. **Vai alla tab "Vista 3D"**
2. Nella sidebar destra, clicca su **"+ Spazio"** se non hai ancora uno spazio, oppure seleziona lo spazio esistente
3. Clicca sulla tab **"POI (n)"** per vedere i punti di interesse
4. Clicca il pulsante **"+ Nuovo POI"** (o "Aggiungi POI")
5. Compila il form:
   - **Titolo**: Nome descrittivo (es. "Termostato Soggiorno")
   - **Descrizione**: Descrizione opzionale
   - **Categoria**: Seleziona la categoria appropriata
   - **Posizione**: Clicca nel viewer 3D per posizionare il POI
6. Clicca **"Salva"**

> 📍 Il POI apparirà ora nella lista e come tag nel modello 3D.

---

### FASE 3: Creare un Apparato e Collegarlo al Sensore

1. **Vai alla tab "Apparati"**
2. Clicca **"Nuovo Elettrodomestico"**
3. **Tab "Info"**: Compila i dati base
   - Nome: (es. "Termostato Samsung")
   - Categoria: Seleziona la categoria
   - Marca, Modello, Numero Serie
   - Posizione: (es. "Soggiorno")

4. **Tab "Smart"** ⚡ (IMPORTANTE):
   - **Provider Smart Plug**: Seleziona **"eWeLink"**
   - **Dispositivo eWeLink**: Dal dropdown, seleziona il sensore che vuoi collegare
   - **Posizione 3D (Tag Matterport)**: Dal dropdown, seleziona il POI creato nella Fase 2

5. **Tab "Consumi"** (opzionale):
   - Consumo orario stimato (kW)
   - Ore di utilizzo giornaliero

6. Clicca **"Salva"**

---

### FASE 4: Verificare il Collegamento nella Vista 3D

1. **Torna alla tab "Vista 3D"**
2. Clicca sulla tab **"POI"** nella sidebar
3. **Clicca sul POI** che hai collegato all'apparato
4. Nel pannello inferiore vedrai:
   - 🏷️ Badge **"Apparato Collegato"** (arancione)
   - 📡 Sezione **"Dati Live Sensore"** con:
     - 🌡️ **Temperatura** in tempo reale
     - 💧 **Umidità** (se disponibile)
     - ⚡ **Potenza** (se è una presa smart)
     - 🔌 **Stato** ON/OFF (se controllabile)
   - 🟢/🔴 Badge **Online/Offline**

> 🔄 I dati si aggiornano automaticamente ogni 15 secondi quando il POI è selezionato.

---

## 📊 Schema Riassuntivo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SENSORE       │     │   APPARATO      │     │      POI        │
│   eWeLink       │────▶│ (Elettrodom.)   │────▶│  Matterport     │
│                 │     │                 │     │                 │
│ - ID dispositivo│     │ - smart_plug_id │     │ - matterport_   │
│ - Temperatura   │     │ - Provider:     │     │   tag_id        │
│ - Umidità       │     │   eWeLink       │     │ - Posizione 3D  │
│ - Potenza       │     │ - matterport_   │     │                 │
│ - Stato ON/OFF  │     │   tag_id        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🔧 Troubleshooting

### Il sensore non appare nel dropdown
- Verifica che il dispositivo eWeLink sia **online** nella dashboard
- Controlla che le credenziali eWeLink siano configurate in **Setup > Configurazione**

### I dati live non si aggiornano
- Il sistema raccoglie dati ogni **5 minuti** automaticamente
- Puoi forzare una raccolta manuale da **Report Sensori > "Raccogli Ora"**

### Il POI non mostra i dati dell'apparato
- Verifica che l'apparato abbia il campo **"Posizione 3D"** compilato nella tab Smart
- Verifica che il **Provider** sia impostato su "eWeLink" (non "Nessuno")

### Badge "Offline" sul sensore
- Il dispositivo eWeLink potrebbe essere spento o disconnesso dalla rete WiFi
- Controlla il dispositivo fisico

---

## 📈 Funzionalità Avanzate

### Raccolta Automatica Dati
Il sistema raccoglie automaticamente i dati dai sensori ogni **5 minuti**. Puoi vedere lo stato in:
- **Report Sensori** → Banner verde in alto
- Mostra: letture ultima ora, letture oggi, ultima lettura

### Grafici Storici
Nella tab **"Report Sensori"**, clicca su un sensore per vedere:
- Grafico temperatura/umidità/potenza nel tempo
- Selezione periodo (24h, 7 giorni, 30 giorni)

### Controllo Dispositivi
Se il sensore è una **presa smart controllabile**, puoi accenderla/spegnerla:
- Dalla dashboard SmartDomo (toggle ON/OFF)
- I dati di consumo vengono registrati automaticamente

---

## 📞 Supporto

Per assistenza:
- Controlla i log del sistema in **Setup > Log**
- Verifica lo stato dei servizi in **Setup > Configurazione**

---

*Documento generato il 24/01/2026 - SmartDomo v1.0*
