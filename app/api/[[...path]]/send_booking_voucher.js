// Email voucher esperienze
// - Voucher PROVVISORIO: inviato quando la prenotazione viene creata con BONIFICO (in attesa)
// - Voucher FINALE: inviato quando l'admin conferma il pagamento del bonifico
import { MongoClient } from 'mongodb';

let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

const fmtEur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '-';

// Risolve URL Google Maps: priorità a meeting_point_map_url, fallback a ricerca su meeting_point
const resolveMapsUrl = (exp) => {
  if (!exp) return null;
  if (exp.meeting_point_map_url) return exp.meeting_point_map_url;
  if (exp.meeting_point) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exp.meeting_point)}`;
  return null;
};

async function sendViaResend({ from, to, subject, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata');
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (result.error) throw new Error(`Resend: ${result.error.message || JSON.stringify(result.error)}`);
  return { ok: true, message_id: result.data?.id, provider: 'resend' };
}

// Template HTML voucher provvisorio (bonifico in attesa)
function buildProvisionalVoucherHtml({ booking, experience, company, bankTransfer }) {
  const baseColor = '#0066cc';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voucher Provvisorio</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;">
<div style="max-width:600px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:28px 24px;text-align:center;">
    <div style="font-size:34px;margin-bottom:8px;">⏳</div>
    <h1 style="margin:0;font-size:22px;">Voucher Provvisorio</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:.92;">In attesa di verifica del bonifico</p>
  </div>
  <div style="padding:24px;">
    <p style="font-size:15px;color:#1f2937;">Gentile <strong>${booking.customer_name}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      grazie per la tua prenotazione. Riceverai il <strong>voucher definitivo</strong> non appena lo staff di <strong>${company?.name || 'MARETREK'}</strong> avrà verificato l'accredito del bonifico (entro 24h).
    </p>

    <div style="border:2px dashed ${baseColor};border-radius:10px;padding:16px;margin:20px 0;background:#f0f7ff;">
      <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Codice Prenotazione</p>
      <p style="margin:0;font-family:Courier,monospace;font-size:22px;font-weight:700;color:${baseColor};">${booking.booking_ref}</p>
    </div>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#1f2937;">📅 Dettagli Esperienza</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Esperienza:</td><td style="padding:6px 0;"><strong>${experience?.name || booking.experience_name || '-'}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Data e ora:</td><td style="padding:6px 0;"><strong style="text-transform:capitalize;">${fmtDateTime(booking.slot_datetime)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Partecipanti:</td><td style="padding:6px 0;"><strong>${booking.seats}</strong></td></tr>
      ${experience?.meeting_point ? `<tr><td style="padding:6px 0;color:#6b7280;">Punto di ritrovo:</td><td style="padding:6px 0;"><strong>📍 ${experience.meeting_point}</strong>${resolveMapsUrl(experience) ? `<br><a href="${resolveMapsUrl(experience)}" target="_blank" style="display:inline-block;margin-top:6px;padding:8px 14px;background:#4285F4;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">🗺️ Apri in Google Maps</a>` : ''}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#6b7280;">Totale:</td><td style="padding:6px 0;"><strong style="color:${baseColor};font-size:16px;">${fmtEur(booking.total_amount)}</strong></td></tr>
    </table>

    ${bankTransfer ? `
    <div style="background:#ecfdf5;border:2px solid #10b981;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#065f46;">🏦 Coordinate Bonifico</h3>
      <table style="width:100%;font-size:13px;color:#1f2937;">
        <tr><td style="padding:4px 0;color:#065f46;width:130px;">IBAN:</td><td style="padding:4px 0;"><strong style="font-family:Courier,monospace;letter-spacing:1px;">${bankTransfer.iban}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#065f46;">Intestatario:</td><td style="padding:4px 0;"><strong>${bankTransfer.account_holder}</strong></td></tr>
        ${bankTransfer.bank_name ? `<tr><td style="padding:4px 0;color:#065f46;">Banca:</td><td style="padding:4px 0;">${bankTransfer.bank_name}</td></tr>` : ''}
        ${bankTransfer.bic_swift ? `<tr><td style="padding:4px 0;color:#065f46;">BIC/SWIFT:</td><td style="padding:4px 0;font-family:Courier,monospace;">${bankTransfer.bic_swift}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#065f46;">Importo:</td><td style="padding:4px 0;"><strong style="color:#059669;font-size:16px;">${fmtEur(booking.total_amount)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#065f46;">Causale:</td><td style="padding:4px 0;font-family:Courier,monospace;font-size:12px;">Prenotazione ${booking.booking_ref}</td></tr>
      </table>
    </div>` : ''}

    <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:20px 0;font-size:13px;color:#92400e;">
      ⚠️ <strong>Importante:</strong> Questo voucher è <strong>provvisorio</strong> e sarà confermato dopo la verifica del bonifico. Conservalo e attendi l'email di conferma definitiva.
    </div>

    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-top:24px;">
      Per qualsiasi domanda, rispondi a questa email o contatta direttamente <strong>${company?.name || 'MARETREK'}</strong>.
    </p>
  </div>
  <div style="background:#1f2937;color:#9ca3af;padding:16px;text-align:center;font-size:11px;">
    ${company?.name || 'MARETREK'} • ${company?.email || ''}
  </div>
</div></body></html>`;
}

// Template HTML voucher finale (pagamento confermato)
function buildFinalVoucherHtml({ booking, experience, company }) {
  const baseColor = '#10b981';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voucher Confermato</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;">
<div style="max-width:600px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:28px 24px;text-align:center;">
    <div style="font-size:34px;margin-bottom:8px;">✅</div>
    <h1 style="margin:0;font-size:24px;">Voucher Confermato</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:.92;">Pagamento ricevuto - Prenotazione confermata</p>
  </div>
  <div style="padding:24px;">
    <p style="font-size:15px;color:#1f2937;">Gentile <strong>${booking.customer_name}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      ottime notizie! Il tuo pagamento è stato <strong>verificato e confermato</strong>. Ti aspettiamo per la tua esperienza!
    </p>

    <div style="border:2px solid ${baseColor};border-radius:10px;padding:20px;margin:20px 0;background:#f0fdf4;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;color:#065f46;text-transform:uppercase;letter-spacing:.5px;">Codice Voucher</p>
      <p style="margin:0;font-family:Courier,monospace;font-size:28px;font-weight:700;color:${baseColor};letter-spacing:2px;">${booking.booking_ref}</p>
      <p style="margin:8px 0 0;font-size:11px;color:#065f46;">Presenta questo codice al check-in</p>
    </div>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#1f2937;">📅 Dettagli Esperienza</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Esperienza:</td><td style="padding:6px 0;"><strong>${experience?.name || booking.experience_name || '-'}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Data e ora:</td><td style="padding:6px 0;"><strong style="text-transform:capitalize;">${fmtDateTime(booking.slot_datetime)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Partecipanti:</td><td style="padding:6px 0;"><strong>${booking.seats}</strong></td></tr>
      ${experience?.meeting_point ? `<tr><td style="padding:6px 0;color:#6b7280;">Punto di ritrovo:</td><td style="padding:6px 0;"><strong>📍 ${experience.meeting_point}</strong>${resolveMapsUrl(experience) ? `<br><a href="${resolveMapsUrl(experience)}" target="_blank" style="display:inline-block;margin-top:6px;padding:8px 14px;background:#4285F4;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">🗺️ Apri in Google Maps</a>` : ''}</td></tr>` : ''}
      ${experience?.duration_minutes ? `<tr><td style="padding:6px 0;color:#6b7280;">Durata:</td><td style="padding:6px 0;">${Math.floor(experience.duration_minutes / 60)}h ${experience.duration_minutes % 60}min</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#6b7280;">Totale Pagato:</td><td style="padding:6px 0;"><strong style="color:${baseColor};font-size:16px;">${fmtEur(booking.total_amount)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Stato:</td><td style="padding:6px 0;"><span style="background:#dcfce7;color:#065f46;padding:3px 10px;border-radius:12px;font-weight:600;font-size:12px;">✅ PAGATO</span>${(() => {
        const PAY_LABELS = { SUMUP:'SumUp', STRIPE:'Stripe', POS:'POS / Carta', CASH:'Contanti', BANK_TRANSFER:'Bonifico Bancario', BONIFICO:'Bonifico Bancario', PAYPAL:'PayPal', SATISPAY:'Satispay', INVOICE:'Fattura Differita', OTHER:'Altro' };
        const pm = booking.payment_method;
        const lbl = pm ? (PAY_LABELS[pm] || pm) : null;
        return lbl ? ` <span style="color:#6b7280;font-size:12px;">·</span> <span style="color:#374151;font-size:12px;">Metodo: <strong>${lbl}</strong></span>` : '';
      })()}</td></tr>
    </table>

    <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:14px;margin:20px 0;font-size:13px;color:#1e40af;">
      💡 <strong>Promemoria:</strong> Presentati al punto di ritrovo almeno 15 minuti prima dell'orario indicato. Porta con te questo voucher (stampato o sul telefono).
    </div>

    ${booking.special_requests ? `
    <div style="background:#f9fafb;border-left:3px solid #6366f1;padding:12px;margin:16px 0;font-size:13px;color:#374151;">
      <strong>📝 Note:</strong> ${booking.special_requests}
    </div>` : ''}

    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-top:24px;">
      Per modifiche, cancellazioni o domande, contatta direttamente <strong>${company?.name || 'MARETREK'}</strong>${company?.email ? ` (${company.email})` : ''}.
    </p>
  </div>
  <div style="background:#1f2937;color:#9ca3af;padding:16px;text-align:center;font-size:11px;">
    ${company?.name || 'MARETREK'} • Grazie per aver scelto i nostri servizi!
  </div>
</div></body></html>`;
}

// API handler unificato: POST /api/send-booking-voucher
// body: { booking_id, type: 'PROVISIONAL' | 'FINAL', from? }
export async function handleSendBookingVoucher(method, body) {
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { booking_id, type = 'PROVISIONAL', from } = body || {};
    if (!booking_id) return new Response(JSON.stringify({ error: 'booking_id required' }), { status: 400 });

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ id: booking_id });
    if (!booking) return new Response(JSON.stringify({ error: 'Booking non trovato' }), { status: 404 });

    if (!booking.customer_email) {
      return new Response(JSON.stringify({ error: 'Cliente senza email' }), { status: 400 });
    }

    const experience = await db.collection('experiences').findOne({ id: booking.experience_id });
    const company = booking.company_id ? await db.collection('companies').findOne({ id: booking.company_id }) : null;

    // Per voucher provvisorio: includi coordinate bonifico
    let bankTransfer = null;
    if (type === 'PROVISIONAL' && booking.payment_method === 'BANK_TRANSFER') {
      const pc = company?.payment_config || {};
      if (pc.bank_transfer?.iban) {
        bankTransfer = {
          iban: pc.bank_transfer.iban,
          account_holder: pc.bank_transfer.account_holder || company?.name || '',
          bank_name: pc.bank_transfer.bank_name || '',
          bic_swift: pc.bank_transfer.bic_swift || '',
        };
      }
    }

    const html = type === 'FINAL'
      ? buildFinalVoucherHtml({ booking, experience, company })
      : buildProvisionalVoucherHtml({ booking, experience, company, bankTransfer });

    const subject = type === 'FINAL'
      ? `✅ Voucher Confermato - ${booking.booking_ref}`
      : `⏳ Voucher Provvisorio - ${booking.booking_ref}`;

    // Determina sender
    const senderFrom = from || process.env.RESEND_FROM || process.env.SMTP_USER || 'noreply@porticciolodibosamarina.com';
    const senderName = company?.name || 'MARETREK';
    const fromFinal = `${senderName} <${senderFrom}>`;

    // Invio (Resend primario)
    try {
      const result = await sendViaResend({
        from: fromFinal,
        to: booking.customer_email,
        subject,
        html,
      });
      // Marca sul booking
      await db.collection('bookings').updateOne(
        { id: booking_id },
        { $set: {
          [`voucher_email_${type.toLowerCase()}_sent_at`]: new Date().toISOString(),
          [`voucher_email_${type.toLowerCase()}_message_id`]: result.message_id || null,
        } }
      );
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('[send-booking-voucher] Resend fallito:', e.message);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('[send-booking-voucher] Error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Helper interno: invia voucher direttamente da altre route (silent fail)
export async function sendBookingVoucherInternal(bookingId, type) {
  try {
    await handleSendBookingVoucher('POST', { booking_id: bookingId, type });
  } catch (e) {
    console.error('[sendBookingVoucherInternal] error:', e.message);
  }
}
