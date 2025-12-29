# Spoke Ghivine API

Backend API per il progetto Spoke Ghivine - Digital Twin Heritage.

## Tecnologie
- FastAPI (Python)
- MongoDB Atlas
- OpenAI TTS per audioguide

## Deploy
Configurato per Railway.app

## Variabili d'ambiente richieste
- `MONGO_URL` - Connection string MongoDB Atlas
- `DB_NAME` - Nome database (spoke_ghivine)
- `EMERGENT_LLM_KEY` - API key per traduzioni e TTS
- `CORS_ORIGINS` - Origini consentite (es. https://trivor.it)
