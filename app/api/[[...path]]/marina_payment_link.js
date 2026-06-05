// SumUp Payment Link per Marina Bookings (Richieste di Prenotazione Marina)
// Mirrors rental_payment_link.js / payment_link.js
// checkout_reference prefix: MAR-{booking_number}-{ts}
// Il webhook SumUp riconosce il booking via integration_payments.id (vedi sumup_payments.js)

import { MongoClient } from 'mongodb';
import { buildSumupDescription, buildSumupCustomer } from './sumup_helpers';

let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

const SUMUP_API = 'https://api.sumup.com/v0.1';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === POST /api/marina-payment-link/create ===
// Body:
//   booking_number | booking_id
//   customer_name, customer_email
//   amount        (importo in EUR)
//   description?  (default auto)
//   send_via      ('show' | 'email')
//   payment_type? ('deposit' | 'balance' | 'full' | 'custom')
//   from_label?   (label di chi sta inviando: 'Admin' o 'Agenzia X')
export async function handleCreateMarinaPaymentLink(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const {
      booking_number,
      booking_id,
      customer_name,
      customer_email,
      amount,
      description,
      send_via,
      payment_type,
      from_label,
    } = body || {};

    if (!booking_number && !booking_id) {
      return json({ error: 'Indica booking_number (BK-YYYY/NNNN) o booking_id' }, 400);
    }
    if (!customer_name || !customer_email) {
      return json({ error: 'Nome e email cliente obbligatori' }, 400);
    }
    const amt = Number(amount);
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      return json({ error: 'Importo non valido' }, 400);
    }
    if (!['show', 'email'].includes(send_via)) {
      return json({ error: "send_via deve essere 'show' o 'email'" }, 400);
    }

    const db = await getDb();
    const query = booking_id ? { id: booking_id } : { booking_number };
    const booking = await db.collection('marina_bookings').findOne(query);
    if (!booking) return json({ error: 'Prenotazione marina non trovata' }, 404);

    if (!booking.company_id) return json({ error: 'Prenotazione senza company_id' }, 400);
    const company = await db.collection('companies').findOne({ id: booking.company_id });
    if (!company) return json({ error: 'Company non trovata' }, 404);

    const sumupConfig = company.payment_config?.sumup;
    if (!sumupConfig?.api_key || !sumupConfig?.enabled) {
      return json({ error: 'SumUp non configurato per questa company' }, 400);
    }

    // Auto-fetch merchant_code
    let merchantCode = sumupConfig.merchant_code;
    if (!merchantCode) {
      const meRes = await fetch(`${SUMUP_API}/me`, {
        headers: { Authorization: `Bearer ${sumupConfig.api_key}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        merchantCode = me?.merchant_profile?.merchant_code || me?.merchant_code;
        if (merchantCode) {
          await db.collection('companies').updateOne(
            { id: booking.company_id },
            { $set: { 'payment_config.sumup.merchant_code': merchantCode } }
          );
        }
      }
    }
    if (!merchantCode) return json({ error: 'Impossibile ricavare merchant_code SumUp' }, 500);

    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/sumup/webhook`;
    const redirectUrl = `${appUrl}/booking-success?ref=${encodeURIComponent(booking.booking_number)}&marina=1`;

    // MAR- prefix per identificare marina booking nel webhook
    const safeBkNum = String(booking.booking_number).replace(/\//g, '-');
    const checkoutRef = `MAR-${safeBkNum}-${Date.now()}`;

    const custNameForDesc = (customer_name || `${booking.customer?.name || ''} ${booking.customer?.surname || ''}`).trim();
    const descLine = (description?.trim()) || buildSumupDescription({
      customerName: custNameForDesc,
      prefix: 'Marina',
      ref: booking.booking_number,
      context: booking.marina_name || '',
      paymentType: payment_type || 'pagamento',
    });
    const customerObj = buildSumupCustomer(custNameForDesc, customer_email, booking.customer?.phone);

    const payload = {
      checkout_reference: checkoutRef,
      amount: Number(amt.toFixed(2)),
      currency: 'EUR',
      merchant_code: merchantCode,
      description: descLine,
      hosted_checkout: { enabled: true },
      redirect_url: redirectUrl,
      return_url: webhookUrl,
      ...(customerObj ? { customer: customerObj } : {}),
    };

    const res = await fetch(`${SUMUP_API}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sumupConfig.api_key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[marina-payment-link] SumUp error:', res.status, errBody);
      return json({ error: 'Errore creazione link SumUp', details: errBody }, 502);
    }

    const checkout = await res.json();
    const hostedUrl = checkout.hosted_checkout_url;
    const checkoutId = checkout.id;

    const integrationEntry = {
      id: checkoutId,
      checkout_reference: checkoutRef,
      hosted_url: hostedUrl,
      amount: Number(amt.toFixed(2)),
      currency: 'EUR',
      description: descLine,
      customer_name,
      customer_email,
      payment_type: payment_type || 'custom',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      sent_via: send_via,
      from_label: from_label || null,
    };

    await db.collection('marina_bookings').updateOne(
      { id: booking.id },
      {
        $push: { integration_payments: integrationEntry },
        $set: { integration_payments_updated_at: new Date().toISOString() },
      }
    );

    // Invio email se richiesto
    let emailResult = null;
    if (send_via === 'email') {
      try {
        emailResult = await sendMarinaPaymentLinkEmail({
          to: customer_email,
          customer_name,
          amount: amt,
          hosted_url: hostedUrl,
          booking,
          description: descLine,
          company,
          payment_type,
        });
      } catch (e) {
        console.error('[marina-payment-link] email error:', e?.message);
        return json({
          ok: true,
          warning: `Link generato ma invio email fallito: ${e.message}`,
          hosted_url: hostedUrl,
          checkout_id: checkoutId,
          checkout_reference: checkoutRef,
          amount: amt,
        });
      }
    }

    return json({
      ok: true,
      hosted_url: hostedUrl,
      checkout_id: checkoutId,
      checkout_reference: checkoutRef,
      amount: amt,
      currency: 'EUR',
      booking_number: booking.booking_number,
      email_sent: !!emailResult,
      email_provider: emailResult?.provider || null,
    });
  } catch (e) {
    console.error('[marina-payment-link] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === GET /api/marina-payment-link/lookup?ref=BK-2026/0001 ===
export async function handleLookupMarinaBooking(method, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  try {
    const ref = (searchParams?.get('ref') || '').trim();
    if (!ref) return json({ error: 'Parametro ref obbligatorio' }, 400);

    const db = await getDb();
    const b = await db.collection('marina_bookings').findOne({ booking_number: ref });
    if (!b) return json({ error: 'Prenotazione non trovata' }, 404);

    return json({ ok: true, booking: b });
  } catch (e) {
    console.error('[marina-payment-link lookup] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === Email helper ===
async function sendMarinaPaymentLinkEmail({
  to, customer_name, amount, hosted_url, booking, description, company, payment_type,
}) {
  const fromName = company?.name || process.env.SMTP_FROM_NAME || 'Maretrek';
  const subj = `Link di pagamento ${booking.booking_number} · Marina ${booking.marina_name || ''}`;
  const amountStr = `${Number(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })} EUR`;
  const isDeposit = payment_type === 'deposit';

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Link Pagamento Marina</title></head>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; max-width:600px; margin:auto; color:#1f2937; background:#f5f7fa;">
  <div style="background: linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%); color:white; padding:24px; border-radius:8px 8px 0 0;">
    <h1 style="margin:0; font-size:22px;">⚓ Link di Pagamento Marina</h1>
    <p style="margin:4px 0 0; opacity:0.9;">${escapeHtml(fromName)}</p>
  </div>
  <div style="background:white; padding:24px; border:1px solid #e5e7eb; border-top:0; border-radius:0 0 8px 8px;">
    <p>Gentile <strong>${escapeHtml(customer_name)}</strong>,</p>
    <p>${escapeHtml(description)}</p>
    <table style="width:100%; margin:18px 0; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:6px 0; color:#6b7280;">N° Prenotazione:</td><td style="padding:6px 0;"><strong>${escapeHtml(booking.booking_number)}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Marina:</td><td style="padding:6px 0;"><strong>${escapeHtml(booking.marina_name || '-')}</strong></td></tr>
      ${booking.boat?.name ? `<tr><td style="padding:6px 0; color:#6b7280;">Imbarcazione:</td><td style="padding:6px 0;"><strong>${escapeHtml(booking.boat.name)}${booking.boat?.length ? ' · ' + booking.boat.length + 'm' : ''}</strong></td></tr>` : ''}
      ${booking.start_date ? `<tr><td style="padding:6px 0; color:#6b7280;">Periodo:</td><td style="padding:6px 0;"><strong>${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 0; color:#6b7280;">Tipo pagamento:</td><td style="padding:6px 0;"><strong>${isDeposit ? 'Acconto' : (payment_type === 'balance' ? 'Saldo' : (payment_type === 'full' ? 'Saldo totale' : 'Pagamento'))}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Importo:</td><td style="padding:6px 0;"><strong style="color:#0369a1; font-size:18px;">${amountStr}</strong></td></tr>
    </table>
    <div style="text-align:center; margin:28px 0;">
      <a href="${hosted_url}" style="display:inline-block; background:#0369a1; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
        💳 Paga ora in sicurezza
      </a>
    </div>
    <p style="font-size:12px; color:#6b7280;">Oppure copia e incolla questo link nel browser:<br>
      <a href="${hosted_url}" style="color:#0369a1; word-break:break-all;">${hosted_url}</a>
    </p>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Pagamento sicuro elaborato da SumUp. La tua prenotazione passerà automaticamente allo stato "${isDeposit ? 'Acconto pagato' : 'Confermata'}" appena ricevuto il pagamento.</p>
    <p style="margin-top:16px;">Cordiali saluti,<br><strong>${escapeHtml(fromName)}</strong></p>
  </div>
</body></html>`;

  const resendFromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
  const smtpFromEmail = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;
  let primaryError = null;

  if (process.env.RESEND_API_KEY && resendFromEmail) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const r = await resend.emails.send({
        from: `${fromName} <${resendFromEmail}>`,
        to: [to],
        subject: subj,
        html,
      });
      if (r.error) throw new Error(r.error.message || JSON.stringify(r.error));
      return { ok: true, message_id: r.data?.id, provider: 'resend' };
    } catch (e) {
      primaryError = e.message;
      console.warn('[marina-payment-link email] Resend fail, fallback SMTP:', e.message);
    }
  }

  try {
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST || 'smtps.aruba.it';
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) throw new Error('SMTP non configurato');
    const transporter = nodemailer.default.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpFromEmail || user}>`,
      to, subject: subj, html,
    });
    return { ok: true, message_id: info.messageId, provider: 'smtp' };
  } catch (e) {
    const composedError = primaryError ? `Resend: ${primaryError} · SMTP: ${e.message}` : `SMTP: ${e.message}`;
    throw new Error(composedError);
  }
}

// === POST /api/marina-payment-link/send-bank-transfer ===
// Invia email con coordinate bonifico per una prenotazione marina (no link SumUp)
export async function handleSendMarinaBankTransfer(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { booking_id, booking_number, amount, payment_type } = body || {};
    if (!booking_id && !booking_number) return json({ error: 'booking_id o booking_number richiesti' }, 400);
    const amt = Number(amount);
    if (!amt || amt <= 0 || Number.isNaN(amt)) return json({ error: 'Importo non valido' }, 400);

    const db = await getDb();
    const query = booking_id ? { id: booking_id } : { booking_number };
    const booking = await db.collection('marina_bookings').findOne(query);
    if (!booking) return json({ error: 'Prenotazione non trovata' }, 404);
    if (!booking.customer?.email) return json({ error: 'Cliente senza email' }, 400);

    const company = await db.collection('companies').findOne({ id: booking.company_id });
    const bt = company?.payment_config?.bank_transfer;
    if (!bt?.iban) return json({ error: 'Coordinate bonifico non configurate per la company' }, 400);

    const fromName = company?.name || 'Maretrek';
    const amountStr = `${Number(amt).toLocaleString('it-IT', { minimumFractionDigits: 2 })} EUR`;
    const isDeposit = payment_type === 'deposit';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; max-width:600px; margin:auto; color:#1f2937;">
  <div style="background: linear-gradient(135deg,#10b981 0%,#059669 100%); color:white; padding:24px; border-radius:8px 8px 0 0;">
    <h1 style="margin:0; font-size:22px;">🏦 Coordinate Bonifico</h1>
    <p style="margin:4px 0 0; opacity:0.9;">${escapeHtml(fromName)} · ${escapeHtml(booking.marina_name || '')}</p>
  </div>
  <div style="background:white; padding:24px; border:1px solid #e5e7eb; border-top:0; border-radius:0 0 8px 8px;">
    <p>Gentile <strong>${escapeHtml(booking.customer?.name || '')} ${escapeHtml(booking.customer?.surname || '')}</strong>,</p>
    <p>per completare la tua prenotazione <strong>${escapeHtml(booking.booking_number)}</strong> ti chiediamo di effettuare il bonifico utilizzando le seguenti coordinate:</p>
    <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:10px; padding:16px; margin:18px 0;">
      <table style="width:100%; font-size:14px;">
        <tr><td style="padding:4px 0; color:#065f46; width:140px;">IBAN:</td><td><strong style="font-family:Courier, monospace; letter-spacing:1px;">${escapeHtml(bt.iban)}</strong></td></tr>
        <tr><td style="padding:4px 0; color:#065f46;">Intestatario:</td><td><strong>${escapeHtml(bt.account_holder || fromName)}</strong></td></tr>
        ${bt.bank_name ? `<tr><td style="padding:4px 0; color:#065f46;">Banca:</td><td>${escapeHtml(bt.bank_name)}</td></tr>` : ''}
        ${bt.bic_swift ? `<tr><td style="padding:4px 0; color:#065f46;">BIC/SWIFT:</td><td style="font-family:Courier, monospace;">${escapeHtml(bt.bic_swift)}</td></tr>` : ''}
        <tr><td style="padding:6px 0; color:#065f46;">Importo:</td><td><strong style="color:#059669; font-size:18px;">${amountStr}</strong> ${isDeposit ? '<span style="color:#6b7280; font-size:12px;">(acconto)</span>' : ''}</td></tr>
        <tr><td style="padding:4px 0; color:#065f46;">Causale:</td><td style="font-family:Courier, monospace; font-size:13px;">Prenotazione ${escapeHtml(booking.booking_number)}</td></tr>
      </table>
    </div>
    <div style="background:#fffbeb; border:1px solid #fbbf24; border-radius:8px; padding:12px; font-size:13px; color:#92400e;">
      ⚠️ <strong>Importante:</strong> La prenotazione resta in stato <strong>PENDING</strong> fino alla verifica dell'accredito. Inserisci la causale esatta per velocizzare la verifica.
    </div>
    <p style="margin-top:18px;">Cordiali saluti,<br><strong>${escapeHtml(fromName)}</strong></p>
  </div>
</body></html>`;

    if (!process.env.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY non configurata' }, 500);
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'noreply@porticciolodibosamarina.com';
    const r = await resend.emails.send({
      from: `${fromName} <${resendFromEmail}>`,
      to: [booking.customer.email],
      subject: `Coordinate Bonifico · ${booking.booking_number} · ${booking.marina_name || fromName}`,
      html,
    });
    if (r.error) return json({ error: r.error.message || 'Resend error' }, 500);

    // Salva marker
    await db.collection('marina_bookings').updateOne(
      { id: booking.id },
      { $set: {
        bank_transfer_email_sent_at: new Date().toISOString(),
        bank_transfer_email_amount: Number(amt.toFixed(2)),
        bank_transfer_payment_type: payment_type || null,
      } }
    );
    return json({ ok: true, message_id: r.data?.id });
  } catch (e) {
    console.error('[marina send-bank-transfer] exception:', e);
    return json({ error: e.message }, 500);
  }
}
