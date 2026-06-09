// PDF generator: Contratto di Noleggio con Conducente
// Genera un PDF formattato con il testo del contratto e i dati passati.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAD_X = 18;

/**
 * Genera il PDF del contratto di noleggio.
 * @param {object} data
 *   contract_number, contract_date, company: { name, vat_number, activity_code, address },
 *   itinerary, miglia, durata, totale_turisti, prezzo,
 *   unita_diporto_numero, adulti, bambini, passengers: [{ name, phone }], notes
 * @param {boolean} returnDoc - se true ritorna jsPDF, altrimenti scarica
 */
export function generateRentalContractPdf(data = {}, returnDoc = false) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 16;

  const cName    = data.company?.name || 'ICHNOS DI BACHISIO CONGIO';
  const cVat     = data.company?.vat_number || '01568460917';
  const cActCode = data.company?.activity_code || 'E1120 - TRASPORTI COSTIERI (NOLEGGIO UNITÀ DA DIPORTO)';
  const cAddress = data.company?.address || 'VIA A. GRAMSCI, 4 - 08020 ONIFAI';

  // Titolo
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(15, 23, 42);
  doc.text(
    `CONTRATTO NOLEGGIO UNITÀ DI DIPORTO N° ${data.contract_number || '_______'} DEL ${data.contract_date || '_________'}`,
    W / 2, y, { align: 'center', maxWidth: W - 2 * PAD_X }
  );
  y += 10;

  // Intestazione Ditta (Company)
  doc.setFontSize(10).setFont('helvetica', 'bold');
  const intestLines = doc.splitTextToSize(
    `LA DITTA ${cName.toUpperCase()} P.IVA ${cVat} CODICE ATTIVITÀ ${cActCode} CON SEDE LEGALE IN ${cAddress}`.toUpperCase(),
    W - 2 * PAD_X
  );
  doc.text(intestLines, PAD_X, y);
  y += intestLines.length * 5 + 5;

  // Helper per testo paragrafo
  const paragraph = (text, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(opts.size || 10).setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, W - 2 * PAD_X);
    if (y + lines.length * 5 > 270) { doc.addPage(); y = 16; }
    doc.text(lines, PAD_X, y);
    y += lines.length * 5 + (opts.spacing != null ? opts.spacing : 3);
  };

  // Clausole
  paragraph(`1- Come da voi richiesto si impegna a concedere a noleggio il seguente natante con skipper e tutte le dotazioni di sicurezza stabilite dalla normativa;`);
  paragraph(`2- Itinerario concordato: ${data.itinerary || '_____________________'} - miglia: ${data.miglia || '____________'} - durata: ${data.durata || '____________'} - totale turisti imbarcati: ${data.totale_turisti || '____________'}`);
  paragraph(`3- Personale previsto: Conduttore con patente entro 12 miglia + licenza R.T.F. iscrizione gente di mare;`);
  paragraph(`4- Condizioni contrattuali:`, { bold: true, spacing: 1 });
  paragraph(`a) L'unità è noleggiata con un nostro conduttore che si pone a disposizione dell'ordinante per la tipologia del servizio richiesto.`);
  paragraph(`b) L'unità è consegnata in perfetta efficienza e completa delle dotazioni previste per la navigazione entro le tre miglia dalla costa e munita del relativo contratto di assicurazione secondo quanto stabilito dalla legge n° 990 del 24/12/1969 a favore del noleggiatore e dei passeggeri imbarcati per infortuni e danni subiti in dipendenza del contratto;`);
  paragraph(`5- I passeggeri imbarcati sono muniti del documento di identità a norma del vigente codice della navigazione;`);
  paragraph(`6- Il comandante si riserva il diritto di cambiare/terminare la navigazione in caso di avverse condizioni meteo marine. Il termine anticipato dalla navigazione causa meteo e/o forza maggiore non costituisce motivo di risarcimento del prezzo pattuito.`);

  y += 2;

  // Dati riepilogativi
  doc.setFillColor(248, 250, 252);
  if (y + 22 > 270) { doc.addPage(); y = 16; }
  doc.rect(PAD_X, y, W - 2 * PAD_X, 22, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(PAD_X, y, W - 2 * PAD_X, 22, 'S');

  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text(`Il prezzo pattuito e già pagato è di:`, PAD_X + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`€ ${data.prezzo || '_________________'}`, PAD_X + 75, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Unità da diporto n°:`, PAD_X + 3, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.unita_diporto_numero || '_________________'}`, PAD_X + 45, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text(`Adulti:`, PAD_X + 3, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.adulti != null ? data.adulti : '_________'}`, PAD_X + 22, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`Bambini:`, PAD_X + 50, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.bambini != null ? data.bambini : '_________'}`, PAD_X + 70, y + 20);
  y += 28;

  // I NOLEGGIANTI
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
  if (y > 260) { doc.addPage(); y = 16; }
  doc.text('I NOLEGGIANTI', PAD_X, y);
  y += 3;

  const passengers = Array.isArray(data.passengers) ? data.passengers : [];
  if (passengers.length === 0) {
    doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(100);
    doc.text('(nessun passeggero indicato)', PAD_X, y + 5);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [['#', 'Cognome e Nome', 'Telefono', 'Note']],
      body: passengers.map((p, i) => [
        String(i + 1),
        p.name || '-',
        p.phone || '-',
        p.notes || '',
      ]),
      styles: { fontSize: 9, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 40 },
        3: { cellWidth: 'auto' },
      },
      margin: { left: PAD_X, right: PAD_X },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Note libere
  if (data.notes) {
    if (y > 260) { doc.addPage(); y = 16; }
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Note:', PAD_X, y);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(String(data.notes), W - 2 * PAD_X - 14);
    doc.text(noteLines, PAD_X + 14, y);
    y += noteLines.length * 5 + 6;
  }

  // Firme
  if (y > 250) { doc.addPage(); y = 16; }
  y += 10;
  doc.setDrawColor(50, 50, 50).setLineWidth(0.3);
  doc.line(PAD_X, y, PAD_X + 70, y);
  doc.line(W - PAD_X - 70, y, W - PAD_X, y);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(50, 50, 50);
  doc.text("Firma dell'Ordinante", PAD_X, y + 5);
  doc.text("Firma del Noleggiatore", W - PAD_X - 70, y + 5);

  // Footer
  doc.setFontSize(7).setTextColor(140, 140, 140);
  doc.text(
    `Documento generato il ${new Date().toLocaleString('it-IT')} · ${cName}`,
    W / 2,
    doc.internal.pageSize.getHeight() - 6,
    { align: 'center' }
  );

  const filename = `Contratto_Noleggio_${(data.contract_number || 'X').replace(/[^a-zA-Z0-9-]/g, '_')}_${(data.contract_date || '').replace(/\//g, '-') || new Date().toISOString().slice(0, 10)}.pdf`;
  if (returnDoc) return { doc, filename };
  doc.save(filename);
  return { doc, filename };
}
