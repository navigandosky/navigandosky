// Endpoint temporaneo per testing notifica admin (rimuovere dopo verifica)
import { MongoClient } from 'mongodb';
let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

export async function handleTestAdminNotify(method, sp) {
  if (method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  const refOrId = sp.get('booking_ref') || sp.get('booking_id') || 'MK-2026-0028';
  const db = await getDb();
  const booking = await db.collection('bookings').findOne(
    sp.get('booking_id') ? { id: refOrId } : { booking_ref: refOrId }
  );
  if (!booking) return new Response(JSON.stringify({ error: 'booking not found', ref: refOrId }), { status: 404 });
  const company = await db.collection('companies').findOne({ id: booking.company_id });
  const { notifyAdminPayment } = await import('./admin_notifications');
  await notifyAdminPayment({ kind: 'experience', booking, company, extra: {
    paid_amount: booking.total_amount,
    payment_method: booking.payment_method || 'SUMUP',
  } });
  return new Response(JSON.stringify({
    ok: true,
    sent_to: ['navigandosky@yahoo.it', 'marlin.sub@libero.it'],
    booking_ref: booking.booking_ref,
    from: process.env.RESEND_FROM_EMAIL,
  }), { headers: { 'Content-Type': 'application/json' } });
}
