#!/usr/bin/env node
/**
 * MongoDB Backup Script - Maretrek
 *
 * Esegue un dump completo del database MongoDB usando mongodump in formato BSON gzippato.
 * Salva il backup in /app/backups/ con un manifest JSON con metadata.
 * Implementa retention: mantiene gli ultimi 30 backup automatici (DAILY) + tutti i backup manuali.
 *
 * Usage:
 *   node scripts/backup_mongodb.js [--manual] [--note="qualcosa"]
 *
 * Output:
 *   /app/backups/maretrek-{ISO_DATE}.archive.gz   ← dump binario
 *   /app/backups/maretrek-{ISO_DATE}.manifest.json ← metadata
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/app/backups';
const RETENTION_DAILY = 30; // numero max di backup AUTO da conservare
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/maretrek';

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function parseMongoUrl(url) {
  // mongodb://[user:pass@]host:port/dbname
  const m = url.match(/^mongodb:\/\/(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)/);
  if (!m) throw new Error(`Invalid MONGO_URL: ${url}`);
  return {
    user: m[1] || null,
    pass: m[2] || null,
    host: m[3],
    port: m[4] || '27017',
    db: m[5],
  };
}

async function getCollectionStats(dbName) {
  const { MongoClient } = require('mongodb');
  const c = new MongoClient(MONGO_URL);
  await c.connect();
  const db = c.db(dbName);
  const cols = await db.listCollections().toArray();
  const stats = {};
  for (const col of cols) {
    const cnt = await db.collection(col.name).countDocuments();
    stats[col.name] = cnt;
  }
  await c.close();
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const isManual = args.includes('--manual');
  const noteArg = args.find(a => a.startsWith('--note='));
  const note = noteArg ? noteArg.slice('--note='.length) : null;
  const triggeredBy = args.find(a => a.startsWith('--by=')) ? args.find(a => a.startsWith('--by=')).slice('--by='.length) : null;

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const mongo = parseMongoUrl(MONGO_URL);
  const ts = nowISO();
  const type = isManual ? 'MANUAL' : 'AUTO';
  const filename = `maretrek-${ts}-${type}.archive.gz`;
  const manifestName = `maretrek-${ts}-${type}.manifest.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  const manifestPath = path.join(BACKUP_DIR, manifestName);

  console.log(`[backup] Inizio backup ${type} → ${filename}`);
  const startedAt = Date.now();

  // Pre-stats
  let collectionStats = {};
  try {
    collectionStats = await getCollectionStats(mongo.db);
  } catch (e) {
    console.warn('[backup] Impossibile ottenere stats:', e.message);
  }

  // mongodump
  const dumpCmd = `mongodump --host=${mongo.host} --port=${mongo.port} --db=${mongo.db} --archive=${filepath} --gzip --quiet`;
  try {
    execSync(dumpCmd, { stdio: 'inherit' });
  } catch (e) {
    console.error('[backup] mongodump fallito:', e.message);
    process.exit(1);
  }

  const elapsedMs = Date.now() - startedAt;
  const stat = fs.statSync(filepath);

  // Manifest
  const manifest = {
    id: `bk_${ts}_${type}`,
    type,             // 'AUTO' | 'MANUAL'
    filename,
    manifest_file: manifestName,
    created_at: new Date().toISOString(),
    elapsed_ms: elapsedMs,
    size_bytes: stat.size,
    size_human: humanSize(stat.size),
    db_name: mongo.db,
    mongo_host: mongo.host,
    mongo_port: mongo.port,
    collections: collectionStats,
    total_documents: Object.values(collectionStats).reduce((a, b) => a + b, 0),
    note: note || null,
    triggered_by: triggeredBy || (isManual ? 'super_admin' : 'cron_scheduler'),
    app_version: 'maretrek-1.0',
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`[backup] ✅ OK in ${elapsedMs}ms - ${manifest.size_human} - ${manifest.total_documents} documenti`);

  // Retention: tieni solo gli ultimi N AUTO. I MANUAL non vengono mai eliminati automaticamente.
  if (type === 'AUTO') {
    const all = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('-AUTO.manifest.json'))
      .map(f => ({ f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);

    if (all.length > RETENTION_DAILY) {
      const toDelete = all.slice(RETENTION_DAILY);
      for (const item of toDelete) {
        const manifestFile = path.join(BACKUP_DIR, item.f);
        try {
          const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
          const archiveFile = path.join(BACKUP_DIR, m.filename);
          if (fs.existsSync(archiveFile)) fs.unlinkSync(archiveFile);
          fs.unlinkSync(manifestFile);
          console.log('[backup retention] Rimosso vecchio:', m.id);
        } catch (e) {
          console.warn('[backup retention] Errore rimozione:', item.f, e.message);
        }
      }
    }
  }

  console.log('[backup] FINE');
  process.exit(0);
}

function humanSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

main().catch(e => { console.error('[backup] FATAL:', e); process.exit(2); });
