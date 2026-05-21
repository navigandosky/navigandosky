// PDF Voucher generator for Locazioni Brevi - client-side using jspdf
import { jsPDF } from 'jspdf';
import { getPaymentDestination } from './paymentDestination';

const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '-');

const CATEGORY_LABEL = {
  BIKE: 'Bici',
  CAR: 'Auto',
  APARTMENT: 'Appartamento',
  VILLA: 'Villa',
  BOAT: 'Barca',
};

// Carica un'immagine come dataURL (per inserirla nel PDF) con timeout di 3s
const loadImageAsDataUrl = (url) => new Promise((resolve) => {
  let done = false;
  const finish = (val) => { if (!done) { done = true; resolve(val); } };
  // Timeout di 3s per evitare blocchi in ambienti headless
  setTimeout(() => finish(null), 3000);
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
        finish({ dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
      } catch { finish(null); }
    };
    img.onerror = () => finish(null);
    img.src = url;
  } catch { finish(null); }
});

export async function generateRentalVoucherPdf(booking, unit, company, opts = {}) {
  const isConfirmed = booking?.status === 'CONFIRMED' || booking?.status === 'COMPLETED';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const M = 15;

  // === HEADER ===
  const headerColor = isConfirmed ? [13, 148, 136] : [245, 158, 11]; // teal o ambra
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, W, 45, 'F');

  // Logo company a sinistra
  const companyLogoUrl = company?.logo_url || (company?.slug === 'marlin-sub' ? '/logos/marlin-sub.jpg' : null);
  if (companyLogoUrl) {
    const left = await loadImageAsDataUrl(companyLogoUrl);
    if (left) {
      const lh = 26;
      const lw = lh * (left.w / left.h);
      try { doc.addImage(left.dataUrl, 'PNG', 8, 10, lw, lh); } catch { /* ignore */ }
    }
  }
  // Logo Maretrek a destra
  const right = await loadImageAsDataUrl('/logos/maretrek.png');
  if (right) {
    const rh = 26;
    const rw = rh * (right.w / right.h);
    try { doc.addImage(right.dataUrl, 'PNG', W - rw - 8, 10, rw, rh); } catch { /* ignore */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22).setFont('helvetica', 'bold');
  doc.text(isConfirmed ? 'VOUCHER LOCAZIONE' : 'VOUCHER PROVVISORIO', W / 2, 22, { align: 'center' });
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(
    isConfirmed
      ? `Prenotazione confermata - ${CATEGORY_LABEL[booking.category] || booking.category}`
      : 'Richiesta in attesa di conferma',
    W / 2, 32, { align: 'center' }
  );

  let y = 58;

  // Codice prenotazione
  doc.setDrawColor(...headerColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(M + 20, y, W - 2 * M - 40, 22, 3, 3);
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('CODICE PRENOTAZIONE', W / 2, y + 7, { align: 'center' });
  doc.setFontSize(20).setFont('courier', 'bold');
  doc.setTextColor(...headerColor);
  doc.text(booking.booking_number || '-', W / 2, y + 17, { align: 'center' });
  y += 30;

  // === CLIENTE ===
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(13).setFont('helvetica', 'bold');
  doc.text('Cliente', M, y); y += 7;
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(`Nome: ${booking.customer?.name || '-'}`, M, y); y += 5;
  if (booking.customer?.email) { doc.text(`Email: ${booking.customer.email}`, M, y); y += 5; }
  if (booking.customer?.phone) { doc.text(`Telefono: ${booking.customer.phone}`, M, y); y += 5; }
  if (booking.customer?.document_number) { doc.text(`Documento: ${booking.customer.document_number}`, M, y); y += 5; }
  y += 3;

  // === DETTAGLI UNITÀ E SOGGIORNO ===
  doc.setFontSize(13).setFont('helvetica', 'bold');
  doc.text('Dettagli Soggiorno', M, y); y += 7;
  doc.setFontSize(10).setFont('helvetica', 'normal');

  const labelCol = M;
  const valueCol = M + 45;
  const duLabel = booking.duration_unit === 'NIGHTS' ? 'notti' : 'giorni';

  const rows = [
    ['Categoria:', CATEGORY_LABEL[booking.category] || booking.category || '-'],
    ['Unità:', booking.unit_name || unit?.name || '-'],
    ['Check-in:', `${fmtDate(booking.start_date)} - ore ${booking.check_in_time || '—'}`],
    ['Check-out:', `${fmtDate(booking.end_date)} - ore ${booking.check_out_time || '—'}`],
    ['Durata:', `${booking.duration_value || 0} ${duLabel}`],
  ];
  if (booking.quantity && booking.quantity > 1) rows.push(['Quantità:', String(booking.quantity)]);
  if (booking.guests_count) rows.push(['Ospiti:', String(booking.guests_count)]);
  if (unit?.location) rows.push(['Località:', unit.location]);
  if (unit?.address) rows.push(['Indirizzo:', unit.address]);

  // Maps URL
  let mapsUrl = null;
  if (unit?.address || unit?.location) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.address || unit.location)}`;
  }

  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, labelCol, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(String(v), W - valueCol - M);
    doc.text(split, valueCol, y);
    y += 5 * Math.max(1, split.length);
  });

  // Google Maps link
  if (mapsUrl) {
    doc.setFont('helvetica', 'bold').setTextColor(75, 85, 99);
    doc.text('Maps:', labelCol, y);
    doc.setFont('helvetica', 'normal').setTextColor(37, 99, 235);
    const linkLabel = 'Apri in Google Maps →';
    doc.textWithLink(linkLabel, valueCol, y, { url: mapsUrl });
    const lw = doc.getTextWidth(linkLabel);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.2);
    doc.line(valueCol, y + 0.5, valueCol + lw, y + 0.5);
    doc.setTextColor(31, 41, 55);
    y += 5;
  }

  // Amenities (se appartamento/villa)
  if (Array.isArray(unit?.amenities) && unit.amenities.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold').text('Servizi:', labelCol, y);
    doc.setFont('helvetica', 'normal');
    const amenStr = unit.amenities.join(' · ');
    const splitA = doc.splitTextToSize(amenStr, W - valueCol - M);
    doc.text(splitA, valueCol, y);
    y += 5 * Math.max(1, splitA.length);
  }

  y += 4;

  // === TARIFFE STAGIONALI APPLICATE ===
  if (Array.isArray(booking.pricing_breakdown) && booking.pricing_breakdown.length > 0) {
    doc.setFontSize(13).setFont('helvetica', 'bold');
    doc.text('Dettaglio Tariffe', M, y); y += 7;
    doc.setFontSize(9).setFont('helvetica', 'normal');

    // Tabella semplice
    doc.setFillColor(243, 244, 246);
    doc.rect(M, y - 4, W - 2 * M, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Stagione', M + 2, y);
    doc.text(duLabel, M + 80, y);
    doc.text('Prezzo / ' + (booking.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'), M + 110, y);
    doc.text('Subtotale', W - M - 2, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    booking.pricing_breakdown.forEach((p) => {
      doc.text(p.name || '-', M + 2, y);
      doc.text(String(p.days || 0), M + 80, y);
      doc.text(fmtEur(p.price_per_unit), M + 110, y);
      doc.text(fmtEur(p.subtotal), W - M - 2, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  // === TOTALE / ACCONTO / SALDO ===
  doc.setFillColor(243, 244, 246);
  const hasAgency = !!(booking.agency_name);
  const pmForBox = booking.payment_method || booking.paymentMethod;
  const willShowDestBox = !!(pmForBox && pmForBox !== 'NONE');
  const totalBoxH = hasAgency ? (40 + (willShowDestBox ? 6 : 0)) : (32 + (willShowDestBox ? 6 : 0));
  doc.roundedRect(M, y, W - 2 * M, totalBoxH, 2, 2, 'F');

  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Importo totale', M + 5, y + 7);
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.setTextColor(...headerColor);
  doc.text(fmtEur(booking.total_amount), W - M - 5, y + 11, { align: 'right' });

  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`Acconto richiesto (${booking.deposit_pct || 0}%):`, M + 5, y + 18);
  doc.setFont('helvetica', 'bold').setTextColor(37, 99, 235);
  doc.text(fmtEur(booking.deposit_amount), W - M - 5, y + 18, { align: 'right' });

  doc.setFont('helvetica', 'normal').setTextColor(75, 85, 99);
  doc.text('Saldo da pagare:', M + 5, y + 24);
  doc.setFont('helvetica', 'bold').setTextColor(31, 41, 55);
  doc.text(fmtEur(booking.balance_amount), W - M - 5, y + 24, { align: 'right' });

  doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(75, 85, 99);
  const payStatusLabel = {
    PENDING: 'Da pagare',
    PARTIAL: 'Acconto versato',
    PAID: 'Pagato',
    REFUNDED: 'Rimborsato',
  }[booking.payment_status] || booking.payment_status;
  // Mappa metodi di pagamento → label leggibile
  const PAYMENT_METHOD_LABELS = {
    SUMUP: 'SumUp',
    STRIPE: 'Stripe',
    POS: 'POS / Carta',
    CASH: 'Contanti',
    BANK_TRANSFER: 'Bonifico Bancario',
    BONIFICO: 'Bonifico Bancario',
    PAYPAL: 'PayPal',
    SATISPAY: 'Satispay',
    INVOICE: 'Fattura Differita',
    OTHER: 'Altro',
  };
  const pmRaw = booking.payment_method || booking.paymentMethod;
  const pmLabel = pmRaw ? (PAYMENT_METHOD_LABELS[pmRaw] || pmRaw) : null;
  const statoLine = pmLabel
    ? `Stato pagamento: ${payStatusLabel}  ·  Metodo: ${pmLabel}`
    : `Stato pagamento: ${payStatusLabel}`;
  doc.text(statoLine, M + 5, y + 30);

  // Destinazione incasso (SumUp account / IBAN / Cassa)
  if (pmRaw && pmRaw !== 'NONE') {
    const dest = getPaymentDestination(pmRaw, company);
    if (dest && dest.detail && dest.detail !== 'Non specificato') {
      doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(107, 114, 128);
      const txt = `Destinazione: ${dest.detail}`;
      doc.text(txt.length > 95 ? txt.slice(0, 95) + '…' : txt, M + 5, y + 35);
      doc.setFont('helvetica', 'normal').setTextColor(75, 85, 99).setFontSize(9);
    }
  }

  if (hasAgency) {
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(67, 56, 202);
    doc.text(`Venduto da: ${booking.agency_name}`, M + 5, y + (willShowDestBox ? 41 : 36));
  }
  y += totalBoxH + 6;

  // === NOTE ===
  if (booking.notes || booking.customer?.notes) {
    const notes = [booking.notes, booking.customer?.notes].filter(Boolean).join(' | ');
    doc.setDrawColor(99, 102, 241);
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'FD');
    doc.setTextColor(67, 56, 202);
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('Note:', M + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    const sp = doc.splitTextToSize(notes, W - 2 * M - 8);
    doc.text(sp.slice(0, 2), M + 4, y + 12);
    y += 24;
  }

  // === FOOTER ===
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8).setFont('helvetica', 'italic');
  const footerY = H - 20;
  doc.text(
    isConfirmed
      ? `Presenta questo voucher al check-in (${booking.check_in_time || ''}). Documento d'identità obbligatorio.`
      : 'Voucher provvisorio - Riceverai conferma dopo verifica del pagamento.',
    W / 2, footerY, { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`${company?.name || 'MARETREK'} · Generato il ${new Date().toLocaleDateString('it-IT')}`, W / 2, footerY + 5, { align: 'center' });

  return doc;
}

export async function downloadRentalVoucherPdf(booking, unit, company, opts = {}) {
  const doc = await generateRentalVoucherPdf(booking, unit, company, opts);
  const filename = `Voucher_Locazione_${booking.booking_number?.replace(/\//g, '-') || 'rental'}.pdf`;
  doc.save(filename);
}
