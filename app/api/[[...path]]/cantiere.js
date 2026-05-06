import { v4 as uuidv4 } from 'uuid';

// Liste template precaricati di rimessaggio nautico
const DEFAULT_TEMPLATES = [
  // CANTIERE / RIMESSAGGIO
  { description: 'Alaggio carrello', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Varo a movimento', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Sosta piazzale invernale (al metro x mese)', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Lavaggio carena con pulivapor (al metro)', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Antivegetativa 1 mano (al metro)', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Antivegetativa 2 mani (al metro)', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Messa in posa di 3 mani antivegetativa bianca', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Trasporto interno carrello', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Stoccaggio rimorchio/carrello', default_unit_price: 0, category: 'Cantiere' },
  { description: 'Lavaggio esterno opera viva e opera morta imbarcazione', default_unit_price: 0, category: 'Cantiere' },
  // MANODOPERA MOTORE
  { description: 'Sostituzione filtro carburante', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione olio e filtro olio', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione girante', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione candele e gommini', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione cinghia AV', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione olio piede', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione olio trim', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione soffietto scarico', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione soffietto cardano', default_unit_price: 0, category: 'Manodopera Motore' },
  { description: 'Sostituzione zinchi', default_unit_price: 0, category: 'Manodopera Motore' },
  // ELETTRICO
  { description: 'Verifica impianto elettrico', default_unit_price: 0, category: 'Elettrico' },
  { description: 'Verifica e messa in carica batterie', default_unit_price: 0, category: 'Elettrico' },
  { description: 'Eventuale sostituzione batterie', default_unit_price: 0, category: 'Elettrico' },
];

// =====================================================================
// CANTIERE QUOTES (Preventivi rimessaggio)
// =====================================================================
export async function handleCantiereQuotes(method, id, body, action, sp, db) {
  const col = db.collection('cantiere_quotes');

  // GET tutti con filtri
  if (method === 'GET' && !id) {
    const filter = {};
    const status = sp?.get?.('status');
    const customer_email = sp?.get?.('customer_email');
    const company_id = sp?.get?.('company_id');
    if (status) filter.status = status;
    if (customer_email) filter['customer.email'] = customer_email;
    if (company_id) filter.company_id = company_id;
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return new Response(JSON.stringify({ error: 'Preventivo non trovato' }), { status: 404 });
    return new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && !id) {
    const year = new Date().getFullYear();
    const last = await col.find({ year }).sort({ progressive: -1 }).limit(1).toArray();
    const progressive = (last[0]?.progressive || 0) + 1;
    const quote_number = `CANT-${year}/${String(progressive).padStart(4, '0')}`;

    // Calcola totali server-side
    const items = (body.items || []).map(it => {
      const qty = Number(it.qty) || 0;
      const unit_price = Number(it.unit_price) || 0;
      const amount = qty * unit_price;
      const discount = Number(it.discount) || 0;
      const net_taxable = Math.max(0, amount - discount);
      return { ...it, qty, unit_price, amount, discount, net_taxable };
    });
    const subtotal_net = items.reduce((s, it) => s + (it.net_taxable || 0), 0);
    const iva_rate = Number(body.iva_rate ?? 22);
    const iva_amount = subtotal_net * iva_rate / 100;
    const grand_total = subtotal_net + iva_amount;

    const item = {
      id: uuidv4(),
      quote_number,
      year,
      progressive,
      company_id: body.company_id || null,
      customer: {
        name: body.customer?.name || '',
        surname: body.customer?.surname || '',
        email: body.customer?.email || '',
        phone: body.customer?.phone || '',
        vat_number: body.customer?.vat_number || '',
      },
      boat: body.boat || { name: '', registration: '', length: 0, type: 'motor' },
      items,
      subtotal_net,
      iva_rate,
      iva_amount,
      grand_total,
      payment_method: body.payment_method || '',
      payment_status: body.payment_status || 'DA_PAGARE',
      notes: body.notes || '',
      status: body.status || 'BOZZA',
      created_at: new Date().toISOString(),
      created_by: body.created_by || '',
      valid_until: body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await col.insertOne(item);
    return new Response(JSON.stringify(item), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'PUT' && id) {
    const update = { ...body, updated_at: new Date().toISOString() };
    delete update.id; delete update._id; delete update.quote_number; delete update.year; delete update.progressive;
    
    // Se items modificati, ricalcola totali completi
    if (Array.isArray(update.items)) {
      const items = update.items.map(it => {
        const qty = Number(it.qty) || 0;
        const unit_price = Number(it.unit_price) || 0;
        const amount = qty * unit_price;
        const discount = Number(it.discount) || 0;
        const net_taxable = Math.max(0, amount - discount);
        return { ...it, qty, unit_price, amount, discount, net_taxable };
      });
      update.items = items;
      update.subtotal_net = items.reduce((s, it) => s + (it.net_taxable || 0), 0);
      const iva_rate = Number(update.iva_rate ?? 22);
      update.iva_rate = iva_rate;
      update.iva_amount = update.subtotal_net * iva_rate / 100;
      update.grand_total = update.subtotal_net + update.iva_amount;
    } else if (update.iva_rate !== undefined) {
      // Solo iva_rate cambiato, ricalcola IVA e totale partendo dal subtotal salvato
      const existing = await col.findOne({ id });
      if (existing) {
        const subtotal = Number(existing.subtotal_net) || 0;
        const iva_rate = Number(update.iva_rate) || 0;
        update.iva_rate = iva_rate;
        update.iva_amount = subtotal * iva_rate / 100;
        update.grand_total = subtotal + update.iva_amount;
      }
    }
    await col.updateOne({ id }, { $set: update });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}

// =====================================================================
// CANTIERE TEMPLATES (voci servizio precaricate)
// =====================================================================
export async function handleCantiereTemplates(method, id, body, action, sp, db) {
  const col = db.collection('cantiere_templates');

  // Auto-seed se vuoto
  const count = await col.countDocuments();
  if (count === 0) {
    const seeded = DEFAULT_TEMPLATES.map(t => ({
      id: uuidv4(),
      description: t.description,
      default_unit_price: t.default_unit_price,
      category: t.category,
      is_active: true,
      created_at: new Date().toISOString(),
    }));
    if (seeded.length > 0) await col.insertMany(seeded);
  }

  if (method === 'GET' && !id) {
    const items = await col.find({ is_active: true }).sort({ category: 1, description: 1 }).toArray();
    return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && !id) {
    const item = {
      id: uuidv4(),
      description: body.description || '',
      default_unit_price: Number(body.default_unit_price) || 0,
      category: body.category || 'Generico',
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return new Response(JSON.stringify(item), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'PUT' && id) {
    const update = { ...body, updated_at: new Date().toISOString() };
    delete update.id; delete update._id;
    await col.updateOne({ id }, { $set: update });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
