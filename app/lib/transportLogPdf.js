// PDF "Registro Trasportati" - giornaliero per risorsa/skipper
// Genera un PDF dettagliato con: dati barca, skipper, data, tutte le tratte/escursioni
// e per ciascuna prenotazione la lista passeggeri con telefono.

import { jsPDF } from 'jspdf';

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return '-'; }
};
const fmtTime = (iso) => {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
};

const loadImageAsDataUrl = (url) => new Promise((resolve) => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  } catch { resolve(null); }
});

/**
 * Genera PDF "Registro Trasportati" per una risorsa in un giorno.
 * @param {Object} opts
 * @param {Object} opts.resource - { name, type, license_plate, capacity, imei }
 * @param {Object} opts.skipper - { full_name, phone }
 * @param {String} opts.date - YYYY-MM-DD
 * @param {Array}  opts.bookings - lista bookings { booking_ref, experience_name, customer_name, customer_email, customer_phone, slot_datetime, seats, passengers_checkin }
 * @param {Object} opts.company - { name, slug, logo_url }
 * @returns {Promise<{ blob: Blob, dataUri: string }>}
 */
export async function generateTransportLogPdf({ resource = {}, skipper = {}, date, bookings = [], company = {} }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const autoTable = (await import('jspdf-autotable')).default;
  const W = 210;
  const M = 12;
  let y = 14;

  // === HEADER con logo ===
  const companyLogoUrl = company?.logo_url || (company?.slug === 'marlin-sub' ? '/logos/marlin-sub.jpg' : null);
  if (companyLogoUrl) {
    const logo = await loadImageAsDataUrl(companyLogoUrl);
    if (logo) {
      const ratio = logo.w / logo.h;
      const h = 16;
      const w = h * ratio;
      try { doc.addImage(logo.dataUrl, 'PNG', M, y - 4, w, h); } catch {}
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 50, 90);
  doc.text('REGISTRO TRASPORTATI', W / 2, y + 4, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Lista passeggeri imbarcati - giornaliera', W / 2, y + 10, { align: 'center' });
  doc.setTextColor(0);
  y += 22;

  // Linea divisoria
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 6;

  // === BLOCCO RISORSA + SKIPPER ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATI VIAGGIO', M, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const leftCol = M;
  const rightCol = W / 2 + 4;

  const dataRows = [
    ['Data', fmtDate(date), 'Compagnia', company?.name || '-'],
    ['Risorsa', resource?.name || '-', 'Targa/Matricola', resource?.license_plate || resource?.identifier || '-'],
    ['Tipo', resource?.type || '-', 'Capacita', String(resource?.capacity || '-')],
    ['Skipper', skipper?.full_name || skipper?.username || '-', 'Telefono skipper', skipper?.phone || '-'],
  ];

  dataRows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${row[0]}:`, leftCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[1]), leftCol + 30, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${row[2]}:`, rightCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[3]), rightCol + 32, y);
    y += 5;
  });

  y += 3;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 5;

  // === RIEPILOGO ===
  const totalBookings = bookings.length;
  const totalPax = bookings.reduce((sum, b) => sum + (b.passengers_checkin?.length || b.seats || 0), 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Prenotazioni: ${totalBookings}    Passeggeri totali: ${totalPax}`, M, y);
  y += 8;

  // === DETTAGLIO PER PRENOTAZIONE ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 50, 90);
  doc.text('DETTAGLIO PRENOTAZIONI', M, y);
  doc.setTextColor(0);
  y += 6;

  bookings.forEach((b, idx) => {
    // Verifica spazio rimasto
    if (y > 250) {
      doc.addPage();
      y = 14;
    }

    // Intestazione prenotazione
    doc.setFillColor(240, 245, 252);
    doc.rect(M, y - 4, W - 2 * M, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${idx + 1}. ${b.booking_ref || '-'} - ${b.experience_name || 'Tratta'}`, M + 2, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ore: ${fmtTime(b.slot_datetime)}`, W - M - 35, y + 2);
    y += 10;

    // Intestatario
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Intestatario:', M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${b.customer_name || '-'}  |  Email: ${b.customer_email || '-'}  |  Tel: ${b.customer_phone || '-'}`,
      M + 24, y
    );
    y += 5;

    // Tabella passeggeri
    const passengers = b.passengers_checkin && b.passengers_checkin.length > 0
      ? b.passengers_checkin
      : (b.participants && b.participants.length > 0
          ? b.participants.map((p) => ({ name: p.name || p.first_name || '', surname: p.surname || p.last_name || '', phone: p.phone || '' }))
          : Array.from({ length: b.seats || 0 }, (_, i) => ({ name: `Passeggero ${i + 1}`, surname: '', phone: '' }))
        );

    const tableBody = passengers.map((p, i) => [
      String(i + 1),
      `${p.name || ''} ${p.surname || ''}`.trim() || '-',
      p.phone || '-',
      p.notes || '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Nome e Cognome', 'Telefono', 'Note']],
      body: tableBody,
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 1.5 },
      headStyles: { fillColor: [20, 50, 90], textColor: 255, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 75 },
        2: { cellWidth: 45 },
        3: { cellWidth: 'auto' },
      },
    });
    y = doc.lastAutoTable.finalY + 5;

    if (b.special_requests) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Note: ${b.special_requests}`, M, y);
      doc.setTextColor(0);
      y += 5;
    }

    y += 3;
  });

  // === FOOTER ===
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${company?.name || 'Maretrek'} - Registro Trasportati - Generato il ${new Date().toLocaleString('it-IT')}`,
      W / 2, 290, { align: 'center' }
    );
    doc.text(`Pagina ${p} di ${pageCount}`, W - M, 290, { align: 'right' });
  }

  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');
  return { blob, dataUri, filename: `RegistroTrasportati_${resource?.name || 'risorsa'}_${date}.pdf` };
}

/** Scarica direttamente il PDF (per skipper su mobile) */
export async function downloadTransportLogPdf(opts) {
  const { blob, filename } = await generateTransportLogPdf(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
