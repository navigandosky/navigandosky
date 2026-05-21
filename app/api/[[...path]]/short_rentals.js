// =====================================================================
// LOCAZIONI BREVI (Short-Term Rentals) - Backend Handlers
// Manages: Bikes, Cars, Apartments, Villas, Boats (rental side)
// Collections:
//   - rental_units    (catalog of bookable units / pools)
//   - rental_bookings (bookings on units)
// Pricing: seasonal price tiers per unit (max 4 seasons) + fallback base_price
// Duration: DAYS (bike/car/boat) or NIGHTS (apartment/villa)
// Availability:
//   - NOMINAL unit: 1 unit -> cannot overlap any other CONFIRMED/HELD booking
//   - POOL unit: quantity-based -> sum(bookings) <= quantity
// =====================================================================

import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const json = (data, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

// ---- Helpers ----
const RENTAL_CATEGORIES = ['BIKE', 'CAR', 'APARTMENT', 'VILLA', 'BOAT'];
const ACTIVE_STATUSES = ['HELD', 'PENDING', 'CONFIRMED'];

function defaultDurationUnit(category) {
  if (category === 'APARTMENT' || category === 'VILLA') return 'NIGHTS';
  return 'DAYS';
}

function parseISODate(s) {
  if (!s) return null;
  // Normalize to YYYY-MM-DD
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

function diffDays(start, end) {
  // Returns number of NIGHTS between two dates (end - start) at midnight
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  const ms = e.getTime() - s.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// Check if two date ranges overlap (date-based)
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  // [aStart, aEnd) vs [bStart, bEnd)
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

// Compute price for a booking date range given seasonal pricing
// seasons: [{ id, name, start_date, end_date, price_per_unit, min_duration }]
// returns: { breakdown: [{ name, days, price_per_day, subtotal }], total }
function computePrice(startDate, endDate, durationUnit, quantity, unit) {
  const breakdown = [];
  let total = 0;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const totalDays = diffDays(start, end);
  // For DAYS mode (bike/car/boat) we may bill an extra day if same-day (>= 1)
  const billableUnits = durationUnit === 'NIGHTS' ? totalDays : Math.max(1, totalDays);

  if (billableUnits === 0) return { breakdown: [], total: 0, billable_units: 0 };

  const seasons = Array.isArray(unit?.seasonal_pricing) ? unit.seasonal_pricing : [];
  const basePrice = Number(unit?.base_price || 0);
  const qty = Math.max(1, Number(quantity || 1));

  // Iterate day-by-day to find matching season
  const seasonAgg = new Map(); // key: seasonId|BASE -> { name, days, price_per_unit }
  for (let i = 0; i < billableUnits; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    let matched = null;
    for (const s of seasons) {
      const sStart = parseISODate(s.start_date);
      const sEnd = parseISODate(s.end_date);
      if (!sStart || !sEnd) continue;
      // Inclusive range
      if (day >= sStart && day <= sEnd) {
        matched = s;
        break;
      }
    }
    const key = matched ? matched.id || matched.name || 'season' : 'BASE';
    const name = matched ? matched.name : 'Tariffa Base';
    const ppu = matched ? Number(matched.price_per_unit || 0) : basePrice;
    if (!seasonAgg.has(key)) {
      seasonAgg.set(key, { name, days: 0, price_per_unit: ppu });
    }
    const obj = seasonAgg.get(key);
    obj.days += 1;
  }

  for (const v of seasonAgg.values()) {
    const subtotal = Math.round(v.days * v.price_per_unit * qty * 100) / 100;
    breakdown.push({ name: v.name, days: v.days, price_per_unit: v.price_per_unit, subtotal });
    total += subtotal;
  }
  total = Math.round(total * 100) / 100;
  return { breakdown, total, billable_units: billableUnits };
}

// =====================================================================
// RENTAL UNITS HANDLER
// =====================================================================
export async function handleRentalUnits(method, id, body, action, sp, db) {
  const col = db.collection('rental_units');

  // GET list
  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('category')) filter.category = sp.get('category');
    if (sp.get('active') === 'true') filter.is_active = true;
    const isPublic = sp.get('public') === 'true';
    if (isPublic) {
      filter.is_active = true;
      filter.is_visible_on_home = { $ne: false };
    }
    let items = await col.find(filter).sort({ category: 1, name: 1 }).toArray();
    // Remove MongoDB _id from all items
    items.forEach(item => delete item._id);
    // For public, exclude units from suspended companies
    if (isPublic) {
      const suspended = await db.collection('companies').find(
        { is_active: false },
        { projection: { id: 1 } }
      ).toArray();
      const suspendedIds = new Set(suspended.map((c) => c.id));
      if (suspendedIds.size > 0) {
        items = items.filter((u) => !u.company_id || !suspendedIds.has(u.company_id));
      }
    }
    return json(items);
  }

  // GET single
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Unità non trovata' }, 404);
    delete item._id;
    return json(item);
  }

  // CREATE
  if (method === 'POST' && !id) {
    if (!body?.name) return json({ error: 'Nome unità obbligatorio' }, 400);
    const category = RENTAL_CATEGORIES.includes(body.category) ? body.category : 'BIKE';
    const unit_mode = body.unit_mode === 'POOL' ? 'POOL' : 'NOMINAL';
    const duration_unit = body.duration_unit === 'NIGHTS' || body.duration_unit === 'DAYS'
      ? body.duration_unit
      : defaultDurationUnit(category);

    const item = {
      id: uuidv4(),
      company_id: body.company_id || null,
      name: String(body.name).trim(),
      category,
      unit_mode,
      quantity: unit_mode === 'POOL' ? Math.max(1, Number(body.quantity || 1)) : 1,
      duration_unit,
      check_in_time: body.check_in_time || (duration_unit === 'NIGHTS' ? '16:00' : '09:00'),
      check_out_time: body.check_out_time || (duration_unit === 'NIGHTS' ? '10:00' : '19:00'),
      description: body.description || '',
      images: Array.isArray(body.images) ? body.images : [],
      location: body.location || '',
      address: body.address || '',
      max_guests: body.max_guests ? Number(body.max_guests) : null,
      bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
      bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      base_price: Number(body.base_price || 0),
      seasonal_pricing: Array.isArray(body.seasonal_pricing) ? body.seasonal_pricing.slice(0, 4).map(s => ({
        id: s.id || uuidv4(),
        name: s.name || 'Stagione',
        start_date: s.start_date || '',
        end_date: s.end_date || '',
        price_per_unit: Number(s.price_per_unit || 0),
        min_duration: s.min_duration ? Number(s.min_duration) : null,
      })) : [],
      min_duration: body.min_duration ? Number(body.min_duration) : null,
      deposit_percentage: body.deposit_percentage ? Number(body.deposit_percentage) : 30,
      is_active: body.is_active !== false,
      is_visible_on_home: body.is_visible_on_home !== false, // default true
      home_priority: Math.max(0, Math.min(8, Number(body.home_priority || 0))),
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    delete item._id;
    return json(item, 201);
  }

  // UPDATE
  if (method === 'PUT' && id) {
    const { _id, id: _, created_at, ...rest } = body || {};
    if (rest.quantity !== undefined) rest.quantity = Math.max(1, Number(rest.quantity || 1));
    if (rest.base_price !== undefined) rest.base_price = Number(rest.base_price || 0);
    if (rest.deposit_percentage !== undefined) rest.deposit_percentage = Number(rest.deposit_percentage || 0);
    if (rest.home_priority !== undefined) rest.home_priority = Math.max(0, Math.min(8, Number(rest.home_priority || 0)));
    if (Array.isArray(rest.seasonal_pricing)) {
      rest.seasonal_pricing = rest.seasonal_pricing.slice(0, 4).map(s => ({
        id: s.id || uuidv4(),
        name: s.name || 'Stagione',
        start_date: s.start_date || '',
        end_date: s.end_date || '',
        price_per_unit: Number(s.price_per_unit || 0),
        min_duration: s.min_duration ? Number(s.min_duration) : null,
      }));
    }
    rest.updated_at = new Date().toISOString();
    const r = await col.findOneAndUpdate({ id }, { $set: rest }, { returnDocument: 'after' });
    if (!r) return json({ error: 'Unità non trovata' }, 404);
    delete r._id;
    return json(r);
  }

  // DELETE
  if (method === 'DELETE' && id) {
    // Block deletion if active bookings exist
    const activeBk = await db.collection('rental_bookings').countDocuments({
      unit_id: id,
      status: { $in: ACTIVE_STATUSES },
    });
    if (activeBk > 0) {
      return json({ error: `Impossibile eliminare: esistono ${activeBk} prenotazioni attive su questa unità` }, 400);
    }
    await col.deleteOne({ id });
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// =====================================================================
// AVAILABILITY CHECK
// GET /api/rental-units/availability?unit_id=...&start_date=...&end_date=...&quantity=1
// =====================================================================
export async function handleRentalAvailability(sp, db) {
  const unitId = sp.get('unit_id');
  const startDate = sp.get('start_date');
  const endDate = sp.get('end_date');
  const quantity = Math.max(1, Number(sp.get('quantity') || 1));
  const excludeBookingId = sp.get('exclude_booking_id') || null;

  if (!unitId || !startDate || !endDate) {
    return json({ error: 'Parametri obbligatori: unit_id, start_date, end_date' }, 400);
  }

  const unit = await db.collection('rental_units').findOne({ id: unitId });
  if (!unit) return json({ error: 'Unità non trovata' }, 404);

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end || end <= start) {
    return json({ error: 'Date non valide (end_date deve essere successiva a start_date)' }, 400);
  }

  // Fetch overlapping active bookings
  const bookings = await db.collection('rental_bookings').find({
    unit_id: unitId,
    status: { $in: ACTIVE_STATUSES },
    ...(excludeBookingId ? { id: { $ne: excludeBookingId } } : {}),
  }).toArray();

  const overlapping = bookings.filter(b => rangesOverlap(b.start_date, b.end_date, startDate, endDate));

  let available = true;
  let availableQuantity = 0;
  let reason = '';

  if (unit.unit_mode === 'NOMINAL') {
    available = overlapping.length === 0;
    availableQuantity = available ? 1 : 0;
    if (!available) reason = `Unità già prenotata in queste date (${overlapping.length} sovrapposizione/i)`;
  } else {
    // POOL: sum quantity of overlapping bookings
    const used = overlapping.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
    availableQuantity = Math.max(0, Number(unit.quantity || 1) - used);
    available = availableQuantity >= quantity;
    if (!available) reason = `Solo ${availableQuantity} unità disponibili (richieste ${quantity})`;
  }

  // Compute price
  const pricing = computePrice(startDate, endDate, unit.duration_unit, quantity, unit);

  // Check min_duration
  let minDurationOk = true;
  if (unit.min_duration && pricing.billable_units < Number(unit.min_duration)) {
    minDurationOk = false;
    available = false;
    reason = `Durata minima: ${unit.min_duration} ${unit.duration_unit === 'NIGHTS' ? 'notti' : 'giorni'}`;
  }

  return json({
    available,
    available_quantity: availableQuantity,
    requested_quantity: quantity,
    reason,
    overlapping_count: overlapping.length,
    unit: { id: unit.id, name: unit.name, category: unit.category, unit_mode: unit.unit_mode, duration_unit: unit.duration_unit },
    pricing,
    min_duration_ok: minDurationOk,
  });
}

// =====================================================================
// RENTAL BOOKINGS HANDLER
// =====================================================================
export async function handleRentalBookings(method, id, body, action, sp, db) {
  const col = db.collection('rental_bookings');

  // GET list
  if (method === 'GET' && !id) {
    const filter = {};
    if (sp.get('company_id')) filter.company_id = sp.get('company_id');
    if (sp.get('unit_id')) filter.unit_id = sp.get('unit_id');
    if (sp.get('category')) filter.category = sp.get('category');
    if (sp.get('status')) filter.status = sp.get('status');
    if (sp.get('customer_email')) filter['customer.email'] = sp.get('customer_email');
    if (sp.get('agency_id')) filter.agency_id = sp.get('agency_id');
    // Date range filter: bookings that intersect [from, to]
    const from = sp.get('from');
    const to = sp.get('to');
    if (from && to) {
      filter.$and = [
        { start_date: { $lt: to } },
        { end_date: { $gt: from } },
      ];
    }
    const items = await col.find(filter).sort({ start_date: -1 }).toArray();
    // Remove MongoDB _id from all items
    items.forEach(item => delete item._id);
    return json(items);
  }

  // GET single
  if (method === 'GET' && id) {
    const item = await col.findOne({ id });
    if (!item) return json({ error: 'Prenotazione non trovata' }, 404);
    delete item._id;
    return json(item);
  }

  // CREATE
  if (method === 'POST' && !id) {
    const { unit_id, start_date, end_date } = body || {};
    if (!unit_id || !start_date || !end_date) {
      return json({ error: 'unit_id, start_date, end_date sono obbligatori' }, 400);
    }
    const unit = await db.collection('rental_units').findOne({ id: unit_id });
    if (!unit) return json({ error: 'Unità non trovata' }, 404);

    const start = parseISODate(start_date);
    const end = parseISODate(end_date);
    if (!start || !end || end <= start) {
      return json({ error: 'Date non valide' }, 400);
    }

    const quantity = unit.unit_mode === 'POOL' ? Math.max(1, Number(body.quantity || 1)) : 1;

    // Availability check (re-use logic)
    const bookings = await col.find({
      unit_id,
      status: { $in: ACTIVE_STATUSES },
    }).toArray();
    const overlapping = bookings.filter(b => rangesOverlap(b.start_date, b.end_date, start_date, end_date));

    if (unit.unit_mode === 'NOMINAL' && overlapping.length > 0) {
      return json({ error: 'Unità non disponibile nelle date selezionate' }, 409);
    }
    if (unit.unit_mode === 'POOL') {
      const used = overlapping.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
      const free = Number(unit.quantity || 1) - used;
      if (free < quantity) {
        return json({ error: `Solo ${free} unità disponibili (richieste ${quantity})` }, 409);
      }
    }

    // Compute pricing
    const pricing = computePrice(start_date, end_date, unit.duration_unit, quantity, unit);

    // Check min_duration
    if (unit.min_duration && pricing.billable_units < Number(unit.min_duration)) {
      return json({ error: `Durata minima: ${unit.min_duration} ${unit.duration_unit === 'NIGHTS' ? 'notti' : 'giorni'}` }, 400);
    }

    // Booking number progressive RB-YYYY/NNNN
    const year = new Date().getFullYear();
    const last = await col.find({ year }).sort({ progressive: -1 }).limit(1).toArray();
    const progressive = (last[0]?.progressive || 0) + 1;
    const booking_number = `RB-${year}/${String(progressive).padStart(4, '0')}`;

    // Optional agency commission
    let agency_commission_pct = 0;
    let commission_amount = 0;
    if (body.agency_id) {
      const ag = await db.collection('agencies').findOne({ id: body.agency_id });
      if (ag) {
        agency_commission_pct = Number(ag.commission_percentage || ag.commission_pct || 0);
      }
    }
    const totalForCommission = Number(body.total_amount ?? pricing.total ?? 0);
    if (agency_commission_pct > 0) {
      commission_amount = Math.round(totalForCommission * agency_commission_pct / 100 * 100) / 100;
    }

    const finalTotal = body.total_amount !== undefined ? Number(body.total_amount) : pricing.total;
    const depositPct = Number(body.deposit_pct ?? unit.deposit_percentage ?? 30);
    const deposit_amount = Math.round(finalTotal * depositPct / 100 * 100) / 100;
    const balance_amount = Math.round((finalTotal - deposit_amount) * 100) / 100;

    const item = {
      id: uuidv4(),
      booking_number,
      year,
      progressive,
      company_id: body.company_id || unit.company_id || null,
      // Unit
      unit_id: unit.id,
      unit_name: unit.name,
      category: unit.category,
      unit_mode: unit.unit_mode,
      duration_unit: unit.duration_unit,
      // Dates
      start_date,
      end_date,
      check_in_time: body.check_in_time || unit.check_in_time,
      check_out_time: body.check_out_time || unit.check_out_time,
      duration_value: pricing.billable_units,
      // Quantity & guests
      quantity,
      guests_count: body.guests_count ? Number(body.guests_count) : null,
      // Customer
      customer: {
        name: body.customer?.name || body.customer_name || '',
        email: body.customer?.email || body.customer_email || '',
        phone: body.customer?.phone || body.customer_phone || '',
        document_number: body.customer?.document_number || '',
        notes: body.customer?.notes || '',
      },
      // Pricing
      pricing_breakdown: pricing.breakdown,
      total_amount: finalTotal,
      deposit_pct: depositPct,
      deposit_amount,
      balance_amount,
      // Payment
      payment_status: body.payment_status || 'PENDING',
      payment_method: body.payment_method || '',
      // Agency (B2B - reuse existing commissions)
      agency_id: body.agency_id || null,
      agency_name: body.agency_name || null,
      agency_commission_pct,
      commission_amount,
      // Status
      status: body.status || 'CONFIRMED', // immediate confirm by default (admin creation)
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    delete item._id;

    // Send confirmation email (non-blocking, fire-and-forget)
    if (item.customer?.email) {
      (async () => {
        try {
          const { sendRentalConfirmationEmail } = await import('./rental_voucher_email');
          const company = await db.collection('companies').findOne({ id: item.company_id });
          const result = await sendRentalConfirmationEmail(item, unit, company);
          if (result?.ok) {
            console.log(`[rental-bookings] confirmation email sent: ${item.booking_number} -> ${item.customer.email} via ${result.provider}`);
            await col.updateOne(
              { id: item.id },
              { $set: { confirmation_email_sent_at: new Date().toISOString(), confirmation_email_provider: result.provider } }
            );
          } else if (!result?.skipped) {
            console.warn(`[rental-bookings] email failed: ${result?.error}`);
          }
        } catch (e) {
          console.error('[rental-bookings] email exception:', e?.message);
        }
      })();
    }

    return json(item, 201);
  }

  // UPDATE
  if (method === 'PUT' && id) {
    const existing = await col.findOne({ id });
    if (!existing) return json({ error: 'Prenotazione non trovata' }, 404);

    const { _id, id: _, created_at, booking_number, year, progressive, ...rest } = body || {};

    // If dates / quantity / unit change -> recheck availability + repricing
    const dateChanged = (rest.start_date && rest.start_date !== existing.start_date) ||
                        (rest.end_date && rest.end_date !== existing.end_date) ||
                        (rest.unit_id && rest.unit_id !== existing.unit_id) ||
                        (rest.quantity !== undefined && Number(rest.quantity) !== Number(existing.quantity));

    if (dateChanged) {
      const newUnitId = rest.unit_id || existing.unit_id;
      const newStart = rest.start_date || existing.start_date;
      const newEnd = rest.end_date || existing.end_date;
      const unit = await db.collection('rental_units').findOne({ id: newUnitId });
      if (!unit) return json({ error: 'Unità non trovata' }, 404);

      const newQty = unit.unit_mode === 'POOL' ? Math.max(1, Number(rest.quantity ?? existing.quantity ?? 1)) : 1;
      // Re-check availability excluding this booking
      const others = await col.find({
        unit_id: newUnitId,
        id: { $ne: id },
        status: { $in: ACTIVE_STATUSES },
      }).toArray();
      const overlapping = others.filter(b => rangesOverlap(b.start_date, b.end_date, newStart, newEnd));

      if (unit.unit_mode === 'NOMINAL' && overlapping.length > 0) {
        return json({ error: 'Unità non disponibile nelle nuove date' }, 409);
      }
      if (unit.unit_mode === 'POOL') {
        const used = overlapping.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
        const free = Number(unit.quantity || 1) - used;
        if (free < newQty) {
          return json({ error: `Solo ${free} unità disponibili (richieste ${newQty})` }, 409);
        }
      }

      const pricing = computePrice(newStart, newEnd, unit.duration_unit, newQty, unit);
      rest.unit_name = unit.name;
      rest.category = unit.category;
      rest.unit_mode = unit.unit_mode;
      rest.duration_unit = unit.duration_unit;
      rest.duration_value = pricing.billable_units;
      rest.quantity = newQty;
      if (rest.total_amount === undefined) {
        rest.pricing_breakdown = pricing.breakdown;
        rest.total_amount = pricing.total;
        const depositPct = Number(rest.deposit_pct ?? existing.deposit_pct ?? unit.deposit_percentage ?? 30);
        rest.deposit_amount = Math.round(pricing.total * depositPct / 100 * 100) / 100;
        rest.balance_amount = Math.round((pricing.total - rest.deposit_amount) * 100) / 100;
      }
    }

    rest.updated_at = new Date().toISOString();
    const r = await col.findOneAndUpdate({ id }, { $set: rest }, { returnDocument: 'after' });
    if (r) delete r._id;
    return json(r);
  }

  // DELETE
  if (method === 'DELETE' && id) {
    const r = await col.findOneAndDelete({ id });
    if (!r) return json({ error: 'Prenotazione non trovata' }, 404);
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// =====================================================================
// STATS / DASHBOARD
// GET /api/rental-stats?company_id=...
// =====================================================================
export async function handleRentalStats(sp, db) {
  const filter = {};
  if (sp.get('company_id')) filter.company_id = sp.get('company_id');

  const units = await db.collection('rental_units').find(filter).toArray();
  const bookings = await db.collection('rental_bookings').find(filter).toArray();

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const activeBookings = bookings.filter(b =>
    ACTIVE_STATUSES.includes(b.status) &&
    b.start_date <= todayISO &&
    b.end_date > todayISO,
  );

  const upcoming = bookings.filter(b =>
    ACTIVE_STATUSES.includes(b.status) &&
    b.start_date > todayISO,
  );

  const totalRevenue = bookings
    .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.payment_status === 'PAID')
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const byCategory = {};
  for (const cat of RENTAL_CATEGORIES) {
    const cUnits = units.filter(u => u.category === cat);
    const cBookings = bookings.filter(b => b.category === cat);
    byCategory[cat] = {
      units: cUnits.length,
      active_units: cUnits.filter(u => u.is_active).length,
      bookings: cBookings.length,
      revenue: cBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0),
    };
  }

  return json({
    total_units: units.length,
    active_units: units.filter(u => u.is_active).length,
    total_bookings: bookings.length,
    active_now: activeBookings.length,
    upcoming: upcoming.length,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    by_category: byCategory,
  });
}

// =====================================================================
// PRICE CHECK (without booking creation)
// POST /api/rental-units/price-check
// =====================================================================
export async function handlePriceCheck(body, db) {
  const { unit_id, start_date, end_date, quantity } = body || {};
  if (!unit_id || !start_date || !end_date) {
    return json({ error: 'Parametri obbligatori: unit_id, start_date, end_date' }, 400);
  }
  const unit = await db.collection('rental_units').findOne({ id: unit_id });
  if (!unit) return json({ error: 'Unità non trovata' }, 404);
  const qty = Math.max(1, Number(quantity || 1));
  const pricing = computePrice(start_date, end_date, unit.duration_unit, qty, unit);
  return json({
    unit_id,
    unit_name: unit.name,
    duration_unit: unit.duration_unit,
    quantity: qty,
    ...pricing,
  });
}
