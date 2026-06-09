'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { FileText, Download, Calendar, Anchor, Users, Search, RefreshCw, FileSpreadsheet, X, Filter, Plus, CheckCircle2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Registro Trasportati - vista admin con filtri per data, esperienza, risorsa.
 * Mostra tutti i Transport Logs generati dagli skipper (giornalieri per risorsa).
 */
export default function TransportLogsRegistry({ companyId, companies = [], agencies = [] }) {
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtri
  const [filterDate, setFilterDate] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [filterExperience, setFilterExperience] = useState('all');
  const [filterSkipper, setFilterSkipper] = useState('all');
  const [filterAgency, setFilterAgency] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // === Dialog: Crea Lista ===
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ resource_id: '', date: new Date().toISOString().slice(0,10), experience_id: '' });
  const [creating, setCreating] = useState(false);

  // === Dialog: Check-in ===
  const [checkinLog, setCheckinLog] = useState(null);
  const [checkinSaving, setCheckinSaving] = useState(false);

  // === Dialog: Aggiungi Nome Libero ===
  const [freeEntryDialog, setFreeEntryDialog] = useState(null); // { customer_name, customer_phone, seats, notes }

  // === Dialog: Contratto Noleggio ===
  const [contractDialog, setContractDialog] = useState(null); // { contract_number, contract_date, itinerary, miglia, durata, totale_turisti, prezzo, unita_diporto_numero, adulti, bambini, notes, passengers: [{name, phone, notes}], company:{...} }
  const [companyData, setCompanyData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const compQuery = companyId ? `?company_id=${companyId}` : '';
      const [logsRes, resRes, expRes] = await Promise.all([
        fetch(`/api/transport-logs${compQuery}`),
        fetch(`/api/resources${compQuery}`),
        fetch(`/api/experiences${compQuery ? compQuery + '&all=true' : '?all=true'}`),
      ]);
      const logsData = await logsRes.json();
      const resData = await resRes.json();
      const expData = await expRes.json();
      setLogs(Array.isArray(logsData) ? logsData : []);
      setResources(Array.isArray(resData) ? resData : []);
      setExperiences(Array.isArray(expData) ? expData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  // === CREA LISTA da prenotazioni esistenti ===
  const createList = async () => {
    if (!createForm.resource_id || !createForm.date) {
      toast.error('Seleziona risorsa e data');
      return;
    }
    setCreating(true);
    try {
      const r = await fetch('/api/transport-logs?action=build-from-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          resource_id: createForm.resource_id,
          date: createForm.date,
          experience_id: createForm.experience_id || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      if ((data.bookings_snapshot || []).length === 0) {
        toast.warning(`Nessuna prenotazione trovata per ${createForm.date}`);
      } else {
        toast.success(`📋 Lista ${data._created ? 'creata' : 'aggiornata'}: ${data.total_bookings} prenotazioni, ${data.total_passengers} pax`);
      }
      setCreateOpen(false);
      setCreateForm({ resource_id: '', date: new Date().toISOString().slice(0,10), experience_id: '' });
      await load();
      // Apri direttamente il check-in dialog sulla nuova lista
      setCheckinLog(data);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  // === TOGGLE CHECK-IN su singola booking ===
  const toggleCheckin = async (logId, booking_id, newState) => {
    try {
      const r = await fetch(`/api/transport-logs/${logId}?action=checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id, checked_in: newState }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      setCheckinLog(data);
      // refresh top-level logs in background
      load();
    } catch (e) {
      toast.error('Errore check-in: ' + e.message);
    }
  };

  // === AGGIUNGI NOME LIBERO ===
  const submitFreeEntry = async () => {
    if (!freeEntryDialog?.customer_name?.trim()) {
      toast.error('Inserisci il nome');
      return;
    }
    try {
      const r = await fetch(`/api/transport-logs/${checkinLog.id}?action=add-free-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: freeEntryDialog.customer_name.trim(),
          customer_phone: freeEntryDialog.customer_phone || '',
          customer_email: freeEntryDialog.customer_email || '',
          seats: Number(freeEntryDialog.seats) || 1,
          notes: freeEntryDialog.notes || '',
          experience_name: freeEntryDialog.experience_name || 'Aggiunto manualmente',
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success(`👤 "${freeEntryDialog.customer_name}" aggiunto al registro`);
      setCheckinLog(data);
      setFreeEntryDialog(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeFreeEntry = async (booking_id, name) => {
    if (!window.confirm(`Rimuovere "${name}" dal registro?`)) return;
    try {
      const r = await fetch(`/api/transport-logs/${checkinLog.id}?action=remove-free-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success('Rimosso');
      setCheckinLog(data);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // === APRI DIALOG CONTRATTO da log ===
  const openContractFromLog = async (log) => {
    // Carica dati company se non già in cache
    let comp = companyData;
    if (!comp) {
      try {
        const r = await fetch(`/api/companies/${companyId}`);
        if (r.ok) { comp = await r.json(); setCompanyData(comp); }
      } catch (_e) { /* ignore */ }
    }
    // Costruisci passeggeri: per ogni booking, espandi in "seats" voci (es. 3 posti = 3 nomi)
    const passengers = [];
    let totalAdults = 0;
    for (const b of (log.bookings_snapshot || [])) {
      const seats = Number(b.seats || 1);
      totalAdults += seats;
      passengers.push({
        name: b.customer_name || '-',
        phone: b.customer_phone || '',
        notes: b.is_free_entry ? '(LIBERO)' : (b.agency_name ? `Ag. ${b.agency_name}` : ''),
      });
      // Aggiungi righe vuote per passeggeri >1 della stessa booking
      for (let i = 1; i < seats; i++) {
        passengers.push({ name: `Passeggero ${i + 1} di ${b.customer_name || '-'}`, phone: '', notes: '' });
      }
    }
    // Pre-compila campi (alcuni dall'esperienza, se unica)
    const expNames = Array.from(new Set((log.bookings_snapshot || []).map(b => b.experience_name).filter(Boolean)));
    const itinerary = expNames.length === 1 ? expNames[0] : (expNames[0] || '');
    // Genera numero contratto (es. NL-YYYYMMDD-####)
    const today = new Date();
    const dateIt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const contractNumber = `NL-${log.date.replaceAll('-', '')}-${log.id.slice(0, 4).toUpperCase()}`;

    setContractDialog({
      _logId: log.id,
      contract_number: contractNumber,
      contract_date: dateIt,
      company: {
        name: comp?.name || '',
        vat_number: comp?.vat_number || '',
        activity_code: comp?.activity_code || '',
        address: comp?.address || '',
      },
      itinerary,
      miglia: '',
      durata: '8 ore',
      totale_turisti: String(log.total_passengers || totalAdults || passengers.length),
      prezzo: '',
      unita_diporto_numero: log.resource_name || '',
      adulti: String(log.total_passengers || totalAdults),
      bambini: '0',
      notes: '',
      passengers,
    });
  };

  // === GENERA PDF CONTRATTO ===
  const generateContract = async () => {
    if (!contractDialog) return;
    try {
      const { generateRentalContractPdf } = await import('@/app/lib/rentalContractPdf');
      generateRentalContractPdf({
        ...contractDialog,
        passengers: contractDialog.passengers || [],
      });
      toast.success('📜 Contratto generato');
      setContractDialog(null);
    } catch (e) {
      toast.error('Errore generazione: ' + e.message);
    }
  };

  // === CHIUDI il log dopo check-in ===
  const closeLog = async () => {
    if (!window.confirm('Chiudere il registro? Non potrà più essere modificato il check-in.')) return;
    setCheckinSaving(true);
    try {
      const r = await fetch(`/api/transport-logs/${checkinLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED', closed_at: new Date().toISOString() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success('✅ Registro chiuso');
      setCheckinLog(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCheckinSaving(false);
    }
  };

  // === FINE ESPERIENZA: invia email di ringraziamento a tutti i passeggeri ===
  const endTripWithEmail = async () => {
    if (!checkinLog) return;
    const validEmails = (checkinLog.bookings_snapshot || []).reduce((s, b) => {
      const em = (b.customer_email || '').trim();
      if (em && em.includes('@')) s.add(em.toLowerCase());
      return s;
    }, new Set());
    if (validEmails.size === 0) {
      toast.error('Nessuna email valida tra i passeggeri di questo registro');
      return;
    }
    if (!window.confirm(`🏁 Terminare l'esperienza e inviare email di ringraziamento a ${validEmails.size} destinatari unici?\n\nIl registro verrà marcato come COMPLETATO.`)) return;
    setCheckinSaving(true);
    try {
      const r = await fetch(`/api/transport-logs/${checkinLog.id}?action=end-trip-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      if (data.sent > 0) {
        toast.success(`📧 Esperienza terminata · ${data.sent}/${data.total_recipients} email inviate${data.failed > 0 ? ` (${data.failed} fallite)` : ''}`);
      } else {
        toast.error(`Nessuna email inviata (${data.failed} fallimenti)`);
      }
      setCheckinLog(null);
      load();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    } finally {
      setCheckinSaving(false);
    }
  };


  // Lista date uniche disponibili (per dropdown)
  const availableDates = useMemo(() => {
    const set = new Set(logs.map((l) => l.date).filter(Boolean));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  // Lista skipper unici
  const availableSkippers = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (l.skipper_id) map[l.skipper_id] = l.skipper_name || 'Sconosciuto';
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Calcola le esperienze che effettivamente hanno log (per filtro contestuale)
  const experiencesWithLogs = useMemo(() => {
    const expIds = new Set();
    logs.forEach((l) => {
      (l.bookings_snapshot || []).forEach((b) => {
        if (b.experience_id) expIds.add(b.experience_id);
      });
    });
    return experiences.filter((e) => expIds.has(e.id));
  }, [logs, experiences]);

  // Applica filtri
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterDate !== 'all' && l.date !== filterDate) return false;
      if (filterResource !== 'all' && l.resource_id !== filterResource) return false;
      if (filterSkipper !== 'all' && l.skipper_id !== filterSkipper) return false;
      if (filterExperience !== 'all') {
        const has = (l.bookings_snapshot || []).some((b) => b.experience_id === filterExperience);
        if (!has) return false;
      }
      if (filterAgency !== 'all') {
        if (filterAgency === '__NONE__') {
          const onlyDirect = (l.bookings_snapshot || []).every((b) => !b.agency_id);
          if (!onlyDirect) return false;
        } else {
          const has = (l.bookings_snapshot || []).some((b) => b.agency_id === filterAgency);
          if (!has) return false;
        }
      }
      if (fromDate && l.date < fromDate) return false;
      if (toDate && l.date > toDate) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const inResource = (l.resource_name || '').toLowerCase().includes(q);
        const inSkipper = (l.skipper_name || '').toLowerCase().includes(q);
        const inBookings = (l.bookings_snapshot || []).some((b) =>
          (b.customer_name || '').toLowerCase().includes(q) ||
          (b.booking_ref || '').toLowerCase().includes(q) ||
          (b.experience_name || '').toLowerCase().includes(q)
        );
        if (!inResource && !inSkipper && !inBookings) return false;
      }
      return true;
    });
  }, [logs, filterDate, filterResource, filterExperience, filterSkipper, fromDate, toDate, searchText]);

  // KPI
  const stats = useMemo(() => {
    return {
      totalLogs: filteredLogs.length,
      totalPax: filteredLogs.reduce((s, l) => s + (l.total_passengers || 0), 0),
      totalBookings: filteredLogs.reduce((s, l) => s + (l.total_bookings || 0), 0),
      uniqueSkippers: new Set(filteredLogs.map((l) => l.skipper_id).filter(Boolean)).size,
    };
  }, [filteredLogs]);

  const clearFilters = () => {
    setFilterDate('all');
    setFilterResource('all');
    setFilterExperience('all');
  const clearFilters = () => {
    setFilterDate('all');
    setFilterResource('all');
    setFilterExperience('all');
    setFilterSkipper('all');
    setFilterAgency('all');
    setFromDate('');
    setToDate('');
    setSearchText('');
  };
    setSearchText('');
    setFromDate('');
    setToDate('');
  };

  // Download PDF
  const downloadPdf = async (log) => {
    if (log.pdf_data) {
      const a = document.createElement('a');
      a.href = log.pdf_data;
      a.download = `RegistroTrasportati_${log.resource_name || 'risorsa'}_${log.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // Fallback: rigenera client-side
    try {
      const { downloadTransportLogPdf } = await import('@/app/lib/transportLogPdf');
      let company = null;
      if (log.company_id) {
        try { company = await fetch(`/api/companies/${log.company_id}`).then((r) => r.json()); } catch {}
      }
      await downloadTransportLogPdf({
        resource: { name: log.resource_name, id: log.resource_id },
        skipper: { full_name: log.skipper_name, phone: log.skipper_phone },
        date: log.date,
        bookings: log.bookings_snapshot || [],
        company: company || {},
      });
    } catch (e) {
      alert('Errore generazione PDF: ' + e.message);
    }
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = filteredLogs.flatMap((l) =>
        (l.bookings_snapshot || []).map((b) => ({
          Data: l.date,
          Risorsa: l.resource_name,
          Skipper: l.skipper_name,
          'Tel Skipper': l.skipper_phone || '',
          Esperienza: b.experience_name || '',
          Riferimento: b.booking_ref || '',
          Intestatario: b.customer_name || '',
          Email: b.customer_email || '',
          Telefono: b.customer_phone || '',
          'Pax Prenotati': b.seats || 0,
          'Pax Check-in': (b.passengers_checkin || []).length,
          Stato: l.status || '',
        }))
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trasportati');
      XLSX.writeFile(wb, `RegistroTrasportati_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      alert('Errore export: ' + e.message);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      {/* Header con KPI */}
      <Card className="bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 border-sky-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-blue-600" />
                Registro Trasportati
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Registri giornalieri chiusi dagli skipper con check-in passeggeri</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />Crea Lista
              </Button>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={filteredLogs.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground">Registri</div>
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground">Prenotazioni</div>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground">Passeggeri</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalPax}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground">Skipper attivi</div>
              <div className="text-2xl font-bold">{stats.uniqueSkippers}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtri */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Data (singola)</Label>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le date</SelectItem>
                  {availableDates.map((d) => (
                    <SelectItem key={d} value={d}>{fmtDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Risorsa</Label>
              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le risorse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le risorse</SelectItem>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Esperienza</Label>
              <Select value={filterExperience} onValueChange={setFilterExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le esperienze" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le esperienze</SelectItem>
                  {experiencesWithLogs.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Skipper</Label>
              <Select value={filterSkipper} onValueChange={setFilterSkipper}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti gli skipper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli skipper</SelectItem>
                  {availableSkippers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">🏢 Agenzia</Label>
              <Select value={filterAgency} onValueChange={setFilterAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le agenzie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le agenzie</SelectItem>
                  <SelectItem value="__NONE__">— Senza Agenzia (Vendita Diretta) —</SelectItem>
                  {(agencies || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dal</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Al</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Cerca (cliente, prenotazione, skipper, risorsa)</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Cerca testo..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="w-4 h-4 mr-1" />Pulisci filtri
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Risultati ({filteredLogs.length} registri)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-center py-6 text-muted-foreground">Caricamento...</div>}
          {!loading && filteredLogs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p>Nessun registro trasportati trovato per i filtri selezionati</p>
            </div>
          )}
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const compName = companies.find((c) => c.id === log.company_id)?.name;
              return (
                <div key={log.id} className="border rounded-lg p-3 bg-white hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="secondary" className="font-mono">
                          <Calendar className="w-3 h-3 mr-1" />{fmtDate(log.date)}
                        </Badge>
                        {log.status === 'CLOSED' && <Badge className="bg-green-600">Chiuso</Badge>}
                        {log.status === 'COMPLETED' && <Badge className="bg-rose-600 text-white">🏁 Terminato</Badge>}
                        {log.status === 'OPEN' && <Badge className="bg-amber-500">Aperto</Badge>}
                        {compName && <Badge variant="outline" className="text-xs">{compName}</Badge>}
                      </div>
                      <div className="font-semibold flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-blue-600" />
                        {log.resource_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>Skipper: <strong>{log.skipper_name || '-'}</strong></span>
                        {log.skipper_phone && <span>Tel: {log.skipper_phone}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{log.total_passengers || 0} pax</span>
                        <span>{log.total_bookings || 0} prenotazioni</span>
                      </div>
                      {/* Riepilogo prenotazioni inline */}
                      {log.bookings_snapshot && log.bookings_snapshot.length > 0 && (
                        <div className="mt-2 pl-1 text-xs space-y-0.5">
                          {log.bookings_snapshot.slice(0, 3).map((b, i) => (
                            <div key={i} className="text-muted-foreground">
                              • {b.booking_ref} — {b.customer_name} — {b.experience_name}
                              {b.passengers_checkin && b.passengers_checkin.length > 0 && ` (${b.passengers_checkin.length} pax check-in)`}
                            </div>
                          ))}
                          {log.bookings_snapshot.length > 3 && (
                            <div className="text-muted-foreground italic">... e altre {log.bookings_snapshot.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      {log.status !== 'CLOSED' && log.status !== 'COMPLETED' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCheckinLog(log)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Check-in Now
                        </Button>
                      )}
                      {log.status === 'COMPLETED' && (
                        <Button size="sm" variant="outline" className="border-rose-500 text-rose-700" onClick={() => setCheckinLog(log)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Vedi Dettagli
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="border-violet-500 text-violet-700 hover:bg-violet-50" onClick={() => openContractFromLog(log)} title="Genera Contratto Noleggio con Conducente">
                        <FileText className="w-4 h-4 mr-1" />Contratto
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(log)}>
                        <Download className="w-4 h-4 mr-1" />PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ====== DIALOG: Crea Lista ====== */}
      <Dialog open={createOpen} onOpenChange={(o) => !creating && setCreateOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-emerald-600" />Crea Lista Trasportati</DialogTitle>
            <DialogDescription>
              Genera una lista pronta per check-in selezionando Risorsa, Data e (opzionale) Esperienza. Pesca automaticamente tutte le prenotazioni della giornata.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Risorsa *</Label>
              <Select value={createForm.resource_id} onValueChange={(v) => setCreateForm({ ...createForm, resource_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona risorsa" /></SelectTrigger>
                <SelectContent>
                  {resources.slice().sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Esperienza (opzionale - filtra solo questa)</Label>
              <Select value={createForm.experience_id || '__all__'} onValueChange={(v) => setCreateForm({ ...createForm, experience_id: v === '__all__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Tutte le esperienze" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutte le esperienze</SelectItem>
                  {experiences.slice().sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground bg-slate-50 border rounded p-2">
              💡 Lo skipper assegnato alla risorsa verrà rilevato automaticamente. Se la lista esiste già per questa risorsa+data, verrà aggiornata mantenendo i check-in già fatti.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annulla</Button>
            <Button onClick={createList} disabled={creating || !createForm.resource_id || !createForm.date} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? 'Generazione…' : 'Crea Lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== DIALOG: Check-in ====== */}
      <Dialog open={!!checkinLog} onOpenChange={(o) => !o && setCheckinLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-600" />Check-in Passeggeri</DialogTitle>
            <DialogDescription>
              {checkinLog && (<>
                <strong>{checkinLog.resource_name}</strong> · {fmtDate(checkinLog.date)}
                {checkinLog.skipper_name && <> · Skipper: <strong>{checkinLog.skipper_name}</strong></>}
                {checkinLog.skipper_phone && <> ({checkinLog.skipper_phone})</>}
              </>)}
            </DialogDescription>
          </DialogHeader>
          {checkinLog && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="text-[10px] text-blue-700 uppercase">Prenotazioni</div>
                  <div className="font-bold text-xl text-blue-800">{(checkinLog.bookings_snapshot || []).length}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                  <div className="text-[10px] text-emerald-700 uppercase">Check-in ✓</div>
                  <div className="font-bold text-xl text-emerald-800">{(checkinLog.bookings_snapshot || []).filter(b => b.checked_in).length}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="text-[10px] text-amber-700 uppercase">Da fare</div>
                  <div className="font-bold text-xl text-amber-800">{(checkinLog.bookings_snapshot || []).filter(b => !b.checked_in).length}</div>
                </div>
              </div>

              {/* Pulsante Aggiungi Nome Libero */}
              {checkinLog.status !== 'CLOSED' && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-dashed border-violet-400 text-violet-700 hover:bg-violet-50"
                    onClick={() => setFreeEntryDialog({ customer_name: '', customer_phone: '', customer_email: '', seats: 1, notes: '', experience_name: '' })}
                  >
                    <Plus className="w-4 h-4 mr-1" />Aggiungi Nome al Registro
                  </Button>
                </div>
              )}

              {/* Lista prenotazioni */}
              {(checkinLog.bookings_snapshot || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  Nessuna prenotazione in questa lista
                </div>
              ) : (
                <div className="space-y-2">
                  {(checkinLog.bookings_snapshot || []).map((b) => (
                    <div key={b.booking_id} className={`border rounded-lg p-3 transition ${b.checked_in ? 'bg-emerald-50 border-emerald-300' : b.is_free_entry ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="secondary" className={`font-mono text-[10px] ${b.is_free_entry ? 'bg-violet-600 text-white' : ''}`}>{b.is_free_entry ? '👤 LIBERO' : b.booking_ref}</Badge>
                            {b.checked_in && <Badge className="bg-emerald-600 text-white text-[10px]">✓ Imbarcato</Badge>}
                            {b.agency_name && <Badge variant="outline" className="text-[10px]">🏢 {b.agency_name}</Badge>}
                          </div>
                          <div className="font-semibold text-sm">{b.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                            {b.experience_name && <span>📦 {b.experience_name}</span>}
                            <span><Users className="w-3 h-3 inline" /> {b.seats} pax</span>
                            {b.customer_phone && <span>📞 {b.customer_phone}</span>}
                            {b.customer_email && <span className="truncate">✉ {b.customer_email}</span>}
                          </div>
                          {b.notes && <div className="text-xs mt-1 text-amber-700">📝 {b.notes}</div>}
                          {b.checked_in_at && (
                            <div className="text-[10px] text-emerald-700 mt-1">
                              Imbarco: {new Date(b.checked_in_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant={b.checked_in ? 'outline' : 'default'}
                            className={b.checked_in ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
                            disabled={checkinLog.status === 'CLOSED'}
                            onClick={() => toggleCheckin(checkinLog.id, b.booking_id, !b.checked_in)}
                          >
                            {b.checked_in ? '↶ Annulla' : '✓ Check-in'}
                          </Button>
                          {b.is_free_entry && checkinLog.status !== 'CLOSED' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9"
                              onClick={() => removeFreeEntry(b.booking_id, b.customer_name)}
                              title="Rimuovi nome dal registro"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinLog(null)}>Chiudi finestra</Button>
            {checkinLog?.status !== 'CLOSED' && checkinLog?.status !== 'COMPLETED' && (
              <>
                <Button onClick={closeLog} disabled={checkinSaving} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                  {checkinSaving ? 'Salvataggio…' : '🔒 Chiudi Registro'}
                </Button>
                <Button onClick={endTripWithEmail} disabled={checkinSaving} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {checkinSaving ? 'Invio…' : '🏁 Fine + Email Grazie'}
                </Button>
              </>
            )}
            {checkinLog?.status === 'COMPLETED' && (
              <Badge className="bg-rose-100 text-rose-700">🏁 Esperienza Terminata · Email Inviate</Badge>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ====== DIALOG: Contratto Noleggio (modifica + genera PDF) ====== */}
      <Dialog open={!!contractDialog} onOpenChange={(o) => !o && setContractDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-violet-600" />Contratto Noleggio con Conducente</DialogTitle>
            <DialogDescription>
              Modifica i dati prima di generare il PDF. Premi &quot;Genera PDF&quot; per scaricare il contratto.
            </DialogDescription>
          </DialogHeader>
          {contractDialog && (
            <div className="space-y-4">
              {/* Dati Ditta */}
              <fieldset className="border rounded-lg p-3">
                <legend className="text-xs font-semibold px-2 text-violet-700">🏢 Dati Ditta (intestazione)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Ragione Sociale</Label>
                    <Input value={contractDialog.company.name} onChange={(e) => setContractDialog({ ...contractDialog, company: { ...contractDialog.company, name: e.target.value } })} placeholder="ICHNOS DI BACHISIO CONGIO" />
                  </div>
                  <div>
                    <Label className="text-xs">P.IVA</Label>
                    <Input value={contractDialog.company.vat_number} onChange={(e) => setContractDialog({ ...contractDialog, company: { ...contractDialog.company, vat_number: e.target.value } })} placeholder="01568460917" />
                  </div>
                  <div>
                    <Label className="text-xs">Codice Attività</Label>
                    <Input value={contractDialog.company.activity_code} onChange={(e) => setContractDialog({ ...contractDialog, company: { ...contractDialog.company, activity_code: e.target.value } })} placeholder="E1120 - TRASPORTI COSTIERI..." />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Sede Legale</Label>
                    <Input value={contractDialog.company.address} onChange={(e) => setContractDialog({ ...contractDialog, company: { ...contractDialog.company, address: e.target.value } })} placeholder="VIA A. GRAMSCI, 4 - 08020 ONIFAI" />
                  </div>
                </div>
              </fieldset>

              {/* Dati Contratto */}
              <fieldset className="border rounded-lg p-3">
                <legend className="text-xs font-semibold px-2 text-violet-700">📝 Dati Contratto</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">N° Contratto</Label>
                    <Input value={contractDialog.contract_number} onChange={(e) => setContractDialog({ ...contractDialog, contract_number: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input value={contractDialog.contract_date} onChange={(e) => setContractDialog({ ...contractDialog, contract_date: e.target.value })} placeholder="dd/mm/yyyy" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Itinerario concordato</Label>
                    <Input value={contractDialog.itinerary} onChange={(e) => setContractDialog({ ...contractDialog, itinerary: e.target.value })} placeholder="Es. Tour Golfo di Orosei - Cala Luna, Cala Sisine" />
                  </div>
                  <div>
                    <Label className="text-xs">Miglia</Label>
                    <Input value={contractDialog.miglia} onChange={(e) => setContractDialog({ ...contractDialog, miglia: e.target.value })} placeholder="25" />
                  </div>
                  <div>
                    <Label className="text-xs">Durata</Label>
                    <Input value={contractDialog.durata} onChange={(e) => setContractDialog({ ...contractDialog, durata: e.target.value })} placeholder="8 ore" />
                  </div>
                  <div>
                    <Label className="text-xs">Totale turisti imbarcati</Label>
                    <Input value={contractDialog.totale_turisti} onChange={(e) => setContractDialog({ ...contractDialog, totale_turisti: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Prezzo (€) pattuito</Label>
                    <Input value={contractDialog.prezzo} onChange={(e) => setContractDialog({ ...contractDialog, prezzo: e.target.value })} placeholder="850,00" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unità da diporto n°</Label>
                    <Input value={contractDialog.unita_diporto_numero} onChange={(e) => setContractDialog({ ...contractDialog, unita_diporto_numero: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Adulti</Label>
                    <Input value={contractDialog.adulti} onChange={(e) => setContractDialog({ ...contractDialog, adulti: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Bambini</Label>
                    <Input value={contractDialog.bambini} onChange={(e) => setContractDialog({ ...contractDialog, bambini: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              {/* Lista Passeggeri (editabile) */}
              <fieldset className="border rounded-lg p-3">
                <legend className="text-xs font-semibold px-2 text-violet-700">👥 I Noleggianti ({contractDialog.passengers.length})</legend>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {contractDialog.passengers.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded p-2">
                      <div className="col-span-5">
                        <Label className="text-[10px]">Nome e Cognome #{i+1}</Label>
                        <Input value={p.name} className="h-8 text-xs"
                          onChange={(e) => setContractDialog({ ...contractDialog, passengers: contractDialog.passengers.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[10px]">Telefono</Label>
                        <Input value={p.phone} className="h-8 text-xs"
                          onChange={(e) => setContractDialog({ ...contractDialog, passengers: contractDialog.passengers.map((x, j) => j === i ? { ...x, phone: e.target.value } : x) })} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[10px]">Note</Label>
                        <Input value={p.notes || ''} className="h-8 text-xs"
                          onChange={(e) => setContractDialog({ ...contractDialog, passengers: contractDialog.passengers.map((x, j) => j === i ? { ...x, notes: e.target.value } : x) })} />
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 col-span-1"
                        onClick={() => setContractDialog({ ...contractDialog, passengers: contractDialog.passengers.filter((_, j) => j !== i) })}>
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-2 border-dashed"
                  onClick={() => setContractDialog({ ...contractDialog, passengers: [...contractDialog.passengers, { name: '', phone: '', notes: '' }] })}>
                  <Plus className="w-3 h-3 mr-1" />Aggiungi passeggero
                </Button>
              </fieldset>

              <div>
                <Label className="text-xs">Note libere</Label>
                <Input value={contractDialog.notes} onChange={(e) => setContractDialog({ ...contractDialog, notes: e.target.value })} placeholder="Eventuali note aggiuntive" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(null)}>Annulla</Button>
            <Button onClick={generateContract} className="bg-violet-600 hover:bg-violet-700">
              <Download className="w-4 h-4 mr-1" />Genera PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== DIALOG: Aggiungi Nome Libero ====== */}
      <Dialog open={!!freeEntryDialog} onOpenChange={(o) => !o && setFreeEntryDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-violet-600" />Aggiungi Nome al Registro</DialogTitle>
            <DialogDescription>
              Aggiungi manualmente un passeggero non legato a una prenotazione (walk-in, ospite gratuito, ecc.).
            </DialogDescription>
          </DialogHeader>
          {freeEntryDialog && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome e Cognome *</Label>
                <Input autoFocus value={freeEntryDialog.customer_name} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, customer_name: e.target.value })} placeholder="Es. Mario Rossi" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Telefono</Label>
                  <Input value={freeEntryDialog.customer_phone} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, customer_phone: e.target.value })} placeholder="+39…" />
                </div>
                <div>
                  <Label className="text-xs">Numero passeggeri</Label>
                  <Input type="number" min="1" value={freeEntryDialog.seats} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, seats: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={freeEntryDialog.customer_email} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, customer_email: e.target.value })} placeholder="mario@example.com" />
              </div>
              <div>
                <Label className="text-xs">Esperienza / Tratta (opz.)</Label>
                <Input value={freeEntryDialog.experience_name} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, experience_name: e.target.value })} placeholder="Tour Golfo di Orosei" />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={freeEntryDialog.notes} onChange={(e) => setFreeEntryDialog({ ...freeEntryDialog, notes: e.target.value })} placeholder="Es. walk-in pagato cash" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreeEntryDialog(null)}>Annulla</Button>
            <Button onClick={submitFreeEntry} className="bg-violet-600 hover:bg-violet-700">Aggiungi al Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
