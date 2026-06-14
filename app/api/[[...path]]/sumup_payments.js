// SumUp Online Payments Integration
// - Crea hosted checkout (link pagamento)
// - Riceve webhook di conferma pagamento
// - Aggiorna booking e invia voucher finale
import { MongoClient } from 'mongodb';
import { buildSumupDescription, buildSumupCustomer, extractCustomerName, extractCustomerEmail } from './sumup_helpers';

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
    const custName = extractCustomerName(booking);
    const custEmail = extractCustomerEmail(booking);
    const descLine = buildSumupDescription({
      customerName: custName,
      prefix: 'Prenotazione',
      ref: booking.booking_ref,
      context: booking.experience_name || 'Esperienza',
    });
    const customerObj = buildSumupCustomer(custName, custEmail, booking.customer_phone);
    const payload = {
      checkout_reference: `${booking.booking_ref}-${Date.now()}`, // unique per ogni tentativo
      amount: Number(booking.total_amount),
      currency: booking.currency || 'EUR',
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

// === HANDLER: POST /api/sumup/create-embedded-checkout
// Crea un checkout SumUp SENZA hosted_checkout, per essere completato tramite
// SumUp Card Widget embedded sulla nostra pagina /pay/<ref>.
// Vantaggio: commissioni più basse del link hosted, customer-experience on-brand.
// body: { booking_id }
// Risponde: { checkout_id, pay_url, pay_token, amount, currency, expires_at }
export async function handleCreateSumupEmbeddedCheckout(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { booking_id } = body || {};
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ id: booking_id });
    if (!booking) return json({ error: 'Booking non trovato' }, 404);
    if (booking.status === 'CONFIRMED' && booking.payment_status === 'PAID') {
      return json({ error: 'Prenotazione già pagata' }, 400);
    }

    const company = await db.collection('companies').findOne({ id: booking.company_id });
    const sumupConfig = company?.payment_config?.sumup;
    if (!sumupConfig?.api_key || !sumupConfig?.enabled) {
      return json({ error: 'SumUp non configurato per questa company' }, 400);
    }

    // Ricava merchant_code (riusa logica della funzione hosted)
    let merchantCode = sumupConfig.merchant_code;
    if (!merchantCode) {
      const meRes = await fetch(`${SUMUP_API}/me`, { headers: { Authorization: `Bearer ${sumupConfig.api_key}` } });
      if (meRes.ok) {
        const me = await meRes.json();
        merchantCode = me?.merchant_profile?.merchant_code || me?.merchant_code;
        if (merchantCode) {
          await db.collection('companies').updateOne({ id: booking.company_id }, { $set: { 'payment_config.sumup.merchant_code': merchantCode } });
        }
      }
    }
    if (!merchantCode) return json({ error: 'Impossibile ricavare merchant_code' }, 500);

    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/sumup/webhook`;

    const custName = extractCustomerName(booking);
    const custEmail = extractCustomerEmail(booking);
    const descLine = buildSumupDescription({
      customerName: custName,
      prefix: 'Prenotazione',
      ref: booking.booking_ref,
      context: booking.experience_name || 'Esperienza',
    });
    const customerObj = buildSumupCustomer(custName, custEmail, booking.customer_phone);
    const checkoutRef = `${booking.booking_ref}-EMB-${Date.now()}`;
    const payload = {
      checkout_reference: checkoutRef,
      amount: Number(booking.total_amount),
      currency: booking.currency || 'EUR',
      merchant_code: merchantCode,
      description: descLine,
      // NESSUN hosted_checkout: usiamo il Card Widget JS sul nostro dominio
      return_url: webhookUrl,
      ...(customerObj ? { customer: customerObj } : {}),
    };

    const res = await fetch(`${SUMUP_API}/checkouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sumupConfig.api_key}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('[sumup embedded-checkout] error:', res.status, errBody);
      return json({ error: 'Errore creazione checkout SumUp', details: errBody }, 502);
    }
    const checkout = await res.json();

    // Genera token "ospite" lato app e persisti riferimenti su booking
    const payToken = (await import('crypto')).randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    await db.collection('bookings').updateOne(
      { id: booking_id },
      {
        $set: {
          sumup_checkout_id: checkout.id,
          sumup_checkout_reference: checkoutRef,
          sumup_embedded: true,
          sumup_pay_token: payToken,
          sumup_pay_expires_at: expiresAt,
          payment_status: 'PENDING_PAYMENT',
          payment_method: 'CARD_EMBEDDED',
          updated_at: new Date().toISOString(),
        },
      }
    );

    const payUrl = `${appUrl}/pay/${booking.booking_ref}?t=${payToken}`;

    return json({
      ok: true,
      checkout_id: checkout.id,
      pay_url: payUrl,
      pay_token: payToken,
      amount: checkout.amount,
      currency: checkout.currency,
      expires_at: expiresAt,
      booking_ref: booking.booking_ref,
    });
  } catch (e) {
    console.error('[sumup embedded-checkout] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === HANDLER: GET /api/sumup/pay-info?booking_ref=X&t=token
// Espone i dati MINIMI necessari per la pagina /pay/[ref] (no auth, ma token verificato)
export async function handleSumupPayInfo(method, sp) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  try {
    const bookingRef = sp.get('booking_ref');
    const token = sp.get('t');
    if (!bookingRef || !token) return json({ error: 'Parametri mancanti' }, 400);

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ booking_ref: bookingRef });
    if (!booking) return json({ error: 'Prenotazione non trovata' }, 404);
    if (booking.sumup_pay_token !== token) return json({ error: 'Token non valido' }, 403);
    if (booking.sumup_pay_expires_at && new Date(booking.sumup_pay_expires_at) < new Date()) {
      return json({ error: 'Link scaduto. Richiedi un nuovo link al merchant.' }, 410);
    }
    const company = booking.company_id ? await db.collection('companies').findOne({ id: booking.company_id }) : null;

    return json({
      booking_ref: booking.booking_ref,
      experience_name: booking.experience_name || '',
      slot_datetime: booking.slot_datetime,
      seats: booking.seats,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      amount: booking.total_amount,
      currency: booking.currency || 'EUR',
      checkout_id: booking.sumup_checkout_id,
      payment_status: booking.payment_status || 'PENDING_PAYMENT',
      already_paid: booking.status === 'CONFIRMED' && booking.payment_status === 'PAID',
      company_name: company?.name || 'Maretrek',
      company_logo: company?.logo_url || null,
    });
  } catch (e) {
    console.error('[sumup pay-info] exception:', e);
    return json({ error: e.message }, 500);
  }
}


// === HANDLER: POST /api/sumup/confirm-payment
// Chiamato dal Card Widget DOPO che il widget restituisce success al cliente.
// Verifica server-side lo stato del checkout via API SumUp e aggiorna il booking.
// body: { booking_ref, token, checkout_id? }
export async function handleSumupConfirmPayment(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { booking_ref, token } = body || {};
    if (!booking_ref || !token) return json({ error: 'Parametri mancanti' }, 400);

    const db = await getDb();
    const booking = await db.collection('bookings').findOne({ booking_ref });
    if (!booking) return json({ error: 'Prenotazione non trovata' }, 404);
    if (booking.sumup_pay_token !== token) return json({ error: 'Token non valido' }, 403);

    const checkoutId = booking.sumup_checkout_id;
    if (!checkoutId) return json({ error: 'Checkout non trovato' }, 404);

    // Già pagata? idempotenza
    if (booking.status === 'CONFIRMED' && booking.payment_status === 'PAID') {
      return json({ ok: true, status: 'PAID', already_confirmed: true });
    }

    const company = await db.collection('companies').findOne({ id: booking.company_id });
    const apiKey = company?.payment_config?.sumup?.api_key;
    if (!apiKey) return json({ error: 'SumUp non configurato' }, 500);

    // Polling stato checkout - SumUp può impiegare qualche secondo a marcare PAID
    let status = null;
    let transactionId = null;
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${SUMUP_API}/checkouts/${checkoutId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const co = await r.json();
        status = co.status;
        transactionId = co?.transactions?.[0]?.id || null;
        if (status === 'PAID' || status === 'FAILED' || status === 'EXPIRED') break;
      }
      await new Promise(res => setTimeout(res, 800));
    }

    if (status === 'PAID') {
      await db.collection('bookings').updateOne(
        { id: booking.id },
        { $set: {
          status: 'CONFIRMED',
          payment_status: 'PAID',
          payment_method: 'CARD_EMBEDDED',
          sumup_paid_at: new Date().toISOString(),
          sumup_transaction_id: transactionId,
        } }
      );
      // Email voucher (fire-and-forget)
      if (booking.customer_email) {
        try {
          const { sendBookingVoucherInternal } = await import('./send_booking_voucher');
          sendBookingVoucherInternal(booking.id, 'FINAL').catch(err =>
            console.error('[sumup confirm] voucher email error:', err?.message)
          );
        } catch (e) { console.error('[sumup confirm] voucher import error:', e?.message); }
      }
      // Notifica admin
      try {
        const { notifyAdminPayment } = await import('./admin_notifications');
        const refreshedBk = await db.collection('bookings').findOne({ id: booking.id });
        notifyAdminPayment({ kind: 'experience', booking: refreshedBk, company, extra: {
          paid_amount: refreshedBk?.total_amount,
          payment_method: 'CARD_EMBEDDED',
        } }).catch(() => {});
      } catch (_e) {}
      return json({ ok: true, status: 'PAID', transaction_id: transactionId });
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      await db.collection('bookings').updateOne(
        { id: booking.id },
        { $set: { payment_status: 'FAILED', sumup_failed_at: new Date().toISOString() } }
      );
      return json({ ok: false, status }, 402);
    }

    // Ancora PENDING: rispondi 202 così il client può fare retry
    return json({ ok: false, status: status || 'PENDING' }, 202);
  } catch (e) {
    console.error('[sumup confirm-payment] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === HANDLER: GET /api/sumup/pay-integration-info?checkout_id=X&t=token
// Espone dati MINIMI per la pagina /pay-integration/[checkoutId] (no auth)
export async function handleSumupPayIntegrationInfo(method, sp) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  try {
    const checkoutId = sp.get('checkout_id');
    const token = sp.get('t');
    if (!checkoutId || !token) return json({ error: 'Parametri mancanti' }, 400);

    const db = await getDb();
    // Cerca nelle 3 collezioni che usano integration_payments[]
    let booking = await db.collection('bookings').findOne({ 'integration_payments.id': checkoutId });
    let kind = 'experience';
    if (!booking) {
      booking = await db.collection('rental_bookings').findOne({ 'integration_payments.id': checkoutId });
      if (booking) kind = 'rental';
    }
    if (!booking) {
      booking = await db.collection('marina_bookings').findOne({ 'integration_payments.id': checkoutId });
      if (booking) kind = 'marina';
    }
    if (!booking) return json({ error: 'Pagamento non trovato' }, 404);

    const entry = (booking.integration_payments || []).find(p => p.id === checkoutId);
    if (!entry) return json({ error: 'Pagamento non trovato' }, 404);
    if (entry.pay_token !== token) return json({ error: 'Token non valido' }, 403);
    if (entry.mode !== 'embedded') return json({ error: 'Pagamento non in modalità embedded' }, 400);

    const refLabel = kind === 'experience' ? booking.booking_ref : booking.booking_number;
    const company = booking.company_id ? await db.collection('companies').findOne({ id: booking.company_id }) : null;

    return json({
      booking_ref: refLabel,
      checkout_id: checkoutId,
      amount: entry.amount,
      currency: entry.currency || 'EUR',
      customer_name: entry.customer_name || booking.customer_name,
      customer_email: entry.customer_email || booking.customer_email,
      description: entry.description || '',
      already_paid: entry.status === 'PAID',
      payment_status: entry.status || 'PENDING',
      company_name: company?.name || 'Maretrek',
      company_logo: company?.logo_url || null,
      kind, // 'experience' | 'rental' | 'marina'
    });
  } catch (e) {
    console.error('[sumup pay-integration-info] exception:', e);
    return json({ error: e.message }, 500);
  }
}

// === HANDLER: POST /api/sumup/confirm-integration-payment
// Verifica lo stato del checkout e marca la voce integration_payments[] come PAID
// body: { checkout_id, token }
export async function handleSumupConfirmIntegrationPayment(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const { checkout_id, token } = body || {};
    if (!checkout_id || !token) return json({ error: 'Parametri mancanti' }, 400);

    const db = await getDb();
    let booking = await db.collection('bookings').findOne({ 'integration_payments.id': checkout_id });
    let targetCol = 'bookings';
    if (!booking) {
      booking = await db.collection('rental_bookings').findOne({ 'integration_payments.id': checkout_id });
      if (booking) targetCol = 'rental_bookings';
    }
    if (!booking) {
      booking = await db.collection('marina_bookings').findOne({ 'integration_payments.id': checkout_id });
      if (booking) targetCol = 'marina_bookings';
    }
    if (!booking) return json({ error: 'Pagamento non trovato' }, 404);

    const entry = (booking.integration_payments || []).find(p => p.id === checkout_id);
    if (!entry) return json({ error: 'Pagamento non trovato' }, 404);
    if (entry.pay_token !== token) return json({ error: 'Token non valido' }, 403);

    if (entry.status === 'PAID') {
      return json({ ok: true, status: 'PAID', already_confirmed: true });
    }

    const company = await db.collection('companies').findOne({ id: booking.company_id });
    const apiKey = company?.payment_config?.sumup?.api_key;
    if (!apiKey) return json({ error: 'SumUp non configurato' }, 500);

    // Polling stato checkout
    let status = null;
    let transactionId = null;
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${SUMUP_API}/checkouts/${checkout_id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const co = await r.json();
        status = co.status;
        transactionId = co?.transactions?.[0]?.id || null;
        if (status === 'PAID' || status === 'FAILED' || status === 'EXPIRED') break;
      }
      await new Promise(res => setTimeout(res, 800));
    }

    if (status === 'PAID') {
      await db.collection(targetCol).updateOne(
        { id: booking.id, 'integration_payments.id': checkout_id },
        { $set: {
          'integration_payments.$.status': 'PAID',
          'integration_payments.$.paid_at': new Date().toISOString(),
          'integration_payments.$.transaction_id': transactionId,
          integration_payments_updated_at: new Date().toISOString(),
        } }
      );
      return json({ ok: true, status: 'PAID', transaction_id: transactionId });
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      await db.collection(targetCol).updateOne(
        { id: booking.id, 'integration_payments.id': checkout_id },
        { $set: {
          'integration_payments.$.status': 'FAILED',
          'integration_payments.$.failed_at': new Date().toISOString(),
        } }
      );
      return json({ ok: false, status }, 402);
    }

    return json({ ok: false, status: status || 'PENDING' }, 202);
  } catch (e) {
    console.error('[sumup confirm-integration-payment] exception:', e);
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

    // 1) Cerca booking principale (campo sumup_checkout_id)
    let booking = await db.collection('bookings').findOne({ sumup_checkout_id: checkoutId });
    let isIntegration = false;
    let isRental = false;
    let integrationEntry = null;

    // 2) Se non trovato, prova come integrazione (campo integration_payments[].id)
    if (!booking) {
      booking = await db.collection('bookings').findOne({ 'integration_payments.id': checkoutId });
      if (booking) {
        isIntegration = true;
        integrationEntry = (booking.integration_payments || []).find(p => p.id === checkoutId);
      }
    }

    // 3) Se ancora non trovato, prova come rental_bookings integration_payments
    if (!booking) {
      booking = await db.collection('rental_bookings').findOne({ 'integration_payments.id': checkoutId });
      if (booking) {
        isRental = true;
        isIntegration = true;
        integrationEntry = (booking.integration_payments || []).find(p => p.id === checkoutId);
      }
    }

    // 4) Se ancora non trovato, prova come marina_bookings integration_payments
    let isMarina = false;
    if (!booking) {
      booking = await db.collection('marina_bookings').findOne({ 'integration_payments.id': checkoutId });
      if (booking) {
        isMarina = true;
        isIntegration = true;
        integrationEntry = (booking.integration_payments || []).find(p => p.id === checkoutId);
      }
    }

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

    if (isIntegration) {
      const targetCol = isRental ? 'rental_bookings' : (isMarina ? 'marina_bookings' : 'bookings');
      const refLabel = isRental || isMarina ? booking.booking_number : booking.booking_ref;
      // Aggiorna SOLO la voce integration nell'array, non lo status principale del booking
      if (status === 'PAID' && integrationEntry?.status !== 'PAID') {
        const txId = checkout?.transactions?.[0]?.id || null;
        await db.collection(targetCol).updateOne(
          { id: booking.id, 'integration_payments.id': checkoutId },
          { $set: {
            'integration_payments.$.status': 'PAID',
            'integration_payments.$.paid_at': new Date().toISOString(),
            'integration_payments.$.transaction_id': txId,
            integration_payments_updated_at: new Date().toISOString(),
          } }
        );
        // Per rental: aggiorna anche payment_status del booking principale
        if (isRental) {
          const paidTotal = (booking.integration_payments || [])
            .filter(p => p.id === checkoutId ? true : p.status === 'PAID')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          const newPaymentStatus = paidTotal >= Number(booking.total_amount || 0) - 0.01
            ? 'PAID'
            : (paidTotal > 0 ? 'PARTIAL' : booking.payment_status);
          await db.collection('rental_bookings').updateOne(
            { id: booking.id },
            { $set: { payment_status: newPaymentStatus, updated_at: new Date().toISOString() } }
          );
          // Notifica admin
          if (newPaymentStatus === 'PAID' || newPaymentStatus === 'PARTIAL') {
            try {
              const { notifyAdminPayment } = await import('./admin_notifications');
              const refreshedBk = await db.collection('rental_bookings').findOne({ id: booking.id });
              const company = await db.collection('companies').findOne({ id: booking.company_id });
              notifyAdminPayment({ kind: 'rental', booking: refreshedBk, company, extra: {
                paid_amount: integrationEntry?.amount,
                payment_method: 'SUMUP',
              } }).catch(() => {});
            } catch (_e) {}
          }
        }
        // Per marina: aggiorna anche stato del booking principale
        if (isMarina) {
          const grandTotal = Math.round((Number(booking.grand_total || 0)) * 100) / 100;
          const paidAmount = Math.round(Number(integrationEntry?.amount || 0) * 100) / 100;

          // Calcolo cumulativo di tutti i pagamenti riusciti (integration_payments PAID + deposit_amount se già pagato)
          const previousIntegrationsPaid = (booking.integration_payments || [])
            .filter(p => p.id !== checkoutId && p.status === 'PAID')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          const previousDeposit = booking.deposit_paid && !booking.balance_paid ? Number(booking.deposit_amount || 0) : 0;
          const previousBalance = booking.balance_paid ? Number(booking.balance_amount || 0) : 0;
          const totalPaidSoFar = Math.round((previousIntegrationsPaid + previousDeposit + previousBalance + paidAmount) * 100) / 100;
          const remaining = Math.max(0, Math.round((grandTotal - totalPaidSoFar) * 100) / 100);
          const isFullyPaid = remaining <= 0.01;

          const update = {
            updated_at: new Date().toISOString(),
            status: isFullyPaid ? 'CONFIRMED' : 'DEPOSIT_PAID',
            deposit_paid: true,
            deposit_amount: previousDeposit > 0 ? Number(booking.deposit_amount) : paidAmount,
            deposit_pct: Math.round((paidAmount / grandTotal) * 10000) / 100,
            balance_amount: remaining,
            balance_paid: isFullyPaid,
            deposit_payment_method: booking.deposit_payment_method || 'SUMUP',
            deposit_payment_reference: booking.deposit_payment_reference || checkoutId,
            deposit_payment_date: booking.deposit_payment_date || new Date().toISOString(),
          };
          if (isFullyPaid) {
            update.balance_payment_method = 'SUMUP';
            update.balance_payment_reference = checkoutId;
            update.balance_payment_date = new Date().toISOString();
            update.confirmed_at = new Date().toISOString();
          }
          await db.collection('marina_bookings').updateOne(
            { id: booking.id },
            { $set: update }
          );
          // Notifica admin
          try {
            const { notifyAdminPayment } = await import('./admin_notifications');
            const refreshedBk = await db.collection('marina_bookings').findOne({ id: booking.id });
            const company = await db.collection('companies').findOne({ id: booking.company_id });
            notifyAdminPayment({ kind: 'marina', booking: refreshedBk, company, extra: {
              paid_amount: paidAmount,
              payment_method: 'SUMUP',
            } }).catch(() => {});
          } catch (_e) {}
        }
        console.log(`[sumup webhook] integrazione PAID (${isRental ? 'rental' : (isMarina ? 'marina' : 'exp')}):`, refLabel, 'amount:', integrationEntry?.amount);
      } else if ((status === 'FAILED' || status === 'EXPIRED') && integrationEntry?.status !== 'FAILED') {
        await db.collection(targetCol).updateOne(
          { id: booking.id, 'integration_payments.id': checkoutId },
          { $set: {
            'integration_payments.$.status': 'FAILED',
            'integration_payments.$.failed_at': new Date().toISOString(),
          } }
        );
      }
      return new Response(null, { status: 204 });
    }

    // Idempotenza: aggiorna solo se cambia stato (logica esistente)
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
      // Notifica admin
      try {
        const { notifyAdminPayment } = await import('./admin_notifications');
        const refreshedBk = await db.collection('bookings').findOne({ id: booking.id });
        const company = await db.collection('companies').findOne({ id: booking.company_id });
        notifyAdminPayment({ kind: 'experience', booking: refreshedBk, company, extra: {
          paid_amount: refreshedBk?.total_amount,
          payment_method: 'SUMUP',
        } }).catch(() => {});
      } catch (_e) {}
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
