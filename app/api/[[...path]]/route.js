import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(process.env.MONGO_URL);
  cachedDb = client.db(process.env.DB_NAME);
  return cachedDb;
}

const cors = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}

// ==================== EXPERIENCES ====================
async function handleExperiences(method, id, body, sp) {
  const db = await getDb();
  const col = db.collection('experiences');

  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('type')) filter.type = sp.get('type');
    if (sp.get('language')) filter.languages = { $in: [sp.get('language')] };
    if (sp.get('active') === 'true') filter.is_active = true;
    if (sp.get('company_id')) filter.company_id = sp.get('company_id'); // Multi-Tenant
    if (sp.get('all') !== 'true' && !sp.get('active')) {
      filter.is_active = true;
      // Filtra solo esperienze visibili in home page per catalogo pubblico
      filter.is_visible_on_home = { $ne: false };
    }
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return json(items);
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Non trovato' }, 404);
    return json(item);
  }

  if (method === 'POST') {
    const item = {
      id: uuidv4(),
      name: body.name || '',
      type: body.type || 'BOAT_EXCURSION',
      description: body.description || '',
      duration_minutes: Number(body.duration_minutes) || 120,
      max_capacity: Number(body.max_capacity) || 12,
      price_b2c: Number(body.price_b2c) || 0,
      price_b2b: Number(body.price_b2b) || 0,
      languages: body.languages || ['IT'],
      meeting_point: body.meeting_point || '',
      weather_dependent: body.weather_dependent || false,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_visible_on_home: body.is_visible_on_home !== undefined ? body.is_visible_on_home : true,
      cancellation_policy: body.cancellation_policy || 'Cancellazione gratuita fino a 48h prima',
      itinerary_name: body.itinerary_name || '',
      itinerary_description: body.itinerary_description || '',
      itinerary_stops: body.itinerary_stops || [],
      image_url: body.image_url || '',
      images: body.images || [], // Array di URL immagini (max 3)
      terms_pdf_url: body.terms_pdf_url || '', // PDF condizioni servizio
      resource_ids: body.resource_ids || [],
      price_tiers: body.price_tiers || [], // Fasce di prezzo stagionali (max 4)
      company_id: body.company_id || null, // Multi-Tenant
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: removeId, ...bodyData } = body;
    const updates = { ...bodyData, updated_at: new Date().toISOString() };
    if (updates.duration_minutes) updates.duration_minutes = Number(updates.duration_minutes);
    if (updates.max_capacity) updates.max_capacity = Number(updates.max_capacity);
    if (updates.price_b2c) updates.price_b2c = Number(updates.price_b2c);
    if (updates.price_b2b) updates.price_b2b = Number(updates.price_b2b);
    const result = await col.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    return json(result);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== RESOURCES ====================
async function handleResources(method, id, body, sp) {
  const db = await getDb();
  const col = db.collection('resources');

  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('type')) filter.type = sp.get('type');
    if (sp.get('company_id')) filter.company_id = sp.get('company_id'); // Multi-Tenant
    const items = await col.find(filter).sort({ name: 1 }).toArray();
    return json(items);
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Non trovato' }, 404);
    return json(item);
  }

  if (method === 'POST') {
    const item = {
      id: uuidv4(),
      name: body.name || '',
      type: body.type || 'GUIDE',
      boat_type: body.boat_type || null,
      capacity: body.capacity ? Number(body.capacity) : null,
      bio: body.bio || '',
      languages: body.languages || [],
      certifications: body.certifications || [],
      phone: body.phone || '',
      email: body.email || '',
      images: body.images || [], // Array di URL immagini (max 3)
      gps_imei: body.gps_imei || '', // IMEI dispositivo GPS Balin.app
      potenza_motore: body.potenza_motore ? Number(body.potenza_motore) : null, // HP
      marca: body.marca || '', // Marca motore (es: Yamaha, Mercury)
      consumo_orario_litri: body.consumo_orario_litri ? Number(body.consumo_orario_litri) : null, // L/h
      ore_inizio_stagione: body.ore_inizio_stagione ? Number(body.ore_inizio_stagione) : null, // Ore motore inizio stagione
      is_available: true,
      company_id: body.company_id || null, // Multi-Tenant
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }

  if (method === 'PUT' && id) {
    const result = await col.findOneAndUpdate(
      { id },
      { $set: { ...body, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    return json(result);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== SLOTS ====================
async function handleSlots(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('slots');

  // Block seats temporarily
  if (method === 'POST' && id && action === 'block') {
    const slot = await col.findOne({ id });
    if (!slot) return json({ error: 'Slot non trovato' }, 404);
    const blocked = await db.collection('seat_blocks')
      .find({ slot_id: id, expires_at: { $gt: new Date().toISOString() } })
      .toArray();
    const totalBlocked = blocked.reduce((sum, b) => sum + b.seats, 0);
    const available = slot.max_seats - slot.booked_seats - totalBlocked;
    if (body.seats > available) return json({ error: 'Posti non disponibili' }, 400);
    const blockId = uuidv4();
    const sessionId = body.session_id || uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.collection('seat_blocks').insertOne({
      id: blockId, slot_id: id, seats: body.seats, session_id: sessionId,
      expires_at: expiresAt, created_at: new Date().toISOString(),
    });
    return json({ block_id: blockId, session_id: sessionId, expires_at: expiresAt });
  }

  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('experience_id')) filter.experience_id = sp.get('experience_id');
    if (sp.get('status')) filter.status = sp.get('status');
    if (sp.get('company_id')) filter.company_id = sp.get('company_id'); // Multi-Tenant

    if (sp.get('date_from') || sp.get('date_to')) {
      filter.start_datetime = {};
      if (sp.get('date_from')) filter.start_datetime.$gte = sp.get('date_from');
      if (sp.get('date_to')) filter.start_datetime.$lte = sp.get('date_to');
    }
    // Clean up expired blocks
    await db.collection('seat_blocks').deleteMany({ expires_at: { $lt: new Date().toISOString() } });
    const items = await col.find(filter).sort({ start_datetime: 1 }).toArray();
    // Calculate real availability
    for (let slot of items) {
      const blocks = await db.collection('seat_blocks')
        .find({ slot_id: slot.id, expires_at: { $gt: new Date().toISOString() } }).toArray();
      slot.blocked_seats = blocks.reduce((s, b) => s + b.seats, 0);
      slot.available_seats = slot.max_seats - slot.booked_seats - slot.blocked_seats;
    }
    return json(items);
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Non trovato' }, 404);
    return json(item);
  }

  if (method === 'POST' && !id) {
    // Multi-Tenant: deriva company_id dal body o dall'esperienza linkata (fallback automatico)
    let companyId = body.company_id;
    if (!companyId && body.experience_id) {
      const exp = await db.collection('experiences').findOne({ id: body.experience_id });
      companyId = exp?.company_id || null;
    }
    const item = {
      id: uuidv4(),
      experience_id: body.experience_id,
      resource_ids: body.resource_ids || [],
      start_datetime: body.start_datetime,
      end_datetime: body.end_datetime,
      max_seats: Number(body.max_seats) || 12,
      booked_seats: 0,
      status: 'OPEN',
      price_override: body.price_override ? Number(body.price_override) : null,
      notes: body.notes || '',
      company_id: companyId,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: removeId, ...updates } = body;
    if (updates.max_seats) updates.max_seats = Number(updates.max_seats);
    const result = await col.findOneAndUpdate(
      { id }, { $set: updates }, { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    return json(result);
  }

  if (method === 'DELETE' && id && !action) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== BOOKINGS ====================
async function handleBookings(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('bookings');

  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id'); // Multi-Tenant
    if (sp.get('status')) filter.status = sp.get('status');
    if (sp.get('slot_id')) filter.slot_id = sp.get('slot_id');
    if (sp.get('customer_email')) filter.customer_email = sp.get('customer_email');
    if (sp.get('agency_id')) filter.agency_id = sp.get('agency_id'); // Filtra per agenzia
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    return json(items);
  }

  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Non trovato' }, 404);
    return json(item);
  }

  if (method === 'POST') {
    const slot = await db.collection('slots').findOne({ id: body.slot_id });
    if (!slot) return json({ error: 'Slot non trovato' }, 404);
    if (slot.status === 'CANCELLED') return json({ error: 'Slot cancellato' }, 400);

    // Clean expired blocks
    await db.collection('seat_blocks').deleteMany({ expires_at: { $lt: new Date().toISOString() } });
    const blocks = await db.collection('seat_blocks')
      .find({ slot_id: body.slot_id, expires_at: { $gt: new Date().toISOString() } }).toArray();
    const totalBlocked = blocks.reduce((s, b) => s + b.seats, 0);
    const available = slot.max_seats - slot.booked_seats;
    const seats = Number(body.seats) || 1;
    if (seats > available) return json({ error: 'Posti insufficienti' }, 400);

    // Get experience for pricing
    const experience = await db.collection('experiences').findOne({ id: body.experience_id || slot.experience_id });
    const pricePerSeat = slot.price_override || (experience ? experience.price_b2c : 0);
    let totalAmount = pricePerSeat * seats;

    // Apply voucher
    let discount = 0;
    let voucherCode = null;
    if (body.voucher_code) {
      const voucher = await db.collection('vouchers').findOne({
        code: body.voucher_code.toUpperCase(), is_active: true
      });
      if (voucher && voucher.uses_count < voucher.max_uses) {
        const now = new Date().toISOString();
        if ((!voucher.valid_from || voucher.valid_from <= now) &&
            (!voucher.valid_until || voucher.valid_until >= now)) {
          if (voucher.type === 'PERCENTAGE') discount = (totalAmount * voucher.value) / 100;
          else if (voucher.type === 'FIXED') discount = Math.min(voucher.value, totalAmount);
          else if (voucher.type === 'GIFT') discount = Math.min(voucher.value, totalAmount);
          if (voucher.min_amount && totalAmount < voucher.min_amount) discount = 0;
          if (discount > 0) {
            await db.collection('vouchers').updateOne(
              { code: body.voucher_code.toUpperCase() }, { $inc: { uses_count: 1 } }
            );
            voucherCode = body.voucher_code.toUpperCase();
          }
        }
      }
    }

    const count = await col.countDocuments();
    const bookingRef = `MK-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const booking = {
      id: uuidv4(),
      booking_ref: bookingRef,
      slot_id: body.slot_id,
      experience_id: body.experience_id || slot.experience_id,
      experience_name: experience ? experience.name : '',
      customer_name: body.customer_name || '',
      customer_email: body.customer_email || '',
      customer_phone: body.customer_phone || '',
      seats,
      price_per_seat: pricePerSeat,
      subtotal: totalAmount,
      discount,
      total_amount: totalAmount - discount,
      voucher_code: voucherCode,
      agency_id: body.agency_id || null, // ID agenzia per prenotazioni B2B
      commission_amount: body.commission_amount || 0, // Provvigione agenzia (B2C - B2B)
      b2c_price: body.b2c_price || pricePerSeat, // Prezzo cliente finale
      b2b_price: body.b2b_price || null, // Prezzo netto Maretrek (se B2B)
      status: 'CONFIRMED',
      payment_status: 'PAID',
      special_requests: body.special_requests || '',
      participants: body.participants || [],
      seat_assignments: body.seat_assignments || [],
      slot_datetime: slot.start_datetime,
      checked_in_at: null,
      // Multi-Tenant: eredita company_id da slot o experience
      company_id: body.company_id || slot.company_id || experience?.company_id || null,
      created_at: new Date().toISOString(),
    };

    await col.insertOne(booking);

    // Update slot
    await db.collection('slots').updateOne(
      { id: body.slot_id },
      { $inc: { booked_seats: seats } }
    );
    const updatedSlot = await db.collection('slots').findOne({ id: body.slot_id });
    if (updatedSlot && updatedSlot.booked_seats >= updatedSlot.max_seats) {
      await db.collection('slots').updateOne({ id: body.slot_id }, { $set: { status: 'FULL' } });
    }

    // Remove session blocks
    if (body.session_id) {
      await db.collection('seat_blocks').deleteMany({ session_id: body.session_id });
    }

    return json(booking, 201);
  }

  if (method === 'PUT' && id) {
    if (body.action === 'cancel') {
      const booking = await col.findOne({ id });
      if (!booking) return json({ error: 'Non trovato' }, 404);
      await col.updateOne({ id }, { $set: { status: 'CANCELLED', payment_status: 'REFUNDED' } });
      await db.collection('slots').updateOne(
        { id: booking.slot_id },
        { $inc: { booked_seats: -booking.seats } }
      );
      const updatedSlot = await db.collection('slots').findOne({ id: booking.slot_id });
      if (updatedSlot && updatedSlot.booked_seats < updatedSlot.max_seats && updatedSlot.status === 'FULL') {
        await db.collection('slots').updateOne({ id: booking.slot_id }, { $set: { status: 'OPEN' } });
      }
      return json({ ...booking, status: 'CANCELLED', payment_status: 'REFUNDED' });
    }
    if (body.action === 'checkin') {
      const result = await col.findOneAndUpdate(
        { id },
        { $set: { checked_in_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      return json(result);
    }
    if (body.action === 'reassign') {
      const booking = await col.findOne({ id });
      if (!booking) return json({ error: 'Non trovato' }, 404);
      const newSlot = await db.collection('slots').findOne({ id: body.new_slot_id });
      if (!newSlot) return json({ error: 'Nuovo slot non trovato' }, 404);
      const available = newSlot.max_seats - newSlot.booked_seats;
      if (booking.seats > available) return json({ error: 'Posti insufficienti nel nuovo slot' }, 400);
      // Remove from old slot
      await db.collection('slots').updateOne({ id: booking.slot_id }, { $inc: { booked_seats: -booking.seats } });
      const oldSlot = await db.collection('slots').findOne({ id: booking.slot_id });
      if (oldSlot && oldSlot.booked_seats < oldSlot.max_seats && oldSlot.status === 'FULL') {
        await db.collection('slots').updateOne({ id: booking.slot_id }, { $set: { status: 'OPEN' } });
      }
      // Add to new slot
      await db.collection('slots').updateOne({ id: body.new_slot_id }, { $inc: { booked_seats: booking.seats } });
      const updNewSlot = await db.collection('slots').findOne({ id: body.new_slot_id });
      if (updNewSlot && updNewSlot.booked_seats >= updNewSlot.max_seats) {
        await db.collection('slots').updateOne({ id: body.new_slot_id }, { $set: { status: 'FULL' } });
      }
      const exp = await db.collection('experiences').findOne({ id: newSlot.experience_id || booking.experience_id });
      const result = await col.findOneAndUpdate(
        { id },
        { $set: { slot_id: body.new_slot_id, slot_datetime: newSlot.start_datetime, experience_id: newSlot.experience_id || booking.experience_id, experience_name: exp ? exp.name : booking.experience_name } },
        { returnDocument: 'after' }
      );
      // Check waitlist on old slot (seats freed)
      if (oldSlot) {
        const waiters = await db.collection('waitlist').find({ slot_id: booking.slot_id, status: 'WAITING' }).sort({ position: 1 }).limit(1).toArray();
        if (waiters.length > 0) {
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await db.collection('waitlist').updateOne({ id: waiters[0].id }, { $set: { status: 'NOTIFIED', notified_at: new Date().toISOString(), expires_at: expiresAt } });
        }
      }
      return json(result);
    }
    if (body.action === 'update_details') {
      const updates = {};
      if (body.customer_name) updates.customer_name = body.customer_name;
      if (body.customer_email) updates.customer_email = body.customer_email;
      if (body.customer_phone) updates.customer_phone = body.customer_phone;
      if (body.special_requests !== undefined) updates.special_requests = body.special_requests;
      if (body.participants) updates.participants = body.participants;
      if (body.seats) updates.seats = Number(body.seats);
      if (body.seat_assignments !== undefined) updates.seat_assignments = body.seat_assignments;
      const result = await col.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' });
      if (!result) return json({ error: 'Non trovato' }, 404);
      return json(result);
    }
    const result = await col.findOneAndUpdate(
      { id }, { $set: body }, { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    return json(result);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== VOUCHERS ====================
async function handleVouchers(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('vouchers');

  if ((action === 'validate' || id === 'validate') && method === 'POST') {
    const voucher = await col.findOne({ code: body.code?.toUpperCase(), is_active: true });
    if (!voucher) return json({ valid: false, error: 'Codice non valido' });
    if (voucher.uses_count >= voucher.max_uses) return json({ valid: false, error: 'Voucher esaurito' });
    const now = new Date().toISOString();
    if (voucher.valid_until && voucher.valid_until < now) return json({ valid: false, error: 'Voucher scaduto' });
    return json({ valid: true, voucher });
  }

  if (method === 'GET' && !id) {
    const items = await col.find({}).sort({ created_at: -1 }).toArray();
    return json(items);
  }

  if (method === 'POST' && !action) {
    const item = {
      id: uuidv4(),
      code: (body.code || uuidv4().slice(0, 8)).toUpperCase(),
      type: body.type || 'PERCENTAGE',
      value: Number(body.value) || 10,
      min_amount: body.min_amount ? Number(body.min_amount) : null,
      valid_from: body.valid_from || new Date().toISOString(),
      valid_until: body.valid_until || null,
      max_uses: Number(body.max_uses) || 100,
      uses_count: 0,
      applicable_to: body.applicable_to || 'ALL',
      created_for: body.created_for || null,
      is_active: true,
      company_id: body.company_id || null, // Multi-Tenant
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }

  if (method === 'PUT' && id) {
    const result = await col.findOneAndUpdate(
      { id }, { $set: body }, { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    return json(result);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== WAITLIST ====================
async function handleWaitlist(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('waitlist');

  if (method === 'GET') {
    const filter = {};
    if (sp.get('slot_id')) filter.slot_id = sp.get('slot_id');
    if (sp.get('experience_id')) filter.experience_id = sp.get('experience_id');
    if (sp.get('status')) filter.status = sp.get('status');
    const items = await col.find(filter).sort({ position: 1 }).toArray();
    return json(items);
  }

  if (method === 'POST' && !id) {
    const count = await col.countDocuments({ slot_id: body.slot_id });
    const item = {
      id: uuidv4(),
      slot_id: body.slot_id,
      experience_id: body.experience_id || '',
      experience_name: body.experience_name || '',
      customer_name: body.customer_name || '',
      customer_email: body.customer_email || '',
      customer_phone: body.customer_phone || '',
      seats_requested: Number(body.seats_requested) || 1,
      position: count + 1,
      status: 'WAITING',
      notified_at: null,
      expires_at: null,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }

  if (method === 'PUT' && id) {
    if (body.action === 'notify') {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const result = await col.findOneAndUpdate(
        { id },
        { $set: { status: 'NOTIFIED', notified_at: new Date().toISOString(), expires_at: expiresAt } },
        { returnDocument: 'after' }
      );
      return json(result);
    }
    if (body.action === 'convert') {
      const entry = await col.findOne({ id });
      if (!entry) return json({ error: 'Non trovato' }, 404);
      await col.updateOne({ id }, { $set: { status: 'CONVERTED' } });
      return json({ ...entry, status: 'CONVERTED' });
    }
    if (body.action === 'expire') {
      await col.updateOne({ id }, { $set: { status: 'EXPIRED' } });
      return json({ message: 'Scaduto' });
    }
    const result = await col.findOneAndUpdate({ id }, { $set: body }, { returnDocument: 'after' });
    return json(result);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== AGENCIES (B2B) ====================
async function handleAgencies(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('agencies');

  if ((id === 'login' || action === 'login') && method === 'POST') {
    const agency = await col.findOne({ email: body.email, is_active: true });
    if (!agency || agency.password !== body.password) {
      return json({ error: 'Credenziali non valide' }, 401);
    }
    const token = uuidv4();
    await col.updateOne({ id: agency.id }, { $set: { last_login: new Date().toISOString(), token } });
    const { password, ...agencyData } = agency;
    return json({ agency: agencyData, token });
  }

  if (method === 'GET' && !id) {
    const companyId = sp?.get('company_id');
    const filter = companyId ? { company_id: companyId } : {};
    const items = await col.find(filter).sort({ name: 1 }).toArray();
    const safe = items.map(({ password, ...rest }) => rest);
    return json(safe);
  }

  if (method === 'GET' && id && id !== 'login') {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Non trovato' }, 404);
    const { password, ...safe } = item;
    return json(safe);
  }

  if (method === 'POST' && !id) {
    const item = {
      id: uuidv4(),
      company_id: body.company_id || null, // Associa agenzia a società
      name: body.name || '',
      email: body.email || '',
      password: body.password || 'agency2025',
      phone: body.phone || '',
      vat_number: body.vat_number || '',
      address: body.address || '',
      logo: body.logo || '', // Logo agenzia
      discount_percentage: Number(body.discount_percentage) || 0,
      credit_limit: Number(body.credit_limit) || 0,
      payment_terms: body.payment_terms || '30_70',
      payment_model: body.payment_model || 'PREPAID', // 'PREPAID' (paga B2B prima) o 'POSTPAID' (incassa B2C, versa B2B dopo)
      is_active: true,
      total_bookings: 0,
      total_revenue: 0,
      total_commission: 0, // Totale provvigioni guadagnate
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    const { password, ...safe } = item;
    return json(safe, 201);
  }

  if (method === 'PUT' && id) {
    const { _id, id: removeId, ...updateData } = body;
    const result = await col.findOneAndUpdate(
      { id }, { $set: { ...updateData, updated_at: new Date().toISOString() } }, { returnDocument: 'after' }
    );
    if (!result) return json({ error: 'Non trovato' }, 404);
    const { password, ...safe } = result;
    return json(safe);
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ message: 'Eliminato' });
  }
  return json({ error: 'Richiesta non valida' }, 400);
}

// ==================== STATS ====================
async function handleStats(sp) {
  const db = await getDb();
  const companyId = sp?.get?.('company_id');
  const companyFilter = companyId ? { company_id: companyId } : {};
  
  const totalBookings = await db.collection('bookings').countDocuments({ ...companyFilter, status: { $ne: 'CANCELLED' } });
  const totalExperiences = await db.collection('experiences').countDocuments(companyFilter);
  const totalResources = await db.collection('resources').countDocuments(companyFilter);
  const totalSlots = await db.collection('slots').countDocuments(companyFilter);

  const revenueAgg = await db.collection('bookings').aggregate([
    { $match: { ...companyFilter, status: 'CONFIRMED' } },
    { $group: { _id: null, total: { $sum: '$total_amount' }, seats: { $sum: '$seats' } } }
  ]).toArray();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayBookings = await db.collection('bookings').countDocuments({
    ...companyFilter,
    created_at: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() },
    status: 'CONFIRMED'
  });

  const recentBookings = await db.collection('bookings')
    .find(companyFilter).sort({ created_at: -1 }).limit(10).toArray();

  return json({
    total_bookings: totalBookings,
    total_experiences: totalExperiences,
    total_resources: totalResources,
    total_slots: totalSlots,
    total_revenue: revenueAgg[0]?.total || 0,
    total_seats_sold: revenueAgg[0]?.seats || 0,
    today_bookings: todayBookings,
    recent_bookings: recentBookings,
  });
}

// ==================== SEED DATA ====================
async function handleSeed() {
  const db = await getDb();

  await Promise.all([
    db.collection('experiences').deleteMany({}),
    db.collection('resources').deleteMany({}),
    db.collection('slots').deleteMany({}),
    db.collection('bookings').deleteMany({}),
    db.collection('vouchers').deleteMany({}),
    db.collection('seat_blocks').deleteMany({}),
    db.collection('waitlist').deleteMany({}),
    db.collection('agencies').deleteMany({}),
  ]);

  // Resources
  const guideMarco = { id: uuidv4(), name: 'Marco Ferraro', type: 'GUIDE', boat_type: null, capacity: null, bio: 'Guida turistica abilitata con 15 anni di esperienza. Esperto di archeologia sarda e biologia marina.', languages: ['IT', 'EN'], certifications: ['Guida Turistica Abilitata', 'Primo Soccorso'], phone: '+39 333 1234567', email: 'marco@maretrek.it', is_available: true, created_at: new Date().toISOString() };
  const guideGiulia = { id: uuidv4(), name: 'Giulia Sanna', type: 'GUIDE', boat_type: null, capacity: null, bio: 'Biologa marina e istruttrice di snorkeling. Appassionata della tradizione sarda.', languages: ['IT', 'FR', 'EN'], certifications: ['Guida Turistica Abilitata', 'Snorkeling Instructor SSI'], phone: '+39 333 2345678', email: 'giulia@maretrek.it', is_available: true, created_at: new Date().toISOString() };
  const guideAlex = { id: uuidv4(), name: 'Alessandro Mura', type: 'GUIDE', boat_type: null, capacity: null, bio: 'Ex pescatore locale, conosce ogni angolo della costa. Specializzato in tour enogastronomici.', languages: ['IT', 'DE', 'EN'], certifications: ['Guida Turistica Abilitata', 'Patente Nautica'], phone: '+39 333 3456789', email: 'alessandro@maretrek.it', is_available: true, created_at: new Date().toISOString() };
  const boatZefiro = { id: uuidv4(), name: 'Zefiro', type: 'BOAT', boat_type: 'GOMMONE', capacity: 12, bio: 'Gommone BWA 7.5m con motore Yamaha 250cv. Tendalino, scaletta, doccia.', languages: [], certifications: ['Registro Navale', 'Assicurazione RC'], phone: null, email: null, is_available: true, created_at: new Date().toISOString() };
  const boatMaestrale = { id: uuidv4(), name: 'Maestrale', type: 'BOAT', boat_type: 'GOMMONE', capacity: 8, bio: 'Gommone Nuova Jolly 6.5m con motore Honda 200cv. Ideale per piccoli gruppi.', languages: [], certifications: ['Registro Navale', 'Assicurazione RC'], phone: null, email: null, is_available: true, created_at: new Date().toISOString() };
  const boatPoseidon = { id: uuidv4(), name: 'Poseidon', type: 'BOAT', boat_type: 'MOTONAVE', capacity: 50, bio: 'Motonave 18m con ponte panoramico. Bar a bordo, servizi igienici, area prendisole.', languages: [], certifications: ['Registro Navale', 'Certificato Passeggeri'], phone: null, email: null, is_available: true, created_at: new Date().toISOString() };
  const boatLibeccio = { id: uuidv4(), name: 'Libeccio', type: 'BOAT', boat_type: 'GOMMONE', capacity: 6, bio: 'Gommone Zodiac 5.5m con motore Mercury 150cv. Perfetto per snorkeling.', languages: [], certifications: ['Registro Navale', 'Assicurazione RC'], phone: null, email: null, is_available: true, created_at: new Date().toISOString() };
  const boatScirocco = { id: uuidv4(), name: 'Scirocco', type: 'BOAT', boat_type: 'BARCA_A_VELA', capacity: 8, bio: 'Barca a vela Bavaria 37 Cruiser. 3 cabine, cucina, bagno.', languages: [], certifications: ['Registro Navale', 'Navigazione Altura'], phone: null, email: null, is_available: true, created_at: new Date().toISOString() };

  const resources = [guideMarco, guideGiulia, guideAlex, boatZefiro, boatMaestrale, boatPoseidon, boatLibeccio, boatScirocco];

  // Experiences
  const experiences = [
    {
      id: uuidv4(), name: 'Arcipelago della Maddalena in Gommone', type: 'BOAT_EXCURSION',
      description: 'Una giornata indimenticabile alla scoperta delle isole piu belle del Mediterraneo. Navigheremo tra le acque cristalline dell\'arcipelago, con soste per il bagno a Budelli (Spiaggia Rosa), Spargi e Santa Maria. Pranzo al sacco e bevande incluse.',
      duration_minutes: 480, max_capacity: 12, price_b2c: 85, price_b2b: 65,
      languages: ['IT', 'EN'], meeting_point: 'Porto di Palau', weather_dependent: true, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 48h prima della partenza',
      itinerary_name: 'Tour Completo Arcipelago', itinerary_description: 'Tour delle isole principali',
      itinerary_stops: ['Porto di Palau', 'Spargi - Cala Corsara', 'Budelli - Spiaggia Rosa', 'Santa Maria', 'La Maddalena - Cala Spalmatore', 'Rientro Palau'],
      image_url: 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=800&q=80',
      resource_ids: [boatZefiro.id, guideMarco.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(), name: 'Tour Guidato Centro Storico di Alghero', type: 'GUIDED_TOUR',
      description: 'Passeggiata nel cuore della Riviera del Corallo. Scopri i bastioni catalani, la cattedrale gotica, i vicoli medievali e il porto antico con le sue storie millenarie. La guida vi portera nei luoghi piu autentici della citta.',
      duration_minutes: 180, max_capacity: 20, price_b2c: 35, price_b2b: 25,
      languages: ['IT', 'EN', 'FR'], meeting_point: 'Torre di Porta Terra, Alghero', weather_dependent: false, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 24h prima',
      itinerary_name: 'Alghero Storica', itinerary_description: 'A piedi tra storia e tradizione',
      itinerary_stops: ['Torre Porta Terra', 'Bastioni Marco Polo', 'Cattedrale Santa Maria', 'Chiesa San Francesco', 'Porto Antico'],
      image_url: 'https://images.unsplash.com/photo-1561416387-1504e27baeb4?w=800&q=80',
      resource_ids: [guideGiulia.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(), name: 'Grotte di Nettuno in Motonave', type: 'BOAT_EXCURSION',
      description: 'Navigazione lungo la costa fino a Capo Caccia per visitare le spettacolari Grotte di Nettuno, una delle meraviglie naturali della Sardegna. Vista panoramica dalla motonave e visita guidata all\'interno delle grotte.',
      duration_minutes: 240, max_capacity: 50, price_b2c: 55, price_b2b: 40,
      languages: ['IT', 'EN', 'DE'], meeting_point: 'Porto di Alghero', weather_dependent: true, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 48h prima',
      itinerary_name: 'Grotte di Nettuno', itinerary_description: 'Da Alghero a Capo Caccia via mare',
      itinerary_stops: ['Porto di Alghero', 'Costa di Alghero', 'Capo Caccia', 'Grotte di Nettuno', 'Rientro'],
      image_url: 'https://images.unsplash.com/photo-1700572697203-8f165cab7504?w=800&q=80',
      resource_ids: [boatPoseidon.id, guideAlex.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(), name: 'Noleggio Gommone Costa Smeralda', type: 'BOAT_RENTAL',
      description: 'Noleggia un gommone con conducente e scopri la Costa Smeralda al tuo ritmo. Il nostro skipper vi portera nelle cale piu belle: Liscia Ruja, Cala di Volpe, Romazzino, Pevero. Itinerario personalizzabile.',
      duration_minutes: 480, max_capacity: 8, price_b2c: 180, price_b2b: 150,
      languages: ['IT', 'EN'], meeting_point: 'Porto Cervo Marina', weather_dependent: true, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 72h prima',
      itinerary_name: 'Costa Smeralda Libera', itinerary_description: 'Itinerario personalizzabile',
      itinerary_stops: ['Porto Cervo', 'Liscia Ruja', 'Cala di Volpe', 'Romazzino', 'Pevero', 'Rientro'],
      image_url: 'https://images.unsplash.com/photo-1546451182-b55213a7e0b6?w=800&q=80',
      resource_ids: [boatMaestrale.id, guideMarco.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(), name: 'Snorkeling a Tavolara', type: 'BOAT_EXCURSION',
      description: 'Escursione snorkeling nell\'Area Marina Protetta di Tavolara. Acque cristalline, fondali ricchi di posidonia e fauna marina. Attrezzatura completa inclusa. Adatto a tutti i livelli.',
      duration_minutes: 300, max_capacity: 6, price_b2c: 65, price_b2b: 50,
      languages: ['IT', 'EN', 'FR'], meeting_point: 'Porto San Paolo', weather_dependent: true, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 48h prima',
      itinerary_name: 'Tavolara Snorkeling', itinerary_description: 'Area Marina Protetta',
      itinerary_stops: ['Porto San Paolo', 'Isola di Tavolara - Spalmatore', 'Molara', 'Rientro'],
      image_url: 'https://images.unsplash.com/photo-1700572697090-74bc3f0c8390?w=800&q=80',
      resource_ids: [boatLibeccio.id, guideGiulia.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(), name: 'Tramonto in Barca a Vela', type: 'BOAT_EXCURSION',
      description: 'Navigazione al tramonto lungo la costa nord-occidentale della Sardegna. Aperitivo a bordo con prodotti tipici sardi: vermentino, formaggi, salumi. Un\'esperienza romantica e indimenticabile.',
      duration_minutes: 180, max_capacity: 8, price_b2c: 75, price_b2b: 55,
      languages: ['IT', 'EN'], meeting_point: 'Porto di Alghero', weather_dependent: true, is_active: true,
      cancellation_policy: 'Cancellazione gratuita fino a 48h prima',
      itinerary_name: 'Sunset Sailing', itinerary_description: 'Navigazione al tramonto con aperitivo',
      itinerary_stops: ['Porto di Alghero', 'Costa verso Capo Caccia', 'Sosta aperitivo', 'Rientro al tramonto'],
      image_url: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80',
      resource_ids: [boatScirocco.id, guideAlex.id],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  ];

  // Generate slots for next 14 days
  const slots = [];
  const today = new Date();
  for (let day = 1; day <= 14; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    for (const exp of experiences) {
      // Morning slot
      if (day % 2 === 0 || exp.type !== 'GUIDED_TOUR') {
        const startH = exp.type === 'GUIDED_TOUR' ? '10:00' : '08:30';
        const start = new Date(`${dateStr}T${startH}:00`);
        const end = new Date(start.getTime() + exp.duration_minutes * 60000);
        const maxSeats = exp.max_capacity;
        const booked = Math.floor(Math.random() * Math.min(5, maxSeats));
        slots.push({
          id: uuidv4(), experience_id: exp.id, resource_ids: exp.resource_ids,
          start_datetime: start.toISOString(), end_datetime: end.toISOString(),
          max_seats: maxSeats, booked_seats: booked,
          status: booked >= maxSeats ? 'FULL' : 'OPEN',
          price_override: null, notes: '', created_at: new Date().toISOString(),
        });
      }
      // Afternoon slot for some
      if (exp.duration_minutes <= 300 && day % 3 !== 0) {
        const start = new Date(`${dateStr}T14:30:00`);
        const end = new Date(start.getTime() + exp.duration_minutes * 60000);
        const maxSeats = exp.max_capacity;
        const booked = Math.floor(Math.random() * Math.min(3, maxSeats));
        slots.push({
          id: uuidv4(), experience_id: exp.id, resource_ids: exp.resource_ids,
          start_datetime: start.toISOString(), end_datetime: end.toISOString(),
          max_seats: maxSeats, booked_seats: booked,
          status: booked >= maxSeats ? 'FULL' : 'OPEN',
          price_override: null, notes: '', created_at: new Date().toISOString(),
        });
      }
    }
  }

  // Vouchers
  const vouchers = [
    { id: uuidv4(), code: 'BENVENUTO10', type: 'PERCENTAGE', value: 10, min_amount: 50, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 90 * 86400000).toISOString(), max_uses: 100, uses_count: 0, applicable_to: 'ALL', created_for: null, is_active: true, created_at: new Date().toISOString() },
    { id: uuidv4(), code: 'ESTATE2025', type: 'FIXED', value: 15, min_amount: 60, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 60 * 86400000).toISOString(), max_uses: 50, uses_count: 0, applicable_to: 'ALL', created_for: null, is_active: true, created_at: new Date().toISOString() },
    { id: uuidv4(), code: 'SARDEGNA20', type: 'PERCENTAGE', value: 20, min_amount: 100, valid_from: new Date().toISOString(), valid_until: new Date(Date.now() + 30 * 86400000).toISOString(), max_uses: 25, uses_count: 0, applicable_to: 'BOAT_ONLY', created_for: null, is_active: true, created_at: new Date().toISOString() },
  ];

  // Agencies (B2B)
  const agencies = [
    { id: uuidv4(), name: 'Sardinia Tours S.r.l.', email: 'info@sardiniatours.it', password: 'agency2025', phone: '+39 070 1234567', vat_number: 'IT12345678901', address: 'Via Roma 42, Cagliari', discount_percentage: 25, credit_limit: 10000, payment_terms: '30_70', is_active: true, total_bookings: 0, total_revenue: 0, created_at: new Date().toISOString() },
    { id: uuidv4(), name: 'Viaggi Mare Blu', email: 'info@viaggimareblu.it', password: 'agency2025', phone: '+39 070 9876543', vat_number: 'IT98765432109', address: 'Corso Umberto 15, Olbia', discount_percentage: 20, credit_limit: 5000, payment_terms: '30_70', is_active: true, total_bookings: 0, total_revenue: 0, created_at: new Date().toISOString() },
    { id: uuidv4(), name: 'Costa Smeralda Travel', email: 'booking@costasmeraldatravel.it', password: 'agency2025', phone: '+39 0789 123456', vat_number: 'IT55566677788', address: 'Porto Cervo, Arzachena', discount_percentage: 15, credit_limit: 8000, payment_terms: '30_70', is_active: true, total_bookings: 0, total_revenue: 0, created_at: new Date().toISOString() },
  ];

  await Promise.all([
    db.collection('resources').insertMany(resources),
    db.collection('experiences').insertMany(experiences),
    db.collection('slots').insertMany(slots),
    db.collection('vouchers').insertMany(vouchers),
    db.collection('agencies').insertMany(agencies),
  ]);

  return json({
    message: 'Dati demo caricati con successo!',
    counts: { experiences: experiences.length, resources: resources.length, slots: slots.length, vouchers: vouchers.length, agencies: agencies.length }
  });
}

// ==================== IMAGE UPLOAD ====================
async function handleImageUpload(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  
  try {
    const { images } = body; // Array di immagini in base64
    if (!images || !Array.isArray(images) || images.length === 0) {
      return json({ error: 'Nessuna immagine fornita' }, 400);
    }
    
    if (images.length > 3) {
      return json({ error: 'Massimo 3 immagini consentite' }, 400);
    }
    
    // Crea directory public/uploads se non esiste
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const uploadedUrls = [];
    
    for (const imageData of images) {
      // Rimuovi il prefisso data:image/...;base64,
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Genera nome file unico
      const fileName = `${uuidv4()}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      
      // Salva il file
      await writeFile(filePath, buffer);
      
      // URL pubblico
      uploadedUrls.push(`/uploads/${fileName}`);
    }
    
    return json({ urls: uploadedUrls, count: uploadedUrls.length });
  } catch (error) {
    console.error('Upload error:', error);
    return json({ error: 'Errore durante l\'upload delle immagini' }, 500);
  }
}

// ==================== PDF UPLOAD ====================
async function handlePDFUpload(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  
  try {
    const { pdf, filename } = body;
    if (!pdf) {
      return json({ error: 'Nessun PDF fornito' }, 400);
    }
    
    // Crea directory public/uploads se non esiste
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Rimuovi il prefisso data:application/pdf;base64,
    const base64Data = pdf.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Genera nome file unico mantenendo estensione .pdf
    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    
    // Salva il file
    await writeFile(filePath, buffer);
    
    // URL pubblico
    const url = `/uploads/${fileName}`;
    
    return json({ url, filename: filename || 'documento.pdf' });
  } catch (error) {
    console.error('PDF Upload error:', error);
    return json({ error: 'Errore durante l\'upload del PDF' }, 500);
  }
}

// ==================== CONTACT FORM ====================
async function handleContact(method, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  
  try {
    const { name, email, phone, company, message } = body;
    
    if (!name || !email || !message) {
      return json({ error: 'Nome, email e messaggio sono obbligatori' }, 400);
    }
    
    // Salva il contatto nel database
    const db = await getDb();
    const col = db.collection('contacts');
    
    const contact = {
      id: uuidv4(),
      name,
      email,
      phone: phone || '',
      company: company || '',
      message,
      type: 'WORK_WITH_US',
      status: 'NEW',
      created_at: new Date().toISOString(),
    };
    
    await col.insertOne(contact);
    
    // In produzione: qui invieresti l'email a trivorsrl@gmail.com
    // Per ora salviamo solo nel database
    console.log(`[CONTACT FORM] Nuovo contatto da ${name} (${email}): ${message}`);
    
    return json({ success: true, message: 'Richiesta inviata con successo!' });
  } catch (error) {
    console.error('Contact form error:', error);
    return json({ error: 'Errore durante l\'invio del messaggio' }, 500);
  }
}

// ==================== GPS CONFIG ====================
async function handleGPSConfig(method, body) {
  const db = await getDb();
  const col = db.collection('gps_config');
  
  if (method === 'GET') {
    const config = await col.findOne({ type: 'balin' });
    if (!config) {
      return json({ 
        configured: false,
        email: '',
        api_token: '',
        message: 'Configurazione GPS non trovata. Inserisci le credenziali Balin.app'
      });
    }
    return json({
      configured: true,
      email: config.email,
      api_token: config.api_token,
      last_test: config.last_test,
      last_test_status: config.last_test_status
    });
  }
  
  if (method === 'POST') {
    const config = {
      type: 'balin',
      email: body.email,
      api_token: body.api_token,
      updated_at: new Date().toISOString()
    };
    
    await col.updateOne(
      { type: 'balin' },
      { $set: config },
      { upsert: true }
    );
    
    return json({ success: true, message: 'Configurazione GPS salvata' });
  }
  
  return json({ error: 'Metodo non supportato' }, 405);
}

// ==================== GPS BALIN.APP PROXY ====================
async function handleGPS(method, pathParts) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  
  try {
    // Recupera credenziali da DB
    const db = await getDb();
    const config = await db.collection('gps_config').findOne({ type: 'balin' });
    
    if (!config || !config.email || !config.api_token) {
      return json({ 
        error: 'Configurazione GPS non trovata',
        message: 'Configura le credenziali Balin.app nella Dashboard Admin > Setup GPS'
      }, 400);
    }
    
    const email = config.email;
    const apiToken = config.api_token;
    
    // Crea Basic Auth header
    const authString = `${email}:${apiToken}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    // Costruisci URL API Balin
    let apiPath = 'devices'; // default
    if (pathParts.length > 1) {
      // gps/device/IMEI -> device/IMEI
      apiPath = pathParts.slice(1).join('/');
    }
    
    const apiUrl = `https://api.balin.app/external_api/v1/${apiPath}`;
    
    console.log(`[GPS] Calling Balin API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPS] Balin API error ${response.status}:`, errorText);
      return json({ 
        error: `Errore API Balin (${response.status})`,
        details: errorText 
      }, response.status);
    }
    
    const data = await response.json();
    return json(data);
    
  } catch (error) {
    console.error('[GPS] Error:', error);
    return json({ error: 'Errore durante la chiamata GPS', details: error.message }, 500);
  }
}

// ==================== GPS TEST CONNECTION ====================
async function handleGPSTest(method) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  
  try {
    const db = await getDb();
    const config = await db.collection('gps_config').findOne({ type: 'balin' });
    
    if (!config || !config.email || !config.api_token) {
      return json({ 
        success: false,
        error: 'Credenziali non configurate'
      }, 400);
    }
    
    // Test connessione
    const authString = `${config.email}:${config.api_token}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    const response = await fetch('https://api.balin.app/external_api/v1/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    const testResult = {
      last_test: new Date().toISOString(),
      last_test_status: response.ok ? 'success' : 'failed'
    };
    
    // Salva risultato test
    await db.collection('gps_config').updateOne(
      { type: 'balin' },
      { $set: testResult }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return json({
        success: false,
        error: `Connessione fallita (${response.status})`,
        details: errorText
      }, 400);
    }
    
    const devices = await response.json();
    
    return json({
      success: true,
      message: 'Connessione riuscita!',
      devices: devices,
      device_count: Array.isArray(devices) ? devices.length : 0
    });
    
  } catch (error) {
    console.error('[GPS Test] Error:', error);
    return json({ 
      success: false,
      error: 'Errore test connessione',
      details: error.message 
    }, 500);
  }
}

// ==================== GPS HISTORY ====================
async function handleGPSHistory(method, pathParts, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  
  const imei = pathParts[2]; // gps/history/{imei}
  if (!imei) return json({ error: 'IMEI richiesto' }, 400);
  
  try {
    const db = await getDb();
    const config = await db.collection('gps_config').findOne({ type: 'balin' });
    
    if (!config || !config.email || !config.api_token) {
      return json({ error: 'Configurazione GPS non trovata' }, 400);
    }
    
    const authString = `${config.email}:${config.api_token}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    // Parametri data (default: oggi)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const dateFrom = searchParams.get('date_from') || `${date}T00:00:00Z`;
    const dateTo = searchParams.get('date_to') || `${date}T23:59:59Z`;
    
    // Chiama API Balin per storico
    const apiUrl = `https://api.balin.app/external_api/v1/device/${imei}/history?from=${dateFrom}&to=${dateTo}`;
    
    console.log(`[GPS History] Calling: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPS History] API error ${response.status}:`, errorText);
      return json({ error: `Errore API Balin (${response.status})`, details: errorText }, response.status);
    }
    
    const history = await response.json();
    
    return json({
      imei,
      date,
      history: Array.isArray(history) ? history : [],
      count: Array.isArray(history) ? history.length : 0
    });
    
  } catch (error) {
    console.error('[GPS History] Error:', error);
    return json({ error: 'Errore recupero storico GPS', details: error.message }, 500);
  }
}

// ==================== GPS ANALYTICS ====================
async function handleGPSAnalytics(method, pathParts, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  
  const imei = pathParts[2]; // gps/analytics/{imei}
  if (!imei) return json({ error: 'IMEI richiesto' }, 400);
  
  try {
    const db = await getDb();
    const config = await db.collection('gps_config').findOne({ type: 'balin' });
    
    if (!config) return json({ error: 'Configurazione GPS non trovata' }, 400);
    
    const authString = `${config.email}:${config.api_token}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Converti in millisecondi Unix (Balin richiede start/stop in ms)
    const startDate = new Date(`${date}T00:00:00Z`);
    const stopDate = new Date(`${date}T23:59:59Z`);
    const startMs = startDate.getTime();
    const stopMs = stopDate.getTime();
    
    // Recupera storico posizioni - ENDPOINT CORRETTO con parametri in millisecondi
    const apiUrl = `https://api.balin.app/external_api/v1/positionsHistory/${imei}?start=${startMs}&stop=${stopMs}&skip=0&limit=5000`;
    
    console.log(`🔍 [BALIN API CALL] URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📡 [BALIN HTTP] Status: ${response.status}, OK: ${response.ok}`);
    
    if (!response.ok) {
      // Se Balin ritorna 404, significa che non ci sono dati per quella data
      // Ritorniamo dati vuoti invece di errore
      if (response.status === 404) {
        return json({
          imei,
          date,
          total_distance: 0,
          max_speed: 0,
          avg_speed: 0,
          total_time: 0,
          stops: 0,
          route: [],
          points_count: 0
        });
      }
      return json({ error: 'Errore recupero dati' }, response.status);
    }
    
    const history = await response.json();
    
    console.log(`📊 [BALIN RESPONSE] Type: ${typeof history}, Keys:`, Object.keys(history || {}).slice(0, 5));
    
    // Balin ritorna un oggetto con "data" array di posizioni
    const positions = history?.data || history?.positions || [];
    
    if (!Array.isArray(positions) || positions.length === 0) {
      console.log(`❌ [NO DATA] IMEI ${imei} on ${date} - Empty or invalid response structure`);
      return json({
        imei,
        date,
        total_distance: 0,
        max_speed: 0,
        avg_speed: 0,
        total_time: 0,
        stops: 0,
        route: [],
        points_count: 0
      });
    }
    
    // Calcola analytics
    let totalDistance = 0;
    let maxSpeed = 0;
    let totalSpeed = 0;
    let stops = 0;
    let movingTime = 0;
    let engineHoursMs = 0; // Tempo motore acceso in millisecondi
    
    const route = positions.map((point, i) => {
      if (point.speed > maxSpeed) maxSpeed = point.speed;
      totalSpeed += point.speed || 0;
      
      if (point.speed === 0) stops++;
      else if (point.speed > 0) {
        movingTime += 1;
        
        // Calcola tempo motore acceso basato su differenza timestamp
        if (i > 0 && positions[i-1].speed > 0) {
          const prevTs = positions[i-1].timestamp || positions[i-1].timestamp_position;
          const currTs = point.timestamp || point.timestamp_position;
          if (prevTs && currTs) {
            engineHoursMs += (new Date(currTs).getTime() - new Date(prevTs).getTime());
          }
        }
      }
      
      // Calcola distanza dal punto precedente (formula di Haversine semplificata)
      if (i > 0) {
        const prev = positions[i - 1];
        const R = 6371; // Raggio Terra in km
        const dLat = (point.lat - prev.lat) * Math.PI / 180;
        const dLon = (point.lng - prev.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(prev.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
      }
      
      return {
        lat: point.lat,
        lng: point.lng,
        speed: point.speed || 0,
        timestamp: point.timestamp || point.timestamp_position
      };
    });
    
    // Converti millisecondi in ore
    const engineHours = engineHoursMs / (1000 * 60 * 60);
    
    return json({
      imei,
      date,
      total_distance: parseFloat(totalDistance.toFixed(2)),
      max_speed: maxSpeed,
      avg_speed: positions.length > 0 ? parseFloat((totalSpeed / positions.length).toFixed(2)) : 0,
      total_time: movingTime,
      engine_hours: parseFloat(engineHours.toFixed(2)), // Ore motore acceso
      stops,
      route,
      points_count: positions.length
    });
    
  } catch (error) {
    console.error('[GPS Analytics] Error:', error);
    return json({ error: 'Errore calcolo analytics', details: error.message }, 500);
  }
}

// ==================== BOOKINGS BY RESOURCE & DATE ====================
async function handleBookingsByResource(method, searchParams) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  
  try {
    const db = await getDb();
    const resourceId = searchParams.get('resource_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!resourceId) return json({ error: 'resource_id richiesto' }, 400);
    
    // Trova slots della risorsa per la data
    const slots = await db.collection('slots').find({
      resource_ids: resourceId,
      start_datetime: {
        $gte: `${date}T00:00:00Z`,
        $lte: `${date}T23:59:59Z`
      }
    }).toArray();
    
    if (slots.length === 0) {
      return json({ resource_id: resourceId, date, bookings: [], total: 0 });
    }
    
    const slotIds = slots.map(s => s.id);
    
    // Trova prenotazioni per questi slot
    const bookings = await db.collection('bookings').find({
      slot_id: { $in: slotIds },
      status: { $in: ['CONFIRMED', 'PENDING'] }
    }).toArray();
    
    // Enriched con info esperienza e slot
    const enriched = await Promise.all(bookings.map(async (booking) => {
      const slot = slots.find(s => s.id === booking.slot_id);
      const experience = slot ? await db.collection('experiences').findOne({ id: slot.experience_id }) : null;
      
      return {
        ...booking,
        slot_time: slot ? slot.start_datetime : null,
        experience_name: experience ? experience.name : 'N/A',
        experience_type: experience ? experience.type : null
      };
    }));
    
    return json({
      resource_id: resourceId,
      date,
      bookings: enriched,
      total: enriched.length,
      total_passengers: enriched.reduce((sum, b) => sum + (b.seats || 0), 0)
    });
    
  } catch (error) {
    console.error('[Bookings by Resource] Error:', error);
    return json({ error: 'Errore recupero prenotazioni', details: error.message }, 500);
  }
}


// ============ COMPANIES (Multi-Tenant) ============
async function handleCompaniesNew(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('companies');
  
  if (method === 'GET' && !id) {
    // Supporto per query by slug
    const slug = sp.get('slug');
    if (slug) {
      const item = await col.findOne({ slug });
      return item ? json(item) : json({ error: 'Company non trovata' }, 404);
    }
    
    const items = await col.find({}).sort({ created_at: -1 }).toArray();
    console.log('[handleCompaniesNew] GET all - found:', items.length);
    return json(items);
  }
  
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    return item ? json(item) : json({ error: 'Company non trovata' }, 404);
  }
  
  if (method === 'POST') {
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const item = {
      id: uuidv4(),
      name: body.name || '',
      slug,
      legal_form: body.legal_form || 'S.R.L.',
      vat_number: body.vat_number || '',
      fiscal_code: body.fiscal_code || '',
      address: body.address || '',
      city: body.city || '',
      postal_code: body.postal_code || '',
      country: body.country || 'IT',
      phone: body.phone || '',
      email: body.email || '',
      pec: body.pec || '',
      sdi_code: body.sdi_code || '',
      logo_url: body.logo_url || '',
      hero_image: body.hero_image || '',
      primary_color: body.primary_color || '#0066cc',
      secondary_color: body.secondary_color || '#ff6600',
      subscription_plan: body.subscription_plan || 'STANDARD',
      max_experiences: body.max_experiences || 50,
      max_resources: body.max_resources || 20,
      max_users: body.max_users || 5,
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_bookings: 0,
      total_revenue: 0
    };
    await col.insertOne(item);
    return json(item, 201);
  }
  
  if (method === 'PUT' && id) {
    const updates = { ...body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates._id; // Rimuovi _id di MongoDB (immutabile)
    delete updates.created_at;
    await col.updateOne({ id }, { $set: updates });
    const updated = await col.findOne({ id });
    return json(updated);
  }
  
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ success: true });
  }
  
  return json({ error: 'Method not allowed' }, 405);
}


// ==================== ROUTE DISPATCHER ====================

// ============ USERS & AUTH ============
async function handleUsersAuth(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('users');
  
  // Login con bcrypt - supporta username o email
  if (action === 'login') {
    // Cerca per email o username
    const emailOrUsername = body.email_or_username || body.email || body.username;
    const user = await col.findOne({ 
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });
    
    if (!user) {
      return json({ error: 'Credenziali non valide' }, 401);
    }
    
    // Verifica password con bcrypt
    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return json({ error: 'Credenziali non valide' }, 401);
    }
    
    if (!user.is_active) {
      return json({ error: 'Account disattivato' }, 403);
    }
    
    const { password, ...safeUser } = user;
    return json({ user: safeUser });
  }
  
  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('role')) filter.role = sp.get('role');
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    const safe = items.map(({ password, ...u }) => u);
    return json(safe);
  }
  
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Utente non trovato' }, 404);
    const { password, ...safe } = item;
    return json(safe);
  }
  
  if (method === 'POST') {
    const existingUser = await col.findOne({ email: body.email });
    if (existingUser) {
      return json({ error: 'Email già registrata' }, 400);
    }
    
    // Hash password con bcrypt
    const hashedPassword = await bcrypt.hash(body.password || 'changeme', 10);
    
    const item = {
      id: uuidv4(),
      email: body.email || '',
      username: body.username || '',
      password: hashedPassword,
      role: body.role || 'COMPANY_ADMIN',
      company_id: body.company_id || null,
      permissions: body.permissions || [],
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    const { password, ...safe } = item;
    return json(safe, 201);
  }
  
  if (method === 'PUT' && id) {
    const updates = { ...body };
    delete updates.id;
    delete updates._id; // Rimuovi _id di MongoDB (immutabile)
    delete updates.created_at;
    
    // Hash password se viene cambiata
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    await col.updateOne({ id }, { $set: updates });
    const updated = await col.findOne({ id });
    const { password, ...safe } = updated;
    return json(safe);
  }
  
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ success: true });
  }
  
  return json({ error: 'Method not allowed' }, 405);
}


async function handleRoute(request, resolvedParams, method) {
  try {
    const pathSegments = resolvedParams?.path || [];
    const { searchParams } = new URL(request.url);
    let body = null;
    if (['POST', 'PUT'].includes(method)) {
      try { body = await request.json(); } catch (e) { body = {}; }
    }
    const entity = pathSegments[0];
    const id = pathSegments[1];
    const action = pathSegments[2] || searchParams.get('action');

    // Route GPS speciale
    if (entity === 'gps') {
      // gps/test -> test connessione
      if (pathSegments[1] === 'test') {
        return await handleGPSTest(method);
      }
      // gps/history/{imei} -> storico GPS
      if (pathSegments[1] === 'history') {
        return await handleGPSHistory(method, pathSegments, searchParams);
      }
      // gps/analytics/{imei} -> analytics GPS
      if (pathSegments[1] === 'analytics') {
        return await handleGPSAnalytics(method, pathSegments, searchParams);
      }
      // gps/devices -> dispositivi real-time
      return await handleGPS(method, pathSegments);
    }

    switch (entity) {
      case 'experiences': return await handleExperiences(method, id, body, searchParams);
      case 'resources': return await handleResources(method, id, body, searchParams);
      case 'slots': return await handleSlots(method, id, body, action, searchParams);
      case 'bookings': 
        // bookings/by-resource -> prenotazioni per risorsa e data
        if (id === 'by-resource') {
          return await handleBookingsByResource(method, searchParams);
        }
        return await handleBookings(method, id, body, action, searchParams);
      case 'vouchers': return await handleVouchers(method, id, body, action, searchParams);
      case 'waitlist': return await handleWaitlist(method, id, body, action, searchParams);
      case 'agencies': return await handleAgencies(method, id, body, action, searchParams);
      case 'companies': return await handleCompaniesNew(method, id, body, action, searchParams);
      case 'users': return await handleUsersAuth(method, id, body, action, searchParams);
      case 'gps-config': return await handleGPSConfig(method, body);
      case 'upload': return await handleImageUpload(method, body);
      case 'upload-pdf': return await handlePDFUpload(method, body);
      case 'contact': return await handleContact(method, body);
      case 'stats': return await handleStats(searchParams);
      case 'marinas': {
        const { handleMarinas } = await import('./marinas');
        const db = await getDb();
        return await handleMarinas(method, id, body, action, searchParams, db);
      }
      case 'marina-quote': {
        const { handleMarinaQuote } = await import('./marinas');
        const db = await getDb();
        return await handleMarinaQuote(method, body, db);
      }
      case 'berths': {
        const { handleBerths } = await import('./berths');
        const db = await getDb();
        return await handleBerths(method, id, body, action, searchParams, db);
      }
      case 'port-quotes': {
        const { handlePortQuotes } = await import('./port_archive');
        const db = await getDb();
        return await handlePortQuotes(method, id, body, action, searchParams, db);
      }
      case 'port-settings': {
        const { handlePortSettings } = await import('./port_archive');
        const db = await getDb();
        return await handlePortSettings(method, id, body, action, searchParams, db);
      }
      case 'cantiere': {
        const { handleCantiereQuotes } = await import('./cantiere');
        const db = await getDb();
        return await handleCantiereQuotes(method, id, body, action, searchParams, db);
      }
      case 'cantiere-templates': {
        const { handleCantiereTemplates } = await import('./cantiere');
        const db = await getDb();
        return await handleCantiereTemplates(method, id, body, action, searchParams, db);
      }
      case 'marina-bookings': {
        const { handleMarinaBookings } = await import('./marina_bookings');
        const db = await getDb();
        return await handleMarinaBookings(method, id, body, action, searchParams, db);
      }
      case 'send-receipt-email': {
        const { handleSendReceiptEmail } = await import('./send_email');
        return await handleSendReceiptEmail(method, body);
      }
      case 'seed': if (method === 'POST') return await handleSeed(); return json({ error: 'Use POST' }, 405);
      case 'health': return json({ status: 'ok', timestamp: new Date().toISOString() });
      default: return json({ error: 'Endpoint non trovato' }, 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return json({ error: error.message || 'Errore interno del server' }, 500);
  }
}

export async function GET(request, { params }) {
  const p = await params;
  return handleRoute(request, p, 'GET');
}
export async function POST(request, { params }) {
  const p = await params;


// ============ COMPANIES (Multi-Tenant) ============
async function handleCompanies(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('companies');
  
  if (method === 'GET' && !id) {
    // Supporto per query by slug
    const slug = sp.get('slug');
    if (slug) {
      const item = await col.findOne({ slug });
      return item ? json(item) : json({ error: 'Company non trovata' }, 404);
    }
    
    const items = await col.find({}).sort({ created_at: -1 }).toArray();
    return json(items);
  }
  
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    return item ? json(item) : json({ error: 'Company non trovata' }, 404);
  }
  
  if (method === 'POST') {
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const item = {
      id: uuidv4(),
      name: body.name || '',
      slug,
      legal_form: body.legal_form || 'S.R.L.',
      vat_number: body.vat_number || '',
      legal_address: body.legal_address || '',
      sdi_code: body.sdi_code || '',
      
      // Branding
      logo_url: body.logo_url || '',
      primary_color: body.primary_color || '#0066CC',
      secondary_color: body.secondary_color || '#FF6B35',
      hero_image: body.hero_image || '',
      
      // Contatti
      phone: body.phone || '',
      email: body.email || '',
      website: body.website || '',
      
      // Config
      is_active: true,
      subscription_plan: body.subscription_plan || 'STANDARD',
      max_experiences: Number(body.max_experiences) || 50,
      max_agencies: Number(body.max_agencies) || 10,
      
      // Stats
      total_bookings: 0,
      total_revenue: 0,
      
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return json(item, 201);
  }
  
  if (method === 'PUT' && id) {
    const { id: _, created_at, total_bookings, total_revenue, ...updateData } = body;
    await col.updateOne({ id }, { $set: { ...updateData, updated_at: new Date().toISOString() } });
    const updated = await col.findOne({ id });
    return json(updated);
  }
  
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ success: true });
  }
  
  return json({ error: 'Method not allowed' }, 405);
}

// ============ USERS (Multi-Role) ============
async function handleUsers(method, id, body, action, sp) {
  const db = await getDb();
  const col = db.collection('users');
  
  // Login con bcrypt
  if (action === 'login') {
    const user = await col.findOne({ email: body.email });
    if (!user) {
      return json({ error: 'Credenziali non valide' }, 401);
    }
    
    // Verifica password con bcrypt
    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return json({ error: 'Credenziali non valide' }, 401);
    }
    
    if (!user.is_active) {
      return json({ error: 'Account disattivato' }, 403);
    }
    
    const { password, ...safeUser } = user;
    return json({ user: safeUser });
  }
  
  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('role')) filter.role = sp.get('role');
    const items = await col.find(filter).sort({ created_at: -1 }).toArray();
    const safe = items.map(({ password, ...u }) => u);
    return json(safe);
  }
  
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Utente non trovato' }, 404);
    const { password, ...safe } = item;
    return json(safe);
  }
  
  if (method === 'POST') {
    const existingUser = await col.findOne({ email: body.email });
    if (existingUser) {
      return json({ error: 'Email già registrata' }, 400);
    }
    
    // Hash password con bcrypt
    const hashedPassword = await bcrypt.hash(body.password || 'changeme', 10);
    
    const item = {
      id: uuidv4(),
      email: body.email || '',
      username: body.username || '',
      password: hashedPassword,
      role: body.role || 'COMPANY_ADMIN',
      company_id: body.company_id || null,
      permissions: body.permissions || [],
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    const { password, ...safe } = item;
    return json(safe, 201);
  }
  
  if (method === 'PUT' && id) {
    const { id: _, created_at, ...updateData } = body;
    if (!updateData.password) delete updateData.password;
    await col.updateOne({ id }, { $set: { ...updateData, updated_at: new Date().toISOString() } });
    const updated = await col.findOne({ id });
    const { password, ...safe } = updated;
    return json(safe);
  }
  
  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return json({ success: true });
  }
  
  return json({ error: 'Method not allowed' }, 405);
}

  return handleRoute(request, p, 'POST');
}
export async function PUT(request, { params }) {
  const p = await params;
  return handleRoute(request, p, 'PUT');
}
export async function DELETE(request, { params }) {
  const p = await params;
  return handleRoute(request, p, 'DELETE');
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
