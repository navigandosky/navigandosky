/**
 * Marina Pending Cleanup Scheduler
 * --------------------------------
 * Controlla giornalmente le prenotazioni marina in stato PENDING/DEPOSIT_PAID
 * (non ancora convertite in CONTRACT) e marca per cancellazione quelle
 * che hanno superato la data di inizio di oltre 2 giorni.
 *
 * Azione: imposta `requires_cancellation_review=true` + timestamp.
 * NON cancella automaticamente: l'admin deve confermare manualmente.
 *
 * Quando una booking è marcata, il berth STANDBY rimane occupato (giallo)
 * finché l'admin non decide se cancellare o forzare contract.
 */

const SCHEDULER_CRON = process.env.MARINA_CLEANUP_CRON || '15 03 * * *'; // ogni giorno alle 03:15 (after backup)
const OVERDUE_DAYS = Number(process.env.MARINA_PENDING_OVERDUE_DAYS || 2);

const state = { scheduler: null, lastRun: null, lastResult: null };

async function _getDb() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  return { db: client.db(process.env.DB_NAME), client };
}

async function runCleanup(triggeredBy = 'cron') {
  console.log(`[marina-pending-cleanup] ▶ Avvio controllo (trigger=${triggeredBy})`);
  const started = new Date();
  let conn = null;
  try {
    conn = await _getDb();
    const db = conn.db;
    const col = db.collection('marina_bookings');

    // Calcola threshold: start_date + OVERDUE_DAYS < oggi
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    // Bookings in stato pre-contratto con start_date oltre la soglia
    const candidates = await col.find({
      status: { $in: ['PENDING', 'DEPOSIT_PAID', 'CONFIRMED'] },
      start_date: { $lt: cutoffIso },
      $or: [
        { requires_cancellation_review: { $exists: false } },
        { requires_cancellation_review: false },
      ],
    }).toArray();

    const updates = [];
    for (const b of candidates) {
      const update = {
        requires_cancellation_review: true,
        cancellation_review_at: new Date().toISOString(),
        cancellation_review_reason: `Nessun contratto entro ${OVERDUE_DAYS} giorni dalla data di inizio (${b.start_date}).`,
        updated_at: new Date().toISOString(),
      };
      await col.updateOne({ id: b.id }, { $set: update });
      updates.push({ booking_number: b.booking_number, start_date: b.start_date, status: b.status });
    }

    state.lastRun = started.toISOString();
    state.lastResult = {
      ok: true,
      checked: candidates.length,
      marked: updates.length,
      details: updates,
      cutoff_date: cutoffIso,
      overdue_days: OVERDUE_DAYS,
    };
    console.log(`[marina-pending-cleanup] ✅ ${updates.length} prenotazioni marcate per revisione cancellazione (cutoff ${cutoffIso})`);
    return state.lastResult;
  } catch (e) {
    console.error('[marina-pending-cleanup] ❌ Errore:', e);
    state.lastResult = { ok: false, error: e.message };
    return state.lastResult;
  } finally {
    try { conn?.client?.close?.(); } catch (_) {}
  }
}

function init() {
  if (state.scheduler) {
    console.log('[marina-pending-cleanup] Già inizializzato (singleton).');
    return;
  }
  try {
    const _require = eval('require');
    const cron = _require('node-cron');
    if (!cron.validate(SCHEDULER_CRON)) {
      console.error(`[marina-pending-cleanup] Cron expression non valida: ${SCHEDULER_CRON}`);
      return;
    }
    state.scheduler = cron.schedule(SCHEDULER_CRON, () => runCleanup('cron'), {
      scheduled: true,
      timezone: process.env.TZ || 'Europe/Rome',
    });
    console.log(`[marina-pending-cleanup] ✅ Cron "${SCHEDULER_CRON}" attivo (TZ ${process.env.TZ || 'Europe/Rome'}, overdue ${OVERDUE_DAYS}gg)`);
  } catch (e) {
    console.error('[marina-pending-cleanup] Errore init:', e.message);
  }
}

module.exports = { init, runCleanup, state };
