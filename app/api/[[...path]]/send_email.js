// Endpoint per invio email ricevute (e altre notifiche)
// Provider primario: Resend (https://resend.com/) - configurabile via env RESEND_API_KEY
// Fallback automatico: SMTP nodemailer (default Aruba) per ambienti dove Resend non è configurato
// Override per-marina via marina.payment_config.smtp_*
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
    host, port, secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Invia email con Resend (provider primario)
 * Ritorna { ok, message_id, provider: 'resend' } o lancia errore
 */
async function sendViaResend({ from, to, subject, html, attachments }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurata');
  }
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    attachments: (attachments || []).map(a => ({
      filename: a.filename,
      content: a.content, // base64 string (senza prefix data:)
    })),
  });
  if (result.error) {
    throw new Error(`Resend: ${result.error.message || JSON.stringify(result.error)}`);
  }
  return { ok: true, message_id: result.data?.id, provider: 'resend' };
}

/**
 * Invia email via SMTP Nodemailer (fallback Aruba)
 */
async function sendViaSMTP({ from, to, subject, html, attachments, marinaCfg }) {
  const transporter = buildTransporter(marinaCfg || {});
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments: (attachments || []).map(a => ({
      filename: a.filename,
      content: a.content,
      encoding: 'base64',
      contentType: a.contentType || 'application/pdf',
    })),
  });
  return { ok: true, message_id: info.messageId, provider: 'smtp' };
}

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

    const marinaCfg = marina?.payment_config || {};

    // FROM email: 
    // - per Resend, usa RESEND_FROM_EMAIL (deve essere su dominio verificato)
    // - per SMTP, usa marina.smtp_user (override) o env SMTP_USER
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
    const smtpFromEmail = marinaCfg.smtp_user || process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;
    const fromName = marinaCfg.smtp_from_name || company?.name || marina?.name || process.env.SMTP_FROM_NAME || 'Marina';

    // Pulisci data URL prefix se presente
    let cleanBase64 = pdf_base64;
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
    }

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
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">Per qualsiasi necessità, può contattarci rispondendo a questa email.</p>
          <p style="margin-top: 24px; font-size: 14px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
        </div>
        <div style="text-align: center; padding: 12px; font-size: 11px; color: #9ca3af;">
          Questa email è stata generata automaticamente dal sistema gestionale ${fromName}.
        </div>
      </body></html>
    `;

    const attachments = [{
      filename: pdf_filename || `Ricevuta_${receipt_number || 'documento'}.pdf`,
      content: cleanBase64,
      contentType: 'application/pdf',
    }];

    let result;
    let providerUsed;
    let primaryError = null;
    let usedFromEmail;

    // STEP 1: Prova Resend (provider primario, se configurato)
    if (process.env.RESEND_API_KEY) {
      try {
        const resendFromAddress = `${fromName} <${resendFromEmail}>`;
        result = await sendViaResend({
          from: resendFromAddress,
          to: to_email, subject: subj, html, attachments,
        });
        providerUsed = 'resend';
        usedFromEmail = resendFromEmail;
      } catch (e) {
        primaryError = e.message;
        console.warn('[send-receipt-email] Resend fallito, fallback SMTP:', e.message);
      }
    }

    // STEP 2: Fallback SMTP (Aruba)
    if (!result) {
      try {
        const smtpFromAddress = `"${fromName}" <${smtpFromEmail}>`;
        result = await sendViaSMTP({
          from: smtpFromAddress,
          to: to_email, subject: subj, html, attachments,
          marinaCfg,
        });
        providerUsed = 'smtp';
        usedFromEmail = smtpFromEmail;
      } catch (e) {
        const composedError = primaryError ? `Resend: ${primaryError} · SMTP: ${e.message}` : `SMTP: ${e.message}`;
        return new Response(JSON.stringify({ error: composedError, detail: e.code || e.responseCode || null }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Log invio nel contratto
    if (contract && result?.ok) {
      await db.collection('marina_bookings').updateOne(
        { id: contract.id },
        {
          $push: {
            email_log: {
              type: 'receipt',
              receipt_number,
              to: to_email,
              from: usedFromEmail,
              provider: providerUsed,
              sent_at: new Date().toISOString(),
              message_id: result.message_id,
            },
          },
          $set: { updated_at: new Date().toISOString() },
        }
      );
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: result.message_id,
      to: to_email,
      from: usedFromEmail,
      provider: providerUsed,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[send-receipt-email] Error:', e);
    return new Response(JSON.stringify({
      error: e.message || 'Errore invio email',
      detail: e.code || e.responseCode || null,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Endpoint generico per inviare qualsiasi documento PDF via email
 * Usato per: preventivi marina, contratti, preventivi cantiere, voucher transito, ecc.
 * Body atteso:
 *   - to_email (required)
 *   - cc_email (optional)
 *   - subject (optional - default basato su document_type/number)
 *   - message (optional - testo libero da inserire nel corpo)
 *   - pdf_base64 (required)
 *   - pdf_filename (optional)
 *   - document_type ('preventivo' | 'contratto' | 'preventivo_cantiere' | 'ricevuta_transito' | 'documento')
 *   - document_number
 *   - customer_name
 *   - company_name (optional)
 *   - marina_id (optional - per override SMTP per-marina)
 *   - company_id (optional - per override Resend per-company)
 *   - related_collection (optional - 'port_quotes' | 'cantiere_quotes' | 'marina_bookings' - per log invio)
 *   - related_id (optional - id documento per log invio)
 */
export async function handleSendDocumentEmail(method, body) {
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const {
    to_email, cc_email, subject, message,
    pdf_base64, pdf_filename, content_type,
    document_type, document_number, customer_name, company_name,
    marina_id, company_id, related_collection, related_id,
  } = body || {};

  if (!to_email) return new Response(JSON.stringify({ error: 'to_email obbligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!pdf_base64) return new Response(JSON.stringify({ error: 'pdf_base64 obbligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  try {
    const db = await getDb();
    let marina = null;
    let company = null;
    if (marina_id) marina = await db.collection('marinas').findOne({ id: marina_id });
    if (company_id) company = await db.collection('companies').findOne({ id: company_id });

    const marinaCfg = marina?.payment_config || {};
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
    const smtpFromEmail = marinaCfg.smtp_user || process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;
    const fromName = marinaCfg.smtp_from_name || company_name || company?.name || marina?.name || process.env.SMTP_FROM_NAME || 'Marina';

    // Pulisci data URL prefix
    let cleanBase64 = pdf_base64;
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
    }

    // Etichette per tipo documento
    const docTypeLabels = {
      preventivo: 'Preventivo Posto Barca',
      contratto: 'Contratto Ormeggio',
      preventivo_cantiere: 'Preventivo Rimessaggio',
      ricevuta_transito: 'Ricevuta Transito',
      ricevuta: 'Ricevuta',
      documento: 'Documento',
    };
    const docLabel = docTypeLabels[document_type] || 'Documento';
    const subj = subject || `${docLabel} ${document_number || ''} - ${fromName}`.trim();

    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0e7490 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">${docLabel}</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${fromName}</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
          <p>Gentile <strong>${customer_name || 'Cliente'}</strong>,</p>
          <p>Le inviamo in allegato il documento <strong>${docLabel} ${document_number || ''}</strong>.</p>
          ${message ? `<div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px; white-space: pre-wrap;">${String(message).replace(/\n/g, '<br>')}</div>` : ''}
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">Per qualsiasi necessità o chiarimento, può rispondere direttamente a questa email.</p>
          <p style="margin-top: 24px; font-size: 14px;">Cordiali saluti,<br><strong>${fromName}</strong></p>
        </div>
        <div style="text-align: center; padding: 12px; font-size: 11px; color: #9ca3af;">
          Documento generato dal sistema gestionale ${fromName}.
        </div>
      </body></html>
    `;

    const attachments = [{
      filename: pdf_filename || `${docLabel.replace(/\s+/g, '_')}_${document_number || 'doc'}.pdf`,
      content: cleanBase64,
      contentType: content_type || 'application/pdf',
    }];

    const toList = (() => {
      // Supporta CC come stringa "a@x,b@y; c@z" o array
      let cc = [];
      if (cc_email) {
        if (Array.isArray(cc_email)) cc = cc_email;
        else cc = String(cc_email).split(/[,;]/).map(s => s.trim()).filter(Boolean);
      }
      if (cc.length === 0) return to_email;
      return [to_email, ...cc];
    })();

    let result;
    let providerUsed;
    let primaryError = null;
    let usedFromEmail;

    if (process.env.RESEND_API_KEY) {
      try {
        const resendFromAddress = `${fromName} <${resendFromEmail}>`;
        result = await sendViaResend({
          from: resendFromAddress,
          to: toList, subject: subj, html, attachments,
        });
        providerUsed = 'resend';
        usedFromEmail = resendFromEmail;
      } catch (e) {
        primaryError = e.message;
        console.warn('[send-document-email] Resend fallito, fallback SMTP:', e.message);
      }
    }

    if (!result) {
      try {
        const smtpFromAddress = `"${fromName}" <${smtpFromEmail}>`;
        result = await sendViaSMTP({
          from: smtpFromAddress,
          to: toList, subject: subj, html, attachments,
          marinaCfg,
        });
        providerUsed = 'smtp';
        usedFromEmail = smtpFromEmail;
      } catch (e) {
        const composedError = primaryError ? `Resend: ${primaryError} · SMTP: ${e.message}` : `SMTP: ${e.message}`;
        return new Response(JSON.stringify({ error: composedError, detail: e.code || e.responseCode || null }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Log invio nella collezione correlata (se specificata)
    if (related_collection && related_id && result?.ok) {
      try {
        await db.collection(related_collection).updateOne(
          { id: related_id },
          {
            $push: {
              email_log: {
                type: document_type || 'document',
                document_number,
                to: to_email,
                cc: cc_email || null,
                from: usedFromEmail,
                provider: providerUsed,
                sent_at: new Date().toISOString(),
                message_id: result.message_id,
              },
            },
            $set: { updated_at: new Date().toISOString(), last_sent_at: new Date().toISOString() },
          }
        );
      } catch (logErr) {
        console.warn('[send-document-email] Log invio fallito:', logErr.message);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: result.message_id,
      to: to_email,
      from: usedFromEmail,
      provider: providerUsed,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[send-document-email] Error:', e);
    return new Response(JSON.stringify({
      error: e.message || 'Errore invio email',
      detail: e.code || e.responseCode || null,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}



// === END-TRIP EMAIL: invio ringraziamento a tutti i passeggeri di un transport_log ===
// POST /api/transport-logs/{id}?action=end-trip-email
// Body: {} (opzionale: { extra_message })
// Logica:
//  - carica il transport_log
//  - estrae email uniche da bookings_snapshot
//  - invia mail di ringraziamento (template fisso)
//  - aggiorna log con status='COMPLETED' e timestamp ended_at, e annota i destinatari
export async function handleEndTripEmail(method, id, body) {
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  if (!id) return new Response(JSON.stringify({ error: 'log id obbligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = await getDb();
  const log = await db.collection('transport_logs').findOne({ id });
  if (!log) return new Response(JSON.stringify({ error: 'Log non trovato' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Carica company per nome/email mittente
  const company = log.company_id ? await db.collection('companies').findOne({ id: log.company_id }) : null;
  const companyName = company?.name || 'Maretrek';

  // Estrai email uniche (esclude nomi liberi senza email, normalizza)
  const seen = new Set();
  const recipients = [];
  for (const b of (log.bookings_snapshot || [])) {
    const email = (b.customer_email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name: b.customer_name || '', booking_ref: b.booking_ref || '' });
  }

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ error: 'Nessuna email valida tra i passeggeri', recipients: 0 }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Template HTML
  const buildHtml = (recipientName) => `
<!DOCTYPE html>
<html><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;background:#f8fafc;padding:24px 0;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
    <div style="text-align:center;padding-bottom:18px;border-bottom:2px solid #0891b2;">
      <h1 style="margin:0;color:#0e7490;font-size:22px;">⛵ Grazie per averci scelto!</h1>
    </div>
    <div style="padding:24px 4px;">
      ${recipientName ? `<p style="margin:0 0 14px 0;">Gentile <strong>${escapeHtml(recipientName)}</strong>,</p>` : ''}
      <p style="margin:0 0 16px 0;font-size:15px;">Vi ringraziamo per averci scelto e ci auguriamo di vedervi presto come nostri ospiti.</p>
      <p style="margin:0 0 16px 0;font-size:15px;"><strong>Buona Vacanza!</strong></p>
      ${body?.extra_message ? `<p style="margin:0 0 16px 0;font-size:14px;color:#475569;">${escapeHtml(body.extra_message).replace(/\n/g, '<br>')}</p>` : ''}
      <p style="margin:24px 0 0 0;font-size:14px;color:#475569;">La direzione di <strong>${escapeHtml(companyName)}</strong></p>
    </div>
    <div style="padding-top:18px;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;text-align:center;">
      Email inviata automaticamente al termine dell'esperienza · ${new Date().toLocaleString('it-IT')}
    </div>
  </div>
</body></html>`.trim();

  const sent = [];
  const failed = [];
  const fromAddress = process.env.RESEND_FROM_EMAIL
    ? `${companyName} <${process.env.RESEND_FROM_EMAIL}>`
    : `${companyName} <noreply@${(process.env.RESEND_FROM_DOMAIN || 'maretrek.com').replace(/^@/, '')}>`;
  const subject = `Grazie per averci scelto - ${companyName}`;

  for (const r of recipients) {
    try {
      let result;
      if (process.env.RESEND_API_KEY) {
        try {
          result = await sendViaResend({ from: fromAddress, to: r.email, subject, html: buildHtml(r.name) });
        } catch (resendErr) {
          // fallback SMTP
          result = await sendViaSMTP({ from: fromAddress, to: r.email, subject, html: buildHtml(r.name) });
        }
      } else {
        result = await sendViaSMTP({ from: fromAddress, to: r.email, subject, html: buildHtml(r.name) });
      }
      sent.push({ email: r.email, name: r.name, message_id: result.message_id, provider: result.provider });
    } catch (e) {
      failed.push({ email: r.email, name: r.name, error: e.message });
    }
  }

  // Aggiorna log: status = COMPLETED, ended_at
  await db.collection('transport_logs').updateOne(
    { id },
    {
      $set: {
        status: 'COMPLETED',
        ended_at: new Date().toISOString(),
        end_trip_email_sent_at: new Date().toISOString(),
        end_trip_email_recipients: sent.map(s => s.email),
        end_trip_email_failures: failed,
        updated_at: new Date().toISOString(),
      },
    }
  );

  return new Response(JSON.stringify({
    ok: true,
    total_recipients: recipients.length,
    sent: sent.length,
    failed: failed.length,
    sent_details: sent,
    failed_details: failed,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
