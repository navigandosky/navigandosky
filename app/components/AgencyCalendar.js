'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Users, MapPin, Ship, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); } catch { return '-'; } };
const fmtPrice = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

const GANTT_COLORS = {
  GITA_GOMMONE: 'bg-sky-50 border-sky-300 text-sky-900',
  GITA_BARCA: 'bg-blue-50 border-blue-300 text-blue-900',
  VISITA_GUIDATA: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  NOLEGGIO_NATANTE: 'bg-amber-50 border-amber-300 text-amber-900',
};

// Helper: ottiene il lunedì della settimana di una data
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function AgencyCalendar({ companyId, agencyId, experiences = [] }) {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [resources, setResources] = useState([]);
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // per visualizzare l'occupazione totale dello slot
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Calcola le 7 date della settimana
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekRange = useMemo(() => {
    const startStr = weekStart.toISOString().split('T')[0];
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    return { from: startStr, to: endDate.toISOString().split('T')[0] };
  }, [weekStart]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [resR, slotR, mineR, allR] = await Promise.all([
        fetch(`/api/resources?company_id=${companyId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch(`/api/slots?company_id=${companyId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        agencyId ? fetch(`/api/bookings?agency_id=${agencyId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => []) : Promise.resolve([]),
        fetch(`/api/bookings?company_id=${companyId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => []),
      ]);
      setResources(Array.isArray(resR) ? resR : []);
      // Filtra slot lato client per range settimanale corrente (start_datetime fra from e to)
      const slotsArr = Array.isArray(slotR) ? slotR : [];
      const filtered = slotsArr.filter(s => {
        const d = (s.start_datetime || '').split('T')[0];
        return d >= weekRange.from && d <= weekRange.to;
      });
      setSlots(filtered);
      setMyBookings(Array.isArray(mineR) ? mineR : []);
      setAllBookings(Array.isArray(allR) ? allR : []);
    } catch (e) {
      console.error('AgencyCalendar load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [companyId, agencyId, weekRange.from, weekRange.to]);

  const goPrev = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const goNext = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const myBookingSlotIds = useMemo(() => new Set(myBookings.map(b => b.slot_id)), [myBookings]);

  // Slot per (risorsa, giorno)
  const slotsByResourceDay = useMemo(() => {
    const map = new Map();
    slots.forEach(s => {
      const dateStr = (s.start_datetime || '').split('T')[0];
      (s.resource_ids || []).forEach(rid => {
        const key = `${rid}|${dateStr}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(s);
      });
    });
    return map;
  }, [slots]);

  const getExpName = (id) => experiences.find(e => e.id === id)?.name || 'Esperienza';
  const getExpType = (id) => experiences.find(e => e.id === id)?.type || '';

  // Conta posti occupati per uno slot da tutte le prenotazioni della company
  const seatsBookedForSlot = (slotId) => {
    return allBookings
      .filter(b => b.slot_id === slotId && ['CONFIRMED', 'HELD', 'PENDING_VERIFICATION'].includes(b.status))
      .reduce((s, b) => s + (Number(b.seats) || 0), 0);
  };

  const myBookingsForSlot = (slotId) => myBookings.filter(b => b.slot_id === slotId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalIcon className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle>Calendario Disponibilità</CardTitle>
              <CardDescription>
                Visualizza l'agenda settimanale degli slot. Le tue prenotazioni sono evidenziate in <span className="text-emerald-700 font-medium">verde</span>.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />Sett. Prec.
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-blue-600 font-semibold">Oggi</Button>
            <Button variant="outline" size="sm" onClick={goNext}>
              Sett. Succ.<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
        <div className="text-center font-serif text-2xl pt-3">
          {weekDates[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Caricamento calendario...</div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ship className="w-12 h-12 mx-auto mb-2 opacity-40" />
            Nessuna risorsa disponibile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 bg-muted/30 w-[180px]">Risorsa</th>
                  {weekDates.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} className={`p-2 text-center ${isToday ? 'bg-blue-50' : 'bg-muted/10'}`}>
                        <div className="text-xs text-muted-foreground">{WEEKDAYS[i]}</div>
                        <div className={`text-2xl font-bold ${isToday ? 'text-blue-700' : ''}`}>{d.getDate()}</div>
                        <div className="text-xs text-muted-foreground">{d.toLocaleDateString('it-IT', { month: 'short' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {resources.map(res => (
                  <tr key={res.id} className="border-b">
                    <td className="p-2 bg-muted/10 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {res.name?.[0] || 'R'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate" title={res.name}>{res.name}</div>
                          {res.capacity && <div className="text-[10px] text-muted-foreground">Cap: {res.capacity}</div>}
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d, i) => {
                      const dateStr = d.toISOString().split('T')[0];
                      const slotsToday = slotsByResourceDay.get(`${res.id}|${dateStr}`) || [];
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <td key={i} className={`p-1 align-top min-h-[80px] ${isToday ? 'bg-blue-50/30' : ''}`} style={{ minWidth: '110px' }}>
                          <div className="space-y-1">
                            {slotsToday.map(s => {
                              const type = getExpType(s.experience_id);
                              const gc = GANTT_COLORS[type] || 'bg-gray-50 border-gray-300 text-gray-900';
                              const totalSeats = res.capacity || 1;
                              const booked = seatsBookedForSlot(s.id);
                              const remaining = totalSeats - booked;
                              const myBks = myBookingsForSlot(s.id);
                              const isMine = myBks.length > 0;
                              const isFull = remaining <= 0;
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => setSelectedSlot(s)}
                                  className={`p-1.5 rounded border-2 text-[11px] cursor-pointer hover:shadow-md transition-all ${gc} ${isMine ? 'ring-2 ring-emerald-500 shadow' : ''}`}
                                  title={isMine ? 'Hai una prenotazione su questo slot' : ''}
                                >
                                  <div className="font-bold leading-tight truncate">{getExpName(s.experience_id)}</div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span>{fmtTime(s.start_datetime)}</span>
                                    {isMine && <Badge variant="secondary" className="bg-emerald-600 text-white border-0 text-[9px] px-1 py-0">TUA</Badge>}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                                    <span className={isFull ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                                      {booked}/{totalSeats}
                                    </span>
                                    {isFull && <AlertCircle className="w-3 h-3 text-red-600" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legenda */}
        <div className="flex items-center gap-3 mt-4 text-xs flex-wrap text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-50"></div>
            <span>Hai una prenotazione</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-sky-100"></div>
            <span>Gita Gommone</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100"></div>
            <span>Gita Barca</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-100"></div>
            <span>Visita Guidata</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100"></div>
            <span>Noleggio</span>
          </div>
        </div>
      </CardContent>

      {/* Dialog dettaglio slot */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => !o && setSelectedSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSlot && getExpName(selectedSlot.experience_id)}</DialogTitle>
            <DialogDescription>
              {selectedSlot && new Date(selectedSlot.start_datetime).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (() => {
            const myBks = myBookingsForSlot(selectedSlot.id);
            const booked = seatsBookedForSlot(selectedSlot.id);
            const totalSeats = (resources.find(r => (selectedSlot.resource_ids || []).includes(r.id)) || {}).capacity || 1;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border rounded p-2">
                    <div className="text-xs text-muted-foreground">Posti occupati</div>
                    <div className="font-bold text-lg">{booked} / {totalSeats}</div>
                  </div>
                  <div className="border rounded p-2">
                    <div className="text-xs text-muted-foreground">Disponibili</div>
                    <div className={`font-bold text-lg ${totalSeats - booked <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Math.max(0, totalSeats - booked)}</div>
                  </div>
                </div>
                {myBks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Le tue prenotazioni</div>
                    {myBks.map(b => (
                      <div key={b.id} className="border-2 border-emerald-300 bg-emerald-50 rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs">{b.booking_ref}</span> · <strong>{b.customer_name}</strong>
                          </div>
                          <Badge className="bg-emerald-600 text-white text-[10px]">{b.seats} posti</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status: <strong>{b.status}</strong> · Totale: <strong>{fmtPrice(b.total_amount || b.price_b2b)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {myBks.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-3">
                    Non hai prenotazioni su questo slot.
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
