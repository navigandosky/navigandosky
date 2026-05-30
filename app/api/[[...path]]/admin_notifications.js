// Notifiche email automatiche all'admin per ogni prenotazione PAGATA
// Destinatari fissi: navigandosky@yahoo.it + marlin.sub@libero.it
// Tipi supportati:
//   - 'experience' → Booking esperienza (collection: bookings)
//   - 'marina'     → Marina booking
//   - 'rental'     → Rental booking (Locazioni Brevi)
//
// Resilient: gli errori vengono solo loggati, mai propagati al chiamante.

const ADMIN_NOTIFICATION_RECIPIENTS = [
  'navigandosky@yahoo.it',
  'marlin.sub@libero.it',
];

const fmtEur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml({ title, headerColor, rows, footerNote }) {
  const rowsHtml = rows
    .filter(r => r && r.value !== undefined && r.value !== null && r.value !== '')
    .map(r => `<tr><td style="padding:6px 12px;color:#6b7280;width:170px;font-weight:500;">${escapeHtml(r.label)}</td><td style="padding:6px 12px;color:#111827;"><strong>${r.html ? r.value : escapeHtml(r.value)}</strong></td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f7fa;color:#1f2937;">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:${headerColor};color:white;padding:20px 24px;">
    <div style="font-size:13px;opacity:.85;letter-spacing:.5px;text-transform:uppercase;">Notifica Admin Maretrek</div>
    <div style="font-size:20px;font-weight:700;margin-top:4px;">✅ ${escapeHtml(title)}</div>
  </div>
  <div style="padding:22px 24px;font-size:14px;">
    <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    ${footerNote ? `<p style="margin-top:18px;font-size:12px;color:#6b7280;line-height:1.5;">${escapeHtml(footerNote)}</p>` : ''}
  </div>
  <div style="background:#1f2937;color:#9ca3af;padding:12px 24px;text-align:center;font-size:11px;">
    Maretrek Booking Engine · ${new Date().toLocaleString('it-IT')}
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

/**
 * Invia una notifica admin per una prenotazione pagata.
 * Non solleva eccezioni: ogni errore è loggato.
 *
 * @param {Object} params
 * @param {'experience'|'marina'|'rental'} params.kind
 * @param {Object} params.booking - documento prenotazione
 * @param {Object} [params.company] - company associata (per il nome mittente)
 * @param {Object} [params.extra] - dati aggiuntivi (es. importo pagato, metodo)
 */
export async function notifyAdminPayment({ kind, booking, company, extra = {} }) {
  try {
    if (!booking) return;
    if (!process.env.RESEND_API_KEY) {
      console.warn('[admin-notifications] RESEND_API_KEY non configurata, skip notifica admin');
      return;
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'noreply@porticciolodibosamarina.com';
    const fromName = company?.name || 'Maretrek';
    const from = `${fromName} <${senderEmail}>`;

    let title, headerColor, rows, subject;

    if (kind === 'experience') {
      const ref = booking.booking_ref || booking.id?.slice(0, 8);
      title = `Prenotazione PAGATA · ${ref}`;
      headerColor = 'linear-gradient(135deg,#10b981,#059669)';
      subject = `[Maretrek] 💳 PAGATO · Esperienza ${ref} · ${booking.customer_name || ''}`;
      rows = [
        { label: 'Tipo', value: '🎫 Esperienza / Tour' },
        { label: 'Codice', value: ref },
        { label: 'Esperienza', value: booking.experience_name || booking.experience_id || '-' },
        { label: 'Cliente', value: booking.customer_name || '-' },
        { label: 'Email cliente', value: booking.customer_email || '-' },
        { label: 'Telefono', value: booking.customer_phone || '-' },
        { label: 'Posti', value: booking.seats != null ? String(booking.seats) : '-' },
        { label: 'Data esperienza', value: fmtDateTime(booking.slot_datetime) },
        { label: 'Importo', value: fmtEur(extra.paid_amount ?? booking.total_amount) },
        { label: 'Metodo pagamento', value: extra.payment_method || booking.payment_method || '-' },
        { label: 'Agenzia', value: booking.agency_name || (booking.agency_id ? booking.agency_id : '—') },
        { label: 'Company', value: company?.name || booking.company_id || '-' },
      ];
    } else if (kind === 'marina') {
      const ref = booking.booking_number || booking.id?.slice(0, 8);
      title = `Marina · Pagamento ricevuto ${ref}`;
      headerColor = 'linear-gradient(135deg,#3b82f6,#1d4ed8)';
      subject = `[Maretrek] ⚓ PAGATO · Marina ${ref} · ${booking.customer?.name || ''} ${booking.customer?.surname || ''}`;
      rows = [
        { label: 'Tipo', value: '⚓ Marina / Posto Barca' },
        { label: 'N° Prenotazione', value: ref },
        { label: 'Marina', value: booking.marina_name || '-' },
        { label: 'Cliente', value: `${booking.customer?.name || ''} ${booking.customer?.surname || ''}`.trim() || '-' },
        { label: 'Email cliente', value: booking.customer?.email || '-' },
        { label: 'Telefono', value: booking.customer?.phone || '-' },
        { label: 'Barca', value: booking.boat?.name ? `${booking.boat.name}${booking.boat.length ? ' · ' + booking.boat.length + 'm' : ''}` : '-' },
        { label: 'Periodo', value: `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)} (${booking.days || 0} gg)` },
        { label: 'Importo pagato', value: fmtEur(extra.paid_amount ?? booking.deposit_amount) },
        { label: 'Totale prenotazione', value: fmtEur(booking.grand_total) },
        { label: 'Metodo pagamento', value: extra.payment_method || booking.deposit_payment_method || '-' },
        { label: 'Stato risultante', value: booking.status || '-' },
        { label: 'Company', value: company?.name || booking.company_id || '-' },
      ];
    } else if (kind === 'rental') {
      const ref = booking.booking_number || booking.id?.slice(0, 8);
      title = `Locazione Breve · Pagamento ricevuto ${ref}`;
      headerColor = 'linear-gradient(135deg,#8b5cf6,#7c3aed)';
      subject = `[Maretrek] 🏖️ PAGATO · Locazione ${ref} · ${booking.customer?.name || ''} ${booking.customer?.surname || ''}`;
      rows = [
        { label: 'Tipo', value: '🏖️ Locazione Breve' },
        { label: 'N° Prenotazione', value: ref },
        { label: 'Unità', value: booking.unit_name || '-' },
        { label: 'Categoria', value: booking.category || '-' },
        { label: 'Cliente', value: `${booking.customer?.name || ''} ${booking.customer?.surname || ''}`.trim() || '-' },
        { label: 'Email cliente', value: booking.customer?.email || '-' },
        { label: 'Telefono', value: booking.customer?.phone || '-' },
        { label: 'Periodo', value: booking.start_date ? `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}` : `${booking.duration_value || ''} ${booking.duration_unit || ''}` },
        { label: 'Importo pagato', value: fmtEur(extra.paid_amount ?? booking.total_amount) },
        { label: 'Totale prenotazione', value: fmtEur(booking.total_amount) },
        { label: 'Metodo pagamento', value: extra.payment_method || '-' },
        { label: 'Stato risultante', value: booking.payment_status || booking.status || '-' },
        { label: 'Company', value: company?.name || booking.company_id || '-' },
      ];
    } else {
      console.warn('[admin-notifications] kind non supportato:', kind);
      return;
    }

    const html = buildHtml({
      title,
      headerColor,
      rows,
      footerNote: 'Email automatica di notifica interna. Non rispondere a questa email.',
    });

    await sendViaResend({
      from,
      to: ADMIN_NOTIFICATION_RECIPIENTS,
      subject,
      html,
    });
    console.log(`[admin-notifications] ✉️  Notifica admin inviata (${kind})`);
  } catch (e) {
    console.error('[admin-notifications] errore invio notifica:', e?.message);
  }
}
