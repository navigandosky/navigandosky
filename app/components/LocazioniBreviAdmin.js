'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Bike, Car, Home, Building2, Ship, Plus, Trash2, Edit, Calendar as CalIcon,
  RefreshCw, Euro, MapPin, Users, BedDouble, Bath, Clock, AlertCircle,
  CheckCircle2, XCircle, Search, Eye, Save,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'BIKE', label: 'Bici', icon: Bike, color: 'bg-emerald-100 text-emerald-800', defaultUnit: 'DAYS' },
  { value: 'CAR', label: 'Auto', icon: Car, color: 'bg-blue-100 text-blue-800', defaultUnit: 'DAYS' },
  { value: 'APARTMENT', label: 'Appartamento', icon: Building2, color: 'bg-amber-100 text-amber-800', defaultUnit: 'NIGHTS' },
  { value: 'VILLA', label: 'Villa', icon: Home, color: 'bg-purple-100 text-purple-800', defaultUnit: 'NIGHTS' },
  { value: 'BOAT', label: 'Barca', icon: Ship, color: 'bg-cyan-100 text-cyan-800', defaultUnit: 'DAYS' },
];

const STATUSES = [
  { value: 'HELD', label: 'Opzione', color: 'bg-slate-100 text-slate-700' },
  { value: 'PENDING', label: 'In attesa', color: 'bg-amber-100 text-amber-800' },
  { value: 'CONFIRMED', label: 'Confermata', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'COMPLETED', label: 'Completata', color: 'bg-blue-100 text-blue-800' },
  { value: 'CANCELLED', label: 'Annullata', color: 'bg-red-100 text-red-800' },
];

const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Da pagare', color: 'bg-amber-100 text-amber-800' },
  { value: 'PARTIAL', label: 'Acconto', color: 'bg-blue-100 text-blue-800' },
  { value: 'PAID', label: 'Pagato', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'REFUNDED', label: 'Rimborsato', color: 'bg-slate-100 text-slate-700' },
];

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('it-IT') : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

const catMeta = (c) => CATEGORIES.find((x) => x.value === c) || CATEGORIES[0];
const statusMeta = (s) => STATUSES.find((x) => x.value === s) || STATUSES[1];
const paymentStatusMeta = (s) => PAYMENT_STATUSES.find((x) => x.value === s) || PAYMENT_STATUSES[0];

export default function LocazioniBreviAdmin({ currentUser, isSuperAdmin }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  // SuperAdmin global company filter (null = all)
  const [saCompanyFilter, setSaCompanyFilter] = useState(null);

  // Effective company_id for queries: company admin → their own; super admin → selected filter (or none)
  const effectiveCompanyId = currentUser?.company_id || saCompanyFilter || null;
  const qsCompany = effectiveCompanyId ? `?company_id=${effectiveCompanyId}` : '';

  // ------- Load Data -------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [
        fetch(`/api/rental-units${qsCompany}`).then((r) => r.json()),
        fetch(`/api/rental-bookings${qsCompany}`).then((r) => r.json()),
        fetch(`/api/rental-stats${qsCompany}`).then((r) => r.json()),
        fetch(`/api/agencies${qsCompany}`).then((r) => r.json()).catch(() => []),
      ];
      // Load companies once (for SuperAdmin selector)
      if (isSuperAdmin) {
        promises.push(fetch('/api/companies').then((r) => r.json()).catch(() => []));
      }
      const results = await Promise.all(promises);
      const [uRes, bRes, sRes, aRes, cRes] = results;
      setUnits(Array.isArray(uRes) ? uRes : []);
      setBookings(Array.isArray(bRes) ? bRes : []);
      setStats(sRes || null);
      setAgencies(Array.isArray(aRes) ? aRes : []);
      if (isSuperAdmin) setCompanies(Array.isArray(cRes) ? cRes : []);
    } catch (e) {
      console.error(e);
      toast.error('Errore caricamento Locazioni Brevi');
    } finally {
      setLoading(false);
    }
  }, [qsCompany, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-teal-600 to-cyan-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Home className="w-6 h-6" /> Locazioni Brevi
          </h2>
          <p className="text-xs opacity-90 mt-1">
            Bici, Auto, Appartamenti, Ville, Barche — gestione disponibilità giornaliera/per notti
          </p>
        </div>
        <Button onClick={load} variant="outline" className="bg-white text-teal-700 hover:bg-teal-50 border-none">
          <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
        </Button>
      </div>

      {/* SuperAdmin Company Filter */}
      {isSuperAdmin && companies.length > 0 && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="py-3 flex items-center gap-3 flex-wrap">
            <Badge className="bg-purple-600">SUPER ADMIN</Badge>
            <Label className="text-sm font-semibold">Vista Company:</Label>
            <Select value={saCompanyFilter || 'ALL'} onValueChange={(v) => setSaCompanyFilter(v === 'ALL' ? null : v)}>
              <SelectTrigger className="w-[260px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">🌐 Tutte le Company (globale)</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>🏢 {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saCompanyFilter && (
              <Badge className="bg-amber-500 text-white">
                Filtro attivo: {companies.find((c) => c.id === saCompanyFilter)?.name || ''}
              </Badge>
            )}
            <span className="text-xs text-purple-700 ml-auto">
              Nuove unità verranno create per la company selezionata
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100">
          <TabsTrigger value="dashboard"><CalIcon className="w-4 h-4 mr-1.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="units"><Home className="w-4 h-4 mr-1.5" />Unità ({units.length})</TabsTrigger>
          <TabsTrigger value="calendar"><CalIcon className="w-4 h-4 mr-1.5" />Calendario</TabsTrigger>
          <TabsTrigger value="bookings"><Users className="w-4 h-4 mr-1.5" />Prenotazioni ({bookings.length})</TabsTrigger>
          <TabsTrigger value="new-booking"><Plus className="w-4 h-4 mr-1.5" />Nuova Prenotazione</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab stats={stats} units={units} bookings={bookings} />
        </TabsContent>

        <TabsContent value="units">
          <UnitsTab units={units} companyId={effectiveCompanyId} reload={load} isSuperAdmin={isSuperAdmin} companies={companies} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab units={units} bookings={bookings} />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingsTab bookings={bookings} units={units} reload={load} />
        </TabsContent>

        <TabsContent value="new-booking">
          <NewBookingTab units={units} agencies={agencies} companyId={effectiveCompanyId} reload={load} switchToBookings={() => setActiveTab('bookings')} isSuperAdmin={isSuperAdmin} companies={companies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================================
// DASHBOARD TAB
// =====================================================================
function DashboardTab({ stats, units, bookings }) {
  if (!stats) return <div className="text-muted-foreground">Caricamento statistiche...</div>;

  const upcomingList = useMemo(() => {
    const today = todayISO();
    return bookings
      .filter((b) => ['HELD', 'PENDING', 'CONFIRMED'].includes(b.status) && b.start_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 10);
  }, [bookings]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Unità Totali" value={stats.total_units} icon={Home} color="text-teal-700 bg-teal-100" />
        <KpiCard label="Unità Attive" value={stats.active_units} icon={CheckCircle2} color="text-emerald-700 bg-emerald-100" />
        <KpiCard label="Prenotazioni" value={stats.total_bookings} icon={CalIcon} color="text-blue-700 bg-blue-100" />
        <KpiCard label="Attive Oggi" value={stats.active_now} icon={Users} color="text-amber-700 bg-amber-100" />
        <KpiCard label="Fatturato" value={fmtEur(stats.total_revenue)} icon={Euro} color="text-rose-700 bg-rose-100" />
      </div>

      {/* By category */}
      <Card>
        <CardHeader><CardTitle className="text-base">Riepilogo per Categoria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const data = stats.by_category?.[c.value] || { units: 0, bookings: 0, revenue: 0 };
              return (
                <div key={c.value} className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                    <Icon className="w-4 h-4" /> {c.label}
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between"><span>Unità:</span><b>{data.units}</b></div>
                    <div className="flex justify-between"><span>Prenotaz.:</span><b>{data.bookings}</b></div>
                    <div className="flex justify-between"><span>Fatturato:</span><b className="text-emerald-700">{fmtEur(data.revenue)}</b></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardHeader><CardTitle className="text-base">Prossime Prenotazioni</CardTitle></CardHeader>
        <CardContent>
          {upcomingList.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessuna prenotazione futura.</div>
          ) : (
            <div className="space-y-2">
              {upcomingList.map((b) => {
                const cm = catMeta(b.category);
                const sm = statusMeta(b.status);
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded border bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Badge className={cm.color}><cm.icon className="w-3 h-3 mr-1" />{cm.label}</Badge>
                      <div>
                        <div className="font-semibold text-sm">{b.unit_name} — {b.customer?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(b.start_date)} → {fmtDate(b.end_date)} · {b.duration_value} {b.duration_unit === 'NIGHTS' ? 'notti' : 'giorni'}
                          {b.quantity > 1 ? ` · ${b.quantity}x` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{fmtEur(b.total_amount)}</div>
                      <Badge className={sm.color}>{sm.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// UNITS TAB (CRUD)
// =====================================================================
function emptyUnit() {
  return {
    name: '',
    category: 'BIKE',
    unit_mode: 'NOMINAL',
    quantity: 1,
    duration_unit: 'DAYS',
    check_in_time: '09:00',
    check_out_time: '19:00',
    description: '',
    location: '',
    address: '',
    max_guests: '',
    bedrooms: '',
    bathrooms: '',
    amenities: '',
    base_price: 0,
    deposit_percentage: 30,
    min_duration: '',
    seasonal_pricing: [],
    is_active: true,
    notes: '',
  };
}

function UnitsTab({ units, companyId, reload, isSuperAdmin, companies }) {
  const [filterCat, setFilterCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    return units.filter((u) => {
      if (filterCat !== 'ALL' && u.category !== filterCat) return false;
      if (search && !u.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [units, filterCat, search]);

  const openCreate = () => {
    setEditing(emptyUnit());
    setShowForm(true);
  };
  const openEdit = (u) => {
    setEditing({
      ...u,
      amenities: Array.isArray(u.amenities) ? u.amenities.join(', ') : '',
      seasonal_pricing: u.seasonal_pricing || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (u) => {
    if (!confirm(`Eliminare l'unità "${u.name}"? L'operazione è irreversibile.`)) return;
    try {
      const res = await fetch(`/api/rental-units/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione');
      toast.success('Unità eliminata');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 bg-slate-50 p-3 rounded-lg border">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Categoria</Label>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Cerca</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome unità..." className="pl-8" />
          </div>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" /> Nuova Unità
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nessuna unità. Clicca "Nuova Unità" per crearne una.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => {
            const cm = catMeta(u.category);
            const Icon = cm.icon;
            return (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={cm.color}><Icon className="w-3 h-3 mr-1" />{cm.label}</Badge>
                        {u.unit_mode === 'POOL' && <Badge variant="outline">Pool ×{u.quantity}</Badge>}
                        {!u.is_active && <Badge variant="destructive">Disattiva</Badge>}
                      </div>
                      <h3 className="font-semibold mt-1.5">{u.name}</h3>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {u.location && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{u.location}</div>}
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />
                      In {u.check_in_time} · Out {u.check_out_time}
                    </div>
                    {(u.category === 'APARTMENT' || u.category === 'VILLA') && (
                      <div className="flex items-center gap-3">
                        {u.max_guests && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{u.max_guests}</span>}
                        {u.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{u.bedrooms}</span>}
                        {u.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{u.bathrooms}</span>}
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Tariffa base / {u.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</div>
                      <div className="font-bold text-teal-700">{fmtEur(u.base_price)}</div>
                      {u.seasonal_pricing?.length > 0 && (
                        <div className="text-[10px] text-amber-600">+ {u.seasonal_pricing.length} stagione/i</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)} title="Modifica">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(u)} title="Elimina" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && editing && (
        <UnitFormDialog
          unit={editing}
          companyId={companyId}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); reload(); }}
          isSuperAdmin={isSuperAdmin}
          companies={companies}
        />
      )}
    </div>
  );
}

function UnitFormDialog({ unit, companyId, onClose, onSaved, isSuperAdmin, companies }) {
  const [form, setForm] = useState({ ...unit, company_id: unit.company_id || companyId || null });
  const [saving, setSaving] = useState(false);
  const isEdit = !!unit.id;
  const cm = catMeta(form.category);

  // Auto-set duration_unit when category changes (only on create)
  useEffect(() => {
    if (!isEdit) {
      const meta = CATEGORIES.find((c) => c.value === form.category);
      if (meta && form.duration_unit !== meta.defaultUnit) {
        setForm((f) => ({
          ...f,
          duration_unit: meta.defaultUnit,
          check_in_time: meta.defaultUnit === 'NIGHTS' ? '16:00' : '09:00',
          check_out_time: meta.defaultUnit === 'NIGHTS' ? '10:00' : '19:00',
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addSeason = () => {
    if ((form.seasonal_pricing || []).length >= 4) {
      toast.warning('Massimo 4 stagioni');
      return;
    }
    set('seasonal_pricing', [
      ...(form.seasonal_pricing || []),
      { name: '', start_date: '', end_date: '', price_per_unit: 0 },
    ]);
  };

  const updateSeason = (i, k, v) => {
    const arr = [...(form.seasonal_pricing || [])];
    arr[i] = { ...arr[i], [k]: v };
    set('seasonal_pricing', arr);
  };

  const removeSeason = (i) => {
    const arr = [...(form.seasonal_pricing || [])];
    arr.splice(i, 1);
    set('seasonal_pricing', arr);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name?.trim()) { toast.error('Nome obbligatorio'); return; }
    if (Number(form.base_price) < 0) { toast.error('Prezzo non valido'); return; }
    if (isSuperAdmin && !form.company_id) {
      toast.error('Seleziona la Company di destinazione');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        company_id: form.company_id || companyId || null,
        quantity: form.unit_mode === 'POOL' ? Number(form.quantity || 1) : 1,
        base_price: Number(form.base_price || 0),
        deposit_percentage: Number(form.deposit_percentage || 0),
        min_duration: form.min_duration ? Number(form.min_duration) : null,
        max_guests: form.max_guests ? Number(form.max_guests) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        amenities: typeof form.amenities === 'string'
          ? form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
          : (form.amenities || []),
        seasonal_pricing: (form.seasonal_pricing || []).map((s) => ({
          ...s,
          price_per_unit: Number(s.price_per_unit || 0),
        })),
      };

      const url = isEdit ? `/api/rental-units/${form.id}` : '/api/rental-units';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio');
      toast.success(isEdit ? 'Unità aggiornata' : 'Unità creata');
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isAccommodation = form.category === 'APARTMENT' || form.category === 'VILLA';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <cm.icon className="w-5 h-5" />
            {isEdit ? 'Modifica' : 'Nuova'} Unità — {cm.label}
          </DialogTitle>
          <DialogDescription>Configura categoria, capacità, orari check-in/out e tariffe stagionali.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Super Admin: Company selector */}
          {isSuperAdmin && (
            <Card className="border-purple-300 bg-purple-50">
              <CardContent className="py-3">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-600 text-xs">SUPER ADMIN</Badge>
                  Company di destinazione *
                </Label>
                <Select value={form.company_id || ''} onValueChange={(v) => set('company_id', v)}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona company..." /></SelectTrigger>
                  <SelectContent>
                    {(companies || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>🏢 {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-purple-700 mt-1">L'unità sarà visibile solo agli utenti della company selezionata.</p>
              </CardContent>
            </Card>
          )}

          {/* Categoria */}
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((c) => {
              const Ic = c.icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('category', c.value)}
                  className={`p-2 rounded-lg border-2 text-xs font-semibold flex flex-col items-center gap-1 transition ${
                    form.category === c.value ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Ic className="w-5 h-5" />
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome Unità *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder='es. "Appartamento Bilocale 3B" o "Bici MTB"' />
            </div>

            <div>
              <Label>Modalità Unità</Label>
              <Select value={form.unit_mode} onValueChange={(v) => set('unit_mode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOMINAL">Singola Nominale (1 unità identificata)</SelectItem>
                  <SelectItem value="POOL">Pool (quantità prenotabile)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.unit_mode === 'POOL' && (
              <div>
                <Label>Quantità totale</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
              </div>
            )}

            <div>
              <Label>Unità di Durata</Label>
              <Select value={form.duration_unit} onValueChange={(v) => set('duration_unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYS">Giorni</SelectItem>
                  <SelectItem value="NIGHTS">Notti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durata Minima (opzionale)</Label>
              <Input type="number" min="1" value={form.min_duration || ''} onChange={(e) => set('min_duration', e.target.value)} placeholder="es. 2" />
            </div>

            <div>
              <Label>Check-in (orario)</Label>
              <Input type="time" value={form.check_in_time} onChange={(e) => set('check_in_time', e.target.value)} />
            </div>
            <div>
              <Label>Check-out (orario)</Label>
              <Input type="time" value={form.check_out_time} onChange={(e) => set('check_out_time', e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label>Descrizione</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div>
              <Label>Località</Label>
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="es. Cala Gonone" />
            </div>
            <div>
              <Label>Indirizzo</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>

            {isAccommodation && (
              <>
                <div>
                  <Label>Max Ospiti</Label>
                  <Input type="number" value={form.max_guests || ''} onChange={(e) => set('max_guests', e.target.value)} />
                </div>
                <div>
                  <Label>Camere</Label>
                  <Input type="number" value={form.bedrooms || ''} onChange={(e) => set('bedrooms', e.target.value)} />
                </div>
                <div>
                  <Label>Bagni</Label>
                  <Input type="number" value={form.bathrooms || ''} onChange={(e) => set('bathrooms', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Servizi (separati da virgola)</Label>
                  <Input value={form.amenities} onChange={(e) => set('amenities', e.target.value)} placeholder="WiFi, Piscina, Aria condizionata" />
                </div>
              </>
            )}

            <div>
              <Label>Tariffa Base / {form.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'} (€)</Label>
              <Input type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Usata se nessuna stagione è applicabile.</p>
            </div>
            <div>
              <Label>Acconto richiesto (%)</Label>
              <Input type="number" min="0" max="100" value={form.deposit_percentage} onChange={(e) => set('deposit_percentage', e.target.value)} />
            </div>
          </div>

          {/* Tariffe stagionali */}
          <Card className="bg-slate-50 border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Tariffe Stagionali (max 4)</span>
                <Button type="button" variant="outline" size="sm" onClick={addSeason}>
                  <Plus className="w-3 h-3 mr-1" /> Aggiungi Stagione
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(form.seasonal_pricing || []).length === 0 ? (
                <div className="text-xs text-muted-foreground">Nessuna stagione configurata. Verrà usata la tariffa base.</div>
              ) : (
                (form.seasonal_pricing || []).map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-white border rounded">
                    <div className="col-span-3">
                      <Label className="text-xs">Nome</Label>
                      <Input value={s.name} onChange={(e) => updateSeason(i, 'name', e.target.value)} placeholder="Alta stagione" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Dal</Label>
                      <Input type="date" value={s.start_date} onChange={(e) => updateSeason(i, 'start_date', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Al</Label>
                      <Input type="date" value={s.end_date} onChange={(e) => updateSeason(i, 'end_date', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Prezzo (€)</Label>
                      <Input type="number" step="0.01" min="0" value={s.price_per_unit} onChange={(e) => updateSeason(i, 'price_per_unit', e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSeason(i)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active !== false}
              onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">Unità attiva (prenotabile)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvataggio...' : (isEdit ? 'Aggiorna' : 'Crea Unità')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// CALENDAR TAB (Gantt-style availability)
// =====================================================================
function CalendarTab({ units, bookings }) {
  const [filterCat, setFilterCat] = useState('ALL');
  const [startOffset, setStartOffset] = useState(0); // months from current
  const [windowDays, setWindowDays] = useState(30);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => filterCat === 'ALL' || u.category === filterCat);
  }, [units, filterCat]);

  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + startOffset);
    return d;
  }, [startOffset]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [start, windowDays]);

  const isDayBooked = (unitId, day) => {
    const dayStr = day.toISOString().slice(0, 10);
    return bookings.filter((b) =>
      b.unit_id === unitId &&
      ['HELD', 'PENDING', 'CONFIRMED'].includes(b.status) &&
      b.start_date <= dayStr && b.end_date > dayStr,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><CalIcon className="w-4 h-4" /> Calendario Disponibilità</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutte le categorie</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 giorni</SelectItem>
                <SelectItem value="30">30 giorni</SelectItem>
                <SelectItem value="60">60 giorni</SelectItem>
                <SelectItem value="90">90 giorni</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setStartOffset((s) => s - windowDays)}>◀</Button>
            <Button variant="outline" size="sm" onClick={() => setStartOffset(0)}>Oggi</Button>
            <Button variant="outline" size="sm" onClick={() => setStartOffset((s) => s + windowDays)}>▶</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredUnits.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">Nessuna unità in questa categoria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white z-10 text-left p-2 border-r min-w-[180px]">Unità</th>
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
                {filteredUnits.map((u) => {
                  const cm = catMeta(u.category);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 bg-white z-10 p-2 border-r font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <cm.icon className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{u.name}</span>
                          {u.unit_mode === 'POOL' && <Badge variant="outline" className="text-[9px] ml-1">×{u.quantity}</Badge>}
                        </div>
                      </td>
                      {days.map((d, i) => {
                        const bks = isDayBooked(u.id, d);
                        let cellClass = 'bg-emerald-50';
                        let title = 'Disponibile';
                        if (bks.length > 0) {
                          if (u.unit_mode === 'POOL') {
                            const used = bks.reduce((s, b) => s + Number(b.quantity || 1), 0);
                            const pct = used / Number(u.quantity || 1);
                            cellClass = pct >= 1 ? 'bg-red-300' : pct >= 0.5 ? 'bg-amber-300' : 'bg-amber-100';
                            title = `${used}/${u.quantity} occupate`;
                          } else {
                            cellClass = 'bg-red-300';
                            title = bks[0].customer?.name || 'Prenotata';
                          }
                        }
                        return <td key={i} className={`p-0 border ${cellClass}`} title={title} style={{ height: 28 }} />;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-emerald-50 border" />Disponibile</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-amber-100 border" />Parziale (pool)</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-amber-300 border" />Quasi piena</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-300 border" />Prenotata</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// BOOKINGS TAB
// =====================================================================
function BookingsTab({ bookings, units, reload }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (catFilter !== 'ALL' && b.category !== catFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${b.booking_number} ${b.unit_name} ${b.customer?.name || ''} ${b.customer?.email || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, catFilter, search]);

  const updateStatus = async (bk, newStatus) => {
    try {
      const res = await fetch(`/api/rental-bookings/${bk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success(`Stato → ${statusMeta(newStatus).label}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const updatePayment = async (bk, newPayStatus) => {
    try {
      const res = await fetch(`/api/rental-bookings/${bk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newPayStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success(`Pagamento → ${paymentStatusMeta(newPayStatus).label}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteBooking = async (bk) => {
    if (!confirm(`Eliminare la prenotazione ${bk.booking_number}? Operazione irreversibile.`)) return;
    try {
      const res = await fetch(`/api/rental-bookings/${bk.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success('Prenotazione eliminata');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 bg-slate-50 p-3 rounded-lg border">
        <div className="min-w-[160px]">
          <Label className="text-xs">Stato</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli stati</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs">Categoria</Label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Cerca (codice, cliente, unità)</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="..." />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nessuna prenotazione.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase">
                <tr>
                  <th className="text-left p-2">Codice</th>
                  <th className="text-left p-2">Unità</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Periodo</th>
                  <th className="text-right p-2">Importo</th>
                  <th className="text-center p-2">Stato</th>
                  <th className="text-center p-2">Pagamento</th>
                  <th className="text-center p-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const cm = catMeta(b.category);
                  const sm = statusMeta(b.status);
                  const pm = paymentStatusMeta(b.payment_status);
                  return (
                    <tr key={b.id} className="border-t hover:bg-slate-50">
                      <td className="p-2 font-mono text-xs">{b.booking_number}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <cm.icon className="w-3.5 h-3.5" />
                          <span className="text-xs">{b.unit_name}</span>
                          {b.quantity > 1 && <Badge variant="outline" className="text-[10px]">×{b.quantity}</Badge>}
                        </div>
                      </td>
                      <td className="p-2 text-xs">
                        <div className="font-semibold">{b.customer?.name || '—'}</div>
                        <div className="text-muted-foreground">{b.customer?.email}</div>
                      </td>
                      <td className="p-2 text-xs">
                        {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                        <div className="text-muted-foreground">{b.duration_value} {b.duration_unit === 'NIGHTS' ? 'notti' : 'gg'}</div>
                      </td>
                      <td className="p-2 text-right font-semibold">{fmtEur(b.total_amount)}</td>
                      <td className="p-2 text-center">
                        <Select value={b.status} onValueChange={(v) => updateStatus(b, v)}>
                          <SelectTrigger className={`h-7 text-xs ${sm.color} border-0`}>
                            <SelectValue>{sm.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <Select value={b.payment_status} onValueChange={(v) => updatePayment(b, v)}>
                          <SelectTrigger className={`h-7 text-xs ${pm.color} border-0`}>
                            <SelectValue>{pm.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setViewing(b)}><Eye className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteBooking(b)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {viewing && <BookingDetailDialog booking={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function BookingDetailDialog({ booking, onClose }) {
  const cm = catMeta(booking.category);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><cm.icon className="w-5 h-5" />{booking.booking_number}</DialogTitle>
          <DialogDescription>Dettaglio prenotazione locazione breve</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Info label="Unità" value={booking.unit_name} />
            <Info label="Categoria" value={cm.label} />
            <Info label="Check-in" value={`${fmtDate(booking.start_date)} ${booking.check_in_time || ''}`} />
            <Info label="Check-out" value={`${fmtDate(booking.end_date)} ${booking.check_out_time || ''}`} />
            <Info label="Durata" value={`${booking.duration_value} ${booking.duration_unit === 'NIGHTS' ? 'notti' : 'giorni'}`} />
            <Info label="Quantità" value={booking.quantity} />
            {booking.guests_count && <Info label="Ospiti" value={booking.guests_count} />}
          </div>
          <Card className="bg-slate-50">
            <CardHeader className="py-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              <Info label="Nome" value={booking.customer?.name} />
              <Info label="Email" value={booking.customer?.email} />
              <Info label="Telefono" value={booking.customer?.phone} />
              {booking.customer?.document_number && <Info label="Documento" value={booking.customer.document_number} />}
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardHeader className="py-2"><CardTitle className="text-sm">Importi</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {booking.pricing_breakdown?.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span>{p.name} ({p.days} × {fmtEur(p.price_per_unit)})</span>
                  <span className="font-mono">{fmtEur(p.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Totale</span><span>{fmtEur(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>Acconto ({booking.deposit_pct}%)</span><span>{fmtEur(booking.deposit_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saldo</span><span>{fmtEur(booking.balance_amount)}</span>
              </div>
              {booking.commission_amount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Commissione Agenzia ({booking.agency_commission_pct}%)</span><span>{fmtEur(booking.commission_amount)}</span>
                </div>
              )}
            </CardContent>
          </Card>
          {booking.agency_name && <Info label="Agenzia" value={booking.agency_name} />}
          {booking.notes && <Info label="Note" value={booking.notes} />}
        </div>
        <DialogFooter><Button onClick={onClose}>Chiudi</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

// =====================================================================
// NEW BOOKING TAB
// =====================================================================
function NewBookingTab({ units, agencies, companyId, reload, switchToBookings, isSuperAdmin, companies }) {
  const activeUnits = useMemo(() => units.filter((u) => u.is_active), [units]);
  const [unitId, setUnitId] = useState('');
  const [bookingCompanyId, setBookingCompanyId] = useState(companyId || '');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 1));
  const [quantity, setQuantity] = useState(1);
  const [guestsCount, setGuestsCount] = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', document_number: '' });
  const [agencyId, setAgencyId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [saving, setSaving] = useState(false);

  // Auto-prefill bookingCompanyId from selected unit (or fallback to companyId prop)
  useEffect(() => {
    if (unitId) {
      const u = activeUnits.find((x) => x.id === unitId);
      if (u?.company_id) setBookingCompanyId(u.company_id);
    } else if (companyId) {
      setBookingCompanyId(companyId);
    }
  }, [unitId, companyId, activeUnits]);

  const unit = useMemo(() => activeUnits.find((u) => u.id === unitId), [activeUnits, unitId]);

  useEffect(() => {
    // Reset availability if inputs change
    setAvailability(null);
  }, [unitId, startDate, endDate, quantity]);

  const checkAvailability = async () => {
    if (!unitId) { toast.error('Seleziona unità'); return; }
    if (!startDate || !endDate || endDate <= startDate) {
      toast.error('Date non valide');
      return;
    }
    setChecking(true);
    try {
      const params = new URLSearchParams({
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate,
        quantity: String(quantity),
      });
      const res = await fetch(`/api/rental-units/availability?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setAvailability(data);
      if (data.available) {
        toast.success(`Disponibile · ${fmtEur(data.pricing.total)}`);
      } else {
        toast.warning(`Non disponibile: ${data.reason}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!unitId) { toast.error('Seleziona unità'); return; }
    if (!customer.name?.trim()) { toast.error('Nome cliente obbligatorio'); return; }
    if (!availability) { toast.error('Verifica prima la disponibilità'); return; }
    if (!availability.available) { toast.error('Date non disponibili'); return; }

    const agency = agencies.find((a) => a.id === agencyId);
    setSaving(true);
    try {
      const payload = {
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate,
        quantity: Number(quantity),
        guests_count: guestsCount ? Number(guestsCount) : null,
        customer,
        agency_id: agencyId || null,
        agency_name: agency?.name || null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes,
        company_id: bookingCompanyId || companyId || null,
        status: 'CONFIRMED',
      };
      const res = await fetch('/api/rental-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione');
      toast.success(`Prenotazione ${data.booking_number} creata`);
      // Reset
      setUnitId(''); setQuantity(1); setGuestsCount('');
      setCustomer({ name: '', email: '', phone: '', document_number: '' });
      setAgencyId(''); setPaymentMethod(''); setPaymentStatus('PENDING'); setNotes('');
      setAvailability(null);
      reload();
      switchToBookings?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />Nuova Prenotazione Locazione</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {/* Unit selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Unità *</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger><SelectValue placeholder="Seleziona unità..." /></SelectTrigger>
                <SelectContent>
                  {activeUnits.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Nessuna unità attiva.</div>
                  ) : activeUnits.map((u) => {
                    const cm = catMeta(u.category);
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        [{cm.label}] {u.name} {u.unit_mode === 'POOL' ? `(pool ×${u.quantity})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {unit && (
                <div className="text-xs text-muted-foreground mt-1">
                  Tariffa base: {fmtEur(unit.base_price)} / {unit.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}
                  {unit.seasonal_pricing?.length > 0 && ` · ${unit.seasonal_pricing.length} stagione/i`}
                </div>
              )}
            </div>

            <div>
              <Label>Data Inizio (check-in) *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={todayISO()} />
            </div>
            <div>
              <Label>Data Fine (check-out) *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={addDays(startDate, 1)} />
            </div>

            {unit?.unit_mode === 'POOL' && (
              <div>
                <Label>Quantità</Label>
                <Input type="number" min="1" max={unit.quantity} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
              </div>
            )}
            {(unit?.category === 'APARTMENT' || unit?.category === 'VILLA') && (
              <div>
                <Label>N° Ospiti</Label>
                <Input type="number" min="1" max={unit.max_guests || 99} value={guestsCount} onChange={(e) => setGuestsCount(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={checkAvailability} disabled={checking || !unitId} variant="outline">
              {checking ? 'Verifica...' : <><CalIcon className="w-4 h-4 mr-2" />Verifica Disponibilità & Prezzo</>}
            </Button>
          </div>

          {availability && (
            <Card className={availability.available ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  {availability.available ? (
                    <><CheckCircle2 className="w-5 h-5 text-emerald-600" />Disponibile</>
                  ) : (
                    <><XCircle className="w-5 h-5 text-red-600" />Non disponibile</>
                  )}
                </div>
                {!availability.available && <div className="text-red-700">{availability.reason}</div>}
                {availability.pricing?.breakdown?.length > 0 && (
                  <div className="bg-white rounded p-2 text-xs space-y-1">
                    <div className="font-semibold mb-1">Dettaglio prezzo:</div>
                    {availability.pricing.breakdown.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.name} ({p.days} × {fmtEur(p.price_per_unit)}{quantity > 1 ? ` × ${quantity}` : ''})</span>
                        <span className="font-mono">{fmtEur(p.subtotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold text-base">
                      <span>Totale</span><span className="text-emerald-700">{fmtEur(availability.pricing.total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer */}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Dati Cliente</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Documento (opzionale)</Label>
                <Input value={customer.document_number} onChange={(e) => setCustomer({ ...customer, document_number: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Agency & Payment */}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Pagamento & Agenzia (opzionale)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Agenzia B2B</Label>
                <Select value={agencyId || 'NONE'} onValueChange={(v) => setAgencyId(v === 'NONE' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nessuna (Diretto B2C)</SelectItem>
                    {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.commission_percentage || a.commission_pct || 0}%)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Metodo Pagamento</Label>
                <Select value={paymentMethod || 'NONE'} onValueChange={(v) => setPaymentMethod(v === 'NONE' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    <SelectItem value="CASH">Contanti</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bonifico</SelectItem>
                    <SelectItem value="POS">POS / Carta</SelectItem>
                    <SelectItem value="SUMUP">SumUp</SelectItem>
                    <SelectItem value="STRIPE">Stripe</SelectItem>
                    <SelectItem value="OTHER">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stato Pagamento</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Note</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button
              type="submit"
              disabled={saving || !availability?.available}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Creazione...' : 'Crea Prenotazione'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
