// Scheduler interno per backup automatici giornalieri MongoDB
// Inizializzato UNA SOLA VOLTA all'avvio del Next.js server via instrumentation.js
// Usa globalThis per garantire singleton REALE anche con import duplicati
//
// Esegue ogni giorno alle 23:30 (TZ Europe/Rome) il dump di tutto il DB MongoDB.

// eslint-disable-next-line no-eval
const _require = eval('require');
const { spawn } = _require('child_process');
const path = _require('path');
const fs = _require('fs');

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'backup_mongodb.js');
const CRON_EXPR = process.env.BACKUP_CRON || '30 23 * * *';
const STATE_FILE = '/app/backups/_scheduler_state.json';

// Stato condiviso globale (sopravvive ai duplicati di require)
const GLOBAL_KEY = '__MARETREK_BACKUP_SCHEDULER__';
function getGlobalState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      scheduler: null,
      lastRun: null,
      nextRun: null,
    };
  }
  return globalThis[GLOBAL_KEY];
}

function persistState() {
  try {
    const s = getGlobalState();
    if (!fs.existsSync('/app/backups')) fs.mkdirSync('/app/backups', { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      initialized: !!s.scheduler,
      cron_expression: CRON_EXPR,
      timezone: process.env.TZ || 'Europe/Rome',
      last_run: s.lastRun,
      next_run: s.nextRun,
      updated_at: new Date().toISOString(),
    }, null, 2));
  } catch (e) {
    console.warn('[backup-scheduler] Impossibile persistere state:', e.message);
  }
}

function readPersistedState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return null;
}

function runBackup(triggeredBy = 'cron_scheduler') {
  const startedAt = new Date();
  const state = getGlobalState();
  state.lastRun = { startedAt: startedAt.toISOString(), status: 'RUNNING', triggeredBy };
  persistState();
  console.log(`[backup-scheduler] Esecuzione backup → ${SCRIPT_PATH}`);

  const child = spawn('node', [SCRIPT_PATH, `--by=${triggeredBy}`], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', d => { stdout += d.toString(); });
  child.stderr.on('data', d => { stderr += d.toString(); });

  child.on('exit', (code) => {
    state.lastRun = {
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      status: code === 0 ? 'SUCCESS' : 'FAILED',
      exitCode: code,
      triggeredBy,
      stdoutTail: stdout.split('\n').slice(-5).join('\n'),
      stderrTail: stderr.split('\n').slice(-5).join('\n'),
    };
    state.nextRun = computeNextRun(CRON_EXPR);
    persistState();
    console.log(`[backup-scheduler] Backup terminato code=${code}`);
  });

  return child;
}

function initBackupScheduler() {
  const state = getGlobalState();
  if (state.scheduler) {
    console.log('[backup-scheduler] Già inizializzato (singleton).');
    return state.scheduler;
  }
  try {
    const cron = _require('node-cron');
    if (!cron.validate(CRON_EXPR)) {
      console.error(`[backup-scheduler] Cron expression non valida: ${CRON_EXPR}`);
      return null;
    }
    state.scheduler = cron.schedule(CRON_EXPR, () => runBackup('cron_scheduler'), {
      timezone: process.env.TZ || 'Europe/Rome',
    });
    state.nextRun = computeNextRun(CRON_EXPR);
    persistState();
    console.log(`[backup-scheduler] ✅ Inizializzato con cron "${CRON_EXPR}" (TZ ${process.env.TZ || 'Europe/Rome'})`);
    return state.scheduler;
  } catch (e) {
    console.error('[backup-scheduler] Errore init:', e.message);
    return null;
  }
}

function getSchedulerStatus() {
  const state = getGlobalState();
  // Se siamo in un altro module-scope dove scheduler non c'è, leggi dal file persistente
  if (!state.scheduler) {
    const persisted = readPersistedState();
    if (persisted) return persisted;
  }
  return {
    initialized: !!state.scheduler,
    cron_expression: CRON_EXPR,
    timezone: process.env.TZ || 'Europe/Rome',
    last_run: state.lastRun,
    next_run: state.nextRun || computeNextRun(CRON_EXPR),
  };
}

function computeNextRun(expr) {
  try {
    const parts = expr.split(' ');
    if (parts.length < 5) return null;
    const min = parseInt(parts[0], 10);
    const hour = parseInt(parts[1], 10);
    if (Number.isNaN(min) || Number.isNaN(hour)) return null;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.toISOString();
  } catch {
    return null;
  }
}

module.exports = {
  initBackupScheduler,
  getSchedulerStatus,
};
