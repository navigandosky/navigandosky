'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Anchor, LogIn, LogOut, RefreshCw, Calendar, Users, Phone, Check, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { downloadTransportLogPdf } from '@/app/lib/transportLogPdf';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function SkipperDashboard() {
  const [skipper, setSkipper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(todayISO());
  const [groups, setGroups] = useState([]);
  const [company, setCompany] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [closing, setClosing] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Restore session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('skipper_session');
      if (stored) setSkipper(JSON.parse(stored));
    } catch {}
  }, []);

  // Load bookings when skipper or date changes
  const loadBookings = useCallback(async () => {
    if (!skipper) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/skipper-bookings?skipper_id=${skipper.id}&date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento');
      setGroups(data.groups || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [skipper, date]);

  useEffect(() => {
    if (skipper) loadBookings();
  }, [loadBookings, skipper]);

  // Load company info
  useEffect(() => {
    if (!skipper?.company_id) return;
    fetch(`/api/companies/${skipper.company_id}`).then(r => r.json()).then(setCompany).catch(() => {});
  }, [skipper]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_username: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenziali non valide');
      if (data.user.role !== 'SKIPPER') {
        throw new Error('Questo account non e\' uno skipper');
      }
      setSkipper(data.user);
      localStorage.setItem('skipper_session', JSON.stringify(data.user));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('skipper_session');
    setSkipper(null);
    setGroups([]);
  };

  // Check-in handler
  const handleSaveCheckin = async (bookingId, passengers, notes) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengers_checkin: passengers,
          checkin_notes: notes,
          checked_in_at: new Date().toISOString(),
          assigned_skipper_id: skipper.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore salvataggio check-in');
      }
      await loadBookings();
      setActiveBooking(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Genera e salva il PDF del giorno
  const handleCloseDay = async (group) => {
    if (!confirm('Chiudere la giornata e generare il PDF Registro Trasportati?')) return;
    setClosing(true);
    try {
      const totalPax = group.bookings.reduce((s, b) => s + (b.passengers_checkin?.length || b.seats || 0), 0);

      // Genera PDF locale (per download)
      const { generateTransportLogPdf } = await import('@/app/lib/transportLogPdf');
      const { dataUri, blob, filename } = await generateTransportLogPdf({
        resource: group.resource,
        skipper: skipper,
        date,
        bookings: group.bookings,
        company: company || {},
      });

      // Salva log nel DB (con PDF in base64)
      const res = await fetch('/api/transport-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: group.resource.id,
          resource_name: group.resource.name,
          resource_imei: group.resource.gps_imei || '',
          skipper_id: skipper.id,
          skipper_name: skipper.full_name || skipper.username,
          skipper_phone: skipper.phone || '',
          company_id: skipper.company_id,
          date,
          bookings_snapshot: group.bookings,
          total_passengers: totalPax,
          total_bookings: group.bookings.length,
          status: 'CLOSED',
          pdf_data: dataUri,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore salvataggio log');
      }

      // Download del PDF in locale
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      alert('Giornata chiusa e PDF generato con successo!');
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      setClosing(false);
    }
  };

  // === SCHERMATA LOGIN ===
  if (!skipper) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-600 text-white rounded-full p-3 w-fit mb-3">
              <Anchor className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Area Skipper</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Accedi per gestire i check-in dei tuoi passeggeri</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email o Username</Label>
                <Input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="skipper@maretrek.it"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? 'Accesso in corso...' : <><LogIn className="w-4 h-4 mr-2" /> Accedi</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === DASHBOARD SKIPPER ===
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Bar */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-6 h-6" />
            <div>
              <div className="font-semibold leading-tight">{skipper.full_name || skipper.username}</div>
              <div className="text-xs opacity-80">{company?.name || 'Skipper Maretrek'}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-800" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Esci
          </Button>
        </div>
      </header>

      {/* Toolbar data */}
      <div className="bg-white border-b shadow-sm px-4 py-3 sticky top-[60px] z-20">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button size="sm" variant="outline" onClick={loadBookings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nessuna prenotazione</p>
              <p className="text-sm">Non hai viaggi assegnati per questa data</p>
            </CardContent>
          </Card>
        )}

        {groups.map((group) => {
          const isExpanded = expandedGroup === group.resource.id;
          const totalPax = group.bookings.reduce((s, b) => s + (b.passengers_checkin?.length || b.seats || 0), 0);
          const checkedIn = group.bookings.filter((b) => b.checked_in_at).length;

          return (
            <Card key={group.resource.id} className="overflow-hidden">
              <CardHeader
                className="bg-gradient-to-r from-blue-50 to-cyan-50 cursor-pointer"
                onClick={() => setExpandedGroup(isExpanded ? null : group.resource.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Anchor className="w-4 h-4 text-blue-600" />
                      {group.resource.name}
                    </CardTitle>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="secondary">{group.bookings.length} prenotazioni</Badge>
                      <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />{totalPax} pax</Badge>
                      {checkedIn === group.bookings.length && group.bookings.length > 0 && (
                        <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Tutti check-in</Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-0">
                  <div className="divide-y">
                    {group.bookings.map((b) => (
                      <BookingRow
                        key={b.id}
                        booking={b}
                        onCheckIn={() => setActiveBooking(b)}
                      />
                    ))}
                  </div>

                  <div className="p-3 bg-slate-50 border-t">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleCloseDay(group)}
                      disabled={closing || group.bookings.length === 0}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {closing ? 'Generazione...' : 'Chiudi giornata e genera PDF'}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Check-in dialog */}
      {activeBooking && (
        <CheckinDialog
          booking={activeBooking}
          onClose={() => setActiveBooking(null)}
          onSave={(passengers, notes) => handleSaveCheckin(activeBooking.id, passengers, notes)}
          loading={loading}
        />
      )}
    </div>
  );
}

function BookingRow({ booking, onCheckIn }) {
  const t = booking.slot_datetime ? new Date(booking.slot_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-';
  const isCheckedIn = !!booking.checked_in_at;
  const paxCount = booking.passengers_checkin?.length || booking.seats || 0;

  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{t}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{booking.booking_ref}</span>
            {isCheckedIn && <Badge className="bg-green-600 text-xs"><Check className="w-3 h-3" /></Badge>}
          </div>
          <div className="font-semibold text-sm truncate">{booking.experience_name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <strong>{booking.customer_name}</strong> · {booking.customer_phone || 'no tel'} · {paxCount} pax
          </div>
        </div>
        <Button size="sm" variant={isCheckedIn ? 'outline' : 'default'} onClick={onCheckIn}>
          {isCheckedIn ? 'Modifica' : 'Check-in'}
        </Button>
      </div>
    </div>
  );
}

function CheckinDialog({ booking, onClose, onSave, loading }) {
  // Inizializza la lista passeggeri
  const initialPassengers = () => {
    if (booking.passengers_checkin && booking.passengers_checkin.length > 0) {
      return booking.passengers_checkin;
    }
    // Pre-popola con l'intestatario come primo passeggero
    const list = [{
      name: booking.customer_name?.split(' ')[0] || '',
      surname: booking.customer_name?.split(' ').slice(1).join(' ') || '',
      phone: booking.customer_phone || '',
      notes: '',
      is_holder: true,
    }];
    const seats = booking.seats || 1;
    for (let i = 1; i < seats; i++) {
      list.push({ name: '', surname: '', phone: '', notes: '' });
    }
    return list;
  };

  const [passengers, setPassengers] = useState(initialPassengers());
  const [notes, setNotes] = useState(booking.checkin_notes || '');

  const updatePax = (i, key, val) => {
    setPassengers((prev) => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
  };

  const addPax = () => {
    setPassengers((prev) => [...prev, { name: '', surname: '', phone: '', notes: '' }]);
  };

  const removePax = (i) => {
    setPassengers((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Check-in Passeggeri
          </DialogTitle>
        </DialogHeader>

        {/* Info prenotazione */}
        <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
          <div><strong>Tratta:</strong> {booking.experience_name}</div>
          <div><strong>Rif:</strong> <span className="font-mono">{booking.booking_ref}</span></div>
          <div><strong>Intestatario:</strong> {booking.customer_name}</div>
          {booking.customer_phone && <div><strong>Tel:</strong> {booking.customer_phone}</div>}
        </div>

        {/* Lista passeggeri */}
        <div className="space-y-3">
          <Label className="font-semibold">Passeggeri ({passengers.length})</Label>
          {passengers.map((p, i) => (
            <div key={i} className={`p-3 rounded-lg border ${p.is_holder ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {p.is_holder ? '★ Intestatario' : `Passeggero ${i + 1}`}
                </span>
                {!p.is_holder && (
                  <button type="button" className="text-red-500 text-xs" onClick={() => removePax(i)}>Rimuovi</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input
                  placeholder="Nome"
                  value={p.name}
                  onChange={(e) => updatePax(i, 'name', e.target.value)}
                />
                <Input
                  placeholder="Cognome"
                  value={p.surname}
                  onChange={(e) => updatePax(i, 'surname', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Telefono"
                  value={p.phone}
                  onChange={(e) => updatePax(i, 'phone', e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={addPax}>
            + Aggiungi passeggero
          </Button>
        </div>

        <div>
          <Label>Note generali</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuali note..."
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            onClick={() => onSave(passengers, notes)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-1" />
            {loading ? 'Salvataggio...' : 'Conferma Check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
