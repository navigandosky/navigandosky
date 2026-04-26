import { v4 as uuidv4 } from 'uuid';

// Calcola lo stato runtime di un berth basato sull'occupazione corrente.
// Returns: 'free' | 'occupied' | 'releasing'
function computeStatus(berth) {
  const occ = berth.current_occupation;
  if (!occ || !occ.start_date || !occ.end_date) return 'free';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(occ.start_date); start.setHours(0, 0, 0, 0);
  const end = new Date(occ.end_date); end.setHours(0, 0, 0, 0);
  if (today > end) return 'free'; // occupazione scaduta
  // active or future occupation - check end date
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 'releasing'; // libera entro 1 giorno (oggi o domani)
  return 'occupied'; // occupazione attiva o futura con fine > domani
}

export async function handleBerths(method, id, body, action, sp, db) {
  const col = db.collection('berths');
  const marinasCol = db.collection('marinas');

  // GET tutti (con filtri) - include status calcolato
  if (method === 'GET' && !id) {
    const filter = {};
    const marina_id = sp?.get?.('marina_id');
    const marina_slug = sp?.get?.('marina_slug');
    
    if (marina_slug && !marina_id) {
      const m = await marinasCol.findOne({ slug: marina_slug });
      if (m) filter.marina_id = m.id;
      else return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }
    if (marina_id) filter.marina_id = marina_id;
    
    const items = await col.find(filter).sort({ pontoon: 1, side: 1, position: 1 }).toArray();
    const enriched = items.map(b => ({ ...b, status: computeStatus(b) }));
    return new Response(JSON.stringify(enriched), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET singolo
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return new Response(JSON.stringify({ error: 'Berth not found' }), { status: 404 });
    return new Response(JSON.stringify({ ...item, status: computeStatus(item) }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  // POST - azioni speciali (occupy, release) o creazione
  if (method === 'POST' && id && action === 'occupy') {
    // body: { customer: {name, surname, email, phone}, boat: {name, registration, type, length, beam}, start_date, end_date, notes? }
    if (!body.customer?.name || !body.customer?.email) {
      return new Response(JSON.stringify({ error: 'Dati cliente mancanti (nome, email)' }), { status: 400 });
    }
    if (!body.start_date || !body.end_date) {
      return new Response(JSON.stringify({ error: 'Date occupazione mancanti' }), { status: 400 });
    }
    
    const berth = await col.findOne({ id });
    if (!berth) return new Response(JSON.stringify({ error: 'Posto non trovato' }), { status: 404 });
    
    // Verifica che non sia attualmente occupato
    const status = computeStatus(berth);
    if (status === 'occupied' || status === 'releasing') {
      return new Response(JSON.stringify({ 
        error: `Posto ${berth.label} attualmente occupato fino al ${berth.current_occupation.end_date}`,
        current: berth.current_occupation
      }), { status: 409 });
    }
    
    const occupation = {
      id: uuidv4(),
      customer: {
        name: body.customer.name,
        surname: body.customer.surname || '',
        email: body.customer.email,
        phone: body.customer.phone || '',
      },
      boat: {
        name: body.boat?.name || '',
        registration: body.boat?.registration || '',
        type: body.boat?.type || 'motor',
        length: Number(body.boat?.length) || 0,
        beam: Number(body.boat?.beam) || 0,
      },
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes || '',
      total_amount: Number(body.total_amount) || 0,
      created_at: new Date().toISOString(),
      created_by: body.created_by || 'public',
    };
    
    // Mantieni storico occupazioni
    const history = berth.occupation_history || [];
    if (berth.current_occupation) history.push(berth.current_occupation);
    
    await col.updateOne(
      { id }, 
      { $set: { current_occupation: occupation, occupation_history: history, updated_at: new Date().toISOString() } }
    );
    
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify({ ...updated, status: computeStatus(updated) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST' && id && action === 'release') {
    const berth = await col.findOne({ id });
    if (!berth) return new Response(JSON.stringify({ error: 'Posto non trovato' }), { status: 404 });
    const history = berth.occupation_history || [];
    if (berth.current_occupation) history.push({ ...berth.current_occupation, released_at: new Date().toISOString() });
    await col.updateOne(
      { id }, 
      { $set: { current_occupation: null, occupation_history: history, updated_at: new Date().toISOString() } }
    );
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST - seed automatico per una marina (3 pontili bifacciali)
  if (method === 'POST' && (action === 'seed-layout' || id === 'seed-layout')) {
    // body: { marina_id, pontoons: 3, berths_per_side: 20, pontoon_spacing_m: 20, pontoon_length_m: 100 }
    const { marina_id } = body;
    const pontoons = Number(body.pontoons) || 3;
    const berthsPerSide = Number(body.berths_per_side) || 20;
    
    if (!marina_id) return new Response(JSON.stringify({ error: 'marina_id richiesto' }), { status: 400 });
    
    // Cancella berths esistenti di questa marina
    await col.deleteMany({ marina_id });
    
    const created = [];
    for (let p = 1; p <= pontoons; p++) {
      for (const side of ['left', 'right']) {
        for (let pos = 1; pos <= berthsPerSide; pos++) {
          // Lunghezza variabile: i posti vicino alla testata sono più lunghi
          let length_max = 8;
          if (pos <= 5) length_max = 15;
          else if (pos <= 10) length_max = 12;
          else if (pos <= 15) length_max = 10;
          else length_max = 8;
          
          const berth = {
            id: uuidv4(),
            marina_id,
            pontoon: p,
            side,
            position: pos,
            label: `P${p}-${side === 'left' ? 'SX' : 'DX'}-${String(pos).padStart(2, '0')}`,
            length_max,
            beam_max: length_max * 0.4, // proporzione tipica
            current_occupation: null,
            occupation_history: [],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          created.push(berth);
        }
      }
    }
    
    if (created.length > 0) await col.insertMany(created);
    return new Response(JSON.stringify({ success: true, count: created.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST - crea singolo berth
  if (method === 'POST' && !id) {
    const item = {
      id: uuidv4(),
      marina_id: body.marina_id,
      pontoon: Number(body.pontoon) || 1,
      side: body.side || 'left',
      position: Number(body.position) || 1,
      label: body.label || `P${body.pontoon}-${body.side}-${body.position}`,
      length_max: Number(body.length_max) || 8,
      beam_max: Number(body.beam_max) || 3,
      current_occupation: null,
      occupation_history: [],
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
