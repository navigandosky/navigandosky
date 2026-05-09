// Generatore Ricevuta (PDF + Word editabile) per contratti marina
// IVA 10% scorporata dal totale (totale = imponibile + IVA 10%)

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

const detectImageType = (url) => {
  if (!url) return 'png';
  const u = url.toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'jpg';
  if (u.includes('.gif')) return 'gif';
  if (u.includes('.bmp')) return 'bmp';
  return 'png';
};

const loadDataURL = async (url) => {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
};

const fetchAsBuffer = async (url) => {
  try { const r = await fetch(url); return await r.arrayBuffer(); } catch { return null; }
};

/**
 * Calcola scorporo IVA 10% (totale lordo → imponibile + iva)
 */
export function splitVAT10(totalLordo) {
  const total = Number(totalLordo) || 0;
  const imponibile = Math.round((total / 1.10) * 100) / 100;
  const iva = Math.round((total - imponibile) * 100) / 100;
  return { total, imponibile, iva, vat_rate: 10 };
}

/**
 * Calcola dati ricevuta da un payment singolo o dal totale incassato
 */
export function buildReceiptData(contract, payment = null) {
  const grandTotal = Number(contract.grand_total || 0);
  const paidTotal = Number(contract.paid_total || 0);
  const balanceRemaining = Math.max(0, Math.round((grandTotal - paidTotal) * 100) / 100);

  // Importo della ricevuta: se è per un singolo pagamento, quel pagamento; altrimenti l'incassato totale
  const receiptAmount = payment ? Number(payment.amount || 0) : paidTotal;
  const split = splitVAT10(receiptAmount);

  return {
    receipt_number: payment ? `RIC-${payment.id?.slice(0, 8) || Date.now()}` : `RIC-${contract.booking_number}`,
    contract_number: contract.booking_number,
    quote_number: contract.quote_number,
    berth_label: contract.berth_label || '—',
    issue_date: payment?.date || new Date().toISOString(),
    customer: contract.customer || {},
    boat: contract.boat || {},
    marina_name: contract.marina_name,
    period: { start: contract.start_date, end: contract.end_date, days: contract.days },
    tariff_label: contract.tariff_label || '—',
    method: payment?.method || 'MISTO',
    reference: payment?.reference || '',
    notes: payment?.notes || '',
    grand_total_contract: grandTotal,
    paid_total: paidTotal,
    balance_remaining: balanceRemaining,
    receipt_amount: receiptAmount,
    imponibile: split.imponibile,
    iva: split.iva,
    vat_rate: split.vat_rate,
    is_full_settlement: paidTotal >= grandTotal,
  };
}

// =====================================================================
// PDF: Ricevuta
// =====================================================================
async function buildReceiptPdfDoc(contract, company, payment = null) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const data = buildReceiptData(contract, payment);

  const companyLogo = company?.logo_url ? await loadDataURL(company.logo_url) : null;

  // Header
  if (companyLogo) {
    try { doc.addImage(companyLogo, 14, 10, 32, 25); } catch {}
  }
  doc.setFontSize(18); doc.setTextColor(20, 80, 160);
  doc.text('RICEVUTA DI PAGAMENTO', 105, 20, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(60);
  doc.text(`N° ${data.receipt_number}`, 105, 28, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Data: ${fmtDate(data.issue_date)}`, 105, 34, { align: 'center' });
  if (company?.name) {
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Emessa da: ${company.name}`, 196, 38, { align: 'right' });
  }

  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.5);
  doc.line(14, 42, 196, 42);

  let y = 50;

  // Riferimenti contratto
  doc.setFontSize(10); doc.setTextColor(20, 80, 160);
  doc.text('Riferimenti Contratto', 14, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(40);
  doc.text(`Contratto/Prenotazione: ${data.contract_number}`, 14, y); y += 5;
  if (data.quote_number) { doc.text(`Preventivo origine: ${data.quote_number}`, 14, y); y += 5; }
  doc.text(`Marina: ${data.marina_name || '—'} · Posto barca: ${data.berth_label}`, 14, y); y += 5;
  doc.text(`Periodo: ${fmtDate(data.period.start)} → ${fmtDate(data.period.end)} (${data.period.days} giorni)`, 14, y); y += 5;
  doc.text(`Tariffa applicata: ${data.tariff_label}`, 14, y); y += 8;

  // Cliente
  doc.setFontSize(10); doc.setTextColor(20, 80, 160);
  doc.text('Cliente', 14, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(40);
  const cust = data.customer;
  doc.text(`${cust.name || ''} ${cust.surname || ''}`, 14, y); y += 5;
  if (cust.email) { doc.text(`Email: ${cust.email}`, 14, y); y += 5; }
  if (cust.phone) { doc.text(`Tel: ${cust.phone}`, 14, y); y += 5; }
  if (cust.tax_code) { doc.text(`CF/P.IVA: ${cust.tax_code}`, 14, y); y += 5; }
  if (cust.address) { doc.text(`${cust.address || ''}${cust.city ? ', ' + cust.city : ''}${cust.zip ? ' ' + cust.zip : ''}`, 14, y); y += 5; }
  y += 3;

  // Imbarcazione
  if (data.boat?.name || data.boat?.length) {
    doc.setFontSize(10); doc.setTextColor(20, 80, 160);
    doc.text('Imbarcazione', 14, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(40);
    doc.text(`${data.boat.name || ''} ${data.boat.registration ? '(targa ' + data.boat.registration + ')' : ''}`.trim(), 14, y); y += 5;
    doc.text(`Tipo: ${data.boat.type || '—'} · Lunghezza: ${data.boat.length || 0}m`, 14, y); y += 8;
  }

  // Importi - Tabella scorporo IVA 10%
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Descrizione', 'Importo (€)']],
    headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    columnStyles: { 1: { halign: 'right' } },
    body: [
      [`Imponibile (netto)`, fmtEur(data.imponibile)],
      [`IVA ${data.vat_rate}%`, fmtEur(data.iva)],
    ],
    foot: [
      [{ content: `TOTALE RICEVUTA`, styles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold', fontSize: 11 } },
       { content: fmtEur(data.receipt_amount), styles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold', halign: 'right', fontSize: 11 } }],
    ],
  });

  y = doc.lastAutoTable.finalY + 8;

  // Riepilogo contratto
  doc.setFontSize(10); doc.setTextColor(20, 80, 160);
  doc.text('Stato Pagamenti del Contratto', 14, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(40);
  doc.text(`Totale contratto: ${fmtEur(data.grand_total_contract)}`, 14, y); y += 5;
  doc.text(`Totale incassato: ${fmtEur(data.paid_total)}`, 14, y); y += 5;
  doc.setTextColor(data.balance_remaining > 0 ? 200 : 0, data.balance_remaining > 0 ? 80 : 130, 0);
  doc.text(`Saldo rimanente: ${fmtEur(data.balance_remaining)}${data.is_full_settlement ? '  ✓ SALDATO' : ''}`, 14, y); y += 8;
  doc.setTextColor(40);

  // Metodo pagamento
  if (data.method) {
    doc.setFontSize(9);
    doc.text(`Metodo: ${data.method}${data.reference ? ' · Rif: ' + data.reference : ''}`, 14, y); y += 5;
  }
  if (data.notes) {
    doc.text(`Note: ${data.notes}`, 14, y); y += 5;
  }

  // Footer con dati company
  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.3);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(8); doc.setTextColor(120);
  if (company) {
    const parts = [];
    if (company.address) parts.push(company.address);
    if (company.city) parts.push(company.city);
    if (company.vat_number) parts.push(`P.IVA ${company.vat_number}`);
    doc.text(parts.join(' · '), 105, 281, { align: 'center' });
    if (company.email || company.phone) {
      doc.text(`${company.email || ''}${company.email && company.phone ? ' · ' : ''}${company.phone || ''}`, 105, 286, { align: 'center' });
    }
  }
  doc.text('Documento generato elettronicamente.', 105, 291, { align: 'center' });

  return { doc, data };
}

export async function downloadReceiptPDF(contract, company, payment = null) {
  const { doc, data } = await buildReceiptPdfDoc(contract, company, payment);
  doc.save(`Ricevuta_${data.receipt_number}.pdf`);
}

/** Genera ricevuta come Blob (per allegarla a email) */
export async function generateReceiptPDFBlob(contract, company, payment = null) {
  const { doc } = await buildReceiptPdfDoc(contract, company, payment);
  return doc.output('blob');
}

// =====================================================================
// WORD (DOCX): Ricevuta editabile
// =====================================================================
export async function downloadReceiptDOCX(contract, company, payment = null) {
  const { saveAs } = await import('file-saver');
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, WidthType, ImageRun, ShadingType, BorderStyle,
  } = docx;
  const data = buildReceiptData(contract, payment);

  const companyLogoBuf = company?.logo_url ? await fetchAsBuffer(company.logo_url) : null;
  const companyLogoType = detectImageType(company?.logo_url);

  const noBorders = () => {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return { top: none, bottom: none, left: none, right: none };
  };
  const cellTxt = (text, align = AlignmentType.LEFT, opts = {}) => new TableCell({
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text || ''), size: 20, ...opts })] })],
    borders: opts.bordered ? undefined : noBorders(),
  });

  // HEADER table: logo a sinistra, titolo a destra
  const headerCells = [];
  if (companyLogoBuf) {
    headerCells.push(new TableCell({
      width: { size: 25, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      children: [new Paragraph({ children: [new ImageRun({ data: companyLogoBuf, transformation: { width: 90, height: 70 }, type: companyLogoType })] })],
    }));
  }
  headerCells.push(new TableCell({
    width: { size: companyLogoBuf ? 75 : 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'RICEVUTA DI PAGAMENTO', bold: true, size: 32, color: '14509F' })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `N° ${data.receipt_number}`, size: 22, color: '555555' })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Data: ${fmtDate(data.issue_date)}`, size: 18, color: '888888' })] }),
      ...(company?.name ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Emessa da: ${company.name}`, size: 16, color: '888888', italics: true })] })] : []),
    ],
  }));

  const headerTable = new Table({ rows: [new TableRow({ children: headerCells })], width: { size: 100, type: WidthType.PERCENTAGE } });

  const sectionHeading = (text) => new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true, size: 22, color: '14509F' })] });
  const line = (label, value) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true, size: 19 }), new TextRun({ text: String(value || '—'), size: 19 })] });

  // Tabella importi
  const amountsTable = new Table({
    rows: [
      new TableRow({ children: [
        new TableCell({ shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' }, children: [new Paragraph({ children: [new TextRun({ text: 'Descrizione', bold: true, color: 'FFFFFF', size: 20 })] })] }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Importo (€)', bold: true, color: 'FFFFFF', size: 20 })] })] }),
      ]}),
      new TableRow({ children: [
        cellTxt('Imponibile (netto)', AlignmentType.LEFT, { bordered: true }),
        cellTxt(fmtEur(data.imponibile), AlignmentType.RIGHT, { bordered: true }),
      ]}),
      new TableRow({ children: [
        cellTxt(`IVA ${data.vat_rate}%`, AlignmentType.LEFT, { bordered: true }),
        cellTxt(fmtEur(data.iva), AlignmentType.RIGHT, { bordered: true }),
      ]}),
      new TableRow({ children: [
        new TableCell({ shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' }, children: [new Paragraph({ children: [new TextRun({ text: 'TOTALE RICEVUTA', bold: true, color: 'FFFFFF', size: 22 })] })] }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtEur(data.receipt_amount), bold: true, color: 'FFFFFF', size: 22 })] })] }),
      ]}),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const cust = data.customer;

  const children = [
    headerTable,
    new Paragraph({ children: [new TextRun({ text: '', size: 16 })] }),

    sectionHeading('Riferimenti Contratto'),
    line('Contratto/Prenotazione', data.contract_number),
    ...(data.quote_number ? [line('Preventivo origine', data.quote_number)] : []),
    line('Marina', `${data.marina_name || '—'} — Posto ${data.berth_label}`),
    line('Periodo', `${fmtDate(data.period.start)} → ${fmtDate(data.period.end)} (${data.period.days} giorni)`),
    line('Tariffa applicata', data.tariff_label),

    sectionHeading('Cliente'),
    new Paragraph({ children: [new TextRun({ text: `${cust.name || ''} ${cust.surname || ''}`, bold: true, size: 22 })] }),
    ...(cust.email ? [line('Email', cust.email)] : []),
    ...(cust.phone ? [line('Telefono', cust.phone)] : []),
    ...(cust.tax_code ? [line('CF/P.IVA', cust.tax_code)] : []),
    ...((cust.address || cust.city) ? [line('Indirizzo', `${cust.address || ''}${cust.city ? ', ' + cust.city : ''}${cust.zip ? ' ' + cust.zip : ''}`)] : []),

    ...(data.boat?.name || data.boat?.length ? [
      sectionHeading('Imbarcazione'),
      line('Nome', `${data.boat.name || '—'}${data.boat.registration ? ' (targa ' + data.boat.registration + ')' : ''}`),
      line('Tipo / Lunghezza', `${data.boat.type || '—'} · ${data.boat.length || 0}m`),
    ] : []),

    sectionHeading('Importi (con scorporo IVA 10%)'),
    amountsTable,

    sectionHeading('Stato Pagamenti del Contratto'),
    line('Totale contratto', fmtEur(data.grand_total_contract)),
    line('Totale incassato', fmtEur(data.paid_total)),
    new Paragraph({ children: [new TextRun({ text: `Saldo rimanente: ${fmtEur(data.balance_remaining)}${data.is_full_settlement ? '  ✓ SALDATO' : ''}`, bold: true, color: data.balance_remaining > 0 ? 'C8501E' : '0E8C44', size: 22 })] }),
    ...(data.method ? [line('Metodo pagamento', `${data.method}${data.reference ? ' · Rif: ' + data.reference : ''}`)] : []),
    ...(data.notes ? [line('Note', data.notes)] : []),

    new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: '─'.repeat(60), color: '14509F' })
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: company?.name || '', size: 18, color: '888888' }),
    ]}),
    ...(company ? [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: [company.address, company.city, company.vat_number ? `P.IVA ${company.vat_number}` : ''].filter(Boolean).join(' · '), size: 16, color: '888888' })
      ]}),
      ...(company.email || company.phone ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: `${company.email || ''}${company.email && company.phone ? ' · ' : ''}${company.phone || ''}`, size: 16, color: '888888' })
      ]})] : []),
    ] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Documento generato elettronicamente.', size: 14, color: 'AAAAAA', italics: true })] }),
  ];

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ricevuta_${data.receipt_number}.docx`);
}
