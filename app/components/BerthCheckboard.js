'use client';
/**
 * BerthCheckboard — Vista "Check Box"
 * Mostra una griglia compatta mese-per-mese con lo stato di ogni posto barca:
 *  - Righe = posti barca (ordinati per pontile + posizione)
 *  - Colonne = giorni (raggruppati per mese)
 *  - Celle colorate per stato (libero/standby/contratto/in liberazione/transito)
 *
 * Dati: berths (con current_occupation) + marina_bookings (CONTRACT, STANDBY).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function computeBerthDayStatus(berth, dateStr, bookings) {
  // 1) Contratto attivo
  const contractBooking = bookings.find(b =>
    b.berth_id === berth.id &&
    b.status === 'CONTRACT' &&
    dateStr >= (b.start_date || '') &&
    dateStr <= (b.end_date || '')
  );
  if (contractBooking) {
    if (dateStr === contractBooking.end_date) return { status: 'releasing', booking: contractBooking };
    if (contractBooking.is_transit) return { status: 'transit', booking: contractBooking };
    return { status: 'contract', booking: contractBooking };
  }
  // 2) Standby pendente con assegnazione
  const standby = bookings.find(b =>
    b.berth_id === berth.id &&
    b.standby_occupation_id &&
    ['PENDING', 'CONFIRMED', 'DEPOSIT_PAID'].includes(b.status) &&
    dateStr >= (b.start_date || '') &&
    dateStr <= (b.end_date || '')
  );
  if (standby) return { status: 'standby', booking: standby };
  // 3) Occupazione legacy
  const occ = berth.current_occupation;
  if (occ && occ.start_date && occ.end_date && dateStr >= occ.start_date && dateStr <= occ.end_date) {
    if (occ.is_standby === true) return { status: 'standby', booking: occ };
    if (occ.is_transit === true) return { status: 'transit', booking: occ };
    if (dateStr === occ.end_date) return { status: 'releasing', booking: occ };
    return { status: 'contract', booking: occ };
  }
  return { status: 'free', booking: null };
}

const STATUS_COLORS = {
  free: '#10b981',       // emerald-500
  standby: '#facc15',    // yellow-400
  releasing: '#f59e0b',  // amber-500
  contract: '#ef4444',   // red-500
  transit: '#8b5cf6',    // violet-500
};

const STATUS_LABEL = {
  free: 'Libero',
  standby: 'Standby (in attesa contratto)',
  releasing: 'In Liberazione',
  contract: 'Contratto',
  transit: 'Transito',
};

export default function BerthCheckboard({ marinaFilterId }) {
  const [marinas, setMarinas] = useState([]);
  const [selectedMarinaId, setSelectedMarinaId] = useState('');
  const [berths, setBerths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [monthsCount, setMonthsCount] = useState(3); // mostra 3 mesi default
  const [hover, setHover] = useState(null); // { berth, date, status, booking }

  // Carica marine
  useEffect(() => {
    fetch('/api/marinas').then(r => r.json()).then(data => {
      const arr = Array.isArray(data) ? data : [];
      setMarinas(arr);
      // Se filtro globale è settato e valido, usalo
      if (marinaFilterId && marinaFilterId !== 'ALL' && arr.some(m => m.id === marinaFilterId)) {
        setSelectedMarinaId(marinaFilterId);
      } else if (arr.length > 0) {
        setSelectedMarinaId(arr[0].id);
      }
    });
  }, [marinaFilterId]);

  // Carica berths + bookings al cambio marina
  const load = useCallback(async () => {
    if (!selectedMarinaId) return;
    setLoading(true);
    try {
      const [bRes, bkRes] = await Promise.all([
        fetch(`/api/berths?marina_id=${selectedMarinaId}`),
        fetch(`/api/marina-bookings?marina_id=${selectedMarinaId}`),
      ]);
      const bData = await bRes.json();
      const bkData = await bkRes.json();
      setBerths(Array.isArray(bData) ? bData : []);
      setBookings(Array.isArray(bkData) ? bkData : []);
    } catch (e) {
      toast.error('Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, [selectedMarinaId]);

  useEffect(() => { load(); }, [load]);

  // Genera l'array di giorni da visualizzare (dal startDate per monthsCount mesi)
  const days = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(start.getFullYear(), start.getMonth() + monthsCount, 0); // ultimo giorno mese finale
    const result = [];
    let cur = new Date(start);
    while (cur <= end) {
      result.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return result;
  }, [startDate, monthsCount]);

  // Raggruppa giorni per mese per il header
  const monthGroups = useMemo(() => {
    const groups = [];
    let curMonth = null;
    days.forEach((d) => {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!curMonth || curMonth.key !== k) {
        curMonth = { key: k, label: `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`, count: 0 };
        groups.push(curMonth);
      }
      curMonth.count += 1;
    });
    return groups;
  }, [days]);

  // Ordina i berths per pontile + posizione
  const sortedBerths = useMemo(() => {
    return [...berths].sort((a, b) => {
      if (a.pontoon !== b.pontoon) return Number(a.pontoon) - Number(b.pontoon);
      if (a.side !== b.side) return (a.side || '').localeCompare(b.side || '');
      return Number(a.position) - Number(b.position);
    });
  }, [berths]);

  // Precompute status map: berthId -> dateStr -> {status, booking}
  const statusMap = useMemo(() => {
    const map = new Map();
    sortedBerths.forEach(b => {
      const dayStatus = new Map();
      days.forEach(d => {
        const ds = toISODate(d);
        dayStatus.set(ds, computeBerthDayStatus(b, ds, bookings));
      });
      map.set(b.id, dayStatus);
    });
    return map;
  }, [sortedBerths, days, bookings]);

  // Statistiche globali (cell-based)
  const stats = useMemo(() => {
    const counts = { free: 0, standby: 0, releasing: 0, contract: 0, transit: 0 };
    statusMap.forEach((dayMap) => {
      dayMap.forEach((v) => {
        counts[v.status] = (counts[v.status] || 0) + 1;
      });
    });
    const total = sortedBerths.length * days.length;
    const occupied = counts.contract + counts.transit + counts.standby + counts.releasing;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { ...counts, total, occupancyPct };
  }, [statusMap, sortedBerths.length, days.length]);

  const shiftStart = (months) => {
    const d = new Date(startDate + 'T00:00:00');
    d.setMonth(d.getMonth() + months);
    setStartDate(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)));
  };
  const goToday = () => {
    const t = new Date();
    setStartDate(toISODate(new Date(t.getFullYear(), t.getMonth(), 1)));
  };

  const CELL_W = 12; // px
  const CELL_H = 18; // px

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalIcon className="w-5 h-5 text-blue-600" /> Check Box — Mappa Stato Multi-Mese
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label className="text-xs">Marina</Label>
              <Select value={selectedMarinaId} onValueChange={setSelectedMarinaId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleziona marina..." /></SelectTrigger>
                <SelectContent>
                  {marinas.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mese di Partenza</Label>
              <Input
                type="month"
                className="h-9"
                value={startDate.slice(0, 7)}
                onChange={(e) => setStartDate(`${e.target.value}-01`)}
              />
            </div>
            <div>
              <Label className="text-xs">N° Mesi da mostrare</Label>
              <Select value={String(monthsCount)} onValueChange={(v) => setMonthsCount(Number(v))}>
                <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mese</SelectItem>
                  <SelectItem value="2">2 mesi</SelectItem>
                  <SelectItem value="3">3 mesi</SelectItem>
                  <SelectItem value="4">4 mesi</SelectItem>
                  <SelectItem value="6">6 mesi</SelectItem>
                  <SelectItem value="12">12 mesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 ml-auto">
              <Button variant="outline" size="sm" onClick={() => shiftStart(-monthsCount)} title="Indietro"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>📍 Oggi</Button>
              <Button variant="outline" size="sm" onClick={() => shiftStart(monthsCount)} title="Avanti"><ChevronRight className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Aggiorna</Button>
            </div>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
            <div className="rounded border-2 border-emerald-300 p-2"><p className="text-xs uppercase">Libero</p><p className="text-lg font-bold text-emerald-600">{stats.free}</p></div>
            <div className="rounded border-2 border-yellow-300 p-2"><p className="text-xs uppercase">Standby</p><p className="text-lg font-bold text-yellow-600">{stats.standby}</p></div>
            <div className="rounded border-2 border-amber-400 p-2"><p className="text-xs uppercase">In Liberazione</p><p className="text-lg font-bold text-amber-600">{stats.releasing}</p></div>
            <div className="rounded border-2 border-red-300 p-2"><p className="text-xs uppercase">Contratto</p><p className="text-lg font-bold text-red-600">{stats.contract}</p></div>
            <div className="rounded border-2 border-violet-300 p-2"><p className="text-xs uppercase">Transito</p><p className="text-lg font-bold text-violet-600">{stats.transit}</p></div>
            <div className="rounded border-2 border-blue-300 p-2"><p className="text-xs uppercase">Occupazione</p><p className="text-lg font-bold text-blue-600">{stats.occupancyPct}%</p></div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold">Legenda:</span>
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block rounded-sm border border-slate-300" style={{ width: 14, height: 14, background: STATUS_COLORS[k] }} />
                {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tooltip hover */}
      {hover && (
        <div className="fixed top-3 right-3 z-50 bg-white shadow-lg rounded-md border border-blue-200 p-3 text-xs max-w-sm">
          <div className="font-bold text-blue-800">{hover.berth.label}{hover.berth.pontoon ? ` · Pontile ${hover.berth.pontoon}` : ''}</div>
          <div className="text-muted-foreground">{hover.date}</div>
          <div className="mt-1"><span className="font-semibold">Stato:</span> <span style={{ color: STATUS_COLORS[hover.status] }}>{STATUS_LABEL[hover.status]}</span></div>
          {hover.booking && (
            <div className="mt-1 space-y-0.5">
              {hover.booking.customer?.name && <div>👤 {hover.booking.customer.name} {hover.booking.customer.surname || ''}</div>}
              {hover.booking.boat?.name && <div>⛵ {hover.booking.boat.name}{hover.booking.boat.length ? ` (${hover.booking.boat.length}m)` : ''}</div>}
              {hover.booking.start_date && hover.booking.end_date && (
                <div>📅 {hover.booking.start_date} → {hover.booking.end_date}</div>
              )}
              {hover.booking.booking_number && <div className="font-mono">N° {hover.booking.booking_number}</div>}
            </div>
          )}
        </div>
      )}

      {/* Griglia */}
      <Card>
        <CardContent className="p-3">
          {loading ? (
            <div className="text-center py-10"><RefreshCw className="w-6 h-6 mx-auto animate-spin" /></div>
          ) : !selectedMarinaId ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Seleziona una marina per visualizzare la Check Box.</div>
          ) : sortedBerths.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Nessun posto barca per questa marina.</div>
          ) : (
            <div className="overflow-auto border rounded" style={{ maxHeight: '70vh' }}>
              <table className="text-xs" style={{ borderCollapse: 'collapse' }}>
                {/* Header mesi */}
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="bg-slate-800 text-white px-2 py-1 sticky left-0 z-20 border-b border-r border-slate-700 whitespace-nowrap" style={{ minWidth: 110 }}>Posto</th>
                    {monthGroups.map((mg, i) => (
                      <th
                        key={i}
                        className="bg-slate-700 text-white text-center px-1 py-1 border-b border-r border-slate-600 font-semibold whitespace-nowrap"
                        colSpan={mg.count}
                        style={{ minWidth: mg.count * CELL_W }}
                      >
                        {mg.label}
                      </th>
                    ))}
                  </tr>
                  {/* Header giorni */}
                  <tr>
                    <th className="bg-slate-100 px-2 py-0.5 sticky left-0 z-20 border-b border-r border-slate-300 text-[10px]" style={{ minWidth: 110 }}>Giorno →</th>
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = toISODate(d) === toISODate(new Date());
                      return (
                        <th
                          key={i}
                          className={`text-center px-0 py-0.5 border-b border-r border-slate-200 text-[8px] font-normal ${isWeekend ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-white text-slate-500'} ${isToday ? 'ring-1 ring-orange-400' : ''}`}
                          style={{ minWidth: CELL_W, maxWidth: CELL_W, width: CELL_W }}
                          title={toISODate(d)}
                        >
                          {d.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedBerths.map((berth) => {
                    const dayMap = statusMap.get(berth.id);
                    return (
                      <tr key={berth.id}>
                        <td className="bg-slate-50 sticky left-0 z-10 border-b border-r border-slate-200 px-2 py-0.5 whitespace-nowrap font-mono text-[10px]" style={{ minWidth: 110 }}>
                          <span className="font-semibold">{berth.label}</span>
                          <span className="text-muted-foreground ml-1">P{berth.pontoon}</span>
                        </td>
                        {days.map((d, i) => {
                          const ds = toISODate(d);
                          const v = dayMap?.get(ds) || { status: 'free', booking: null };
                          const bg = STATUS_COLORS[v.status] || '#e5e7eb';
                          return (
                            <td
                              key={i}
                              className="border-r border-b border-slate-200 p-0 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:z-10 transition-all"
                              style={{ width: CELL_W, height: CELL_H, background: bg, minWidth: CELL_W }}
                              onMouseEnter={() => setHover({ berth, date: ds, status: v.status, booking: v.booking })}
                              onMouseLeave={() => setHover(null)}
                              title={`${berth.label} · ${ds} · ${STATUS_LABEL[v.status]}`}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
