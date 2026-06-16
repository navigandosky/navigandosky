// /app/app/lib/transitPassPdf.js
// Generatore PDF Pass di Transito Marina con intestazione company + QR code
'use client';

import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtDateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Genera un PDF per il Pass di Transito alla sbarra Marina.
 * @param {object} opts
 *  - pass: { id, pass_number, customer, boat, valid_from, valid_to, license_plate, notes, marina_name, marina_address }
 *  - company: { name, logo_url, address, city, vat_number, phone, email }
 * @returns {Promise<jsPDF>} doc pronto per save/dataurl/output
 */
export async function generateTransitPassPdf({ pass, company }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14; // margin

  // ── HEADER: intestazione Company ───────────────────────────────────────
  let yHead = 12;
  if (company?.logo_url) {
    try {
      // Carica il logo come DataURL
      const logoData = await fetchAsDataUrl(company.logo_url);
      if (logoData) {
        const imgProps = doc.getImageProperties(logoData);
        const targetH = 18;
        const targetW = (imgProps.width / imgProps.height) * targetH;
        doc.addImage(logoData, 'PNG', M, yHead, Math.min(targetW, 40), targetH);
      }
    } catch (_e) { /* ignore logo errors */ }
  }
  // Testo Company a destra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 60, 110);
  doc.text(company?.name || 'Maretrek', pageW - M, yHead + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const subLines = [
    company?.address || '',
    [company?.city, company?.zip || company?.postal_code].filter(Boolean).join(' '),
    company?.vat_number ? `P.IVA: ${company.vat_number}` : '',
    [company?.phone, company?.email].filter(Boolean).join(' · '),
  ].filter(Boolean);
  let ySub = yHead + 10;
  subLines.forEach(l => {
    doc.text(l, pageW - M, ySub, { align: 'right' });
    ySub += 4;
  });

  // Linea separatrice
  doc.setDrawColor(20, 60, 110);
  doc.setLineWidth(0.6);
  doc.line(M, 36, pageW - M, 36);

  // ── TITLE ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 60, 110);
  doc.text('PASS DI TRANSITO', pageW / 2, 48, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`Marina ${pass.marina_name || ''}`.trim(), pageW / 2, 55, { align: 'center' });

  // Pass number badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(20, 60, 110);
  doc.setTextColor(255);
  const passLabel = `N° ${pass.pass_number || pass.id?.slice(0, 8) || '—'}`;
  const lblW = doc.getTextWidth(passLabel) + 8;
  doc.roundedRect(pageW / 2 - lblW / 2, 60, lblW, 7, 1.5, 1.5, 'F');
  doc.text(passLabel, pageW / 2, 65, { align: 'center' });

  // ── VALIDITÀ (grande, visibile alla sbarra) ────────────────────────────
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Valido dal', pageW / 2, 80, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 60, 110);
  doc.text(fmtDate(pass.valid_from), pageW / 2, 88, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('al', pageW / 2, 96, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 60, 110);
  doc.text(fmtDate(pass.valid_to), pageW / 2, 104, { align: 'center' });

  // ── DATI CLIENTE & BARCA (tabella sinistra + QR a destra) ──────────────
  const blockY = 116;
  const blockH = 64;
  // box sfondo
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(M, blockY, pageW - 2 * M, blockH, 2, 2, 'F');
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.roundedRect(M, blockY, pageW - 2 * M, blockH, 2, 2);

  // Dati cliente / barca (left col)
  doc.setTextColor(20, 60, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Intestatario', M + 4, blockY + 7);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const cust = pass.customer || {};
  const custFull = `${cust.name || ''} ${cust.surname || ''}`.trim() || cust.fullname || '—';
  let yL = blockY + 13;
  const writeField = (label, val) => {
    if (!val) return;
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, M + 4, yL);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), M + 30, yL);
    yL += 5;
  };
  writeField('Nome', custFull);
  writeField('Documento', cust.document || cust.cf);
  writeField('Email', cust.email);
  writeField('Telefono', cust.phone);

  // Boat / vehicle info
  doc.setTextColor(20, 60, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Imbarcazione / Mezzo', M + 4, yL + 4);
  yL += 8;
  doc.setTextColor(0);
  doc.setFontSize(10);
  const boat = pass.boat || {};
  writeField('Nome', boat.name);
  writeField('Targa/Sigla', pass.license_plate || boat.license_plate || boat.registration);
  writeField('Tipo', boat.type);

  // QR code (right side)
  try {
    const qrPayload = JSON.stringify({
      pass: pass.pass_number || pass.id,
      from: pass.valid_from,
      to: pass.valid_to,
      marina: pass.marina_id,
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 220, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', pageW - M - 48, blockY + 6, 44, 44);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text('Scansiona alla sbarra', pageW - M - 26, blockY + 56, { align: 'center' });
  } catch (_e) {}

  // ── NOTE ───────────────────────────────────────────────────────────────
  if (pass.notes) {
    doc.setTextColor(20, 60, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Note:', M, blockY + blockH + 8);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(pass.notes, pageW - 2 * M);
    doc.text(noteLines, M, blockY + blockH + 14);
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(M, pageH - 22, pageW - M, pageH - 22);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Pass emesso il ${fmtDateShort(pass.issued_at || new Date().toISOString())} · Documento valido SOLO nel periodo indicato.`,
    pageW / 2, pageH - 16, { align: 'center' }
  );
  doc.text(
    'Da esibire al personale di servizio alla sbarra. La validità è subordinata al rispetto del regolamento di porto.',
    pageW / 2, pageH - 11, { align: 'center' }
  );
  doc.setTextColor(160);
  doc.text(company?.name || 'Maretrek', pageW / 2, pageH - 6, { align: 'center' });

  return doc;
}

// ── helper: carica immagine come DataURL via fetch ──────────────────────
async function fetchAsDataUrl(url) {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch (_e) { return null; }
}

/**
 * Helper rapido: scarica direttamente il PDF.
 */
export async function downloadTransitPassPdf(opts) {
  const doc = await generateTransitPassPdf(opts);
  const safeName = `Pass_Transito_${opts.pass?.pass_number || 'doc'}.pdf`;
  doc.save(safeName);
}

/**
 * Apre il PDF in una nuova tab (utile per stampa).
 */
export async function openTransitPassPdf(opts) {
  const doc = await generateTransitPassPdf(opts);
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}

/**
 * Restituisce il PDF come base64 (per invio via API/email).
 */
export async function transitPassPdfBase64(opts) {
  const doc = await generateTransitPassPdf(opts);
  return doc.output('datauristring').split(',')[1]; // remove the "data:application/pdf;base64," prefix
}
