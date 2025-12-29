# Spoke Ghivine - PRD

## Problema Originale
Realizzare un sito web per il progetto e.INS Spoke 2 con:
- Vetrina per spazi Matterport 3D (Grotta del Bue Marino, Grotta Ispinigoli, Museo Archeologico)
- CMS per gestire contenuti multilingua (IT, EN, FR, DE)
- Sistema audioguide con TTS e traduzione automatica
- Gestione POI (Points of Interest)

## Architettura
- **Frontend**: React + TailwindCSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrazioni**: OpenAI TTS (emergentintegrations), OpenAI GPT per traduzioni
- **3D Viewer**: Matterport iframe embed

## User Personas
1. **Turisti/Visitatori**: Esplorano tour virtuali 3D in 4 lingue
2. **Amministratori**: Gestiscono contenuti, spazi e audioguide via CMS
3. **Ricercatori**: Accedono a modelli 3D per studi

## Funzionalità Implementate (29/12/2024)
### ✅ Vetrina Pubblica
- Homepage con hero immersivo
- Pagina spazi con card e preview
- Viewer Matterport 3D integrato
- Selezione lingua IT/EN/FR/DE
- Pagina progetto e.INS

### ✅ CMS Admin
- Gestione spazi (CRUD completo)
- Campi multilingua con traduzione automatica
- Upload immagini
- Preview Matterport Model ID

### ✅ Sistema POI & Audioguide
- Creazione POI con ID numerico
- Testi multilingua per ogni POI
- Generazione audio TTS automatica (OpenAI)
- Upload audio manuale
- Player audio integrato nel viewer

## Backlog Prioritizzato
### P0 - Critico
- ✅ MVP Completato

### P1 - Alta Priorità
- [ ] Integrazione Matterport SDK completa (in attesa risposta Matterport)
  - Mattertag.getData()
  - Mattertag.navigateToTag()
  - Camera.moveTo()
  - Tag.add() / editPosition()
- [ ] Collegamento POI ai Mattertag

### P2 - Media Priorità
- [ ] Aggiungere Model ID per Grotta Ispinigoli
- [ ] Aggiungere Model ID per Museo Archeologico
- [ ] Import automatico Mattertag da spazi
- [ ] Pannello statistiche visite

### P3 - Bassa Priorità
- [ ] Autenticazione admin
- [ ] Export/Import dati
- [ ] Progetto Galaveras (clone)
