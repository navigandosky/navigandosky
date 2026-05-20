// SumUp Payment Link per Rental Bookings (Locazioni Brevi)
// Mirrors payment_link.js but operates on rental_bookings collection.
// checkout_reference prefix: RNT-{booking_number}-{ts}
// The SumUp webhook (sumup_payments.js) detects RNT- prefix and updates rental_bookings.

import { MongoClient } from 'mongodb';

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
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === POST /api/rental-payment-link/create ===
export async function handleCreateRentalPaymentLink(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const {
      booking_number,   // RB-2026/0001
      booking_id,       // alternative
      customer_name,
      customer_email,
      amount,
      description,
      send_via,         // 'show' | 'email'
      payment_type,     // 'deposit' | 'balance' | 'full' (informational only)
    } = body || {};

    if (!booking_number && !booking_id) {
      return json({ error: 'Indica booking_number (RB-YYYY/NNNN) o booking_id' }, 400);
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
    const booking = await db.collection('rental_bookings').findOne(query);
    if (!booking) return json({ error: 'Prenotazione locazione non trovata' }, 404);

    if (!booking.company_id) return json({ error: 'Prenotazione senza company_id' }, 400);
    const company = await db.collection('companies').findOne({ id: booking.company_id });
    if (!company) return json({ error: 'Company non trovata' }, 404);

    const sumupConfig = company.payment_config?.sumup;
    if (!sumupConfig?.api_key || !sumupConfig?.enabled) {
      return json({ error: 'SumUp non configurato per questa company' }, 400);
    }

    // Auto-fetch merchant_code if missing
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
    const redirectUrl = `${appUrl}/booking-success?ref=${encodeURIComponent(booking.booking_number)}&rental=1`;

    // RNT- prefix: WEBHOOK uses this to identify rental booking payments
    // Replace slash in booking_number with dash for URL safety
    const safeBkNum = booking.booking_number.replace(/\//g, '-');
    const checkoutRef = `RNT-${safeBkNum}-${Date.now()}`;

    const descLine = description?.trim() ||
      `Locazione ${booking.booking_number} - ${booking.unit_name || ''} (${payment_type || 'pagamento'})`;

    const payload = {
      checkout_reference: checkoutRef,
      amount: Number(amt.toFixed(2)),
      currency: 'EUR',
      merchant_code: merchantCode,
      description: descLine,
      hosted_checkout: { enabled: true },
      redirect_url: redirectUrl,
      return_url: webhookUrl,
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
      console.error('[rental-payment-link] SumUp error:', res.status, errBody);
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
    };

    await db.collection('rental_bookings').updateOne(
      { id: booking.id },
      {
        $push: { integration_payments: integrationEntry },
        $set: { integration_payments_updated_at: new Date().toISOString() },
      }
    );

    let emailResult = null;
    if (send_via === 'email') {
      try {
        emailResult = await sendRentalPaymentLinkEmail({
          to: customer_email,
          customer_name,
          amount: amt,
          hosted_url: hostedUrl,
          booking_number: booking.booking_number,
          description: descLine,
          company,
        });
      } catch (e) {
        console.error('[rental-payment-link] email error:', e?.message);
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
    console.error('[rental-payment-link] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === GET /api/rental-payment-link/lookup?ref=RB-2026/0001 ===
export async function handleLookupRentalBooking(method, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  try {
    const ref = (searchParams?.get('ref') || '').trim();
    const cid = (searchParams?.get('company_id') || '').trim();
    if (!ref) return json({ error: 'Parametro ref obbligatorio' }, 400);

    const db = await getDb();
    const q = { booking_number: ref };
    if (cid) q.company_id = cid;
    const b = await db.collection('rental_bookings').findOne(q, {
      projection: {
        _id: 0,
        id: 1, booking_number: 1, unit_name: 1, category: 1,
        customer: 1, start_date: 1, end_date: 1, duration_value: 1, duration_unit: 1,
        total_amount: 1, deposit_amount: 1, balance_amount: 1, deposit_pct: 1,
        payment_status: 1, status: 1, company_id: 1, integration_payments: 1,
      },
    });
    if (!b) return json({ error: 'Prenotazione non trovata' }, 404);

    const paid_integrations = (b.integration_payments || [])
      .filter(p => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    return json({
      ok: true,
      booking: {
        ...b,
        paid_integrations_total: Number(paid_integrations.toFixed(2)),
      },
    });
  } catch (e) {
    console.error('[rental-payment-link lookup] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === Email ===
async function sendRentalPaymentLinkEmail({
  to, customer_name, amount, hosted_url, booking_number, description, company,
}) {
  const fromName = company?.name || process.env.SMTP_FROM_NAME || 'Maretrek';
  const subj = `Link di pagamento Locazione ${booking_number} - ${fromName}`;
  const amountStr = `${Number(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })} EUR`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width:600px; margin:auto; color:#1f2937;">
  <div style="background: linear-gradient(135deg,#0d9488 0%,#0f766e 100%); color:white; padding:24px; border-radius:8px 8px 0 0;">
    <h1 style="margin:0; font-size:22px;">🏖️ Link di Pagamento Locazione</h1>
    <p style="margin:4px 0 0; opacity:0.9;">${fromName}</p>
  </div>
  <div style="background:white; padding:24px; border:1px solid #e5e7eb; border-top:0; border-radius:0 0 8px 8px;">
    <p>Gentile <strong>${escapeHtml(customer_name)}</strong>,</p>
    <p>${escapeHtml(description)}</p>
    <p>Importo da saldare: <strong style="color:#0f766e; font-size:18px;">${amountStr}</strong></p>
    <div style="text-align:center; margin:28px 0;">
      <a href="${hosted_url}" style="display:inline-block; background:#0f766e; color:white; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
        Paga ora in sicurezza
      </a>
    </div>
    <p style="font-size:12px; color:#6b7280;">Oppure copia il link:<br>
      <a href="${hosted_url}" style="color:#0f766e; word-break:break-all;">${hosted_url}</a>
    </p>
    <table style="width:100%; margin-top:16px; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 0; color:#6b7280;">Riferimento Prenotazione:</td><td style="padding:4px 0;"><strong>${booking_number}</strong></td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Importo:</td><td style="padding:4px 0;"><strong>${amountStr}</strong></td></tr>
    </table>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Pagamento sicuro elaborato da SumUp.</p>
    <p style="margin-top:16px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
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
      console.warn('[rental-payment-link email] Resend fail, fallback SMTP:', e.message);
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
