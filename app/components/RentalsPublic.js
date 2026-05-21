'use client';
// Public Catalog + Detail + Booking Request for Locazioni Brevi (Short Rentals)
// Reuses shared backend at /api/rental-units, /api/rental-units/availability, /api/rental-bookings
// Two pages: RentalsCatalogPage (browse) and RentalDetailPage (book)

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Bike, Car, Home, Building2, Ship, MapPin, Users, BedDouble, Bath,
  Clock, Euro, ArrowLeft, Calendar as CalIcon, CheckCircle2, XCircle, Search, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'BIKE', label: 'Bici', icon: Bike, color: 'bg-emerald-100 text-emerald-800' },
  { value: 'CAR', label: 'Auto', icon: Car, color: 'bg-blue-100 text-blue-800' },
  { value: 'APARTMENT', label: 'Appartamento', icon: Building2, color: 'bg-amber-100 text-amber-800' },
  { value: 'VILLA', label: 'Villa', icon: Home, color: 'bg-purple-100 text-purple-800' },
  { value: 'BOAT', label: 'Barca', icon: Ship, color: 'bg-cyan-100 text-cyan-800' },
];

// Placeholder data-URI when no photo is uploaded (clean gradient, no random unsplash photo)
const buildPlaceholder = (category, label) => {
  const palette = {
    BIKE: { from: '#10b981', to: '#059669' },
    CAR: { from: '#3b82f6', to: '#1e40af' },
    APARTMENT: { from: '#f59e0b', to: '#b45309' },
    VILLA: { from: '#a855f7', to: '#6b21a8' },
    BOAT: { from: '#06b6d4', to: '#0e7490' },
  }[category] || { from: '#64748b', to: '#334155' };
  const safe = String(label || '').replace(/[<>&"]/g, '').slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.from}"/><stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient></defs>
    <rect width="800" height="400" fill="url(#g)"/>
    <text x="400" y="195" font-family="system-ui,sans-serif" font-size="42" font-weight="700" text-anchor="middle" fill="white" opacity="0.95">${safe}</text>
    <text x="400" y="240" font-family="system-ui,sans-serif" font-size="18" text-anchor="middle" fill="white" opacity="0.75">Foto in arrivo</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const DEFAULT_IMG = buildPlaceholder('BOAT', 'Locazione Breve');

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('it-IT') : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const catMeta = (c) => CATEGORIES.find((x) => x.value === c) || CATEGORIES[0];

const startingPrice = (u) => {
  if (Array.isArray(u.seasonal_pricing) && u.seasonal_pricing.length > 0) {
    const prices = u.seasonal_pricing.map((s) => Number(s.price_per_unit || 0)).filter((p) => p > 0);
    if (prices.length > 0) return { price: Math.min(...prices), isFromTiers: true };
  }
  return { price: Number(u.base_price || 0), isFromTiers: false };
};

// =====================================================================
// CATALOG PAGE
// =====================================================================
export function RentalsCatalogPage({ setView, rentalUnits = [], companies = [], companyBrand }) {
  const [catFilter, setCatFilter] = useState('ALL');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const sortFn = (a, b) => {
      const pa = Number(a.home_priority || 0);
      const pb = Number(b.home_priority || 0);
      if (pa > 0 && pb > 0) return pa - pb;
      if (pa > 0) return -1;
      if (pb > 0) return 1;
      return Number(b.base_price || 0) - Number(a.base_price || 0);
    };
    return rentalUnits.filter((u) => {
      if (catFilter !== 'ALL' && u.category !== catFilter) return false;
      if (q && !u.name?.toLowerCase().includes(q.toLowerCase()) && !u.location?.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort(sortFn);
  }, [rentalUnits, catFilter, q]);

  const brandName = companyBrand?.name || 'Maretrek';

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">🏖️ Locazioni Brevi</h1>
          <p className="text-lg opacity-90">
            Bici, Auto, Appartamenti, Ville e Barche per la tua vacanza in Sardegna
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome o località..." className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutte le categorie</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Category quick buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setCatFilter('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
              catFilter === 'ALL' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
            }`}
          >
            🌐 Tutte ({rentalUnits.length})
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const count = rentalUnits.filter((u) => u.category === c.value).length;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCatFilter(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition flex items-center gap-2 ${
                  catFilter === c.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nessuna unità disponibile per i filtri selezionati.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((u) => <UnitCard key={u.id} unit={u} onSelect={() => setView('rental-detail', { rentalUnit: u })} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function UnitCard({ unit, onSelect }) {
  const cm = catMeta(unit.category);
  const Icon = cm.icon;
  const sp = startingPrice(unit);
  const img = unit.images?.[0] || buildPlaceholder(unit.category, unit.name);
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition border-0 shadow" onClick={onSelect}>
      <div className="relative h-48">
        <img src={img} alt={unit.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = buildPlaceholder(unit.category, unit.name); }} />
        <div className="absolute top-3 left-3">
          <Badge className={cm.color}><Icon className="w-3 h-3 mr-1" />{cm.label}</Badge>
        </div>
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full font-bold text-teal-700 text-sm flex items-baseline gap-1">
          {sp.isFromTiers && <span className="text-[10px] font-normal opacity-75">da</span>}
          {fmtEur(sp.price)}
          <span className="text-[10px] font-normal">/{unit.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</span>
        </div>
      </div>
      <CardContent className="pt-4 space-y-2">
        <h3 className="font-bold text-lg leading-tight">{unit.name}</h3>
        {unit.location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />{unit.location}
          </div>
        )}
        <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">{unit.description || 'Nessuna descrizione disponibile.'}</p>
        {(unit.category === 'APARTMENT' || unit.category === 'VILLA') && (
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t">
            {unit.max_guests && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{unit.max_guests} ospiti</span>}
            {unit.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{unit.bedrooms}</span>}
            {unit.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{unit.bathrooms}</span>}
          </div>
        )}
        <Button className="w-full mt-2 bg-teal-600 hover:bg-teal-700">
          <CalIcon className="w-4 h-4 mr-2" /> Verifica disponibilità & Prenota
        </Button>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// DETAIL + BOOKING REQUEST PAGE
// =====================================================================
export function RentalDetailPage({ unit, setView }) {
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), unit?.duration_unit === 'NIGHTS' ? 2 : 1));
  const [quantity, setQuantity] = useState(1);
  const [guestsCount, setGuestsCount] = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', document_number: '', notes: '' });
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  if (!unit) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Unità non trovata.</p>
        <Button className="mt-4" onClick={() => setView('rentals')}><ArrowLeft className="w-4 h-4 mr-2" />Torna alle locazioni</Button>
      </div>
    );
  }

  const cm = catMeta(unit.category);
  const Icon = cm.icon;
  const isAccommodation = unit.category === 'APARTMENT' || unit.category === 'VILLA';
  const sp = startingPrice(unit);

  const checkAvailability = async () => {
    if (!startDate || !endDate || endDate <= startDate) {
      toast.error('Date non valide');
      return;
    }
    setChecking(true);
    try {
      const params = new URLSearchParams({
        unit_id: unit.id,
        start_date: startDate,
        end_date: endDate,
        quantity: String(quantity),
      });
      const res = await fetch(`/api/rental-units/availability?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setAvailability(data);
      if (data.available) toast.success(`Disponibile · ${fmtEur(data.pricing.total)}`);
      else toast.warning(data.reason || 'Non disponibile');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  const submitRequest = async (e) => {
    e?.preventDefault();
    if (!customer.name?.trim() || !customer.email?.trim()) {
      toast.error('Nome ed email obbligatori');
      return;
    }
    if (!availability?.available) {
      toast.error('Verifica prima la disponibilità');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        unit_id: unit.id,
        start_date: startDate,
        end_date: endDate,
        quantity: Number(quantity),
        guests_count: guestsCount ? Number(guestsCount) : null,
        customer,
        company_id: unit.company_id || null,
        status: 'PENDING', // Public request → PENDING for admin approval
        payment_status: 'PENDING',
      };
      const res = await fetch('/api/rental-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setSubmitted(data);
      toast.success(`Richiesta inviata: ${data.booking_number}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-emerald-500 border-2">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-bold">Richiesta Inviata!</h2>
            <p className="text-lg">Codice prenotazione: <span className="font-mono font-bold">{submitted.booking_number}</span></p>
            <div className="bg-slate-50 p-4 rounded-lg text-left text-sm space-y-1">
              <div><b>Unità:</b> {submitted.unit_name}</div>
              <div><b>Periodo:</b> {fmtDate(submitted.start_date)} → {fmtDate(submitted.end_date)}</div>
              <div><b>Durata:</b> {submitted.duration_value} {submitted.duration_unit === 'NIGHTS' ? 'notti' : 'giorni'}</div>
              <div><b>Totale:</b> <span className="text-teal-700 font-bold">{fmtEur(submitted.total_amount)}</span></div>
              <div><b>Acconto richiesto:</b> {fmtEur(submitted.deposit_amount)} ({submitted.deposit_pct}%)</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Riceverai una conferma via email all'indirizzo <b>{submitted.customer?.email}</b>. Verrai contattato a breve per finalizzare la prenotazione.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                className="border-blue-500 text-blue-700 hover:bg-blue-50"
                onClick={async () => {
                  try {
                    toast.loading('Generazione PDF...', { id: 'pdf-public' });
                    const { downloadRentalVoucherPdf } = await import('@/app/lib/rentalVoucherPdf');
                    await downloadRentalVoucherPdf(submitted, unit, {});
                    toast.success('Voucher scaricato', { id: 'pdf-public' });
                  } catch (e) {
                    toast.error(`Errore PDF: ${e.message}`, { id: 'pdf-public' });
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" /> Scarica Voucher PDF
              </Button>
              <Button onClick={() => setView('rentals')} className="bg-teal-600 hover:bg-teal-700">
                <ArrowLeft className="w-4 h-4 mr-2" /> Torna alle Locazioni
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const img = unit.images?.[0] || buildPlaceholder(unit.category, unit.name);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" onClick={() => setView('rentals')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Tutte le Locazioni
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
            <img src={img} alt={unit.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = buildPlaceholder(unit.category, unit.name); }} />
            <div className="absolute top-4 left-4">
              <Badge className={cm.color}><Icon className="w-4 h-4 mr-1" />{cm.label}</Badge>
            </div>
          </div>

          {/* Photo Gallery (if multiple) */}
          {Array.isArray(unit.images) && unit.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {unit.images.slice(1, 5).map((u, i) => (
                <img key={i} src={u} alt={`Foto ${i + 2}`} className="w-full h-20 object-cover rounded border" onError={(e) => { e.target.style.display = 'none'; }} />
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{unit.name}</CardTitle>
              {unit.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-4 h-4" />{unit.location}{unit.address ? ` · ${unit.address}` : ''}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {unit.description && <p className="text-slate-700">{unit.description}</p>}

              {isAccommodation && (
                <div className="flex flex-wrap gap-4 text-sm bg-slate-50 p-3 rounded">
                  {unit.max_guests && <span className="flex items-center gap-1"><Users className="w-4 h-4" />Max {unit.max_guests} ospiti</span>}
                  {unit.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{unit.bedrooms} camere</span>}
                  {unit.bathrooms && <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{unit.bathrooms} bagni</span>}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm bg-blue-50 p-3 rounded">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />Check-in: <b>{unit.check_in_time}</b></span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />Check-out: <b>{unit.check_out_time}</b></span>
              </div>

              {Array.isArray(unit.amenities) && unit.amenities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Servizi</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {unit.amenities.map((a, i) => <Badge key={i} variant="outline">{a}</Badge>)}
                  </div>
                </div>
              )}

              {Array.isArray(unit.seasonal_pricing) && unit.seasonal_pricing.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tariffe Stagionali</h4>
                  <div className="space-y-1 text-sm">
                    {unit.seasonal_pricing.map((s, i) => (
                      <div key={i} className="flex justify-between bg-amber-50 p-2 rounded">
                        <span>{s.name} ({fmtDate(s.start_date)} – {fmtDate(s.end_date)})</span>
                        <span className="font-bold text-teal-700">{fmtEur(s.price_per_unit)}/{unit.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs text-muted-foreground italic">
                      <span>Tariffa base (fuori stagione)</span>
                      <span>{fmtEur(unit.base_price)}/{unit.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: booking sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-baseline gap-2">
                {sp.isFromTiers && <span className="text-xs font-normal text-muted-foreground">da</span>}
                <span className="text-2xl text-teal-700">{fmtEur(sp.price)}</span>
                <span className="text-sm font-normal">/{unit.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRequest} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Check-in</Label>
                    <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setAvailability(null); }} min={todayISO()} />
                  </div>
                  <div>
                    <Label className="text-xs">Check-out</Label>
                    <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setAvailability(null); }} min={addDays(startDate, 1)} />
                  </div>
                </div>

                {unit.unit_mode === 'POOL' && (
                  <div>
                    <Label className="text-xs">Quantità</Label>
                    <Input type="number" min="1" max={unit.quantity} value={quantity} onChange={(e) => { setQuantity(Number(e.target.value || 1)); setAvailability(null); }} />
                  </div>
                )}
                {isAccommodation && (
                  <div>
                    <Label className="text-xs">N° Ospiti</Label>
                    <Input type="number" min="1" max={unit.max_guests || 99} value={guestsCount} onChange={(e) => setGuestsCount(e.target.value)} />
                  </div>
                )}

                <Button type="button" onClick={checkAvailability} disabled={checking} className="w-full" variant="outline">
                  {checking ? 'Verifica...' : <><CalIcon className="w-4 h-4 mr-2" />Verifica disponibilità</>}
                </Button>

                {availability && (
                  <div className={`p-2 rounded text-xs ${availability.available ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    {availability.available ? (
                      <div>
                        <div className="font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Disponibile</div>
                        {availability.pricing?.breakdown?.map((p, i) => (
                          <div key={i} className="flex justify-between mt-1">
                            <span>{p.name} ({p.days}×{fmtEur(p.price_per_unit)})</span>
                            <span className="font-mono">{fmtEur(p.subtotal)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold mt-1 pt-1 border-t border-emerald-200">
                          <span>Totale</span><span>{fmtEur(availability.pricing.total)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{availability.reason}</div>
                    )}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs font-semibold uppercase">I tuoi dati</Label>
                  <Input placeholder="Nome e cognome *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                  <Input type="email" placeholder="Email *" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                  <Input placeholder="Telefono" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                  <Textarea rows={2} placeholder="Note (opzionale)" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !availability?.available}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {submitting ? 'Invio in corso...' : 'Invia Richiesta di Prenotazione'}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  La tua richiesta sarà confermata dall'operatore dopo verifica
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
