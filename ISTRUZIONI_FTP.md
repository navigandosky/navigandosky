# Istruzioni Upload FTP - VisitTadasuni

## File da Caricare
- **visittadasuni-website.zip** (1.8 MB)

## Procedura Upload

### 1. Scarica il file ZIP
Scarica il file `visittadasuni-website.zip` da questa piattaforma.

### 2. Estrai il contenuto
Estrai tutti i file dalla cartella ZIP nel tuo computer.

### 3. Carica via FTP
Usando un client FTP (FileZilla, Cyberduck, etc.):
1. Connettiti al tuo spazio web
2. Naviga nella cartella `public_html` o `www` o `htdocs`
3. Carica TUTTI i file estratti (index.html, static/, asset-manifest.json, logo-tadasuni.jpg)

### 4. Struttura dei File
```
/public_html/
├── index.html           (pagina principale)
├── logo-tadasuni.jpg    (logo)
├── asset-manifest.json  (manifest)
└── static/
    ├── js/              (JavaScript)
    └── css/             (Stili)
```

## Configurazione Backend

Il frontend è configurato per comunicare con il backend su:
**https://property-cms-dev.preview.emergentagent.com/api**

### Wake-Up Automatico
All'avvio del sito, viene eseguita automaticamente una chiamata al backend per "svegliarlo" in caso sia in sleep mode. Questo garantisce che le API siano pronte quando l'utente inizia a navigare.

## Note Importanti

1. **Non modificare** i file nella cartella `static/`
2. Il sito usa **HashRouter** (URL con #) per compatibilità hosting statico
3. Le immagini degli immobili sono servite dal backend, non dal frontend

## URL del Sito
Dopo l'upload, il sito sarà accessibile su:
- Homepage: `https://tuodominio.it/`
- Immobili: `https://tuodominio.it/#/immobili`
- Admin Eventi: `https://tuodominio.it/#/admin`
- Admin Immobili: `https://tuodominio.it/#/immobili-admin`

## Credenziali Admin
- **Eventi/Attrazioni**: visittadasuni / Tadasuni2025$
- **Immobili CMS**: visittadasuni / Tadasuni2025$
- **Chatbot Admin**: chatbotadmin / ChatBot2025$

## Supporto
Per problemi tecnici, contatta il supporto Emergent.
