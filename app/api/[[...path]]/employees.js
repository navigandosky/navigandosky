// API Modulo Dipendenti — Anagrafica + Sedi + Tipi Contratto + Mansioni
// Collections: employees, employee_locations, contract_types, employee_roles

import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// === EMPLOYEES (anagrafica) ===
export async function handleEmployees(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('employees');

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    if (searchParams?.get('location_id')) filter.location_id = searchParams.get('location_id');
    if (searchParams?.get('role_id')) filter.role_id = searchParams.get('role_id');
    if (searchParams?.get('status')) filter.status = searchParams.get('status');
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Dipendente non trovato' }, 404);
    const { _id, ...rest } = item;
    return json(rest);
  }

  if (method === 'POST') {
    if (!body.company_id) return json({ error: 'company_id obbligatorio' }, 400);
    if (!body.first_name || !body.last_name) return json({ error: 'Nome e Cognome obbligatori' }, 400);

    const employee = {
      id: uuidv4(),
      company_id: body.company_id,
      // Anagrafica
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      gender: body.gender || '',           // M | F | OTHER
      birth_date: body.birth_date || null,
      birth_place: body.birth_place || '',
      fiscal_code: body.fiscal_code?.toUpperCase() || '',
      nationality: body.nationality || 'Italiana',
      // Indirizzo
      address: body.address || '',
      city: body.city || '',
      postal_code: body.postal_code || '',
      country: body.country || 'Italia',
      // Contatti
      email: body.email || '',
      phone: body.phone || '',
      phone_secondary: body.phone_secondary || '',
      // Istruzione/Ruolo
      education_title: body.education_title || '',  // es. "Diploma di Maturità", "Laurea in Economia"
      education_institute: body.education_institute || '',
      education_year: body.education_year || null,
      role_id: body.role_id || null,          // FK employee_roles
      role_label: body.role_label || '',       // snapshot human readable
      job_description: body.job_description || '', // mansione assegnata (testo libero)
      // Sede
      location_id: body.location_id || null,   // FK employee_locations
      location_label: body.location_label || '',
      // Stato
      status: body.status || 'LIBERO',         // DISOCCUPATO | INOCCUPATO | LIBERO | ASSUNTO | ALTRO
      status_note: body.status_note || '',
      // Documenti (array di { id, filename, description, url|base64, mime, size, uploaded_at })
      documents: Array.isArray(body.documents) ? body.documents : [],
      // Note generiche
      notes: body.notes || '',
      // Foto profilo (base64 piccola)
      avatar_base64: body.avatar_base64 || null,
      // Sistema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: body.created_by || null,
    };
    await col.insertOne(employee);
    delete employee._id;
    return json(employee, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Dipendente non trovato' }, 404);
    const { _id, id: _ignored, created_at, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    if (rest.fiscal_code) rest.fiscal_code = String(rest.fiscal_code).toUpperCase();
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }

  // === SUB-ACTION: add-document (POST) ===
  if (method === 'POST' && id && action === 'add-document') {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Dipendente non trovato' }, 404);
    if (!body.filename || !body.base64) return json({ error: 'filename + base64 obbligatori' }, 400);
    const doc = {
      id: uuidv4(),
      filename: body.filename,
      description: body.description || '',
      base64: body.base64,
      mime: body.mime || 'application/octet-stream',
      size: body.size || 0,
      uploaded_at: new Date().toISOString(),
      uploaded_by: body.uploaded_by || null,
    };
    await col.updateOne({ id }, { $push: { documents: doc }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true, document: doc });
  }

  // === SUB-ACTION: remove-document (DELETE with action) ===
  if (method === 'DELETE' && id && action === 'remove-document') {
    const docId = searchParams?.get('doc_id');
    if (!docId) return json({ error: 'doc_id query param mancante' }, 400);
    await col.updateOne({ id }, { $pull: { documents: { id: docId } }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// === EMPLOYEE LOCATIONS (sedi alimentabili) ===
export async function handleEmployeeLocations(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('employee_locations');

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    const items = await col.find(filter).sort({ name: 1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'POST') {
    if (!body.company_id || !body.name) return json({ error: 'company_id e name obbligatori' }, 400);
    const location = {
      id: uuidv4(),
      company_id: body.company_id,
      name: body.name.trim(),
      address: body.address || '',
      city: body.city || '',
      postal_code: body.postal_code || '',
      country: body.country || 'Italia',
      notes: body.notes || '',
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(location);
    delete location._id;
    return json(location, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: _i, created_at, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }
  return json({ error: 'Method not allowed' }, 405);
}

// === EMPLOYEE ROLES (mansioni/ruoli alimentabili) ===
export async function handleEmployeeRoles(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('employee_roles');

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    const items = await col.find(filter).sort({ name: 1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'POST') {
    if (!body.company_id || !body.name) return json({ error: 'company_id e name obbligatori' }, 400);
    const role = {
      id: uuidv4(),
      company_id: body.company_id,
      name: body.name.trim(),
      description: body.description || '',
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(role);
    delete role._id;
    return json(role, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: _i, created_at, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }
  return json({ error: 'Method not allowed' }, 405);
}

// === CONTRACT TYPES (tipi contratto: tempo determinato/indeterminato, apprendistato, ecc.) ===
export async function handleContractTypes(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('contract_types');

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    const items = await col.find(filter).sort({ name: 1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'POST') {
    if (!body.company_id || !body.name) return json({ error: 'company_id e name obbligatori' }, 400);
    const ct = {
      id: uuidv4(),
      company_id: body.company_id,
      name: body.name.trim(),                // es. "Tempo indeterminato", "Stagionale", "Apprendistato"
      description: body.description || '',
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(ct);
    delete ct._id;
    return json(ct, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: _i, created_at, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }
  return json({ error: 'Method not allowed' }, 405);
}

// === EMPLOYEE CONTRACTS (Assunzioni) ===
// Una "Assunzione" rappresenta un contratto (tempo determinato, indeterminato, stagionale, ecc.)
// Collegata a un employee. Può contenere allegati PDF (contratto firmato, addendum, ecc.).
export async function handleEmployeeContracts(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('employee_contracts');

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    if (searchParams?.get('employee_id')) filter.employee_id = searchParams.get('employee_id');
    if (searchParams?.get('status')) filter.status = searchParams.get('status');
    const items = await col.find(filter).sort({ start_date: -1, created_at: -1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Contratto non trovato' }, 404);
    const { _id, ...rest } = item;
    return json(rest);
  }

  if (method === 'POST' && !id) {
    if (!body.company_id || !body.employee_id) return json({ error: 'company_id e employee_id obbligatori' }, 400);
    const contract = {
      id: uuidv4(),
      company_id: body.company_id,
      employee_id: body.employee_id,
      employee_name: body.employee_name || '',
      contract_type_id: body.contract_type_id || null,
      contract_type_label: body.contract_type_label || '',
      role_id: body.role_id || null,
      role_label: body.role_label || '',
      location_id: body.location_id || null,
      location_label: body.location_label || '',
      job_description: body.job_description || '',
      start_date: body.start_date || null,
      end_date: body.end_date || null,                   // null = indeterminato
      weekly_hours: body.weekly_hours != null && body.weekly_hours !== '' ? Number(body.weekly_hours) : null,
      daily_hours: body.daily_hours != null && body.daily_hours !== '' ? Number(body.daily_hours) : null,
      hourly_rate: body.hourly_rate != null && body.hourly_rate !== '' ? Number(body.hourly_rate) : null,
      monthly_gross: body.monthly_gross != null && body.monthly_gross !== '' ? Number(body.monthly_gross) : null,
      net_estimated: body.net_estimated != null && body.net_estimated !== '' ? Number(body.net_estimated) : null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: body.status || 'ACTIVE',  // DRAFT | ACTIVE | CLOSED
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: body.created_by || null,
    };
    await col.insertOne(contract);
    delete contract._id;
    if (contract.status === 'ACTIVE') {
      await db.collection('employees').updateOne(
        { id: contract.employee_id },
        { $set: { status: 'ASSUNTO', updated_at: new Date().toISOString() } }
      );
    }
    return json(contract, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Contratto non trovato' }, 404);
    const { _id, id: _i, created_at, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    for (const k of ['weekly_hours','daily_hours','hourly_rate','monthly_gross','net_estimated']) {
      if (rest[k] !== undefined) {
        if (rest[k] === '' || rest[k] === null) rest[k] = null;
        else rest[k] = Number(rest[k]);
      }
    }
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    if (updated && rest.status) {
      if (rest.status === 'ACTIVE') {
        await db.collection('employees').updateOne(
          { id: updated.employee_id },
          { $set: { status: 'ASSUNTO', updated_at: new Date().toISOString() } }
        );
      } else if (rest.status === 'CLOSED') {
        const anyActive = await col.findOne({ employee_id: updated.employee_id, status: 'ACTIVE' });
        if (!anyActive) {
          await db.collection('employees').updateOne(
            { id: updated.employee_id },
            { $set: { status: 'LIBERO', updated_at: new Date().toISOString() } }
          );
        }
      }
    }
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id && !action) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }

  if (method === 'POST' && id && action === 'add-attachment') {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Contratto non trovato' }, 404);
    if (!body.filename || !body.base64) return json({ error: 'filename + base64 obbligatori' }, 400);
    const att = {
      id: uuidv4(),
      filename: body.filename,
      description: body.description || '',
      base64: body.base64,
      mime: body.mime || 'application/octet-stream',
      size: body.size || 0,
      uploaded_at: new Date().toISOString(),
      uploaded_by: body.uploaded_by || null,
    };
    await col.updateOne({ id }, { $push: { attachments: att }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true, attachment: att });
  }

  if (method === 'DELETE' && id && action === 'remove-attachment') {
    const attId = searchParams?.get('att_id');
    if (!attId) return json({ error: 'att_id mancante' }, 400);
    await col.updateOne({ id }, { $pull: { attachments: { id: attId } }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// === EMPLOYEE PAYSLIPS (Stipendi / Buste Paga) ===
// Una busta paga rappresenta lo stipendio di un mese.
// Gestisce il dovuto vs pagato con possibili acconti/rate.
export async function handleEmployeePayslips(method, id, body, action, searchParams) {
  const db = await getDb();
  const col = db.collection('employee_payslips');

  const recompute = (p) => {
    const paid = (p.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const due = Number(p.due_amount) || 0;
    p.paid_amount = Number(paid.toFixed(2));
    if (paid <= 0.0001) p.status = 'PENDING';
    else if (paid >= due - 0.01) p.status = 'PAID';
    else p.status = 'PARTIAL';
    return p;
  };

  if (method === 'GET' && !id) {
    const filter = {};
    if (searchParams?.get('company_id')) filter.company_id = searchParams.get('company_id');
    if (searchParams?.get('employee_id')) filter.employee_id = searchParams.get('employee_id');
    if (searchParams?.get('status')) filter.status = searchParams.get('status');
    if (searchParams?.get('year')) filter.period_year = Number(searchParams.get('year'));
    if (searchParams?.get('month')) filter.period_month = Number(searchParams.get('month'));
    const items = await col.find(filter).sort({ period_year: -1, period_month: -1, created_at: -1 }).toArray();
    return json(items.map(({ _id, ...rest }) => rest));
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Busta paga non trovata' }, 404);
    const { _id, ...rest } = item;
    return json(rest);
  }

  if (method === 'POST' && !id) {
    if (!body.company_id || !body.employee_id) return json({ error: 'company_id e employee_id obbligatori' }, 400);
    if (!body.period_year || !body.period_month) return json({ error: 'period_year e period_month obbligatori' }, 400);
    const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const py = Number(body.period_year);
    const pm = Number(body.period_month);
    let p = {
      id: uuidv4(),
      company_id: body.company_id,
      employee_id: body.employee_id,
      employee_name: body.employee_name || '',
      contract_id: body.contract_id || null,
      contract_type_label: body.contract_type_label || '',
      period_year: py,
      period_month: pm,
      period_label: body.period_label || `${monthNames[pm-1] || ''} ${py}`,
      hours_worked: body.hours_worked != null && body.hours_worked !== '' ? Number(body.hours_worked) : null,
      hourly_rate: body.hourly_rate != null && body.hourly_rate !== '' ? Number(body.hourly_rate) : null,
      gross_amount: Number(body.gross_amount) || 0,
      deductions: Number(body.deductions) || 0,
      bonuses: Number(body.bonuses) || 0,
      net_amount: Number(body.net_amount) || 0,
      due_amount: Number(body.due_amount) || Number(body.net_amount) || 0,
      paid_amount: 0,
      status: 'PENDING',
      payments: Array.isArray(body.payments) ? body.payments.map(x => ({
        id: x.id || uuidv4(),
        date: x.date || new Date().toISOString().slice(0,10),
        amount: Number(x.amount) || 0,
        method: x.method || 'BONIFICO',
        payment_destination_id: x.payment_destination_id || null,
        payment_destination_label: x.payment_destination_label || '',
        note: x.note || '',
        created_at: x.created_at || new Date().toISOString(),
      })) : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: body.created_by || null,
    };
    p = recompute(p);
    await col.insertOne(p);
    delete p._id;
    return json(p, 201);
  }

  if (method === 'PUT' && id) {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Busta paga non trovata' }, 404);
    const { _id, id: _i, created_at, payments: _ignored_payments, ...rest } = body || {};
    rest.updated_at = new Date().toISOString();
    for (const k of ['hours_worked','hourly_rate','gross_amount','deductions','bonuses','net_amount','due_amount']) {
      if (rest[k] !== undefined) {
        if (rest[k] === '' || rest[k] === null) rest[k] = null;
        else rest[k] = Number(rest[k]);
      }
    }
    const merged = { ...existing, ...rest };
    recompute(merged);
    rest.paid_amount = merged.paid_amount;
    rest.status = merged.status;
    await col.updateOne({ id }, { $set: rest });
    const updated = await col.findOne({ id });
    return json({ ...updated, _id: undefined });
  }

  if (method === 'DELETE' && id && !action) {
    const r = await col.deleteOne({ id });
    return json({ ok: true, deleted: r.deletedCount });
  }

  // === SUB-ACTION: add-payment (acconto/rata) ===
  if (method === 'POST' && id && action === 'add-payment') {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Busta paga non trovata' }, 404);
    const payment = {
      id: uuidv4(),
      date: body.date || new Date().toISOString().slice(0,10),
      amount: Number(body.amount) || 0,
      method: body.method || 'BONIFICO',
      payment_destination_id: body.payment_destination_id || null,
      payment_destination_label: body.payment_destination_label || '',
      note: body.note || '',
      created_at: new Date().toISOString(),
      created_by: body.created_by || null,
    };
    if (payment.amount <= 0) return json({ error: 'Importo deve essere > 0' }, 400);
    const newPayments = [...(existing.payments || []), payment];
    const merged = { ...existing, payments: newPayments };
    recompute(merged);
    await col.updateOne({ id }, { $set: { payments: newPayments, paid_amount: merged.paid_amount, status: merged.status, updated_at: new Date().toISOString() } });
    return json({ ok: true, payment, paid_amount: merged.paid_amount, status: merged.status });
  }

  // === SUB-ACTION: remove-payment ===
  if (method === 'DELETE' && id && action === 'remove-payment') {
    const payId = searchParams?.get('payment_id');
    if (!payId) return json({ error: 'payment_id mancante' }, 400);
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Busta paga non trovata' }, 404);
    const newPayments = (existing.payments || []).filter(p => p.id !== payId);
    const merged = { ...existing, payments: newPayments };
    recompute(merged);
    await col.updateOne({ id }, { $set: { payments: newPayments, paid_amount: merged.paid_amount, status: merged.status, updated_at: new Date().toISOString() } });
    return json({ ok: true, paid_amount: merged.paid_amount, status: merged.status });
  }

  // === SUB-ACTION: add-attachment ===
  if (method === 'POST' && id && action === 'add-attachment') {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Busta paga non trovata' }, 404);
    if (!body.filename || !body.base64) return json({ error: 'filename + base64 obbligatori' }, 400);
    const att = {
      id: uuidv4(),
      filename: body.filename,
      description: body.description || '',
      base64: body.base64,
      mime: body.mime || 'application/octet-stream',
      size: body.size || 0,
      uploaded_at: new Date().toISOString(),
      uploaded_by: body.uploaded_by || null,
    };
    await col.updateOne({ id }, { $push: { attachments: att }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true, attachment: att });
  }

  if (method === 'DELETE' && id && action === 'remove-attachment') {
    const attId = searchParams?.get('att_id');
    if (!attId) return json({ error: 'att_id mancante' }, 400);
    await col.updateOne({ id }, { $pull: { attachments: { id: attId } }, $set: { updated_at: new Date().toISOString() } });
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

