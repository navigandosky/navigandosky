// PDF Voucher generator - client-side using jspdf
import { jsPDF } from 'jspdf';
import { getPaymentDestination } from './paymentDestination';

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

  // === Auto-fetch RESOURCE & SKIPPER se non passati esplicitamente ===
  // Permette di mostrare nel voucher il mezzo assegnato e i contatti dello skipper
  // senza richiedere modifiche a tutti i call site.
  if (!opts.resource || !opts.skipper) {
    try {
      // 1) Trova il slot per estrarre resource_ids[]
      let slot = null;
      if (booking?.slot_id) {
        try { slot = await fetch(`/api/slots/${booking.slot_id}`).then(r => r.ok ? r.json() : null); } catch (_e1) { /* ignore */ }
      }
      const resourceIds = Array.isArray(slot?.resource_ids) ? slot.resource_ids : (booking?.resource_id ? [booking.resource_id] : []);
      // 2) Carica le risorse dello slot (solitamente 1)
      if (!opts.resource && resourceIds.length > 0) {
        try {
          const rRes = await fetch(`/api/resources/${resourceIds[0]}`);
          if (rRes.ok) opts.resource = await rRes.json();
        } catch (_e2) { /* ignore */ }
      }
      // 3) Skipper: prima usa assigned_skipper_id sulla booking, poi cerca utente SKIPPER assegnato alla risorsa
      const skipperIdToFetch = booking?.assigned_skipper_id || slot?.assigned_skipper_id || null;
      if (!opts.skipper && skipperIdToFetch) {
        try {
          const skRes = await fetch(`/api/users/${skipperIdToFetch}`);
          if (skRes.ok) opts.skipper = await skRes.json();
        } catch (_e3) { /* ignore */ }
      }
      // 4) Fallback: cerca skipper assegnato alla risorsa
      if (!opts.skipper && opts.resource?.id && company?.id) {
        try {
          const usRes = await fetch(`/api/users?company_id=${company.id}&role=SKIPPER`);
          if (usRes.ok) {
            const users = await usRes.json();
            const list = Array.isArray(users) ? users : [];
            const found = list.find(u => Array.isArray(u.assigned_resource_ids) && u.assigned_resource_ids.includes(opts.resource.id));
            if (found) opts.skipper = found;
          }
        } catch (_e4) { /* ignore */ }
      }
    } catch (_e) {
      // Non bloccare la generazione del voucher se il fetch fallisce
    }
  }

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

  // Maps URL: priorità a quello configurato sull'esperienza, fallback a ricerca sul meeting_point
  let mapsUrl = experience?.meeting_point_map_url || null;
  if (!mapsUrl && experience?.meeting_point) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(experience.meeting_point)}`;
  }

  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, labelCol, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(String(v), W - valueCol - M);
    doc.text(split, valueCol, y);
    y += 5 * Math.max(1, split.length);

    // Subito dopo "Ritrovo:" inserisci il link Maps cliccabile
    if (k === 'Ritrovo:' && mapsUrl) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(75, 85, 99);
      doc.text('Maps:', labelCol, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(37, 99, 235); // blu link
      const linkLabel = 'Apri in Google Maps →';
      doc.textWithLink(linkLabel, valueCol, y, { url: mapsUrl });
      // sottolineatura
      const linkWidth = doc.getTextWidth(linkLabel);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.2);
      doc.line(valueCol, y + 0.5, valueCol + linkWidth, y + 0.5);
      doc.setTextColor(31, 41, 55); // reset
      y += 5;
    }
  });

  // Durata in fondo (dopo Maps)
  if (experience?.duration_minutes) {
    doc.setFont('helvetica', 'bold'); doc.text('Durata:', labelCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${Math.floor(experience.duration_minutes / 60)}h ${experience.duration_minutes % 60}min`, valueCol, y);
    y += 5;
  }

  y += 4;

  // Totale + stato
  doc.setFillColor(243, 244, 246);
  const hasAgency = !!(booking.agency_name || opts?.agencyName);
  // Calcola altezza box in base ai contatti agenzia disponibili + riga destinazione + riga data acquisto
  const agencyEmail = booking.agency_email || opts?.agencyEmail || null;
  const agencyPhone = booking.agency_phone || opts?.agencyPhone || null;
  const agencyContactsCount = (agencyEmail ? 1 : 0) + (agencyPhone ? 1 : 0);
  const pmRawForBox = booking.payment_method || booking.paymentMethod;
  const willShowDest = !!(pmRawForBox && pmRawForBox !== 'NONE');
  const destExtraH = willShowDest ? 5 : 0;
  // +5 per la nuova riga "Data Acquisto"
  const totalBoxH = hasAgency ? (22 + 6 + agencyContactsCount * 5 + destExtraH + 5) : (22 + destExtraH + 5);
  doc.roundedRect(M, y, W - 2 * M, totalBoxH, 2, 2, 'F');
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Importo totale', M + 5, y + 8);
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.setTextColor(...headerColor);
  doc.text(fmtEur(booking.total_amount), W - M - 5, y + 12, { align: 'right' });
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  // Data Acquisto (created_at o purchased_at o booking_date)
  const purchasedAtRaw = booking.created_at || booking.purchased_at || booking.booking_date || null;
  let dataAcquistoLine = null;
  if (purchasedAtRaw) {
    try {
      const d = new Date(purchasedAtRaw);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        dataAcquistoLine = `Data Acquisto: ${dd}/${mm}/${yyyy}  ·  Ora: ${hh}:${mi}`;
      }
    } catch (_e) {}
  }
  if (dataAcquistoLine) {
    doc.text(dataAcquistoLine, M + 5, y + 17);
  }
  // Mappa metodi di pagamento → label leggibile
  const PAYMENT_METHOD_LABELS = {
    SUMUP: 'SumUp',
    STRIPE: 'Stripe',
    ONLINE: 'SumUp / Online',
    CARD: 'SumUp / Online',
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
  const statoLabel = isFinal ? 'PAGATO' : 'IN ATTESA DI VERIFICA';
  const statoLine = pmLabel
    ? `Stato: ${statoLabel}  ·  Metodo: ${pmLabel}`
    : `Stato: ${statoLabel}`;
  // Spostato di +5 per fare spazio a Data Acquisto
  doc.text(statoLine, M + 5, y + (dataAcquistoLine ? 22 : 17));
  // Destinazione incasso (solo se PAGATO o metodo definito)
  let destShown = false;
  if (pmRaw && pmRaw !== 'NONE') {
    try {
      const dest = getPaymentDestination(pmRaw, company);
      if (dest && dest.detail && dest.detail !== 'Non specificato') {
        doc.setFontSize(8).setFont('helvetica', 'italic');
        doc.setTextColor(107, 114, 128);
        const txt = `Destinazione: ${dest.detail}`;
        doc.text(txt.length > 95 ? txt.slice(0, 95) + '…' : txt, M + 5, y + (dataAcquistoLine ? 27 : 22));
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        destShown = true;
      }
    } catch (_e) {
      // Fail-safe: continua senza destinazione se il helper fallisce
      destShown = false;
    }
  }
  // Venduto da agenzia + contatti
  if (hasAgency) {
    const agencyName = booking.agency_name || opts?.agencyName;
    // Shift +5 per data acquisto se presente
    const baseLine = dataAcquistoLine ? 5 : 0;
    let lineY = y + (destShown ? 29 : 24) + baseLine;
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

  // === RISORSA & SKIPPER (se forniti via opts) ===========================
  const resObj = opts.resource || null;
  const skObj = opts.skipper || null;
  if (resObj || skObj) {
    // Calcola altezza box dinamicamente
    const lines = [];
    if (resObj) {
      const resTitle = resObj.name || resObj.label || 'Risorsa';
      const resInfo = [];
      if (resObj.type || resObj.kind) resInfo.push(resObj.type || resObj.kind);
      if (resObj.capacity) resInfo.push(`${resObj.capacity} posti`);
      if (resObj.model) resInfo.push(resObj.model);
      if (resObj.registration || resObj.matricola) resInfo.push(`Matr. ${resObj.registration || resObj.matricola}`);
      lines.push({ label: '⚓ Mezzo:', value: resTitle + (resInfo.length ? ' (' + resInfo.join(' · ') + ')' : '') });
    }
    if (skObj) {
      const skName = skObj.full_name || skObj.username || skObj.name || '';
      if (skName) lines.push({ label: '👤 Skipper:', value: skName });
      if (skObj.phone) lines.push({ label: '📞 Telefono:', value: skObj.phone });
      if (skObj.email) lines.push({ label: '✉ Email:', value: skObj.email });
    }
    if (lines.length > 0) {
      const boxH = 12 + lines.length * 5;
      doc.setDrawColor(8, 145, 178);          // ciano scuro
      doc.setFillColor(236, 254, 255);        // cyan-50
      doc.roundedRect(M, y, W - 2 * M, boxH, 2, 2, 'FD');
      doc.setTextColor(14, 116, 144);         // cyan-700
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('RISORSA ASSEGNATA & SKIPPER', M + 4, y + 7);
      doc.setFontSize(9).setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      let lineY = y + 13;
      for (const ln of lines) {
        doc.setFont('helvetica', 'bold'); doc.text(ln.label, M + 4, lineY);
        doc.setFont('helvetica', 'normal');
        const v = doc.splitTextToSize(String(ln.value || ''), W - 2 * M - 36);
        doc.text(v[0] || '', M + 30, lineY);
        lineY += 5;
      }
      y += boxH + 6;
    }
  }

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
  if (opts.returnAs === 'base64') {
    const base64 = doc.output('datauristring').split(',')[1];
    return { base64, filename, contentType: 'application/pdf' };
  }
  doc.save(filename);
}
