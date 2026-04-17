// Script per creare Super Admin Trivor
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/maretrek';

async function createSuperAdmin() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✅ Connesso a MongoDB');
    
    const db = client.db();
    const usersCol = db.collection('users');
    
    // Verifica se l'utente esiste già
    const existing = await usersCol.findOne({ username: 'Admin_Trivorsrl' });
    
    if (existing) {
      console.log('⚠️  Super Admin "Admin_Trivorsrl" esiste già');
      console.log('   Email:', existing.email);
      console.log('   Ruolo:', existing.role);
      
      // Aggiorna la password
      const hashedPassword = await bcrypt.hash('Trivor2026$', 10);
      await usersCol.updateOne(
        { username: 'Admin_Trivorsrl' },
        { $set: { password: hashedPassword, updated_at: new Date().toISOString() } }
      );
      console.log('✅ Password aggiornata a: Trivor2026$');
    } else {
      // Crea nuovo Super Admin
      const hashedPassword = await bcrypt.hash('Trivor2026$', 10);
      
      const superAdmin = {
        id: uuidv4(),
        username: 'Admin_Trivorsrl',
        email: 'admin@trivorsrl.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        company_id: null, // Super Admin non appartiene a nessuna company
        permissions: ['*'], // Tutti i permessi
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await usersCol.insertOne(superAdmin);
      
      console.log('\n✅ ========== SUPER ADMIN CREATO ==========');
      console.log('');
      console.log('   👤 Username: Admin_Trivorsrl');
      console.log('   📧 Email: admin@trivorsrl.com');
      console.log('   🔑 Password: Trivor2026$');
      console.log('   👑 Ruolo: SUPER_ADMIN');
      console.log('');
      console.log('=========================================\n');
    }
    
    await client.close();
    console.log('✅ Connessione chiusa');
    
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

createSuperAdmin();
