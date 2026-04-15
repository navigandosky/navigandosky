'use client';
import { useState, useEffect, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Import componente Mappa Flotta
const MappaFlottaWrapper = dynamic(() => import('./components/MappaFlottaWrapper'), { ssr: false });
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Anchor, Ship, MapPin, Calendar as CalIcon, Clock, Users, Star, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
  Plus, Trash2, Search, CheckCircle2, BarChart3, Menu, X, Globe, Phone, Mail,
  Waves, Sun, Compass, Eye, Edit, Download, RefreshCw, Navigation, CreditCard, Tag, User,
  ChevronLeft, GripVertical, Building2, LogIn, ListOrdered, AlertCircle, Bell, Upload, Image as ImageIcon, Map, Languages, Copy
} from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { languageFlags, languageNames } from './i18n/translations';

// ============ CONSTANTS ============
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_7d8a5623-84c4-4dc5-8737-98643d255bb4/artifacts/cdzklcx8_logo%20maretrek_1.jpg';
const HERO_IMG = 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=1920&q=80';
const TYPE_LABELS = { GITA_GOMMONE: 'Gita in Gommone', GITA_BARCA: 'Gita in Barca', VISITA_GUIDATA: 'Visita Guidata', NOLEGGIO_NATANTE: 'Noleggio Natante' };
const TYPE_ICONS = { GITA_GOMMONE: Ship, GITA_BARCA: Ship, VISITA_GUIDATA: Compass, NOLEGGIO_NATANTE: Anchor };
const TYPE_COLORS = { GITA_GOMMONE: 'bg-sky-100 text-sky-800 border-sky-200', GITA_BARCA: 'bg-blue-100 text-blue-800 border-blue-200', VISITA_GUIDATA: 'bg-emerald-100 text-emerald-800 border-emerald-200', NOLEGGIO_NATANTE: 'bg-amber-100 text-amber-800 border-amber-200' };
const GANTT_COLORS = { GITA_GOMMONE: 'bg-sky-50 border-sky-300 text-sky-900', GITA_BARCA: 'bg-blue-50 border-blue-300 text-blue-900', VISITA_GUIDATA: 'bg-emerald-50 border-emerald-300 text-emerald-900', NOLEGGIO_NATANTE: 'bg-amber-50 border-amber-300 text-amber-900' };
const LANG_MAP = { IT: 'Italiano', EN: 'English', FR: 'Francais', DE: 'Deutsch' };
const BOAT_TYPE_LABELS = { GOMMONE: 'Gommone', NATANTE: 'Natante', IMBARCAZIONE: 'Imbarcazione', GOMMONE_SKIPPER: 'Gommone con Skipper', BARCA_SKIPPER: 'Barca con Skipper', BARCA_VELA_SKIPPER: 'Barca a Vela con Skipper', BARCA: 'Barca' };

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
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[type] || 'bg-gray-100'}`}><Icon className="w-3 h-3" />{TYPE_LABELS[type] || type}</span>;
}
function StatusBadge({ status }) {
  const c = { OPEN: 'bg-green-100 text-green-800', FULL: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600', CONFIRMED: 'bg-green-100 text-green-800', PENDING: 'bg-yellow-100 text-yellow-800', REFUNDED: 'bg-gray-100 text-gray-600', WAITING: 'bg-blue-100 text-blue-800', NOTIFIED: 'bg-amber-100 text-amber-800', CONVERTED: 'bg-green-100 text-green-800', EXPIRED: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100'}`}>{status}</span>;
}
function AvailabilityBar({ booked, max }) {
  const pct = max > 0 ? (booked / max) * 100 : 0;
  const avail = max - booked;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{avail} posti</span>
    </div>
  );
}
function fmtDate(d) { try { return format(parseISO(d), 'EEE d MMM yyyy', { locale: it }); } catch { return d || ''; } }
function fmtTime(d) { try { return format(parseISO(d), 'HH:mm'); } catch { return ''; } }
function fmtDateTime(d) { try { return format(parseISO(d), "EEE d MMM yyyy 'alle' HH:mm", { locale: it }); } catch { return d || ''; } }
function fmtPrice(p) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p || 0); }

// Helper: Determina la fascia di prezzo attiva per una data specifica
function getPriceTierForDate(experience, date) {
  if (!experience?.price_tiers || experience.price_tiers.length === 0) {
    return null;
  }
  
  const dateStr = typeof date === 'string' ? date.split('T')[0] : format(date, 'yyyy-MM-dd');
  
  for (const tier of experience.price_tiers) {
    if (!tier.start_date || !tier.end_date) continue;
    if (dateStr >= tier.start_date && dateStr <= tier.end_date) {
      return tier;
    }
  }
  
  return null;
}

// ============ IMAGE UPLOADER ============
function ImageUploader({ images = [], onChange, maxImages = 3 }) {
  const [previews, setPreviews] = useState(images);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const remaining = maxImages - previews.length;
    if (files.length > remaining) {
      toast.error(`Puoi caricare massimo ${maxImages} immagini. Spazio disponibile: ${remaining}`);
      return;
    }

    setUploading(true);
    const newPreviews = [];
    const base64Images = [];

    for (const file of files) {
      // Validazione dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} è troppo grande. Massimo 5MB`);
        continue;
      }

      // Validazione tipo
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} non è un'immagine valida`);
        continue;
      }

      // Leggi come base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      newPreviews.push(base64);
      base64Images.push(base64);
    }

    try {
      // Carica le immagini al server
      const res = await api('upload', { method: 'POST', body: { images: base64Images } });
      
      if (res.error) {
        toast.error(res.error);
        setUploading(false);
        return;
      }

      const updatedImages = [...previews, ...res.urls];
      setPreviews(updatedImages);
      onChange(updatedImages);
      toast.success(`${res.count} ${res.count === 1 ? 'immagine caricata' : 'immagini caricate'}!`);
    } catch (err) {
      toast.error('Errore durante l\'upload');
    }
    
    setUploading(false);
  };

  const removeImage = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(updated);
    toast.success('Immagine rimossa');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Immagini (max {maxImages})
      </Label>
      
      <div className="grid grid-cols-3 gap-3">
        {previews.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={img.startsWith('data:') ? img : img}
              alt={`Preview ${idx + 1}`}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {previews.length < maxImages && (
          <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Carica</span>
              </>
            )}
          </label>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Formati supportati: JPG, PNG, WebP. Massimo 5MB per immagine.
      </p>
    </div>
  );
}

// ============ PDF UPLOADER ============
function PDFUploader({ pdfUrl = '', onChange }) {
  const [uploading, setUploading] = useState(false);
  const [currentPdf, setCurrentPdf] = useState(pdfUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validazione tipo
    if (file.type !== 'application/pdf') {
      toast.error('Solo file PDF sono accettati');
      return;
    }

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 10MB');
      return;
    }

    setUploading(true);

    try {
      // Leggi come base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      // Carica il PDF al server
      const res = await api('upload-pdf', { method: 'POST', body: { pdf: base64, filename: file.name } });
      
      if (res.error) {
        toast.error(res.error);
        setUploading(false);
        return;
      }

      setCurrentPdf(res.url);
      onChange(res.url);
      toast.success('PDF caricato con successo!');
    } catch (err) {
      toast.error('Errore durante l\'upload del PDF');
    }
    
    setUploading(false);
  };

  const removePdf = () => {
    setCurrentPdf('');
    onChange('');
    toast.success('PDF rimosso');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Condizioni di Servizio (PDF)
      </Label>
      
      {currentPdf ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex-1 flex items-center gap-2">
            <Download className="w-5 h-5 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Condizioni_servizio.pdf</p>
              <p className="text-xs text-muted-foreground">PDF caricato</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={removePdf}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Caricamento...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clicca per caricare PDF</span>
            </>
          )}
        </label>
      )}
      
      <p className="text-xs text-muted-foreground">
        Carica un file PDF con le condizioni e descrizione del servizio. Massimo 10MB.
      </p>
    </div>
  );
}

// ============ NAVBAR ============
function NavBar({ view, setView, mobileOpen, setMobileOpen }) {
  const { language, changeLanguage, t } = useLanguage();
  
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-80 transition">
          <img src={LOGO_URL} alt="Maretrek" style={{ height: '40px', width: 'auto' }} className="rounded" />
        </button>
        
        <nav className="hidden md:flex items-center gap-1">
          {[['home', t('home')], ['catalog', t('experiences')], ['b2b', t('b2b')], ['admin', t('admin')]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground'}`}>{l}</button>
          ))}
          
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2 gap-2">
                <span className="text-xl">{languageFlags[language]}</span>
                <Languages className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {Object.keys(languageFlags).map((lang) => (
                <DropdownMenuItem 
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`gap-2 cursor-pointer ${language === lang ? 'bg-primary/10' : ''}`}
                >
                  <span className="text-xl">{languageFlags[lang]}</span>
                  <span>{languageNames[lang]}</span>
                  {language === lang && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>
      
      {mobileOpen && (
        <div className="md:hidden border-t bg-white p-4 space-y-2">
          {[['home', t('home')], ['catalog', t('experiences')], ['b2b', t('b2b')], ['admin', t('admin')]].map(([v, l]) => (
            <button key={v} onClick={() => { setView(v); setMobileOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{l}</button>
          ))}
          
          {/* Mobile Language Selector */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 px-4">Lingua / Language</p>
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(languageFlags).map((lang) => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${language === lang ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <span className="text-2xl">{languageFlags[lang]}</span>
                  <span className="text-[10px] font-medium">{lang.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ============ FOOTER ============
function Footer() {
  const [showWorkWithUs, setShowWorkWithUs] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Compila almeno Nome, Email e Messaggio');
      return;
    }

    setSending(true);
    const res = await api('contact', { method: 'POST', body: formData });
    setSending(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Richiesta inviata con successo! Ti contatteremo presto.');
      setShowWorkWithUs(false);
      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
    }
  };

  return (
    <>
      <footer className="wave-bg text-white mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div><img src={LOGO_URL} alt="Maretrek" className="h-12 mb-4 rounded" /><p className="text-white/70 text-sm">Esperienze marine indimenticabili in Sardegna.</p></div>
            <div><h4 className="font-semibold mb-3">Contatti</h4><div className="space-y-2 text-sm text-white/70"><p className="flex items-center gap-2"><Phone className="w-4 h-4" /> +39 079 123 456</p><p className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@maretrek.it</p><p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Porto di Alghero, Sardegna</p></div></div>
            <div><h4 className="font-semibold mb-3">Info</h4><p className="text-sm text-white/70">Operatore turistico specializzato in esperienze marine nel nord Sardegna.</p></div>
            <div>
              <h4 className="font-semibold mb-3">Diventa Partner</h4>
              <p className="text-sm text-white/90 mb-3 font-bold">Sei un'agenzia viaggi? Entra nella nostra rete B2B.</p>
              <Button variant="outline" className="w-full text-white border-white hover:bg-white hover:text-primary" onClick={() => setShowWorkWithUs(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                <span className="font-bold">Lavora con noi</span>
              </Button>
            </div>
          </div>
          <Separator className="my-8 bg-white/20" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-white/50">&copy; 2025 Maretrek S.r.l. - P.IVA 01234567890</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/40">Created by</p>
              <a 
                href="https://trivorsrl.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">T</span>
                </div>
                <span className="text-sm font-semibold text-white">Trivor SRL</span>
                <span className="text-xs text-white/60">®</span>
              </a>
              <p className="text-xs text-white/40">© 2026</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Work With Us Dialog */}
      <Dialog open={showWorkWithUs} onOpenChange={setShowWorkWithUs}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lavora con Noi</DialogTitle>
            <p className="text-sm text-muted-foreground">Compila il form per diventare nostro partner B2B. Ti ricontatteremo entro 24-48 ore.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome e Cognome *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Mario Rossi" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="mario@agenzia.it" />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+39 333 123 4567" />
            </div>
            <div>
              <Label>Nome Agenzia</Label>
              <Input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} placeholder="Travel Agency S.r.l." />
            </div>
            <div>
              <Label>Messaggio *</Label>
              <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Ciao, sono interessato a collaborare con voi..." rows={4} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={sending}>
              {sending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</> : <>Invia Richiesta</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ HOME PAGE ============
function HomePage({ setView, experiences }) {
  const featured = experiences.slice(0, 3);
  return (
    <div>
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img src={HERO_IMG} alt="Sardegna" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <div className="mb-6"><img src={LOGO_URL} alt="Maretrek" className="h-20 md:h-28 mx-auto rounded-lg shadow-2xl" /></div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Scopri la Sardegna dal Mare</h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">Escursioni in barca, visite guidate, noleggio gommoni. Vivi il Mediterraneo con guide esperte.</p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 shadow-lg" onClick={() => setView('catalog')}><Compass className="w-5 h-5 mr-2" />Esplora le Esperienze</Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>
      <section className="container mx-auto px-4 -mt-16 relative z-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map(exp => (
            <Card key={exp.id} className="card-hover overflow-hidden cursor-pointer border-0 shadow-lg" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-48"><img src={(exp.images && exp.images[0]) || exp.image_url || '/uploads/placeholder.jpg'} alt={exp.name} className="w-full h-full object-cover" /><div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div><div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full font-bold text-primary">{fmtPrice(exp.price_b2c)}</div></div>
              <CardHeader className="pb-2"><CardTitle className="text-lg leading-tight">{exp.name}</CardTitle></CardHeader>
              <CardContent className="pb-4"><p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p><div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span></div></CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Perche Scegliere Maretrek</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[{ icon: Star, title: 'Guide Esperte', desc: 'Professionisti abilitati con anni di esperienza.' },{ icon: Ship, title: 'Imbarcazioni di Qualita', desc: 'Flotta moderna e sicura per ogni avventura.' },{ icon: Sun, title: 'Esperienze Uniche', desc: 'Itinerari esclusivi per ricordi indimenticabili.' }].map((b,i) => (
            <div key={i} className="text-center p-6"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><b.icon className="w-8 h-8 text-primary" /></div><h3 className="text-xl font-semibold mb-2">{b.title}</h3><p className="text-muted-foreground">{b.desc}</p></div>
          ))}
        </div>
      </section>
      <section className="wave-bg py-16"><div className="container mx-auto px-4 text-center text-white"><h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto per la Tua Avventura?</h2><p className="text-lg text-white/80 mb-8">Prenota ora la tua esperienza in Sardegna.</p><Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" onClick={() => setView('catalog')}>Vedi Tutte le Esperienze <ChevronRight className="w-5 h-5 ml-1" /></Button></div></section>
    </div>
  );
}

// ============ CATALOG ============
function CatalogPage({ setView, experiences }) {
  const [typeF, setTypeF] = useState('ALL');
  const [langF, setLangF] = useState('ALL');
  const [q, setQ] = useState('');
  const filtered = experiences.filter(e => {
    if (typeF !== 'ALL' && e.type !== typeF) return false;
    if (langF !== 'ALL' && !(e.languages||[]).includes(langF)) return false;
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8"><h1 className="text-3xl md:text-4xl font-bold mb-2">Le Nostre Esperienze</h1><p className="text-muted-foreground">Scopri tutte le attivita disponibili.</p></div>
      <div className="flex flex-wrap gap-3 mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Cerca..." value={q} onChange={e=>setQ(e.target.value)} className="pl-9" /></div></div>
        <Select value={typeF} onValueChange={setTypeF}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tutti i tipi</SelectItem><SelectItem value="GITA_GOMMONE">Gita in Gommone</SelectItem><SelectItem value="GITA_BARCA">Gita in Barca</SelectItem><SelectItem value="VISITA_GUIDATA">Visita Guidata</SelectItem><SelectItem value="NOLEGGIO_NATANTE">Noleggio Natante</SelectItem></SelectContent></Select>
        <Select value={langF} onValueChange={setLangF}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tutte le lingue</SelectItem><SelectItem value="IT">Italiano</SelectItem><SelectItem value="EN">English</SelectItem><SelectItem value="FR">Francais</SelectItem><SelectItem value="DE">Deutsch</SelectItem></SelectContent></Select>
      </div>
      {filtered.length === 0 ? <div className="text-center py-20"><Waves className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">Nessuna esperienza trovata.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(exp => (
            <Card key={exp.id} className="card-hover overflow-hidden border shadow-sm cursor-pointer group" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-52 overflow-hidden"><img src={(exp.images && exp.images[0]) || exp.image_url || '/uploads/placeholder.jpg'} alt={exp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div></div>
              <CardHeader className="pb-2"><CardTitle className="text-lg leading-tight">{exp.name}</CardTitle><CardDescription className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{exp.meeting_point}</CardDescription></CardHeader>
              <CardContent className="pb-2"><p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p><div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span><span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{(exp.languages||[]).join(', ')}</span></div></CardContent>
              <CardFooter className="pt-0 flex justify-between items-center"><div className="text-2xl font-bold text-primary">{fmtPrice(exp.price_b2c)}<span className="text-xs font-normal text-muted-foreground">/persona</span></div><Button size="sm">Scopri <ChevronRight className="w-4 h-4 ml-1" /></Button></CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ EXPERIENCE DETAIL (with waitlist) ============
function ExperienceDetail({ experience, setView }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [showWaitlist, setShowWaitlist] = useState(null);
  const [wlForm, setWlForm] = useState({ name: '', email: '', phone: '', seats: 1 });
  const [selectedDate, setSelectedDate] = useState(''); // Date picker
  const [allSlots, setAllSlots] = useState([]); // Tutti gli slot per filtraggio
  const [assigned, setAssigned] = useState([]); // Risorse assegnate (calcolate in useEffect)
  const [showResourceSelector, setShowResourceSelector] = useState(null); // Dialog per selezione risorsa
  const [dateSlots, setDateSlots] = useState([]); // Slot per una specifica data (quando ci sono multiple risorse)

  useEffect(() => {
    if (!experience) return;
    setLoading(true);
    // IMPORTANTE: Non filtrare per data futura, altrimenti non vediamo tutte le risorse assegnate
    Promise.all([api(`slots?experience_id=${experience.id}`), api('resources')]).then(([s, r]) => {
      // Filtra solo slot non cancellati (ma include anche slot passati per mostrare tutte le risorse)
      const validSlots = Array.isArray(s) ? s.filter(sl => sl.status !== 'CANCELLED') : [];
      // Per la visualizzazione, mostra solo slot futuri
      const futureSlots = validSlots.filter(sl => new Date(sl.start_datetime) > new Date());
      setAllSlots(validSlots); // Salva TUTTI per calcolare risorse
      setSlots(futureSlots); // Mostra solo futuri
      setResources(Array.isArray(r) ? r : []);
      setLoading(false);
    });
  }, [experience]);
  
  // Filtra slot quando cambia la data selezionata
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Solo data, senza ora
    
    if (!selectedDate) {
      // Mostra solo slot futuri quando nessuna data è selezionata
      // Slot è futuro se la data di FINE è >= oggi
      const futureSlots = allSlots.filter(sl => {
        const slotEndDate = new Date(sl.end_datetime).toISOString().split('T')[0];
        return slotEndDate >= today;
      });
      setSlots(futureSlots);
    } else {
      const filtered = allSlots.filter(slot => {
        const slotStartDate = new Date(slot.start_datetime).toISOString().split('T')[0];
        const slotEndDate = new Date(slot.end_datetime).toISOString().split('T')[0];
        
        // Controlla se la data selezionata cade DENTRO il periodo dello slot
        const isInRange = selectedDate >= slotStartDate && selectedDate <= slotEndDate;
        
        // La data selezionata deve essere >= oggi (non nel passato)
        const isNotPast = selectedDate >= today;
        
        return isInRange && isNotPast;
      });
      setSlots(filtered);
    }
  }, [selectedDate, allSlots]);
  
  // Calcola risorse assegnate quando cambiano allSlots o resources
  useEffect(() => {
    console.log('[DEBUG] allSlots.length:', allSlots.length, 'resources.length:', resources.length);
    if (allSlots.length > 0 && resources.length > 0) {
      const allResourceIds = [...new Set(allSlots.flatMap(s => s.resource_ids || []))];
      console.log('[DEBUG] allResourceIds:', allResourceIds);
      const assignedResources = resources.filter(r => allResourceIds.includes(r.id));
      console.log('[DEBUG] assignedResources:', assignedResources.map(r => r.name));
      setAssigned(assignedResources);
    }
  }, [allSlots, resources]);

  const joinWaitlist = async (slotId) => {
    const res = await api('waitlist', { method: 'POST', body: { slot_id: slotId, experience_id: experience.id, experience_name: experience.name, customer_name: wlForm.name, customer_email: wlForm.email, customer_phone: wlForm.phone, seats_requested: wlForm.seats } });
    if (res.error) { toast.error(res.error); return; }
    toast.success('Aggiunto alla lista d\'attesa! Ti contatteremo quando si libera un posto.');
    setShowWaitlist(null);
    setWlForm({ name: '', email: '', phone: '', seats: 1 });
  };

  // Funzione per gestire il click su una data - controlla se ci sono più slot per la stessa data
  const handleDateClick = (dateSlots) => {
    // Conta quanti slot hanno posti disponibili
    const availableSlots = dateSlots.filter(s => {
      const avail = s.max_seats - s.booked_seats - (s.blocked_seats || 0);
      return avail > 0;
    });

    if (availableSlots.length === 0) {
      // Tutti gli slot sono pieni, non fare nulla (gestito nell'UI)
      return;
    } else if (dateSlots.length === 1) {
      // Un solo slot totale (quindi può essere solo disponibile), vai direttamente al booking
      setView('booking', { experience, slot: dateSlots[0] });
    } else {
      // Più slot per la stessa data, mostra SEMPRE il selettore (anche se alcuni sono pieni)
      // Questo permette all'utente di vedere quali risorse sono disponibili e quali no
      setDateSlots(dateSlots);
      setShowResourceSelector(true);
    }
  };

  // Raggruppa gli slot per data
  const groupedSlots = useMemo(() => {
    const groups = {};
    slots.forEach(slot => {
      const dateKey = slot.start_datetime.split('T')[0]; // YYYY-MM-DD
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    });
    return groups;
  }, [slots]);

  if (!experience) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => setView('catalog')} className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium"><ArrowLeft className="w-4 h-4" />Torna alle Esperienze</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-[400px]"><img src={experience.image_url} alt={experience.name} className="w-full h-full object-cover" /><div className="absolute top-4 left-4"><TypeBadge type={experience.type} /></div></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{experience.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{experience.meeting_point}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" />{Math.floor(experience.duration_minutes/60)}h{experience.duration_minutes%60>0?` ${experience.duration_minutes%60}m`:''}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />Max {experience.max_capacity}</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-primary" />{(experience.languages||[]).map(l=>LANG_MAP[l]||l).join(', ')}</span>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-6">{experience.description}</p>
            {experience.itinerary_stops?.length > 0 && (
              <div className="mb-6"><h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" />Itinerario</h3>
                <div className="relative pl-6"><div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-primary/20" />{experience.itinerary_stops.map((s,i)=>(<div key={i} className="relative mb-3 last:mb-0"><div className={`absolute -left-3.5 w-3 h-3 rounded-full border-2 ${i===0||i===experience.itinerary_stops.length-1?'bg-primary border-primary':'bg-white border-primary/50'}`}/><p className="text-sm ml-2">{s}</p></div>))}</div>
              </div>
            )}
            {assigned.length > 0 && (
              <div className="mb-6"><h3 className="text-xl font-semibold mb-3">Risorse Assegnate</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{assigned.map(r=>(<div key={r.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.type==='GUIDE'?'bg-emerald-100 text-emerald-700':'bg-sky-100 text-sky-700'}`}>{r.type==='GUIDE'?<User className="w-5 h-5"/>:<Ship className="w-5 h-5"/>}</div><div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.type==='GUIDE'?'Guida':(BOAT_TYPE_LABELS[r.boat_type]||'Imbarcazione')}{r.capacity?` - ${r.capacity} posti`:''}</p></div></div>))}</div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-2xl">{fmtPrice(experience.price_b2c)}</CardTitle>
                <span className="text-sm text-muted-foreground">per persona</span>
              </div>
              <CardDescription>Scegli una data disponibile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Date Picker per selezionare data custom */}
              <div className="pb-3 border-b">
                <Label htmlFor="date-picker" className="text-sm font-medium mb-2 block">📅 Cerca per data specifica</Label>
                <div className="flex gap-2">
                  <Input 
                    id="date-picker"
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1"
                  />
                  {selectedDate && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedDate('')}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {selectedDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostrando slot per {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              
              {/* Badge con i prossimi 5 GIORNI CONSECUTIVI dalla data odierna */}
              {!selectedDate && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Genera i prossimi 5 giorni consecutivi
                const next5Days = [];
                for (let i = 0; i < 5; i++) {
                  const day = new Date(today);
                  day.setDate(today.getDate() + i);
                  const dateKey = day.toISOString().split('T')[0];
                  
                  // Conta disponibilità per questo giorno
                  let totalAvail = 0;
                  let hasSlots = false;
                  
                  allSlots.forEach(slot => {
                    const slotDate = slot.start_datetime.split('T')[0];
                    if (slotDate === dateKey) {
                      hasSlots = true;
                      const avail = slot.max_seats - slot.booked_seats - (slot.blocked_seats || 0);
                      if (avail > 0) {
                        totalAvail += avail;
                      }
                    }
                  });
                  
                  // Aggiungi il giorno anche se non ha slot (mostrerà 0)
                  next5Days.push({ date: dateKey, totalAvail, hasSlots });
                }
                
                return (
                  <div className="pb-3 border-b">
                    <Label className="text-sm font-medium mb-2 block">🗓️ Prossimi 5 giorni</Label>
                    <div className="flex flex-wrap gap-2">
                      {next5Days.map(({ date, totalAvail, hasSlots }) => {
                        const dateObj = new Date(date + 'T12:00:00');
                        const isDisabled = !hasSlots || totalAvail === 0;
                        
                        return (
                          <Badge 
                            key={date}
                            variant={isDisabled ? "secondary" : "outline"}
                            className={`px-3 py-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-primary hover:text-primary-foreground transition'}`}
                            onClick={() => !isDisabled && setSelectedDate(date)}
                          >
                            <CalIcon className="w-3 h-3 mr-1" />
                            {format(dateObj, 'd MMM', { locale: it })}
                            <span className="ml-1 text-xs opacity-70">
                              ({totalAvail})
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {next5Days.some(d => d.hasSlots && d.totalAvail > 0) 
                        ? 'Clicca su una data per vedere gli orari' 
                        : 'Nessuna disponibilità nei prossimi 5 giorni'}
                    </p>
                  </div>
                );
              })()}
              
              {/* Lista Slot - Raggruppati per Data */}
              <div className="max-h-[400px] overflow-y-auto space-y-3">
              {loading ? (
                <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : Object.keys(groupedSlots).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {selectedDate ? 'Nessuno slot disponibile per questa data.' : 'Nessuna data disponibile.'}
                </p>
              ) : (
                Object.entries(groupedSlots).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([date, dateSlots]) => {
                  // Calcola disponibilità totale per questa data
                  const totalAvailable = dateSlots.reduce((sum, s) => {
                    const avail = s.max_seats - s.booked_seats - (s.blocked_seats || 0);
                    return sum + Math.max(0, avail);
                  }, 0);
                  const allFull = totalAvailable === 0;
                  const hasMultipleSlots = dateSlots.length > 1;

                  // Usa il primo slot per mostrare data e orario
                  const firstSlot = dateSlots[0];

                  return (
                    <div 
                      key={date} 
                      className={`p-3 rounded-lg border ${allFull ? 'bg-red-50/50 border-red-100' : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'} transition`}
                      onClick={() => !allFull && handleDateClick(dateSlots)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm capitalize">{fmtDate(firstSlot.start_datetime)}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtTime(firstSlot.start_datetime)} - {fmtTime(firstSlot.end_datetime)}
                          </p>
                          {hasMultipleSlots && !allFull && (
                            <p className="text-xs text-primary font-medium mt-1">
                              🚤 {dateSlots.length} risorse disponibili
                            </p>
                          )}
                        </div>
                        {allFull ? (
                          <Badge variant="destructive" className="text-xs">Completo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{totalAvailable} posti</Badge>
                        )}
                      </div>
                      <AvailabilityBar 
                        booked={dateSlots.reduce((sum, s) => sum + s.booked_seats + (s.blocked_seats || 0), 0)} 
                        max={dateSlots.reduce((sum, s) => sum + s.max_seats, 0)} 
                      />
                      {allFull ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-2 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100" 
                          onClick={(e) => { e.stopPropagation(); setShowWaitlist(firstSlot.id); }}
                        >
                          <Bell className="w-4 h-4 mr-1" />Lista d'Attesa
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full mt-2">
                          {hasMultipleSlots ? 'Scegli Risorsa' : 'Prenota Ora'}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Waitlist Dialog */}
      <Dialog open={!!showWaitlist} onOpenChange={() => setShowWaitlist(null)}>
        <DialogContent><DialogHeader><DialogTitle>Lista d'Attesa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Inserisci i tuoi dati. Ti contatteremo quando si libera un posto (hai 30 minuti per confermare).</p>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={wlForm.name} onChange={e=>setWlForm({...wlForm,name:e.target.value})} placeholder="Mario Rossi" /></div>
            <div><Label>Email</Label><Input type="email" value={wlForm.email} onChange={e=>setWlForm({...wlForm,email:e.target.value})} placeholder="mario@email.com" /></div>
            <div><Label>Telefono</Label><Input value={wlForm.phone} onChange={e=>setWlForm({...wlForm,phone:e.target.value})} placeholder="+39 333 1234567" /></div>
            <div><Label>Posti richiesti</Label><Input type="number" min="1" max="10" value={wlForm.seats} onChange={e=>setWlForm({...wlForm,seats:parseInt(e.target.value)||1})} /></div>
            <Button className="w-full" onClick={() => joinWaitlist(showWaitlist)}><Bell className="w-4 h-4 mr-2" />Iscriviti alla Lista d'Attesa</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resource Selector Dialog - Quando ci sono più slot/risorse per la stessa data */}
      <Dialog open={showResourceSelector} onOpenChange={setShowResourceSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scegli la Risorsa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Sono disponibili più barche per questa data. Seleziona quella che preferisci:
          </p>
          <div className="space-y-3">
            {dateSlots.map(slot => {
              const avail = slot.max_seats - slot.booked_seats - (slot.blocked_seats || 0);
              const isFull = avail <= 0;
              const resourceIds = slot.resource_ids || [];
              const slotResources = resources.filter(r => resourceIds.includes(r.id));
              
              return (
                <Card 
                  key={slot.id} 
                  className={`overflow-hidden transition ${isFull ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-primary hover:shadow-md'}`}
                  onClick={() => {
                    if (!isFull) {
                      setShowResourceSelector(false);
                      setView('booking', { experience, slot });
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Ship className={`w-4 h-4 ${isFull ? 'text-gray-400' : 'text-primary'}`} />
                          <p className={`font-semibold text-sm ${isFull ? 'text-gray-500' : ''}`}>
                            {slotResources.length > 0 
                              ? slotResources.map(r => r.name).join(', ')
                              : 'Risorsa Non Specificata'}
                          </p>
                        </div>
                        {slotResources.length > 0 && (
                          <p className="text-xs text-muted-foreground ml-6">
                            {slotResources.map(r => 
                              r.type === 'GUIDE' ? 'Guida' : (BOAT_TYPE_LABELS[r.boat_type] || 'Imbarcazione')
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={isFull ? "destructive" : "secondary"} className="text-xs">
                        {isFull ? 'Completo' : `${avail} posti`}
                      </Badge>
                    </div>
                    <AvailabilityBar 
                      booked={slot.booked_seats + (slot.blocked_seats || 0)} 
                      max={slot.max_seats} 
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        Orario: {fmtTime(slot.start_datetime)} - {fmtTime(slot.end_datetime)}
                      </p>
                      {isFull && (
                        <p className="text-xs text-red-600 font-medium">Non disponibile</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
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
  const maxAvail = slot.max_seats - slot.booked_seats - (slot.blocked_seats||0);
  
  // Calcola prezzo con priorità: price_override > fascia stagionale > prezzo base
  let pricePerSeat = experience.price_b2c;
  let appliedTierName = null;
  
  if (slot.price_override) {
    // Priorità 1: Override dello slot
    pricePerSeat = slot.price_override;
  } else {
    // Priorità 2: Fascia stagionale
    const tier = getPriceTierForDate(experience, slot.start_datetime);
    if (tier && tier.price_b2c) {
      pricePerSeat = tier.price_b2c;
      appliedTierName = tier.tier_name;
    }
    // Altrimenti usa prezzo base (già impostato)
  }
  
  const subtotal = pricePerSeat * seats;
  const discount = voucherResult?.valid ? (voucherResult.voucher.type === 'PERCENTAGE' ? (subtotal * voucherResult.voucher.value / 100) : Math.min(voucherResult.voucher.value, subtotal)) : 0;
  const total = subtotal - discount;

  const validateVoucher = async () => { if (!voucherCode.trim()) return; const res = await api('vouchers/validate', { method: 'POST', body: { code: voucherCode } }); setVoucherResult(res); if (res.valid) toast.success('Voucher applicato!'); else toast.error(res.error || 'Voucher non valido'); };

  const handleBook = async () => {
    setLoading(true);
    try {
      const res = await api('bookings', { method: 'POST', body: { slot_id: slot.id, experience_id: experience.id, customer_name: form.name, customer_email: form.email, customer_phone: form.phone, seats, total_amount: subtotal, voucher_code: voucherResult?.valid ? voucherCode : null, special_requests: form.special_requests, participants } });
      if (res.error) { toast.error(res.error); setLoading(false); return; }
      setBookingResult(res); setStep(5); toast.success('Prenotazione confermata!');
    } catch { toast.error('Errore nella prenotazione'); }
    setLoading(false);
  };

  if (step === 5 && bookingResult) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-10 h-10 text-green-600" /></div><h1 className="text-3xl font-bold mb-2">Prenotazione Confermata!</h1></div>
        <Card className="shadow-lg">
          <CardHeader className="bg-primary/5"><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">Codice prenotazione</p><p className="text-2xl font-bold font-mono text-primary">{bookingResult.booking_ref}</p></div><StatusBadge status={bookingResult.status} /></div></CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div><div><p className="text-muted-foreground">Data</p><p className="font-medium capitalize">{fmtDateTime(slot.start_datetime)}</p></div><div><p className="text-muted-foreground">Posti</p><p className="font-medium">{bookingResult.seats}</p></div><div><p className="text-muted-foreground">Totale</p><p className="font-medium text-primary">{fmtPrice(bookingResult.total_amount)}</p></div></div>
          </CardContent>
          <CardFooter className="flex gap-3"><Button onClick={() => setView('catalog')} className="flex-1">Torna alle Esperienze</Button><Button variant="outline" onClick={() => setView('home')}>Home</Button></CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <button onClick={() => setView('detail', { experience })} className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium"><ArrowLeft className="w-4 h-4" />Torna ai dettagli</button>
      <div className="flex items-center mb-8">
        {['Posti','Dati','Voucher','Pagamento'].map((label,i) => (
          <div key={i} className="flex-1 flex items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step>i+1?'bg-green-500 text-white':step===i+1?'bg-primary text-white':'bg-muted text-muted-foreground'}`}>{step>i+1?<CheckCircle2 className="w-4 h-4"/>:i+1}</div><span className={`ml-2 text-sm hidden sm:inline ${step===i+1?'font-semibold text-primary':'text-muted-foreground'}`}>{label}</span>{i<3&&<div className={`flex-1 h-0.5 mx-3 ${step>i+1?'bg-green-500':'bg-muted'}`}/>}</div>
        ))}
      </div>
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex gap-4 items-center">
            {experience.images && experience.images.length > 0 ? (
              <img src={experience.images[0]} alt={experience.name} className="w-16 h-16 rounded-lg object-cover" />
            ) : experience.image_url ? (
              <img src={experience.image_url} alt={experience.name} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-base">{experience.name}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{fmtDateTime(slot.start_datetime)}</p>
              {appliedTierName && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Tag className="w-3 h-3 mr-1" />{appliedTierName}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-lg">{fmtPrice(pricePerSeat)}</p>
              <p className="text-xs text-muted-foreground">per persona</p>
              {slot.price_override && (
                <p className="text-xs text-amber-600 font-medium">Prezzo Override</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {step===1&&(<div className="space-y-6"><div><Label className="text-base font-semibold">Numero di Partecipanti</Label><p className="text-sm text-muted-foreground mb-3">Max {maxAvail} posti</p><div className="flex items-center gap-4"><Button variant="outline" size="icon" onClick={()=>setSeats(Math.max(1,seats-1))} disabled={seats<=1}>-</Button><span className="text-2xl font-bold w-12 text-center">{seats}</span><Button variant="outline" size="icon" onClick={()=>setSeats(Math.min(maxAvail,seats+1))} disabled={seats>=maxAvail}>+</Button></div></div><Separator /><div className="flex justify-between text-lg"><span>Totale provvisorio</span><span className="font-bold text-primary">{fmtPrice(subtotal)}</span></div></div>)}
          {step===2&&(<div className="space-y-6"><div><h3 className="font-semibold mb-4">Dati del Referente</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Nome *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Mario Rossi"/></div><div><Label>Email *</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="mario@email.com"/></div><div><Label>Telefono *</Label><Input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+39 333 1234567"/></div></div></div>{seats>1&&<div><h3 className="font-semibold mb-3">Altri Partecipanti</h3>{Array.from({length:seats-1}).map((_,i)=>(<Input key={i} className="mb-2" placeholder={`Partecipante ${i+2}`} value={participants[i]?.name||''} onChange={e=>{const p=[...participants];p[i]={...p[i],name:e.target.value};setParticipants(p);}}/>))}</div>}<div><Label>Richieste Speciali</Label><Textarea value={form.special_requests} onChange={e=>setForm({...form,special_requests:e.target.value})} placeholder="Allergie, esigenze..."/></div></div>)}
          {step===3&&(<div className="space-y-6"><div><h3 className="font-semibold mb-2">Hai un Codice Sconto?</h3><div className="flex gap-3"><Input value={voucherCode} onChange={e=>setVoucherCode(e.target.value.toUpperCase())} placeholder="ES: BENVENUTO10" className="font-mono"/><Button onClick={validateVoucher} variant="secondary"><Tag className="w-4 h-4 mr-2"/>Applica</Button></div>{voucherResult&&<div className={`mt-3 p-3 rounded-lg text-sm ${voucherResult.valid?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{voucherResult.valid?<p><CheckCircle2 className="w-4 h-4 inline mr-1"/>Risparmi {fmtPrice(discount)}</p>:<p>{voucherResult.error}</p>}</div>}</div><Separator /><div className="space-y-2"><div className="flex justify-between"><span>Subtotale ({seats} pers.)</span><span>{fmtPrice(subtotal)}</span></div>{discount>0&&<div className="flex justify-between text-green-600"><span>Sconto</span><span>-{fmtPrice(discount)}</span></div>}<Separator /><div className="flex justify-between text-lg font-bold"><span>Totale</span><span className="text-primary">{fmtPrice(total)}</span></div></div></div>)}
          {step===4&&(<div className="space-y-6"><div className="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-sm text-amber-800 font-medium"><CreditCard className="w-4 h-4 inline mr-2"/>Pagamento Simulato (MOCK)</p></div><div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg text-sm"><div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div><div><p className="text-muted-foreground">Data</p><p className="font-medium capitalize">{fmtDateTime(slot.start_datetime)}</p></div><div><p className="text-muted-foreground">Partecipanti</p><p className="font-medium">{seats}</p></div><div><p className="text-muted-foreground">Referente</p><p className="font-medium">{form.name}</p></div></div><div className="space-y-1"><div className="flex justify-between"><span>Subtotale</span><span>{fmtPrice(subtotal)}</span></div>{discount>0&&<div className="flex justify-between text-green-600"><span>Sconto</span><span>-{fmtPrice(discount)}</span></div>}<div className="flex justify-between text-xl font-bold pt-2 border-t"><span>Totale</span><span className="text-primary">{fmtPrice(total)}</span></div></div></div>)}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={()=>step===1?setView('detail',{experience}):setStep(step-1)}><ArrowLeft className="w-4 h-4 mr-2"/>{step===1?'Indietro':'Precedente'}</Button>
          {step<4?<Button onClick={()=>{if(step===2&&(!form.name||!form.email||!form.phone)){toast.error('Compila tutti i campi');return;}setStep(step+1);}}>Continua <ChevronRight className="w-4 h-4 ml-2"/></Button>:<Button onClick={handleBook} disabled={loading} className="bg-green-600 hover:bg-green-700">{loading?<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>:<CreditCard className="w-4 h-4 mr-2"/>}Conferma e Paga {fmtPrice(total)}</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}

// ============ RESOURCE BOOKINGS WITH SEAT ASSIGNMENT ============
const ResourceBookingsList = memo(function ResourceBookingsList({ resource, bookings, onUpdate }) {
  const [seatEdits, setSeatEdits] = useState({});
  
  useEffect(() => {
    const initial = {};
    bookings.forEach(b => {
      initial[b.id] = b.seat_assignments || [];
    });
    setSeatEdits(initial);
  }, [bookings]);

  const updateSeatAssignment = async (bookingId) => {
    const assignments = seatEdits[bookingId] || [];
    const res = await api(`bookings/${bookingId}`, { 
      method: 'PUT', 
      body: { action: 'update_details', seat_assignments: assignments } 
    });
    if (res.error) toast.error(res.error);
    else { toast.success('Posti assegnati!'); onUpdate(); }
  };

  const handleSeatChange = (bookingId, index, value) => {
    setSeatEdits(prev => {
      const current = [...(prev[bookingId] || [])];
      current[index] = value;
      return { ...prev, [bookingId]: current };
    });
  };

  const autoAssignSeats = (booking) => {
    const assignments = [];
    let nextSeat = 1;
    // Find highest assigned seat number
    Object.values(seatEdits).forEach(seats => {
      seats.forEach(s => {
        const num = parseInt(s);
        if (!isNaN(num) && num >= nextSeat) nextSeat = num + 1;
      });
    });
    for (let i = 0; i < booking.seats; i++) {
      assignments.push(`Posto ${nextSeat + i}`);
    }
    setSeatEdits(prev => ({ ...prev, [booking.id]: assignments }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Ship className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Imbarcazione con Conducente</p>
          <p className="text-xs text-blue-700">Assegna numeri di posto per ogni prenotazione su questa risorsa</p>
        </div>
      </div>
      
      {bookings.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione attiva per questa risorsa.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{b.customer_name}</h4>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.booking_ref} | {b.experience_name} | {fmtDateTime(b.slot_datetime || b.created_at)}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="font-medium">{b.seats} {b.seats === 1 ? 'posto' : 'posti'}</span> | {fmtPrice(b.total_amount)}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Assegnazione Posti</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => autoAssignSeats(b)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Auto-assegna
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: b.seats }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-16">Passeggero {idx + 1}</Label>
                        <Input
                          placeholder={`Posto ${idx + 1}`}
                          value={(seatEdits[b.id] || [])[idx] || ''}
                          onChange={(e) => handleSeatChange(b.id, idx, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    size="sm"
                    onClick={() => updateSeatAssignment(b.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Salva Assegnazioni
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

// ============ GANTT CALENDAR ============
const GanttCalendar = memo(function GanttCalendar({ resources, allSlots, allBookings, experiences, onRefresh }) {
  const [weekOff, setWeekOff] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotBookings, setSlotBookings] = useState([]);
  const [editBk, setEditBk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dragInfo, setDragInfo] = useState(null);

  const weekStart = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(s, weekOff * 7);
  }, [weekOff]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const getResourceDaySlots = (resId, day) => {
    const ds = format(day, 'yyyy-MM-dd');
    return (allSlots || []).filter(s => {
      const sd = (s.start_datetime || '').split('T')[0];
      return sd === ds && (s.resource_ids || []).includes(resId);
    });
  };
  const getSlotBookings = (slotId) => (allBookings || []).filter(b => b.slot_id === slotId && b.status !== 'CANCELLED');
  const getExpName = (eid) => (experiences || []).find(e => e.id === eid)?.name || 'N/A';
  const getExpType = (eid) => (experiences || []).find(e => e.id === eid)?.type || '';

  const handleDragStart = (e, booking, slot) => {
    const data = JSON.stringify({ bookingId: booking.id, slotId: slot.id, expId: slot.experience_id });
    e.dataTransfer.setData('text/plain', data);
    e.dataTransfer.effectAllowed = 'move';
    setDragInfo({ bookingId: booking.id, slotId: slot.id });
  };

  const handleDrop = async (e, targetDay, targetResId) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const sourceSlot = allSlots.find(s => s.id === data.slotId);
      if (!sourceSlot) return;
      const targetDs = format(targetDay, 'yyyy-MM-dd');
      let targetSlot = allSlots.find(s => {
        const sd = (s.start_datetime || '').split('T')[0];
        return sd === targetDs && s.experience_id === sourceSlot.experience_id && (s.resource_ids || []).includes(targetResId) && s.id !== data.slotId;
      });
      if (!targetSlot) {
        const srcTime = (sourceSlot.start_datetime || '').split('T')[1];
        const srcEndTime = (sourceSlot.end_datetime || '').split('T')[1];
        const created = await api('slots', { method: 'POST', body: { experience_id: sourceSlot.experience_id, resource_ids: sourceSlot.resource_ids, start_datetime: `${targetDs}T${srcTime}`, end_datetime: `${targetDs}T${srcEndTime}`, max_seats: sourceSlot.max_seats } });
        if (created.error) { toast.error(created.error); return; }
        targetSlot = created;
      }
      const res = await api(`bookings/${data.bookingId}`, { method: 'PUT', body: { action: 'reassign', new_slot_id: targetSlot.id } });
      if (res.error) toast.error(res.error);
      else { toast.success('Prenotazione riassegnata!'); onRefresh(); }
    } catch (err) { console.error(err); }
    setDragInfo(null);
  };

  const openSlotDetail = (slot) => { setSlotBookings(getSlotBookings(slot.id)); setSelectedSlot(slot); };

  const saveBookingEdit = async () => {
    if (!editBk) return;
    const res = await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'update_details', ...editForm } });
    if (res.error) toast.error(res.error);
    else { toast.success('Prenotazione aggiornata!'); setEditBk(null); onRefresh(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOff(w => w - 1)}><ChevronLeft className="w-4 h-4 mr-1" />Sett. Prec.</Button>
        <div className="text-center"><h3 className="text-lg font-semibold capitalize">{format(weekDays[0], 'd MMM', { locale: it })} - {format(weekDays[6], 'd MMM yyyy', { locale: it })}</h3><button className="text-xs text-primary hover:underline" onClick={() => setWeekOff(0)}>Oggi</button></div>
        <Button variant="outline" size="sm" onClick={() => setWeekOff(w => w + 1)}>Sett. Succ.<ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>

      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
        <div style={{ minWidth: '1200px' }}>
          <div className="grid border-b" style={{ gridTemplateColumns: '120px repeat(7, 150px)' }}>
            <div className="p-2 font-semibold bg-muted/50 text-xs border-r sticky left-0 z-10 bg-white">Risorsa</div>
            {weekDays.map((day, i) => (
              <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/10 font-bold' : 'bg-muted/30'}`}>
                <div className="capitalize text-sm text-muted-foreground font-medium">{format(day, 'EEEE', { locale: it })}</div>
                <div className="text-2xl font-bold mt-1">{format(day, 'd')}</div>
                <div className="text-xs text-muted-foreground">{format(day, 'MMM', { locale: it })}</div>
              </div>
            ))}
          </div>
          {(resources || []).map(res => (
            <div key={res.id} className="grid border-b last:border-b-0 hover:bg-muted/10" style={{ gridTemplateColumns: '120px repeat(7, 150px)' }}>
              <div className="p-2 border-r flex items-center justify-center gap-2 bg-white sticky left-0 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${res.type === 'GUIDE' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{res.type === 'GUIDE' ? 'G' : 'B'}</div>
                <div className="flex items-center justify-center flex-1">
                  <p className="font-semibold text-xs" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', whiteSpace: 'nowrap' }}>
                    {res.name}
                  </p>
                </div>
              </div>
              {weekDays.map((day, di) => {
                const daySlots = getResourceDaySlots(res.id, day);
                return (
                  <div key={di} className={`p-2 border-r last:border-r-0 min-h-[120px] transition-colors ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''} ${dragInfo ? 'hover:bg-blue-50 hover:ring-2 hover:ring-blue-400 hover:ring-inset' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => handleDrop(e, day, res.id)}>
                    <div className="space-y-2">
                      {daySlots.map(slot => {
                        const sb = getSlotBookings(slot.id);
                        const expType = getExpType(slot.experience_id);
                        const gc = GANTT_COLORS[expType] || 'bg-gray-50 border-gray-300';
                        return (
                          <div key={slot.id} className={`p-2 rounded-lg border-2 text-xs cursor-pointer ${gc} hover:shadow-lg transition-all relative group`} onClick={() => openSlotDetail(slot)}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-sm leading-tight flex-1">{getExpName(slot.experience_id)}</p>
                              {sb.length > 0 && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-muted-foreground font-medium mb-2">{fmtTime(slot.start_datetime)} - {fmtTime(slot.end_datetime)}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${slot.booked_seats >= slot.max_seats ? 'bg-red-500' : slot.booked_seats > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} style={{ width: `${Math.min((slot.booked_seats / slot.max_seats) * 100, 100)}%` }} />
                              </div>
                              <span className="font-bold text-sm whitespace-nowrap">{slot.booked_seats}/{slot.max_seats}</span>
                            </div>
                            {/* Draggable booking indicators */}
                            {sb.map(bk => (
                              <div key={bk.id} draggable onDragStart={(e) => handleDragStart(e, bk, slot)} className="mt-1 px-2 py-1 bg-white/90 rounded-md text-[10px] cursor-grab active:cursor-grabbing hover:bg-white border border-transparent hover:border-primary/40 hover:shadow-sm transition-all flex items-center gap-1">
                                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{bk.customer_name}</span>
                                <span className="text-muted-foreground">({bk.seats}p)</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-sky-100 border-2 border-sky-300" />Escursione in Barca</span>
        <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-100 border-2 border-emerald-300" />Visita Guidata</span>
        <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-300" />Noleggio Gommone</span>
        <span className="flex items-center gap-2"><GripVertical className="w-4 h-4" />Trascina per riassegnare</span>
      </div>

      {/* Slot Detail Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSlot && (
            <>
              <DialogHeader>
                <DialogTitle>{getExpName(selectedSlot.experience_id)}</DialogTitle>
                <p className="text-sm text-muted-foreground capitalize">{fmtDateTime(selectedSlot.start_datetime)} | {selectedSlot.booked_seats}/{selectedSlot.max_seats} posti</p>
              </DialogHeader>
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" />Prenotazioni ({slotBookings.length})</h4>
                {slotBookings.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nessuna prenotazione.</p> : (
                  <div className="space-y-2">
                    {slotBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><p className="font-medium">{b.customer_name}</p><StatusBadge status={b.status} />{b.checked_in_at && <Badge className="bg-green-100 text-green-800 text-[10px]">Check-in</Badge>}</div>
                          <p className="text-xs text-muted-foreground">{b.booking_ref} | {b.seats} posti | {fmtPrice(b.total_amount)} | {b.customer_email}</p>
                          {b.seat_assignments && b.seat_assignments.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Ship className="w-3 h-3" />
                              Posti: {b.seat_assignments.join(', ')}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setEditBk(b); setEditForm({ customer_name: b.customer_name, customer_email: b.customer_email, customer_phone: b.customer_phone, special_requests: b.special_requests || '', seats: b.seats, seat_assignments: b.seat_assignments || [] }); }}><Edit className="w-3 h-3 mr-1" />Modifica</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editBk} onOpenChange={() => setEditBk(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editForm.customer_email || ''} onChange={e => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
            <div><Label>Telefono</Label><Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
            <div><Label>Richieste speciali</Label><Textarea value={editForm.special_requests || ''} onChange={e => setEditForm({ ...editForm, special_requests: e.target.value })} /></div>
            
            {editBk && editBk.seats > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Assegnazione Posti ({editBk.seats} {editBk.seats === 1 ? 'posto' : 'posti'})
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: editBk.seats }).map((_, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Posto ${idx + 1}`}
                      value={(editForm.seat_assignments || [])[idx] || ''}
                      onChange={e => {
                        const newAssignments = [...(editForm.seat_assignments || [])];
                        newAssignments[idx] = e.target.value;
                        setEditForm({ ...editForm, seat_assignments: newAssignments });
                      }}
                      className="h-8 text-sm"
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveBookingEdit}>Salva Modifiche</Button>
              <Button variant="destructive" onClick={async () => { await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'cancel' } }); toast.success('Cancellata'); setEditBk(null); onRefresh(); }}>Cancella</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// ============ SETUP GPS ============
function SetupGPS() {
  const [config, setConfig] = useState({ email: '', api_token: '', configured: false });
  const [formData, setFormData] = useState({ email: '', api_token: '' });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [devices, setDevices] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    loadConfig();
    loadResources();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api('gps-config');
      setConfig(data);
      setFormData({ email: data.email || '', api_token: data.api_token || '' });
      setLoading(false);
    } catch (error) {
      console.error('Error loading config:', error);
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const data = await api('resources');
      setResources(Array.isArray(data) ? data.filter(r => r.type === 'BOAT') : []);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const saveConfig = async () => {
    if (!formData.email || !formData.api_token) {
      toast.error('Inserisci email e API token');
      return;
    }
    setSaving(true);
    try {
      await api('gps-config', { method: 'POST', body: formData });
      toast.success('✅ Configurazione GPS salvata!');
      await loadConfig();
    } catch (error) {
      toast.error('Errore salvataggio configurazione');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!formData.email || !formData.api_token) {
      toast.error('Salva prima la configurazione');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Prima salva
      await api('gps-config', { method: 'POST', body: formData });
      
      // Poi testa
      const result = await api('gps/test', { method: 'POST' });
      setTestResult(result);
      
      if (result.success) {
        toast.success(`✅ Connessione riuscita! ${result.device_count} dispositivi trovati`);
        setDevices(result.devices || []);
      } else {
        toast.error(`❌ ${result.error}`);
      }
      
      await loadConfig();
    } catch (error) {
      toast.error('Errore test connessione');
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const updateResourceGPS = async (resourceId, imei) => {
    try {
      // Pulisci IMEI: se vuoto o "undefined", passa null
      const cleanImei = imei && imei !== '' && imei !== 'undefined' ? imei : null;
      
      await api(`resources/${resourceId}`, { 
        method: 'PUT', 
        body: { gps_imei: cleanImei } 
      });
      
      if (cleanImei) {
        toast.success(`✅ IMEI ${cleanImei.slice(-6)} associato!`);
      } else {
        toast.success('✅ IMEI rimosso dalla risorsa');
      }
      
      await loadResources();
      await loadConfig(); // Ricarica anche config per aggiornare lo stato
    } catch (error) {
      console.error('Errore update IMEI:', error);
      toast.error('❌ Errore aggiornamento risorsa');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Navigation className="w-6 h-6 text-primary" />
          Configurazione GPS Balin.app
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura le credenziali API per il tracking GPS della flotta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credenziali */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credenziali API</CardTitle>
            <CardDescription>
              Inserisci email e API token del tuo account Balin.app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gps-email">Email Account Balin.app</Label>
              <Input
                id="gps-email"
                type="email"
                placeholder="esempio@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gps-token">API Token</Label>
              <Input
                id="gps-token"
                type="password"
                placeholder="inserisci il token API"
                value={formData.api_token}
                onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                💡 Trova il token in: Balin.app → Impostazioni → API
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button onClick={saveConfig} disabled={saving} className="flex-1">
                {saving ? 'Salvataggio...' : '💾 Salva Configurazione'}
              </Button>
              <Button 
                onClick={testConnection} 
                disabled={testing || !config.configured}
                variant="outline"
                className="flex-1"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>🔍 Test Connessione</>
                )}
              </Button>
            </div>

            {/* Stato */}
            {config.configured && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800">✅ Configurazione Attiva</p>
                <p className="text-xs text-green-700 mt-1">Email: {config.email}</p>
                {config.last_test && (
                  <p className="text-xs text-green-700">
                    Ultimo test: {new Date(config.last_test).toLocaleString('it-IT')} - 
                    {config.last_test_status === 'success' ? ' ✅ OK' : ' ❌ Failed'}
                  </p>
                )}
              </div>
            )}

            {testResult && !testResult.success && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800">❌ Test Fallito</p>
                <p className="text-xs text-red-700 mt-1">{testResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dispositivi & Associazioni */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dispositivi GPS Disponibili</CardTitle>
            <CardDescription>
              {testResult?.success 
                ? `${devices.length} dispositivi trovati su Balin.app`
                : 'Testa la connessione per vedere i dispositivi'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {devices.map((device, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">Dispositivo {idx + 1}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          IMEI: {device.imei || device.id || 'N/A'}
                        </p>
                      </div>
                      {device.moving ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          🟢 Movimento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">⚪ Fermo</Badge>
                      )}
                    </div>
                    
                    {device.lat && device.lng && (
                      <p className="text-xs text-muted-foreground mb-2">
                        📍 {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Select 
                        onValueChange={(val) => updateResourceGPS(val, device.imei || device.id)}
                        value={resources.find(r => r.gps_imei === (device.imei || device.id))?.id || ''}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Associa a risorsa..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuna associazione</SelectItem>
                          {resources.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} ({r.boat_type || 'BOAT'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Navigation className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nessun dispositivo caricato</p>
                <p className="text-xs mt-1">Clicca "Test Connessione" per vedere i dispositivi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risorse Configurate */}
      {resources.filter(r => r.gps_imei).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risorse con GPS Configurato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.filter(r => r.gps_imei).map(r => (
                <div key={r.id} className="p-3 rounded-lg border bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.boat_type || 'Imbarcazione'}</p>
                      <p className="text-xs font-mono text-primary mt-1">IMEI: {r.gps_imei}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500"
                      onClick={() => updateResourceGPS(r.id, '')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Istruzioni */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-5 h-5" />
            Come Configurare
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Accedi al tuo account su <strong>balin.app</strong></li>
            <li>Vai in <strong>Impostazioni → API</strong> e copia email e token</li>
            <li>Incolla le credenziali nei campi sopra e clicca <strong>"Salva Configurazione"</strong></li>
            <li>Clicca <strong>"Test Connessione"</strong> per verificare e caricare i dispositivi</li>
            <li>Associa ogni dispositivo GPS a una risorsa (imbarcazione) dal menu a tendina</li>
            <li>Vai su <strong>"Mappa Flotta"</strong> per visualizzare la posizione real-time</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}


// ============ ADMIN DASHBOARD ============
function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [experiences, setExps] = useState([]);
  const [resources, setResources] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [showDialog, setShowDialog] = useState(null);
  const [formData, setFormData] = useState({});
  const [editRes, setEditRes] = useState(null);
  const [editResForm, setEditResForm] = useState({});
  const [editBk, setEditBk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewBk, setPreviewBk] = useState(null); // Stato per dialog anteprima prenotazione
  const [seeding, setSeeding] = useState(false);
  const [resBookings, setResBookings] = useState(null);
  
  // Filtri Report
  const [filters, setFilters] = useState({
    code: '',
    date: '',
    resource_id: '',
    experience_id: '',
    customer_name: ''
  });
  const [filteredBookings, setFilteredBookings] = useState([]);
  
  // Filtri Bookings Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingExpFilter, setBookingExpFilter] = useState('ALL');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingCustomerFilter, setBookingCustomerFilter] = useState('');
  const [bookingCodeFilter, setBookingCodeFilter] = useState('');
  
  // Filtro Slot Tab
  const [slotExpFilter, setSlotExpFilter] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [slotPage, setSlotPage] = useState(0);
  const SLOTS_PER_PAGE = 10;
  
  // Filtri Panoramica
  const [overviewDateFilter, setOverviewDateFilter] = useState('');

  const load = useCallback(async () => {
    // Carica solo dati essenziali all'avvio per velocizzare
    const [s, e, r] = await Promise.all([
      api('stats'), 
      api('experiences?all=true'), 
      api('resources')
    ]);
    setStats(s||{}); 
    setExps(Array.isArray(e)?e:[]); 
    setResources(Array.isArray(r)?r:[]);
    
    // Carica il resto in background (non-blocking)
    setTimeout(async () => {
      const [sl, b, v, ag] = await Promise.all([
        api('slots'), api('bookings'), api('vouchers'), api('agencies')
      ]);
      setSlots(Array.isArray(sl)?sl:[]); 
      setBookings(Array.isArray(b)?b:[]); 
      setVouchers(Array.isArray(v)?v:[]);
      setAgencies(Array.isArray(ag)?ag:[]);
      setFilteredBookings(Array.isArray(b)?b:[]);
    }, 100);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedData = async () => { setSeeding(true); await api('seed', { method: 'POST' }); toast.success('Dati demo caricati!'); await load(); setSeeding(false); };
  const createItem = async (ep, data) => { await api(ep, { method: 'POST', body: data }); toast.success('Creato!'); setShowDialog(null); setFormData({}); await load(); };
  const deleteItem = async (ep, id) => { if (!confirm('Eliminare?')) return; await api(`${ep}/${id}`, { method: 'DELETE' }); toast.success('Eliminato!'); await load(); };
  const cancelBooking = async (id) => { await api(`bookings/${id}`, { method: 'PUT', body: { action: 'cancel' } }); toast.success('Cancellata'); await load(); };
  const checkinBooking = async (id) => { await api(`bookings/${id}`, { method: 'PUT', body: { action: 'checkin' } }); toast.success('Check-in!'); await load(); };
  const getExpName = (id) => experiences.find(e => e.id === id)?.name || '-';
  
  // Helper: Ottieni nome risorsa da prenotazione (max 6 caratteri)
  const getResourceName = (booking) => {
    const slot = slots.find(s => s.id === booking.slot_id);
    if (!slot || !slot.resource_ids || slot.resource_ids.length === 0) return '-';
    
    const resourceId = slot.resource_ids[0]; // Prendi la prima risorsa
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return '-';
    
    // Tronca a 6 caratteri
    return resource.name.substring(0, 6);
  };

  const saveResource = async () => {
    if (!editRes) return;
    const res = await api(`resources/${editRes.id}`, { method: 'PUT', body: editResForm });
    if (res.error) toast.error(res.error); else { toast.success('Risorsa aggiornata!'); setEditRes(null); await load(); }
  };

  const saveBookingEdit = async () => {
    if (!editBk) return;
    const res = await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'update_details', ...editForm } });
    if (res.error) toast.error(res.error); else { toast.success('Prenotazione aggiornata!'); setEditBk(null); await load(); }
  };

  const getResourceBookings = (resId) => {
    const resSlotIds = slots.filter(s => (s.resource_ids || []).includes(resId)).map(s => s.id);
    return bookings.filter(b => resSlotIds.includes(b.slot_id) && b.status !== 'CANCELLED');
  };

  // Filtro bookings con filtri avanzati
  const filteredBookingsTab = useMemo(() => {
    let filtered = bookings;
    
    // Filtro per Esperienza
    if (bookingExpFilter && bookingExpFilter !== 'ALL') {
      filtered = filtered.filter(b => b.experience_id === bookingExpFilter);
    }
    
    // Filtro per Data Servizio
    if (bookingDateFilter) {
      filtered = filtered.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        const slotDate = slot.start_datetime.split('T')[0];
        return slotDate === bookingDateFilter;
      });
    }
    
    // Filtro per Cliente
    if (bookingCustomerFilter) {
      const search = bookingCustomerFilter.toLowerCase();
      filtered = filtered.filter(b => 
        (b.customer_name || '').toLowerCase().includes(search)
      );
    }
    
    // Filtro per Codice Prenotazione
    if (bookingCodeFilter) {
      const search = bookingCodeFilter.toLowerCase();
      filtered = filtered.filter(b => 
        (b.booking_ref || '').toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [bookings, bookingExpFilter, bookingDateFilter, bookingCustomerFilter, bookingCodeFilter, slots]);
  
  // Filtro slot per esperienza
  const filteredSlots = useMemo(() => {
    if (slotExpFilter === 'ALL') return slots;
    return slots.filter(s => s.experience_id === slotExpFilter);
  }, [slots, slotExpFilter]);
  
  // Panoramica ordinata e filtrata
  const sortedOverviewBookings = useMemo(() => {
    let result = [...bookings];
    
    // Filtra per data se specificato
    if (overviewDateFilter) {
      result = result.filter(b => b.created_at?.startsWith(overviewDateFilter));
    }
    
    // Ordina per created_at decrescente
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA; // Decrescente
    });
    
    return result;
  }, [bookings, overviewDateFilter]);
  
  // Totale economico
  const totalRevenue = useMemo(() => {
    return sortedOverviewBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  }, [sortedOverviewBookings]);

  // Funzioni filtri report
  const applyFilters = () => {
    let result = [...bookings];
    
    if (filters.code) {
      result = result.filter(b => 
        (b.booking_ref || '').toLowerCase().includes(filters.code.toLowerCase())
      );
    }
    
    if (filters.date) {
      result = result.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        return slot.start_datetime?.startsWith(filters.date);
      });
    }
    
    if (filters.resource_id) {
      const resSlotIds = slots.filter(s => 
        (s.resource_ids || []).includes(filters.resource_id)
      ).map(s => s.id);
      result = result.filter(b => resSlotIds.includes(b.slot_id));
    }
    
    if (filters.experience_id) {
      const expSlotIds = slots.filter(s => 
        s.experience_id === filters.experience_id
      ).map(s => s.id);
      result = result.filter(b => expSlotIds.includes(b.slot_id));
    }
    
    if (filters.customer_name) {
      result = result.filter(b =>
        (b.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase())
      );
    }
    
    setFilteredBookings(result);
  };
  
  const clearFilters = () => {
    setFilters({ code: '', date: '', resource_id: '', experience_id: '', customer_name: '' });
    setFilteredBookings(bookings);
  };
  
  const exportPDF = async () => {
    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const { jsPDF } = jsPDFModule;
      const autoTable = autoTableModule.default || autoTableModule;
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text('Report Prenotazioni - Maretrek', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, 14, 30);
      doc.text(`Risultati: ${filteredBookings.length}`, 14, 36);
      
      // Tabella
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => {
          const res = resources.find(r => r.id === rid);
          return res?.name || '';
        }).filter(Boolean).join(', ');
        
        return [
          b.booking_ref,
          b.customer_name,
          slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          exp?.name || '-',
          resourceNames || '-',
          b.seats,
          b.status,
          `€ ${(b.total_amount || 0).toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: 42,
        head: [['Codice', 'Cliente', 'Data', 'Esperienza', 'Risorsa', 'Posti', 'Stato', 'Totale']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.save(`maretrek-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato con successo!');
    } catch (error) {
      console.error('Errore export PDF:', error);
      toast.error('❌ Errore durante l\'esportazione PDF');
    }
  };
  
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => {
          const res = resources.find(r => r.id === rid);
          return res?.name || '';
        }).filter(Boolean).join(', ');
        
        return {
          'Codice': b.booking_ref,
          'Cliente': b.customer_name,
          'Email': b.customer_email,
          'Telefono': b.customer_phone || '-',
          'Data': slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          'Esperienza': exp?.name || '-',
          'Risorsa': resourceNames || '-',
          'Posti Venduti': b.seats,
          'Stato Venduto': b.status,
          'Totale': `€ ${(b.total_amount || 0).toFixed(2)}`
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
      
      // Imposta larghezza colonne
      const wscols = [
        { wch: 12 }, // Codice
        { wch: 20 }, // Cliente
        { wch: 25 }, // Email
        { wch: 15 }, // Telefono
        { wch: 12 }, // Data
        { wch: 30 }, // Esperienza
        { wch: 25 }, // Risorsa
        { wch: 12 }, // Posti
        { wch: 12 }, // Stato
        { wch: 12 }  // Totale
      ];
      ws['!cols'] = wscols;
      
      XLSX.writeFile(wb, `maretrek-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato con successo!');
    } catch (error) {
      console.error('Errore export Excel:', error);
      toast.error('❌ Errore durante l\'esportazione Excel');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h1 className="text-3xl font-bold">Dashboard Admin</h1><p className="text-muted-foreground">Gestione completa del booking engine</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
          <Button onClick={seedData} disabled={seeding} variant="secondary">{seeding?<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>:<Download className="w-4 h-4 mr-2"/>}Dati Demo</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="experiences"><Compass className="w-4 h-4 mr-1.5" />{t('experiences')}</TabsTrigger>
          <TabsTrigger value="bookings"><CreditCard className="w-4 h-4 mr-1.5" />{t('bookings')}</TabsTrigger>
          <TabsTrigger value="gantt"><CalIcon className="w-4 h-4 mr-1.5" />{t('calendar')}</TabsTrigger>
          <TabsTrigger value="fleet"><Map className="w-4 h-4 mr-1.5" />{t('fleet_map')}</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1.5" />{t('reports')}</TabsTrigger>
          <TabsTrigger value="slots"><CalIcon className="w-4 h-4 mr-1.5" />{t('slots')}</TabsTrigger>
          <TabsTrigger value="resources"><Ship className="w-4 h-4 mr-1.5" />{t('resources')}</TabsTrigger>
          <TabsTrigger value="agencies"><Building2 className="w-4 h-4 mr-1.5" />{t('agencies')}</TabsTrigger>
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />{t('overview')}</TabsTrigger>
          <TabsTrigger value="gps-setup"><Navigation className="w-4 h-4 mr-1.5" />{t('gps_setup')}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{l:'Prenotazioni',v:stats.total_bookings||0,i:CreditCard,c:'text-blue-600 bg-blue-100'},{l:'Fatturato',v:fmtPrice(stats.total_revenue||0),i:BarChart3,c:'text-green-600 bg-green-100'},{l:'Esperienze',v:stats.total_experiences||0,i:Compass,c:'text-purple-600 bg-purple-100'},{l:'Risorse',v:stats.total_resources||0,i:Ship,c:'text-amber-600 bg-amber-100'}].map((s,i)=>(
              <Card key={i}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{s.l}</p><p className="text-2xl font-bold mt-1">{s.v}</p></div><div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.c}`}><s.i className="w-6 h-6"/></div></div></CardContent></Card>
            ))}
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Prenotazioni per Data Acquisto</CardTitle>
                <p className="text-sm text-muted-foreground">Ordinate dalla più recente</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="w-40"
                    value={overviewDateFilter}
                    onChange={(e) => setOverviewDateFilter(e.target.value)}
                    placeholder="Filtra per data"
                  />
                  {overviewDateFilter && (
                    <Button variant="ghost" size="sm" onClick={() => setOverviewDateFilter('')}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Totale Valore</p>
                  <p className="text-xl font-bold text-green-600">{fmtPrice(totalRevenue)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Data/Ora Acquisto</th><th className="pb-2 font-medium">Rif.</th><th className="pb-2 font-medium">Cliente</th><th className="pb-2 font-medium">Esperienza</th><th className="pb-2 font-medium">Posti</th><th className="pb-2 font-medium">Totale</th><th className="pb-2 font-medium">Stato</th></tr></thead><tbody>
                {sortedOverviewBookings.slice(0,15).map(b=>(<tr key={b.id} className="border-b last:border-0"><td className="py-2.5 text-xs">{b.created_at ? new Date(b.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="py-2.5 font-mono text-xs">{b.booking_ref}</td><td className="py-2.5">{b.customer_name}</td><td className="py-2.5">{b.experience_name||getExpName(b.experience_id)}</td><td className="py-2.5">{b.seats}</td><td className="py-2.5 font-medium">{fmtPrice(b.total_amount)}</td><td className="py-2.5"><StatusBadge status={b.status}/></td></tr>))}
              </tbody></table>{sortedOverviewBookings.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione{overviewDateFilter ? ' per questa data' : ''}. Carica i dati demo!</p>}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gantt Calendar */}
        <TabsContent value="gantt">
          <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary"/><p className="ml-3 text-muted-foreground">Caricamento calendario...</p></div>}>
            <GanttCalendar resources={resources} allSlots={slots} allBookings={bookings} experiences={experiences} onRefresh={load} />
          </Suspense>
        </TabsContent>

        {/* Experiences */}
        <TabsContent value="experiences" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Esperienze ({experiences.length})</h2><Button onClick={()=>{setFormData({type:'GITA_GOMMONE',languages:['IT'],is_active:true});setShowDialog('experience');}}><Plus className="w-4 h-4 mr-2"/>Nuova</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">B2C</th><th className="p-3 font-medium">B2B</th><th className="p-3 font-medium">Durata</th><th className="p-3 font-medium">Cap.</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {experiences.map(e=>(<tr key={e.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{e.name}</td><td className="p-3"><TypeBadge type={e.type}/></td><td className="p-3">{fmtPrice(e.price_b2c)}</td><td className="p-3">{fmtPrice(e.price_b2b)}</td><td className="p-3">{Math.floor(e.duration_minutes/60)}h</td><td className="p-3">{e.max_capacity}</td><td className="p-3">{e.is_active === false ? <Badge variant="outline" className="text-muted-foreground">Sospesa</Badge> : e.is_visible_on_home === false ? <Badge variant="secondary" className="bg-amber-100 text-amber-800">NO View</Badge> : <Badge className="bg-green-100 text-green-800">Attiva</Badge>}</td><td className="p-3"><div className="flex gap-1 flex-wrap"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData({...e,duration_hours:Math.floor(e.duration_minutes/60)});setShowDialog('edit_experience');}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button><Button variant="secondary" size="sm" className="h-7 text-xs" onClick={async ()=>{const {id,created_at,updated_at,...expData}=e;const duplicated=await api('experiences',{method:'POST',body:{...expData,name:`${e.name} (Copia)`,duration_hours:Math.floor(e.duration_minutes/60)}});if(duplicated.error){toast.error(duplicated.error);}else{toast.success('Esperienza duplicata!');await load();setFormData({...duplicated,duration_hours:Math.floor(duplicated.duration_minutes/60)});setShowDialog('edit_experience');}}}><Copy className="w-3 h-3 mr-1"/>Duplica</Button><Button variant={e.is_active !== false ? "ghost" : "outline"} size="sm" className="h-7 text-xs" onClick={async ()=>{await api(`experiences/${e.id}`,{method:'PUT',body:{is_active:!(e.is_active !== false)}});toast.success(e.is_active !== false ? 'Esperienza sospesa':'Esperienza attivata');await load();}}>{e.is_active !== false ? 'Sospendi' : 'Attiva'}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('experiences',e.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button></div></td></tr>))}
          </tbody></table></div>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Risorse ({resources.length})</h2><Button onClick={()=>{setFormData({type:'GUIDE'});setShowDialog('resource');}}><Plus className="w-4 h-4 mr-2"/>Nuova Risorsa</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map(r => {
              const rb = getResourceBookings(r.id);
              return (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${r.type==='GUIDE'?'bg-emerald-100 text-emerald-700':'bg-sky-100 text-sky-700'}`}>{r.type==='GUIDE'?<User className="w-6 h-6"/>:<Ship className="w-6 h-6"/>}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{r.name}</h3>
                            <p className="text-xs text-muted-foreground">{r.type==='GUIDE'?'Guida':(BOAT_TYPE_LABELS[r.boat_type]||'Imbarcazione')}{r.capacity?` - ${r.capacity} posti`:''}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={()=>{setEditRes(r);setEditResForm({name:r.name,type:r.type,boat_type:r.boat_type||'GOMMONE',capacity:r.capacity||0,bio:r.bio||'',email:r.email||'',phone:r.phone||'',languages:r.languages||[],is_available:r.is_available});}}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('resources',r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.bio}</p>
                        {r.languages?.length>0&&<div className="mt-2 flex gap-1">{r.languages.map(l=><Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{rb.length} prenotazioni</Badge>
                          {rb.length>0&&<Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={()=>setResBookings({resource:r,bookings:rb})}>Vedi lista</Button>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Slots */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Slot ({filteredSlots.length})</h2>
            <div className="flex items-center gap-3">
              {/* Filtro Esperienza */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Esperienza:</Label>
                <Select value={slotExpFilter} onValueChange={setSlotExpFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Tutte le esperienze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte le esperienze</SelectItem>
                    {experiences.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {slotExpFilter !== 'ALL' && (
                <Button variant="ghost" size="sm" onClick={() => setSlotExpFilter('ALL')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              
              <Button onClick={()=>{setFormData({status:'OPEN'});setShowDialog('slot');}}><Plus className="w-4 h-4 mr-2"/>Nuovo Slot</Button>
            </div>
          </div>
          
          {/* Slot Raggruppati con Paginazione */}
          <div className="space-y-2">
            {(() => {
              // Raggruppa slot per esperienza + data
              const grouped = {};
              filteredSlots.forEach(slot => {
                const date = slot.start_datetime.split('T')[0];
                const key = `${slot.experience_id}-${date}`;
                if (!grouped[key]) {
                  grouped[key] = {
                    experience_id: slot.experience_id,
                    date: date,
                    slots: []
                  };
                }
                grouped[key].slots.push(slot);
              });
              
              const groups = Object.values(grouped);
              const totalPages = Math.ceil(groups.length / SLOTS_PER_PAGE);
              const paginatedGroups = groups.slice(slotPage * SLOTS_PER_PAGE, (slotPage + 1) * SLOTS_PER_PAGE);
              
              return (<>
                {/* Controlli Paginazione Sopra */}
                {groups.length > SLOTS_PER_PAGE && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(0)}
                        disabled={slotPage === 0}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.max(0, p - 1))}
                        disabled={slotPage === 0}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Indietro
                      </Button>
                    </div>
                    
                    <span className="text-sm font-medium">
                      Pagina {slotPage + 1} di {totalPages} ({groups.length} gruppi totali)
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={slotPage >= totalPages - 1}
                      >
                        Avanti
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(totalPages - 1)}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              
                {/* Card Gruppi */}
                {paginatedGroups.map((group, idx) => {
                  const totalSeats = group.slots.reduce((sum, s) => sum + s.max_seats, 0);
                  const bookedSeats = group.slots.reduce((sum, s) => sum + s.booked_seats, 0);
                  const availSeats = totalSeats - bookedSeats;
                  const allOpen = group.slots.every(s => s.status === 'OPEN');
                  const expanded = expandedGroups[`${group.experience_id}-${group.date}`];
                  
                  return (
                    <Card key={idx} className="overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition flex items-center justify-between"
                        onClick={() => {
                          const key = `${group.experience_id}-${group.date}`;
                          setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                            <div>
                              <p className="font-semibold">{getExpName(group.experience_id)}</p>
                              <p className="text-sm text-muted-foreground capitalize">{fmtDate(group.slots[0].start_datetime)} • {group.slots.length} slot</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 ml-auto">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Posti</p>
                              <p className="font-semibold">{bookedSeats}/{totalSeats}</p>
                            </div>
                            
                            <div className="w-32">
                              <AvailabilityBar booked={bookedSeats} max={totalSeats} />
                              <p className="text-xs text-muted-foreground mt-1 text-center">{availSeats} disponibili</p>
                            </div>
                            
                            <StatusBadge status={allOpen ? 'OPEN' : 'CLOSED'} />
                            
                            {/* Pulsante Elimina Gruppo */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Eliminare tutti i ${group.slots.length} slot di "${getExpName(group.experience_id)}" per il ${fmtDate(group.slots[0].start_datetime)}?`)) {
                                  for (const slot of group.slots) {
                                    await api(`slots/${slot.id}`, { method: 'DELETE' });
                                  }
                                  toast.success(`${group.slots.length} slot eliminati!`);
                                  await load();
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Elimina Data
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dettagli Slot Espansi */}
                      {expanded && (
                        <div className="border-t bg-muted/20">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b bg-muted/50"><th className="p-2 text-left font-medium">Ora</th><th className="p-2 text-left font-medium">Posti</th><th className="p-2 text-left font-medium">Disp.</th><th className="p-2 text-left font-medium">Stato</th><th className="p-2 text-left font-medium">Azioni</th></tr></thead>
                            <tbody>
                              {group.slots.map(s => (
                                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                  <td className="p-2">{fmtTime(s.start_datetime)} - {fmtTime(s.end_datetime)}</td>
                                  <td className="p-2">{s.booked_seats}/{s.max_seats}</td>
                                  <td className="p-2 w-24"><AvailabilityBar booked={s.booked_seats} max={s.max_seats}/></td>
                                  <td className="p-2"><StatusBadge status={s.status}/></td>
                                  <td className="p-2">
                                    <div className="flex gap-1">
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e)=>{e.stopPropagation();const exp=experiences.find(e=>e.id===s.experience_id);setFormData({...s,experience_name:exp?.name,resource_names:resources.filter(r=>s.resource_ids?.includes(r.id)).map(r=>r.name).join(', ')});setShowDialog('view_slot');}}><Eye className="w-3 h-3 mr-1"/>Vedi</Button>
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e)=>{e.stopPropagation();setFormData({...s});setShowDialog('edit_slot');}}><Edit className="w-3 h-3"/>Mod</Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={(e)=>{e.stopPropagation();deleteItem('slots',s.id);}}><Trash2 className="w-3 h-3"/>Del</Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  );
                })}
                
                {/* Controlli Paginazione Sotto */}
                {groups.length > SLOTS_PER_PAGE && (
                  <div className="flex items-center justify-center p-3 bg-muted/30 rounded-lg mt-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(0)}
                        disabled={slotPage === 0}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.max(0, p - 1))}
                        disabled={slotPage === 0}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      
                      <span className="text-sm font-medium px-4">
                        Pagina {slotPage + 1} di {totalPages}
                      </span>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(totalPages - 1)}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>);
            })()}
          </div>
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">Prenotazioni ({filteredBookingsTab.length})</h2>
            
            {/* Filtri Avanzati */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <Label className="text-xs mb-1 block">Esperienza</Label>
                <Select value={bookingExpFilter} onValueChange={setBookingExpFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tutte le esperienze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte le esperienze</SelectItem>
                    {experiences.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Data Servizio</Label>
                <Input 
                  type="date" 
                  className="h-9"
                  value={bookingDateFilter} 
                  onChange={e => setBookingDateFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Cliente</Label>
                <Input 
                  placeholder="Nome cliente..."
                  className="h-9"
                  value={bookingCustomerFilter}
                  onChange={e => setBookingCustomerFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Codice Prenotazione</Label>
                <Input 
                  placeholder="Codice..."
                  className="h-9"
                  value={bookingCodeFilter}
                  onChange={e => setBookingCodeFilter(e.target.value)}
                />
              </div>
            </div>
            
            {/* Reset Filtri */}
            {(bookingExpFilter !== 'ALL' || bookingDateFilter || bookingCustomerFilter || bookingCodeFilter) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mb-3"
                onClick={() => {
                  setBookingExpFilter('ALL');
                  setBookingDateFilter('');
                  setBookingCustomerFilter('');
                  setBookingCodeFilter('');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Reimposta Filtri
              </Button>
            )}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Rif.</th><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Esperienza</th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Risorsa</th><th className="p-3 font-medium">Posti</th><th className="p-3 font-medium">Totale</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {filteredBookingsTab.map(b=>(<tr key={b.id} className="border-b hover:bg-muted/30"><td className="p-3 font-mono text-xs">{b.booking_ref}</td><td className="p-3">{b.customer_name}</td><td className="p-3 text-xs">{b.customer_email}</td><td className="p-3">{b.experience_name||getExpName(b.experience_id)}</td><td className="p-3 text-xs capitalize">{fmtDate(b.slot_datetime||b.created_at)}</td><td className="p-3 text-xs font-mono font-semibold">{getResourceName(b)}</td><td className="p-3">{b.seats}</td><td className="p-3 font-medium">{fmtPrice(b.total_amount)}</td><td className="p-3"><StatusBadge status={b.status}/></td>
              <td className="p-3"><div className="flex gap-1">
                <Button variant="secondary" size="sm" className="text-xs h-7" onClick={()=>setPreviewBk(b)}><Eye className="w-3 h-3 mr-1"/>Anteprima</Button>
                {(b.status==='CONFIRMED'&&!b.checked_in_at)&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>{setEditBk(b);setEditForm({customer_name:b.customer_name,customer_email:b.customer_email,customer_phone:b.customer_phone,special_requests:b.special_requests||'',seats:b.seats,seat_assignments:b.seat_assignments||[]});}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>checkinBooking(b.id)}>Check-in</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={()=>cancelBooking(b.id)}>Cancella</Button>}
                {b.checked_in_at&&<Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1"/>OK</Badge>}
              </div></td>
            </tr>))}
          </tbody></table>{filteredBookingsTab.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione trovata.</p>}</div>
        </TabsContent>

        {/* Vouchers */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Voucher ({vouchers.length})</h2><Button onClick={()=>{setFormData({type:'PERCENTAGE',value:10,max_uses:100});setShowDialog('voucher');}}><Plus className="w-4 h-4 mr-2"/>Nuovo</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Codice</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valore</th><th className="p-3 font-medium">Utilizzi</th><th className="p-3 font-medium">Scadenza</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {vouchers.map(v=>(<tr key={v.id} className="border-b"><td className="p-3 font-mono font-bold">{v.code}</td><td className="p-3">{v.type==='PERCENTAGE'?'%':v.type==='FIXED'?'Fisso':'Regalo'}</td><td className="p-3 font-medium">{v.type==='PERCENTAGE'?`${v.value}%`:fmtPrice(v.value)}</td><td className="p-3">{v.uses_count}/{v.max_uses}</td><td className="p-3 text-xs">{v.valid_until?fmtDate(v.valid_until):'Illimitato'}</td><td className="p-3"><Button variant="ghost" size="icon" onClick={()=>deleteItem('vouchers',v.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></td></tr>))}
          </tbody></table></div>
        </TabsContent>

        {/* Waitlist */}
        {/* Report & Filtri Prenotazioni */}
        <TabsContent value="reports" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('reports')}</h2>
            <p className="text-muted-foreground">{t('advanced_filters')}</p>
          </div>

          {/* Filtri */}
          <Card>
            <CardHeader>
              <CardTitle>{t('search')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t('search_by_code')}</Label>
                  <Input 
                    placeholder="MRT12345"
                    value={filters.code}
                    onChange={(e) => setFilters({...filters, code: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_date')}</Label>
                  <Input 
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_name')}</Label>
                  <Input 
                    placeholder={t('name')}
                    value={filters.customer_name}
                    onChange={(e) => setFilters({...filters, customer_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_resource')}</Label>
                  <Select value={filters.resource_id || 'all'} onValueChange={(v) => setFilters({...filters, resource_id: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder={t('resources')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('search_by_experience')}</Label>
                  <Select value={filters.experience_id || 'all'} onValueChange={(v) => setFilters({...filters, experience_id: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder={t('experiences')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      {experiences.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clearFilters}>{t('clear_filters')}</Button>
                <Button onClick={applyFilters}><Search className="w-4 h-4 mr-2" />{t('apply_filters')}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Risultati */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('bookings')} - {t('total_results')}: {filteredBookings.length}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPDF}><Download className="w-4 h-4 mr-2" />{t('export_pdf')}</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />{t('export_excel')}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left bg-muted/50">
                      <th className="p-3">Codice</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">{t('date')}</th>
                      <th className="p-3">Esperienza</th>
                      <th className="p-3">Risorsa</th>
                      <th className="p-3">Posti Venduti</th>
                      <th className="p-3">Stato Venduto</th>
                      <th className="p-3">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const slot = slots.find(s => s.id === b.slot_id);
                      const exp = experiences.find(e => e.id === slot?.experience_id);
                      const resourceIds = slot?.resource_ids || [];
                      const resourceNames = resourceIds.map(rid => {
                        const res = resources.find(r => r.id === rid);
                        return res?.name || '';
                      }).filter(Boolean).join(', ');
                      
                      return (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                          <td className="p-3">{b.customer_name}</td>
                          <td className="p-3 text-xs">{slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-'}</td>
                          <td className="p-3">{exp?.name || '-'}</td>
                          <td className="p-3">
                            {resourceNames ? (
                              <div className="flex items-center gap-2">
                                <Ship className="w-4 h-4 text-primary" />
                                <span className="text-xs">{resourceNames}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold">{b.seats}</td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                          <td className="p-3 font-semibold">{fmtPrice(b.total_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBookings.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">Nessun risultato trovato</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agencies */}
        <TabsContent value="agencies" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Agenzie B2B ({agencies.length})</h2><Button onClick={()=>{setFormData({discount_percentage:15,payment_terms:'30_70',logo:''});setShowDialog('agency');}}><Plus className="w-4 h-4 mr-2"/>Nuova Agenzia</Button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">P.IVA</th><th className="p-3 font-medium">Telefono</th><th className="p-3 font-medium">Sconto</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {agencies.map(a=>(
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {a.logo && <img src={a.logo} alt={a.name} className="w-8 h-8 rounded object-cover" />}
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">{a.email}</td>
                    <td className="p-3">{a.vat_number}</td>
                    <td className="p-3">{a.phone}</td>
                    <td className="p-3"><Badge className="bg-green-100 text-green-800">{a.discount_percentage}%</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData(a);setShowDialog('view_agency');}}><Eye className="w-3 h-3 mr-1"/>Visualizza</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData({...a});setShowDialog('edit_agency');}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={()=>deleteItem('agencies',a.id)}><Trash2 className="w-3 h-3"/>Elimina</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agencies.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna agenzia. Crea la prima!</p>}
          </div>
        </TabsContent>

        {/* Mappa Flotta GPS */}
        <TabsContent value="fleet">
          <MappaFlottaWrapper />
        </TabsContent>

        {/* Setup GPS */}
        <TabsContent value="gps-setup">
          <SetupGPS />
        </TabsContent>
      </Tabs>

      {/* Create Dialogs */}
      <Dialog open={showDialog==='experience'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GITA_GOMMONE">Gita in Gommone</SelectItem><SelectItem value="GITA_BARCA">Gita in Barca</SelectItem><SelectItem value="VISITA_GUIDATA">Visita Guidata</SelectItem><SelectItem value="NOLEGGIO_NATANTE">Noleggio Natante</SelectItem></SelectContent></Select></div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata (min)</Label><Input type="number" value={formData.duration_minutes||''} onChange={e=>setFormData({...formData,duration_minutes:e.target.value})}/></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            <div>
              <Label>Risorse Assegnate</Label>
              <div className="space-y-2 mt-2">
                {resources.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`res-${r.id}`}
                      checked={(formData.resource_ids||[]).includes(r.id)}
                      onChange={e => {
                        const current = formData.resource_ids || [];
                        const updated = e.target.checked 
                          ? [...current, r.id]
                          : current.filter(id => id !== r.id);
                        setFormData({...formData, resource_ids: updated});
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`res-${r.id}`} className="text-sm flex items-center gap-2">
                      <Badge variant="outline">{r.type === 'GUIDE' ? 'Guida' : 'Barca'}</Badge>
                      {r.name} {r.capacity && `(${r.capacity} posti)`}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Seleziona le risorse da utilizzare per questa esperienza</p>
            </div>
            <Separator />
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Separator />
            <PDFUploader pdfUrl={formData.terms_pdf_url||''} onChange={url=>setFormData({...formData,terms_pdf_url:url})} />
            <Separator />
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Visibile su Home page</Label>
                <p className="text-xs text-muted-foreground">Mostra questa esperienza nel catalogo pubblico B2C</p>
              </div>
              <Switch 
                checked={formData.is_visible_on_home !== false} 
                onCheckedChange={v => setFormData({...formData, is_visible_on_home: v})}
              />
            </div>
            <Button className="w-full" onClick={()=>createItem('experiences',formData)}>Crea Esperienza</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Experience Dialog */}
      <Dialog open={showDialog==='edit_experience'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Modifica Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GITA_GOMMONE">Gita in Gommone</SelectItem><SelectItem value="GITA_BARCA">Gita in Barca</SelectItem><SelectItem value="VISITA_GUIDATA">Visita Guidata</SelectItem><SelectItem value="NOLEGGIO_NATANTE">Noleggio Natante</SelectItem></SelectContent></Select></div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata (ore)</Label><Input type="number" value={formData.duration_hours||''} onChange={e=>setFormData({...formData,duration_hours:e.target.value,duration_minutes:e.target.value*60})}/></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            
            <Separator className="my-6" />
            
            {/* Listini Prezzi Stagionali */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Listini Prezzi Stagionali (4 Fasce)</h3>
              </div>
              <p className="text-sm text-muted-foreground">Configura fino a 4 fasce di prezzo in base al periodo. I prezzi base sopra verranno usati se nessuna fascia copre la data.</p>
              
              {[0, 1, 2, 3].map(tierIndex => {
                const tier = (formData.price_tiers || [])[tierIndex] || {};
                const updateTier = (field, value) => {
                  const tiers = [...(formData.price_tiers || [{}, {}, {}, {}])];
                  tiers[tierIndex] = { ...tiers[tierIndex], [field]: value };
                  setFormData({ ...formData, price_tiers: tiers });
                };
                
                return (
                  <Card key={tierIndex} className="p-4 bg-muted/30">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${tierIndex === 0 ? 'bg-red-500' : tierIndex === 1 ? 'bg-yellow-500' : tierIndex === 2 ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <Label className="font-semibold">Fascia {tierIndex + 1}</Label>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Nome Fascia</Label>
                        <Input 
                          placeholder={tierIndex === 0 ? "es: Alta Stagione" : tierIndex === 1 ? "es: Media Stagione" : tierIndex === 2 ? "es: Bassa Stagione" : "es: Fuori Stagione"}
                          value={tier.tier_name || ''} 
                          onChange={e => updateTier('tier_name', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Data Inizio (dal)</Label>
                          <Input 
                            type="date" 
                            value={tier.start_date || ''} 
                            onChange={e => updateTier('start_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Fine (al)</Label>
                          <Input 
                            type="date" 
                            value={tier.end_date || ''} 
                            onChange={e => updateTier('end_date', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Prezzo B2C (€)</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={tier.price_b2c || ''} 
                            onChange={e => updateTier('price_b2c', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prezzo B2B (€)</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={tier.price_b2b || ''} 
                            onChange={e => updateTier('price_b2b', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            <Separator />
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Separator />
            <PDFUploader pdfUrl={formData.terms_pdf_url||''} onChange={url=>setFormData({...formData,terms_pdf_url:url})} />
            <Separator />
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Visibile su Home page</Label>
                <p className="text-xs text-muted-foreground">Mostra questa esperienza nel catalogo pubblico B2C</p>
              </div>
              <Switch 
                checked={formData.is_visible_on_home !== false} 
                onCheckedChange={v => setFormData({...formData, is_visible_on_home: v})}
              />
            </div>
            <Button className="w-full" onClick={async ()=>{const {id,duration_hours,...data}=formData;await api(`experiences/${id}`,{method:'PUT',body:data});toast.success('Esperienza aggiornata!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='resource'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Risorsa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GUIDE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GUIDE">Guida</SelectItem><SelectItem value="BOAT">Imbarcazione</SelectItem></SelectContent></Select></div>
            {formData.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={formData.boat_type||'GOMMONE'} onValueChange={v=>setFormData({...formData,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti)</Label><Input type="number" value={formData.capacity||''} onChange={e=>setFormData({...formData,capacity:e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={formData.marca||''} onChange={e=>setFormData({...formData,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={formData.potenza_motore||''} onChange={e=>setFormData({...formData,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={formData.consumo_orario_litri||''} onChange={e=>setFormData({...formData,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={formData.ore_inizio_stagione||''} onChange={e=>setFormData({...formData,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={formData.gps_imei||''} onChange={e=>setFormData({...formData,gps_imei:e.target.value})} placeholder="359633109558000"/></div></>}
            <div><Label>Descrizione</Label><Textarea value={formData.bio||''} onChange={e=>setFormData({...formData,bio:e.target.value})}/></div>
            <div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div>
            <div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div>
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Button className="w-full" onClick={()=>createItem('resources',formData)}>Crea Risorsa</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Slot Giornalieri con Tariffe Stagionali</DialogTitle>
            <p className="text-sm text-muted-foreground">Il sistema creerà uno slot per ogni giorno nel periodo selezionato, applicando automaticamente la tariffa della fascia stagionale corretta.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Esperienza</Label>
              <Select value={formData.experience_id||''} onValueChange={v=>{
                const exp = experiences.find(e => e.id === v);
                setFormData({...formData, experience_id: v, selectedExperience: exp});
              }}>
                <SelectTrigger><SelectValue placeholder="Seleziona..."/></SelectTrigger>
                <SelectContent>
                  {experiences.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Risorsa (Barca/Guida)</Label>
              <Select value={(formData.resource_ids||[])[0]||'none'} onValueChange={v=>{
                if(v==='none'){
                  setFormData({...formData,resource_ids:[],max_seats:12})
                }else{
                  const res=resources.find(r=>r.id===v);
                  setFormData({...formData,resource_ids:[v],max_seats:res?.capacity||12})
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Seleziona risorsa..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna risorsa</SelectItem>
                  {resources.map(r=><SelectItem key={r.id} value={r.id}>
                    {r.name} - {r.capacity} posti ({r.type==='GUIDE'?'Guida':BOAT_TYPE_LABELS[r.boat_type]||'Barca'})
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <Label className="text-base font-semibold">Periodo e Orari</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data Inizio Periodo</Label>
                  <Input type="date" value={formData.period_start||''} onChange={e=>setFormData({...formData,period_start:e.target.value})}/>
                </div>
                <div>
                  <Label className="text-xs">Data Fine Periodo</Label>
                  <Input type="date" value={formData.period_end||''} onChange={e=>setFormData({...formData,period_end:e.target.value})}/>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ora Inizio</Label>
                  <Input type="time" value={formData.time_start||'09:00'} onChange={e=>setFormData({...formData,time_start:e.target.value})}/>
                </div>
                <div>
                  <Label className="text-xs">Ora Fine</Label>
                  <Input type="time" value={formData.time_end||'13:00'} onChange={e=>setFormData({...formData,time_end:e.target.value})}/>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Posti Massimi per Slot</Label>
              <Input type="number" value={formData.max_seats||12} onChange={e=>setFormData({...formData,max_seats:parseInt(e.target.value)||12})}/>
            </div>
            
            {/* Anteprima Fasce Stagionali */}
            {formData.selectedExperience?.price_tiers && formData.selectedExperience.price_tiers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <Label className="text-xs font-semibold text-blue-900 mb-2 block">📊 Fasce Stagionali Configurate</Label>
                <div className="space-y-1 text-xs">
                  {formData.selectedExperience.price_tiers.map((tier, idx) => tier.tier_name && (
                    <div key={idx} className="flex justify-between">
                      <span className="font-medium">{tier.tier_name}:</span>
                      <span>{tier.start_date} → {tier.end_date} (€{tier.price_b2c})</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-2">Il sistema applicherà automaticamente la tariffa corretta per ogni giorno.</p>
              </div>
            )}
            
            <Button className="w-full" onClick={async ()=>{
              // Genera slot giornalieri con tariffe stagionali
              if (!formData.experience_id || !formData.period_start || !formData.period_end) {
                toast.error('Compila tutti i campi obbligatori');
                return;
              }
              
              const startDate = new Date(formData.period_start);
              const endDate = new Date(formData.period_end);
              const timeStart = formData.time_start || '09:00';
              const timeEnd = formData.time_end || '13:00';
              const experience = formData.selectedExperience;
              
              let created = 0;
              let currentDate = new Date(startDate);
              
              while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const startDatetime = `${dateStr}T${timeStart}:00Z`;
                const endDatetime = `${dateStr}T${timeEnd}:00Z`;
                
                // Calcola fascia di prezzo per questa data
                let priceOverride = null;
                if (experience?.price_tiers) {
                  const tier = getPriceTierForDate(experience, dateStr);
                  if (tier && tier.price_b2c) {
                    priceOverride = tier.price_b2c;
                  }
                }
                
                // Crea lo slot
                const slotData = {
                  experience_id: formData.experience_id,
                  resource_ids: formData.resource_ids || [],
                  start_datetime: startDatetime,
                  end_datetime: endDatetime,
                  max_seats: formData.max_seats || 12,
                  status: 'OPEN'
                };
                
                // Aggiungi price_override solo se diverso dal prezzo base
                if (priceOverride && priceOverride !== experience.price_b2c) {
                  slotData.price_override = priceOverride;
                }
                
                await api('slots', { method: 'POST', body: slotData });
                created++;
                
                // Prossimo giorno
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              toast.success(`${created} slot creati con tariffe stagionali applicate!`);
              setShowDialog(null);
              setFormData({});
              await load();
            }}>
              <CalIcon className="w-4 h-4 mr-2" />
              Crea Slot Giornalieri Automatici
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='voucher'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Nuovo Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Codice</Label><Input value={formData.code||''} onChange={e=>setFormData({...formData,code:e.target.value.toUpperCase()})} className="font-mono"/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'PERCENTAGE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="PERCENTAGE">Percentuale</SelectItem><SelectItem value="FIXED">Fisso (EUR)</SelectItem><SelectItem value="GIFT">Regalo</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Valore</Label><Input type="number" value={formData.value||''} onChange={e=>setFormData({...formData,value:e.target.value})}/></div><div><Label>Utilizzi Max</Label><Input type="number" value={formData.max_uses||''} onChange={e=>setFormData({...formData,max_uses:e.target.value})}/></div></div>
            <Button className="w-full" onClick={()=>createItem('vouchers',formData)}>Crea Voucher</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Agenzia B2B</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Agenzia</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div><div><Label>Password</Label><Input value={formData.password||'agency2025'} onChange={e=>setFormData({...formData,password:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div><div><Label>P.IVA</Label><Input value={formData.vat_number||''} onChange={e=>setFormData({...formData,vat_number:e.target.value})}/></div></div>
            <div><Label>Indirizzo</Label><Input value={formData.address||''} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
            <div><Label>Sconto %</Label><Input type="number" value={formData.discount_percentage||''} onChange={e=>setFormData({...formData,discount_percentage:e.target.value})}/></div>
            <Separator />
            <ImageUploader images={formData.logo ? [formData.logo] : []} onChange={imgs=>setFormData({...formData,logo:imgs[0]||''})} maxImages={1} />
            <Button className="w-full" onClick={()=>createItem('agencies',formData)}>Crea Agenzia</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Agency Dialog */}
      <Dialog open={showDialog==='view_agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dettagli Agenzia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {formData.logo && (
              <div className="flex justify-center">
                <img src={formData.logo} alt={formData.name} className="h-20 w-auto object-contain rounded border" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Nome Agenzia</Label><p className="font-semibold text-lg">{formData.name}</p></div>
              <div><Label className="text-muted-foreground">Sconto</Label><Badge className="bg-green-100 text-green-800 text-lg">{formData.discount_percentage}%</Badge></div>
              <div><Label className="text-muted-foreground">Email</Label><p>{formData.email}</p></div>
              <div><Label className="text-muted-foreground">Telefono</Label><p>{formData.phone}</p></div>
              <div><Label className="text-muted-foreground">P.IVA</Label><p>{formData.vat_number}</p></div>
              <div><Label className="text-muted-foreground">Termini Pagamento</Label><p>{formData.payment_terms}</p></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Indirizzo</Label><p>{formData.address}</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Agency Dialog */}
      <Dialog open={showDialog==='edit_agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Modifica Agenzia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Agenzia</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div><div><Label>Password</Label><Input value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})} placeholder="Lascia vuoto per non modificare"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div><div><Label>P.IVA</Label><Input value={formData.vat_number||''} onChange={e=>setFormData({...formData,vat_number:e.target.value})}/></div></div>
            <div><Label>Indirizzo</Label><Input value={formData.address||''} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
            <div><Label>Sconto %</Label><Input type="number" value={formData.discount_percentage||''} onChange={e=>setFormData({...formData,discount_percentage:e.target.value})}/></div>
            <Separator />
            <ImageUploader images={formData.logo ? [formData.logo] : []} onChange={imgs=>setFormData({...formData,logo:imgs[0]||''})} maxImages={1} />
            <Button className="w-full" onClick={async ()=>{const {id,...data}=formData;if(!data.password)delete data.password;await api(`agencies/${id}`,{method:'PUT',body:data});toast.success('Agenzia aggiornata!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Slot Dialog */}
      <Dialog open={showDialog==='view_slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dettagli Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Esperienza</Label><p className="font-semibold text-lg">{formData.experience_name}</p></div>
              <div><Label className="text-muted-foreground">Stato</Label><StatusBadge status={formData.status}/></div>
              <div><Label className="text-muted-foreground">Data</Label><p className="capitalize">{fmtDate(formData.start_datetime)}</p></div>
              <div><Label className="text-muted-foreground">Orario</Label><p>{fmtTime(formData.start_datetime)} - {fmtTime(formData.end_datetime)}</p></div>
              <div><Label className="text-muted-foreground">Posti Totali</Label><p>{formData.max_seats}</p></div>
              <div><Label className="text-muted-foreground">Posti Prenotati</Label><p className="font-bold text-primary">{formData.booked_seats}</p></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Disponibilità</Label><AvailabilityBar booked={formData.booked_seats||0} max={formData.max_seats||0}/></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Risorse Abbinate</Label><p>{formData.resource_names || 'Nessuna risorsa'}</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={showDialog==='edit_slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Modifica Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Data Inizio</Label><Input type="datetime-local" value={formData.start_datetime?.slice(0,16)||''} onChange={e=>setFormData({...formData,start_datetime:e.target.value})}/></div>
            <div><Label>Data Fine</Label><Input type="datetime-local" value={formData.end_datetime?.slice(0,16)||''} onChange={e=>setFormData({...formData,end_datetime:e.target.value})}/></div>
            <div><Label>Posti Massimi</Label><Input type="number" value={formData.max_seats||''} onChange={e=>setFormData({...formData,max_seats:e.target.value})}/></div>
            <div><Label>Stato</Label><Select value={formData.status||'OPEN'} onValueChange={v=>setFormData({...formData,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="OPEN">Aperto</SelectItem><SelectItem value="CLOSED">Chiuso</SelectItem><SelectItem value="FULL">Completo</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={async ()=>{const {id,experience_name,resource_names,...data}=formData;await api(`slots/${id}`,{method:'PUT',body:data});toast.success('Slot aggiornato!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={!!editRes} onOpenChange={() => setEditRes(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Risorsa: {editRes?.name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="bookings">Prenotazioni ({editRes ? getResourceBookings(editRes.id).length : 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4 mt-4">
              <div><Label>Nome</Label><Input value={editResForm.name||''} onChange={e=>setEditResForm({...editResForm,name:e.target.value})}/></div>
              <div><Label>Tipo</Label><Select value={editResForm.type||'GUIDE'} onValueChange={v=>setEditResForm({...editResForm,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GUIDE">Guida</SelectItem><SelectItem value="BOAT">Imbarcazione</SelectItem></SelectContent></Select></div>
              {editResForm.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={editResForm.boat_type||'GOMMONE'} onValueChange={v=>setEditResForm({...editResForm,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti vendibili)</Label><Input type="number" value={editResForm.capacity||''} onChange={e=>setEditResForm({...editResForm,capacity:parseInt(e.target.value)||0})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={editResForm.marca||''} onChange={e=>setEditResForm({...editResForm,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={editResForm.potenza_motore||''} onChange={e=>setEditResForm({...editResForm,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={editResForm.consumo_orario_litri||''} onChange={e=>setEditResForm({...editResForm,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={editResForm.ore_inizio_stagione||''} onChange={e=>setEditResForm({...editResForm,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={editResForm.gps_imei||''} onChange={e=>setEditResForm({...editResForm,gps_imei:e.target.value})} placeholder="359633109558000"/><p className="text-xs text-muted-foreground mt-1">Codice IMEI del dispositivo GPS per tracking real-time</p></div></>}
              <div><Label>Descrizione</Label><Textarea value={editResForm.bio||''} onChange={e=>setEditResForm({...editResForm,bio:e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={editResForm.email||''} onChange={e=>setEditResForm({...editResForm,email:e.target.value})}/></div><div><Label>Telefono</Label><Input value={editResForm.phone||''} onChange={e=>setEditResForm({...editResForm,phone:e.target.value})}/></div></div>
              <Button className="w-full" onClick={saveResource}>Salva Modifiche</Button>
            </TabsContent>
            <TabsContent value="bookings" className="mt-4">
              {editRes && editRes.type === 'BOAT' ? (
                <ResourceBookingsList resource={editRes} bookings={getResourceBookings(editRes.id)} onUpdate={load} />
              ) : (
                <div className="space-y-2">
                  {editRes && getResourceBookings(editRes.id).map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{b.customer_name} <span className="text-muted-foreground font-normal">({b.booking_ref})</span></p>
                        <p className="text-xs text-muted-foreground">{b.experience_name||getExpName(b.experience_id)} | {fmtDate(b.slot_datetime||b.created_at)} | {b.seats} posti</p>
                      </div>
                      <StatusBadge status={b.status}/>
                    </div>
                  ))}
                  {editRes && getResourceBookings(editRes.id).length === 0 && <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione.</p>}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Resource Bookings Dialog */}
      <Dialog open={!!resBookings} onOpenChange={() => setResBookings(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {resBookings && (
            <>
              <DialogHeader><DialogTitle>Prenotazioni - {resBookings.resource.name}</DialogTitle><p className="text-sm text-muted-foreground">{resBookings.bookings.length} prenotazioni attive</p></DialogHeader>
              <div className="space-y-2">
                {resBookings.bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div><p className="font-medium text-sm">{b.customer_name} <span className="text-muted-foreground font-normal">({b.booking_ref})</span></p><p className="text-xs text-muted-foreground">{b.experience_name||getExpName(b.experience_id)} | {fmtDate(b.slot_datetime||b.created_at)} | {b.seats} posti | {fmtPrice(b.total_amount)}</p></div>
                    <div className="flex gap-1 items-center"><StatusBadge status={b.status}/>{b.status==='CONFIRMED'&&<Button variant="ghost" size="sm" className="text-xs text-red-500 h-7" onClick={()=>cancelBooking(b.id)}>Cancella</Button>}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editBk} onOpenChange={() => setEditBk(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editForm.customer_email || ''} onChange={e => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
            <div><Label>Telefono</Label><Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
            <div><Label>Richieste speciali</Label><Textarea value={editForm.special_requests || ''} onChange={e => setEditForm({ ...editForm, special_requests: e.target.value })} /></div>
            
            {editBk && editBk.seats > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Assegnazione Posti ({editBk.seats} {editBk.seats === 1 ? 'posto' : 'posti'})
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: editBk.seats }).map((_, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Posto ${idx + 1}`}
                      value={(editForm.seat_assignments || [])[idx] || ''}
                      onChange={e => {
                        const newAssignments = [...(editForm.seat_assignments || [])];
                        newAssignments[idx] = e.target.value;
                        setEditForm({ ...editForm, seat_assignments: newAssignments });
                      }}
                      className="h-8 text-sm"
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveBookingEdit}>Salva Modifiche</Button>
              <Button variant="destructive" onClick={async () => { await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'cancel' } }); toast.success('Cancellata'); setEditBk(null); await load(); }}>Cancella</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Anteprima Prenotazione */}
      <Dialog open={!!previewBk} onOpenChange={() => setPreviewBk(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Anteprima Prenotazione {previewBk?.booking_ref}
            </DialogTitle>
          </DialogHeader>
          
          {previewBk && (
            <div className="space-y-4">
              {/* Stato e Info Principali */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Stato Prenotazione</p>
                  <div className="mt-1"><StatusBadge status={previewBk.status} /></div>
                </div>
                {previewBk.checked_in_at && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="text-sm font-medium text-green-600">{fmtDate(previewBk.checked_in_at)}</p>
                  </div>
                )}
              </div>
              
              {/* Esperienza e Risorsa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Esperienza</p>
                  <p className="font-semibold">{previewBk.experience_name || getExpName(previewBk.experience_id)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{fmtDate(previewBk.slot_datetime || previewBk.created_at)}</p>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <p className="text-xs text-muted-foreground mb-1">Risorsa Assegnata</p>
                  <p className="font-semibold text-blue-900">{getResourceName(previewBk) || 'Non assegnata'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{previewBk.seats} {previewBk.seats === 1 ? 'posto' : 'posti'}</p>
                </div>
              </div>
              
              {/* Dati Cliente */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dati Cliente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{previewBk.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{previewBk.customer_email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <p className="font-medium">{previewBk.customer_phone || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Lista Partecipanti */}
              {previewBk.seat_assignments && previewBk.seat_assignments.length > 0 && previewBk.seat_assignments.some(s => s) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Lista Completa Partecipanti ({previewBk.seat_assignments.filter(s => s).length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {previewBk.seat_assignments.map((name, idx) => 
                      name && (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              
              {/* Prezzo Pagato */}
              <div className="border-t pt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Importo Totale Pagato</p>
                      {previewBk.discount_applied && previewBk.discount_applied > 0 && (
                        <p className="text-xs text-green-600 mt-1">Sconto applicato: {fmtPrice(previewBk.discount_applied)}</p>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-green-700">{fmtPrice(previewBk.total_amount)}</p>
                  </div>
                </div>
              </div>
              
              {/* Richieste Speciali */}
              {previewBk.special_requests && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 text-sm">Richieste Speciali</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">{previewBk.special_requests}</p>
                </div>
              )}
              
              {/* Info Aggiuntive */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Codice Riferimento</span>
                  <span className="font-mono font-bold">{previewBk.booking_ref}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Prenotazione creata</span>
                  <span>{fmtDate(previewBk.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ B2B PORTAL ============
function B2BPortal({ setView, allExperiences }) {
  const { t } = useLanguage();
  const [agency, setAgency] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bkForm, setBkForm] = useState({ name: '', email: '', phone: '', seats: 1 });
  const [resources, setResources] = useState([]);
  
  // Filtri Report B2B
  const [filters, setFilters] = useState({
    code: '',
    date: '',
    resource_id: '',
    experience_id: '',
    customer_name: ''
  });
  const [filteredBookings, setFilteredBookings] = useState([]);

  const handleLogin = async () => {
    setLoading(true);
    const res = await api('agencies/login', { method: 'POST', body: loginForm });
    if (res.error) { toast.error(res.error); setLoading(false); return; }
    setAgency(res.agency);
    
    // Carica dati ottimizzati per agenzia
    const [exps, bks, res_data, sl] = await Promise.all([
      api('experiences'), 
      api(`bookings?agency_id=${res.agency.id}`), // Solo prenotazioni dell'agenzia
      api('resources'),
      api('slots')
    ]);
    
    setExperiences(Array.isArray(exps) ? exps : []);
    setMyBookings(Array.isArray(bks) ? bks : []);
    setFilteredBookings(Array.isArray(bks) ? bks : []);
    setResources(Array.isArray(res_data) ? res_data : []);
    setSlots(Array.isArray(sl) ? sl : []);
    setLoading(false);
    toast.success(`Benvenuto ${res.agency.name}!`);
  };

  const loadSlots = async (exp) => {
    setSelectedExp(exp);
    const s = await api(`slots?experience_id=${exp.id}&date_from=${new Date().toISOString()}`);
    console.log('Slots caricati:', s);
    const filtered = Array.isArray(s) ? s.filter(sl => {
      if (sl.status === 'CANCELLED') return false;
      const slotDate = new Date(sl.start_datetime);
      const now = new Date();
      return slotDate > now;
    }) : [];
    console.log('Slots filtrati:', filtered);
    setSlots(filtered);
  };

  const handleB2BBook = async () => {
    if (!bookingSlot || !agency) return;
    setLoading(true);
    
    const exp = selectedExp;
    const priceB2C = exp.price_b2c || 0; // Prezzo cliente finale
    const priceB2B = exp.price_b2b || priceB2C; // Prezzo netto Maretrek
    const commission = (priceB2C - priceB2B) * bkForm.seats; // Provvigione agenzia
    
    const bookingData = {
      slot_id: bookingSlot.id,
      experience_id: exp.id,
      customer_name: bkForm.name,
      customer_email: bkForm.email,
      customer_phone: bkForm.phone,
      seats: bkForm.seats,
      total_amount: priceB2C * bkForm.seats, // Cliente finale paga prezzo B2C
      agency_id: agency.id, // Traccia agenzia
      commission_amount: commission, // Provvigione agenzia
      b2c_price: priceB2C, // Prezzo per posto B2C
      b2b_price: priceB2B, // Prezzo per posto B2B
      special_requests: bkForm.special_requests || ''
    };
    
    const res = await api('bookings', { method: 'POST', body: bookingData });
    
    if (res.error) { 
      toast.error(res.error); 
    } else { 
      toast.success(`✅ Prenotazione ${res.booking_ref} confermata! Provvigione: €${commission.toFixed(2)}`);
      
      // Ricarica prenotazioni
      const bks = await api(`bookings?agency_id=${agency.id}`);
      setMyBookings(Array.isArray(bks) ? bks : []);
      setFilteredBookings(Array.isArray(bks) ? bks : []);
      
      // Reset form
      setBookingSlot(null);
      setBkForm({ name: '', email: '', phone: '', seats: 1, special_requests: '' });
    }
    
    setLoading(false);
  };

  // Filtri Report B2B
  const applyFilters = () => {
    let result = [...myBookings];
    
    if (filters.code) {
      result = result.filter(b => 
        (b.booking_ref || '').toLowerCase().includes(filters.code.toLowerCase())
      );
    }
    
    if (filters.date) {
      result = result.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        return slot.start_datetime?.startsWith(filters.date);
      });
    }
    
    if (filters.resource_id) {
      const resSlotIds = slots.filter(s => 
        (s.resource_ids || []).includes(filters.resource_id)
      ).map(s => s.id);
      result = result.filter(b => resSlotIds.includes(b.slot_id));
    }
    
    if (filters.experience_id) {
      const expSlotIds = slots.filter(s => 
        s.experience_id === filters.experience_id
      ).map(s => s.id);
      result = result.filter(b => expSlotIds.includes(b.slot_id));
    }
    
    if (filters.customer_name) {
      result = result.filter(b =>
        (b.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase())
      );
    }
    
    setFilteredBookings(result);
  };
  
  const clearFilters = () => {
    setFilters({ code: '', date: '', resource_id: '', experience_id: '', customer_name: '' });
    setFilteredBookings(myBookings);
  };
  
  const exportPDF = async () => {
    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const { jsPDF } = jsPDFModule;
      const autoTable = autoTableModule.default || autoTableModule;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(`Report Vendite - ${agency.name}`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, 14, 30);
      doc.text(`Totale Vendite: ${filteredBookings.length}`, 14, 36);
      
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
        
        return [
          b.booking_ref,
          b.customer_name,
          slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          exp?.name || '-',
          resourceNames || '-',
          b.seats,
          b.status,
          `€ ${(b.total_amount || 0).toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: 42,
        head: [['Codice', 'Cliente', 'Data', 'Esperienza', 'Risorsa', 'Posti', 'Stato', 'Totale']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.save(`${agency.name}-vendite-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato!');
    } catch (error) {
      console.error('Errore export PDF:', error);
      toast.error('❌ Errore durante l\'esportazione PDF');
    }
  };
  
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
        
        return {
          'Codice': b.booking_ref,
          'Cliente': b.customer_name,
          'Email': b.customer_email,
          'Telefono': b.customer_phone || '-',
          'Data': slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          'Esperienza': exp?.name || '-',
          'Risorsa': resourceNames || '-',
          'Posti Venduti': b.seats,
          'Stato': b.status,
          'Totale': `€ ${(b.total_amount || 0).toFixed(2)}`
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendite');
      
      const wscols = [
        { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, 
        { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      ws['!cols'] = wscols;
      
      XLSX.writeFile(wb, `${agency.name}-vendite-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato!');
    } catch (error) {
      console.error('Errore export Excel:', error);
      toast.error('❌ Errore durante l\'esportazione Excel');
    }
  };

  if (!agency) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center"><div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-primary" /></div><CardTitle className="text-2xl">Portale B2B Agenzie</CardTitle><CardDescription>Accedi con le credenziali della tua agenzia</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="info@agenzia.it" /></div>
            <div><Label>Password</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" /></div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>{loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}Accedi</Button>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground">Demo: info@sardiniatours.it / agency2025</CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold">Portale B2B</h1><p className="text-muted-foreground">{agency.name} - Sconto {agency.discount_percentage}%</p></div>
        <Button variant="outline" onClick={() => setAgency(null)}><LogIn className="w-4 h-4 mr-2" />Esci</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Sconto Dedicato</p><p className="text-3xl font-bold text-green-600">{agency.discount_percentage}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Esperienze Disponibili</p><p className="text-3xl font-bold">{experiences.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Le Tue Prenotazioni</p><p className="text-3xl font-bold">{myBookings.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalogo B2B</TabsTrigger>
          <TabsTrigger value="mybookings">Le Mie Prenotazioni</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1.5" />Report Vendite</TabsTrigger>
          <TabsTrigger value="calendar"><CalIcon className="w-4 h-4 mr-1.5" />Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="space-y-4 mt-4">
          {selectedExp ? (
            <div>
              <button onClick={() => setSelectedExp(null)} className="flex items-center gap-2 text-primary hover:underline mb-4"><ArrowLeft className="w-4 h-4" />Torna al catalogo</button>
              <Card className="mb-4"><CardContent className="pt-4">
                <div className="flex gap-4">
                  {selectedExp.images && selectedExp.images[0] ? (
                    <img src={selectedExp.images[0]} alt={selectedExp.name} className="w-24 h-24 rounded-lg object-cover" />
                  ) : selectedExp.image_url ? (
                    <img src={selectedExp.image_url} alt={selectedExp.name} className="w-24 h-24 rounded-lg object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center"><ImageIcon className="w-12 h-12 text-gray-400" /></div>
                  )}
                  <div><h2 className="text-xl font-bold">{selectedExp.name}</h2><TypeBadge type={selectedExp.type} /><div className="mt-2 flex gap-4"><div><span className="text-sm text-muted-foreground">Prezzo Listino:</span> <span className="line-through text-muted-foreground">{fmtPrice(selectedExp.price_b2c)}</span></div><div><span className="text-sm text-muted-foreground">Prezzo B2B:</span> <span className="font-bold text-green-600">{fmtPrice(selectedExp.price_b2b * (1 - agency.discount_percentage/100))}</span></div></div></div></div>
              </CardContent></Card>
              <h3 className="font-semibold mb-3">Disponibilita</h3>
              {slots.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-2">Nessuna disponibilità al momento</p>
                  <p className="text-xs text-muted-foreground">Gli slot potrebbero non essere ancora stati creati per questa esperienza</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map(slot => {
                    const avail = slot.max_seats - slot.booked_seats;
                    return (
                      <div key={slot.id} className={`p-3 rounded-lg border ${avail <= 0 ? 'bg-red-50' : 'bg-white hover:border-primary hover:shadow-md cursor-pointer transition'}`} onClick={() => avail > 0 && setBookingSlot(slot)}>
                        <p className="font-medium text-sm capitalize">{fmtDate(slot.start_datetime)}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(slot.start_datetime)} - {fmtTime(slot.end_datetime)}</p>
                        <AvailabilityBar booked={slot.booked_seats} max={slot.max_seats} />
                        <p className="text-xs text-green-600 font-medium mt-2">Clicca per prenotare</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiences.map(exp => {
                const imgSrc = (exp.images && exp.images.length > 0) ? exp.images[0] : (exp.image_url || '/uploads/placeholder.jpg');
                return (
                  <Card key={exp.id} className="cursor-pointer card-hover" onClick={() => loadSlots(exp)}>
                    <div className="relative h-40"><img src={imgSrc} alt={exp.name} className="w-full h-full object-cover rounded-t-lg" /><div className="absolute top-2 left-2"><TypeBadge type={exp.type} /></div></div>
                    <CardContent className="pt-3">
                      <h3 className="font-semibold mb-1">{exp.name}</h3>
                      <div className="flex justify-between items-center">
                        <div><span className="text-xs text-muted-foreground line-through">{fmtPrice(exp.price_b2c)}</span><span className="ml-2 font-bold text-green-600">{fmtPrice(exp.price_b2b * (1 - agency.discount_percentage/100))}</span></div>
                        <Badge variant="secondary" className="text-xs">-{agency.discount_percentage}%</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="mybookings" className="mt-4">
          {myBookings.length === 0 ? <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione.</p> : (
            <div className="space-y-3">{myBookings.map(b => {
              const commission = b.commission_amount || 0;
              const b2cPrice = b.b2c_price || b.total_amount / b.seats;
              const b2bPrice = b.b2b_price || b2cPrice;
              
              return (
                <Card key={b.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold font-mono">{b.booking_ref}</p>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-sm font-medium">{b.experience_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(b.slot_datetime)} • {b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{b.seats} {b.seats === 1 ? 'posto' : 'posti'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Cliente Paga</p>
                        <p className="font-bold text-lg">{fmtPrice(b.total_amount)}</p>
                        {commission > 0 && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs text-green-700">Tua Provvigione</p>
                            <p className="font-bold text-green-700">+{fmtPrice(commission)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}</div>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6 mt-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Report Vendite - {agency.name}</h2>
            <p className="text-muted-foreground">Analizza le tue vendite e esporta i report</p>
          </div>

          {/* Statistiche Provvigioni */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Totale Vendite</p>
                <p className="text-3xl font-bold">{myBookings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Fatturato Clienti</p>
                <p className="text-2xl font-bold text-blue-600">
                  {fmtPrice(myBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Netto Maretrek</p>
                <p className="text-2xl font-bold text-amber-600">
                  {fmtPrice(myBookings.reduce((sum, b) => sum + ((b.b2b_price || 0) * b.seats), 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-green-700 font-medium">Tue Provvigioni</p>
                <p className="text-3xl font-bold text-green-700">
                  +{fmtPrice(myBookings.reduce((sum, b) => sum + (b.commission_amount || 0), 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtri */}
          <Card>
            <CardHeader><CardTitle>Filtri Ricerca</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Codice Prenotazione</Label><Input placeholder="MRT12345" value={filters.code} onChange={(e) => setFilters({...filters, code: e.target.value})} /></div>
                <div><Label>Data</Label><Input type="date" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})} /></div>
                <div><Label>Cliente</Label><Input placeholder="Nome cliente" value={filters.customer_name} onChange={(e) => setFilters({...filters, customer_name: e.target.value})} /></div>
                <div><Label>Risorsa</Label><Select value={filters.resource_id || 'all'} onValueChange={(v) => setFilters({...filters, resource_id: v === 'all' ? '' : v})}><SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Esperienza</Label><Select value={filters.experience_id || 'all'} onValueChange={(v) => setFilters({...filters, experience_id: v === 'all' ? '' : v})}><SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{experiences.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clearFilters}>Pulisci</Button>
                <Button onClick={applyFilters}><Search className="w-4 h-4 mr-2" />Applica Filtri</Button>
              </div>
            </CardContent>
          </Card>

          {/* Risultati */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Le Tue Vendite - Totale: {filteredBookings.length}</CardTitle></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPDF}><Download className="w-4 h-4 mr-2" />PDF</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Codice</th><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Esperienza</th><th className="p-3">Risorsa</th><th className="p-3">Posti</th><th className="p-3">Cliente Paga</th><th className="p-3">Provvigione</th><th className="p-3">Stato</th></tr></thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const slot = slots.find(s => s.id === b.slot_id);
                      const exp = experiences.find(e => e.id === slot?.experience_id);
                      const resourceIds = slot?.resource_ids || [];
                      const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
                      const commission = b.commission_amount || 0;
                      return (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                          <td className="p-3">{b.customer_name}</td>
                          <td className="p-3 text-xs">{slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-'}</td>
                          <td className="p-3">{exp?.name || '-'}</td>
                          <td className="p-3">{resourceNames ? <div className="flex items-center gap-2"><Ship className="w-4 h-4 text-primary" /><span className="text-xs">{resourceNames}</span></div> : '-'}</td>
                          <td className="p-3 font-semibold">{b.seats}</td>
                          <td className="p-3 font-semibold">{fmtPrice(b.total_amount)}</td>
                          <td className="p-3 font-bold text-green-600">+{fmtPrice(commission)}</td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBookings.length === 0 && <p className="text-center py-12 text-muted-foreground">Nessun risultato trovato</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab Calendario */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario Disponibilità</CardTitle>
              <CardDescription>Visualizza tutte le disponibilità e le tue prenotazioni evidenziate</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary"/></div>}>
                <GanttCalendar 
                  resources={resources} 
                  allSlots={slots} 
                  allBookings={myBookings} 
                  experiences={experiences} 
                  onRefresh={() => {}}
                />
              </Suspense>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ℹ️ <strong>Legenda:</strong> Il calendario mostra tutte le disponibilità. Le tue prenotazioni sono evidenziate.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* B2B Booking Dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Prenota per Cliente Finale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {bookingSlot && selectedExp && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-bold text-lg">{selectedExp.name}</p>
                  <p className="text-sm text-muted-foreground capitalize mt-1">{fmtDateTime(bookingSlot.start_datetime)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Disponibili: {bookingSlot.max_seats - bookingSlot.booked_seats} posti</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-muted-foreground">Prezzo Cliente</p>
                    <p className="text-lg font-bold">{fmtPrice(selectedExp.price_b2c)}</p>
                    <p className="text-xs text-muted-foreground">a persona</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded border border-amber-200">
                    <p className="text-xs text-amber-700">Netto Maretrek</p>
                    <p className="text-lg font-bold text-amber-700">{fmtPrice(selectedExp.price_b2b || selectedExp.price_b2c)}</p>
                    <p className="text-xs text-amber-700">a persona</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-700">Tua Provvigione</p>
                    <p className="text-lg font-bold text-green-700">+{fmtPrice((selectedExp.price_b2c - (selectedExp.price_b2b || selectedExp.price_b2c)) * (bkForm.seats || 1))}</p>
                    <p className="text-xs text-green-700">totale</p>
                  </div>
                </div>
              </>
            )}
            
            <div><Label>Nome Cliente Finale</Label><Input value={bkForm.name} onChange={e=>setBkForm({...bkForm,name:e.target.value})} placeholder="Mario Rossi" required /></div>
            <div><Label>Email Cliente</Label><Input type="email" value={bkForm.email} onChange={e=>setBkForm({...bkForm,email:e.target.value})} placeholder="cliente@email.com" required /></div>
            <div><Label>Telefono Cliente</Label><Input value={bkForm.phone} onChange={e=>setBkForm({...bkForm,phone:e.target.value})} placeholder="+39 333 1234567" required /></div>
            <div><Label>Numero Posti</Label><Input type="number" min="1" max={bookingSlot ? bookingSlot.max_seats - bookingSlot.booked_seats : 1} value={bkForm.seats} onChange={e=>setBkForm({...bkForm,seats:parseInt(e.target.value)||1})} /></div>
            <div><Label>Note / Richieste Speciali (opzionale)</Label><textarea className="w-full p-2 border rounded" rows="2" value={bkForm.special_requests||''} onChange={e=>setBkForm({...bkForm,special_requests:e.target.value})} placeholder="Es: allergie, esigenze particolari..." /></div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Riepilogo Prenotazione</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Cliente paga:</span>
                  <span className="font-bold">{fmtPrice((selectedExp?.price_b2c || 0) * (bkForm.seats || 1))}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Tu guadagni:</span>
                  <span className="font-bold">+{fmtPrice(((selectedExp?.price_b2c || 0) - (selectedExp?.price_b2b || selectedExp?.price_b2c || 0)) * (bkForm.seats || 1))}</span>
                </div>
              </div>
            </div>
            
            <Button className="w-full" onClick={handleB2BBook} disabled={loading || !bkForm.name || !bkForm.email || !bkForm.phone}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
              Conferma Prenotazione
            </Button>
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

  useEffect(() => {
    api('experiences').then(data => { if (Array.isArray(data)) setExperiences(data); }).catch(() => {});
  }, [view]);

  const navigate = (newView, data = {}) => {
    if (data.experience) setSelectedExperience(data.experience);
    if (data.slot) setSelectedSlot(data.slot);
    setView(newView);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar view={view} setView={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1">
          {view === 'home' && <HomePage setView={navigate} experiences={experiences} />}
          {view === 'catalog' && <CatalogPage setView={navigate} experiences={experiences} />}
          {view === 'detail' && <ExperienceDetail experience={selectedExperience} setView={navigate} />}
          {view === 'booking' && <BookingWizard experience={selectedExperience} slot={selectedSlot} setView={navigate} />}
          {view === 'admin' && <AdminDashboard />}
          {view === 'b2b' && <B2BPortal setView={navigate} allExperiences={experiences} />}
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
