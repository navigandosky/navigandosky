// Generatore PDF + DOCX (Word editabile) per Preventivi Cantiere / Rimessaggio Nautico
// Usa stesso layout dei preventivi marina (loghi Maretrek + Trivor)

import { loadImageAsDataURL } from './pdfGen';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

// =============================================================================
// PDF - Preventivo Cantiere (jsPDF + autoTable)
// company: { name, logo_url } - logo della company che emette
// =============================================================================
export async function generateCantierePDF(quote, company) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  const companyLogo = company?.logo_url ? await loadImageAsDataURL(company.logo_url) : null;

  if (companyLogo) try { doc.addImage(companyLogo, 14, 10, 32, 25); } catch (e) {}

  doc.setFontSize(15); doc.setTextColor(20, 80, 160);
  doc.text(`PREVENTIVO N° ${quote.quote_number || '—'}`, 105, 18, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(60);
  doc.text('Rimessaggio Nautico - Cantiere', 105, 25, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(
    `Data emissione: ${fmtDate(quote.created_at)} · Validità fino al: ${fmtDate(quote.valid_until)}`,
    105, 31, { align: 'center' }
  );
  if (company?.name) {
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Emesso da: ${company.name}`, 196, 36, { align: 'right' });
  }

  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.6);
  doc.line(14, 40, 196, 40);

  let y = 48;

  doc.setFontSize(9); doc.setTextColor(20, 80, 160);
  doc.text('EMITTENTE', 14, y);
  doc.text('CLIENTE', 110, y);
  y += 5;
  doc.setFontSize(9); doc.setTextColor(0);
  const issuerLines = [
    company?.name || 'Cantiere Nautico',
    company?.address || 'Cantiere Nautico - Servizi Rimessaggio',
    [company?.postal_code, company?.city, company?.country].filter(Boolean).join(' ') || 'Sardegna - Italia',
    company?.vat_number ? `P.IVA: ${company.vat_number}` : '',
    company?.email ? `Email: ${company.email}` : '',
    company?.phone ? `Tel: ${company.phone}` : '',
  ].filter(Boolean);
  const c = quote.customer || {};
  const b = quote.boat || {};
  const clientLines = [
    `${c.name || ''} ${c.surname || ''}`.trim(),
    c.email || '',
    c.phone || '',
    c.vat_number ? `P.IVA / CF: ${c.vat_number}` : '',
    b.name ? `Barca: ${b.name}` : '',
    b.registration ? `Targa: ${b.registration}` : '',
    b.length ? `Lunghezza: ${b.length} m` : '',
  ].filter(Boolean);
  const maxLines = Math.max(issuerLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (issuerLines[i]) doc.text(String(issuerLines[i]).slice(0, 55), 14, y + i * 4.5);
    if (clientLines[i]) doc.text(String(clientLines[i]).slice(0, 55), 110, y + i * 4.5);
  }
  y += maxLines * 4.5 + 8;

  const items = quote.items || [];
  const rows = items.map((it, idx) => [
    String(idx + 1),
    it.description || '',
    String(it.qty || 0),
    fmtEur(it.unit_price),
    fmtEur(it.amount),
    it.discount ? `-${fmtEur(it.discount)}` : '—',
    fmtEur(it.net_taxable),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descrizione servizio', 'Q.tà', 'Prezzo unit.', 'Importo', 'Sconto', 'Netto']],
    body: rows.length > 0 ? rows : [['—', 'Nessun servizio inserito', '', '', '', '', '']],
    headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 5;

  const subtotal = quote.subtotal_net || 0;
  const ivaRate = quote.iva_rate ?? 22;
  const ivaAmt = quote.iva_amount || 0;
  const grand = quote.grand_total || 0;

  autoTable(doc, {
    startY: y,
    body: [
      ['Imponibile', fmtEur(subtotal)],
      [`IVA ${ivaRate}%`, fmtEur(ivaAmt)],
      [{ content: 'TOTALE', styles: { fontStyle: 'bold', fillColor: [20, 80, 160], textColor: 255 } },
       { content: fmtEur(grand), styles: { fontStyle: 'bold', fillColor: [20, 80, 160], textColor: 255, halign: 'right' } }],
    ],
    columnStyles: {
      0: { cellWidth: 130, halign: 'right' },
      1: { cellWidth: 50, halign: 'right' },
    },
    theme: 'plain',
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  if (quote.payment_method) {
    doc.setFontSize(9); doc.setTextColor(20, 80, 160);
    doc.text('Modalità di pagamento:', 14, y);
    doc.setTextColor(0);
    doc.text(String(quote.payment_method), 60, y);
    y += 6;
  }

  if (quote.notes) {
    doc.setFontSize(9); doc.setTextColor(20, 80, 160);
    doc.text('Note:', 14, y); y += 5;
    doc.setTextColor(0); doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(String(quote.notes), 180);
    doc.text(splitNotes, 14, y);
    y += splitNotes.length * 4 + 4;
  }

  doc.setDrawColor(180); doc.setLineWidth(0.3);
  doc.line(14, 280, 196, 280);
  doc.setFontSize(7.5); doc.setTextColor(110);
  doc.text(
    `Preventivo emesso da ${company?.name || 'Cantiere Nautico'} · Documento non fiscale`,
    105, 285, { align: 'center' }
  );
  if (company?.vat_number) {
    doc.text(`P.IVA: ${company.vat_number}`, 105, 289, { align: 'center' });
  }

  return doc;
}

// =============================================================================
// DOCX - Preventivo Cantiere editabile in Word
// company: { name, logo_url } - logo della company che emette
// =============================================================================
export async function generateCantiereDOCX(quote, company) {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, WidthType, ImageRun, ShadingType,
  } = docx;

  const fetchAsBuffer = async (url) => {
    try {
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      return ab;
    } catch (e) { return null; }
  };
  // Carica unico logo della company che emette
  const companyLogoBuf = company?.logo_url ? await fetchAsBuffer(company.logo_url) : null;
  // Determina il tipo immagine (jpg/png/gif) dall'estensione dell'URL
  const detectImageType = (url) => {
    if (!url) return 'png';
    const u = url.toLowerCase();
    if (u.includes('.jpg') || u.includes('.jpeg')) return 'jpg';
    if (u.includes('.gif')) return 'gif';
    if (u.includes('.bmp')) return 'bmp';
    return 'png';
  };
  const companyLogoType = detectImageType(company?.logo_url);

  const noBorders = () => {
    const none = { style: 'none', size: 0, color: 'FFFFFF' };
    return { top: none, bottom: none, left: none, right: none };
  };
  const cellTxt = (text, align = AlignmentType.LEFT, opts = {}) => new TableCell({
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text || ''), size: 18, ...opts })],
    })],
  });
  const totalsRow = (label, value, bold = false) => new TableRow({
    children: [
      new TableCell({
        shading: bold ? { type: ShadingType.SOLID, color: '14509F', fill: '14509F' } : undefined,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: label, bold, color: bold ? 'FFFFFF' : '000000', size: bold ? 22 : 20 })],
        })],
      }),
      new TableCell({
        shading: bold ? { type: ShadingType.SOLID, color: '14509F', fill: '14509F' } : undefined,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: value, bold, color: bold ? 'FFFFFF' : '000000', size: bold ? 22 : 20 })],
        })],
      }),
    ],
  });

  // HEADER con UN SOLO logo della company emittente (a sinistra)
  const headerCells = [];
  if (companyLogoBuf) {
    headerCells.push(new TableCell({
      width: { size: 25, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: companyLogoBuf, type: companyLogoType, transformation: { width: 110, height: 90 } })],
      })],
    }));
  }
  headerCells.push(new TableCell({
    width: { size: companyLogoBuf ? 75 : 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `PREVENTIVO N° ${quote.quote_number || '—'}`, bold: true, size: 28, color: '14509F' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Rimessaggio Nautico - Cantiere', size: 22, color: '404040' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: `Data: ${fmtDate(quote.created_at)} · Validità: ${fmtDate(quote.valid_until)}`,
          size: 18, color: '666666',
        })],
      }),
      ...(company?.name ? [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: company.name, size: 18, italics: true, color: '888888' })],
      })] : []),
    ],
  }));

  const c = quote.customer || {};
  const b = quote.boat || {};

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'E8F0FB', fill: 'E8F0FB' },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'EMITTENTE', bold: true, color: '14509F', size: 20 })] }),
            new Paragraph({ children: [new TextRun({ text: company?.name || 'Cantiere Nautico', bold: true, size: 20 })] }),
            ...(company?.address ? [new Paragraph({ children: [new TextRun({ text: company.address, size: 18 })] })] : []),
            ...((company?.postal_code || company?.city) ? [new Paragraph({ children: [new TextRun({ text: [company?.postal_code, company?.city].filter(Boolean).join(' '), size: 18 })] })] : []),
            ...(company?.vat_number ? [new Paragraph({ children: [new TextRun({ text: `P.IVA: ${company.vat_number}`, size: 18 })] })] : []),
            ...(company?.email ? [new Paragraph({ children: [new TextRun({ text: company.email, size: 18 })] })] : []),
            ...(company?.phone ? [new Paragraph({ children: [new TextRun({ text: company.phone, size: 18 })] })] : []),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'F5F5F5', fill: 'F5F5F5' },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'CLIENTE', bold: true, color: '14509F', size: 20 })] }),
            new Paragraph({ children: [new TextRun({ text: `${c.name || ''} ${c.surname || ''}`.trim() || '—', bold: true, size: 20 })] }),
            new Paragraph({ children: [new TextRun({ text: c.email || '', size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: c.phone || '', size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: c.vat_number ? `P.IVA / CF: ${c.vat_number}` : '', size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: b.name ? `Barca: ${b.name}${b.registration ? ' · Targa: ' + b.registration : ''}` : '', size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: b.length ? `Lunghezza: ${b.length} m` : '', size: 18 })] }),
          ],
        }),
      ],
    })],
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['#', 'Descrizione servizio', 'Q.tà', 'Prezzo unit.', 'Importo', 'Sconto', 'Netto'].map((h, i) =>
      new TableCell({
        width: { size: [5, 40, 8, 12, 12, 11, 12][i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })],
        })],
      })
    ),
  });

  const items = quote.items || [];
  const itemRows = items.map((it, idx) => new TableRow({
    children: [
      cellTxt(String(idx + 1), AlignmentType.CENTER),
      cellTxt(it.description || ''),
      cellTxt(String(it.qty || 0), AlignmentType.CENTER),
      cellTxt(fmtEur(it.unit_price), AlignmentType.RIGHT),
      cellTxt(fmtEur(it.amount), AlignmentType.RIGHT),
      cellTxt(it.discount ? `-${fmtEur(it.discount)}` : '—', AlignmentType.RIGHT),
      cellTxt(fmtEur(it.net_taxable), AlignmentType.RIGHT),
    ],
  }));

  const servicesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: itemRows.length > 0 ? [headerRow, ...itemRows] : [
      headerRow,
      new TableRow({
        children: [new TableCell({
          columnSpan: 7,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Nessun servizio inserito', italics: true, color: '888888' })],
          })],
        })],
      }),
    ],
  });

  const subtotal = quote.subtotal_net || 0;
  const ivaRate = quote.iva_rate ?? 22;
  const ivaAmt = quote.iva_amount || 0;
  const grand = quote.grand_total || 0;

  const totalsTable = new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: [
      totalsRow('Imponibile', fmtEur(subtotal)),
      totalsRow(`IVA ${ivaRate}%`, fmtEur(ivaAmt)),
      totalsRow('TOTALE', fmtEur(grand), true),
    ],
  });

  const doc = new Document({
    creator: 'Marlin Sub',
    title: `Preventivo ${quote.quote_number || ''}`,
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        infoTable,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({
          children: [new TextRun({ text: 'SERVIZI E PRESTAZIONI', bold: true, color: '14509F', size: 22 })],
        }),
        servicesTable,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        totalsTable,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        ...(quote.payment_method ? [new Paragraph({
          children: [
            new TextRun({ text: 'Modalità di pagamento: ', bold: true, color: '14509F', size: 20 }),
            new TextRun({ text: String(quote.payment_method), size: 20 }),
          ],
        })] : []),
        ...(quote.notes ? [new Paragraph({
          children: [
            new TextRun({ text: 'Note: ', bold: true, color: '14509F', size: 20 }),
            new TextRun({ text: String(quote.notes), size: 20 }),
          ],
        })] : []),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `Preventivo emesso da ${company?.name || 'Cantiere Nautico'} · Documento non fiscale`,
            color: '888888', size: 16, italics: true,
          })],
        }),
        ...(company?.vat_number ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `P.IVA: ${company.vat_number}`, color: '888888', size: 16, italics: true })],
        })] : []),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

export async function downloadCantiereDOCX(quote, company) {
  const blob = await generateCantiereDOCX(quote, company);
  const { saveAs } = await import('file-saver');
  saveAs(blob, `Preventivo_${quote.quote_number || 'cantiere'}.docx`);
}

export async function downloadCantierePDF(quote, company) {
  const doc = await generateCantierePDF(quote, company);
  doc.save(`Preventivo_${quote.quote_number || 'cantiere'}.pdf`);
}
