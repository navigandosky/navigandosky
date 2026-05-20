// Backup Manager - API REST per gestione backup MongoDB (solo Super Admin)
//
// Endpoints:
//  GET    /api/admin/backups                  → lista backup disponibili + status scheduler
//  POST   /api/admin/backups/create           → backup manuale on-demand
//  GET    /api/admin/backups/{id}/download    → scarica archive.gz
//  POST   /api/admin/backups/{id}/restore     → ripristina DB da backup (richiede token conferma)
//  DELETE /api/admin/backups/{id}             → elimina backup
//
// Tutti gli endpoint richiedono X-User-Role: SUPER_ADMIN nell'header per autorizzazione.
//
// NOTA: usiamo eval('require') per i moduli Node built-in per evitare bundling Next.js

// eslint-disable-next-line no-eval
const _require = eval('require');
const fs = _require('fs');
const path = _require('path');
const { spawn, spawnSync } = _require('child_process');

const BACKUP_DIR = '/app/backups';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function isSuperAdmin(request) {
  const role = request.headers.get('x-user-role') || request.headers.get('X-User-Role');
  return role === 'SUPER_ADMIN';
}

function listAllManifests() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.manifest.json'));
  const items = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
      const archivePath = path.join(BACKUP_DIR, data.filename || '');
      data._archive_exists = fs.existsSync(archivePath);
      items.push(data);
    } catch {
      // ignore corrupted manifest
    }
  }
  // sort desc by created_at
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}

function findManifestById(id) {
  const all = listAllManifests();
  return all.find(m => m.id === id);
}

// === GET /api/admin/backups
export async function handleListBackups(method, request) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const backups = listAllManifests();
    // Aggrega per il client: dimensioni totali, tipi, distribuzione
    const totals = backups.reduce(
      (acc, b) => {
        acc.size_bytes += b.size_bytes || 0;
        if (b.type === 'AUTO') acc.auto += 1;
        if (b.type === 'MANUAL') acc.manual += 1;
        acc.total_documents += b.total_documents || 0;
        return acc;
      },
      { size_bytes: 0, auto: 0, manual: 0, total_documents: 0 }
    );

    // Stato scheduler
    let schedulerStatus = null;
    try {
      // eslint-disable-next-line no-eval
      const _require = eval('require');
      const path = _require('path');
      const sched = _require(path.join(process.cwd(), 'lib', 'backup_scheduler.js'));
      schedulerStatus = sched.getSchedulerStatus();
    } catch (e) {
      console.warn('[backup_manager] Impossibile leggere scheduler status:', e?.message);
    }

    return json({
      ok: true,
      backups,
      totals,
      scheduler: schedulerStatus,
      backup_dir: BACKUP_DIR,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === POST /api/admin/backups/create
// body: { note?: string }
export async function handleCreateBackup(method, request, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const note = (body?.note || '').toString().slice(0, 200);
    const triggeredBy = (body?.triggered_by || 'super_admin').toString().slice(0, 60);

    const scriptPath = path.join(process.cwd(), 'scripts', 'backup_mongodb.js');
    const args = [scriptPath, '--manual', `--by=${triggeredBy}`];
    if (note) args.push(`--note=${note}`);

    const startedAt = new Date();
    const result = spawnSync('node', args, {
      env: { ...process.env },
      timeout: 120_000, // 2 minuti max
      encoding: 'utf8',
    });

    if (result.error) return json({ error: result.error.message }, 500);
    if (result.status !== 0) {
      return json({
        error: 'Backup process failed',
        stderr: (result.stderr || '').split('\n').slice(-5).join('\n'),
        stdout: (result.stdout || '').split('\n').slice(-5).join('\n'),
      }, 500);
    }

    // Cerca il manifest più recente
    const latest = listAllManifests()[0];
    return json({
      ok: true,
      message: 'Backup completato con successo',
      backup: latest,
      elapsed_ms: Date.now() - startedAt.getTime(),
      stdout: (result.stdout || '').split('\n').slice(-5).join('\n'),
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === GET /api/admin/backups/{id}/download
export async function handleDownloadBackup(method, request, id) {
  if (method !== 'GET') return json({ error: 'Use GET' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const manifest = findManifestById(id);
    if (!manifest) return json({ error: 'Backup non trovato' }, 404);
    const filePath = path.join(BACKUP_DIR, manifest.filename);
    if (!fs.existsSync(filePath)) return json({ error: 'File archive mancante' }, 404);

    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    // Convert Node stream to web ReadableStream
    const { Readable } = await import('stream');
    const webStream = Readable.toWeb(stream);

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${manifest.filename}"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === POST /api/admin/backups/{id}/restore
// body: { confirm: 'RIPRISTINA-DEFINITIVO' }
export async function handleRestoreBackup(method, request, id, body) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const confirm = body?.confirm;
    if (confirm !== 'RIPRISTINA-DEFINITIVO') {
      return json({
        error: 'Operazione distruttiva. Inserire confirm="RIPRISTINA-DEFINITIVO" nel body per procedere.',
      }, 400);
    }

    const manifest = findManifestById(id);
    if (!manifest) return json({ error: 'Backup non trovato' }, 404);
    const archivePath = path.join(BACKUP_DIR, manifest.filename);
    if (!fs.existsSync(archivePath)) return json({ error: 'File archive mancante' }, 404);

    // Prima del restore: SNAPSHOT di sicurezza dello stato attuale
    console.log('[restore] Creazione snapshot di sicurezza prima del restore...');
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup_mongodb.js');
    const snapResult = spawnSync('node', [
      scriptPath, '--manual',
      `--note=Auto-snapshot prima restore di ${id}`,
      `--by=auto_pre_restore`,
    ], { env: { ...process.env }, timeout: 120_000, encoding: 'utf8' });

    if (snapResult.status !== 0) {
      return json({
        error: 'Snapshot pre-restore fallito. Restore annullato per sicurezza.',
        details: (snapResult.stderr || '').split('\n').slice(-5).join('\n'),
      }, 500);
    }

    // Esegui restore con mongorestore --gzip --archive --drop
    const mongo = parseMongoUrl(process.env.MONGO_URL);
    const restoreArgs = [
      `--host=${mongo.host}`,
      `--port=${mongo.port}`,
      `--db=${mongo.db}`,
      `--archive=${archivePath}`,
      '--gzip',
      '--drop', // sostituisce dati esistenti
      '--nsInclude', `${mongo.db}.*`,
      '--quiet',
    ];

    const startedAt = Date.now();
    const restoreRes = spawnSync('mongorestore', restoreArgs, {
      env: { ...process.env },
      timeout: 180_000, // 3 minuti
      encoding: 'utf8',
    });

    if (restoreRes.error) return json({ error: restoreRes.error.message }, 500);
    if (restoreRes.status !== 0) {
      return json({
        error: 'Restore fallito',
        stderr: (restoreRes.stderr || '').split('\n').slice(-10).join('\n'),
        stdout: (restoreRes.stdout || '').split('\n').slice(-10).join('\n'),
      }, 500);
    }

    return json({
      ok: true,
      message: `Restore completato da backup ${id}`,
      restored_from: manifest,
      elapsed_ms: Date.now() - startedAt,
      pre_restore_snapshot_created: true,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === DELETE /api/admin/backups/{id}
export async function handleDeleteBackup(method, request, id) {
  if (method !== 'DELETE') return json({ error: 'Use DELETE' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const manifest = findManifestById(id);
    if (!manifest) return json({ error: 'Backup non trovato' }, 404);

    const archivePath = path.join(BACKUP_DIR, manifest.filename);
    const manifestPath = path.join(BACKUP_DIR, manifest.manifest_file);

    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);

    return json({ ok: true, message: 'Backup eliminato', id });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === POST /api/admin/backups/upload
// Accetta un file .archive.gz esterno (es. backup scaricato su dispositivo esterno e ricaricato).
// FormData: { file: <File>, note?: string }
// Validazione:
//   1) file presente con nome che finisce in .gz o .archive
//   2) magic bytes gzip (0x1f 0x8b)
//   3) mongorestore --dry-run per verificare struttura dump valida
export async function handleUploadBackup(method, request) {
  if (method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!isSuperAdmin(request)) return json({ error: 'Solo Super Admin' }, 403);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const note = (formData.get('note') || '').toString().slice(0, 200);
    const triggeredBy = (formData.get('triggered_by') || 'super_admin_import').toString().slice(0, 60);

    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'File mancante o non valido' }, 400);
    }
    const origName = file.name || 'upload.archive.gz';
    if (!/\.(gz|archive)$/i.test(origName)) {
      return json({ error: 'File deve avere estensione .gz o .archive' }, 400);
    }
    // Limite dimensione: 500 MB (sicurezza)
    if (file.size > 500 * 1024 * 1024) {
      return json({ error: 'File troppo grande (max 500 MB)' }, 413);
    }

    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // Leggi i bytes e verifica magic gzip
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
      return json({ error: 'Il file non è un archivio gzip valido (magic bytes mancanti)' }, 400);
    }

    // Nome file destinazione - genera nuovo timestamp per evitare collisioni
    const ts = nowISO();
    const filename = `maretrek-${ts}-UPLOAD.archive.gz`;
    const manifestName = `maretrek-${ts}-UPLOAD.manifest.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    const manifestPath = path.join(BACKUP_DIR, manifestName);

    // Salva su disco
    fs.writeFileSync(filepath, bytes);

    // Verifica struttura tramite mongorestore --dryRun
    const mongo = parseMongoUrl(process.env.MONGO_URL);
    const verifyArgs = [
      `--host=${mongo.host}`,
      `--port=${mongo.port}`,
      `--archive=${filepath}`,
      '--gzip',
      '--dryRun',
      '--quiet',
    ];
    const verifyRes = spawnSync('mongorestore', verifyArgs, {
      env: { ...process.env },
      timeout: 60_000,
      encoding: 'utf8',
    });

    let verificationOk = verifyRes.status === 0;
    let verificationDetails = null;
    if (!verificationOk) {
      // Rimuovi file invalido e ritorna errore
      try { fs.unlinkSync(filepath); } catch {}
      return json({
        error: 'File non riconosciuto come dump MongoDB valido',
        details: (verifyRes.stderr || verifyRes.stdout || '').split('\n').slice(-5).join('\n'),
      }, 400);
    }
    verificationDetails = (verifyRes.stdout || verifyRes.stderr || '').split('\n').slice(-3).join('\n');

    // Manifest
    const manifest = {
      id: `bk_${ts}_UPLOAD`,
      type: 'UPLOAD',
      filename,
      manifest_file: manifestName,
      created_at: new Date().toISOString(),
      size_bytes: bytes.length,
      size_human: humanSize(bytes.length),
      db_name: mongo.db,
      original_filename: origName,
      verification_passed: true,
      verification_details: verificationDetails,
      note: note || `Backup importato da file esterno: ${origName}`,
      triggered_by: triggeredBy,
      app_version: 'maretrek-1.0',
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return json({
      ok: true,
      message: 'Backup importato con successo',
      backup: { ...manifest, _archive_exists: true },
    });
  } catch (e) {
    console.error('[upload backup] exception:', e);
    return json({ error: e.message }, 500);
  }
}

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function humanSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function parseMongoUrl(url) {
  const m = (url || '').match(/^mongodb:\/\/(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)/);
  if (!m) throw new Error(`Invalid MONGO_URL: ${url}`);
  return {
    user: m[1] || null, pass: m[2] || null,
    host: m[3], port: m[4] || '27017', db: m[5],
  };
}
