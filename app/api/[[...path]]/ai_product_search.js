import { NextResponse } from 'next/server';

const EMERGENT_LLM_URL = 'https://integrations.emergentagent.com/llm/chat/completions';
const MODEL = 'gemini/gemini-2.5-pro';

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

// Pre-built search URLs for each supplier - always-working fallback
function buildSearchUrls(query) {
  const q = encodeURIComponent((query || '').trim().slice(0, 120));
  return {
    Osculati: `https://www.osculati.com/it/p/search.aspx?q=${q}`,
    'Amazon Nautica': `https://www.amazon.it/s?k=${q}&i=sports&rh=n%3A524014031`,
    'SVB Marine': `https://www.svb24.com/it/search?q=${q}`,
    'Magellano Store': `https://www.magellanostore.com/catalogsearch/result/?q=${q}`,
    AliExpress: `https://it.aliexpress.com/w/wholesale-${q}.html`,
    Temu: `https://www.temu.com/it/search_result.html?search_key=${q}`,
  };
}

const SYSTEM_PROMPT = `Sei un esperto di equipaggiamenti nautici e ricambi marini con conoscenza approfondita dei principali fornitori europei e mondiali.

COMPITO: Analizza l'immagine del prodotto fornita (e l'eventuale descrizione testuale) e produci un report comparativo per la ricerca di prodotti simili sui seguenti fornitori:
1. Osculati (catalogo nautico italiano, prodotti di qualità professionale)
2. Amazon Nautica (sezione Sport e Tempo Libero/Nautica di Amazon.it)
3. SVB Marine (svb24.com, colosso tedesco di accessori nautici)
4. Magellano Store (e-commerce nautico italiano)
5. AliExpress (marketplace cinese, prezzi bassi, qualità variabile)
6. Temu (marketplace cinese, prezzi molto bassi)

ISTRUZIONI:
- Identifica il prodotto in foto in modo preciso (tipo, materiale, dimensioni stimate, funzione)
- Per OGNI fornitore proponi 1-2 prodotti probabili che potrebbero corrispondere
- Stima un range di prezzo realistico in EUR per ciascun fornitore (i prezzi cinesi sono tipicamente 50-80% più bassi)
- Suggerisci una categoria di magazzino italiana (es: "Sicurezza", "Ricambi Motore", "Coperta", "Ormeggio", "Elettrica", "Antincendio")
- Suggerisci un "Valore a Nuovo" indicativo (prezzo medio di mercato in Italia)
- Restituisci SOLO un oggetto JSON valido (NO markdown, NO testo introduttivo).

FORMATO JSON OBBLIGATORIO:
{
  "product_name": "Nome conciso del prodotto identificato (max 80 caratteri)",
  "description": "Descrizione tecnica dettagliata in italiano (max 250 caratteri)",
  "characteristics": ["caratt 1", "caratt 2", "caratt 3", "..."],
  "suggested_category": "Categoria magazzino in italiano",
  "suggested_value_new_eur": 45.50,
  "search_query": "Parole chiave per ricerca (max 60 caratteri, lingua italiano/inglese)",
  "suppliers": [
    {
      "name": "Osculati",
      "products": [
        {"title": "Nome prodotto specifico", "price_min": 35.00, "price_max": 55.00, "currency": "EUR", "notes": "Note opzionali"}
      ]
    },
    {
      "name": "Amazon Nautica",
      "products": [...]
    },
    {
      "name": "SVB Marine",
      "products": [...]
    },
    {
      "name": "Magellano Store",
      "products": [...]
    },
    {
      "name": "AliExpress",
      "products": [...]
    },
    {
      "name": "Temu",
      "products": [...]
    }
  ],
  "confidence": "high|medium|low",
  "notes_general": "Eventuali note generali sul prodotto e sulle stime di prezzo"
}

REGOLE FERREE:
- Restituisci SOLO il JSON (parsabile direttamente con JSON.parse).
- NON usare backtick markdown.
- NON aggiungere spiegazioni prima o dopo il JSON.
- Tutti i prezzi sono numeri (non stringhe).
- Se non riesci a identificare il prodotto, restituisci comunque la struttura JSON con confidence: "low" e prezzi stimati per categoria generica.`;

function extractJson(text) {
  if (!text) return null;
  // Remove markdown code fences if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  // Find first { and last } to extract JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  const jsonStr = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export async function handleAiProductSearch(method, body) {
  if (method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: cors });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) {
    return json({ error: 'EMERGENT_LLM_KEY non configurata sul server.' }, 500);
  }

  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  const description = (body.description || '').toString().trim();
  const category = (body.category || '').toString().trim();
  // Lista fornitori abilitati dal frontend (default: tutti)
  const ALL_SUPPLIERS = ['Osculati', 'Amazon', 'SVB', 'Magellano', 'AliExpress', 'Temu'];
  const enabledSuppliersRaw = Array.isArray(body.enabled_suppliers) && body.enabled_suppliers.length > 0
    ? body.enabled_suppliers
    : ALL_SUPPLIERS;
  // Mapping nomi short → nomi prodotti dall'AI
  const SUPPLIER_MAP = {
    'Osculati': 'Osculati',
    'Amazon': 'Amazon Nautica',
    'SVB': 'SVB Marine',
    'Magellano': 'Magellano Store',
    'AliExpress': 'AliExpress',
    'Temu': 'Temu',
  };
  const enabledFullNames = enabledSuppliersRaw.map(s => SUPPLIER_MAP[s] || s);

  if (images.length === 0 && !description) {
    return json({ error: 'Fornire almeno una foto o una descrizione per la ricerca.' }, 400);
  }

  // Build user message with images + text
  const userContent = [];
  const userText = [
    'Analizza il prodotto in foto e fornisci il report comparativo richiesto.',
    description ? `Descrizione utente: "${description}"` : '',
    category ? `Categoria proposta: "${category}"` : '',
    'Restituisci il JSON nel formato richiesto.',
  ].filter(Boolean).join('\n');

  userContent.push({ type: 'text', text: userText });

  for (const img of images.slice(0, 3)) {
    // Accept either data URL or raw base64
    let dataUrl = img;
    if (!String(img).startsWith('data:')) {
      dataUrl = `data:image/jpeg;base64,${img}`;
    }
    userContent.push({ type: 'image_url', image_url: { url: dataUrl } });
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 4500,
  };

  try {
    const resp = await fetch(EMERGENT_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[AI Product Search] LLM error:', resp.status, errText.slice(0, 500));
      return json({ error: `Errore AI (HTTP ${resp.status})`, details: errText.slice(0, 400) }, 502);
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) {
      return json({ error: 'Risposta vuota dal modello AI.' }, 502);
    }

    const parsed = extractJson(text);
    if (!parsed) {
      return json({
        error: 'Impossibile parsare il JSON dalla risposta AI.',
        raw_text: text.slice(0, 1500),
      }, 502);
    }

    // Build search URLs for each supplier using the search_query
    const query = parsed.search_query || parsed.product_name || description;
    const searchUrls = buildSearchUrls(query);

    // Attach search URLs to each supplier + filter by enabled
    const enrichedSuppliers = (parsed.suppliers || [])
      .filter((s) => enabledFullNames.includes(s.name))
      .map((s) => ({
        ...s,
        search_url: searchUrls[s.name] || null,
      }));

    return json({
      product_name: parsed.product_name || '',
      description: parsed.description || '',
      characteristics: Array.isArray(parsed.characteristics) ? parsed.characteristics : [],
      suggested_category: parsed.suggested_category || '',
      suggested_value_new_eur: Number(parsed.suggested_value_new_eur) || 0,
      search_query: query,
      suppliers: enrichedSuppliers,
      confidence: parsed.confidence || 'medium',
      notes_general: parsed.notes_general || '',
      _model: MODEL,
    });
  } catch (e) {
    console.error('[AI Product Search] Exception:', e);
    return json({ error: 'Errore interno durante chiamata AI.', details: String(e?.message || e) }, 500);
  }
}
