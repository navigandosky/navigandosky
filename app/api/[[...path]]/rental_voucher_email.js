// Email di conferma prenotazione Locazioni Brevi (rental_bookings)
// - Inviata automaticamente sia per richieste pubbliche (PENDING) sia per prenotazioni admin (CONFIRMED)
// - Resend con fallback SMTP (Aruba)

const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '-');

const CATEGORY_LABEL = {
  BIKE: 'Bici',
  CAR: 'Auto',
  APARTMENT: 'Appartamento',
  VILLA: 'Villa',
  BOAT: 'Barca',
};

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildHtml({ booking, unit, company }) {
  const isPending = booking.status === 'PENDING';
  const headerBg = isPending ? '#f59e0b' : '#0d9488';
  const headerLabel = isPending ? 'Richiesta Ricevuta' : 'Prenotazione Confermata';
  const headerSubtitle = isPending
    ? 'La tua richiesta è in attesa di conferma da parte dello staff'
    : 'La tua prenotazione è stata confermata';
  const durationUnit = booking.duration_unit === 'NIGHTS' ? 'notti' : 'giorni';

  const seasonsRows = (booking.pricing_breakdown || []).map(p => `
    <tr>
      <td style="padding:4px 0;">${escapeHtml(p.name)}</td>
      <td style="padding:4px 0;text-align:center;">${p.days}</td>
      <td style="padding:4px 0;text-align:right;">${fmtEur(p.price_per_unit)}</td>
      <td style="padding:4px 0;text-align:right;"><strong>${fmtEur(p.subtotal)}</strong></td>
    </tr>
  `).join('');

  const mapsUrl = unit?.address || unit?.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.address || unit.location)}`
    : null;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${headerLabel}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;">
<div style="max-width:620px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,${headerBg},${isPending ? '#d97706' : '#0f766e'});color:white;padding:28px 24px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px;">🏖️</div>
    <h1 style="margin:0;font-size:22px;">${headerLabel}</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:.92;">${headerSubtitle}</p>
  </div>

  <div style="padding:24px;">
    <p style="font-size:15px;color:#1f2937;">Gentile <strong>${escapeHtml(booking.customer?.name || '')}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      ${isPending
        ? `abbiamo ricevuto la tua richiesta di prenotazione per <strong>${escapeHtml(booking.unit_name)}</strong>. Riceverai a breve un'ulteriore conferma dallo staff di <strong>${escapeHtml(company?.name || 'Maretrek')}</strong>.`
        : `la tua prenotazione per <strong>${escapeHtml(booking.unit_name)}</strong> è stata <strong>confermata</strong>. Conserva questa email come riferimento.`}
    </p>

    <div style="border:2px dashed ${headerBg};border-radius:10px;padding:16px;margin:20px 0;background:#fff7ed;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Codice Prenotazione</p>
      <p style="margin:0;font-family:Courier,monospace;font-size:22px;font-weight:700;color:${headerBg};">${escapeHtml(booking.booking_number)}</p>
    </div>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#1f2937;">📅 Dettagli Soggiorno</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
      <tr><td style="padding:5px 0;color:#6b7280;width:150px;">Categoria:</td><td style="padding:5px 0;"><strong>${CATEGORY_LABEL[booking.category] || booking.category}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#6b7280;">Unità:</td><td style="padding:5px 0;"><strong>${escapeHtml(booking.unit_name)}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#6b7280;">Check-in:</td><td style="padding:5px 0;"><strong style="text-transform:capitalize;">${fmtDate(booking.start_date)}</strong> alle <strong>${booking.check_in_time || '—'}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#6b7280;">Check-out:</td><td style="padding:5px 0;"><strong style="text-transform:capitalize;">${fmtDate(booking.end_date)}</strong> alle <strong>${booking.check_out_time || '—'}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#6b7280;">Durata:</td><td style="padding:5px 0;"><strong>${booking.duration_value} ${durationUnit}</strong></td></tr>
      ${booking.quantity > 1 ? `<tr><td style="padding:5px 0;color:#6b7280;">Quantità:</td><td style="padding:5px 0;"><strong>${booking.quantity}</strong></td></tr>` : ''}
      ${booking.guests_count ? `<tr><td style="padding:5px 0;color:#6b7280;">Ospiti:</td><td style="padding:5px 0;"><strong>${booking.guests_count}</strong></td></tr>` : ''}
      ${unit?.location ? `<tr><td style="padding:5px 0;color:#6b7280;">Località:</td><td style="padding:5px 0;"><strong>📍 ${escapeHtml(unit.location)}</strong>${mapsUrl ? `<br><a href="${mapsUrl}" style="display:inline-block;margin-top:6px;padding:6px 12px;background:#4285F4;color:white;text-decoration:none;border-radius:6px;font-size:12px;">🗺️ Google Maps</a>` : ''}</td></tr>` : ''}
    </table>

    ${seasonsRows ? `
    <h3 style="margin:24px 0 8px;font-size:15px;color:#1f2937;">💰 Dettaglio Tariffe</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;background:#f9fafb;border-radius:8px;padding:6px;">
      <thead><tr style="border-bottom:1px solid #e5e7eb;">
        <th style="padding:6px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Stagione</th>
        <th style="padding:6px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">${durationUnit}</th>
        <th style="padding:6px;text-align:right;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Prezzo</th>
        <th style="padding:6px;text-align:right;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Subtotale</th>
      </tr></thead>
      <tbody>${seasonsRows}</tbody>
    </table>
    ` : ''}

    <div style="background:#f0fdfa;border:2px solid ${headerBg};border-radius:10px;padding:16px;margin:20px 0;">
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:4px 0;color:#0f766e;">Importo totale:</td><td style="padding:4px 0;text-align:right;"><strong style="color:${headerBg};font-size:18px;">${fmtEur(booking.total_amount)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Acconto richiesto (${booking.deposit_pct || 0}%):</td><td style="padding:4px 0;text-align:right;color:#2563eb;"><strong>${fmtEur(booking.deposit_amount)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Saldo:</td><td style="padding:4px 0;text-align:right;"><strong>${fmtEur(booking.balance_amount)}</strong></td></tr>
      </table>
    </div>

    ${isPending ? `
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 14px;margin:20px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#78350f;">
        <strong>⏳ Prossimi passi:</strong> Il nostro staff verificherà la disponibilità e ti contatterà entro 24h per finalizzare la prenotazione e inviare il link di pagamento.
      </p>
    </div>
    ` : `
    <div style="background:#d1fae5;border-left:4px solid #10b981;padding:12px 14px;margin:20px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#065f46;">
        <strong>✓ Prenotazione confermata!</strong> Conserva questo voucher e presentalo al check-in. Il check-in è alle <strong>${booking.check_in_time || '—'}</strong>.
      </p>
    </div>
    `}

    <p style="margin-top:24px;font-size:13px;color:#6b7280;">Per qualsiasi domanda rispondi a questa email.</p>
    <p style="margin-top:16px;color:#1f2937;">Cordiali saluti,<br><strong>${escapeHtml(company?.name || 'Maretrek')}</strong></p>
  </div>

  <div style="background:#f9fafb;padding:12px;text-align:center;font-size:11px;color:#9ca3af;">
    Email automatica - Locazioni Brevi
  </div>
</div>
</body></html>`;
}

async function sendViaResend({ from, to, subject, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata');
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const r = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (r.error) throw new Error(`Resend: ${r.error.message || JSON.stringify(r.error)}`);
  return { ok: true, message_id: r.data?.id, provider: 'resend' };
}

async function sendViaSmtp({ from, to, subject, html }) {
  const nodemailer = await import('nodemailer');
  const host = process.env.SMTP_HOST || 'smtps.aruba.it';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP non configurato (SMTP_USER/SMTP_PASS)');
  const transporter = nodemailer.default.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  const info = await transporter.sendMail({
    from, to, subject, html,
  });
  return { ok: true, message_id: info.messageId, provider: 'smtp' };
}

// Funzione principale - chiamata da handleRentalBookings dopo POST
export async function sendRentalConfirmationEmail(booking, unit, company) {
  if (!booking?.customer?.email) {
    console.warn('[rental-voucher] No customer email, skipping');
    return { ok: false, skipped: true };
  }

  const fromName = company?.name || process.env.SMTP_FROM_NAME || 'Maretrek';
  const isPending = booking.status === 'PENDING';
  const subject = `${isPending ? 'Richiesta ricevuta' : 'Conferma prenotazione'} ${booking.booking_number} - ${fromName}`;
  const html = buildHtml({ booking, unit, company });

  const resendFromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
  const smtpFromEmail = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;

  let primaryError = null;
  if (process.env.RESEND_API_KEY && resendFromEmail) {
    try {
      return await sendViaResend({
        from: `${fromName} <${resendFromEmail}>`,
        to: booking.customer.email,
        subject,
        html,
      });
    } catch (e) {
      primaryError = e.message;
      console.warn('[rental-voucher] Resend fail, fallback SMTP:', e.message);
    }
  }

  try {
    return await sendViaSmtp({
      from: `"${fromName}" <${smtpFromEmail}>`,
      to: booking.customer.email,
      subject,
      html,
    });
  } catch (e) {
    const composedError = primaryError ? `Resend: ${primaryError} · SMTP: ${e.message}` : `SMTP: ${e.message}`;
    console.error('[rental-voucher] All email channels failed:', composedError);
    return { ok: false, error: composedError };
  }
}
