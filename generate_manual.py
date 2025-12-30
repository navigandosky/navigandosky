#!/usr/bin/env python3
"""
Generatore Manuale Tecnico Spoke Ghivine
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

def create_manual():
    doc = SimpleDocTemplate(
        "/app/Manuale_Spoke_Ghivine.pdf",
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=28,
        spaceAfter=30,
        textColor=colors.HexColor('#0891b2'),
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=20,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    heading1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Heading1'],
        fontSize=18,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.HexColor('#0891b2'),
        borderWidth=1,
        borderColor=colors.HexColor('#0891b2'),
        borderPadding=5
    )
    
    heading2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#1f2937')
    )
    
    normal_style = ParagraphStyle(
        'NormalCustom',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    code_style = ParagraphStyle(
        'Code',
        parent=styles['Code'],
        fontSize=9,
        backColor=colors.HexColor('#f3f4f6'),
        borderWidth=1,
        borderColor=colors.HexColor('#e5e7eb'),
        borderPadding=8,
        fontName='Courier'
    )
    
    story = []
    
    # ===================
    # COPERTINA
    # ===================
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("SPOKE GHIVINE", title_style))
    story.append(Paragraph("Piattaforma Web per Tour Virtuali Matterport", subtitle_style))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("MANUALE TECNICO E DOCUMENTAZIONE", ParagraphStyle(
        'ManualTitle',
        parent=styles['Normal'],
        fontSize=16,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#374151')
    )))
    story.append(Spacer(1, 3*cm))
    
    # Info documento
    info_data = [
        ['Versione', '1.0'],
        ['Data', datetime.now().strftime('%d/%m/%Y')],
        ['Ambiente', 'Produzione'],
        ['URL', 'trivor.it/spokeghivine'],
    ]
    info_table = Table(info_data, colWidths=[5*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(info_table)
    
    story.append(PageBreak())
    
    # ===================
    # INDICE
    # ===================
    story.append(Paragraph("INDICE", heading1_style))
    story.append(Spacer(1, 0.5*cm))
    
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
        story.append(Paragraph(item, normal_style))
    
    story.append(PageBreak())
    
    # ===================
    # 1. PANORAMICA
    # ===================
    story.append(Paragraph("1. PANORAMICA DEL SISTEMA", heading1_style))
    
    story.append(Paragraph("""
    Spoke Ghivine è una piattaforma web progettata per la presentazione e gestione di tour virtuali 
    3D realizzati con tecnologia Matterport. Il sistema consente la visualizzazione immersiva di 
    spazi tridimensionali arricchiti da Punti di Interesse (POI) con audioguide multilingua 
    generate automaticamente tramite intelligenza artificiale.
    """, normal_style))
    
    story.append(Paragraph("1.1 Obiettivi del Sistema", heading2_style))
    story.append(Paragraph("""
    • Showcase professionale di tour virtuali Matterport<br/>
    • Gestione centralizzata di spazi 3D e contenuti multimediali<br/>
    • Audioguide automatiche in 4 lingue (Italiano, Inglese, Francese, Tedesco)<br/>
    • Interfaccia amministrativa per la gestione dei contenuti<br/>
    • Esperienza utente moderna e responsive
    """, normal_style))
    
    story.append(Paragraph("1.2 Target Utenti", heading2_style))
    story.append(Paragraph("""
    <b>Utenti Finali:</b> Visitatori del sito che esplorano i tour virtuali<br/>
    <b>Amministratori:</b> Gestori dei contenuti tramite pannello admin protetto
    """, normal_style))
    
    story.append(PageBreak())
    
    # ===================
    # 2. ARCHITETTURA
    # ===================
    story.append(Paragraph("2. ARCHITETTURA TECNICA", heading1_style))
    
    story.append(Paragraph("2.1 Stack Tecnologico", heading2_style))
    
    tech_data = [
        ['Componente', 'Tecnologia', 'Versione'],
        ['Frontend', 'React.js', '19.0.0'],
        ['Backend', 'FastAPI (Python)', '0.110.1'],
        ['Database', 'MongoDB Atlas', '6.0+'],
        ['Styling', 'Tailwind CSS', '3.x'],
        ['UI Components', 'Radix UI + Shadcn', 'Latest'],
        ['Animazioni', 'Framer Motion', '12.x'],
        ['HTTP Client', 'Axios', '1.8.4'],
        ['Routing', 'React Router', '7.5.1'],
    ]
    
    tech_table = Table(tech_data, colWidths=[5*cm, 6*cm, 3*cm])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("2.2 Architettura a Tre Livelli", heading2_style))
    
    arch_data = [
        ['Livello', 'Descrizione', 'Hosting'],
        ['Presentation', 'React SPA con Tailwind CSS', 'Emergent Platform'],
        ['Application', 'FastAPI REST API', 'Railway'],
        ['Data', 'MongoDB Database', 'MongoDB Atlas (Cluster Trivor)'],
    ]
    
    arch_table = Table(arch_data, colWidths=[4*cm, 6*cm, 4*cm])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(arch_table)
    
    story.append(PageBreak())
    
    # ===================
    # 3. FUNZIONALITÀ
    # ===================
    story.append(Paragraph("3. FUNZIONALITÀ PRINCIPALI", heading1_style))
    
    story.append(Paragraph("3.1 Gestione Spazi Matterport", heading2_style))
    story.append(Paragraph("""
    Il sistema permette la gestione completa di spazi virtuali 3D:<br/><br/>
    • <b>Integrazione Matterport SDK:</b> Embedding nativo dei tour 3D<br/>
    • <b>Link Esterni:</b> Supporto per tour hosted su piattaforme esterne (es. mpskin)<br/>
    • <b>Galleria Immagini:</b> Fino a 5 immagini per ogni spazio<br/>
    • <b>Descrizioni Multilingua:</b> Testi in IT, EN, FR, DE<br/>
    • <b>Stato Attivo/Inattivo:</b> Controllo visibilità pubblica
    """, normal_style))
    
    story.append(Paragraph("3.2 Sistema POI (Punti di Interesse)", heading2_style))
    story.append(Paragraph("""
    Ogni spazio può contenere molteplici Punti di Interesse:<br/><br/>
    • <b>Numerazione:</b> Identificativo numerico per ogni POI<br/>
    • <b>Descrizioni:</b> Testi descrittivi in 4 lingue<br/>
    • <b>Audioguide:</b> File audio generati automaticamente via TTS<br/>
    • <b>Upload Manuale:</b> Possibilità di caricare audio pre-registrati<br/>
    • <b>Player Integrato:</b> Riproduzione audio nel viewer 3D
    """, normal_style))
    
    story.append(Paragraph("3.3 Traduzione Automatica", heading2_style))
    story.append(Paragraph("""
    Sistema di traduzione AI-powered:<br/><br/>
    • <b>Motore:</b> OpenAI GPT-4o-mini<br/>
    • <b>Lingue:</b> Italiano → Inglese, Francese, Tedesco<br/>
    • <b>Processo:</b> Traduzione one-click dall'interfaccia admin<br/>
    • <b>Qualità:</b> Traduzioni professionali contestualizzate
    """, normal_style))
    
    story.append(Paragraph("3.4 Text-to-Speech (TTS)", heading2_style))
    story.append(Paragraph("""
    Generazione automatica di audioguide:<br/><br/>
    • <b>Motore:</b> OpenAI TTS-1<br/>
    • <b>Voci:</b><br/>
    &nbsp;&nbsp;- Italiano: "nova"<br/>
    &nbsp;&nbsp;- Inglese: "alloy"<br/>
    &nbsp;&nbsp;- Francese: "shimmer"<br/>
    &nbsp;&nbsp;- Tedesco: "echo"<br/>
    • <b>Formato Output:</b> MP3<br/>
    • <b>Storage:</b> URL permanenti Emergent Platform
    """, normal_style))
    
    story.append(PageBreak())
    
    # ===================
    # 4. DATABASE
    # ===================
    story.append(Paragraph("4. DATABASE E MODELLI DATI", heading1_style))
    
    story.append(Paragraph("4.1 Configurazione Database", heading2_style))
    
    db_config = [
        ['Parametro', 'Valore'],
        ['Provider', 'MongoDB Atlas'],
        ['Cluster', 'Trivor'],
        ['Database', 'spoke_ghivine'],
        ['Autenticazione', 'Username/Password'],
        ['Connessione', 'mongodb+srv://'],
    ]
    
    db_table = Table(db_config, colWidths=[5*cm, 9*cm])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(db_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("4.2 Collezione: spaces", heading2_style))
    
    spaces_schema = [
        ['Campo', 'Tipo', 'Descrizione'],
        ['id', 'String (UUID)', 'Identificativo univoco'],
        ['name', 'TranslatedText', 'Nome in 4 lingue'],
        ['description', 'TranslatedText', 'Descrizione in 4 lingue'],
        ['matterport_model_id', 'String', 'ID modello Matterport'],
        ['external_tour_url', 'String (Optional)', 'URL tour esterno'],
        ['images', 'Array[String]', 'URL immagini galleria'],
        ['is_active', 'Boolean', 'Stato pubblicazione'],
        ['order', 'Integer', 'Ordine visualizzazione'],
        ['created_at', 'DateTime', 'Data creazione'],
        ['updated_at', 'DateTime', 'Data modifica'],
    ]
    
    spaces_table = Table(spaces_schema, colWidths=[4*cm, 3.5*cm, 6.5*cm])
    spaces_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(spaces_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("4.3 Collezione: pois", heading2_style))
    
    pois_schema = [
        ['Campo', 'Tipo', 'Descrizione'],
        ['id', 'String (UUID)', 'Identificativo univoco'],
        ['space_id', 'String', 'Riferimento allo spazio'],
        ['poi_number', 'Integer', 'Numero identificativo POI'],
        ['name', 'TranslatedText', 'Nome in 4 lingue'],
        ['description', 'TranslatedText', 'Descrizione in 4 lingue'],
        ['audio_files', 'Object', 'URL audio per lingua (it, en, fr, de)'],
        ['is_active', 'Boolean', 'Stato pubblicazione'],
        ['created_at', 'DateTime', 'Data creazione'],
        ['updated_at', 'DateTime', 'Data modifica'],
    ]
    
    pois_table = Table(pois_schema, colWidths=[4*cm, 3.5*cm, 6.5*cm])
    pois_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(pois_table)
    
    story.append(Paragraph("4.4 Struttura TranslatedText", heading2_style))
    story.append(Paragraph("""
    Oggetto per contenuti multilingua:<br/>
    <font face="Courier" size="9">
    {<br/>
    &nbsp;&nbsp;"it": "Testo in italiano",<br/>
    &nbsp;&nbsp;"en": "Text in English",<br/>
    &nbsp;&nbsp;"fr": "Texte en français",<br/>
    &nbsp;&nbsp;"de": "Text auf Deutsch"<br/>
    }
    </font>
    """, normal_style))
    
    story.append(PageBreak())
    
    # ===================
    # 5. API ENDPOINTS
    # ===================
    story.append(Paragraph("5. API ENDPOINTS", heading1_style))
    
    story.append(Paragraph("5.1 Endpoints Spazi", heading2_style))
    
    api_spaces = [
        ['Metodo', 'Endpoint', 'Descrizione'],
        ['GET', '/api/spaces', 'Lista tutti gli spazi'],
        ['GET', '/api/spaces/{id}', 'Dettaglio singolo spazio'],
        ['POST', '/api/spaces', 'Crea nuovo spazio'],
        ['PUT', '/api/spaces/{id}', 'Modifica spazio esistente'],
        ['DELETE', '/api/spaces/{id}', 'Elimina spazio'],
    ]
    
    api_spaces_table = Table(api_spaces, colWidths=[2.5*cm, 5*cm, 6.5*cm])
    api_spaces_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(api_spaces_table)
    story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph("5.2 Endpoints POI", heading2_style))
    
    api_pois = [
        ['Metodo', 'Endpoint', 'Descrizione'],
        ['GET', '/api/pois', 'Lista tutti i POI'],
        ['GET', '/api/pois/{id}', 'Dettaglio singolo POI'],
        ['POST', '/api/pois', 'Crea nuovo POI'],
        ['PUT', '/api/pois/{id}', 'Modifica POI esistente'],
        ['DELETE', '/api/pois/{id}', 'Elimina POI'],
    ]
    
    api_pois_table = Table(api_pois, colWidths=[2.5*cm, 5*cm, 6.5*cm])
    api_pois_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(api_pois_table)
    story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph("5.3 Endpoints Servizi AI", heading2_style))
    
    api_ai = [
        ['Metodo', 'Endpoint', 'Descrizione'],
        ['POST', '/api/translate', 'Traduzione automatica testo'],
        ['POST', '/api/tts', 'Generazione audio TTS'],
        ['POST', '/api/upload/image', 'Upload immagine'],
        ['POST', '/api/upload/audio', 'Upload file audio'],
        ['GET', '/api/config', 'Configurazione client (SDK keys)'],
    ]
    
    api_ai_table = Table(api_ai, colWidths=[2.5*cm, 5*cm, 6.5*cm])
    api_ai_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(api_ai_table)
    
    story.append(PageBreak())
    
    # ===================
    # 6. INTEGRAZIONI
    # ===================
    story.append(Paragraph("6. INTEGRAZIONI ESTERNE", heading1_style))
    
    story.append(Paragraph("6.1 Matterport", heading2_style))
    
    matterport_data = [
        ['Parametro', 'Dettaglio'],
        ['Servizio', 'Matterport Showcase SDK'],
        ['Versione SDK', '3.x (Bundle JS)'],
        ['Autenticazione', 'SDK Key'],
        ['Funzionalità', 'Embedding tour 3D, navigazione, fullscreen'],
        ['Documentazione', 'https://matterport.github.io/showcase-sdk/'],
    ]
    
    matterport_table = Table(matterport_data, colWidths=[4*cm, 10*cm])
    matterport_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(matterport_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("6.2 OpenAI", heading2_style))
    
    openai_data = [
        ['Parametro', 'Dettaglio'],
        ['Provider', 'OpenAI via Emergent Integrations'],
        ['Modello Traduzione', 'GPT-4o-mini'],
        ['Modello TTS', 'TTS-1'],
        ['Autenticazione', 'Emergent LLM Key'],
        ['Rate Limits', 'Gestiti da Emergent Platform'],
    ]
    
    openai_table = Table(openai_data, colWidths=[4*cm, 10*cm])
    openai_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(openai_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("6.3 MongoDB Atlas", heading2_style))
    
    mongo_data = [
        ['Parametro', 'Dettaglio'],
        ['Provider', 'MongoDB Atlas'],
        ['Cluster Name', 'Trivor'],
        ['Region', 'AWS'],
        ['Tier', 'Shared Cluster'],
        ['Backup', 'Automatico giornaliero'],
        ['Connessione', 'TLS/SSL encrypted'],
    ]
    
    mongo_table = Table(mongo_data, colWidths=[4*cm, 10*cm])
    mongo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(mongo_table)
    
    story.append(PageBreak())
    
    # ===================
    # 7. PANNELLO ADMIN
    # ===================
    story.append(Paragraph("7. PANNELLO DI AMMINISTRAZIONE", heading1_style))
    
    story.append(Paragraph("7.1 Accesso", heading2_style))
    story.append(Paragraph("""
    Il pannello di amministrazione è accessibile all'indirizzo:<br/>
    <b>URL:</b> trivor.it/spokeghivine/admin<br/><br/>
    L'accesso è protetto da autenticazione username/password.
    """, normal_style))
    
    story.append(Paragraph("7.2 Funzionalità Admin", heading2_style))
    
    admin_features = [
        ['Sezione', 'Funzionalità'],
        ['Spazi', 'CRUD completo, gestione immagini, ordinamento'],
        ['POI', 'CRUD completo, assegnazione a spazi, generazione audio'],
        ['Traduzioni', 'Traduzione automatica one-click per tutti i campi testo'],
        ['Audio', 'Generazione TTS automatica, upload manuale, anteprima'],
        ['Immagini', 'Upload multiplo, riordinamento, eliminazione'],
    ]
    
    admin_table = Table(admin_features, colWidths=[3*cm, 11*cm])
    admin_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(admin_table)
    
    story.append(PageBreak())
    
    # ===================
    # 8. MULTILINGUA
    # ===================
    story.append(Paragraph("8. SUPPORTO MULTILINGUA", heading1_style))
    
    story.append(Paragraph("8.1 Lingue Supportate", heading2_style))
    
    lang_data = [
        ['Codice', 'Lingua', 'Voce TTS'],
        ['it', 'Italiano', 'nova'],
        ['en', 'Inglese', 'alloy'],
        ['fr', 'Francese', 'shimmer'],
        ['de', 'Tedesco', 'echo'],
    ]
    
    lang_table = Table(lang_data, colWidths=[3*cm, 5*cm, 6*cm])
    lang_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(lang_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("8.2 Selezione Lingua", heading2_style))
    story.append(Paragraph("""
    • <b>Interfaccia:</b> Selettore lingua nella navbar (bandiere/codici)<br/>
    • <b>Persistenza:</b> La selezione viene mantenuta nella sessione<br/>
    • <b>Contenuti:</b> Tutti i testi e audio si adattano alla lingua selezionata<br/>
    • <b>Default:</b> Italiano (it)
    """, normal_style))
    
    story.append(PageBreak())
    
    # ===================
    # 9. DEPLOYMENT
    # ===================
    story.append(Paragraph("9. DEPLOYMENT E INFRASTRUTTURA", heading1_style))
    
    story.append(Paragraph("9.1 Architettura di Deployment", heading2_style))
    
    deploy_data = [
        ['Componente', 'Piattaforma', 'URL/Dettagli'],
        ['Frontend', 'Emergent Platform', 'spoke-ghivine-3d.preview.emergentagent.com'],
        ['Backend', 'Railway', 'API REST su container Docker'],
        ['Database', 'MongoDB Atlas', 'Cluster Trivor (shared)'],
        ['Dominio', 'Aruba', 'trivor.it/spokeghivine (redirect)'],
    ]
    
    deploy_table = Table(deploy_data, colWidths=[3*cm, 4*cm, 7*cm])
    deploy_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(deploy_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("9.2 Variabili d'Ambiente", heading2_style))
    
    env_data = [
        ['Variabile', 'Descrizione', 'Dove'],
        ['MONGO_URL', 'Connection string MongoDB', 'Backend (Railway)'],
        ['DB_NAME', 'Nome database', 'Backend (Railway)'],
        ['EMERGENT_LLM_KEY', 'Chiave API per OpenAI', 'Backend (Railway)'],
        ['MATTERPORT_SDK_KEY', 'Chiave SDK Matterport', 'Backend (Railway)'],
        ['CORS_ORIGINS', 'Origini CORS consentite', 'Backend (Railway)'],
        ['REACT_APP_BACKEND_URL', 'URL API backend', 'Frontend'],
    ]
    
    env_table = Table(env_data, colWidths=[5*cm, 5*cm, 4*cm])
    env_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(env_table)
    
    story.append(PageBreak())
    
    # ===================
    # 10. CREDENZIALI
    # ===================
    story.append(Paragraph("10. CREDENZIALI E ACCESSI", heading1_style))
    
    story.append(Paragraph("""
    <b>⚠️ INFORMAZIONI RISERVATE - GESTIRE CON CURA</b>
    """, ParagraphStyle('Warning', parent=normal_style, textColor=colors.HexColor('#dc2626'), fontSize=12)))
    
    story.append(Paragraph("10.1 Pannello Admin", heading2_style))
    
    admin_creds = [
        ['Campo', 'Valore'],
        ['URL', 'trivor.it/spokeghivine/admin'],
        ['Username', 'admin'],
        ['Password', 'Ghivine205$'],
    ]
    
    admin_creds_table = Table(admin_creds, colWidths=[4*cm, 10*cm])
    admin_creds_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fef2f2')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fecaca')),
    ]))
    story.append(admin_creds_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("10.2 MongoDB Atlas", heading2_style))
    
    mongo_creds = [
        ['Campo', 'Valore'],
        ['Cluster', 'trivor.8dw18ki.mongodb.net'],
        ['Database', 'spoke_ghivine'],
        ['Username', 'Trivor_db2025'],
        ['Password', 'N5l9R82kgNFYc7uf'],
    ]
    
    mongo_creds_table = Table(mongo_creds, colWidths=[4*cm, 10*cm])
    mongo_creds_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fef2f2')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fecaca')),
    ]))
    story.append(mongo_creds_table)
    
    story.append(PageBreak())
    
    # ===================
    # 11. MANUTENZIONE
    # ===================
    story.append(Paragraph("11. MANUTENZIONE E SUPPORTO", heading1_style))
    
    story.append(Paragraph("11.1 Backup Database", heading2_style))
    story.append(Paragraph("""
    MongoDB Atlas esegue backup automatici giornalieri. È possibile:<br/><br/>
    • Accedere alla console Atlas per restore point-in-time<br/>
    • Esportare manualmente i dati via mongodump<br/>
    • Configurare backup aggiuntivi su richiesta
    """, normal_style))
    
    story.append(Paragraph("11.2 Monitoraggio", heading2_style))
    story.append(Paragraph("""
    • <b>Railway:</b> Dashboard con metriche CPU, memoria, logs<br/>
    • <b>MongoDB Atlas:</b> Performance Advisor, Real-time metrics<br/>
    • <b>Emergent:</b> Logs applicazione frontend
    """, normal_style))
    
    story.append(Paragraph("11.3 Aggiornamenti", heading2_style))
    story.append(Paragraph("""
    Per aggiornare l'applicazione:<br/><br/>
    1. <b>Frontend:</b> Modifiche su Emergent Platform → deploy automatico<br/>
    2. <b>Backend:</b> Push su repository GitHub → Railway auto-deploy<br/>
    3. <b>Database:</b> Modifiche schema retrocompatibili
    """, normal_style))
    
    story.append(Paragraph("11.4 Contatti Supporto", heading2_style))
    story.append(Paragraph("""
    Per assistenza tecnica contattare il team di sviluppo.<br/><br/>
    <b>Piattaforma di sviluppo:</b> Emergent AI<br/>
    <b>Supporto Emergent:</b> support@emergent.sh
    """, normal_style))
    
    # Build PDF
    doc.build(story)
    print("✅ Manuale generato: /app/Manuale_Spoke_Ghivine.pdf")

if __name__ == "__main__":
    create_manual()
