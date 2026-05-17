// PDF Lista Passeggeri Check-in - client-side using jspdf
import { jsPDF } from 'jspdf';

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
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
 * Genera PDF con lista passeggeri CHECKED-IN per una risorsa in un giorno specifico.
 * @param {Object} opts
 * @param {Object} opts.resource - { name, type, license_plate, ... }
 * @param {String} opts.date - YYYY-MM-DD
 * @param {Array} opts.bookings - lista bookings con seat_assignments / participants / checked_in_at
 * @param {Object} opts.company - { name, slug, logo_url }
 */
export async function downloadPassengersListPdf({ resource, date, bookings = [], company }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const autoTable = (await import('jspdf-autotable')).default;
  const W = 210;
  const M = 12;
  let y = 14;

  // Header con loghi
  const companyLogoUrl = company?.logo_url || (company?.slug === 'marlin-sub' ? '/logos/marlin-sub.jpg' : null);
  if (companyLogoUrl) {
    const left = await loadImageAsDataUrl(companyLogoUrl);
    if (left) {
      try { doc.addImage(left.dataUrl, 'PNG', M, 8, 22, 22 * (left.h / left.w) || 18); } catch { /* */ }
    }
  }
  const maretrek = await loadImageAsDataUrl('/logos/maretrek.png');
  if (maretrek) {
    try { doc.addImage(maretrek.dataUrl, 'PNG', W - M - 22, 8, 22, 22 * (maretrek.h / maretrek.w) || 18); } catch { /* */ }
  }

  // Titolo
  doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
  doc.text('LISTA PASSEGGERI CHECK-IN', W / 2, 16, { align: 'center' });
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(107, 114, 128);
  doc.text(`${company?.name || 'Maretrek'}`, W / 2, 22, { align: 'center' });

  y = 38;

  // Info risorsa e data
  doc.setDrawColor(99, 102, 241);
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'FD');
  doc.setTextColor(31, 41, 55).setFontSize(11).setFont('helvetica', 'bold');
  doc.text(`${resource?.name || 'Risorsa'}`, M + 4, y + 7);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(75, 85, 99);
  const meta = [
    resource?.type ? `Tipo: ${resource.type}` : null,
    resource?.license_plate ? `Targa: ${resource.license_plate}` : null,
    resource?.capacity ? `Capienza: ${resource.capacity}` : null,
  ].filter(Boolean).join('  ·  ');
  doc.text(meta, M + 4, y + 13);
  doc.setFont('helvetica', 'bold').setTextColor(67, 56, 202);
  doc.text(fmtDate(date), W - M - 4, y + 13, { align: 'right' });
  y += 24;

  // Costruzione righe della tabella: una riga per passeggero
  const rows = [];
  let totalPax = 0;
  bookings.forEach((b) => {
    const checkedIn = !!b.checked_in_at;
    if (!checkedIn) return; // include solo i check-in eseguiti
    const names = Array.isArray(b.seat_assignments) && b.seat_assignments.length > 0
      ? b.seat_assignments
      : (b.participants && Array.isArray(b.participants) && b.participants.length > 0
          ? b.participants.map(p => p?.name || p)
          : [b.customer_name || '—']);
    names.forEach((n, idx) => {
      rows.push([
        rows.length + 1,
        (n || '').toString().trim() || '—',
        b.customer_name || '—',
        b.experience_name || '—',
        b.slot_time || fmtTime(b.slot_datetime) || '—',
        b.booking_ref || '—',
        fmtTime(b.checked_in_at),
      ]);
      totalPax++;
    });
  });

  if (rows.length === 0) {
    doc.setFontSize(11).setFont('helvetica', 'italic').setTextColor(107, 114, 128);
    doc.text('Nessun passeggero ha completato il check-in per questa data.', W / 2, y + 20, { align: 'center' });
  } else {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Passeggero', 'Cliente / Capogruppo', 'Esperienza', 'Orario', 'Rif.', 'Check-in']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      styles: { cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { cellWidth: 40 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: M, right: M },
    });

    // Totale
    const finalY = doc.lastAutoTable?.finalY || y + 40;
    doc.setFillColor(16, 185, 129);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(M, finalY + 4, W - 2 * M, 12, 2, 2, 'F');
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text(`TOTALE PASSEGGERI CHECKED-IN: ${totalPax}`, W / 2, finalY + 12, { align: 'center' });
  }

  // Footer
  doc.setTextColor(107, 114, 128).setFontSize(8).setFont('helvetica', 'italic');
  doc.text(`Generato il ${new Date().toLocaleString('it-IT')}`, W / 2, 290, { align: 'center' });

  const filename = `LISTA_CHECKIN_${(resource?.name || 'risorsa').replace(/\s+/g, '_')}_${date}.pdf`;
  doc.save(filename);
  return { total: totalPax };
}
