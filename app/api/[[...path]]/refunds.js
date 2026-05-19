// API handler per la procedura di Rimborso prenotazioni.
// Endpoints:
//   POST /api/refunds/send-request  - invia email con richiesta IBAN per le bookings selezionate
//   PUT  /api/refunds/{booking_id}  - aggiorna stato rimborso (set IBAN, complete, attach receipt)

import { NextResponse } from 'next/server';

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (d, s = 200) => NextResponse.json(d, { status: s, headers: cors });

const fmtEur = (n) => `${Number(n || 0).toFixed(2)} €`;
const fmtDateIT = (iso) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('it-IT'); } catch { return iso; } };

function buildRefundEmailHtml({ booking, company, experience }) {
  const customerName = booking.customer_name || 'Gentile Cliente';
  const ref = booking.booking_ref || booking.id;
  const expName = experience?.name || booking.experience_name || 'Prenotazione';
  const slotDate = fmtDateIT(booking.slot_datetime);
  const amount = fmtEur(booking.total_amount);
  const compName = company?.name || 'Maretrek';
  return `
  <!DOCTYPE html>
  <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1e3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin:0;">Richiesta IBAN per Rimborso</h2>
    </div>
    <div style="background:#f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
      <p>${customerName},</p>
      <p>Ti scriviamo in merito alla tua prenotazione con <strong>${compName}</strong> per la quale e\u0300 stato avviato il processo di rimborso.</p>

      <div style="background:white; padding:15px; border:1px solid #e2e8f0; border-radius:6px; margin: 15px 0;">
        <h3 style="margin-top:0; color:#1e40af; font-size:14px;">Dettagli del Voucher / Prenotazione</h3>
        <table style="width:100%; font-size:13px;">
          <tr><td style="padding:4px 0; color:#64748b;">Riferimento:</td><td style="text-align:right;"><strong>${ref}</strong></td></tr>
          <tr><td style="padding:4px 0; color:#64748b;">Esperienza:</td><td style="text-align:right;">${expName}</td></tr>
          <tr><td style="padding:4px 0; color:#64748b;">Data:</td><td style="text-align:right;">${slotDate}</td></tr>
          <tr><td style="padding:4px 0; color:#64748b;">Partecipanti:</td><td style="text-align:right;">${booking.seats || 1}</td></tr>
          <tr><td style="padding:4px 0; color:#64748b;">Importo pagato:</td><td style="text-align:right;"><strong>${amount}</strong></td></tr>
        </table>
      </div>

      <div style="background:#fef3c7; padding:15px; border-left:4px solid #f59e0b; border-radius:4px; margin: 15px 0;">
        <p style="margin:0; font-size:14px;">
          <strong>Si prega di fornire il codice IBAN per l'accredito delle somme pagate, al netto degli oneri di transazione e provvigioni rete di vendita.</strong>
        </p>
        <p style="margin:8px 0 0; font-size:13px;">
          Il rimborso verra\u0300 eseguito <strong>entro 15 giorni</strong> dalla ricezione dei dati bancari.
        </p>
      </div>

      <p style="font-size:13px;">Risponda a questa email indicando:</p>
      <ul style="font-size:13px;">
        <li>Nome e cognome dell'intestatario del conto</li>
        <li>Codice IBAN (27 caratteri)</li>
        <li>Eventuale BIC/SWIFT (per conti esteri)</li>
      </ul>

      <p style="font-size:12px; color:#64748b; margin-top:30px;">
        Per qualsiasi domanda non esiti a contattarci.<br>
        ${compName}
      </p>
    </div>
  </body></html>`;
}

export async function handleRefundSendRequest(method, body, db) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  const bookingIds = body.booking_ids || [];
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return json({ error: 'booking_ids array required' }, 400);
  }

  const results = [];
  for (const bid of bookingIds) {
    const booking = await db.collection('bookings').findOne({ id: bid });
    if (!booking) { results.push({ id: bid, ok: false, error: 'not_found' }); continue; }
    if (!booking.customer_email) { results.push({ id: bid, ok: false, error: 'no_email' }); continue; }

    const company = booking.company_id ? await db.collection('companies').findOne({ id: booking.company_id }) : null;
    const experience = booking.experience_id ? await db.collection('experiences').findOne({ id: booking.experience_id }) : null;
    const html = buildRefundEmailHtml({ booking, company, experience });

    // Invio email tramite Resend (chiave su company.resend_api_key o env)
    const apiKey = company?.resend_api_key || process.env.RESEND_API_KEY;
    const fromEmail = company?.resend_from_email || process.env.RESEND_FROM_EMAIL || 'noreply@maretrek.app';
    if (!apiKey) {
      results.push({ id: bid, ok: false, error: 'no_resend_key' });
      continue;
    }

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${company?.name || 'Maretrek'} <${fromEmail}>`,
          to: booking.customer_email,
          subject: `Richiesta IBAN per rimborso - Prenotazione ${booking.booking_ref || bid}`,
          html,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        results.push({ id: bid, ok: false, error: data?.message || 'resend_error' });
        continue;
      }
      // Aggiorna booking con stato refund_status REQUESTED
      await db.collection('bookings').updateOne(
        { id: bid },
        {
          $set: {
            refund_status: 'REQUESTED',
            refund_requested_at: new Date().toISOString(),
            refund_email_id: data.id || null,
            refund_amount: booking.total_amount || 0,
          },
        }
      );
      results.push({ id: bid, ok: true, email_id: data.id });
    } catch (e) {
      results.push({ id: bid, ok: false, error: e.message });
    }
  }

  return json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}

// PUT /api/refunds/{booking_id} - aggiorna stato/IBAN/dati bonifico
export async function handleRefundUpdate(method, id, body, db) {
  if (method !== 'PUT') return json({ error: 'Use PUT' }, 405);
  if (!id) return json({ error: 'booking_id required' }, 400);
  const booking = await db.collection('bookings').findOne({ id });
  if (!booking) return json({ error: 'Booking non trovato' }, 404);

  const updates = {};
  const now = new Date().toISOString();
  // Set IBAN (transizione a IBAN_RECEIVED)
  if (body.refund_iban) {
    updates.refund_iban = body.refund_iban.trim().replace(/\s+/g, '').toUpperCase();
    updates.refund_iban_holder = body.refund_iban_holder || booking.customer_name || '';
    updates.refund_iban_bic = body.refund_iban_bic || '';
    updates.refund_iban_received_at = now;
    if (booking.refund_status !== 'COMPLETED') updates.refund_status = 'IBAN_RECEIVED';
  }
  // Note manuali
  if (body.refund_notes !== undefined) updates.refund_notes = body.refund_notes;
  // Importo modificabile (rimborso parziale)
  if (body.refund_amount !== undefined) updates.refund_amount = Number(body.refund_amount) || 0;

  // Completa rimborso (transizione a COMPLETED)
  if (body.complete) {
    updates.refund_status = 'COMPLETED';
    updates.refund_completed_at = now;
    updates.refund_transfer_reference = body.refund_transfer_reference || '';
    updates.refund_transfer_date = body.refund_transfer_date || now.slice(0, 10);
    updates.refund_transfer_receipt_url = body.refund_transfer_receipt_url || '';
    updates.payment_status = 'REFUNDED';
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'Nessun campo da aggiornare' }, 400);
  }
  await db.collection('bookings').updateOne({ id }, { $set: updates });
  const updated = await db.collection('bookings').findOne({ id });
  return json(updated);
}
