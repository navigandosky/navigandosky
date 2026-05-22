/**
 * Super Admin Booking Reschedule
 * --------------------------------
 * POST /api/bookings/:id/reschedule
 *
 * body: {
 *   new_slot_datetime: "2026-07-30T08:20:00Z"   // ISO datetime of the new slot
 *   force?: false                               // se true, ignora il check di capacità (sovrappone)
 * }
 *
 * Restrizioni:
 *  - SOLO Super Admin (controllo lato chiamante via session, qui si fida del flag)
 *  - La prenotazione deve esistere e avere uno slot_id
 *  - Il nuovo slot, se non esiste, viene creato come clone dell'attuale (stessa risorsa/exp)
 *  - Aggiorna atomicamente booked_seats su entrambi gli slot
 *  - Aggiunge entry in history[]
 */
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

let _client = null;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db(process.env.DB_NAME);
}

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

function genId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : ('slot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
}

function isoToDate(iso) {
  try { return new Date(iso); } catch { return null; }
}

export async function handleBookingReschedule(method, bookingId, body) {
  if (method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: cors });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!bookingId) return json({ error: 'booking_id mancante' }, 400);

  const newDt = body?.new_slot_datetime;
  if (!newDt) return json({ error: 'new_slot_datetime richiesto (ISO 8601)' }, 400);
  const newDate = isoToDate(newDt);
  if (!newDate || isNaN(newDate.getTime())) {
    return json({ error: 'Formato new_slot_datetime non valido' }, 400);
  }

  const force = !!body?.force;
  const requestedBy = body?.requested_by || 'SUPER_ADMIN';

  const db = await getDb();

  // 1) Fetch booking
  const booking = await db.collection('bookings').findOne({ id: bookingId });
  if (!booking) return json({ error: 'Prenotazione non trovata' }, 404);

  if (!booking.slot_id) {
    return json({ error: 'La prenotazione non ha uno slot assegnato' }, 400);
  }
  if (booking.status === 'CANCELLED') {
    return json({ error: 'Impossibile riprogrammare una prenotazione cancellata' }, 400);
  }

  // 2) Old slot snapshot
  const oldSlot = await db.collection('slots').findOne({ id: booking.slot_id });
  if (!oldSlot) {
    return json({ error: 'Slot originale non trovato (orfano). Operazione abortita.' }, 409);
  }

  const seats = Number(booking.seats || 1);

  // 3) Calcola nuovo end_datetime preservando la durata dello slot originale
  let newEndDt;
  try {
    const oldStart = new Date(oldSlot.start_datetime);
    const oldEnd = new Date(oldSlot.end_datetime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    newEndDt = new Date(newDate.getTime() + durationMs).toISOString();
  } catch (_e) {
    // Fallback: 2 ore di default
    newEndDt = new Date(newDate.getTime() + 2 * 3600 * 1000).toISOString();
  }

  // 4) Cerca slot esistente: stessa experience + stessa risorsa + stesso start_datetime
  let targetSlot = await db.collection('slots').findOne({
    experience_id: oldSlot.experience_id,
    start_datetime: new Date(newDt).toISOString(),
    resource_ids: oldSlot.resource_ids,
  });

  let slotCreated = false;
  if (!targetSlot) {
    // Crea nuovo slot clone
    targetSlot = {
      id: genId(),
      experience_id: oldSlot.experience_id,
      resource_ids: oldSlot.resource_ids,
      start_datetime: new Date(newDt).toISOString(),
      end_datetime: newEndDt,
      max_seats: oldSlot.max_seats,
      booked_seats: 0,
      status: 'OPEN',
      price_override: oldSlot.price_override || null,
      notes: oldSlot.notes || '',
      company_id: oldSlot.company_id,
      created_at: new Date().toISOString(),
      created_by: 'reschedule:' + requestedBy,
    };
    await db.collection('slots').insertOne(targetSlot);
    slotCreated = true;
  }

  // 5) Check capacità
  const available = Number(targetSlot.max_seats || 0) - Number(targetSlot.booked_seats || 0);
  if (!force && available < seats) {
    return json({
      error: `Capacità insufficiente nel nuovo slot (disponibili: ${available}, richiesti: ${seats}). Imposta force=true per forzare l'overbooking.`,
      available,
      required: seats,
      target_slot_id: targetSlot.id,
      slot_created: slotCreated,
    }, 409);
  }

  // 6) Atomic update: decrement old, increment new, update booking
  // Nota: in mongo non abbiamo transactions sicure se non in replica set; eseguiamo in sequenza
  // con compensazione in caso di errore.
  let r1 = null, r2 = null, r3 = null;
  try {
    r1 = await db.collection('slots').updateOne(
      { id: oldSlot.id },
      { $inc: { booked_seats: -seats } }
    );

    r2 = await db.collection('slots').updateOne(
      { id: targetSlot.id },
      { $inc: { booked_seats: seats } }
    );

    const historyEntry = {
      ts: new Date().toISOString(),
      action: 'SLOT_RESCHEDULED',
      from_slot_id: oldSlot.id,
      to_slot_id: targetSlot.id,
      from_datetime: oldSlot.start_datetime,
      to_datetime: new Date(newDt).toISOString(),
      seats,
      forced: force,
      requested_by: requestedBy,
      note: body?.note || 'Riprogrammazione amministrativa Super Admin',
    };

    r3 = await db.collection('bookings').updateOne(
      { id: bookingId },
      {
        $set: {
          slot_id: targetSlot.id,
          slot_datetime: new Date(newDt).toISOString(),
          updated_at: new Date().toISOString(),
        },
        $push: { history: historyEntry },
      }
    );

    return json({
      ok: true,
      booking_id: bookingId,
      booking_ref: booking.booking_ref,
      old_slot_id: oldSlot.id,
      old_datetime: oldSlot.start_datetime,
      new_slot_id: targetSlot.id,
      new_datetime: new Date(newDt).toISOString(),
      slot_created: slotCreated,
      seats_moved: seats,
      forced: force,
      history_entry: historyEntry,
    });
  } catch (e) {
    console.error('[booking-reschedule] Error during atomic update:', e);
    // Tentativo di rollback
    try {
      if (r2 && r2.modifiedCount) {
        await db.collection('slots').updateOne({ id: targetSlot.id }, { $inc: { booked_seats: -seats } });
      }
      if (r1 && r1.modifiedCount) {
        await db.collection('slots').updateOne({ id: oldSlot.id }, { $inc: { booked_seats: seats } });
      }
    } catch (rollbackErr) {
      console.error('[booking-reschedule] Rollback failed:', rollbackErr);
    }
    return json({ error: 'Errore durante la riprogrammazione', details: String(e?.message || e) }, 500);
  }
}
