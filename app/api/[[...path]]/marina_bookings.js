// API per gestione richieste di prenotazione marine
// Schema: marina_bookings
// Workflow: PENDING → DEPOSIT_PAID → CONFIRMED → CONTRACT/CANCELLED

import { v4 as uuidv4 } from 'uuid';

export async function handleMarinaBookings(method, id, body, action, sp, db) {
  const col = db.collection('marina_bookings');

  // === LIST ===
  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('status')) filter.status = sp.get('status');
    if (sp.get('marina_id')) filter.marina_id = sp.get('marina_id');
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('customer_email')) filter['customer.email'] = sp.get('customer_email');
    if (sp.get('quote_number')) filter.quote_number = sp.get('quote_number');
    if (sp.get('booking_number')) filter.booking_number = sp.get('booking_number');
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
  }

  // === LOOKUP per quote_number (per pubblico - cerca un preventivo da convertire) ===
  if (method === 'GET' && id === 'lookup-quote') {
    const qn = sp.get('quote_number');
    if (!qn) return new Response(JSON.stringify({ error: 'quote_number richiesto' }), { status: 400 });
    const quote = await db.collection('port_quotes').findOne({ quote_number: qn });
    if (!quote) return new Response(JSON.stringify({ error: 'Preventivo non trovato' }), { status: 404 });
    return new Response(JSON.stringify(quote), { headers: { 'Content-Type': 'application/json' } });
  }

  // === GET single ===
  if (method === 'GET' && id) {
    const b = await col.findOne({ id });
    if (!b) return new Response(JSON.stringify({ error: 'Prenotazione non trovata' }), { status: 404 });
    return new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } });
  }

  // === CREATE prenotazione ===
  if (method === 'POST' && !id) {
    // Genera booking_number progressivo BK-YYYY/NNNN
    const year = new Date().getFullYear();
    const last = await col.find({ year }).sort({ progressive: -1 }).limit(1).toArray();
    const progressive = (last[0]?.progressive || 0) + 1;
    const booking_number = `BK-${year}/${String(progressive).padStart(4, '0')}`;

    // Se viene fornito un quote_id/quote_number, copia i dati dal preventivo
    let quoteData = null;
    if (body.quote_id) {
      quoteData = await db.collection('port_quotes').findOne({ id: body.quote_id });
    } else if (body.quote_number) {
      quoteData = await db.collection('port_quotes').findOne({ quote_number: body.quote_number });
    }

    // Recupera company_id dalla marina (anche dal preventivo se disponibile)
    let company_id = body.company_id || quoteData?.company_id || null;
    const marinaIdForLookup = body.marina_id || quoteData?.marina_id || null;
    if (marinaIdForLookup && !company_id) {
      const m = await db.collection('marinas').findOne({ id: marinaIdForLookup });
      company_id = m?.company_id || null;
    }

    const grand_total = Number(body.grand_total ?? quoteData?.grand_total ?? 0);
    const deposit_pct = Number(body.deposit_pct ?? 30);
    const deposit_amount = Math.round(grand_total * deposit_pct / 100 * 100) / 100;
    const balance_amount = Math.round((grand_total - deposit_amount) * 100) / 100;

    const item = {
      id: uuidv4(),
      booking_number,
      year,
      progressive,
      // Riferimento preventivo
      quote_id: body.quote_id || quoteData?.id || null,
      quote_number: body.quote_number || quoteData?.quote_number || null,
      // Marina e company
      marina_id: body.marina_id || quoteData?.marina_id || null,
      marina_name: body.marina_name || quoteData?.marina_name || '',
      company_id,
      // Cliente
      customer: body.customer || quoteData?.customer || {},
      boat: body.boat || quoteData?.boat || {},
      // Periodo
      start_date: body.start_date || quoteData?.start_date,
      end_date: body.end_date || quoteData?.end_date,
      days: Number(body.days ?? quoteData?.days ?? 0),
      // Tariffa
      tariff_type: body.tariff_type || quoteData?.tariff_choice || '',
      tariff_label: body.tariff_label || quoteData?.tariff_label || '',
      tariff_description: body.tariff_description || quoteData?.tariff_description || '',
      mooring_amount: Number(body.mooring_amount ?? quoteData?.mooring_amount ?? 0),
      extras: body.extras || quoteData?.extras || [],
      extras_total: Number(body.extras_total ?? quoteData?.extras_total ?? 0),
      grand_total,
      // Acconto
      deposit_pct,
      deposit_amount,
      deposit_paid: false,
      deposit_payment_method: '',
      deposit_payment_reference: '',
      deposit_payment_date: null,
      balance_amount,
      balance_paid: false,
      // Stato
      status: 'PENDING', // PENDING | DEPOSIT_PAID | CONFIRMED | CONTRACT | REJECTED | CANCELLED
      notes: body.notes || '',
      // Tracciamento
      source: body.source || 'PUBLIC', // PUBLIC | ADMIN
      requested_by: body.requested_by || (body.customer?.email || ''),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await col.insertOne(item);
    return new Response(JSON.stringify(item), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // === ACTION: pay-deposit (mock SumUp) ===
  if (method === 'POST' && id && action === 'pay-deposit') {
    const existing = await col.findOne({ id });
    if (!existing) return new Response(JSON.stringify({ error: 'Prenotazione non trovata' }), { status: 404 });
    
    const update = {
      deposit_paid: true,
      deposit_payment_method: body.payment_method || 'SUMUP_MOCK',
      deposit_payment_reference: body.payment_reference || `MOCK-${Date.now()}`,
      deposit_payment_date: new Date().toISOString(),
      status: 'DEPOSIT_PAID',
      updated_at: new Date().toISOString(),
    };
    await col.updateOne({ id }, { $set: update });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  // === ACTION: pay-balance ===
  if (method === 'POST' && id && action === 'pay-balance') {
    const existing = await col.findOne({ id });
    if (!existing) return new Response(JSON.stringify({ error: 'Prenotazione non trovata' }), { status: 404 });
    
    await col.updateOne({ id }, {
      $set: {
        balance_paid: true,
        balance_payment_method: body.payment_method || 'SUMUP_MOCK',
        balance_payment_date: new Date().toISOString(),
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      }
    });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  // === ACTION: confirm (admin) ===
  if (method === 'POST' && id && action === 'confirm') {
    await col.updateOne({ id }, {
      $set: { status: 'CONFIRMED', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    });
    return new Response(JSON.stringify(await col.findOne({ id })), { headers: { 'Content-Type': 'application/json' } });
  }

  // === ACTION: reject ===
  if (method === 'POST' && id && action === 'reject') {
    await col.updateOne({ id }, {
      $set: { status: 'REJECTED', reject_reason: body.reason || '', updated_at: new Date().toISOString() }
    });
    return new Response(JSON.stringify(await col.findOne({ id })), { headers: { 'Content-Type': 'application/json' } });
  }

  // === ACTION: convert-to-contract (admin) ===
  // body: { berth_id, notes? }
  // Occupa il posto barca selezionato e marca la prenotazione come CONTRACT
  if (method === 'POST' && id && action === 'convert-to-contract') {
    const b = await col.findOne({ id });
    if (!b) return new Response(JSON.stringify({ error: 'Prenotazione non trovata' }), { status: 404 });
    
    if (!body.berth_id) {
      return new Response(JSON.stringify({ error: 'berth_id richiesto per assegnare il posto barca' }), { status: 400 });
    }

    // Verifica posto disponibile e occupalo
    const berthsCol = db.collection('berths');
    const berth = await berthsCol.findOne({ id: body.berth_id });
    if (!berth) return new Response(JSON.stringify({ error: 'Posto barca non trovato' }), { status: 404 });

    // Calcola stato corrente
    const today = new Date(); today.setHours(0,0,0,0);
    const occ = berth.current_occupation;
    let isOccupied = false;
    if (occ && occ.end_date) {
      const endD = new Date(occ.end_date); endD.setHours(0,0,0,0);
      if (endD >= today) isOccupied = true;
    }
    if (isOccupied && !body.force) {
      return new Response(JSON.stringify({
        error: `Posto ${berth.label} già occupato fino al ${occ.end_date}`,
        current: occ,
      }), { status: 409 });
    }

    // Crea occupazione
    const { v4: uuidv4_ } = await import('uuid');
    const occupation = {
      id: uuidv4_(),
      booking_id: b.id,
      booking_number: b.booking_number,
      customer: { ...b.customer },
      boat: { ...b.boat },
      start_date: b.start_date,
      end_date: b.end_date,
      total_amount: b.grand_total,
      tariff_applied: { type: b.tariff_type, label: b.tariff_label, total: b.mooring_amount },
      payment_status: b.balance_paid ? 'PAGATO' : (b.deposit_paid ? 'PAGATO_PARZIALE' : 'DA_PAGARE'),
      payment_amount: (b.deposit_paid ? b.deposit_amount : 0) + (b.balance_paid ? b.balance_amount : 0),
      payment_method: b.deposit_payment_method || '',
      payment_date: b.deposit_payment_date || null,
      notes: body.notes || `Da prenotazione ${b.booking_number}`,
      created_at: new Date().toISOString(),
      created_by: 'contract',
    };

    const history = berth.occupation_history || [];
    if (berth.current_occupation) history.push(berth.current_occupation);
    await berthsCol.updateOne(
      { id: body.berth_id },
      { $set: { current_occupation: occupation, occupation_history: history, updated_at: new Date().toISOString() } }
    );

    // Marca booking come CONTRACT
    await col.updateOne({ id }, {
      $set: {
        status: 'CONTRACT',
        berth_id: body.berth_id,
        berth_label: berth.label,
        contract_occupation_id: occupation.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    });

    const updated = await col.findOne({ id });
    return new Response(JSON.stringify({
      ok: true, booking: updated, berth_id: body.berth_id, berth_label: berth.label,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // === UPDATE generico ===
  if (method === 'PUT' && id) {
    const update = { ...body, updated_at: new Date().toISOString() };
    delete update.id; delete update._id; delete update.booking_number; delete update.year; delete update.progressive;
    
    // Se cambia grand_total/deposit_pct, ricalcola
    if (update.grand_total !== undefined || update.deposit_pct !== undefined) {
      const existing = await col.findOne({ id });
      if (existing) {
        const gt = Number(update.grand_total ?? existing.grand_total);
        const pct = Number(update.deposit_pct ?? existing.deposit_pct);
        update.deposit_amount = Math.round(gt * pct / 100 * 100) / 100;
        update.balance_amount = Math.round((gt - update.deposit_amount) * 100) / 100;
      }
    }
    
    await col.updateOne({ id }, { $set: update });
    return new Response(JSON.stringify(await col.findOne({ id })), { headers: { 'Content-Type': 'application/json' } });
  }

  // === DELETE ===
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
