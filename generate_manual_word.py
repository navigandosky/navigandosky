#!/usr/bin/env python3
"""
Generatore Manuale Tecnico Spoke Ghivine - Formato Word
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from datetime import datetime

def create_manual():
    doc = Document()
    
    # Impostazioni pagina
    sections = doc.sections
    for section in sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)
    
    # ===================
    # COPERTINA
    # ===================
    # Titolo principale
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.add_run("\n\n\n\nSPOKE GHIVINE")
    title_run.bold = True
    title_run.font.size = Pt(36)
    title_run.font.color.rgb = RGBColor(8, 145, 178)
    
    # Sottotitolo
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = subtitle.add_run("Piattaforma Web per Tour Virtuali Matterport")
    sub_run.font.size = Pt(16)
    sub_run.font.color.rgb = RGBColor(107, 114, 128)
    
    # Titolo manuale
    manual_title = doc.add_paragraph()
    manual_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    mt_run = manual_title.add_run("\n\nMANUALE TECNICO E DOCUMENTAZIONE")
    mt_run.font.size = Pt(18)
    mt_run.font.color.rgb = RGBColor(55, 65, 81)
    
    doc.add_paragraph("\n\n")
    
    # Tabella info documento
    info_table = doc.add_table(rows=4, cols=2)
    info_table.style = 'Table Grid'
    info_data = [
        ('Versione', '1.0'),
        ('Data', datetime.now().strftime('%d/%m/%Y')),
        ('Ambiente', 'Produzione'),
        ('URL', 'trivor.it/spokeghivine'),
    ]
    for i, (key, val) in enumerate(info_data):
        info_table.rows[i].cells[0].text = key
        info_table.rows[i].cells[1].text = val
    
    doc.add_page_break()
    
    # ===================
    # INDICE
    # ===================
    doc.add_heading('INDICE', level=1)
    
    indice_items = [
        "1. Panoramica del Sistema",
        "2. Architettura Tecnica",
        "3. Funzionalità Principali",
        "4. Database e Modelli Dati",
        "5. API Endpoints",
        "6. Integrazioni Esterne",
        "7. Pannello di Amministrazione",
        "8. Supporto Multilingua",
        "9. Deployment e Infrastruttura",
        "10. Credenziali e Accessi",
        "11. Manutenzione e Supporto"
    ]
    
    for item in indice_items:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_after = Pt(6)
    
    doc.add_page_break()
    
    # ===================
    # 1. PANORAMICA
    # ===================
    doc.add_heading('1. PANORAMICA DEL SISTEMA', level=1)
    
    doc.add_paragraph(
        "Spoke Ghivine è una piattaforma web progettata per la presentazione e gestione di tour virtuali "
        "3D realizzati con tecnologia Matterport. Il sistema consente la visualizzazione immersiva di "
        "spazi tridimensionali arricchiti da Punti di Interesse (POI) con audioguide multilingua "
        "generate automaticamente tramite intelligenza artificiale."
    )
    
    doc.add_heading('1.1 Obiettivi del Sistema', level=2)
    objectives = [
        "Showcase professionale di tour virtuali Matterport",
        "Gestione centralizzata di spazi 3D e contenuti multimediali",
        "Audioguide automatiche in 4 lingue (Italiano, Inglese, Francese, Tedesco)",
        "Interfaccia amministrativa per la gestione dei contenuti",
        "Esperienza utente moderna e responsive"
    ]
    for obj in objectives:
        doc.add_paragraph(obj, style='List Bullet')
    
    doc.add_heading('1.2 Target Utenti', level=2)
    doc.add_paragraph("Utenti Finali: Visitatori del sito che esplorano i tour virtuali")
    doc.add_paragraph("Amministratori: Gestori dei contenuti tramite pannello admin protetto")
    
    doc.add_page_break()
    
    # ===================
    # 2. ARCHITETTURA
    # ===================
    doc.add_heading('2. ARCHITETTURA TECNICA', level=1)
    
    doc.add_heading('2.1 Stack Tecnologico', level=2)
    
    tech_table = doc.add_table(rows=9, cols=3)
    tech_table.style = 'Table Grid'
    tech_data = [
        ('Componente', 'Tecnologia', 'Versione'),
        ('Frontend', 'React.js', '19.0.0'),
        ('Backend', 'FastAPI (Python)', '0.110.1'),
        ('Database', 'MongoDB Atlas', '6.0+'),
        ('Styling', 'Tailwind CSS', '3.x'),
        ('UI Components', 'Radix UI + Shadcn', 'Latest'),
        ('Animazioni', 'Framer Motion', '12.x'),
        ('HTTP Client', 'Axios', '1.8.4'),
        ('Routing', 'React Router', '7.5.1'),
    ]
    for i, row_data in enumerate(tech_data):
        for j, cell_data in enumerate(row_data):
            tech_table.rows[i].cells[j].text = cell_data
            if i == 0:
                tech_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('2.2 Architettura a Tre Livelli', level=2)
    
    arch_table = doc.add_table(rows=4, cols=3)
    arch_table.style = 'Table Grid'
    arch_data = [
        ('Livello', 'Descrizione', 'Hosting'),
        ('Presentation', 'React SPA con Tailwind CSS', 'Emergent Platform'),
        ('Application', 'FastAPI REST API', 'Railway'),
        ('Data', 'MongoDB Database', 'MongoDB Atlas (Cluster Trivor)'),
    ]
    for i, row_data in enumerate(arch_data):
        for j, cell_data in enumerate(row_data):
            arch_table.rows[i].cells[j].text = cell_data
            if i == 0:
                arch_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 3. FUNZIONALITÀ
    # ===================
    doc.add_heading('3. FUNZIONALITÀ PRINCIPALI', level=1)
    
    doc.add_heading('3.1 Gestione Spazi Matterport', level=2)
    doc.add_paragraph("Il sistema permette la gestione completa di spazi virtuali 3D:")
    space_features = [
        "Integrazione Matterport SDK: Embedding nativo dei tour 3D",
        "Link Esterni: Supporto per tour hosted su piattaforme esterne (es. mpskin)",
        "Galleria Immagini: Fino a 5 immagini per ogni spazio",
        "Descrizioni Multilingua: Testi in IT, EN, FR, DE",
        "Stato Attivo/Inattivo: Controllo visibilità pubblica"
    ]
    for feat in space_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_heading('3.2 Sistema POI (Punti di Interesse)', level=2)
    doc.add_paragraph("Ogni spazio può contenere molteplici Punti di Interesse:")
    poi_features = [
        "Numerazione: Identificativo numerico per ogni POI",
        "Descrizioni: Testi descrittivi in 4 lingue",
        "Audioguide: File audio generati automaticamente via TTS",
        "Upload Manuale: Possibilità di caricare audio pre-registrati",
        "Player Integrato: Riproduzione audio nel viewer 3D"
    ]
    for feat in poi_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_heading('3.3 Traduzione Automatica', level=2)
    doc.add_paragraph("Sistema di traduzione AI-powered:")
    trans_features = [
        "Motore: OpenAI GPT-4o-mini",
        "Lingue: Italiano → Inglese, Francese, Tedesco",
        "Processo: Traduzione one-click dall'interfaccia admin",
        "Qualità: Traduzioni professionali contestualizzate"
    ]
    for feat in trans_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_heading('3.4 Text-to-Speech (TTS)', level=2)
    doc.add_paragraph("Generazione automatica di audioguide:")
    tts_features = [
        "Motore: OpenAI TTS-1",
        "Voci: Italiano (nova), Inglese (alloy), Francese (shimmer), Tedesco (echo)",
        "Formato Output: MP3",
        "Storage: URL permanenti Emergent Platform"
    ]
    for feat in tts_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_page_break()
    
    # ===================
    # 4. DATABASE
    # ===================
    doc.add_heading('4. DATABASE E MODELLI DATI', level=1)
    
    doc.add_heading('4.1 Configurazione Database', level=2)
    
    db_table = doc.add_table(rows=6, cols=2)
    db_table.style = 'Table Grid'
    db_data = [
        ('Parametro', 'Valore'),
        ('Provider', 'MongoDB Atlas'),
        ('Cluster', 'Trivor'),
        ('Database', 'spoke_ghivine'),
        ('Autenticazione', 'Username/Password'),
        ('Connessione', 'mongodb+srv://'),
    ]
    for i, row_data in enumerate(db_data):
        for j, cell_data in enumerate(row_data):
            db_table.rows[i].cells[j].text = cell_data
            if i == 0:
                db_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('4.2 Collezione: spaces', level=2)
    
    spaces_table = doc.add_table(rows=11, cols=3)
    spaces_table.style = 'Table Grid'
    spaces_data = [
        ('Campo', 'Tipo', 'Descrizione'),
        ('id', 'String (UUID)', 'Identificativo univoco'),
        ('name', 'TranslatedText', 'Nome in 4 lingue'),
        ('description', 'TranslatedText', 'Descrizione in 4 lingue'),
        ('matterport_model_id', 'String', 'ID modello Matterport'),
        ('external_tour_url', 'String (Optional)', 'URL tour esterno'),
        ('images', 'Array[String]', 'URL immagini galleria'),
        ('is_active', 'Boolean', 'Stato pubblicazione'),
        ('order', 'Integer', 'Ordine visualizzazione'),
        ('created_at', 'DateTime', 'Data creazione'),
        ('updated_at', 'DateTime', 'Data modifica'),
    ]
    for i, row_data in enumerate(spaces_data):
        for j, cell_data in enumerate(row_data):
            spaces_table.rows[i].cells[j].text = cell_data
            if i == 0:
                spaces_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('4.3 Collezione: pois', level=2)
    
    pois_table = doc.add_table(rows=10, cols=3)
    pois_table.style = 'Table Grid'
    pois_data = [
        ('Campo', 'Tipo', 'Descrizione'),
        ('id', 'String (UUID)', 'Identificativo univoco'),
        ('space_id', 'String', 'Riferimento allo spazio'),
        ('poi_number', 'Integer', 'Numero identificativo POI'),
        ('name', 'TranslatedText', 'Nome in 4 lingue'),
        ('description', 'TranslatedText', 'Descrizione in 4 lingue'),
        ('audio_files', 'Object', 'URL audio per lingua (it, en, fr, de)'),
        ('is_active', 'Boolean', 'Stato pubblicazione'),
        ('created_at', 'DateTime', 'Data creazione'),
        ('updated_at', 'DateTime', 'Data modifica'),
    ]
    for i, row_data in enumerate(pois_data):
        for j, cell_data in enumerate(row_data):
            pois_table.rows[i].cells[j].text = cell_data
            if i == 0:
                pois_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('4.4 Struttura TranslatedText', level=2)
    doc.add_paragraph("Oggetto per contenuti multilingua:")
    doc.add_paragraph("""
{
    "it": "Testo in italiano",
    "en": "Text in English",
    "fr": "Texte en français",
    "de": "Text auf Deutsch"
}
""")
    
    doc.add_page_break()
    
    # ===================
    # 5. API ENDPOINTS
    # ===================
    doc.add_heading('5. API ENDPOINTS', level=1)
    
    doc.add_heading('5.1 Endpoints Spazi', level=2)
    
    api_spaces_table = doc.add_table(rows=6, cols=3)
    api_spaces_table.style = 'Table Grid'
    api_spaces_data = [
        ('Metodo', 'Endpoint', 'Descrizione'),
        ('GET', '/api/spaces', 'Lista tutti gli spazi'),
        ('GET', '/api/spaces/{id}', 'Dettaglio singolo spazio'),
        ('POST', '/api/spaces', 'Crea nuovo spazio'),
        ('PUT', '/api/spaces/{id}', 'Modifica spazio esistente'),
        ('DELETE', '/api/spaces/{id}', 'Elimina spazio'),
    ]
    for i, row_data in enumerate(api_spaces_data):
        for j, cell_data in enumerate(row_data):
            api_spaces_table.rows[i].cells[j].text = cell_data
            if i == 0:
                api_spaces_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('5.2 Endpoints POI', level=2)
    
    api_pois_table = doc.add_table(rows=6, cols=3)
    api_pois_table.style = 'Table Grid'
    api_pois_data = [
        ('Metodo', 'Endpoint', 'Descrizione'),
        ('GET', '/api/pois', 'Lista tutti i POI'),
        ('GET', '/api/pois/{id}', 'Dettaglio singolo POI'),
        ('POST', '/api/pois', 'Crea nuovo POI'),
        ('PUT', '/api/pois/{id}', 'Modifica POI esistente'),
        ('DELETE', '/api/pois/{id}', 'Elimina POI'),
    ]
    for i, row_data in enumerate(api_pois_data):
        for j, cell_data in enumerate(row_data):
            api_pois_table.rows[i].cells[j].text = cell_data
            if i == 0:
                api_pois_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('5.3 Endpoints Servizi AI', level=2)
    
    api_ai_table = doc.add_table(rows=6, cols=3)
    api_ai_table.style = 'Table Grid'
    api_ai_data = [
        ('Metodo', 'Endpoint', 'Descrizione'),
        ('POST', '/api/translate', 'Traduzione automatica testo'),
        ('POST', '/api/tts', 'Generazione audio TTS'),
        ('POST', '/api/upload/image', 'Upload immagine'),
        ('POST', '/api/upload/audio', 'Upload file audio'),
        ('GET', '/api/config', 'Configurazione client (SDK keys)'),
    ]
    for i, row_data in enumerate(api_ai_data):
        for j, cell_data in enumerate(row_data):
            api_ai_table.rows[i].cells[j].text = cell_data
            if i == 0:
                api_ai_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 6. INTEGRAZIONI
    # ===================
    doc.add_heading('6. INTEGRAZIONI ESTERNE', level=1)
    
    doc.add_heading('6.1 Matterport', level=2)
    
    matterport_table = doc.add_table(rows=6, cols=2)
    matterport_table.style = 'Table Grid'
    matterport_data = [
        ('Parametro', 'Dettaglio'),
        ('Servizio', 'Matterport Showcase SDK'),
        ('Versione SDK', '3.x (Bundle JS)'),
        ('Autenticazione', 'SDK Key'),
        ('Funzionalità', 'Embedding tour 3D, navigazione, fullscreen'),
        ('Documentazione', 'https://matterport.github.io/showcase-sdk/'),
    ]
    for i, row_data in enumerate(matterport_data):
        for j, cell_data in enumerate(row_data):
            matterport_table.rows[i].cells[j].text = cell_data
            if i == 0:
                matterport_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('6.2 OpenAI', level=2)
    
    openai_table = doc.add_table(rows=6, cols=2)
    openai_table.style = 'Table Grid'
    openai_data = [
        ('Parametro', 'Dettaglio'),
        ('Provider', 'OpenAI via Emergent Integrations'),
        ('Modello Traduzione', 'GPT-4o-mini'),
        ('Modello TTS', 'TTS-1'),
        ('Autenticazione', 'Emergent LLM Key'),
        ('Rate Limits', 'Gestiti da Emergent Platform'),
    ]
    for i, row_data in enumerate(openai_data):
        for j, cell_data in enumerate(row_data):
            openai_table.rows[i].cells[j].text = cell_data
            if i == 0:
                openai_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('6.3 MongoDB Atlas', level=2)
    
    mongo_table = doc.add_table(rows=7, cols=2)
    mongo_table.style = 'Table Grid'
    mongo_data = [
        ('Parametro', 'Dettaglio'),
        ('Provider', 'MongoDB Atlas'),
        ('Cluster Name', 'Trivor'),
        ('Region', 'AWS'),
        ('Tier', 'Shared Cluster'),
        ('Backup', 'Automatico giornaliero'),
        ('Connessione', 'TLS/SSL encrypted'),
    ]
    for i, row_data in enumerate(mongo_data):
        for j, cell_data in enumerate(row_data):
            mongo_table.rows[i].cells[j].text = cell_data
            if i == 0:
                mongo_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 7. PANNELLO ADMIN
    # ===================
    doc.add_heading('7. PANNELLO DI AMMINISTRAZIONE', level=1)
    
    doc.add_heading('7.1 Accesso', level=2)
    doc.add_paragraph("Il pannello di amministrazione è accessibile all'indirizzo:")
    doc.add_paragraph("URL: trivor.it/spokeghivine/admin")
    doc.add_paragraph("L'accesso è protetto da autenticazione username/password.")
    
    doc.add_heading('7.2 Funzionalità Admin', level=2)
    
    admin_table = doc.add_table(rows=6, cols=2)
    admin_table.style = 'Table Grid'
    admin_data = [
        ('Sezione', 'Funzionalità'),
        ('Spazi', 'CRUD completo, gestione immagini, ordinamento'),
        ('POI', 'CRUD completo, assegnazione a spazi, generazione audio'),
        ('Traduzioni', 'Traduzione automatica one-click per tutti i campi testo'),
        ('Audio', 'Generazione TTS automatica, upload manuale, anteprima'),
        ('Immagini', 'Upload multiplo, riordinamento, eliminazione'),
    ]
    for i, row_data in enumerate(admin_data):
        for j, cell_data in enumerate(row_data):
            admin_table.rows[i].cells[j].text = cell_data
            if i == 0:
                admin_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 8. MULTILINGUA
    # ===================
    doc.add_heading('8. SUPPORTO MULTILINGUA', level=1)
    
    doc.add_heading('8.1 Lingue Supportate', level=2)
    
    lang_table = doc.add_table(rows=5, cols=3)
    lang_table.style = 'Table Grid'
    lang_data = [
        ('Codice', 'Lingua', 'Voce TTS'),
        ('it', 'Italiano', 'nova'),
        ('en', 'Inglese', 'alloy'),
        ('fr', 'Francese', 'shimmer'),
        ('de', 'Tedesco', 'echo'),
    ]
    for i, row_data in enumerate(lang_data):
        for j, cell_data in enumerate(row_data):
            lang_table.rows[i].cells[j].text = cell_data
            if i == 0:
                lang_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('8.2 Selezione Lingua', level=2)
    lang_features = [
        "Interfaccia: Selettore lingua nella navbar (bandiere/codici)",
        "Persistenza: La selezione viene mantenuta nella sessione",
        "Contenuti: Tutti i testi e audio si adattano alla lingua selezionata",
        "Default: Italiano (it)"
    ]
    for feat in lang_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_page_break()
    
    # ===================
    # 9. DEPLOYMENT
    # ===================
    doc.add_heading('9. DEPLOYMENT E INFRASTRUTTURA', level=1)
    
    doc.add_heading('9.1 Architettura di Deployment', level=2)
    
    deploy_table = doc.add_table(rows=5, cols=3)
    deploy_table.style = 'Table Grid'
    deploy_data = [
        ('Componente', 'Piattaforma', 'URL/Dettagli'),
        ('Frontend', 'Emergent Platform', 'spoke-ghivine-3d.preview.emergentagent.com'),
        ('Backend', 'Railway', 'API REST su container Docker'),
        ('Database', 'MongoDB Atlas', 'Cluster Trivor (shared)'),
        ('Dominio', 'Aruba', 'trivor.it/spokeghivine (redirect)'),
    ]
    for i, row_data in enumerate(deploy_data):
        for j, cell_data in enumerate(row_data):
            deploy_table.rows[i].cells[j].text = cell_data
            if i == 0:
                deploy_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('9.2 Variabili d\'Ambiente', level=2)
    
    env_table = doc.add_table(rows=7, cols=3)
    env_table.style = 'Table Grid'
    env_data = [
        ('Variabile', 'Descrizione', 'Dove'),
        ('MONGO_URL', 'Connection string MongoDB', 'Backend (Railway)'),
        ('DB_NAME', 'Nome database', 'Backend (Railway)'),
        ('EMERGENT_LLM_KEY', 'Chiave API per OpenAI', 'Backend (Railway)'),
        ('MATTERPORT_SDK_KEY', 'Chiave SDK Matterport', 'Backend (Railway)'),
        ('CORS_ORIGINS', 'Origini CORS consentite', 'Backend (Railway)'),
        ('REACT_APP_BACKEND_URL', 'URL API backend', 'Frontend'),
    ]
    for i, row_data in enumerate(env_data):
        for j, cell_data in enumerate(row_data):
            env_table.rows[i].cells[j].text = cell_data
            if i == 0:
                env_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 10. CREDENZIALI
    # ===================
    doc.add_heading('10. CREDENZIALI E ACCESSI', level=1)
    
    warning = doc.add_paragraph()
    warning_run = warning.add_run("⚠️ INFORMAZIONI RISERVATE - GESTIRE CON CURA")
    warning_run.bold = True
    warning_run.font.color.rgb = RGBColor(220, 38, 38)
    
    doc.add_heading('10.1 Pannello Admin', level=2)
    
    admin_creds_table = doc.add_table(rows=4, cols=2)
    admin_creds_table.style = 'Table Grid'
    admin_creds_data = [
        ('Campo', 'Valore'),
        ('URL', 'trivor.it/spokeghivine/admin'),
        ('Username', 'admin'),
        ('Password', 'Ghivine205$'),
    ]
    for i, row_data in enumerate(admin_creds_data):
        for j, cell_data in enumerate(row_data):
            admin_creds_table.rows[i].cells[j].text = cell_data
            if i == 0:
                admin_creds_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_paragraph()
    doc.add_heading('10.2 MongoDB Atlas', level=2)
    
    mongo_creds_table = doc.add_table(rows=5, cols=2)
    mongo_creds_table.style = 'Table Grid'
    mongo_creds_data = [
        ('Campo', 'Valore'),
        ('Cluster', 'trivor.8dw18ki.mongodb.net'),
        ('Database', 'spoke_ghivine'),
        ('Username', 'Trivor_db2025'),
        ('Password', 'N5l9R82kgNFYc7uf'),
    ]
    for i, row_data in enumerate(mongo_creds_data):
        for j, cell_data in enumerate(row_data):
            mongo_creds_table.rows[i].cells[j].text = cell_data
            if i == 0:
                mongo_creds_table.rows[i].cells[j].paragraphs[0].runs[0].bold = True
    
    doc.add_page_break()
    
    # ===================
    # 11. MANUTENZIONE
    # ===================
    doc.add_heading('11. MANUTENZIONE E SUPPORTO', level=1)
    
    doc.add_heading('11.1 Backup Database', level=2)
    doc.add_paragraph(
        "MongoDB Atlas esegue backup automatici giornalieri. È possibile:"
    )
    backup_features = [
        "Accedere alla console Atlas per restore point-in-time",
        "Esportare manualmente i dati via mongodump",
        "Configurare backup aggiuntivi su richiesta"
    ]
    for feat in backup_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_heading('11.2 Monitoraggio', level=2)
    monitoring_features = [
        "Railway: Dashboard con metriche CPU, memoria, logs",
        "MongoDB Atlas: Performance Advisor, Real-time metrics",
        "Emergent: Logs applicazione frontend"
    ]
    for feat in monitoring_features:
        doc.add_paragraph(feat, style='List Bullet')
    
    doc.add_heading('11.3 Aggiornamenti', level=2)
    doc.add_paragraph("Per aggiornare l'applicazione:")
    update_steps = [
        "Frontend: Modifiche su Emergent Platform → deploy automatico",
        "Backend: Push su repository GitHub → Railway auto-deploy",
        "Database: Modifiche schema retrocompatibili"
    ]
    for i, step in enumerate(update_steps, 1):
        doc.add_paragraph(f"{i}. {step}")
    
    doc.add_heading('11.4 Contatti Supporto', level=2)
    doc.add_paragraph("Per assistenza tecnica contattare il team di sviluppo.")
    doc.add_paragraph("Piattaforma di sviluppo: Emergent AI")
    doc.add_paragraph("Supporto Emergent: support@emergent.sh")
    
    # Salva documento
    doc.save('/app/frontend/public/Manuale_Spoke_Ghivine.docx')
    print("✅ Manuale Word generato: /app/frontend/public/Manuale_Spoke_Ghivine.docx")

if __name__ == "__main__":
    create_manual()
