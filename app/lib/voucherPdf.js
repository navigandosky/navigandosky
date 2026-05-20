// PDF Voucher generator - client-side using jspdf
import { jsPDF } from 'jspdf';

const fmtEur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
// Solo data (senza ora) - l'orario corretto è già indicato nel nome dell'esperienza
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '-';

// Carica un'immagine come dataURL (per inserirla nel PDF con jspdf)
const loadImageAsDataUrl = (url) => new Promise((resolve) => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  } catch { resolve(null); }
});

export async function generateVoucherPdf(booking, experience, company, opts = {}) {
  const isFinal = opts.type === 'FINAL' || booking?.status === 'CONFIRMED';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const M = 15; // margin
  let y = 0;

  // Header banner colorato
  const headerColor = isFinal ? [16, 185, 129] : [245, 158, 11]; // verde o ambra
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, W, 45, 'F');

  // === LOGHI nell'header: company logo a sx, MARETREK a dx, scritta VOUCHER al centro ===
  // Logo company (Marlin Sub o altre) a sinistra
  const companyLogoUrl = company?.logo_url || (company?.slug === 'marlin-sub' ? '/logos/marlin-sub.jpg' : null);
  if (companyLogoUrl) {
    const left = await loadImageAsDataUrl(companyLogoUrl);
    if (left) {
      const lh = 26;
      const lw = lh * (left.w / left.h);
      try { doc.addImage(left.dataUrl, 'PNG', 8, 10, lw, lh); } catch { /* ignore */ }
    }
  }
  // Logo Maretrek a destra (sempre)
  const right = await loadImageAsDataUrl('/logos/maretrek.png');
  if (right) {
    const rh = 26;
    const rw = rh * (right.w / right.h);
    try { doc.addImage(right.dataUrl, 'PNG', W - rw - 8, 10, rw, rh); } catch { /* ignore */ }
  }

  // Scritta VOUCHER al centro
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22).setFont('helvetica', 'bold');
  doc.text(isFinal ? 'VOUCHER CONFERMATO' : 'VOUCHER PROVVISORIO', W / 2, 22, { align: 'center' });
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(isFinal ? 'Pagamento ricevuto - Prenotazione confermata' : 'In attesa di verifica del pagamento', W / 2, 32, { align: 'center' });

  // Reset colors
  doc.setTextColor(31, 41, 55);
  y = 58;

  // Codice prenotazione - box grande centrato
  doc.setDrawColor(...headerColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(M + 20, y, W - 2 * M - 40, 22, 3, 3);
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('CODICE PRENOTAZIONE', W / 2, y + 7, { align: 'center' });
  doc.setFontSize(20).setFont('courier', 'bold');
  doc.setTextColor(...headerColor);
  doc.text(booking.booking_ref || '-', W / 2, y + 17, { align: 'center' });
  y += 30;

  // Cliente
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(13).setFont('helvetica', 'bold');
  doc.text('Cliente', M, y); y += 7;
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(`Nome: ${booking.customer_name || '-'}`, M, y); y += 5;
  if (booking.customer_email) { doc.text(`Email: ${booking.customer_email}`, M, y); y += 5; }
  if (booking.customer_phone) { doc.text(`Telefono: ${booking.customer_phone}`, M, y); y += 5; }
  y += 4;

  // Dettagli esperienza
  doc.setFontSize(13).setFont('helvetica', 'bold');
  doc.text('Dettagli Esperienza', M, y); y += 7;
  doc.setFontSize(10).setFont('helvetica', 'normal');
  const labelCol = M;
  const valueCol = M + 40;
  const rows = [
    ['Esperienza:', experience?.name || booking.experience_name || '-'],
    ['Data:', fmtDateTime(booking.slot_datetime)],
    ['Partecipanti:', String(booking.seats || 1)],
  ];
  if (experience?.meeting_point) rows.push(['Ritrovo:', experience.meeting_point]);
  if (experience?.meeting_point_map_url) rows.push(['Maps:', experience.meeting_point_map_url]);
  if (experience?.duration_minutes) rows.push(['Durata:', `${Math.floor(experience.duration_minutes / 60)}h ${experience.duration_minutes % 60}min`]);

  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, labelCol, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(String(v), W - valueCol - M);
    doc.text(split, valueCol, y);
    y += 5 * Math.max(1, split.length);
  });
  y += 4;

  // Totale + stato
  doc.setFillColor(243, 244, 246);
  const hasAgency = !!(booking.agency_name || opts?.agencyName);
  // Calcola altezza box in base ai contatti agenzia disponibili
  const agencyEmail = booking.agency_email || opts?.agencyEmail || null;
  const agencyPhone = booking.agency_phone || opts?.agencyPhone || null;
  const agencyContactsCount = (agencyEmail ? 1 : 0) + (agencyPhone ? 1 : 0);
  const totalBoxH = hasAgency ? (22 + 6 + agencyContactsCount * 5) : 22;
  doc.roundedRect(M, y, W - 2 * M, totalBoxH, 2, 2, 'F');
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Importo totale', M + 5, y + 8);
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.setTextColor(...headerColor);
  doc.text(fmtEur(booking.total_amount), W - M - 5, y + 12, { align: 'right' });
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Stato: ' + (isFinal ? 'PAGATO' : 'IN ATTESA DI VERIFICA'), M + 5, y + 17);
  // Venduto da agenzia + contatti
  if (hasAgency) {
    const agencyName = booking.agency_name || opts?.agencyName;
    let lineY = y + 24;
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text(`Venduto da: ${agencyName}`, M + 5, lineY);
    lineY += 5;
    if (agencyEmail) {
      doc.setFontSize(8).setFont('helvetica', 'normal');
      doc.setTextColor(67, 56, 202);
      doc.text(`Email: ${agencyEmail}`, M + 5, lineY);
      lineY += 5;
    }
    if (agencyPhone) {
      doc.setFontSize(8).setFont('helvetica', 'normal');
      doc.setTextColor(67, 56, 202);
      doc.text(`Tel: ${agencyPhone}`, M + 5, lineY);
      lineY += 5;
    }
  }
  y += totalBoxH + 8;

  // Bonifico (se provvisorio + bonifico)
  if (!isFinal && booking.payment_method === 'BANK_TRANSFER' && opts.bankTransfer) {
    const bt = opts.bankTransfer;
    doc.setDrawColor(16, 185, 129);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(M, y, W - 2 * M, 40, 3, 3, 'FD');
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text('COORDINATE BONIFICO', M + 5, y + 8);
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(`IBAN: ${bt.iban || '-'}`, M + 5, y + 16);
    doc.text(`Intestatario: ${bt.account_holder || '-'}`, M + 5, y + 22);
    if (bt.bank_name) doc.text(`Banca: ${bt.bank_name}`, M + 5, y + 28);
    if (bt.bic_swift) doc.text(`BIC/SWIFT: ${bt.bic_swift}`, M + 5, y + 34);
    y += 46;
  }

  // Note speciali
  if (booking.special_requests) {
    doc.setDrawColor(99, 102, 241);
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'FD');
    doc.setTextColor(67, 56, 202);
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('Note / Richieste:', M + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    const sp = doc.splitTextToSize(booking.special_requests, W - 2 * M - 8);
    doc.text(sp.slice(0, 2), M + 4, y + 12);
    y += 24;
  }

  // Accettazione Condizioni di Vendita (sempre, se presente)
  if (booking.terms_accepted && booking.terms_accepted_at) {
    doc.setDrawColor(5, 150, 105);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'FD');
    doc.setTextColor(6, 78, 59);
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('CONDIZIONI DI VENDITA ACCETTATE', M + 4, y + 6);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    const dt = new Date(booking.terms_accepted_at);
    const dtStr = isNaN(dt) ? '-' : dt.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Il cliente ha dichiarato di aver preso visione delle condizioni e di accettarle incondizionatamente il ${dtStr}.`, M + 4, y + 11);
    y += 20;
  }

  // Footer
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8).setFont('helvetica', 'italic');
  const footerY = H - 20;
  doc.text(
    isFinal
      ? 'Presenta questo voucher al check-in. Arriva 15 minuti prima dell\'orario indicato.'
      : 'Voucher provvisorio - sarà sostituito da quello definitivo dopo la verifica del pagamento.',
    W / 2, footerY, { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`${company?.name || 'MARETREK'} - Generato il ${new Date().toLocaleDateString('it-IT')}`, W / 2, footerY + 5, { align: 'center' });

  return doc;
}

export async function downloadVoucherPdf(booking, experience, company, opts = {}) {
  const doc = await generateVoucherPdf(booking, experience, company, opts);
  const filename = `Voucher_${booking.booking_ref || 'booking'}_${opts.type === 'FINAL' ? 'finale' : 'provvisorio'}.pdf`;
  doc.save(filename);
}
