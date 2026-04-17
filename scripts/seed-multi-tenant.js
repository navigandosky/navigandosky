// Script di seed per Multi-Tenant Architecture
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/maretrek';

async function seed() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✅ Connesso a MongoDB');
    
    const db = client.db();
    
    // ========== PULIZIA DATI ESISTENTI ==========
    console.log('\n🗑️  Pulizia dati esistenti...');
    await db.collection('experiences').deleteMany({});
    await db.collection('resources').deleteMany({});
    await db.collection('slots').deleteMany({});
    await db.collection('bookings').deleteMany({});
    await db.collection('agencies').deleteMany({});
    await db.collection('vouchers').deleteMany({});
    await db.collection('waitlist').deleteMany({});
    console.log('✅ Dati esistenti eliminati');
    
    // ========== COMPANY "MARETREK" ==========
    console.log('\n🏢 Creazione Company "Maretrek"...');
    const maretrekId = uuidv4();
    const maretrek = {
      id: maretrekId,
      name: 'Maretrek',
      slug: 'maretrek',
      legal_form: 'S.R.L.',
      vat_number: 'IT12345678901',
      legal_address: 'Via Porto 123, 09124 Cagliari (CA)',
      sdi_code: 'ABC1234',
      
      // Branding
      logo_url: 'https://customer-assets.emergentagent.com/job_7d8a5623-84c4-4dc5-8737-98643d255bb4/artifacts/cdzklcx8_logo%20maretrek_1.jpg',
      primary_color: '#0066CC',
      secondary_color: '#FF6B35',
      hero_image: 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=1920&q=80',
      
      // Contatti
      phone: '+39 070 123456',
      email: 'info@maretrek.com',
      website: 'www.maretrek.com',
      
      // Config
      is_active: true,
      subscription_plan: 'PREMIUM',
      max_experiences: 100,
      max_agencies: 20,
      
      total_bookings: 0,
      total_revenue: 0,
      created_at: new Date().toISOString(),
    };
    await db.collection('companies').insertOne(maretrek);
    console.log('✅ Company "Maretrek" creata');
    
    // ========== SUPER ADMIN ==========
    console.log('\n👑 Creazione Super Admin...');
    const superAdmin = {
      id: uuidv4(),
      email: 'superadmin@sardinia-tours.com',
      password: 'SuperAdmin2025!',
      role: 'SUPER_ADMIN',
      company_id: null,
      permissions: ['*'],
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await db.collection('users').insertOne(superAdmin);
    console.log('✅ Super Admin creato');
    console.log('   📧 Email: superadmin@sardinia-tours.com');
    console.log('   🔑 Password: SuperAdmin2025!');
    
    // ========== COMPANY ADMIN MARETREK ==========
    console.log('\n👤 Creazione Company Admin Maretrek...');
    const companyAdmin = {
      id: uuidv4(),
      email: 'admin@maretrek.com',
      password: 'Maretrek2025!',
      role: 'COMPANY_ADMIN',
      company_id: maretrekId,
      permissions: ['manage_experiences', 'manage_bookings', 'manage_agencies', 'view_reports'],
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await db.collection('users').insertOne(companyAdmin);
    console.log('✅ Company Admin creato');
    console.log('   📧 Email: admin@maretrek.com');
    console.log('   🔑 Password: Maretrek2025!');
    
    // ========== 3 ESPERIENZE DEMO ==========
    console.log('\n🚤 Creazione 3 Esperienze Demo...');
    
    const experiences = [
      {
        id: uuidv4(),
        company_id: maretrekId,
        name: 'Grotta Blu Marino - A/R ore 11:00',
        type: 'GITA_BARCA',
        description: 'Escursione alla splendida Grotta del Bue Marino, uno dei gioielli naturali della costa sarda. Partenza alle 11:00.',
        duration_minutes: 180,
        max_capacity: 12,
        price_b2c: 35.00,
        price_b2b: 18.75,
        languages: ['IT', 'EN'],
        meeting_point: 'Porto di Cala Gonone',
        weather_dependent: true,
        is_active: true,
        is_visible_on_home: true,
        cancellation_policy: 'Cancellazione gratuita fino a 48h prima',
        image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
        images: [],
        terms_pdf_url: '',
        resource_ids: [],
        price_tiers: [
          { name: 'Bassa Stagione', start_date: '2025-04-01', end_date: '2025-06-14', price_b2c: 30.00, price_b2b: 16.00 },
          { name: 'Alta Stagione', start_date: '2025-06-15', end_date: '2025-09-15', price_b2c: 35.00, price_b2b: 18.75 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        company_id: maretrekId,
        name: 'Tour Golfo di Orosei',
        type: 'GITA_GOMMONE',
        description: 'Tour completo del Golfo di Orosei con soste alle calette più belle: Cala Luna, Cala Mariolu, Cala Goloritzè.',
        duration_minutes: 420,
        max_capacity: 10,
        price_b2c: 65.00,
        price_b2b: 42.00,
        languages: ['IT', 'EN', 'FR'],
        meeting_point: 'Porto di Cala Gonone',
        weather_dependent: true,
        is_active: true,
        is_visible_on_home: true,
        cancellation_policy: 'Cancellazione gratuita fino a 72h prima',
        image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        images: [],
        terms_pdf_url: '',
        resource_ids: [],
        price_tiers: [
          { name: 'Media Stagione', start_date: '2025-05-01', end_date: '2025-06-30', price_b2c: 60.00, price_b2b: 38.00 },
          { name: 'Alta Stagione', start_date: '2025-07-01', end_date: '2025-08-31', price_b2c: 65.00, price_b2b: 42.00 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        company_id: maretrekId,
        name: 'Trekking Selvaggio di Blu',
        type: 'VISITA_GUIDATA',
        description: 'Trekking guidato nel suggestivo Selvaggio di Blu con guida esperta. Percorso di difficoltà media con panorami mozzafiato.',
        duration_minutes: 360,
        max_capacity: 15,
        price_b2c: 45.00,
        price_b2b: 28.00,
        languages: ['IT', 'EN'],
        meeting_point: 'Parcheggio Pedra Longa',
        weather_dependent: true,
        is_active: true,
        is_visible_on_home: true,
        cancellation_policy: 'Cancellazione gratuita fino a 24h prima',
        image_url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
        images: [],
        terms_pdf_url: '',
        resource_ids: [],
        price_tiers: [
          { name: 'Tutto l\'anno', start_date: '2025-01-01', end_date: '2025-12-31', price_b2c: 45.00, price_b2b: 28.00 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    await db.collection('experiences').insertMany(experiences);
    console.log('✅ 3 Esperienze Demo create');
    experiences.forEach(exp => {
      console.log(`   🚤 ${exp.name} - €${exp.price_b2c}`);
    });
    
    // ========== RISORSA DEMO ==========
    console.log('\n⛵ Creazione Risorsa Demo...');
    const resource = {
      id: uuidv4(),
      company_id: maretrekId,
      name: 'Gommone Maretrek 01',
      type: 'BOAT',
      boat_type: 'GOMMONE',
      capacity: 12,
      bio: 'Gommone da 12 posti con skipper esperto',
      languages: [],
      certifications: [],
      phone: '',
      email: '',
      images: [],
      gps_imei: '',
      potenza_motore: 150,
      marca: 'Yamaha',
      consumo_orario_litri: 25,
      ore_inizio_stagione: 0,
      is_available: true,
      created_at: new Date().toISOString(),
    };
    await db.collection('resources').insertOne(resource);
    console.log('✅ Risorsa Demo creata: Gommone Maretrek 01');
    
    console.log('\n✅ ========== SEED COMPLETATO ==========');
    console.log('\n📊 Riepilogo:');
    console.log(`   🏢 Companies: 1 (Maretrek)`);
    console.log(`   👥 Users: 2 (Super Admin + Company Admin)`);
    console.log(`   🚤 Esperienze: 3`);
    console.log(`   ⛵ Risorse: 1`);
    console.log('\n🔐 Credenziali di Accesso:');
    console.log('\n   SUPER ADMIN:');
    console.log('   📧 Email: superadmin@sardinia-tours.com');
    console.log('   🔑 Password: SuperAdmin2025!');
    console.log('\n   COMPANY ADMIN (Maretrek):');
    console.log('   📧 Email: admin@maretrek.com');
    console.log('   🔑 Password: Maretrek2025!');
    
  } catch (error) {
    console.error('❌ Errore durante il seed:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connessione chiusa');
  }
}

seed();
