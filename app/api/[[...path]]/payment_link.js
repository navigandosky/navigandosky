// SumUp Payment Link per Integrazione Importo su Prenotazione esistente
// - Crea un hosted checkout SumUp PER UN IMPORTO ARBITRARIO (es. integrazione su acconto)
// - Pre-popola i dati a partire da una prenotazione esistente (booking_ref MK-yyyy-xxxx)
// - Permette di mostrare il link OPPURE inviarlo via email (Resend con fallback SMTP)
// - Traccia ogni link generato nel campo bookings.integration_payments[]
// - Quando il pagamento è completato, il webhook SumUp esistente (sumup_payments.js)
//   marcherà la voce integration come PAID grazie a checkout_reference dedicato.
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

// === HANDLER: POST /api/payment-link/create
// Body: {
//   booking_ref: 'MK-2026-0001',  // OPPURE booking_id
//   booking_id?: string,
//   customer_name: string,
//   customer_email: string,
//   amount: number,                 // importo integrazione in EUR
//   description?: string,           // descrizione opzionale (default: "Integrazione pagamento ...")
//   send_via: 'show' | 'email',     // come consegnare il link
// }
export async function handleCreatePaymentLink(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);

  try {
    const {
      booking_ref,
      booking_id,
      customer_name,
      customer_email,
      amount,
      description,
      send_via,
    } = body || {};

    // Validazioni base
    if (!booking_ref && !booking_id) {
      return json({ error: 'Indica booking_ref o booking_id' }, 400);
    }
    if (!customer_name || !customer_email) {
      return json({ error: 'Nome e email cliente sono obbligatori' }, 400);
    }
    const amt = Number(amount);
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      return json({ error: 'Importo non valido' }, 400);
    }
    if (!['show', 'email'].includes(send_via)) {
      return json({ error: 'send_via deve essere "show" o "email"' }, 400);
    }

    const db = await getDb();

    // Recupera prenotazione
    const query = booking_id ? { id: booking_id } : { booking_ref: booking_ref };
    const booking = await db.collection('bookings').findOne(query);
    if (!booking) return json({ error: 'Prenotazione non trovata' }, 404);

    if (!booking.company_id) return json({ error: 'Prenotazione senza company_id' }, 400);
    const company = await db.collection('companies').findOne({ id: booking.company_id });
    if (!company) return json({ error: 'Company non trovata' }, 404);

    const sumupConfig = company.payment_config?.sumup;
    if (!sumupConfig?.api_key || !sumupConfig?.enabled) {
      return json({ error: 'SumUp non configurato per questa company' }, 400);
    }

    // Auto-ricava merchant_code se manca
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
    const redirectUrl = `${appUrl}/booking-success?ref=${booking.booking_ref}&integration=1`;

    // checkout_reference dedicato per integrazione: prefisso INTG- per identificarlo nel webhook
    const checkoutRef = `INTG-${booking.booking_ref}-${Date.now()}`;
    const custNameForDesc = (customer_name || booking.customer_name || '').trim();
    const descLine = description?.trim() ||
      `Integrazione Voucher ${booking.booking_ref} - ${booking.experience_name || 'Prenotazione'}${custNameForDesc ? ' - ' + custNameForDesc : ''}`;

    // Crea hosted checkout
    const payload = {
      checkout_reference: checkoutRef,
      amount: Number(amt.toFixed(2)),
      currency: booking.currency || 'EUR',
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
      console.error('[payment-link] SumUp error:', res.status, errBody);
      return json({ error: 'Errore creazione link SumUp', details: errBody }, 502);
    }

    const checkout = await res.json();
    const hostedUrl = checkout.hosted_checkout_url;
    const checkoutId = checkout.id;

    // Salva la integrazione nel booking
    const integrationEntry = {
      id: checkoutId,
      checkout_reference: checkoutRef,
      hosted_url: hostedUrl,
      amount: Number(amt.toFixed(2)),
      currency: booking.currency || 'EUR',
      description: descLine,
      customer_name,
      customer_email,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      sent_via: send_via,
    };

    await db.collection('bookings').updateOne(
      { id: booking.id },
      {
        $push: { integration_payments: integrationEntry },
        $set: { integration_payments_updated_at: new Date().toISOString() },
      }
    );

    // Se richiesto, invia email al cliente con il link
    let emailResult = null;
    if (send_via === 'email') {
      try {
        emailResult = await sendPaymentLinkEmail({
          to: customer_email,
          customer_name,
          amount: amt,
          currency: booking.currency || 'EUR',
          hosted_url: hostedUrl,
          booking_ref: booking.booking_ref,
          description: descLine,
          company,
        });
      } catch (e) {
        console.error('[payment-link] email error:', e?.message);
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
      currency: booking.currency || 'EUR',
      booking_ref: booking.booking_ref,
      email_sent: !!emailResult,
      email_provider: emailResult?.provider || null,
    });
  } catch (e) {
    console.error('[payment-link] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === HANDLER: GET /api/payment-link/lookup?ref=MK-2026-0001
// Restituisce dati riassuntivi della prenotazione per pre-compilare il form
export async function handleLookupBooking(method, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);

  try {
    const ref = (searchParams?.get('ref') || '').trim();
    const cid = (searchParams?.get('company_id') || '').trim();
    if (!ref) return json({ error: 'Parametro ref obbligatorio' }, 400);

    const db = await getDb();
    const q = { booking_ref: ref };
    if (cid) q.company_id = cid;

    const b = await db.collection('bookings').findOne(q, {
      projection: {
        _id: 0,
        id: 1,
        booking_ref: 1,
        customer_name: 1,
        customer_email: 1,
        customer_phone: 1,
        experience_name: 1,
        total_amount: 1,
        seats: 1,
        currency: 1,
        status: 1,
        payment_status: 1,
        slot_datetime: 1,
        company_id: 1,
        integration_payments: 1,
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
    console.error('[payment-link lookup] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === Email builder ===
async function sendPaymentLinkEmail({
  to, customer_name, amount, currency, hosted_url, booking_ref, description, company,
}) {
  const fromName = company?.name || process.env.SMTP_FROM_NAME || 'Maretrek';
  const subj = `Link di pagamento ${booking_ref} - ${fromName}`;
  const amountStr = `${Number(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${currency || 'EUR'}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Link di pagamento</title></head>
<body style="font-family: Arial, sans-serif; max-width:600px; margin:auto; color:#1f2937;">
  <div style="background: linear-gradient(135deg,#0d9488 0%,#0f766e 100%); color:white; padding:24px; border-radius:8px 8px 0 0;">
    <h1 style="margin:0; font-size:22px;">Link di Pagamento</h1>
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
    <p style="font-size:12px; color:#6b7280;">Oppure copia e incolla questo link nel browser:<br>
      <a href="${hosted_url}" style="color:#0f766e; word-break:break-all;">${hosted_url}</a>
    </p>
    <table style="width:100%; margin-top:16px; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 0; color:#6b7280;">Riferimento Voucher:</td><td style="padding:4px 0;"><strong>${booking_ref}</strong></td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Importo:</td><td style="padding:4px 0;"><strong>${amountStr}</strong></td></tr>
    </table>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Pagamento sicuro elaborato da SumUp.</p>
    <p style="margin-top:16px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
  </div>
  <div style="text-align:center; padding:12px; font-size:11px; color:#9ca3af;">
    Email automatica - per assistenza rispondi a questa mail.
  </div>
</body></html>`;

  // Prova Resend prima, fallback SMTP
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
      console.warn('[payment-link email] Resend fail, fallback SMTP:', e.message);
    }
  }

  // SMTP fallback
  try {
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST || 'smtps.aruba.it';
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) throw new Error('SMTP non configurato');

    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpFromEmail || user}>`,
      to,
      subject: subj,
      html,
    });
    return { ok: true, message_id: info.messageId, provider: 'smtp' };
  } catch (e) {
    const composedError = primaryError ? `Resend: ${primaryError} · SMTP: ${e.message}` : `SMTP: ${e.message}`;
    throw new Error(composedError);
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
