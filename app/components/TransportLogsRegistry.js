'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, Anchor, Users, Search, RefreshCw, FileSpreadsheet, X, Filter } from 'lucide-react';

/**
 * Registro Trasportati - vista admin con filtri per data, esperienza, risorsa.
 * Mostra tutti i Transport Logs generati dagli skipper (giornalieri per risorsa).
 */
export default function TransportLogsRegistry({ companyId, companies = [] }) {
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtri
  const [filterDate, setFilterDate] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [filterExperience, setFilterExperience] = useState('all');
  const [filterSkipper, setFilterSkipper] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
    setFilterSkipper('all');
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
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(log)}>
                      <Download className="w-4 h-4 mr-1" />PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
