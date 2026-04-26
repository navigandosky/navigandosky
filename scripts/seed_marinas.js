// Seed marine: Bosa Marina con tariffe complete + Capo Comino + Sena' E Sacchitta vuoti
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const BOSA_PRICING = {
  annual: [
    { length: 5, price: 940 }, { length: 5.5, price: 1090 }, { length: 6, price: 1250 },
    { length: 6.5, price: 1350 }, { length: 7, price: 1450 }, { length: 7.5, price: 1550 },
    { length: 8, price: 1650 }, { length: 8.5, price: 1750 }, { length: 9, price: 1850 },
    { length: 9.5, price: 2100 }, { length: 10, price: 2500 }, { length: 11, price: 3000 },
    { length: 12, price: 3600 }, { length: 13, price: 4200 }, { length: 14, price: 4800 },
    { length: 15, price: 5400 }, { length: 16, price: 6300 }, { length: 17, price: 7000 },
    { length: 18, price: 7800 }, { length: 19, price: 8700 }, { length: 20, price: 9600 }
  ],
  daily_by_month: {
    '7': [
      { length: 5, price: 16 }, { length: 5.5, price: 17 }, { length: 6, price: 18 },
      { length: 6.5, price: 19 }, { length: 7, price: 20 }, { length: 7.5, price: 21 },
      { length: 8, price: 22 }, { length: 8.5, price: 23 }, { length: 9, price: 24 },
      { length: 9.5, price: 27 }, { length: 10, price: 35 }, { length: 11, price: 40 },
      { length: 12, price: 45 }, { length: 13, price: 55 }, { length: 14, price: 65 },
      { length: 15, price: 75 }, { length: 16, price: 80 }, { length: 17, price: 90 },
      { length: 18, price: 100 }, { length: 19, price: 110 }, { length: 20, price: 120 }
    ],
    '8': [
      { length: 5, price: 19 }, { length: 5.5, price: 20 }, { length: 6, price: 21 },
      { length: 6.5, price: 22 }, { length: 7, price: 23 }, { length: 7.5, price: 24 },
      { length: 8, price: 25 }, { length: 8.5, price: 28 }, { length: 9, price: 33 },
      { length: 9.5, price: 37 }, { length: 10, price: 50 }, { length: 11, price: 50 },
      { length: 12, price: 55 }, { length: 13, price: 65 }, { length: 14, price: 75 },
      { length: 15, price: 85 }, { length: 16, price: 110 }, { length: 17, price: 130 },
      { length: 18, price: 150 }, { length: 19, price: 170 }, { length: 20, price: 200 }
    ],
    '9': [
      { length: 5, price: 12 }, { length: 5.5, price: 13 }, { length: 6, price: 14 },
      { length: 6.5, price: 15 }, { length: 7, price: 16 }, { length: 7.5, price: 17 },
      { length: 8, price: 18 }, { length: 8.5, price: 18 }, { length: 9, price: 19 },
      { length: 9.5, price: 22 }, { length: 10, price: 32 }, { length: 11, price: 32 },
      { length: 12, price: 36 }, { length: 13, price: 44 }, { length: 14, price: 52 },
      { length: 15, price: 60 }, { length: 16, price: 64 }, { length: 17, price: 72 },
      { length: 18, price: 80 }, { length: 19, price: 88 }, { length: 20, price: 96 }
    ]
  },
  monthly_by_month: {
    '7': [
      { length: 5, price: 384 }, { length: 5.5, price: 408 }, { length: 6, price: 432 },
      { length: 6.5, price: 456 }, { length: 7, price: 480 }, { length: 7.5, price: 504 },
      { length: 8, price: 528 }, { length: 8.5, price: 552 }, { length: 9, price: 576 },
      { length: 9.5, price: 648 }, { length: 10, price: 960 }, { length: 11, price: 1080 },
      { length: 12, price: 1320 }, { length: 13, price: 1560 }, { length: 14, price: 1800 },
      { length: 15, price: 1920 }, { length: 16, price: 2160 }, { length: 17, price: 2400 },
      { length: 18, price: 2640 }, { length: 19, price: 2880 }, { length: 20, price: 2880 }
    ],
    '8': [
      { length: 5, price: 471 }, { length: 5.5, price: 496 }, { length: 6, price: 521 },
      { length: 6.5, price: 546 }, { length: 7, price: 570 }, { length: 7.5, price: 595 },
      { length: 8, price: 620 }, { length: 8.5, price: 694 }, { length: 9, price: 818 },
      { length: 9.5, price: 918 }, { length: 10, price: 1116 }, { length: 11, price: 1240 },
      { length: 12, price: 1364 }, { length: 13, price: 1612 }, { length: 14, price: 1860 },
      { length: 15, price: 2108 }, { length: 16, price: 2728 }, { length: 17, price: 3224 },
      { length: 18, price: 3720 }, { length: 19, price: 4216 }, { length: 20, price: 4960 }
    ],
    '9': [
      { length: 5, price: 298 }, { length: 5.5, price: 322 }, { length: 6, price: 357 },
      { length: 6.5, price: 377 }, { length: 7, price: 397 }, { length: 7.5, price: 417 },
      { length: 8, price: 436 }, { length: 8.5, price: 456 }, { length: 9, price: 476 },
      { length: 9.5, price: 536 }, { length: 10, price: 694 }, { length: 11, price: 794 },
      { length: 12, price: 893 }, { length: 13, price: 1091 }, { length: 14, price: 1290 },
      { length: 15, price: 1488 }, { length: 16, price: 1587 }, { length: 17, price: 1786 },
      { length: 18, price: 1984 }, { length: 19, price: 2182 }, { length: 20, price: 2381 }
    ]
  },
  summer_flat: [
    { length: 5, price: 1104 }, { length: 5.5, price: 1174 }, { length: 6, price: 1253 },
    { length: 6.5, price: 1318 }, { length: 7, price: 1384 }, { length: 7.5, price: 1449 },
    { length: 8, price: 1514 }, { length: 8.5, price: 1629 }, { length: 9, price: 1794 },
    { length: 9.5, price: 2015 }, { length: 10, price: 2539 }, { length: 11, price: 2866 },
    { length: 12, price: 3194 }, { length: 13, price: 3848 }, { length: 14, price: 4503 },
    { length: 15, price: 5157 }, { length: 16, price: 5980 }, { length: 17, price: 6883 },
    { length: 18, price: 7786 }, { length: 19, price: 8688 }, { length: 20, price: 9839 }
  ],
  yard_services: {
    parking_daily: [
      { length: 5, price: 5 }, { length: 5.5, price: 5.5 }, { length: 6, price: 6 },
      { length: 6.5, price: 6.5 }, { length: 7, price: 7 }, { length: 7.5, price: 7.5 },
      { length: 8, price: 8 }, { length: 8.5, price: 8.5 }, { length: 9, price: 9 },
      { length: 9.5, price: 9.5 }, { length: 10, price: 10 }, { length: 11, price: 11 },
      { length: 12, price: 12 }, { length: 13, price: 13 }
    ],
    parking_monthly: [
      { length: 5, price: 65 }, { length: 5.5, price: 70 }, { length: 6, price: 70 },
      { length: 6.5, price: 75 }, { length: 7, price: 80 }, { length: 7.5, price: 85 },
      { length: 8, price: 90 }, { length: 8.5, price: 95 }, { length: 9, price: 100 },
      { length: 9.5, price: 110 }, { length: 10, price: 120 }, { length: 11, price: 140 },
      { length: 12, price: 170 }, { length: 13, price: 200 }
    ],
    launch: [
      { length: 5, price: 45 }, { length: 5.5, price: 45 }, { length: 6, price: 55 },
      { length: 6.5, price: 60 }, { length: 7, price: 70 }, { length: 7.5, price: 80 },
      { length: 8, price: 100 }, { length: 8.5, price: 130 }, { length: 9, price: 150 },
      { length: 9.5, price: 170 }, { length: 10, price: 190 }, { length: 11, price: 230 },
      { length: 12, price: 300 }, { length: 13, price: 330 }
    ],
    hull_wash: [
      { length: 5, price: 30 }, { length: 5.5, price: 30 }, { length: 6, price: 30 },
      { length: 6.5, price: 40 }, { length: 7, price: 45 }, { length: 7.5, price: 50 },
      { length: 8, price: 55 }, { length: 8.5, price: 60 }, { length: 9, price: 70 },
      { length: 9.5, price: 75 }, { length: 10, price: 85 }, { length: 11, price: 100 },
      { length: 12, price: 120 }, { length: 13, price: 140 }
    ],
    antifouling_1: [
      { length: 5, price: 140 }, { length: 5.5, price: 150 }, { length: 6, price: 170 },
      { length: 6.5, price: 210 }, { length: 7, price: 240 }, { length: 7.5, price: 270 },
      { length: 8, price: 290 }, { length: 8.5, price: 330 }, { length: 9, price: 350 },
      { length: 9.5, price: 390 }, { length: 10, price: 430 }, { length: 11, price: 500 },
      { length: 12, price: 600 }, { length: 13, price: 700 }
    ],
    antifouling_2: [
      { length: 5, price: 250 }, { length: 5.5, price: 270 }, { length: 6, price: 300 },
      { length: 6.5, price: 380 }, { length: 7, price: 430 }, { length: 7.5, price: 490 },
      { length: 8, price: 530 }, { length: 8.5, price: 599 }, { length: 9, price: 630 },
      { length: 9.5, price: 700 }, { length: 10, price: 780 }, { length: 11, price: 900 },
      { length: 12, price: 1100 }, { length: 13, price: 1300 }
    ]
  }
};

(async () => {
  const c = new MongoClient('mongodb://localhost:27017');
  await c.connect();
  const db = c.db('maretrek');
  const col = db.collection('marinas');
  
  // Reset solo le marine seedate (per re-run idempotente)
  await col.deleteMany({ slug: { $in: ['bosa-marina', 'capo-comino', 'sena-e-sacchitta'] } });
  
  const now = new Date().toISOString();
  
  // 1. BOSA MARINA - completo
  await col.insertOne({
    id: uuidv4(),
    name: 'Bosa Marina',
    slug: 'bosa-marina',
    description: 'Porticciolo turistico di Bosa Marina situato sulla costa occidentale della Sardegna. Offre 120 posti barca con servizi completi: ormeggio, sosta carrello, alaggio e varo, lavaggio carena con pulivapor, antivegetativa, taccaggio barche a vela e motore, rimessaggio motori entro e fuoribordo. Aperto tutto l\'anno.',
    short_description: 'Porticciolo turistico nella costa ovest della Sardegna - 120 posti barca',
    cover_image: 'https://images.unsplash.com/photo-1561641129-8e9d54d05322?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1561641129-8e9d54d05322?w=1200&q=80',
      'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=80'
    ],
    location: 'Bosa Marina, Oristano',
    address: 'Via Muraglione Caduti di Cefalonia C/o PORTO - 09089 BOSA MARINA',
    latitude: 40.2974,
    longitude: 8.4710,
    total_berths: 120,
    contact_phone: '+39 349 5149909',
    contact_whatsapp: '+39 334 2939035',
    contact_email: 'marlin.sub@libero.it',
    services: ['water', 'electricity', 'security', 'crane', 'fuel', 'wifi', 'parking', 'hull_wash'],
    pricing: BOSA_PRICING,
    pricing_notes: [
      'Tariffa valida solo con modalità di pagamento anticipato ed in soluzione unica.',
      'Le misure di lunghezza e larghezza si riferiscono al massimo ingombro dell\'imbarcazione, comprendendo qualsiasi sporgenza.',
      'I periodi scoperti dalla scadenza al rinnovo saranno conteggiati sulla base della tariffa giornaliera vigente.',
      'IVA inclusa in tutti i prezzi.'
    ],
    owner: 'TRIVOR',
    shared_with_companies: [],
    display_order: 1,
    is_active: true,
    created_at: now, updated_at: now,
  });
  
  // 2. CAPO COMINO - vuoto
  await col.insertOne({
    id: uuidv4(),
    name: 'Capo Comino',
    slug: 'capo-comino',
    description: 'Porticciolo di Capo Comino sulla costa orientale della Sardegna. Listino in fase di definizione.',
    short_description: 'Porticciolo costa est Sardegna - listino in arrivo',
    cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'],
    location: 'Capo Comino, Siniscola (NU)',
    address: 'Capo Comino - Siniscola',
    latitude: 40.5417,
    longitude: 9.8233,
    total_berths: 0,
    contact_phone: '',
    contact_email: '',
    services: [],
    pricing: { annual: [], daily_by_month: {}, monthly_by_month: {}, summer_flat: [], yard_services: {} },
    pricing_notes: ['Listino tariffe in fase di pubblicazione.'],
    owner: 'TRIVOR',
    shared_with_companies: [],
    display_order: 2,
    is_active: true,
    created_at: now, updated_at: now,
  });
  
  // 3. SENA' E SACCHITTA - vuoto
  await col.insertOne({
    id: uuidv4(),
    name: "Sena' E Sacchitta",
    slug: 'sena-e-sacchitta',
    description: 'Approdo nautico di Sena\' E Sacchitta. Listino in fase di definizione.',
    short_description: 'Approdo nautico Sardegna - listino in arrivo',
    cover_image: 'https://images.unsplash.com/photo-1518542331925-4e91e9aa0074?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1518542331925-4e91e9aa0074?w=1200&q=80'],
    location: "Sena' E Sacchitta",
    address: '',
    total_berths: 0,
    contact_phone: '',
    contact_email: '',
    services: [],
    pricing: { annual: [], daily_by_month: {}, monthly_by_month: {}, summer_flat: [], yard_services: {} },
    pricing_notes: ['Listino tariffe in fase di pubblicazione.'],
    owner: 'TRIVOR',
    shared_with_companies: [],
    display_order: 3,
    is_active: true,
    created_at: now, updated_at: now,
  });
  
  const all = await col.find({}).toArray();
  console.log(`✅ Seedate ${all.length} marine:`);
  all.forEach(m => console.log(`  - ${m.name} (${m.slug}) | ${m.total_berths} posti | tariffe annuali: ${m.pricing?.annual?.length || 0}`));
  
  await c.close();
})();
