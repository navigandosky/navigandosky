// Endpoint per invio email ricevute (e altre notifiche)
// Usa nodemailer + SMTP. Default da ENV, override opzionale per-marina via marina.payment_config.smtp_*
import nodemailer from 'nodemailer';
import { MongoClient } from 'mongodb';

let _client;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL);
    await _client.connect();
  }
  return _client.db();
}

/**
 * Crea un transporter SMTP. Usa marina.payment_config.smtp_* se valorizzato, altrimenti env.
 */
function buildTransporter(marinaConfig = {}) {
  const host = marinaConfig.smtp_host || process.env.SMTP_HOST;
  const port = Number(marinaConfig.smtp_port || process.env.SMTP_PORT || 465);
  const secure = (marinaConfig.smtp_secure ?? (process.env.SMTP_SECURE === 'true'));
  const user = marinaConfig.smtp_user || process.env.SMTP_USER;
  const pass = marinaConfig.smtp_password || process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP non configurato (mancano host/user/password)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Aruba richiede TLS senza verifica troppo stretta in alcuni casi
    tls: { rejectUnauthorized: false },
  });
}

/**
 * POST /api/send-receipt-email
 * body: {
 *   booking_id: string,                    // marina_booking id (contratto)
 *   receipt_number: string,                // RIC-...
 *   receipt_amount: number,                // importo ricevuta
 *   to_email: string,                      // destinatario (di default cust.email)
 *   subject?: string,
 *   message?: string,                      // testo aggiuntivo
 *   pdf_base64: string,                    // ricevuta PDF in base64 (data:URL o pure base64)
 *   pdf_filename?: string,
 * }
 */
export async function handleSendReceiptEmail(method, body) {
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const {
    booking_id, receipt_number, receipt_amount,
    to_email, subject, message,
    pdf_base64, pdf_filename,
  } = body || {};

  if (!to_email) return new Response(JSON.stringify({ error: 'to_email obbligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!pdf_base64) return new Response(JSON.stringify({ error: 'pdf_base64 obbligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  try {
    const db = await getDb();
    let marina = null;
    let contract = null;
    let company = null;

    if (booking_id) {
      contract = await db.collection('marina_bookings').findOne({ id: booking_id });
      if (contract?.marina_id) {
        marina = await db.collection('marinas').findOne({ id: contract.marina_id });
      }
      if (contract?.company_id) {
        company = await db.collection('companies').findOne({ id: contract.company_id });
      }
    }

    const marinaSmtp = marina?.payment_config || {};
    const transporter = buildTransporter(marinaSmtp);

    // From: usa company name + email da config marina (override) o env
    const fromEmail = marinaSmtp.smtp_user || process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;
    const fromName = marinaSmtp.smtp_from_name || company?.name || marina?.name || process.env.SMTP_FROM_NAME || 'Marina';

    // Pulisci data URL prefix se presente
    let cleanBase64 = pdf_base64;
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
    }

    // Build HTML body
    const cust = contract?.customer || {};
    const subj = subject || `Ricevuta ${receipt_number || ''} - ${marina?.name || company?.name || 'Marina'}`;
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Ricevuta di Pagamento</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${marina?.name || company?.name || ''}</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
          <p>Gentile <strong>${cust.name || ''} ${cust.surname || ''}</strong>,</p>
          <p>Le inviamo in allegato la ricevuta <strong>${receipt_number || ''}</strong>${receipt_amount ? ` per l'importo di <strong>€ ${Number(receipt_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong>` : ''}.</p>
          ${message ? `<div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px;">${String(message).replace(/\n/g, '<br>')}</div>` : ''}
          ${contract ? `
            <table style="width: 100%; margin-top: 16px; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 4px 0; color: #6b7280;">Contratto:</td><td style="padding: 4px 0;"><strong>${contract.booking_number || ''}</strong></td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">Posto barca:</td><td style="padding: 4px 0;"><strong>${contract.berth_label || '—'}</strong></td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">Periodo:</td><td style="padding: 4px 0;">${contract.start_date ? new Date(contract.start_date).toLocaleDateString('it-IT') : ''} → ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('it-IT') : ''}</td></tr>
            </table>
          ` : ''}
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
            Per qualsiasi necessità, può contattarci rispondendo a questa email.
          </p>
          <p style="margin-top: 24px; font-size: 14px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
        </div>
        <div style="text-align: center; padding: 12px; font-size: 11px; color: #9ca3af;">
          Questa email è stata generata automaticamente dal sistema gestionale ${fromName}.
        </div>
      </body></html>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to_email,
      subject: subj,
      html,
      attachments: [
        {
          filename: pdf_filename || `Ricevuta_${receipt_number || 'documento'}.pdf`,
          content: cleanBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    });

    // Log invio nel contratto (storico email)
    if (contract) {
      await db.collection('marina_bookings').updateOne(
        { id: contract.id },
        {
          $push: {
            email_log: {
              type: 'receipt',
              receipt_number,
              to: to_email,
              from: fromEmail,
              sent_at: new Date().toISOString(),
              message_id: info.messageId,
            },
          },
          $set: { updated_at: new Date().toISOString() },
        }
      );
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: info.messageId,
      to: to_email,
      from: fromEmail,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[send-receipt-email] Error:', e);
    return new Response(JSON.stringify({
      error: e.message || 'Errore invio email',
      detail: e.code || e.responseCode || null,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
