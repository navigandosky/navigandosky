// SumUp Online Payments Integration
// - Crea hosted checkout (link pagamento)
// - Riceve webhook di conferma pagamento
// - Aggiorna booking e invia voucher finale
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

// === HANDLER: POST /api/sumup/create-checkout
// body: { booking_id, return_url? }
// Risponde: { hosted_url, checkout_id, amount, currency }
export async function handleCreateSumupCheckout(method, body) {
  if (method !== 'POST') {
    return json({ error: 'Use POST' }, 405);
  }
  try {
    const { booking_id, return_url } = body || {};
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ id: booking_id });
    if (!booking) return json({ error: 'Booking non trovato' }, 404);

    if (!booking.company_id) return json({ error: 'Booking senza company_id' }, 400);
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
    if (!merchantCode) return json({ error: 'Impossibile ricavare merchant_code' }, 500);

    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/sumup/webhook`;
    const redirectUrl = return_url || `${appUrl}/booking-success?ref=${booking.booking_ref}`;

    // Crea hosted checkout
    const payload = {
      checkout_reference: `${booking.booking_ref}-${Date.now()}`, // unique per ogni tentativo
      amount: Number(booking.total_amount),
      currency: booking.currency || 'EUR',
      merchant_code: merchantCode,
      description: `Prenotazione ${booking.booking_ref} - ${booking.experience_name || 'Esperienza'}`,
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
      console.error('[sumup create-checkout] error:', res.status, errBody);
      return json({ error: 'Errore creazione checkout SumUp', details: errBody }, 502);
    }

    const checkout = await res.json();

    // Salva nel booking
    await db.collection('bookings').updateOne(
      { id: booking_id },
      { $set: {
        sumup_checkout_id: checkout.id,
        sumup_hosted_url: checkout.hosted_checkout_url,
        sumup_checkout_reference: checkout.checkout_reference,
        sumup_created_at: new Date().toISOString(),
      } }
    );

    return json({
      ok: true,
      hosted_url: checkout.hosted_checkout_url,
      checkout_id: checkout.id,
      amount: checkout.amount,
      currency: checkout.currency,
    });
  } catch (e) {
    console.error('[sumup create-checkout] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === HANDLER: POST /api/sumup/webhook
// SumUp posta: { event_type: 'CHECKOUT_STATUS_CHANGED', id: '<checkout_id>' }
export async function handleSumupWebhook(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { event_type, id: checkoutId } = body || {};
    if (event_type !== 'CHECKOUT_STATUS_CHANGED' || !checkoutId) {
      return new Response(null, { status: 204 });
    }

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ sumup_checkout_id: checkoutId });
    if (!booking) {
      console.warn('[sumup webhook] booking non trovato per checkout', checkoutId);
      return new Response(null, { status: 204 });
    }

    const company = await db.collection('companies').findOne({ id: booking.company_id });
    const apiKey = company?.payment_config?.sumup?.api_key;
    if (!apiKey) return new Response(null, { status: 204 });

    // Recupera dettagli checkout
    const res = await fetch(`${SUMUP_API}/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error('[sumup webhook] fetch checkout failed:', res.status);
      return new Response(null, { status: 202 });
    }
    const checkout = await res.json();
    const status = checkout.status; // PAID | PENDING | FAILED | EXPIRED

    // Idempotenza: aggiorna solo se cambia stato
    if (status === 'PAID' && booking.payment_status !== 'PAID') {
      await db.collection('bookings').updateOne(
        { id: booking.id },
        { $set: {
          status: 'CONFIRMED',
          payment_status: 'PAID',
          sumup_paid_at: new Date().toISOString(),
          sumup_transaction_id: checkout?.transactions?.[0]?.id || null,
        } }
      );
      // Invia voucher finale
      if (booking.customer_email) {
        try {
          const { sendBookingVoucherInternal } = await import('./send_booking_voucher');
          sendBookingVoucherInternal(booking.id, 'FINAL').catch(err =>
            console.error('[sumup webhook] voucher email error:', err?.message)
          );
        } catch (e) { console.error('[sumup webhook] voucher import error:', e?.message); }
      }
    } else if ((status === 'FAILED' || status === 'EXPIRED') && booking.payment_status !== 'FAILED') {
      await db.collection('bookings').updateOne(
        { id: booking.id },
        { $set: { payment_status: 'FAILED', sumup_failed_at: new Date().toISOString() } }
      );
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('[sumup webhook] exception:', e);
    return new Response(null, { status: 204 });
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
