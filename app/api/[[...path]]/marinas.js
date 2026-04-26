import { v4 as uuidv4 } from 'uuid';

// Handler completo per marine (porti turistici).
// Accessibile a tutti per lettura, modifica solo da SUPER_ADMIN (proprietà Trivor).
export async function handleMarinas(method, id, body, action, sp, db) {
  const col = db.collection('marinas');

  if (method === 'GET' && !id) {
    const filter = {};
    const slug = sp?.get?.('slug');
    if (slug) filter.slug = slug;
    if (sp?.get?.('is_active') === 'true') filter.is_active = true;
    const items = await col.find(filter).sort({ display_order: 1, name: 1 }).toArray();
    return new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (method === 'GET' && id) {
    // Permette anche fetch per slug (oltre che per id)
    let item = await col.findOne({ id });
    if (!item) item = await col.findOne({ slug: id });
    if (!item) return new Response(JSON.stringify({ error: 'Marina not found' }), { status: 404 });
    return new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && !id) {
    const item = {
      id: uuidv4(),
      name: body.name,
      slug: body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description || '',
      short_description: body.short_description || '',
      cover_image: body.cover_image || '',
      images: body.images || [],
      location: body.location || '',
      address: body.address || '',
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      total_berths: Number(body.total_berths) || 0,
      contact_phone: body.contact_phone || '',
      contact_email: body.contact_email || '',
      contact_whatsapp: body.contact_whatsapp || '',
      services: body.services || [], // ['water', 'electricity', 'wifi', 'security', 'fuel', 'crane', ...]
      // Pricing
      pricing: body.pricing || {
        annual: [], // [{length: 5, price: 940}, ...]
        daily_by_month: {}, // { '7': [{length, price}], '8': [...], '9': [...] }
        monthly_by_month: {}, // same structure
        summer_flat: [], // forfait estivo (1/6 - 30/9)
        yard_services: {}, // { 'parking_daily': [{length,price}], 'parking_monthly': [...], 'launch': [...], ... }
        engine_storage: {}, // { 'fb_2t': {hp_5, hp_15, ...}, 'fb_4t': {...}, 'eb': {...} }
      },
      pricing_notes: body.pricing_notes || [],
      // Multi-tenant
      owner: body.owner || 'TRIVOR', // 'TRIVOR' = condivisa | company_id = privata
      shared_with_companies: body.shared_with_companies || [], // company_ids con accesso
      display_order: Number(body.display_order) || 0,
      is_active: body.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await col.insertOne(item);
    return new Response(JSON.stringify(item), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'PUT' && id) {
    const update = { ...body, updated_at: new Date().toISOString() };
    delete update.id;
    delete update._id;
    await col.updateOne({ id }, { $set: update });
    const updated = await col.findOne({ id });
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && id) {
    await col.deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}

// Calcolo preventivo per una marina
// body: { marina_id, boat_type: 'sail'|'motor', boat_length, start_date, end_date, services: [...], engine_type?, engine_hp? }
export async function handleMarinaQuote(method, body, db) {
  if (method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  
  const marina = await db.collection('marinas').findOne({ id: body.marina_id });
  if (!marina) return new Response(JSON.stringify({ error: 'Marina non trovata' }), { status: 404 });
  
  const length = Number(body.boat_length);
  const start = new Date(body.start_date);
  const end = new Date(body.end_date);
  if (isNaN(start) || isNaN(end) || end < start) {
    return new Response(JSON.stringify({ error: 'Date non valide' }), { status: 400 });
  }
  
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const pricing = marina.pricing || {};
  
  // Helper: trova prezzo per length nella tier list
  const findPriceForLength = (tiers, len) => {
    if (!Array.isArray(tiers) || tiers.length === 0) return null;
    // Trova la prima tier con length >= len, oppure l'ultima
    const sorted = [...tiers].sort((a, b) => (a.length || 0) - (b.length || 0));
    for (const t of sorted) {
      if (len <= (t.length || 999)) return t.price;
    }
    return sorted[sorted.length - 1]?.price || null;
  };
  
  // Verifica se il periodo ricade interamente nel forfait estivo (1/6 - 30/9)
  const startMonth = start.getMonth() + 1;
  const endMonth = end.getMonth() + 1;
  const isInSummer = startMonth >= 6 && endMonth <= 9;
  const isFullSummer = (
    start.getMonth() === 5 && start.getDate() <= 1 && // dal 1 giugno
    end.getMonth() === 8 && end.getDate() >= 30        // al 30 settembre
  );
  
  // Calcola opzioni alternative
  const options = [];
  
  // Opzione 1: tariffa giornaliera (somma giorni per mese)
  if (pricing.daily_by_month) {
    let dailyTotal = 0;
    let dailyDetail = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const mo = String(cursor.getMonth() + 1);
      const dayPrice = findPriceForLength(pricing.daily_by_month[mo] || [], length);
      if (dayPrice != null) {
        dailyTotal += dayPrice;
        const found = dailyDetail.find(d => d.month === mo);
        if (found) found.days++;
        else dailyDetail.push({ month: mo, days: 1, daily_price: dayPrice });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (dailyTotal > 0) {
      options.push({
        type: 'daily',
        label: `Tariffa giornaliera (${days} giorni)`,
        total: dailyTotal,
        detail: dailyDetail.map(d => ({
          ...d,
          subtotal: d.days * d.daily_price,
          month_name: ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'][parseInt(d.month)]
        }))
      });
    }
  }
  
  // Opzione 2: tariffa mensile (se >= 28 giorni)
  if (days >= 28 && pricing.monthly_by_month) {
    const months = Math.ceil(days / 30);
    let monthlyTotal = 0;
    let monthlyDetail = [];
    // Per semplicità usiamo il mese di inizio
    const mo = String(startMonth);
    const monthPrice = findPriceForLength(pricing.monthly_by_month[mo] || [], length);
    if (monthPrice) {
      monthlyTotal = monthPrice * months;
      monthlyDetail.push({ month: mo, months, monthly_price: monthPrice, subtotal: monthlyTotal });
      options.push({
        type: 'monthly',
        label: `Tariffa mensile (${months} mese${months > 1 ? 'i' : ''})`,
        total: monthlyTotal,
        detail: monthlyDetail
      });
    }
  }

  // Opzione 3: forfait estivo (se nel periodo 1/6 - 30/9)
  if (isInSummer && pricing.summer_flat?.length > 0) {
    const flatPrice = findPriceForLength(pricing.summer_flat, length);
    if (flatPrice) {
      options.push({
        type: 'summer_flat',
        label: 'Forfait Estivo (1 giugno - 30 settembre)',
        total: flatPrice,
        detail: [{ subtotal: flatPrice }]
      });
    }
  }
  
  // Opzione 4: tariffa annuale (se >= 300 giorni)
  if (days >= 300 && pricing.annual?.length > 0) {
    const annualPrice = findPriceForLength(pricing.annual, length);
    if (annualPrice) {
      options.push({
        type: 'annual',
        label: 'Tariffa Annuale',
        total: annualPrice,
        detail: [{ subtotal: annualPrice }]
      });
    }
  }
  
  // Trova l'opzione più conveniente
  options.sort((a, b) => a.total - b.total);
  const recommended = options[0] || null;
  
  // Servizi extra selezionati
  const extras = [];
  let extrasTotal = 0;
  if (Array.isArray(body.services)) {
    for (const svc of body.services) {
      // svc = { type: 'launch'|'parking_daily'|..., quantity?, hp? }
      if (svc.type === 'parking_daily' && pricing.yard_services?.parking_daily) {
        const price = findPriceForLength(pricing.yard_services.parking_daily, length);
        if (price) {
          const qty = svc.quantity || days;
          const subtotal = price * qty;
          extras.push({ name: 'Sosta piazzale', detail: `${qty} giorni × €${price.toFixed(2)}`, subtotal });
          extrasTotal += subtotal;
        }
      } else if (svc.type === 'parking_monthly' && pricing.yard_services?.parking_monthly) {
        const price = findPriceForLength(pricing.yard_services.parking_monthly, length);
        if (price) {
          const qty = svc.quantity || 1;
          const subtotal = price * qty;
          extras.push({ name: 'Sosta piazzale (mensile)', detail: `${qty} mese${qty > 1 ? 'i' : ''} × €${price.toFixed(2)}`, subtotal });
          extrasTotal += subtotal;
        }
      } else if (svc.type === 'launch' && pricing.yard_services?.launch) {
        const price = findPriceForLength(pricing.yard_services.launch, length);
        if (price) {
          extras.push({ name: 'Alaggio o Varo a movimento', detail: `Lunghezza ${length}m`, subtotal: price });
          extrasTotal += price;
        }
      } else if (svc.type === 'hull_wash' && pricing.yard_services?.hull_wash) {
        const price = findPriceForLength(pricing.yard_services.hull_wash, length);
        if (price) {
          extras.push({ name: 'Lavaggio carena con pulivapor', detail: `Lunghezza ${length}m`, subtotal: price });
          extrasTotal += price;
        }
      } else if (svc.type === 'antifouling') {
        const coats = svc.coats === 2 ? 'antifouling_2' : 'antifouling_1';
        const price = findPriceForLength(pricing.yard_services?.[coats] || [], length);
        if (price) {
          extras.push({ name: `Antivegetativa ${svc.coats === 2 ? '2 mani' : '1 mano'}`, detail: `Lunghezza ${length}m`, subtotal: price });
          extrasTotal += price;
        }
      }
    }
  }
  
  return new Response(JSON.stringify({
    marina: { id: marina.id, name: marina.name, slug: marina.slug },
    boat: { type: body.boat_type, length },
    period: { start_date: body.start_date, end_date: body.end_date, days },
    options,
    recommended,
    extras,
    extras_total: extrasTotal,
    grand_total: (recommended?.total || 0) + extrasTotal,
    generated_at: new Date().toISOString()
  }), { headers: { 'Content-Type': 'application/json' } });
}
