// /app/app/api/[[...path]]/marina_transit_passes.js
// CRUD per i Pass di Transito Marina + invio email
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

let _client = null;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const COL = 'marina_transit_passes';

// ────────────────────────────────────────────────────────────────────────
// Genera numero progressivo annuale del tipo "PT-2026/0001"
async function nextPassNumber(db, companyId) {
  const year = new Date().getFullYear();
  const prefix = `PT-${year}/`;
  const last = await db.collection(COL)
    .find({ company_id: companyId, pass_number: { $regex: `^${prefix}` } })
    .sort({ pass_number: -1 })
    .limit(1)
    .toArray();
  let next = 1;
  if (last.length > 0) {
    const m = String(last[0].pass_number).match(/\/(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function handleMarinaTransitPasses(method, id, body, action, sp, _ignoredDb) {
  const db = await getDb();

  // ── LIST: GET /api/marina-transit-passes?marina_id=X | ?company_id=X
  if (method === 'GET' && !id) {
    const marinaId = sp.get('marina_id');
    const companyId = sp.get('company_id');
    const archived = sp.get('archived'); // 'true'|'false'
    const query = {};
    if (marinaId) query.marina_id = marinaId;
    if (companyId) query.company_id = companyId;
    if (archived === 'true') query.archived = true;
    if (archived === 'false') query.archived = { $ne: true };
    const items = await db.collection(COL)
      .find(query)
      .sort({ issued_at: -1 })
      .limit(500)
      .toArray();
    return json(items);
  }

  // ── GET ONE: GET /api/marina-transit-passes/:id
  if (method === 'GET' && id) {
    const item = await db.collection(COL).findOne({ id });
    if (!item) return json({ error: 'Pass non trovato' }, 404);
    return json(item);
  }

  // ── CREATE: POST /api/marina-transit-passes
  if (method === 'POST' && !id) {
    const required = ['marina_id', 'company_id', 'valid_from', 'valid_to', 'customer'];
    for (const f of required) {
      if (!body?.[f]) return json({ error: `Campo obbligatorio mancante: ${f}` }, 400);
    }
    const cust = body.customer || {};
    if (!cust.name && !cust.fullname) return json({ error: 'Nome cliente obbligatorio' }, 400);

    // Validazione date
    const from = body.valid_from;
    const to = body.valid_to;
    if (from > to) return json({ error: 'Data inizio deve precedere la data fine' }, 400);

    const passNumber = await nextPassNumber(db, body.company_id);
    const passId = randomUUID();
    const now = new Date().toISOString();

    // Snapshot marina + company name per archiviazione
    const marina = await db.collection('marinas').findOne({ id: body.marina_id });
    const company = await db.collection('companies').findOne({ id: body.company_id });

    const pass = {
      id: passId,
      pass_number: passNumber,
      marina_id: body.marina_id,
      marina_name: marina?.name || body.marina_name || '',
      marina_slug: marina?.slug || '',
      company_id: body.company_id,
      company_name: company?.name || '',
      customer: {
        name: cust.name || cust.fullname || '',
        surname: cust.surname || '',
        email: cust.email || '',
        phone: cust.phone || '',
        document: cust.document || cust.cf || '',
        cf: cust.cf || '',
        source: cust.source || 'manual', // 'manual' | 'customers' | 'marina_booking'
        source_id: cust.source_id || null,
      },
      boat: body.boat || null,
      license_plate: body.license_plate || body.boat?.license_plate || '',
      valid_from: from,
      valid_to: to,
      notes: body.notes || '',
      issued_at: now,
      issued_by: body.issued_by || null,
      archived: false,
      created_at: now,
      updated_at: now,
    };
    await db.collection(COL).insertOne(pass);
    return json(pass, 201);
  }

  // ── UPDATE: PUT /api/marina-transit-passes/:id
  if (method === 'PUT' && id) {
    const existing = await db.collection(COL).findOne({ id });
    if (!existing) return json({ error: 'Pass non trovato' }, 404);
    const updates = { ...body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates._id;
    delete updates.created_at;
    delete updates.pass_number; // immutable
    await db.collection(COL).updateOne({ id }, { $set: updates });
    const updated = await db.collection(COL).findOne({ id });
    return json(updated);
  }

  // ── ACTION: archive / unarchive
  if (method === 'POST' && id && (action === 'archive' || action === 'unarchive')) {
    await db.collection(COL).updateOne({ id }, { $set: {
      archived: action === 'archive',
      archived_at: action === 'archive' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    } });
    return json({ ok: true, archived: action === 'archive' });
  }

  // ── ACTION: send email (con PDF base64 dal client)
  if (method === 'POST' && id && action === 'send-email') {
    const item = await db.collection(COL).findOne({ id });
    if (!item) return json({ error: 'Pass non trovato' }, 404);
    const toEmail = body?.email || item.customer?.email;
    if (!toEmail) return json({ error: 'Email destinatario mancante' }, 400);
    if (!body?.pdf_base64) return json({ error: 'PDF mancante (pdf_base64 obbligatorio)' }, 400);

    const company = await db.collection('companies').findOne({ id: item.company_id });
    const apiKey = company?.resend_api_key || process.env.RESEND_API_KEY;
    if (!apiKey) return json({ error: 'Resend API key non configurata' }, 500);

    const fromEmail = company?.resend_from_email || 'noreply@maretrek.it';
    const fromName = company?.name || 'Maretrek';

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [toEmail],
          subject: `🎫 Pass di Transito ${item.pass_number} - ${item.marina_name}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
              <h2 style="color:#143C6E;margin:0 0 8px;">Pass di Transito ${item.pass_number}</h2>
              <p style="color:#444;font-size:14px;">Gentile <strong>${item.customer.name} ${item.customer.surname || ''}</strong>,</p>
              <p style="color:#444;font-size:14px;">In allegato il suo Pass di Transito per la Marina <strong>${item.marina_name}</strong>.</p>
              <table style="background:#F5F8FC;border:1px solid #E2E8F0;border-radius:6px;padding:12px;margin:14px 0;width:100%;font-size:13px;">
                <tr><td style="padding:4px 8px;color:#666;">Validità dal:</td><td style="padding:4px 8px;font-weight:600;">${formatDateIt(item.valid_from)}</td></tr>
                <tr><td style="padding:4px 8px;color:#666;">Validità al:</td><td style="padding:4px 8px;font-weight:600;">${formatDateIt(item.valid_to)}</td></tr>
                ${item.boat?.name ? `<tr><td style="padding:4px 8px;color:#666;">Imbarcazione:</td><td style="padding:4px 8px;font-weight:600;">${item.boat.name}</td></tr>` : ''}
                ${item.license_plate ? `<tr><td style="padding:4px 8px;color:#666;">Targa/Sigla:</td><td style="padding:4px 8px;font-weight:600;">${item.license_plate}</td></tr>` : ''}
              </table>
              <p style="color:#444;font-size:13px;">Mostrare questo pass (cartaceo o su smartphone) al personale di servizio alla sbarra. Il QR code può essere scansionato per la verifica automatica.</p>
              <p style="color:#888;font-size:12px;margin-top:24px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
            </div>
          `,
          attachments: [
            { filename: `Pass_Transito_${item.pass_number}.pdf`, content: body.pdf_base64 }
          ],
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        console.error('[transit-pass send-email] Resend error:', txt);
        return json({ error: `Resend error: ${txt}` }, 502);
      }
      const data = await r.json();
      await db.collection(COL).updateOne({ id }, { $set: {
        last_email_sent_at: new Date().toISOString(),
        last_email_to: toEmail,
        email_send_count: (item.email_send_count || 0) + 1,
        updated_at: new Date().toISOString(),
      } });
      return json({ ok: true, resend_id: data.id });
    } catch (e) {
      console.error('[transit-pass send-email] exception:', e);
      return json({ error: e.message }, 500);
    }
  }

  // ── DELETE: DELETE /api/marina-transit-passes/:id
  if (method === 'DELETE' && id) {
    const r = await db.collection(COL).deleteOne({ id });
    return json({ ok: r.deletedCount > 0 });
  }

  return json({ error: 'Method/Path not supported' }, 405);
}

function formatDateIt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
