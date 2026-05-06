import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// =====================================================================
// PORT QUOTES (Preventivi archiviati - Marina)
// =====================================================================
export async function handlePortQuotes(method, id, body, action, sp, db) {
  const col = db.collection('port_quotes');

  // GET tutti con filtri
  if (method === 'GET' && !id) {
    const filter = {};
    const marina_id = sp?.get?.('marina_id');
    const status = sp?.get?.('status');
    const customer_email = sp?.get?.('customer_email');
    if (marina_id) filter.marina_id = marina_id;
    if (status) filter.status = status;
    if (customer_email) filter['customer.email'] = customer_email;

    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
  }

  // GET singolo
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return new Response(JSON.stringify({ error: 'Preventivo non trovato' }), { status: 404 });
    return new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST nuovo
  if (method === 'POST' && !id) {
    // Genera numero progressivo per anno
    const year = new Date().getFullYear();
    const lastQuote = await col.find({ year }).sort({ progressive: -1 }).limit(1).toArray();
    const progressive = (lastQuote[0]?.progressive || 0) + 1;
    const quote_number = `${year}/${String(progressive).padStart(4, '0')}`;

    const item = {
      id: uuidv4(),
      quote_number,
      year,
      progressive,
      marina_id: body.marina_id,
      marina_name: body.marina_name || '',
      customer: body.customer || {}, // { name, surname, email, phone, tax_code, address, city, zip, country }
      boat: body.boat || {}, // { name, registration, type, length, beam }
      start_date: body.start_date,
      end_date: body.end_date,
      days: body.days || 0,
      tariff_choice: body.tariff_choice || '', // 'daily'|'monthly'|'summer_flat'|'annual'|'custom'
      tariff_label: body.tariff_label || '',
      mooring_amount: Number(body.mooring_amount) || 0,
      extras: body.extras || [], // [{ name, detail, subtotal }]
      extras_total: Number(body.extras_total) || 0,
      grand_total: Number(body.grand_total) || 0,
      notes: body.notes || '',
      status: body.status || 'BOZZA', // BOZZA | INVIATO | ACCETTATO | SCADUTO | CONVERTITO
      converted_to_berth_id: null,
      created_at: new Date().toISOString(),
      created_by: body.created_by || '',
      valid_until: body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await col.insertOne(item);
    return new Response(JSON.stringify(item), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // PUT (modifica stato/dati)
  if (method === 'PUT' && id) {
    const update = { ...body, updated_at: new Date().toISOString() };
    delete update.id; delete update._id;
    await col.updateOne({ id }, { $set: update });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  // DELETE
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}

// =====================================================================
// PORT SETTINGS (Impostazioni Marina/Trivor - inclusa password autorizzazione tariffa servizio)
// =====================================================================
export async function handlePortSettings(method, id, body, action, sp, db) {
  const col = db.collection('port_settings');
  const SETTINGS_ID = 'global'; // singleton

  // GET impostazioni globali (no password hash returned)
  if (method === 'GET' && !id) {
    let item = await col.findOne({ id: SETTINGS_ID });
    if (!item) {
      item = {
        id: SETTINGS_ID,
        complimentary_password_hash: null, // Non impostata di default
        complimentary_password_set: false,
        company_logo_url: '', // Logo viene preso dalla company emittente
        invoice_prefix: 'BOSA',
        created_at: new Date().toISOString(),
      };
      await col.insertOne(item);
    }
    // Non rispedire mai l'hash
    const { complimentary_password_hash, ...safe } = item;
    safe.complimentary_password_set = !!complimentary_password_hash;
    return new Response(JSON.stringify(safe), { headers: { 'Content-Type': 'application/json' } });
  }

  // PUT (aggiorna impostazioni)
  if (method === 'PUT' && action === 'set-complimentary-password') {
    if (!body.password || body.password.length < 4) {
      return new Response(JSON.stringify({ error: 'Password troppo corta (min 4 caratteri)' }), { status: 400 });
    }
    const hash = await bcrypt.hash(body.password, 10);
    await col.updateOne(
      { id: SETTINGS_ID },
      { $set: { complimentary_password_hash: hash, complimentary_password_set: true, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST verifica password
  if (method === 'POST' && action === 'verify-complimentary-password') {
    const settings = await col.findOne({ id: SETTINGS_ID });
    if (!settings?.complimentary_password_hash) {
      return new Response(JSON.stringify({ error: 'Password autorizzazione non configurata. Configurarla come Super Admin.' }), { status: 400 });
    }
    const ok = await bcrypt.compare(body.password || '', settings.complimentary_password_hash);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Password autorizzazione errata' }), { status: 401 });
    }
    return new Response(JSON.stringify({ valid: true, authorized_at: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
