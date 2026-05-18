// Stripe Checkout Integration (Multi-Tenant)
// - Crea Checkout Sessions con chiavi della company
// - Verifica stato sessione per aggiornare booking dopo redirect
// Stripe SDK lato server SOLO. Frontend riceve hosted_url e redirige.
import Stripe from 'stripe';
import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

// Carica config Stripe della company
async function getStripeConfig(db, companyId) {
  if (!companyId) return null;
  const company = await db.collection('companies').findOne({ id: companyId });
  if (!company) return null;
  const cfg = company.payment_config?.stripe;
  if (!cfg?.secret_key || !cfg?.enabled) return null;
  return { config: cfg, company };
}

// === POST /api/stripe/create-checkout-session
// body: { booking_id, success_url?, cancel_url? }
// Risponde: { url, session_id, amount, currency }
export async function handleCreateStripeCheckout(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { booking_id, success_url, cancel_url } = body || {};
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ id: booking_id });
    if (!booking) return json({ error: 'Booking non trovato' }, 404);
    if (!booking.company_id) return json({ error: 'Booking senza company_id' }, 400);

    const stripeCfg = await getStripeConfig(db, booking.company_id);
    if (!stripeCfg) {
      return json({ error: 'Stripe non configurato per questa company' }, 400);
    }
    const { config, company } = stripeCfg;

    const stripe = new Stripe(config.secret_key, { apiVersion: '2024-12-18.acacia' });

    // Carica esperienza per arricchire descrizione
    const exp = booking.experience_id
      ? await db.collection('experiences').findOne({ id: booking.experience_id })
      : null;

    const amountCents = Math.round(Number(booking.total_amount || 0) * 100);
    if (amountCents <= 0) return json({ error: 'Importo non valido' }, 400);

    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    const sUrl = success_url
      || `${base}/booking-success?provider=stripe&session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`;
    const cUrl = cancel_url || `${base}/?stripe_cancelled=1&booking_id=${booking_id}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: exp?.name || booking.experience_name || 'Prenotazione',
              description: `Rif: ${booking.booking_ref || booking.id} | ${booking.seats || 1} pax`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: sUrl,
      cancel_url: cUrl,
      customer_email: booking.customer_email || undefined,
      client_reference_id: booking_id,
      metadata: {
        booking_id: booking_id,
        booking_ref: booking.booking_ref || '',
        company_id: booking.company_id,
        company_name: company.name || '',
        customer_name: booking.customer_name || '',
      },
      payment_intent_data: {
        metadata: {
          booking_id: booking_id,
          booking_ref: booking.booking_ref || '',
          company_id: booking.company_id,
        },
      },
    });

    // Salva session_id sul booking per tracking
    await db.collection('bookings').updateOne(
      { id: booking_id },
      {
        $set: {
          stripe_session_id: session.id,
          payment_provider: 'STRIPE',
          payment_method: 'STRIPE',
          stripe_checkout_created_at: new Date().toISOString(),
        },
      }
    );

    return json({
      url: session.url,
      session_id: session.id,
      amount: amountCents / 100,
      currency: 'EUR',
    });
  } catch (e) {
    console.error('[stripe.create-checkout-session]', e);
    return json({ error: e.message || 'Errore creazione checkout' }, 500);
  }
}

// === GET /api/stripe/verify-session?session_id=X&booking_id=Y
// Verifica stato pagamento di una Stripe Checkout Session e aggiorna il booking.
// Risponde: { status: 'paid'|'unpaid'|'no_payment_required', booking_id, amount_total, customer_email }
export async function handleVerifyStripeSession(method, sp) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  try {
    const sessionId = sp.get('session_id');
    const bookingId = sp.get('booking_id');
    if (!sessionId) return json({ error: 'session_id required' }, 400);

    const db = await getDb();
    // Trova booking dal bookingId o dal session_id salvato
    const booking = bookingId
      ? await db.collection('bookings').findOne({ id: bookingId })
      : await db.collection('bookings').findOne({ stripe_session_id: sessionId });
    if (!booking) return json({ error: 'Booking non trovato' }, 404);

    const stripeCfg = await getStripeConfig(db, booking.company_id);
    if (!stripeCfg) return json({ error: 'Stripe non configurato' }, 400);

    const stripe = new Stripe(stripeCfg.config.secret_key, { apiVersion: '2024-12-18.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === 'paid';
    // Aggiorna booking se pagato e non già aggiornato
    if (paid && booking.status !== 'CONFIRMED') {
      await db.collection('bookings').updateOne(
        { id: booking.id },
        {
          $set: {
            status: 'CONFIRMED',
            payment_status: 'PAID',
            stripe_payment_intent_id: session.payment_intent,
            stripe_paid_at: new Date().toISOString(),
          },
        }
      );
    }

    return json({
      status: session.payment_status,
      paid,
      booking_id: booking.id,
      amount_total: (session.amount_total || 0) / 100,
      currency: session.currency,
      customer_email: session.customer_details?.email || session.customer_email,
    });
  } catch (e) {
    console.error('[stripe.verify-session]', e);
    return json({ error: e.message || 'Errore verifica' }, 500);
  }
}

// === POST /api/stripe/webhook?company_id=X
// Riceve webhook da Stripe (eventi checkout.session.completed).
// Richiede webhook_secret nella config company.
// NOTA: Stripe richiede il body raw per validare la firma.
// In Next.js App Router questo handler riceverà la signature dal header.
export async function handleStripeWebhook(method, rawBody, headers, sp) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const companyId = sp.get('company_id');
    if (!companyId) return json({ error: 'company_id required' }, 400);

    const db = await getDb();
    const company = await db.collection('companies').findOne({ id: companyId });
    if (!company) return json({ error: 'Company non trovata' }, 404);

    const cfg = company.payment_config?.stripe;
    if (!cfg?.secret_key) return json({ error: 'Stripe non configurato' }, 400);

    const stripe = new Stripe(cfg.secret_key, { apiVersion: '2024-12-18.acacia' });
    const sig = headers['stripe-signature'];

    let event;
    if (cfg.webhook_secret && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, cfg.webhook_secret);
      } catch (err) {
        console.error('[stripe.webhook] Signature failed:', err.message);
        return json({ error: 'Invalid signature' }, 400);
      }
    } else {
      // Modo permissivo se non c'e webhook_secret configurato (sconsigliato in prod)
      event = JSON.parse(rawBody);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id || session.client_reference_id;
      if (bookingId) {
        await db.collection('bookings').updateOne(
          { id: bookingId },
          {
            $set: {
              status: 'CONFIRMED',
              payment_status: 'PAID',
              stripe_payment_intent_id: session.payment_intent,
              stripe_session_id: session.id,
              stripe_paid_at: new Date().toISOString(),
              payment_provider: 'STRIPE',
            },
          }
        );
      }
    }

    return json({ received: true });
  } catch (e) {
    console.error('[stripe.webhook]', e);
    return json({ error: e.message }, 500);
  }
}
