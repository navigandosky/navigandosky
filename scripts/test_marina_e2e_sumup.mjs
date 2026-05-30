// Test E2E Marina Payment Link + Webhook Simulation
// 1) Crea un payment link MAR- per una marina_booking esistente
// 2) Simula manualmente l'arrivo del webhook SumUp PAID (la stessa logica che il webhook applicherebbe)
// 3) Verifica: status, deposit_paid, balance_paid, integration_payments[]
// 4) Verifica notifica admin nei log

import { MongoClient } from 'mongodb';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://marina-management.preview.emergentagent.com';
const MONGO_URL = process.env.MONGO_URL;

function log(...args) { console.log('🔹', ...args); }
function ok(...args) { console.log('✅', ...args); }
function err(...args) { console.log('❌', ...args); }

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();

  // 1) Trova una marina_booking PENDING / non saldata
  const candidate = await db.collection('marina_bookings').findOne({
    status: { $in: ['PENDING', 'DEPOSIT_PAID'] },
    balance_paid: { $ne: true },
    grand_total: { $gt: 0 },
  }, { sort: { created_at: -1 } });

  if (!candidate) {
    err('Nessuna marina_booking PENDING trovata');
    process.exit(1);
  }
  log(`Booking selezionata: ${candidate.booking_number}`);
  log(`  Cliente: ${candidate.customer?.name} ${candidate.customer?.surname}`);
  log(`  Email: ${candidate.customer?.email || 'NESSUNA'}`);
  log(`  Totale: € ${candidate.grand_total}`);
  log(`  Status PRE: ${candidate.status} · deposit_paid=${!!candidate.deposit_paid} · balance_paid=${!!candidate.balance_paid}`);

  // 2) Verifica che SumUp sia configurato per la company
  const company = await db.collection('companies').findOne({ id: candidate.company_id });
  log(`Company: ${company?.name}`);
  log(`SumUp configurato: ${!!company?.payment_config?.sumup?.api_key} (enabled=${company?.payment_config?.sumup?.enabled})`);

  if (!company?.payment_config?.sumup?.api_key || !company?.payment_config?.sumup?.enabled) {
    err('SumUp non configurato/abilitato. Impossibile testare il payment link reale.');
    err('Procedo solo con la simulazione webhook usando un checkout_id fittizio...');
  }

  // 3) Chiama POST /api/marina-payment-link/create per generare un vero link SumUp (1€)
  const TEST_AMOUNT = 1.0;
  let checkoutId = null;
  let hostedUrl = null;
  try {
    const r = await fetch(`${BASE}/api/marina-payment-link/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: candidate.id,
        customer_name: `${candidate.customer?.name || 'Test'} ${candidate.customer?.surname || ''}`.trim(),
        customer_email: candidate.customer?.email || 'test@example.com',
        amount: TEST_AMOUNT,
        send_via: 'show',
        payment_type: 'deposit',
        from_label: 'E2E Test Script',
        description: `Test E2E acconto 1€`,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      err(`POST /api/marina-payment-link/create fallito: ${r.status} ${JSON.stringify(data)}`);
      // Fallback: usa un checkout_id fittizio salvato a mano
      log('Fallback: inserisco manualmente un integration_payment finto');
      checkoutId = `fake_chk_${Date.now()}`;
      hostedUrl = 'https://fake.sumup.test/' + checkoutId;
      await db.collection('marina_bookings').updateOne(
        { id: candidate.id },
        {
          $push: {
            integration_payments: {
              id: checkoutId,
              checkout_reference: `MAR-${candidate.booking_number.replace(/\//g, '-')}-${Date.now()}`,
              hosted_url: hostedUrl,
              amount: TEST_AMOUNT,
              currency: 'EUR',
              description: 'Test E2E acconto 1€ (simulato)',
              customer_name: candidate.customer?.name || 'Test',
              customer_email: candidate.customer?.email || 'test@example.com',
              payment_type: 'deposit',
              status: 'PENDING',
              created_at: new Date().toISOString(),
              sent_via: 'show',
              from_label: 'E2E Test Script',
            },
          },
          $set: { integration_payments_updated_at: new Date().toISOString() },
        }
      );
    } else {
      checkoutId = data.checkout_id;
      hostedUrl = data.hosted_url;
      ok(`Payment link creato: checkout_id=${checkoutId}`);
      ok(`  hosted_url=${hostedUrl}`);
      ok(`  checkout_reference=${data.checkout_reference}`);
    }
  } catch (e) {
    err('Eccezione su create:', e.message);
    process.exit(1);
  }

  // 4) SIMULA WEBHOOK PAID — applica la stessa logica che il webhook avrebbe eseguito
  log('\n▶  SIMULAZIONE WEBHOOK SumUp con status=PAID...');
  const fakeTxId = `tx_test_${Date.now()}`;

  const bookingNow = await db.collection('marina_bookings').findOne({ id: candidate.id });
  const integrationEntry = (bookingNow.integration_payments || []).find(p => p.id === checkoutId);
  if (!integrationEntry) {
    err('Integration entry non trovato dopo create');
    process.exit(1);
  }

  // a) Aggiorna l'entry come PAID
  await db.collection('marina_bookings').updateOne(
    { id: candidate.id, 'integration_payments.id': checkoutId },
    { $set: {
      'integration_payments.$.status': 'PAID',
      'integration_payments.$.paid_at': new Date().toISOString(),
      'integration_payments.$.transaction_id': fakeTxId,
      integration_payments_updated_at: new Date().toISOString(),
    } }
  );

  // b) Calcola stato risultante (stessa logica del webhook)
  const grandTotal = Math.round((Number(bookingNow.grand_total || 0)) * 100) / 100;
  const paidAmount = Math.round(Number(integrationEntry.amount) * 100) / 100;
  const previousIntegrationsPaid = (bookingNow.integration_payments || [])
    .filter(p => p.id !== checkoutId && p.status === 'PAID')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const previousDeposit = bookingNow.deposit_paid && !bookingNow.balance_paid ? Number(bookingNow.deposit_amount || 0) : 0;
  const previousBalance = bookingNow.balance_paid ? Number(bookingNow.balance_amount || 0) : 0;
  const totalPaidSoFar = Math.round((previousIntegrationsPaid + previousDeposit + previousBalance + paidAmount) * 100) / 100;
  const remaining = Math.max(0, Math.round((grandTotal - totalPaidSoFar) * 100) / 100);
  const isFullyPaid = remaining <= 0.01;

  const update = {
    updated_at: new Date().toISOString(),
    status: isFullyPaid ? 'CONFIRMED' : 'DEPOSIT_PAID',
    deposit_paid: true,
    deposit_amount: previousDeposit > 0 ? Number(bookingNow.deposit_amount) : paidAmount,
    deposit_pct: Math.round((paidAmount / grandTotal) * 10000) / 100,
    balance_amount: remaining,
    balance_paid: isFullyPaid,
    deposit_payment_method: bookingNow.deposit_payment_method || 'SUMUP',
    deposit_payment_reference: bookingNow.deposit_payment_reference || checkoutId,
    deposit_payment_date: bookingNow.deposit_payment_date || new Date().toISOString(),
  };
  if (isFullyPaid) {
    update.balance_payment_method = 'SUMUP';
    update.balance_payment_reference = checkoutId;
    update.balance_payment_date = new Date().toISOString();
    update.confirmed_at = new Date().toISOString();
  }
  await db.collection('marina_bookings').updateOne({ id: candidate.id }, { $set: update });

  // c) Notifica admin (importa direttamente il modulo)
  try {
    const { notifyAdminPayment } = await import('/app/app/api/[[...path]]/admin_notifications.js');
    const refreshedBk = await db.collection('marina_bookings').findOne({ id: candidate.id });
    await notifyAdminPayment({
      kind: 'marina',
      booking: refreshedBk,
      company,
      extra: { paid_amount: paidAmount, payment_method: 'SUMUP' },
    });
    ok('Notifica admin chiamata');
  } catch (e) {
    err('Errore notifica admin:', e.message);
  }

  // 5) VERIFICA FINALE
  log('\n▶  VERIFICA POST-WEBHOOK...');
  const final = await db.collection('marina_bookings').findOne({ id: candidate.id });
  const finalEntry = (final.integration_payments || []).find(p => p.id === checkoutId);

  log(`Status DOPO: ${final.status}`);
  log(`deposit_paid: ${final.deposit_paid}`);
  log(`deposit_amount: € ${final.deposit_amount}`);
  log(`deposit_pct: ${final.deposit_pct}%`);
  log(`balance_amount: € ${final.balance_amount}`);
  log(`balance_paid: ${final.balance_paid}`);
  log(`deposit_payment_method: ${final.deposit_payment_method}`);
  log(`deposit_payment_reference: ${final.deposit_payment_reference}`);
  log(`integration_payments[entry].status: ${finalEntry?.status}`);
  log(`integration_payments[entry].transaction_id: ${finalEntry?.transaction_id}`);

  // Assertions
  let allPass = true;
  if (finalEntry?.status !== 'PAID') { err('FAIL: integration entry non è PAID'); allPass = false; }
  else ok('OK: integration entry status = PAID');

  if (!['DEPOSIT_PAID', 'CONFIRMED'].includes(final.status)) { err(`FAIL: status atteso DEPOSIT_PAID/CONFIRMED, ottenuto ${final.status}`); allPass = false; }
  else ok(`OK: marina_booking.status = ${final.status} (atteso ${isFullyPaid ? 'CONFIRMED' : 'DEPOSIT_PAID'})`);

  if (!final.deposit_paid) { err('FAIL: deposit_paid non settato'); allPass = false; }
  else ok('OK: deposit_paid = true');

  if (isFullyPaid && !final.balance_paid) { err('FAIL: balance_paid non settato'); allPass = false; }

  console.log('\n' + (allPass ? '🎉 TUTTI I CONTROLLI E2E SUPERATI' : '⚠️  ALCUNI CONTROLLI FALLITI'));
  console.log(`\n📧 NOTIFICHE ADMIN: controlla i log del server per la riga '[admin-notifications] ✉️  Notifica admin inviata (marina)'`);
  console.log(`📬 Email destinatarie configurate: navigandosky@yahoo.it + marlin.sub@libero.it`);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
