// Generatore DOCX (Word editabile) per Preventivi Marina / Posti Barca
// Singolo logo della company emittente + layout simile a Cantiere

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

export async function generateMarinaQuoteDOCX({ marina, customer, boat, period, tariff, extras, extras_total, grand_total, quote_number, notes, company }) {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, WidthType, ImageRun, ShadingType,
  } = docx;

  const fetchAsBuffer = async (url) => {
    try {
      const r = await fetch(url);
      return await r.arrayBuffer();
    } catch (e) { return null; }
  };
  const companyLogoBuf = company?.logo_url ? await fetchAsBuffer(company.logo_url) : null;
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

  // === HEADER ===
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
        children: [new TextRun({ text: quote_number ? `PREVENTIVO N° ${quote_number}` : 'PREVIEW POSTO BARCA', bold: true, size: 28, color: '14509F' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: marina?.name || '', size: 22, color: '404040' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: `Data: ${new Date().toLocaleDateString('it-IT')} · Validità: 30 giorni`,
          size: 18, color: '666666',
        })],
      }),
      ...(company?.name ? [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: company.name, size: 18, italics: true, color: '888888' })],
      })] : []),
    ],
  }));

  // === EMITTENTE / CLIENTE ===
  const c = customer || {};
  const b = boat || {};
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'E8F0FB', fill: 'E8F0FB' },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'EMITTENTE', bold: true, color: '14509F', size: 20 })] }),
            new Paragraph({ children: [new TextRun({ text: company?.name || marina?.name || '', bold: true, size: 20 })] }),
            ...(company?.address ? [new Paragraph({ children: [new TextRun({ text: company.address, size: 18 })] })] : []),
            ...((company?.postal_code || company?.city) ? [new Paragraph({ children: [new TextRun({ text: [company?.postal_code, company?.city].filter(Boolean).join(' '), size: 18 })] })] : []),
            ...(company?.vat_number ? [new Paragraph({ children: [new TextRun({ text: `P.IVA: ${company.vat_number}`, size: 18 })] })] : []),
            ...(company?.email ? [new Paragraph({ children: [new TextRun({ text: company.email, size: 18 })] })] : []),
            ...(company?.phone ? [new Paragraph({ children: [new TextRun({ text: company.phone, size: 18 })] })] : []),
            ...(marina?.contact_email && !company?.email ? [new Paragraph({ children: [new TextRun({ text: marina.contact_email, size: 18 })] })] : []),
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
            ...(c.vat_number ? [new Paragraph({ children: [new TextRun({ text: `P.IVA / CF: ${c.vat_number}`, size: 18 })] })] : []),
            ...(b.name || b.length ? [new Paragraph({ children: [new TextRun({ text: `${b.name || 'Barca'}${b.length ? ' · ' + b.length + ' m' : ''}${b.type ? ' · ' + b.type : ''}`, size: 18 })] })] : []),
          ],
        }),
      ],
    })],
  });

  // === TABELLA PERIODO + TARIFFA ===
  const periodTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Periodo', bold: true, color: 'FFFFFF', size: 18 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Giorni', bold: true, color: 'FFFFFF', size: 18 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tariffa', bold: true, color: 'FFFFFF', size: 18 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '14509F', fill: '14509F' },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Importo', bold: true, color: 'FFFFFF', size: 18 })],
            })],
          }),
        ],
      }),
      new TableRow({
        children: [
          cellTxt(`${fmtDate(period?.start_date)} → ${fmtDate(period?.end_date)}`),
          cellTxt(String(period?.days || 0), AlignmentType.CENTER),
          cellTxt(tariff?.label || '—'),
          cellTxt(fmtEur(tariff?.total || 0), AlignmentType.RIGHT, { bold: true }),
        ],
      }),
    ],
  });

  // === SERVIZI EXTRA (se presenti) ===
  const extrasRows = [];
  if (Array.isArray(extras) && extras.length > 0) {
    extrasRows.push(new TableRow({
      children: ['Servizio', 'Q.tà', 'Prezzo unit.', 'Totale'].map((h, i) => new TableCell({
        shading: { type: ShadingType.SOLID, color: 'F0AB47', fill: 'F0AB47' },
        children: [new Paragraph({
          alignment: i >= 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })],
        })],
      })),
    }));
    for (const ex of extras) {
      extrasRows.push(new TableRow({
        children: [
          cellTxt(ex.label || ex.type || 'Extra'),
          cellTxt(String(ex.quantity || ex.units || 1), AlignmentType.CENTER),
          cellTxt(fmtEur(ex.unit_price || ex.price || 0), AlignmentType.RIGHT),
          cellTxt(fmtEur(ex.total || ex.subtotal || 0), AlignmentType.RIGHT, { bold: true }),
        ],
      }));
    }
  }
  const extrasTable = extrasRows.length > 0 ? new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: extrasRows,
  }) : null;

  const totalsTable = new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: [
      totalsRow('Ormeggio', fmtEur(tariff?.total || 0)),
      ...(extras_total > 0 ? [totalsRow('Servizi extra', fmtEur(extras_total))] : []),
      totalsRow('TOTALE', fmtEur(grand_total || 0), true),
    ],
  });

  const doc = new Document({
    creator: company?.name || 'Marina',
    title: `Preventivo ${quote_number || marina?.name || ''}`,
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        infoTable,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: 'PERIODO E TARIFFA APPLICATA', bold: true, color: '14509F', size: 22 })] }),
        periodTable,
        ...(extrasTable ? [
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: 'SERVIZI AGGIUNTIVI', bold: true, color: 'F0AB47', size: 22 })] }),
          extrasTable,
        ] : []),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        totalsTable,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        ...(notes ? [new Paragraph({
          children: [
            new TextRun({ text: 'Note: ', bold: true, color: '14509F', size: 20 }),
            new TextRun({ text: String(notes), size: 20 }),
          ],
        })] : []),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `Preventivo emesso da ${company?.name || marina?.name || 'Marina'} · Documento non fiscale`,
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

  return await Packer.toBlob(doc);
}

export async function downloadMarinaQuoteDOCX(payload) {
  const blob = await generateMarinaQuoteDOCX(payload);
  const { saveAs } = await import('file-saver');
  const filename = `Preventivo_Marina_${payload.quote_number || payload.marina?.slug || 'quote'}.docx`;
  saveAs(blob, filename);
}
