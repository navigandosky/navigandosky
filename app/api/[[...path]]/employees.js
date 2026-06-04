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
