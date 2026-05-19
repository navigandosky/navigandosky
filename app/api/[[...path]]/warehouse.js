// === MODULO MAGAZZINO ===
// CRUD articoli magazzino multi-tenant + Bolle di Vendita con scarico automatico scorte
import { NextResponse } from 'next/server';

// ---- Helpers ----

// Genera ID progressivo per company tipo MS-MAG-001
async function generateArticleRef(db, companyId) {
  const company = await db.collection('companies').findOne({ id: companyId });
  // Sigla = prime 2 lettere maiuscole del nome
  const name = (company?.name || 'XX').trim();
  const sigla = (name.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'XX').toUpperCase();
  // Conta articoli esistenti per questa company
  const count = await db.collection('warehouse_articles').countDocuments({ company_id: companyId });
  const next = String(count + 1).padStart(3, '0');
  return `${sigla}-MAG-${next}`;
}

async function generateSaleRef(db, companyId) {
  const year = new Date().getFullYear();
  const company = await db.collection('companies').findOne({ id: companyId });
  const sigla = ((company?.name || 'XX').replace(/[^A-Za-z]/g, '').slice(0, 2) || 'XX').toUpperCase();
  // Contatore per anno
  const startOfYear = `${year}-01-01T00:00:00.000Z`;
  const endOfYear = `${year + 1}-01-01T00:00:00.000Z`;
  const count = await db.collection('warehouse_sales').countDocuments({
    company_id: companyId,
    created_at: { $gte: startOfYear, $lt: endOfYear },
  });
  const next = String(count + 1).padStart(4, '0');
  return `${sigla}-BOL-${year}-${next}`;
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =========================
// ARTICOLI MAGAZZINO
// =========================
export async function handleWarehouseArticles(method, id, body, sp, db) {
  const col = db.collection('warehouse_articles');

  if (method === 'GET') {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('active') === 'true') filter.is_active = { $ne: false };
    if (id) {
      const doc = await col.findOne({ id });
      if (!doc) return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 });
      delete doc._id;
      return NextResponse.json(doc);
    }
    const list = await col.find(filter).sort({ created_at: -1 }).toArray();
    list.forEach(a => delete a._id);
    return NextResponse.json(list);
  }

  if (method === 'POST') {
    if (!body.company_id) return NextResponse.json({ error: 'company_id richiesto' }, { status: 400 });
    if (!body.description) return NextResponse.json({ error: 'description richiesto' }, { status: 400 });
    const ref = await generateArticleRef(db, body.company_id);
    const article = {
      id: uuid(),
      ref,
      company_id: body.company_id,
      description: String(body.description || '').trim(),
      unit_of_measure: body.unit_of_measure || 'PZ',
      valore_a_nuovo: Number(body.valore_a_nuovo) || 0,
      valore_attuale: Number(body.valore_attuale) || 0,
      quantity: Number(body.quantity) || 0,
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 5) : [],
      notes: body.notes || '',
      category: body.category || '',
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await col.insertOne(article);
    delete article._id;
    return NextResponse.json(article);
  }

  if (method === 'PUT' && id) {
    const update = {};
    const allowed = ['description', 'unit_of_measure', 'valore_a_nuovo', 'valore_attuale', 'quantity', 'photos', 'notes', 'category', 'is_active'];
    for (const k of allowed) if (k in body) update[k] = body[k];
    if (update.photos && Array.isArray(update.photos)) update.photos = update.photos.slice(0, 5);
    if (update.valore_a_nuovo != null) update.valore_a_nuovo = Number(update.valore_a_nuovo) || 0;
    if (update.valore_attuale != null) update.valore_attuale = Number(update.valore_attuale) || 0;
    if (update.quantity != null) update.quantity = Number(update.quantity) || 0;
    update.updated_at = new Date().toISOString();
    const r = await col.updateOne({ id }, { $set: update });
    if (!r.matchedCount) return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 });
    const doc = await col.findOne({ id });
    delete doc._id;
    return NextResponse.json(doc);
  }

  if (method === 'DELETE' && id) {
    const r = await col.deleteOne({ id });
    if (!r.deletedCount) return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Metodo non supportato' }, { status: 405 });
}

// =========================
// BOLLE DI VENDITA / SCARICO
// =========================
export async function handleWarehouseSales(method, id, body, sp, db) {
  const col = db.collection('warehouse_sales');
  const articlesCol = db.collection('warehouse_articles');

  if (method === 'GET') {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('causale')) filter.causale = sp.get('causale');
    if (sp.get('from')) filter.created_at = { ...(filter.created_at || {}), $gte: sp.get('from') };
    if (sp.get('to')) filter.created_at = { ...(filter.created_at || {}), $lte: sp.get('to') };
    if (id) {
      const doc = await col.findOne({ id });
      if (!doc) return NextResponse.json({ error: 'Bolla non trovata' }, { status: 404 });
      delete doc._id;
      return NextResponse.json(doc);
    }
    const list = await col.find(filter).sort({ created_at: -1 }).toArray();
    list.forEach(s => delete s._id);
    return NextResponse.json(list);
  }

  if (method === 'POST') {
    if (!body.company_id) return NextResponse.json({ error: 'company_id richiesto' }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Almeno una riga (items) richiesta' }, { status: 400 });
    }
    const causale = body.causale || 'USO_ESTERNO'; // USO_ESTERNO | USO_INTERNO
    if (!['USO_ESTERNO', 'USO_INTERNO'].includes(causale)) {
      return NextResponse.json({ error: 'causale non valida' }, { status: 400 });
    }

    // Validazione + decremento scorte atomico
    const articleIds = body.items.map(it => it.article_id).filter(Boolean);
    const articles = await articlesCol.find({ id: { $in: articleIds }, company_id: body.company_id }).toArray();
    const map = new Map(articles.map(a => [a.id, a]));

    // Pre-check disponibilità
    for (const it of body.items) {
      const a = map.get(it.article_id);
      if (!a) return NextResponse.json({ error: `Articolo non trovato: ${it.article_id}` }, { status: 400 });
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) return NextResponse.json({ error: `Quantità non valida per articolo ${a.ref}` }, { status: 400 });
      if (qty > Number(a.quantity || 0)) {
        return NextResponse.json({ error: `Scorta insufficiente per ${a.ref}: disponibili ${a.quantity}, richiesti ${qty}` }, { status: 400 });
      }
    }

    const ref = await generateSaleRef(db, body.company_id);
    const itemsArr = body.items.map(it => {
      const a = map.get(it.article_id);
      const qty = Number(it.quantity) || 0;
      const unitPrice = Number(it.unit_price) || Number(a.valore_attuale) || 0;
      return {
        article_id: it.article_id,
        article_ref: a.ref,
        description: a.description,
        unit_of_measure: a.unit_of_measure,
        quantity: qty,
        unit_price: unitPrice,
        total: qty * unitPrice,
      };
    });

    const subtotal = itemsArr.reduce((s, it) => s + (it.total || 0), 0);
    const sale = {
      id: uuid(),
      ref,
      company_id: body.company_id,
      causale,
      // Cliente / destinatario
      customer_name: body.customer_name || (causale === 'USO_INTERNO' ? 'Uso Interno' : ''),
      customer_vat: body.customer_vat || '',
      customer_address: body.customer_address || '',
      // Risorsa interna (solo per uso interno) - es. barca/risorsa a cui è destinato
      internal_resource_id: causale === 'USO_INTERNO' ? (body.internal_resource_id || null) : null,
      internal_resource_name: causale === 'USO_INTERNO' ? (body.internal_resource_name || '') : '',
      items: itemsArr,
      subtotal,
      total: subtotal,
      notes: body.notes || '',
      created_by: body.created_by || '',
      created_at: new Date().toISOString(),
    };

    // Scarico atomico (in sequenza - per app monolitica va bene)
    for (const it of itemsArr) {
      await articlesCol.updateOne({ id: it.article_id }, { $inc: { quantity: -it.quantity }, $set: { updated_at: new Date().toISOString() } });
    }
    await col.insertOne(sale);
    delete sale._id;
    return NextResponse.json(sale);
  }

  if (method === 'DELETE' && id) {
    // Cancellazione bolla -> RIPRISTINO scorte
    const sale = await col.findOne({ id });
    if (!sale) return NextResponse.json({ error: 'Bolla non trovata' }, { status: 404 });
    for (const it of (sale.items || [])) {
      await articlesCol.updateOne({ id: it.article_id }, { $inc: { quantity: Number(it.quantity) || 0 }, $set: { updated_at: new Date().toISOString() } });
    }
    await col.deleteOne({ id });
    return NextResponse.json({ ok: true, restored: (sale.items || []).length });
  }

  return NextResponse.json({ error: 'Metodo non supportato' }, { status: 405 });
}

// =========================
// REPORT INVENTARIO / CONSISTENZA
// =========================
export async function handleWarehouseReport(method, sp, db) {
  if (method !== 'GET') return NextResponse.json({ error: 'Solo GET' }, { status: 405 });

  const companyId = sp.get('company_id');
  if (!companyId) return NextResponse.json({ error: 'company_id richiesto' }, { status: 400 });

  const articles = await db.collection('warehouse_articles').find({ company_id: companyId }).toArray();
  const sales = await db.collection('warehouse_sales').find({ company_id: companyId }).toArray();

  // Totali generali
  let totalArticles = articles.length;
  let totalActive = articles.filter(a => a.is_active !== false).length;
  let totalQuantity = 0;
  let valueNew = 0; // Valore a nuovo totale
  let valueCurrent = 0; // Valore attuale totale
  let lowStockItems = [];
  articles.forEach(a => {
    const qty = Number(a.quantity) || 0;
    totalQuantity += qty;
    valueNew += qty * (Number(a.valore_a_nuovo) || 0);
    valueCurrent += qty * (Number(a.valore_attuale) || 0);
    if (qty <= 0) lowStockItems.push({ ref: a.ref, description: a.description, quantity: qty });
  });

  // Statistiche vendite
  let totalSales = sales.length;
  let totalSalesValue = 0;
  let totalQtyOut = 0;
  let salesUsoEsterno = 0;
  let salesUsoInterno = 0;
  let valueUsoEsterno = 0;
  let valueUsoInterno = 0;
  sales.forEach(s => {
    totalSalesValue += Number(s.total) || 0;
    (s.items || []).forEach(it => { totalQtyOut += Number(it.quantity) || 0; });
    if (s.causale === 'USO_INTERNO') {
      salesUsoInterno++;
      valueUsoInterno += Number(s.total) || 0;
    } else {
      salesUsoEsterno++;
      valueUsoEsterno += Number(s.total) || 0;
    }
  });

  return NextResponse.json({
    articles: { total: totalArticles, active: totalActive, total_quantity: totalQuantity, value_new: valueNew, value_current: valueCurrent, low_stock: lowStockItems },
    sales: { total: totalSales, total_value: totalSalesValue, total_qty_out: totalQtyOut, uso_esterno_count: salesUsoEsterno, uso_interno_count: salesUsoInterno, uso_esterno_value: valueUsoEsterno, uso_interno_value: valueUsoInterno },
  });
}
