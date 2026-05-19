// Next.js instrumentation hook - eseguito UNA VOLTA all'avvio del server
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Qui inizializziamo il cron scheduler per i backup automatici giornalieri di MongoDB.
export async function register() {
  // Esegui solo lato server Node.js (no edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initBackupScheduler } = await import('./lib/backup_scheduler.js');
      initBackupScheduler();
    } catch (e) {
      console.error('[instrumentation] Failed to init backup scheduler:', e?.message);
    }
  }
}
