// /app/app/lib/companyIbanPdf.js
// Genera e scarica/apre un PDF con le coordinate bancarie (IBAN) di una company
'use client';

import jsPDF from 'jspdf';

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
 * Genera PDF con coordinate IBAN della company.
 * @param {object} opts
 *  - company: { name, logo_url, address, city, zip, vat_number, fiscal_code, phone, email, iban, bic_swift, bank_name, bank_branch }
 *  - marina (opzionale): { name, location }
 *  - amount (opzionale): importo da bonificare
 *  - causal (opzionale): causale predisposta
 */
export async function generateCompanyIbanPdf({ company, marina, amount, causal }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;

  // ── HEADER ────────────────────────────────────────────────────────────
  let yHead = 12;
  if (company?.logo_url) {
    try {
      const logoData = await fetchAsDataUrl(company.logo_url);
      if (logoData) {
        const ip = doc.getImageProperties(logoData);
        const targetH = 20;
        const targetW = (ip.width / ip.height) * targetH;
        doc.addImage(logoData, 'PNG', M, yHead, Math.min(targetW, 42), targetH);
      }
    } catch (_e) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 60, 110);
  doc.text(company?.name || 'Maretrek', pageW - M, yHead + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const subLines = [
    company?.address || '',
    [company?.city, company?.zip].filter(Boolean).join(' '),
    company?.vat_number ? `P.IVA: ${company.vat_number}` : '',
    company?.fiscal_code ? `C.F.: ${company.fiscal_code}` : '',
    [company?.phone, company?.email].filter(Boolean).join(' · '),
  ].filter(Boolean);
  let ySub = yHead + 10;
  subLines.forEach(l => { doc.text(l, pageW - M, ySub, { align: 'right' }); ySub += 4; });

  doc.setDrawColor(20, 60, 110);
  doc.setLineWidth(0.6);
  doc.line(M, 36, pageW - M, 36);

  // ── TITLE ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 60, 110);
  doc.text('COORDINATE BANCARIE', pageW / 2, 50, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text('Per pagamento via Bonifico Bancario', pageW / 2, 57, { align: 'center' });

  // ── BOX IBAN ──────────────────────────────────────────────────────────
  const boxY = 70;
  const boxH = 80;
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 3, 3, 'F');
  doc.setDrawColor(20, 60, 110);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 3, 3);

  let yB = boxY + 10;
  const writeField = (label, val, big = false) => {
    if (!val) return;
    doc.setTextColor(20, 60, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${label}:`, M + 5, yB);
    doc.setTextColor(0);
    doc.setFont(big ? 'courier' : 'helvetica', big ? 'bold' : 'normal');
    doc.setFontSize(big ? 14 : 11);
    doc.text(String(val), M + 48, yB);
    yB += big ? 9 : 7;
  };

  writeField('Beneficiario', company?.name || '');
  writeField('IBAN', company?.iban || '—', true);
  writeField('BIC/SWIFT', company?.bic_swift || '');
  writeField('Banca', company?.bank_name || '');
  writeField('Filiale', company?.bank_branch || '');

  // ── DETTAGLI PAGAMENTO (importo + causale predisposta) ─────────────────
  if (amount || causal || marina?.name) {
    const dY = boxY + boxH + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 60, 110);
    doc.text('Dettagli Pagamento', M, dY);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(M, dY + 2, pageW - M, dY + 2);
    let yD = dY + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0);
    if (amount) {
      doc.setFont('helvetica', 'bold');
      doc.text('Importo:', M, yD);
      doc.setFont('helvetica', 'normal');
      doc.text(`€ ${Number(amount).toFixed(2)}`, M + 30, yD);
      yD += 6;
    }
    if (causal) {
      doc.setFont('helvetica', 'bold');
      doc.text('Causale:', M, yD);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(causal, pageW - 2 * M - 30);
      doc.text(lines, M + 30, yD);
      yD += 5 * lines.length + 1;
    }
    if (marina?.name) {
      doc.setFont('helvetica', 'bold');
      doc.text('Marina:', M, yD);
      doc.setFont('helvetica', 'normal');
      doc.text(`${marina.name}${marina.location ? ` (${marina.location})` : ''}`, M + 30, yD);
      yD += 6;
    }
  }

  // ── NOTE LEGALI ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120);
  const noteY = pageH - 38;
  doc.text(
    'NOTE: Per la corretta riconciliazione del pagamento, includere SEMPRE la causale indicata o',
    pageW / 2, noteY, { align: 'center' }
  );
  doc.text(
    'il numero del preventivo/voucher nella descrizione del bonifico.',
    pageW / 2, noteY + 5, { align: 'center' }
  );

  // ── FOOTER ────────────────────────────────────────────────────────────
  doc.setDrawColor(200);
  doc.line(M, pageH - 22, pageW - M, pageH - 22);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Stampato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    pageW / 2, pageH - 14, { align: 'center' }
  );
  doc.setTextColor(160);
  doc.text(company?.name || 'Maretrek', pageW / 2, pageH - 8, { align: 'center' });

  return doc;
}

export async function downloadCompanyIbanPdf(opts) {
  const doc = await generateCompanyIbanPdf(opts);
  const safe = (opts.company?.name || 'Company').replace(/[^a-z0-9]+/gi, '_');
  doc.save(`Coordinate_Bancarie_${safe}.pdf`);
}

export async function openCompanyIbanPdf(opts) {
  const doc = await generateCompanyIbanPdf(opts);
  window.open(doc.output('bloburl'), '_blank');
}
