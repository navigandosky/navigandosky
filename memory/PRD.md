# Spoke Galaveras - PRD

## Original Problem Statement
Sito Spoke Galaveras per showcase di tour virtuali Matterport, simile a Spoke Ghivine.
- CMS per gestire spazi Matterport (model ID, foto, descrizioni in 4 lingue: IT, EN, FR, DE)
- Sistema POI (Punti di Interesse) con audioguide generate automaticamente via TTS
- Traduzione automatica delle descrizioni
- Sezione Archivio Costumi per catalogazione di costumi e elementi
- Pannello admin protetto da password (user: Galaveras2025, password: Gala2025$)
- Database MongoDB Atlas (cluster Trivor, database: spoke_galaveras)

## User Personas
1. **Visitatore/Turista**: Esplora tour virtuali e archivio costumi in lingua preferita
2. **Ricercatore/Storico**: Cerca informazioni dettagliate sui costumi tradizionali
3. **Admin/Curatore**: Gestisce contenuti, spazi Matterport, POI e costumi

## Core Requirements (Static)
- Supporto multilingua (IT, EN, FR, DE)
- Integrazione Matterport SDK for Embeds
- TTS automatico per audioguide (OpenAI TTS)
- Traduzione automatica (OpenAI GPT)
- Archivio Costumi con campi: ID_risorsa, Descrizione, Ricamatrice, Proprietà, Valore, Data realizzazione, archivio fotografico, ID Tag Matterport, ID spazio, file audio descrittivo
- Admin panel con autenticazione

## What's Been Implemented (December 2025)
### Backend
- [x] FastAPI server with MongoDB Atlas connection
- [x] CRUD endpoints for Spaces, POIs, Costumes
- [x] Admin authentication (fixed credentials)
- [x] Translation service (OpenAI GPT via Emergent)
- [x] TTS service (OpenAI TTS via Emergent)
- [x] File upload for images and audio

### Frontend
- [x] Homepage with hero section "Manus de Oro"
- [x] Language selector (IT/EN/FR/DE)
- [x] Exhibitions page (Le Mostre Digital Twin)
- [x] Exhibition detail with Matterport viewer and POI sidebar
- [x] Costumes Archive with search
- [x] Costume detail page
- [x] Project page (Il Progetto Spoke)
- [x] Admin login
- [x] Admin dashboard
- [x] Admin Spaces management (CRUD + auto-translate)
- [x] Admin POIs management (CRUD + auto-translate + TTS generation)
- [x] Admin Costumes management (CRUD + photo upload + TTS)
- [x] Admin Project content editor
- [x] Spoke logo fixed bottom-left

### Design
- [x] Cormorant Garamond + Manrope fonts
- [x] Gold (#C5A059) accent color
- [x] Paper texture background
- [x] Elegant admin panel

## Prioritized Backlog
### P0 (Critical) - Done
- All core features implemented

### P1 (High Priority) - Pending
- Add actual Matterport Model IDs from user
- Add content for "Il Progetto Spoke" page
- Seed initial costumes data

### P2 (Medium Priority) - Future
- Matterport SDK deep integration (tag click events)
- Session persistence for admin
- Image gallery lightbox
- Audio player improvements

## Next Tasks
1. User to provide Matterport Model IDs for the 2 initial spaces
2. User to provide text content for "Il Progetto Spoke"
3. User to start adding costumes via admin panel
4. Consider implementing proper session management for admin

## Tech Stack
- Backend: FastAPI + Python
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB Atlas (cluster Trivor, db: spoke_galaveras)
- AI: OpenAI TTS + GPT via Emergent LLM Key
- Virtual Tours: Matterport SDK for Embeds
