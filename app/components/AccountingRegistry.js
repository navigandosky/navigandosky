'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, FileText, Wallet, TrendingUp, RefreshCw, Search, Calendar as CalIcon, CreditCard, Anchor, Ship, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_LABEL = {
  ONLINE: 'SumUp/Online',
  CARD: 'SumUp/Online',
  SUMUP: 'SumUp/Online',
  STRIPE: 'Stripe',
  BANK_TRANSFER: 'Bonifico',
  BONIFICO: 'Bonifico',
  CASH: 'Contanti',
  DIRECT: 'Cassa Diretta',
  MANUAL: 'Manuale',
  AGENCY: 'Agenzia',
  FREE: 'Omaggio',
  NONE: '—',
};
const PM_COLOR = (m) => ({
  ONLINE: 'bg-violet-100 text-violet-800',
  CARD: 'bg-violet-100 text-violet-800',
  SUMUP: 'bg-violet-100 text-violet-800',
  STRIPE: 'bg-indigo-100 text-indigo-800',
  BANK_TRANSFER: 'bg-blue-100 text-blue-800',
  BONIFICO: 'bg-blue-100 text-blue-800',
  CASH: 'bg-emerald-100 text-emerald-800',
  DIRECT: 'bg-emerald-100 text-emerald-800',
  MANUAL: 'bg-orange-100 text-orange-800',
  AGENCY: 'bg-amber-100 text-amber-800',
  FREE: 'bg-pink-100 text-pink-800',
}[m] || 'bg-gray-100 text-gray-700');

const SOURCE_LABEL = { EXPERIENCE: 'Esperienza', MARINA: 'Posto Barca', CANTIERE: 'Cantiere' };
const SOURCE_ICON = { EXPERIENCE: Ship, MARINA: Anchor, CANTIERE: Wrench };

const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return '-'; } };
const today = () => new Date().toISOString().split('T')[0];
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; };

async function api(path) {
  const r = await fetch(`/api/${path}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}

/**
 * Registro Contabilità - aggrega transazioni provenienti da:
 *  - bookings (esperienze)
 *  - marina_bookings (posti barca / contratti)
 *  - cantiere_quotes (preventivi cantiere)
 *
 * Filtri: source, payment_method, status (paid/unpaid/partial), customer, date range
 * Export: Excel (xlsx) e PDF (jspdf + autotable) con totale dinamico riepilogo.
 */
export default function AccountingRegistry({ companyId, companies = [], marinas = [] }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [marinaBookings, setMarinaBookings] = useState([]);
  const [portQuotes, setPortQuotes] = useState([]); // per lookup customer/boat/total dei contratti
  const [cantiereQuotes, setCantiereQuotes] = useState([]);
  const [filters, setFilters] = useState({
    source: '', // 'EXPERIENCE' | 'MARINA' | 'CANTIERE'
    payment_method: '',
    payment_status: '', // 'PAID' | 'UNPAID' | 'PARTIAL'
    customer: '',
    date_from: monthAgo(),
    date_to: today(),
    marina_id: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const cidQS = companyId ? `?company_id=${companyId}` : '';
      const [bks, mbks, pqs, cqs] = await Promise.all([
        api(`bookings${cidQS}`).then(r => Array.isArray(r) ? r : (r?.bookings || [])).catch(() => []),
        api('marina-bookings').then(r => Array.isArray(r) ? r : (r?.bookings || [])).catch(() => []),
        api('port-quotes').then(r => Array.isArray(r) ? r : (r?.quotes || [])).catch(() => []),
        api('cantiere').then(r => Array.isArray(r) ? r : (r?.quotes || [])).catch(() => []),
      ]);
      setBookings(bks || []);
      setMarinaBookings(mbks || []);
      setPortQuotes(pqs || []);
      setCantiereQuotes(cqs || []);
    } catch (e) {
      console.error(e);
      toast.error('Errore caricamento dati contabilità');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [companyId]);

  // Unifica tutte le transazioni in formato comune
  const allTransactions = useMemo(() => {
    const list = [];

    // Bookings esperienze
    (bookings || []).forEach(b => {
      if (companyId && b.company_id && b.company_id !== companyId) return;
      const total = Number(b.total_amount || 0);
      const refundedAmount = Number(b.refund_amount || 0);
      const isRefunded = b.payment_status === 'REFUNDED' || b.refund_status === 'COMPLETED';
      const paid = !isRefunded && (b.payment_status === 'PAID' || b.status === 'CONFIRMED');
      const date = b.refund_completed_at || b.created_at || b.slot_date || b.updated_at;
      list.push({
        id: `bk-${b.id}`,
        source: 'EXPERIENCE',
        date,
        reference: b.booking_ref || b.id?.slice(0, 8),
        customer: b.customer_name || b.customer_email || '—',
        description: b.experience_name || 'Prenotazione esperienza',
        payment_method: b.payment_method || 'NONE',
        payment_status: isRefunded ? 'REFUNDED' : (paid ? 'PAID' : (b.status === 'PENDING_VERIFICATION' ? 'PENDING' : 'UNPAID')),
        booking_status: b.status,
        amount: total,
        paid_amount: isRefunded ? -refundedAmount : (paid ? total : 0),
        marina_id: null,
        refund_iban: b.refund_iban || '',
        refund_cro: b.refund_transfer_reference || '',
        refund_date: b.refund_completed_at || b.refund_transfer_date || '',
        raw: b,
      });
    });

    // Indicizza port_quotes per id (per lookup veloce)
    const quotesById = {};
    (portQuotes || []).forEach(q => { if (q?.id) quotesById[q.id] = q; });

    // Mappa metodo pagamento da formato italiano a chiave standard
    const normalizePaymentMethod = (m) => {
      if (!m) return 'NONE';
      const u = String(m).toUpperCase();
      if (u === 'CONTANTI' || u === 'CASH') return 'CASH';
      if (u === 'BONIFICO' || u === 'BANK_TRANSFER') return 'BANK_TRANSFER';
      if (u === 'CARTA' || u === 'POS' || u === 'SUMUP' || u === 'CARD' || u === 'ONLINE') return 'ONLINE';
      if (u === 'STRIPE') return 'STRIPE';
      if (u === 'ASSEGNO') return 'CASH';
      if (u === 'MANUAL' || u === 'MANUALE' || u === 'ALTRO') return 'MANUAL';
      return u;
    };

    // Marina bookings (preventivi/contratti posti barca)
    (marinaBookings || []).forEach(mb => {
      if (companyId && mb.company_id && mb.company_id !== companyId) return;
      // Recupera dati del preventivo collegato (cliente, barca, total)
      const q = mb.quote_id ? quotesById[mb.quote_id] : null;
      const cust = q?.customer || {};
      const boat = q?.boat || {};
      const customerName = (cust.name || cust.surname)
        ? [cust.name, cust.surname].filter(Boolean).join(' ')
        : (mb.customer_name || mb.full_name || '—');

      // Total: dal contratto se presente, altrimenti grand_total del preventivo
      const total = Number(mb.total_amount || mb.grand_total || q?.grand_total || q?.total_amount || 0);

      // paid_amount: somma dei payments[] del marina_booking
      const paidFromArray = Array.isArray(mb.payments)
        ? mb.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
        : 0;
      const paidAmount = paidFromArray || Number(mb.paid_amount || 0);

      // Determina lo stato del pagamento
      let ps;
      const ps_raw = String(mb.payment_status || '').toUpperCase();
      if (ps_raw === 'SALDATO' || ps_raw === 'PAID' || (total > 0 && paidAmount >= total)) ps = 'PAID';
      else if (ps_raw === 'PARZIALE' || ps_raw === 'PARTIAL' || paidAmount > 0) ps = 'PARTIAL';
      else if (ps_raw === 'PENDENTE' || ps_raw === 'PENDING') ps = 'PENDING';
      else ps = 'UNPAID';

      // Metodo pagamento: usa l'ultimo del payments[], poi mb.payment_method
      const lastPm = Array.isArray(mb.payments) && mb.payments.length > 0
        ? mb.payments[mb.payments.length - 1]?.method
        : (mb.payment_method || mb.payment_type);
      const paymentMethod = normalizePaymentMethod(lastPm);

      const date = mb.created_at || mb.updated_at || q?.created_at || mb.start_date;
      const boatLabel = boat?.name || mb.boat_name || '';
      const description = `Posto ${mb.berth_label || '—'}${boatLabel ? ` · ${boatLabel}` : ''}${q?.marina_name ? ` (${q.marina_name})` : ''}`.trim();

      list.push({
        id: `mb-${mb.id}`,
        source: 'MARINA',
        date,
        reference: mb.booking_number || mb.contract_ref || mb.id?.slice(0, 8),
        customer: customerName,
        description,
        payment_method: paymentMethod,
        payment_status: ps,
        booking_status: mb.status || 'QUOTE',
        amount: total,
        paid_amount: paidAmount,
        marina_id: mb.marina_id || q?.marina_id || null,
        payments_count: Array.isArray(mb.payments) ? mb.payments.length : 0,
        raw: mb,
      });
    });

    // Cantiere quotes
    (cantiereQuotes || []).forEach(cq => {
      if (companyId && cq.company_id && cq.company_id !== companyId) return;
      const total = Number(cq.grand_total || cq.total_amount || cq.amount || 0);
      const paidAmount = Number(cq.paid_amount || 0);
      let ps;
      const ps_raw = String(cq.payment_status || '').toUpperCase();
      if (ps_raw === 'PAID' || ps_raw === 'SALDATO' || (total > 0 && paidAmount >= total)) ps = 'PAID';
      else if (ps_raw === 'PARZIALE' || paidAmount > 0) ps = 'PARTIAL';
      else if (ps_raw === 'PENDING' || ps_raw === 'PENDENTE') ps = 'PENDING';
      else ps = 'UNPAID';
      const date = cq.created_at || cq.updated_at;
      const cust = cq.customer || {};
      const boat = cq.boat || {};
      const customerName = (cust.name || cust.surname)
        ? [cust.name, cust.surname].filter(Boolean).join(' ')
        : (cq.customer_name || '—');
      list.push({
        id: `cq-${cq.id}`,
        source: 'CANTIERE',
        date,
        reference: cq.quote_number || cq.id?.slice(0, 8),
        customer: customerName,
        description: `Cantiere${boat?.name ? ` · ${boat.name}` : ''}`,
        payment_method: normalizePaymentMethod(cq.payment_method),
        payment_status: ps,
        booking_status: cq.status || 'BOZZA',
        amount: total,
        paid_amount: ps === 'PAID' ? total : paidAmount,
        marina_id: cq.marina_id || null,
        raw: cq,
      });
    });

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [bookings, marinaBookings, portQuotes, cantiereQuotes, companyId]);

  // Applica filtri
  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      if (filters.source && t.source !== filters.source) return false;
      if (filters.payment_method && (t.payment_method || 'NONE') !== filters.payment_method) return false;
      if (filters.payment_status && t.payment_status !== filters.payment_status) return false;
      if (filters.customer && !(t.customer || '').toLowerCase().includes(filters.customer.toLowerCase())) return false;
      if (filters.marina_id && t.marina_id !== filters.marina_id) return false;
      if (filters.date_from && t.date && t.date.split('T')[0] < filters.date_from) return false;
      if (filters.date_to && t.date && t.date.split('T')[0] > filters.date_to) return false;
      return true;
    });
  }, [allTransactions, filters]);

  // KPI aggregati
  const kpis = useMemo(() => {
    const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);
    const totalPaid = filtered.reduce((s, t) => s + t.paid_amount, 0);
    const totalOutstanding = totalAmount - totalPaid;
    const byMethod = {};
    filtered.forEach(t => {
      const k = t.payment_method || 'NONE';
      byMethod[k] = (byMethod[k] || 0) + t.paid_amount;
    });
    return { count: filtered.length, totalAmount, totalPaid, totalOutstanding, byMethod };
  }, [filtered]);

  const clearFilters = () => setFilters({
    source: '', payment_method: '', payment_status: '', customer: '',
    date_from: monthAgo(), date_to: today(), marina_id: '',
  });

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map(t => ({
        'Data': fmtDate(t.date),
        'Tipo': SOURCE_LABEL[t.source] || t.source,
        'Riferimento': t.reference,
        'Cliente': t.customer,
        'Descrizione': t.description,
        'Metodo Pagamento': PAYMENT_LABEL[t.payment_method] || t.payment_method,
        'Stato Pagamento': t.payment_status,
        'Stato': t.booking_status,
        'Importo': Number(t.amount),
        'Incassato': Number(t.paid_amount),
        'Residuo': Number(t.amount - t.paid_amount),
      }));
      // Aggiunge totali
      rows.push({});
      rows.push({
        'Data': '', 'Tipo': '', 'Riferimento': '', 'Cliente': '', 'Descrizione': '',
        'Metodo Pagamento': '', 'Stato Pagamento': '', 'Stato': 'TOTALE',
        'Importo': kpis.totalAmount, 'Incassato': kpis.totalPaid, 'Residuo': kpis.totalOutstanding,
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 }, { wch: 13 }, { wch: 16 }, { wch: 24 }, { wch: 32 },
        { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contabilità');
      // Foglio Riepilogo per metodo
      const sumRows = Object.entries(kpis.byMethod).map(([k, v]) => ({
        'Metodo Pagamento': PAYMENT_LABEL[k] || k,
        'Incassato': Number(v),
      }));
      sumRows.push({ 'Metodo Pagamento': 'TOTALE', 'Incassato': kpis.totalPaid });
      const ws2 = XLSX.utils.json_to_sheet(sumRows);
      ws2['!cols'] = [{ wch: 22 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Riepilogo per Metodo');
      XLSX.writeFile(wb, `contabilita_${today()}.xlsx`);
      toast.success('✅ Excel esportato');
    } catch (e) { console.error(e); toast.error('Errore export Excel'); }
  };

  const exportPDF = async () => {
    try {
      const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = atMod.default || atMod;
      const doc = new jsPDF('l');
      doc.setFontSize(16).text('Registro Contabilità', 14, 16);
      doc.setFontSize(9).text(`Generato: ${new Date().toLocaleString('it-IT')}  ·  Risultati: ${kpis.count}`, 14, 22);
      const af = [];
      if (filters.source) af.push(`Tipo: ${SOURCE_LABEL[filters.source]}`);
      if (filters.payment_method) af.push(`Pagamento: ${PAYMENT_LABEL[filters.payment_method]}`);
      if (filters.payment_status) af.push(`Stato: ${filters.payment_status}`);
      if (filters.customer) af.push(`Cliente: ${filters.customer}`);
      af.push(`Periodo: ${filters.date_from} → ${filters.date_to}`);
      doc.text(`Filtri: ${af.join(' · ')}`, 14, 28);

      autoTable(doc, {
        startY: 34,
        head: [['Data', 'Tipo', 'Rif.', 'Cliente', 'Descrizione', 'Pagamento', 'Stato Pag.', 'Importo', 'Incassato', 'Residuo']],
        body: filtered.map(t => [
          fmtDate(t.date),
          SOURCE_LABEL[t.source] || t.source,
          t.reference,
          t.customer,
          t.description,
          PAYMENT_LABEL[t.payment_method] || t.payment_method,
          t.payment_status,
          fmtEur(t.amount),
          fmtEur(t.paid_amount),
          fmtEur(t.amount - t.paid_amount),
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [99, 102, 241] },
        foot: [['', '', '', '', '', '', 'TOTALI', fmtEur(kpis.totalAmount), fmtEur(kpis.totalPaid), fmtEur(kpis.totalOutstanding)]],
        footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      });

      // Box riepilogo per metodo
      let y = (doc.lastAutoTable?.finalY || 100) + 8;
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
      doc.text('Riepilogo Incassi per Metodo', 14, y);
      y += 4;
      const recap = Object.entries(kpis.byMethod).map(([k, v]) => [PAYMENT_LABEL[k] || k, fmtEur(v)]);
      autoTable(doc, {
        startY: y,
        head: [['Metodo Pagamento', 'Incassato']],
        body: recap,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        foot: [['TOTALE', fmtEur(kpis.totalPaid)]],
        footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        tableWidth: 90,
      });
      doc.save(`contabilita_${today()}.pdf`);
      toast.success('✅ PDF esportato');
    } catch (e) { console.error(e); toast.error('Errore export PDF'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-bold">Registro Contabilità</h2>
            <p className="text-sm text-muted-foreground">Tutte le transazioni di {companyId ? 'questa company' : 'tutte le company'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Transazioni</div>
            <div className="text-2xl font-bold text-blue-700">{kpis.count}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Importo Totale</div>
            <div className="text-2xl font-bold text-indigo-700">{fmtEur(kpis.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Incassato</div>
            <div className="text-2xl font-bold text-emerald-700">{fmtEur(kpis.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Da Incassare</div>
            <div className={`text-2xl font-bold ${kpis.totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
              {fmtEur(kpis.totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4" /> Filtri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={filters.source || 'all'} onValueChange={(v) => setFilters({ ...filters, source: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="EXPERIENCE">Esperienze</SelectItem>
                  <SelectItem value="MARINA">Posti Barca</SelectItem>
                  <SelectItem value="CANTIERE">Cantiere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Metodo Pagamento</Label>
              <Select value={filters.payment_method || 'all'} onValueChange={(v) => setFilters({ ...filters, payment_method: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i metodi</SelectItem>
                  <SelectItem value="ONLINE">SumUp/Online</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bonifico</SelectItem>
                  <SelectItem value="CASH">Contanti</SelectItem>
                  <SelectItem value="DIRECT">Cassa Diretta</SelectItem>
                  <SelectItem value="MANUAL">Manuale</SelectItem>
                  <SelectItem value="AGENCY">Agenzia</SelectItem>
                  <SelectItem value="FREE">Omaggio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Stato Pagamento</Label>
              <Select value={filters.payment_status || 'all'} onValueChange={(v) => setFilters({ ...filters, payment_status: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="PAID">Pagato</SelectItem>
                  <SelectItem value="PARTIAL">Parziale</SelectItem>
                  <SelectItem value="UNPAID">Non pagato</SelectItem>
                  <SelectItem value="PENDING">In verifica</SelectItem>
                  <SelectItem value="REFUNDED">Rimborsato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Input value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} placeholder="Nome cliente" />
            </div>
            <div>
              <Label className="text-xs">Data Da</Label>
              <Input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Data A</Label>
              <Input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            </div>
            {marinas && marinas.length > 0 && (
              <div className="md:col-span-2">
                <Label className="text-xs">Marina</Label>
                <Select value={filters.marina_id || 'all'} onValueChange={(v) => setFilters({ ...filters, marina_id: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le marine</SelectItem>
                    {marinas.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabella transazioni */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Movimenti ({filtered.length})</CardTitle>
          <div className="text-sm text-muted-foreground">
            Incassato: <strong className="text-emerald-700">{fmtEur(kpis.totalPaid)}</strong> · 
            Da incassare: <strong className={kpis.totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-500'}> {fmtEur(kpis.totalOutstanding)}</strong>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left bg-muted/50">
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Rif.</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Descrizione</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3">Stato</th>
                  <th className="p-3 text-right">Importo</th>
                  <th className="p-3 text-right">Incassato</th>
                  <th className="p-3 text-right">Residuo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">Nessuna transazione nel periodo selezionato.</td></tr>
                ) : filtered.map(t => {
                  const SourceIcon = SOURCE_ICON[t.source] || Ship;
                  const residuo = t.amount - t.paid_amount;
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs">{fmtDate(t.date)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <SourceIcon className="w-3 h-3" />
                          {SOURCE_LABEL[t.source]}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">{t.reference}</td>
                      <td className="p-3">{t.customer}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={t.description}>{t.description}</td>
                      <td className="p-3">
                        <Badge className={`${PM_COLOR(t.payment_method)} border-0 text-[11px]`}>
                          {PAYMENT_LABEL[t.payment_method] || t.payment_method}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[11px] border-0 ${
                          t.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          t.payment_status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                          t.payment_status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                          t.payment_status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>{t.payment_status === 'REFUNDED' ? 'Rimborsato' : t.payment_status}</Badge>
                        {t.refund_cro && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">CRO: {t.refund_cro}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">{fmtEur(t.amount)}</td>
                      <td className="p-3 text-right text-emerald-700 font-medium">{fmtEur(t.paid_amount)}</td>
                      <td className={`p-3 text-right font-medium ${residuo > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                        {fmtEur(residuo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-300 sticky bottom-0">
                  <tr>
                    <td colSpan={7} className="p-3 text-right uppercase text-xs font-bold tracking-wide text-muted-foreground">
                      Totali ({filtered.length} {filtered.length === 1 ? 'movimento' : 'movimenti'})
                    </td>
                    <td className="p-3 text-right font-bold text-indigo-700">{fmtEur(kpis.totalAmount)}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{fmtEur(kpis.totalPaid)}</td>
                    <td className={`p-3 text-right font-bold ${kpis.totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                      {fmtEur(kpis.totalOutstanding)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo per metodo */}
      {Object.keys(kpis.byMethod).length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Riepilogo Incassi per Metodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(kpis.byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
                <div key={m} className="border rounded-lg p-3">
                  <Badge className={`${PM_COLOR(m)} border-0`}>{PAYMENT_LABEL[m] || m}</Badge>
                  <div className="text-xl font-bold mt-2">{fmtEur(v)}</div>
                  <div className="text-xs text-muted-foreground">
                    {((v / Math.max(kpis.totalPaid, 1)) * 100).toFixed(1)}% del totale
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
