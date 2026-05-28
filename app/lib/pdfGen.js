// Helper per generazione PDF (preventivi, ricevute, contratti)
// Utilizzato sia nel Preview Posto Barca pubblico che nei tab admin

export const loadImageAsDataURL = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
};

const fmtPrice = (p) => (p ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

// =====================================================================
// PDF PREVENTIVO (dalla card Preview o dal tab Preventivi admin)
// company: { name, logo_url } - logo della company che emette il documento
// =====================================================================
export async function generateQuotePDF({ marina, customer, boat, period, tariff, extras, extras_total, grand_total, quote_number, notes, company, returnAs }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  
  // Carica unico logo della company che emette
  const companyLogo = company?.logo_url ? await loadImageAsDataURL(company.logo_url) : null;

  // === HEADER ===
  if (companyLogo) try { doc.addImage(companyLogo, 14, 10, 32, 25); } catch (e) {}
  
  doc.setFontSize(16); doc.setTextColor(20, 80, 160);
  doc.text(quote_number ? `PREVENTIVO N° ${quote_number}` : 'PREVIEW POSTO BARCA', 105, 18, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(60);
  doc.text(marina?.name || '', 105, 25, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Data emissione: ${new Date().toLocaleDateString('it-IT')} · Validità: 30 giorni`, 105, 31, { align: 'center' });
  if (company?.name) {
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Emesso da: ${company.name}`, 196, 36, { align: 'right' });
  }
  
  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.6);
  doc.line(14, 40, 196, 40);
  
  let y = 48;

  // === MARINA + CLIENTE ===
  doc.setFontSize(9); doc.setTextColor(20, 80, 160);
  doc.text('MARINA', 14, y);
  doc.text('CLIENTE', 110, y);
  y += 5;
  doc.setFontSize(9); doc.setTextColor(0);
  const marinaLines = [
    marina?.name,
    marina?.address || marina?.location || '',
    marina?.contact_phone || '',
    marina?.contact_email || '',
  ].filter(Boolean);
  const clientLines = [
    `${customer?.name || ''} ${customer?.surname || ''}`.trim(),
    customer?.email || '',
    customer?.phone || '',
    customer?.tax_code ? `CF/P.IVA: ${customer.tax_code}` : '',
    customer?.address || '',
    [customer?.zip, customer?.city, customer?.country !== 'IT' ? customer?.country : ''].filter(Boolean).join(' '),
    boat?.name ? `Barca: ${boat.name}` : '',
    boat?.registration ? `Targa: ${boat.registration}` : '',
  ].filter(Boolean);
  const maxLines = Math.max(marinaLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (marinaLines[i]) doc.text(String(marinaLines[i]).slice(0, 50), 14, y + i * 4.5);
    if (clientLines[i]) doc.text(String(clientLines[i]).slice(0, 50), 110, y + i * 4.5);
  }
  y += maxLines * 4.5 + 8;

  // === IMBARCAZIONE / PERIODO ===
  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Lunghezza', 'Periodo', 'Giorni']],
    body: [[
      boat?.type === 'sail' ? 'Vela' : boat?.type === 'catamaran' ? 'Catamarano' : 'Motore',
      `${boat?.length || 0} m`,
      `${period?.start_date ? new Date(period.start_date).toLocaleDateString('it-IT') : ''} - ${period?.end_date ? new Date(period.end_date).toLocaleDateString('it-IT') : ''}`,
      `${period?.days || 0} gg`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // === TARIFFA ===
  if (tariff) {
    doc.setFontSize(10); doc.setTextColor(20, 120, 60);
    doc.text(`Tariffa applicata: ${tariff.label || ''}`, 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Descrizione', 'Importo']],
      body: (tariff.detail || [{ subtotal: tariff.total }]).map(d => [
        d.month_name ? `${d.month_name} - ${d.days} giorni × €${d.daily_price?.toFixed(2)}` :
        d.months ? `${d.months} mes${d.months > 1 ? 'i' : 'e'} × €${d.monthly_price?.toFixed(2)}` :
        tariff.label || 'Ormeggio',
        fmtPrice(d.subtotal)
      ]),
      foot: [['TOTALE ORMEGGIO', fmtPrice(tariff.total)]],
      theme: 'striped',
      headStyles: { fillColor: [20, 80, 160], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      footStyles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      margin: { left: 14, right: 14 },
      columnStyles: { 1: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 6;
    
    // Descrizione tariffa personalizzata
    if (tariff.description) {
      doc.setFontSize(8); doc.setTextColor(60, 80, 120);
      doc.text('Dettaglio tariffa personalizzata:', 14, y);
      y += 4;
      doc.setFontSize(8); doc.setTextColor(40);
      const wrapped = doc.splitTextToSize(tariff.description, 180);
      wrapped.forEach(line => { doc.text(line, 14, y); y += 4; });
      y += 3;
    }
  }

  // === EXTRA ===
  if (extras?.length > 0) {
    doc.setFontSize(10); doc.setTextColor(160, 80, 20);
    doc.text('Servizi aggiuntivi:', 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Servizio', 'Dettaglio', 'Importo']],
      body: extras.map(e => [e.name, e.detail || '', fmtPrice(e.subtotal)]),
      foot: [['TOTALE EXTRA', '', fmtPrice(extras_total)]],
      theme: 'striped',
      headStyles: { fillColor: [160, 80, 20], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      footStyles: { fillColor: [160, 80, 20], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      margin: { left: 14, right: 14 },
      columnStyles: { 2: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // === TOTALE ===
  doc.setFillColor(20, 120, 60);
  doc.rect(14, y, 182, 16, 'F');
  doc.setFontSize(13); doc.setTextColor(255);
  doc.text('TOTALE PREVENTIVO', 18, y + 10);
  doc.setFontSize(15);
  doc.text(fmtPrice(grand_total), 192, y + 10, { align: 'right' });
  y += 22;

  if (notes) {
    doc.setFontSize(8); doc.setTextColor(100);
    doc.text('Note:', 14, y); y += 3.5;
    const wrapped = doc.splitTextToSize(notes, 180);
    wrapped.forEach(line => { doc.text(line, 14, y); y += 3.5; });
  }

  // === FOOTER ===
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.4);
  doc.line(14, pageH - 22, 196, pageH - 22);
  doc.setFontSize(8); doc.setTextColor(80);
  doc.text(`Maretrek by Trivor S.r.l. — ${marina?.contact_email || ''}`, 105, pageH - 16, { align: 'center' });
  doc.text(`Tel. ${marina?.contact_phone || ''}  ·  ${marina?.address || ''}`, 105, pageH - 12, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(140);
  doc.text('Documento generato automaticamente. Per accettare il preventivo contattare la Marina.', 105, pageH - 7, { align: 'center' });

  const fileName = `Preventivo_${quote_number || marina?.slug || ''}_${customer?.surname || customer?.name || 'cliente'}_${boat?.length || ''}m.pdf`.replace(/\s+/g, '_').replace(/\//g, '-');
  if (returnAs === 'base64') {
    // Restituisce solo il base64 senza salvare il file
    const base64 = doc.output('datauristring').split(',')[1];
    return { base64, filename: fileName };
  }
  doc.save(fileName);
  return fileName;
}

// =====================================================================
// PDF RICEVUTA / VOUCHER POST-PAGAMENTO
// company: { name, logo_url } - logo della company che emette
// =====================================================================
export async function generateReceiptPDF({ marina, occupation, berth_label, receipt_number, company, returnAs }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  
  const companyLogo = company?.logo_url ? await loadImageAsDataURL(company.logo_url) : null;

  if (companyLogo) try { doc.addImage(companyLogo, 14, 10, 32, 25); } catch (e) {}

  doc.setFontSize(18); doc.setTextColor(20, 120, 60);
  const isTransitReceipt = !!(occupation?.is_transit);
  doc.text(isTransitReceipt ? `RICEVUTA TRANSITO` : `RICEVUTA DI PAGAMENTO`, 105, 18, { align: 'center' });
  if (receipt_number) {
    doc.setFontSize(11); doc.setTextColor(80);
    doc.text(`N° ${receipt_number}`, 105, 25, { align: 'center' });
  }
  doc.setFontSize(10); doc.setTextColor(60);
  doc.text(`${marina?.name || ''}`, 105, 31, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(`Data emissione: ${new Date().toLocaleDateString('it-IT')}`, 105, 36, { align: 'center' });
  if (company?.name) {
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Emesso da: ${company.name}`, 196, 36, { align: 'right' });
  }

  doc.setDrawColor(20, 120, 60); doc.setLineWidth(0.8);
  doc.line(14, 41, 196, 41);

  let y = 50;

  // PAGATO badge stamp
  doc.setFillColor(20, 160, 60);
  doc.roundedRect(140, 45, 50, 18, 3, 3, 'F');
  doc.setFontSize(16); doc.setTextColor(255); doc.setFont(undefined, 'bold');
  doc.text('PAGATO', 165, 57, { align: 'center' });
  doc.setFont(undefined, 'normal');

  // Cliente
  doc.setFontSize(10); doc.setTextColor(20, 80, 160);
  doc.text('Cliente', 14, y);
  y += 5;
  doc.setFontSize(9); doc.setTextColor(0);
  const c = occupation.customer || {};
  doc.text(`${c.name || ''} ${c.surname || ''}`, 14, y); y += 4.5;
  if (c.email) { doc.text(c.email, 14, y); y += 4.5; }
  if (c.phone) { doc.text(c.phone, 14, y); y += 4.5; }
  if (c.tax_code) { doc.text(`CF/P.IVA: ${c.tax_code}`, 14, y); y += 4.5; }
  if (c.address) { doc.text(`${c.address}, ${c.zip || ''} ${c.city || ''}`, 14, y); y += 4.5; }
  y += 4;

  // Dettagli ormeggio
  autoTable(doc, {
    startY: y,
    head: [['Descrizione', 'Dettaglio']],
    body: [
      ['Posto barca', berth_label || '—'],
      ['Imbarcazione', `${occupation.boat?.name || '—'} ${occupation.boat?.registration ? `(${occupation.boat.registration})` : ''}`],
      ['Tipo + dimensioni', `${occupation.boat?.type || ''} · ${occupation.boat?.length || 0}m × ${occupation.boat?.beam || 0}m`],
      ['Periodo', `${new Date(occupation.start_date).toLocaleDateString('it-IT')} - ${new Date(occupation.end_date).toLocaleDateString('it-IT')}`],
      ['Tariffa applicata', occupation.tariff_applied?.label || (occupation.is_complimentary ? 'TARIFFA SERVIZIO (gratuita)' : '—')],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Importo + pagamento
  const totalAmount = occupation.tariff_applied?.grand_total || occupation.total_amount || 0;
  autoTable(doc, {
    startY: y,
    head: [['Voce', 'Importo']],
    body: [
      ['Ormeggio', fmtPrice(occupation.tariff_applied?.mooring_amount || 0)],
      ...(occupation.tariff_applied?.extras || []).map(e => [`+ ${e.name}`, fmtPrice(e.subtotal)]),
      ...(occupation.tariff_applied?.extras_total > 0 ? [['Subtotale extra', fmtPrice(occupation.tariff_applied.extras_total)]] : []),
    ],
    foot: [['TOTALE', fmtPrice(totalAmount)]],
    theme: 'striped',
    headStyles: { fillColor: [20, 120, 60], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: [20, 120, 60], textColor: 255, fontStyle: 'bold', fontSize: 12 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: 'right' } }
  });
  y = doc.lastAutoTable.finalY + 6;

  // Dettagli pagamento
  doc.setFillColor(240, 250, 240);
  doc.rect(14, y, 182, 18, 'F');
  doc.setFontSize(10); doc.setTextColor(20, 100, 40);
  doc.text(`Metodo pagamento: ${occupation.payment_method || 'NON SPECIFICATO'}`, 18, y + 7);
  doc.text(`Data pagamento: ${occupation.payment_date ? new Date(occupation.payment_date).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT')}`, 18, y + 13);
  y += 24;

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.4);
  doc.line(14, pageH - 22, 196, pageH - 22);
  doc.setFontSize(8); doc.setTextColor(80);
  doc.text(`Maretrek by Trivor S.r.l. — ${marina?.contact_email || ''}`, 105, pageH - 16, { align: 'center' });
  doc.text(`Tel. ${marina?.contact_phone || ''}  ·  ${marina?.address || ''}`, 105, pageH - 12, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(140);
  doc.text('Ricevuta di pagamento — Documento generato automaticamente.', 105, pageH - 7, { align: 'center' });

  const fileName = `Ricevuta_${receipt_number || berth_label || 'pagamento'}_${(occupation.customer?.surname || occupation.customer?.name || 'cliente').replace(/\s+/g, '_')}.pdf`;
  if (returnAs === 'base64') {
    const base64 = doc.output('datauristring').split(',')[1];
    return { base64, filename: fileName };
  }
  doc.save(fileName);
  return fileName;
}
