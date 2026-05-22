'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Calendar as CalIcon, Anchor, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Calendar view per posti barca - stile Locazioni Brevi
 * Mostra una matrice berth × giorni con stato giornaliero:
 *  - Verde:   libero
 *  - Giallo:  STANDBY (pre-assegnazione in attesa contratto)
 *  - Ambra:   in liberazione (ultimo giorno)
 *  - Rosso:   occupato (contratto attivo)
 */
export default function MarinaBerthCalendar({ currentUser, marinaFilterId }) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [marinas, setMarinas] = useState([]);
  // marinaFilterId può essere 'ALL' (filtro globale "tutte le marine") — non lo usiamo come selezione singola
  const initialMarinaId = (marinaFilterId && marinaFilterId !== 'ALL') ? marinaFilterId : '';
  const [selectedMarinaId, setSelectedMarinaId] = useState(initialMarinaId);
  const [berths, setBerths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  const [startOffset, setStartOffset] = useState(0);
  const [pontoonFilter, setPontoonFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | FREE | STANDBY | OCCUPIED

  // Sync marina filter from parent (se passato)
  useEffect(() => {
    if (marinaFilterId && marinaFilterId !== 'ALL') setSelectedMarinaId(marinaFilterId);
  }, [marinaFilterId]);

  // Carica marine
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (!isSuperAdmin && currentUser?.company_id) params.set('company_id', currentUser.company_id);
        const r = await fetch(`/api/marinas?${params.toString()}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        setMarinas(list);
        // Auto-seleziona la prima se nessuna selezionata (usando functional setter per evitare closure stale)
        if (list.length > 0) {
          setSelectedMarinaId(prev => {
            // Se c'è già un id selezionato VALIDO (presente nella lista) lo manteniamo
            if (prev && list.some(m => m.id === prev)) return prev;
            return list[0].id;
          });
        } else {
          setSelectedMarinaId('');
        }
      } catch (e) {
        toast.error('Errore caricamento marine: ' + (e.message || ''));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, currentUser?.company_id]);

  // Carica berths + bookings della marina selezionata
  const load = useCallback(async () => {
    if (!selectedMarinaId) {
      setBerths([]);
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const bParams = new URLSearchParams();
      if (!isSuperAdmin && currentUser?.company_id) bParams.set('company_id', currentUser.company_id);
      const [berthsRes, bookingsRes] = await Promise.all([
        fetch(`/api/berths?marina_id=${selectedMarinaId}`),
        fetch(`/api/marina-bookings?${bParams.toString()}`),
      ]);
      const bData = await berthsRes.json();
      const bkData = await bookingsRes.json();
      setBerths(Array.isArray(bData) ? bData : []);
      setBookings(Array.isArray(bkData) ? bkData.filter(b => b.marina_id === selectedMarinaId) : []);
    } catch (e) {
      toast.error('Errore caricamento dati: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMarinaId, isSuperAdmin, currentUser?.company_id]);

  useEffect(() => { load(); }, [load]);

  // Genera giorni della finestra
  const days = useMemo(() => {
    const arr = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + startOffset);
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [windowDays, startOffset]);

  // Pontile uniques (per filtro)
  const pontoons = useMemo(() => {
    const s = new Set();
    berths.forEach(b => b.pontoon && s.add(b.pontoon));
    return Array.from(s).sort();
  }, [berths]);

  // Per ogni berth, calcola map { dateStr: status }
  // Status: 'free' | 'standby' | 'occupied' | 'releasing'
  const berthStatusMap = useMemo(() => {
    const map = {};
    for (const berth of berths) {
      const dayMap = {};
      for (const day of days) {
        const dateStr = day.toISOString().slice(0, 10);
        dayMap[dateStr] = computeBerthStatusForDay(berth, dateStr, bookings);
      }
      map[berth.id] = dayMap;
    }
    return map;
  }, [berths, days, bookings]);

  // Filtra berths in base ai filtri attivi
  const filteredBerths = useMemo(() => {
    let list = berths;
    if (pontoonFilter !== 'ALL') {
      list = list.filter(b => b.pontoon === pontoonFilter);
    }
    if (statusFilter !== 'ALL') {
      // Filtra berths che hanno almeno un giorno con lo stato selezionato
      list = list.filter(b => {
        const dayMap = berthStatusMap[b.id] || {};
        return Object.values(dayMap).some(s => s === statusFilter.toLowerCase());
      });
    }
    return [...list].sort((a, b) => {
      const pa = (a.pontoon || '') + (a.side || '') + String(a.position || '').padStart(3, '0');
      const pb = (b.pontoon || '') + (b.side || '') + String(b.position || '').padStart(3, '0');
      return pa.localeCompare(pb);
    });
  }, [berths, pontoonFilter, statusFilter, berthStatusMap]);

  // Stats giornalieri visibili
  const stats = useMemo(() => {
    let free = 0, standby = 0, occupied = 0, releasing = 0;
    for (const berth of filteredBerths) {
      const dayMap = berthStatusMap[berth.id] || {};
      for (const s of Object.values(dayMap)) {
        if (s === 'free') free++;
        else if (s === 'standby') standby++;
        else if (s === 'occupied') occupied++;
        else if (s === 'releasing') releasing++;
      }
    }
    const total = free + standby + occupied + releasing;
    return { free, standby, occupied, releasing, total };
  }, [filteredBerths, berthStatusMap]);

  const selectedMarina = marinas.find(m => m.id === selectedMarinaId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <CalIcon className="w-4 h-4" /> Calendario Posti Barca
            {selectedMarina && <Badge variant="outline" className="ml-1">{selectedMarina.name}</Badge>}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {marinas.length > 0 && (
              <Select value={selectedMarinaId} onValueChange={setSelectedMarinaId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Seleziona marina" /></SelectTrigger>
                <SelectContent>
                  {marinas.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {pontoons.length > 1 && (
              <Select value={pontoonFilter} onValueChange={setPontoonFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti i pontili</SelectItem>
                  {pontoons.map(p => <SelectItem key={p} value={p}>Pontile {p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti gli stati</SelectItem>
                <SelectItem value="FREE">🟢 Solo Liberi</SelectItem>
                <SelectItem value="STANDBY">🟡 Solo Standby</SelectItem>
                <SelectItem value="OCCUPIED">🔴 Solo Occupati</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 giorni</SelectItem>
                <SelectItem value="30">30 giorni</SelectItem>
                <SelectItem value="60">60 giorni</SelectItem>
                <SelectItem value="90">90 giorni</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setStartOffset((s) => s - windowDays)} title="Indietro"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setStartOffset(0)} className={startOffset === 0 ? 'bg-blue-50' : ''}>Oggi</Button>
            <Button variant="outline" size="sm" onClick={() => setStartOffset((s) => s + windowDays)} title="Avanti"><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} title="Ricarica"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedMarinaId ? (
          <div className="text-center text-muted-foreground py-10">Seleziona una marina per visualizzare il calendario.</div>
        ) : loading && berths.length === 0 ? (
          <div className="text-center text-muted-foreground py-10"><RefreshCw className="w-6 h-6 inline animate-spin mr-2" />Caricamento posti…</div>
        ) : filteredBerths.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">Nessun posto barca disponibile con i filtri selezionati.</div>
        ) : (
          <>
            {/* Mini stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 border rounded-sm" />Liberi: <b>{stats.free}</b></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 border rounded-sm" />Standby: <b>{stats.standby}</b></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 border rounded-sm" />In liberazione: <b>{stats.releasing}</b></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 border rounded-sm" />Occupati: <b>{stats.occupied}</b></div>
              <div className="text-muted-foreground">· Tasso occupazione: <b>{stats.total ? Math.round(((stats.occupied + stats.standby + stats.releasing) / stats.total) * 100) : 0}%</b></div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="border-collapse text-xs w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white z-20 text-left p-2 border-r border-b min-w-[160px]">Posto</th>
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={i}
                          className={`p-1 border text-center min-w-[28px] ${isWeekend ? 'bg-slate-100' : ''} ${isToday ? 'bg-amber-100 font-bold' : ''}`}
                        >
                          <div className="text-[9px] text-slate-500">{d.toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 2)}</div>
                          <div>{d.getDate()}</div>
                          {d.getDate() === 1 && (
                            <div className="text-[9px] text-slate-500">{d.toLocaleDateString('it-IT', { month: 'short' })}</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredBerths.map((berth) => {
                    const dayMap = berthStatusMap[berth.id] || {};
                    return (
                      <tr key={berth.id} className="hover:bg-slate-50">
                        <td className="sticky left-0 bg-white z-10 p-2 border-r font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Anchor className="w-3 h-3 text-blue-600" />
                            <span>{berth.label}</span>
                            <Badge variant="outline" className="text-[9px] ml-1">{berth.length_max}m</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">P{berth.pontoon} · {berth.side}</div>
                        </td>
                        {days.map((d, i) => {
                          const dateStr = d.toISOString().slice(0, 10);
                          const status = dayMap[dateStr] || 'free';
                          let cellClass = 'bg-emerald-500';
                          let title = `${berth.label} · ${dateStr} · LIBERO`;
                          if (status === 'standby') {
                            cellClass = 'bg-yellow-400';
                            const occ = berth.current_occupation;
                            title = `${berth.label} · ${dateStr} · ⏳ STANDBY · ${occ?.customer?.name || ''} ${occ?.customer?.surname || ''} (${occ?.booking_number || ''})`;
                          } else if (status === 'releasing') {
                            cellClass = 'bg-amber-500';
                            const occ = berth.current_occupation;
                            title = `${berth.label} · ${dateStr} · IN LIBERAZIONE · ${occ?.customer?.name || ''} ${occ?.customer?.surname || ''}`;
                          } else if (status === 'occupied') {
                            cellClass = 'bg-red-500';
                            const info = findBookingForBerthAndDay(berth, dateStr, bookings);
                            title = `${berth.label} · ${dateStr} · OCCUPATO · ${info?.customer?.name || berth.current_occupation?.customer?.name || ''} ${info?.customer?.surname || berth.current_occupation?.customer?.surname || ''}`;
                          }
                          return <td key={i} className={`p-0 border ${cellClass} cursor-help hover:opacity-75 transition`} title={title} style={{ height: 28 }} />;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
              <span className="font-semibold">Legenda:</span>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-emerald-500 border" />Disponibile</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-yellow-400 border" />⏳ Standby (pre-assegnato)</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-amber-500 border" />In liberazione</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 border" />Occupato (contratto)</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Calcola lo stato giornaliero di un berth in una specifica data.
 * Considera:
 *  - current_occupation del berth (può essere standby o occupied)
 *  - marina_bookings con berth_id che fanno overlap di date
 */
function computeBerthStatusForDay(berth, dateStr, bookings) {
  // 1) Check booking attivo (CONTRACT) per quel berth in quel giorno
  const contractBooking = bookings.find(b =>
    b.berth_id === berth.id &&
    b.status === 'CONTRACT' &&
    dateStr >= (b.start_date || '') &&
    dateStr <= (b.end_date || '')
  );
  if (contractBooking) {
    // Ultimo giorno = releasing
    if (dateStr === contractBooking.end_date) return 'releasing';
    return 'occupied';
  }

  // 2) Check STANDBY booking (PENDING/CONFIRMED/DEPOSIT_PAID) con berth_id
  const standbyBooking = bookings.find(b =>
    b.berth_id === berth.id &&
    b.standby_occupation_id &&
    ['PENDING', 'CONFIRMED', 'DEPOSIT_PAID'].includes(b.status) &&
    dateStr >= (b.start_date || '') &&
    dateStr <= (b.end_date || '')
  );
  if (standbyBooking) return 'standby';

  // 3) Fallback: current_occupation del berth (occupazione legacy non collegata a marina_booking)
  const occ = berth.current_occupation;
  if (occ && occ.start_date && occ.end_date) {
    if (dateStr >= occ.start_date && dateStr <= occ.end_date) {
      if (occ.is_standby === true) return 'standby';
      // ultimo giorno = releasing
      if (dateStr === occ.end_date) return 'releasing';
      return 'occupied';
    }
  }

  return 'free';
}

function findBookingForBerthAndDay(berth, dateStr, bookings) {
  return bookings.find(b =>
    b.berth_id === berth.id &&
    dateStr >= (b.start_date || '') &&
    dateStr <= (b.end_date || '')
  );
}
