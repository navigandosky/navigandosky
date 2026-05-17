// ==================== TRANSPORT LOGS (Skipper Daily Checkin) ====================
// Modulo per la gestione dei log giornalieri di trasporto da parte degli skipper.
// Ogni log e' identificato da (resource_id, date) e contiene la lista delle
// prenotazioni della giornata + check-in passeggeri + dati skipper.

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

// Helper: estrae YYYY-MM-DD da un datetime ISO
function toDateString(dt) {
  if (!dt) return null;
  try {
    return new Date(dt).toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
}

// ==================== SKIPPER: Bookings del giorno per skipper ====================
// GET /api/skipper-bookings?skipper_id=X&date=YYYY-MM-DD
// Ritorna tutte le prenotazioni del giorno per le risorse assegnate
// allo skipper OPPURE che hanno assigned_skipper_id = X
export async function handleSkipperBookings(method, body, sp, db) {
  if (method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const skipperId = sp.get('skipper_id');
  const date = sp.get('date') || new Date().toISOString().slice(0, 10);

  if (!skipperId) {
    return json({ error: 'skipper_id richiesto' }, 400);
  }

  // Recupera lo skipper
  const skipper = await db.collection('users').findOne({ id: skipperId, role: 'SKIPPER' });
  if (!skipper) {
    return json({ error: 'Skipper non trovato' }, 404);
  }

  const assignedResources = skipper.assigned_resource_ids || [];

  // Carica le risorse assegnate (per arricchire output)
  const resources = await db.collection('resources').find({
    id: { $in: assignedResources }
  }).toArray();

  // Filtra slot del giorno per le risorse assegnate
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  // Trova bookings con slot_datetime nel giorno
  const allBookings = await db.collection('bookings').find({
    slot_datetime: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['CANCELLED'] },
    company_id: skipper.company_id || null,
  }).sort({ slot_datetime: 1 }).toArray();

  // Filtra: bookings che hanno risorse assegnate allo skipper OR assigned_skipper_id matching
  const filtered = [];
  for (const booking of allBookings) {
    if (booking.assigned_skipper_id === skipperId) {
      filtered.push(booking);
      continue;
    }
    // Controlla se almeno una risorsa dello slot e' nelle assigned_resources
    const slot = await db.collection('slots').findOne({ id: booking.slot_id });
    if (slot && slot.resource_ids) {
      const overlap = slot.resource_ids.some((rid) => assignedResources.includes(rid));
      if (overlap) {
        // Aggiungi info risorsa
        booking._slot_resource_ids = slot.resource_ids;
        filtered.push(booking);
      }
    }
  }

  // Raggruppa per risorsa primaria (prima risorsa BOAT)
  const groupedByResource = {};
  for (const b of filtered) {
    const slot = await db.collection('slots').findOne({ id: b.slot_id });
    const resourceIds = slot?.resource_ids || [];
    // Trova la prima risorsa BOAT (prioritaria) oppure la prima qualsiasi
    let primaryResource = null;
    for (const rid of resourceIds) {
      const r = resources.find((x) => x.id === rid);
      if (r && (r.type === 'BOAT' || r.type === 'CAR')) {
        primaryResource = r;
        break;
      }
    }
    if (!primaryResource && resourceIds.length > 0) {
      primaryResource = resources.find((x) => x.id === resourceIds[0]) || null;
    }
    if (!primaryResource) continue;

    if (!groupedByResource[primaryResource.id]) {
      groupedByResource[primaryResource.id] = {
        resource: primaryResource,
        bookings: [],
      };
    }
    groupedByResource[primaryResource.id].bookings.push(b);
  }

  return json({
    skipper: { id: skipper.id, full_name: skipper.full_name || skipper.username, email: skipper.email, phone: skipper.phone },
    date,
    groups: Object.values(groupedByResource),
    total_bookings: filtered.length,
  });
}

// ==================== TRANSPORT LOGS CRUD ====================
// GET /api/transport-logs?resource_id=X&date=YYYY-MM-DD -> singolo log
// GET /api/transport-logs?resource_id=X -> tutti i log della risorsa
// GET /api/transport-logs?company_id=X&from=Y&to=Z -> filtraggio range
// GET /api/transport-logs/{id} -> dettaglio
// POST /api/transport-logs -> crea/aggiorna log (upsert per resource_id+date)
// PUT /api/transport-logs/{id} -> aggiorna stato (CLOSED)
// DELETE /api/transport-logs/{id} -> elimina
export async function handleTransportLogs(method, id, body, action, sp, db) {
  const col = db.collection('transport_logs');

  // GET singolo per id
  if (method === 'GET' && id) {
    const log = await col.findOne({ id });
    if (!log) return json({ error: 'Log non trovato' }, 404);
    return json(log);
  }

  // GET con filtri
  if (method === 'GET' && !id) {
    const filter = {};
    const resourceId = sp.get('resource_id');
    const date = sp.get('date');
    const companyId = sp.get('company_id');
    const from = sp.get('from');
    const to = sp.get('to');
    const skipperId = sp.get('skipper_id');

    if (resourceId) filter.resource_id = resourceId;
    if (date) filter.date = date;
    if (companyId) filter.company_id = companyId;
    if (skipperId) filter.skipper_id = skipperId;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const logs = await col.find(filter).sort({ date: -1, generated_at: -1 }).toArray();
    return json(logs);
  }

  // POST -> crea o aggiorna (upsert per resource_id+date)
  if (method === 'POST') {
    const resourceId = body.resource_id;
    const date = body.date;
    if (!resourceId || !date) {
      return json({ error: 'resource_id e date sono obbligatori' }, 400);
    }

    const existing = await col.findOne({ resource_id: resourceId, date });

    const data = {
      resource_id: resourceId,
      resource_name: body.resource_name || '',
      resource_imei: body.resource_imei || '',
      skipper_id: body.skipper_id || null,
      skipper_name: body.skipper_name || '',
      skipper_phone: body.skipper_phone || '',
      company_id: body.company_id || null,
      date,
      bookings_snapshot: body.bookings_snapshot || [],
      total_passengers: Number(body.total_passengers) || 0,
      total_bookings: Number(body.total_bookings) || 0,
      notes: body.notes || '',
      status: body.status || 'OPEN',
      pdf_data: body.pdf_data || null, // Base64 PDF data
      generated_at: new Date().toISOString(),
    };

    if (existing) {
      await col.updateOne({ id: existing.id }, { $set: data });
      const updated = await col.findOne({ id: existing.id });
      return json(updated);
    } else {
      const newLog = { id: uuidv4(), ...data, created_at: new Date().toISOString() };
      await col.insertOne(newLog);
      return json(newLog, 201);
    }
  }

  // PUT -> aggiorna
  if (method === 'PUT' && id) {
    const updates = { ...body };
    delete updates.id;
    delete updates._id;
    delete updates.created_at;
    updates.updated_at = new Date().toISOString();
    await col.updateOne({ id }, { $set: updates });
    const updated = await col.findOne({ id });
    return json(updated);
  }

  // DELETE
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
