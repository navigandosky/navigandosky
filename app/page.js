'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Anchor, Ship, MapPin, Calendar as CalIcon, Clock, Users, Star, ChevronRight, ArrowLeft,
  Plus, Trash2, Search, CheckCircle2, BarChart3, Menu, X, Globe, Phone, Mail,
  Waves, Sun, Compass, Eye, Edit, Download, RefreshCw, Navigation, CreditCard, Tag, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// ============ CONSTANTS ============
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_7d8a5623-84c4-4dc5-8737-98643d255bb4/artifacts/cdzklcx8_logo%20maretrek_1.jpg';
const HERO_IMG = 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=1920&q=80';
const TYPE_LABELS = { BOAT_EXCURSION: 'Escursione in Barca', GUIDED_TOUR: 'Visita Guidata', BOAT_RENTAL: 'Noleggio Gommone' };
const TYPE_ICONS = { BOAT_EXCURSION: Ship, GUIDED_TOUR: Compass, BOAT_RENTAL: Anchor };
const TYPE_COLORS = { BOAT_EXCURSION: 'bg-sky-100 text-sky-800 border-sky-200', GUIDED_TOUR: 'bg-emerald-100 text-emerald-800 border-emerald-200', BOAT_RENTAL: 'bg-amber-100 text-amber-800 border-amber-200' };
const LANG_MAP = { IT: 'Italiano', EN: 'English', FR: 'Francais', DE: 'Deutsch' };
const BOAT_TYPE_LABELS = { GOMMONE: 'Gommone', MOTONAVE: 'Motonave', BARCA_A_VELA: 'Barca a Vela' };

// ============ API HELPER ============
const api = async (path, opts = {}) => {
  const { method = 'GET', body } = opts;
  const cfg = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) cfg.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, cfg);
  return res.json();
};

// ============ UTILITY COMPONENTS ============
function TypeBadge({ type }) {
  const Icon = TYPE_ICONS[type] || Ship;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}>
      <Icon className="w-3 h-3" />{TYPE_LABELS[type] || type}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = { OPEN: 'bg-green-100 text-green-800', FULL: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600', WEATHER_HOLD: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-green-100 text-green-800', PENDING: 'bg-yellow-100 text-yellow-800', REFUNDED: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
}

function AvailabilityBar({ booked, max }) {
  const pct = max > 0 ? (booked / max) * 100 : 0;
  const avail = max - booked;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{avail} posti</span>
    </div>
  );
}

function formatDate(d) { try { return format(parseISO(d), 'EEE d MMM yyyy', { locale: it }); } catch { return d; } }
function formatTime(d) { try { return format(parseISO(d), 'HH:mm'); } catch { return ''; } }
function formatDateTime(d) { try { return format(parseISO(d), "EEE d MMM yyyy 'alle' HH:mm", { locale: it }); } catch { return d; } }
function formatPrice(p) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p); }

// ============ NAVBAR ============
function NavBar({ view, setView, mobileOpen, setMobileOpen }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-80 transition">
          <img src={LOGO_URL} alt="Maretrek" style={{ height: '40px', width: 'auto' }} className="rounded" />
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {[['home', 'Home'], ['catalog', 'Esperienze'], ['admin', 'Admin']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`}>{label}</button>
          ))}
        </nav>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t bg-white p-4 space-y-2">
          {[['home', 'Home'], ['catalog', 'Esperienze'], ['admin', 'Admin']].map(([v, label]) => (
            <button key={v} onClick={() => { setView(v); setMobileOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{label}</button>
          ))}
        </div>
      )}
    </header>
  );
}

// ============ FOOTER ============
function Footer() {
  return (
    <footer className="wave-bg text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src={LOGO_URL} alt="Maretrek" className="h-12 mb-4 rounded" />
            <p className="text-white/70 text-sm">Esperienze marine indimenticabili in Sardegna. Scopri il mare piu bello del Mediterraneo con le nostre guide esperte.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contatti</h4>
            <div className="space-y-2 text-sm text-white/70">
              <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> +39 079 123 456</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@maretrek.it</p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Porto di Alghero, Sardegna</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Seguici</h4>
            <p className="text-sm text-white/70">Seguici sui social per offerte esclusive e aggiornamenti sulle nostre esperienze.</p>
          </div>
        </div>
        <Separator className="my-8 bg-white/20" />
        <p className="text-center text-sm text-white/50">&copy; 2025 Maretrek S.r.l. - P.IVA 01234567890 - Tutti i diritti riservati</p>
      </div>
    </footer>
  );
}

// ============ HOME PAGE ============
function HomePage({ setView, experiences }) {
  const featured = experiences.slice(0, 3);
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img src={HERO_IMG} alt="Sardegna" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <div className="mb-6">
            <img src={LOGO_URL} alt="Maretrek" className="h-20 md:h-28 mx-auto rounded-lg shadow-2xl" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Scopri la Sardegna dal Mare</h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">Escursioni in barca, visite guidate, noleggio gommoni. Vivi il Mediterraneo con guide esperte e imbarcazioni di qualita.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 shadow-lg" onClick={() => setView('catalog')}>
              <Compass className="w-5 h-5 mr-2" />Esplora le Esperienze
            </Button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 -mt-16 relative z-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map(exp => (
            <Card key={exp.id} className="card-hover overflow-hidden cursor-pointer border-0 shadow-lg" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-48">
                <img src={exp.image_url} alt={exp.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div>
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full font-bold text-primary">{formatPrice(exp.price_b2c)}</div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg leading-tight">{exp.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h{exp.duration_minutes%60>0?` ${exp.duration_minutes%60}m`:''}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{(exp.languages||[]).join(', ')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Perche Scegliere Maretrek</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Star, title: 'Guide Esperte Certificate', desc: 'Le nostre guide sono professionisti abilitati con anni di esperienza e profonda conoscenza del territorio sardo.' },
            { icon: Ship, title: 'Imbarcazioni di Qualita', desc: 'Flotta moderna e ben mantenuta: gommoni, motonavi e barche a vela per ogni tipo di esperienza.' },
            { icon: Sun, title: 'Esperienze Uniche', desc: 'Itinerari esclusivi che combinano natura, storia e gastronomia per un ricordo indimenticabile.' },
          ].map((b, i) => (
            <div key={i} className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <b.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{b.title}</h3>
              <p className="text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="wave-bg py-16">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto per la Tua Avventura?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">Prenota ora la tua esperienza e scopri la bellezza autentica della Sardegna dal mare.</p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" onClick={() => setView('catalog')}>
            Vedi Tutte le Esperienze <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}

// ============ CATALOG PAGE ============
function CatalogPage({ setView, experiences }) {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [langFilter, setLangFilter] = useState('ALL');
  const [searchQ, setSearchQ] = useState('');

  const filtered = experiences.filter(exp => {
    if (typeFilter !== 'ALL' && exp.type !== typeFilter) return false;
    if (langFilter !== 'ALL' && !(exp.languages || []).includes(langFilter)) return false;
    if (searchQ && !exp.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Le Nostre Esperienze</h1>
        <p className="text-muted-foreground">Scopri tutte le attivita disponibili e prenota la tua prossima avventura in Sardegna.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cerca esperienza..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tutti i tipi</SelectItem>
            <SelectItem value="BOAT_EXCURSION">Escursione in Barca</SelectItem>
            <SelectItem value="GUIDED_TOUR">Visita Guidata</SelectItem>
            <SelectItem value="BOAT_RENTAL">Noleggio Gommone</SelectItem>
          </SelectContent>
        </Select>
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Lingua" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tutte le lingue</SelectItem>
            <SelectItem value="IT">Italiano</SelectItem>
            <SelectItem value="EN">English</SelectItem>
            <SelectItem value="FR">Francais</SelectItem>
            <SelectItem value="DE">Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20"><Waves className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">Nessuna esperienza trovata.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(exp => (
            <Card key={exp.id} className="card-hover overflow-hidden border shadow-sm cursor-pointer group" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-52 overflow-hidden">
                <img src={exp.image_url} alt={exp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div>
                {exp.weather_dependent && <div className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs"><Sun className="w-3 h-3 inline mr-1" />Meteo</div>}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg leading-tight">{exp.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{exp.meeting_point}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h{exp.duration_minutes%60>0?` ${exp.duration_minutes%60}m`:''}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{(exp.languages||[]).join(', ')}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between items-center">
                <div className="text-2xl font-bold text-primary">{formatPrice(exp.price_b2c)}<span className="text-xs font-normal text-muted-foreground">/persona</span></div>
                <Button variant="default" size="sm">Scopri <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ EXPERIENCE DETAIL ============
function ExperienceDetail({ experience, setView }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    if (!experience) return;
    setLoading(true);
    Promise.all([
      api(`slots?experience_id=${experience.id}&date_from=${new Date().toISOString()}`),
      api('resources'),
    ]).then(([s, r]) => {
      setSlots(Array.isArray(s) ? s.filter(sl => sl.status !== 'CANCELLED' && new Date(sl.start_datetime) > new Date()) : []);
      setResources(Array.isArray(r) ? r : []);
      setLoading(false);
    });
  }, [experience]);

  if (!experience) return null;
  const assignedResources = resources.filter(r => (experience.resource_ids || []).includes(r.id));

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => setView('catalog')} className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" />Torna alle Esperienze
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-[400px]">
            <img src={experience.image_url} alt={experience.name} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4"><TypeBadge type={experience.type} /></div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{experience.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{experience.meeting_point}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" />{Math.floor(experience.duration_minutes/60)}h{experience.duration_minutes%60>0?` ${experience.duration_minutes%60}m`:''}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />Max {experience.max_capacity} persone</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-primary" />{(experience.languages||[]).map(l => LANG_MAP[l]||l).join(', ')}</span>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-6">{experience.description}</p>

            {/* Itinerary */}
            {experience.itinerary_stops?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" />Itinerario</h3>
                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-primary/20" />
                  {experience.itinerary_stops.map((stop, i) => (
                    <div key={i} className="relative mb-3 last:mb-0">
                      <div className={`absolute -left-3.5 w-3 h-3 rounded-full border-2 ${i===0||i===experience.itinerary_stops.length-1 ? 'bg-primary border-primary' : 'bg-white border-primary/50'}`} />
                      <p className="text-sm ml-2">{stop}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {assignedResources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Risorse Assegnate</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedResources.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.type === 'GUIDE' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                        {r.type === 'GUIDE' ? <User className="w-5 h-5" /> : <Ship className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.type === 'GUIDE' ? 'Guida' : (BOAT_TYPE_LABELS[r.boat_type]||'Imbarcazione')}{r.capacity ? ` - ${r.capacity} posti` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancellation */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Politica di Cancellazione</h4>
              <p className="text-sm text-muted-foreground">{experience.cancellation_policy}</p>
            </div>
          </div>
        </div>

        {/* Sidebar - Slots */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-2xl">{formatPrice(experience.price_b2c)}</CardTitle>
                <span className="text-sm text-muted-foreground">per persona</span>
              </div>
              <CardDescription>Scegli una data disponibile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nessuna data disponibile al momento.</p>
              ) : (
                slots.map(slot => {
                  const avail = slot.max_seats - slot.booked_seats - (slot.blocked_seats || 0);
                  const isFull = avail <= 0;
                  return (
                    <div key={slot.id} className={`p-3 rounded-lg border ${isFull ? 'bg-red-50/50 border-red-100' : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'} transition`}
                      onClick={() => !isFull && setView('booking', { experience, slot })}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm capitalize">{formatDate(slot.start_datetime)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(slot.start_datetime)} - {formatTime(slot.end_datetime)}</p>
                        </div>
                        {isFull ? <Badge variant="destructive" className="text-xs">Completo</Badge> : <Badge variant="secondary" className="text-xs">{avail} posti</Badge>}
                      </div>
                      <AvailabilityBar booked={slot.booked_seats + (slot.blocked_seats || 0)} max={slot.max_seats} />
                      {!isFull && <Button size="sm" className="w-full mt-2">Prenota Ora</Button>}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============ BOOKING WIZARD ============
function BookingWizard({ experience, slot, setView }) {
  const [step, setStep] = useState(1);
  const [seats, setSeats] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', special_requests: '' });
  const [participants, setParticipants] = useState([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  if (!experience || !slot) return null;
  const maxAvail = slot.max_seats - slot.booked_seats - (slot.blocked_seats || 0);
  const pricePerSeat = slot.price_override || experience.price_b2c;
  const subtotal = pricePerSeat * seats;
  const discount = voucherResult?.valid ? (voucherResult.voucher.type === 'PERCENTAGE' ? (subtotal * voucherResult.voucher.value / 100) : Math.min(voucherResult.voucher.value, subtotal)) : 0;
  const total = subtotal - discount;

  const validateVoucher = async () => {
    if (!voucherCode.trim()) return;
    const res = await api('vouchers/validate', { method: 'POST', body: { code: voucherCode } });
    setVoucherResult(res);
    if (res.valid) toast.success('Voucher applicato!');
    else toast.error(res.error || 'Voucher non valido');
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      const res = await api('bookings', {
        method: 'POST',
        body: {
          slot_id: slot.id, experience_id: experience.id, customer_name: form.name,
          customer_email: form.email, customer_phone: form.phone, seats,
          total_amount: subtotal, voucher_code: voucherResult?.valid ? voucherCode : null,
          special_requests: form.special_requests, participants,
        }
      });
      if (res.error) { toast.error(res.error); setLoading(false); return; }
      setBookingResult(res);
      setStep(5);
      toast.success('Prenotazione confermata!');
    } catch (e) { toast.error('Errore nella prenotazione'); }
    setLoading(false);
  };

  // Step 5: Confirmation
  if (step === 5 && bookingResult) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Prenotazione Confermata!</h1>
          <p className="text-muted-foreground">La tua avventura in Sardegna ti aspetta</p>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Codice prenotazione</p>
                <p className="text-2xl font-bold font-mono text-primary">{bookingResult.booking_ref}</p>
              </div>
              <StatusBadge status={bookingResult.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div>
              <div><p className="text-muted-foreground">Data</p><p className="font-medium capitalize">{formatDateTime(slot.start_datetime)}</p></div>
              <div><p className="text-muted-foreground">Posti</p><p className="font-medium">{bookingResult.seats} {bookingResult.seats === 1 ? 'persona' : 'persone'}</p></div>
              <div><p className="text-muted-foreground">Totale Pagato</p><p className="font-medium text-primary">{formatPrice(bookingResult.total_amount)}</p></div>
              <div><p className="text-muted-foreground">Punto d'incontro</p><p className="font-medium">{experience.meeting_point}</p></div>
              <div><p className="text-muted-foreground">Pagamento</p><p className="font-medium">Confermato (MOCK)</p></div>
            </div>
            {bookingResult.discount > 0 && <p className="text-sm text-green-600">Sconto applicato: -{formatPrice(bookingResult.discount)}</p>}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button onClick={() => setView('catalog')} className="flex-1">Torna alle Esperienze</Button>
            <Button variant="outline" onClick={() => setView('home')}>Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <button onClick={() => setView('detail', { experience })} className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" />Torna ai dettagli
      </button>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {['Posti', 'Dati', 'Voucher', 'Pagamento'].map((label, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            }`}>{step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}</div>
            <span className={`ml-2 text-sm hidden sm:inline ${step === i + 1 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{label}</span>
            {i < 3 && <div className={`flex-1 h-0.5 mx-3 ${step > i + 1 ? 'bg-green-500' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      <Card className="shadow-lg">
        {/* Booking summary header */}
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex gap-4 items-center">
            <img src={experience.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1">
              <CardTitle className="text-base">{experience.name}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{formatDateTime(slot.start_datetime)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-lg">{formatPrice(pricePerSeat)}</p>
              <p className="text-xs text-muted-foreground">per persona</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Seats */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Numero di Partecipanti</Label>
                <p className="text-sm text-muted-foreground mb-3">Massimo {maxAvail} posti disponibili</p>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setSeats(Math.max(1, seats - 1))} disabled={seats <= 1}>-</Button>
                  <span className="text-2xl font-bold w-12 text-center">{seats}</span>
                  <Button variant="outline" size="icon" onClick={() => setSeats(Math.min(maxAvail, seats + 1))} disabled={seats >= maxAvail}>+</Button>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span>Totale provvisorio</span>
                <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
              </div>
            </div>
          )}

          {/* Step 2: Participant Data */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Dati del Referente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Nome Completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Mario Rossi" /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="mario@email.com" /></div>
                  <div><Label>Telefono *</Label><Input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+39 333 1234567" /></div>
                </div>
              </div>
              {seats > 1 && (
                <div>
                  <h3 className="font-semibold mb-3">Altri Partecipanti</h3>
                  {Array.from({ length: seats - 1 }).map((_, i) => (
                    <div key={i} className="flex gap-3 mb-2">
                      <Input placeholder={`Nome partecipante ${i + 2}`} value={participants[i]?.name || ''}
                        onChange={e => { const p = [...participants]; p[i] = { ...p[i], name: e.target.value }; setParticipants(p); }} />
                    </div>
                  ))}
                </div>
              )}
              <div><Label>Richieste Speciali</Label><Textarea value={form.special_requests} onChange={e => setForm({...form, special_requests: e.target.value})} placeholder="Allergie, esigenze particolari..." /></div>
            </div>
          )}

          {/* Step 3: Voucher */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Hai un Codice Sconto?</h3>
                <p className="text-sm text-muted-foreground mb-4">Inserisci il codice voucher o coupon per ottenere uno sconto.</p>
                <div className="flex gap-3">
                  <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="ES: BENVENUTO10" className="font-mono" />
                  <Button onClick={validateVoucher} variant="secondary"><Tag className="w-4 h-4 mr-2" />Applica</Button>
                </div>
                {voucherResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${voucherResult.valid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {voucherResult.valid ? (
                      <p><CheckCircle2 className="w-4 h-4 inline mr-1" />Sconto {voucherResult.voucher.type === 'PERCENTAGE' ? `${voucherResult.voucher.value}%` : formatPrice(voucherResult.voucher.value)} applicato! Risparmi {formatPrice(discount)}</p>
                    ) : <p>{voucherResult.error}</p>}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between"><span>Subtotale ({seats} {seats===1?'persona':'persone'})</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Sconto</span><span>-{formatPrice(discount)}</span></div>}
                <Separator />
                <div className="flex justify-between text-lg font-bold"><span>Totale</span><span className="text-primary">{formatPrice(total)}</span></div>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium"><CreditCard className="w-4 h-4 inline mr-2" />Pagamento Simulato (MOCK)</p>
                <p className="text-xs text-amber-700 mt-1">In produzione verra integrato Stripe per pagamenti reali.</p>
              </div>
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold text-base">Riepilogo Prenotazione</h3>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div>
                  <div><p className="text-muted-foreground">Data e Ora</p><p className="font-medium capitalize">{formatDateTime(slot.start_datetime)}</p></div>
                  <div><p className="text-muted-foreground">Partecipanti</p><p className="font-medium">{seats}</p></div>
                  <div><p className="text-muted-foreground">Referente</p><p className="font-medium">{form.name}</p></div>
                  <div><p className="text-muted-foreground">Email</p><p className="font-medium">{form.email}</p></div>
                  <div><p className="text-muted-foreground">Telefono</p><p className="font-medium">{form.phone}</p></div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Subtotale</span><span>{formatPrice(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Sconto</span><span>-{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t"><span>Totale da Pagare</span><span className="text-primary">{formatPrice(total)}</span></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={() => step === 1 ? setView('detail', { experience }) : setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />{step === 1 ? 'Indietro' : 'Precedente'}
          </Button>
          {step < 4 ? (
            <Button onClick={() => {
              if (step === 2 && (!form.name || !form.email || !form.phone)) { toast.error('Compila tutti i campi obbligatori'); return; }
              setStep(step + 1);
            }}>Continua <ChevronRight className="w-4 h-4 ml-2" /></Button>
          ) : (
            <Button onClick={handleBook} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Conferma e Paga {formatPrice(total)}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [experiences, setExps] = useState([]);
  const [resources, setResources] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [showDialog, setShowDialog] = useState(null);
  const [formData, setFormData] = useState({});
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    const [s, e, r, sl, b, v] = await Promise.all([
      api('stats'), api('experiences?all=true'), api('resources'), api('slots'), api('bookings'), api('vouchers')
    ]);
    setStats(s || {}); setExps(Array.isArray(e)?e:[]); setResources(Array.isArray(r)?r:[]);
    setSlots(Array.isArray(sl)?sl:[]); setBookings(Array.isArray(b)?b:[]); setVouchers(Array.isArray(v)?v:[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedData = async () => {
    setSeeding(true);
    await api('seed', { method: 'POST' });
    toast.success('Dati demo caricati!');
    await load();
    setSeeding(false);
  };

  const createItem = async (endpoint, data) => {
    await api(endpoint, { method: 'POST', body: data });
    toast.success('Creato con successo!');
    setShowDialog(null); setFormData({});
    await load();
  };

  const deleteItem = async (endpoint, id) => {
    if (!confirm('Sei sicuro di voler eliminare?')) return;
    await api(`${endpoint}/${id}`, { method: 'DELETE' });
    toast.success('Eliminato!'); await load();
  };

  const cancelBooking = async (id) => {
    await api(`bookings/${id}`, { method: 'PUT', body: { action: 'cancel' } });
    toast.success('Prenotazione cancellata'); await load();
  };

  const checkinBooking = async (id) => {
    await api(`bookings/${id}`, { method: 'PUT', body: { action: 'checkin' } });
    toast.success('Check-in effettuato!'); await load();
  };

  const getExpName = (id) => experiences.find(e => e.id === id)?.name || '-';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground">Gestione completa del booking engine Maretrek</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
          <Button onClick={seedData} disabled={seeding} variant="secondary">
            {seeding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Carica Dati Demo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />Panoramica</TabsTrigger>
          <TabsTrigger value="experiences"><Compass className="w-4 h-4 mr-1.5" />Esperienze</TabsTrigger>
          <TabsTrigger value="resources"><Ship className="w-4 h-4 mr-1.5" />Risorse</TabsTrigger>
          <TabsTrigger value="slots"><CalIcon className="w-4 h-4 mr-1.5" />Slot</TabsTrigger>
          <TabsTrigger value="bookings"><CreditCard className="w-4 h-4 mr-1.5" />Prenotazioni</TabsTrigger>
          <TabsTrigger value="vouchers"><Tag className="w-4 h-4 mr-1.5" />Voucher</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Prenotazioni', value: stats.total_bookings || 0, icon: CreditCard, color: 'text-blue-600 bg-blue-100' },
              { label: 'Fatturato', value: formatPrice(stats.total_revenue || 0), icon: BarChart3, color: 'text-green-600 bg-green-100' },
              { label: 'Esperienze', value: stats.total_experiences || 0, icon: Compass, color: 'text-purple-600 bg-purple-100' },
              { label: 'Risorse', value: stats.total_resources || 0, icon: Ship, color: 'text-amber-600 bg-amber-100' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Recent bookings */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Prenotazioni Recenti</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="pb-2 font-medium">Rif.</th><th className="pb-2 font-medium">Cliente</th><th className="pb-2 font-medium">Esperienza</th><th className="pb-2 font-medium">Posti</th><th className="pb-2 font-medium">Totale</th><th className="pb-2 font-medium">Stato</th></tr></thead>
                  <tbody>
                    {(stats.recent_bookings || []).slice(0, 8).map(b => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2.5 font-mono text-xs">{b.booking_ref}</td>
                        <td className="py-2.5">{b.customer_name}</td>
                        <td className="py-2.5">{b.experience_name || getExpName(b.experience_id)}</td>
                        <td className="py-2.5">{b.seats}</td>
                        <td className="py-2.5 font-medium">{formatPrice(b.total_amount)}</td>
                        <td className="py-2.5"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!stats.recent_bookings || stats.recent_bookings.length === 0) && <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione. Carica i dati demo per iniziare!</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiences Tab */}
        <TabsContent value="experiences" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Esperienze ({experiences.length})</h2>
            <Button onClick={() => { setFormData({ type: 'BOAT_EXCURSION', languages: ['IT'] }); setShowDialog('experience'); }}><Plus className="w-4 h-4 mr-2" />Nuova Esperienza</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Prezzo B2C</th><th className="p-3 font-medium">Prezzo B2B</th><th className="p-3 font-medium">Durata</th><th className="p-3 font-medium">Capacita</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {experiences.map(e => (
                  <tr key={e.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.name}</td>
                    <td className="p-3"><TypeBadge type={e.type} /></td>
                    <td className="p-3">{formatPrice(e.price_b2c)}</td>
                    <td className="p-3">{formatPrice(e.price_b2b)}</td>
                    <td className="p-3">{Math.floor(e.duration_minutes/60)}h{e.duration_minutes%60>0?`${e.duration_minutes%60}m`:''}</td>
                    <td className="p-3">{e.max_capacity}</td>
                    <td className="p-3"><Button variant="ghost" size="icon" onClick={() => deleteItem('experiences', e.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Risorse ({resources.length})</h2>
            <Button onClick={() => { setFormData({ type: 'GUIDE' }); setShowDialog('resource'); }}><Plus className="w-4 h-4 mr-2" />Nuova Risorsa</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map(r => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${r.type === 'GUIDE' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                      {r.type === 'GUIDE' ? <User className="w-6 h-6" /> : <Ship className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{r.name}</h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem('resources', r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{r.type === 'GUIDE' ? 'Guida' : (BOAT_TYPE_LABELS[r.boat_type] || 'Imbarcazione')}{r.capacity ? ` - ${r.capacity} posti` : ''}</p>
                      <p className="text-sm text-muted-foreground">{r.bio}</p>
                      {r.languages?.length > 0 && <div className="mt-2 flex gap-1">{r.languages.map(l => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Slots Tab */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Slot Disponibilita ({slots.length})</h2>
            <Button onClick={() => { setFormData({}); setShowDialog('slot'); }}><Plus className="w-4 h-4 mr-2" />Nuovo Slot</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Esperienza</th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Ora</th><th className="p-3 font-medium">Posti</th><th className="p-3 font-medium">Disponibilita</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {slots.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{getExpName(s.experience_id)}</td>
                    <td className="p-3 capitalize">{formatDate(s.start_datetime)}</td>
                    <td className="p-3">{formatTime(s.start_datetime)}</td>
                    <td className="p-3">{s.booked_seats}/{s.max_seats}</td>
                    <td className="p-3 w-32"><AvailabilityBar booked={s.booked_seats} max={s.max_seats} /></td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3"><Button variant="ghost" size="icon" onClick={() => deleteItem('slots', s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-xl font-semibold">Prenotazioni ({bookings.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Rif.</th><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Esperienza</th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Posti</th><th className="p-3 font-medium">Totale</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                    <td className="p-3">{b.customer_name}</td>
                    <td className="p-3 text-xs">{b.customer_email}</td>
                    <td className="p-3">{b.experience_name || getExpName(b.experience_id)}</td>
                    <td className="p-3 text-xs capitalize">{formatDate(b.slot_datetime || b.created_at)}</td>
                    <td className="p-3">{b.seats}</td>
                    <td className="p-3 font-medium">{formatPrice(b.total_amount)}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {b.status === 'CONFIRMED' && !b.checked_in_at && <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => checkinBooking(b.id)}>Check-in</Button>}
                        {b.status === 'CONFIRMED' && <Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={() => cancelBooking(b.id)}>Cancella</Button>}
                        {b.checked_in_at && <Badge variant="secondary" className="text-xs bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Check-in</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione.</p>}
          </div>
        </TabsContent>

        {/* Vouchers Tab */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Voucher e Coupon ({vouchers.length})</h2>
            <Button onClick={() => { setFormData({ type: 'PERCENTAGE', value: 10, max_uses: 100 }); setShowDialog('voucher'); }}><Plus className="w-4 h-4 mr-2" />Nuovo Voucher</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Codice</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valore</th><th className="p-3 font-medium">Utilizzi</th><th className="p-3 font-medium">Valido fino</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold">{v.code}</td>
                    <td className="p-3">{v.type === 'PERCENTAGE' ? 'Percentuale' : v.type === 'FIXED' ? 'Fisso' : 'Regalo'}</td>
                    <td className="p-3 font-medium">{v.type === 'PERCENTAGE' ? `${v.value}%` : formatPrice(v.value)}</td>
                    <td className="p-3">{v.uses_count}/{v.max_uses}</td>
                    <td className="p-3 text-xs">{v.valid_until ? formatDate(v.valid_until) : 'Illimitato'}</td>
                    <td className="p-3">{v.is_active ? <Badge className="bg-green-100 text-green-800 text-xs">Attivo</Badge> : <Badge variant="secondary" className="text-xs">Inattivo</Badge>}</td>
                    <td className="p-3"><Button variant="ghost" size="icon" onClick={() => deleteItem('vouchers', v.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dialogs */}
      <Dialog open={showDialog === 'experience'} onOpenChange={v => !v && setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuova Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})} /></div>
            <div><Label>Tipo</Label>
              <Select value={formData.type||'BOAT_EXCURSION'} onValueChange={v=>setFormData({...formData,type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BOAT_EXCURSION">Escursione in Barca</SelectItem><SelectItem value="GUIDED_TOUR">Visita Guidata</SelectItem><SelectItem value="BOAT_RENTAL">Noleggio Gommone</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Durata (min)</Label><Input type="number" value={formData.duration_minutes||''} onChange={e=>setFormData({...formData,duration_minutes:e.target.value})} /></div>
              <div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})} /></div>
              <div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})} /></div>
            </div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})} /></div>
            <div><Label>URL Immagine</Label><Input value={formData.image_url||''} onChange={e=>setFormData({...formData,image_url:e.target.value})} /></div>
            <Button className="w-full" onClick={()=>createItem('experiences',formData)}>Crea Esperienza</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog === 'resource'} onOpenChange={v => !v && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova Risorsa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})} /></div>
            <div><Label>Tipo</Label>
              <Select value={formData.type||'GUIDE'} onValueChange={v=>setFormData({...formData,type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="GUIDE">Guida</SelectItem><SelectItem value="BOAT">Imbarcazione</SelectItem></SelectContent>
              </Select>
            </div>
            {formData.type === 'BOAT' && <>
              <div><Label>Tipo Imbarcazione</Label>
                <Select value={formData.boat_type||'GOMMONE'} onValueChange={v=>setFormData({...formData,boat_type:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="MOTONAVE">Motonave</SelectItem><SelectItem value="BARCA_A_VELA">Barca a Vela</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Capacita (posti)</Label><Input type="number" value={formData.capacity||''} onChange={e=>setFormData({...formData,capacity:e.target.value})} /></div>
            </>}
            <div><Label>Bio/Descrizione</Label><Textarea value={formData.bio||''} onChange={e=>setFormData({...formData,bio:e.target.value})} /></div>
            <div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})} /></div>
            <div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})} /></div>
            <Button className="w-full" onClick={()=>createItem('resources',formData)}>Crea Risorsa</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog === 'slot'} onOpenChange={v => !v && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Esperienza</Label>
              <Select value={formData.experience_id||''} onValueChange={v=>setFormData({...formData,experience_id:v})}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{experiences.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Inizio</Label><Input type="datetime-local" value={formData.start_datetime||''} onChange={e=>setFormData({...formData,start_datetime:new Date(e.target.value).toISOString()})} /></div>
              <div><Label>Data Fine</Label><Input type="datetime-local" value={formData.end_datetime||''} onChange={e=>setFormData({...formData,end_datetime:new Date(e.target.value).toISOString()})} /></div>
            </div>
            <div><Label>Posti Massimi</Label><Input type="number" value={formData.max_seats||''} onChange={e=>setFormData({...formData,max_seats:e.target.value})} /></div>
            <div><Label>Note</Label><Textarea value={formData.notes||''} onChange={e=>setFormData({...formData,notes:e.target.value})} /></div>
            <Button className="w-full" onClick={()=>createItem('slots',formData)}>Crea Slot</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog === 'voucher'} onOpenChange={v => !v && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Codice</Label><Input value={formData.code||''} onChange={e=>setFormData({...formData,code:e.target.value.toUpperCase()})} placeholder="SUMMER2025" className="font-mono" /></div>
            <div><Label>Tipo</Label>
              <Select value={formData.type||'PERCENTAGE'} onValueChange={v=>setFormData({...formData,type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="PERCENTAGE">Percentuale (%)</SelectItem><SelectItem value="FIXED">Fisso (EUR)</SelectItem><SelectItem value="GIFT">Regalo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valore</Label><Input type="number" value={formData.value||''} onChange={e=>setFormData({...formData,value:e.target.value})} /></div>
              <div><Label>Utilizzi Max</Label><Input type="number" value={formData.max_uses||''} onChange={e=>setFormData({...formData,max_uses:e.target.value})} /></div>
            </div>
            <Button className="w-full" onClick={()=>createItem('vouchers',formData)}>Crea Voucher</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [view, setView] = useState('home');
  const [experiences, setExperiences] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api('experiences').then(data => {
      if (Array.isArray(data)) setExperiences(data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [view]);

  const navigate = (newView, data = {}) => {
    if (data.experience) setSelectedExperience(data.experience);
    if (data.slot) setSelectedSlot(data.slot);
    setView(newView);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar view={view} setView={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1">
        {view === 'home' && <HomePage setView={navigate} experiences={experiences} />}
        {view === 'catalog' && <CatalogPage setView={navigate} experiences={experiences} />}
        {view === 'detail' && <ExperienceDetail experience={selectedExperience} setView={navigate} />}
        {view === 'booking' && <BookingWizard experience={selectedExperience} slot={selectedSlot} setView={navigate} />}
        {view === 'admin' && <AdminDashboard />}
      </main>
      <Footer />
    </div>
  );
}
