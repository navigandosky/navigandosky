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
// Marina/Berths Admin (lazy)
const MarinasManagerLazy = dynamic(() => import('./components/MarinasAdmin').then(m => ({ default: m.MarinasManager })), { ssr: false });
const BerthsManagerLazy = dynamic(() => import('./components/MarinasAdmin').then(m => ({ default: m.BerthsManager })), { ssr: false });
// Port Registries (Preventivi, Transiti, Contratti, Settings)
const QuotesManagerLazy = dynamic(() => import('./components/PortRegistries').then(m => ({ default: m.QuotesManager })), { ssr: false });
const TransitsManagerLazy = dynamic(() => import('./components/PortRegistries').then(m => ({ default: m.TransitsManager })), { ssr: false });
const ContractsManagerLazy = dynamic(() => import('./components/PortRegistries').then(m => ({ default: m.ContractsManager })), { ssr: false });
const PortSettingsManagerLazy = dynamic(() => import('./components/PortRegistries').then(m => ({ default: m.PortSettingsManager })), { ssr: false });
// Cantiere (Boatyard) Admin
const CantiereAdminLazy = dynamic(() => import('./components/CantiereAdmin'), { ssr: false });
// Marina Bookings (Step 3 - richieste prenotazione)
const MarinaBookingsLazy = dynamic(() => import('./components/MarinaBookings'), { ssr: false });
// Nuovo Preventivo Posto Barca (dialog admin)
const NewQuoteDialogLazy = dynamic(() => import('./components/NewQuoteDialog'), { ssr: false });
const NewBookingDialogLazy = dynamic(() => import('./components/NewBookingDialog'), { ssr: false });
// Registro Contratti (gestione contabile + pagamenti + ricevute)
const ContractsRegistryLazy = dynamic(() => import('./components/ContractsRegistry'), { ssr: false });
// Registro Contabilità (aggregazione transazioni)
const AccountingRegistryLazy = dynamic(() => import('./components/AccountingRegistry'), { ssr: false });
// Gestione Skipper (utenti con ruolo SKIPPER)
const SkippersAdminLazy = dynamic(() => import('./components/SkippersAdmin'), { ssr: false });
// Lista Registri Trasportati (per Calendario + Mappa GPS)
const TransportLogsListLazy = dynamic(() => import('./components/TransportLogsList'), { ssr: false });
// Registro Trasportati (vista admin con filtri)
const TransportLogsRegistryLazy = dynamic(() => import('./components/TransportLogsRegistry'), { ssr: false });
// Bulk Slots Delete (Super Admin only)
const BulkSlotsDeleteLazy = dynamic(() => import('./components/BulkSlotsDelete'), { ssr: false });
const SuperAdminBookingDeleteLazy = dynamic(() => import('./components/SuperAdminBookingDelete'), { ssr: false });
// Procedura Rimborsi (Company Admin + Super Admin)
const RefundsManagementLazy = dynamic(() => import('./components/RefundsManagement'), { ssr: false });
const WarehouseAdminLazy = dynamic(() => import('./components/WarehouseAdmin'), { ssr: false });
// Link Pagamento Online (Company Admin)
const PaymentLinkDialogLazy = dynamic(() => import('./components/PaymentLinkDialog'), { ssr: false });
// Backup Manager (Super Admin only)
const BackupManagerLazy = dynamic(() => import('./components/BackupManager'), { ssr: false });
// Locazioni Brevi (Short-Term Rentals - Bike/Car/Apartment/Villa/Boat)
const LocazioniBreviAdminLazy = dynamic(() => import('./components/LocazioniBreviAdmin'), { ssr: false });
// Locazioni Brevi - Public catalog + detail
const RentalsCatalogPageLazy = dynamic(() => import('./components/RentalsPublic').then(m => ({ default: m.RentalsCatalogPage })), { ssr: false });
const RentalDetailPageLazy = dynamic(() => import('./components/RentalsPublic').then(m => ({ default: m.RentalDetailPage })), { ssr: false });
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Anchor, Ship, MapPin, Calendar as CalIcon, Clock, Users, Star, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
  Plus, Trash2, Search, CheckCircle2, BarChart3, Menu, X, Globe, Phone, Mail,
  Waves, Sun, Compass, Eye, Edit, Download, RefreshCw, Navigation, CreditCard, Tag, User,
  ChevronLeft, GripVertical, Building2, LogIn, ListOrdered, AlertCircle, Bell, Upload, Image as ImageIcon, Map, Languages, Copy,
  ClipboardList, FileSignature, Shield, Wrench, FileText, Wallet, EyeOff, Banknote, Package, Link2, Database, Home, Sparkles
} from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { useTranslatedItems, useTranslatedItem } from './i18n/useTranslate';
import { languageFlags, languageNames } from './i18n/translations';

// ============ CONSTANTS ============
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_sardinia-tours-hub/artifacts/tw3hk6ud_logo%20trivor%20per%20copertura%20emergent.png';
const HERO_IMG = 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=1920&q=80';
const DEFAULT_EXP_IMG = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80';
// Helper: ricava la prima immagine valida dall'esperienza (con fallback default)
const getExpImage = (exp) => {
  const img = (exp?.images && exp.images[0]) || exp?.image_url;
  if (!img || img === '/uploads/placeholder.jpg') return DEFAULT_EXP_IMG;
  return img;
};
const TYPE_LABELS = {
  GITA_GOMMONE: '🚤 Gita in Gommone',
  GITA_BARCA: '⛵ Gita in Barca',
  VISITA_GUIDATA: '👤 Visita Guidata',
  NOLEGGIO_NATANTE: '🛥️ Noleggio Natante',
  TOUR_SUP: '🏄 Tour SUP',
  TOUR_KAYAK: '🛶 Tour Kayak / Canoa',
  SNORKELING: '🤿 Snorkeling',
  DIVING: '🐠 Diving / Immersione',
  HIKING: '🥾 Trekking / Escursione',
  BIKE_TOUR: '🚴 Bike Tour',
  COOKING_CLASS: '🍳 Lezione di cucina',
  WINE_TASTING: '🍷 Degustazione vino',
  VACATION_RENTAL: '🏠 Affitto Appartamento',
  ROOM_STAY: '🛏️ Soggiorno (Stanza)',
  VILLA_STAY: '🏡 Affitto Villa',
  EVENT: '🎉 Evento',
  TRANSFER: '🚐 Transfer',
  FISHING: '🎣 Pesca turistica',
};
const TYPE_ICONS = { GITA_GOMMONE: Ship, GITA_BARCA: Ship, VISITA_GUIDATA: Compass, NOLEGGIO_NATANTE: Anchor };

// Wrapper per toast che filtra messaggi generici
const safeToastError = (message) => {
  if (!message || message === '1 error' || message === '1' || message === 'error') {
    console.error('Toast generico bloccato:', message);
    return; // Non mostrare toast generici
  }
  toast.error(message);
};

// ============ HEX → HSL CONVERTER (per shadcn CSS vars) ============
// shadcn usa `--primary: H S% L%` (senza hsl() wrapper).
// I color-picker salvano in hex (#RRGGBB). Dobbiamo convertire.
const hexToHSL = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0,2), 16) / 255;
  const g = parseInt(h.slice(2,4), 16) / 255;
  const b = parseInt(h.slice(4,6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let H = 0, S = 0;
  if (max !== min) {
    const d = max - min;
    S = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: H = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: H = ((b - r) / d + 2); break;
      case b: H = ((r - g) / d + 4); break;
    }
    H *= 60;
  }
  return { h: Math.round(H), s: Math.round(S * 100), l: Math.round(l * 100) };
};

// Calcola contrasto: ritorna il colore foreground (0 0% 100% o 222 47% 11%)
const contrastForeground = (hslObj) => {
  if (!hslObj) return '0 0% 100%';
  return hslObj.l >= 60 ? '222 47% 11%' : '0 0% 100%';
};

// Applica il branding company a livello di CSS vars (shadcn-compatible)
const applyCompanyBranding = (company) => {
  if (typeof document === 'undefined' || !company) return;
  const root = document.documentElement;
  
  const primaryHSL = hexToHSL(company.primary_color);
  if (primaryHSL) {
    root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--primary-foreground', contrastForeground(primaryHSL));
  }
  
  const secondaryHSL = hexToHSL(company.secondary_color);
  if (secondaryHSL) {
    root.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
    root.style.setProperty('--secondary-foreground', contrastForeground(secondaryHSL));
  }
};

const resetCompanyBranding = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--secondary-foreground');
};

const TYPE_COLORS = { GITA_GOMMONE: 'bg-sky-100 text-sky-800 border-sky-200', GITA_BARCA: 'bg-blue-100 text-blue-800 border-blue-200', VISITA_GUIDATA: 'bg-emerald-100 text-emerald-800 border-emerald-200', NOLEGGIO_NATANTE: 'bg-amber-100 text-amber-800 border-amber-200' };
const GANTT_COLORS = { GITA_GOMMONE: 'bg-sky-50 border-sky-300 text-sky-900', GITA_BARCA: 'bg-blue-50 border-blue-300 text-blue-900', VISITA_GUIDATA: 'bg-emerald-50 border-emerald-300 text-emerald-900', NOLEGGIO_NATANTE: 'bg-amber-50 border-amber-300 text-amber-900' };

// Mappa metodi di pagamento e relative label visualizzate
const PAYMENT_METHOD_LABEL = {
  ONLINE: 'SumUp / Online',
  CARD: 'SumUp / Online',
  BANK_TRANSFER: 'Bonifico Bancario',
  CASH: 'Contanti',
  DIRECT: 'Cassa Diretta',
  MANUAL: 'Pagamento Manuale',
  AGENCY: 'Agenzia (Differito)',
  FREE: 'Omaggio / Gratuito',
  NONE: '— Non impostato',
};
const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Tutti i metodi' },
  { value: 'ONLINE', label: 'SumUp / Online' },
  { value: 'BANK_TRANSFER', label: 'Bonifico Bancario' },
  { value: 'CASH', label: 'Contanti' },
  { value: 'DIRECT', label: 'Cassa Diretta' },
  { value: 'MANUAL', label: 'Pagamento Manuale' },
  { value: 'AGENCY', label: 'Agenzia (Differito)' },
  { value: 'FREE', label: 'Omaggio / Gratuito' },
];
const LANG_MAP = { IT: 'Italiano', EN: 'English', FR: 'Francais', DE: 'Deutsch' };
const BOAT_TYPE_LABELS = { GOMMONE: 'Gommone', NATANTE: 'Natante', IMBARCAZIONE: 'Imbarcazione', GOMMONE_SKIPPER: 'Gommone con Skipper', BARCA_SKIPPER: 'Barca con Skipper', BARCA_VELA_SKIPPER: 'Barca a Vela con Skipper', BARCA: 'Barca', AUTO_TRANSFER: '🚗 Auto per Transfer', VAN_TRANSFER: '🚐 Van per Transfer', MINIBUS: '🚌 Minibus' };

// ============ API HELPER ============
const api = async (path, opts = {}) => {
  const { method = 'GET', body } = opts;
  const cfg = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) cfg.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, cfg);
  // Lettura robusta: gestiamo risposte non-JSON o vuote senza far crashare il chiamante
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn(`[api] Risposta non-JSON da /api/${path}:`, text.slice(0, 200));
    return { error: 'invalid_json', _raw: text };
  }
};

// ============ UTILITY COMPONENTS ============
function TypeBadge({ type }) {
  let translate = null;
  try { translate = useLanguage().t; } catch (e) { /* outside provider */ }
  const translated = translate ? translate(type) : null;
  const label = (translated && translated !== type) ? translated : (TYPE_LABELS[type] || type);
  const Icon = TYPE_ICONS[type] || Ship;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[type] || 'bg-gray-100'}`}><Icon className="w-3 h-3" />{label}</span>;
}
function StatusBadge({ status }) {
  const c = { OPEN: 'bg-green-100 text-green-800', FULL: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600', CONFIRMED: 'bg-green-100 text-green-800', PENDING: 'bg-yellow-100 text-yellow-800', REFUNDED: 'bg-gray-100 text-gray-600', WAITING: 'bg-blue-100 text-blue-800', NOTIFIED: 'bg-amber-100 text-amber-800', CONVERTED: 'bg-green-100 text-green-800', EXPIRED: 'bg-gray-100 text-gray-600', PENDING_VERIFICATION: 'bg-amber-100 text-amber-800 border border-amber-300', PENDING_CONFIRMATION: 'bg-orange-100 text-orange-800 border border-orange-300' };
  const labels = { PENDING_VERIFICATION: '⏳ Verifica Bonifico', PENDING_CONFIRMATION: '⏳ Da Confermare' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
}
function AvailabilityBar({ booked, max }) {
  const pct = max > 0 ? (booked / max) * 100 : 0;
  const avail = max - booked;
  // Semaforo in base alla % di posti prenotati:
  // < 50% → verde (molti disponibili)
  // 50-70% → giallo (medio)
  // > 70% → rosso (quasi pieno)
  const color = pct >= 70 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{avail} posti</span>
    </div>
  );
}
// Helper: classi colore per badge posti in base alla % DISPONIBILE
function seatsBadgeColor(avail, max) {
  if (!max || max <= 0 || avail <= 0) return 'bg-red-500 text-white border-red-600 hover:bg-red-600';
  const pctAvail = (avail / max) * 100;
  if (pctAvail > 50) return 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'; // > 50% disponibili → verde
  if (pctAvail >= 30) return 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'; // 30-50% disponibili → giallo
  return 'bg-red-500 text-white border-red-600 hover:bg-red-600'; // < 30% disponibili → rosso
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

// Helper: Calcola il "prezzo a partire da" per un'esperienza
// Logica:
//  - Se l'esperienza ha price_tiers configurati, prende il MINIMO di price_b2c tra tutte le fasce future/correnti
//  - Altrimenti torna a price_b2c base
//  - Restituisce { price, isFromTiers } per poter mostrare "da X €" quando i tiers sono attivi
function getStartingPrice(experience) {
  const base = Number(experience?.price_b2c || 0);
  const tiers = Array.isArray(experience?.price_tiers) ? experience.price_tiers : [];
  if (tiers.length === 0) return { price: base, isFromTiers: false };

  // Considera solo i tiers la cui fine non sia già scaduta (end_date >= oggi)
  const today = new Date().toISOString().split('T')[0];
  const validTiers = tiers.filter(t => t.end_date && t.end_date >= today && Number(t.price_b2c) > 0);
  const pool = validTiers.length > 0 ? validTiers : tiers.filter(t => Number(t.price_b2c) > 0);
  if (pool.length === 0) return { price: base, isFromTiers: false };

  const minTierPrice = Math.min(...pool.map(t => Number(t.price_b2c)));
  return { price: minTierPrice, isFromTiers: true };
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
        safeToastError(res.error);
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
        Immagini (max {maxImages}) <span className="text-xs text-muted-foreground font-normal">— la prima è la <b>copertina</b>. Usa ◀ ▶ per riordinare.</span>
      </Label>
      
      <div className="grid grid-cols-3 gap-3">
        {previews.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={img.startsWith('data:') ? img : img}
              alt={`Preview ${idx + 1}`}
              className={`w-full h-28 object-cover rounded-lg border-2 ${idx === 0 ? 'border-teal-500' : 'border-slate-200'}`}
            />
            {idx === 0 && (
              <span className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">⭐ Copertina</span>
            )}
            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">#{idx + 1}</span>
            <button
              type="button"
              onClick={() => removeImage(idx)}
              title="Rimuovi"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            {/* Reorder controls */}
            <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...previews];
                    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                    setPreviews(updated);
                    onChange(updated);
                  }}
                  title="Sposta a sinistra"
                  className="bg-slate-700 text-white rounded p-1 hover:bg-slate-800"
                >
                  ◀
                </button>
              )}
              {idx < previews.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...previews];
                    [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                    setPreviews(updated);
                    onChange(updated);
                  }}
                  title="Sposta a destra"
                  className="bg-slate-700 text-white rounded p-1 hover:bg-slate-800"
                >
                  ▶
                </button>
              )}
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...previews];
                    const [moved] = updated.splice(idx, 1);
                    updated.unshift(moved);
                    setPreviews(updated);
                    onChange(updated);
                    toast.success('Impostata come copertina');
                  }}
                  title="Imposta come copertina"
                  className="bg-teal-600 text-white rounded p-1 text-[10px] font-semibold hover:bg-teal-700 px-1.5"
                >
                  ⭐
                </button>
              )}
            </div>
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
        safeToastError(res.error);
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
function NavBar({ view, setView, mobileOpen, setMobileOpen, companyBrand, currentUser }) {
  const { language, changeLanguage, t } = useLanguage();
  const logoUrl = companyBrand?.logo_url || LOGO_URL;
  const brandName = companyBrand?.name || 'Trivor';
  
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-80 transition">
          <img src={logoUrl} alt={brandName} style={{ height: '40px', width: 'auto' }} className="rounded" />
        </button>
        
        <nav className="hidden md:flex items-center gap-1">
          {[['home', t('home')], ['catalog', t('experiences')]].map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              // Mostra overlay immediato e prefetch poi naviga
              try {
                const ov = document.createElement('div');
                ov.id = 'marina-loader';
                ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;backdrop-filter:blur(4px);';
                ov.innerHTML = `
                  <div style="width:64px;height:64px;border:5px solid rgba(255,255,255,0.25);border-top-color:#06b6d4;border-radius:50%;animation:mspin 0.9s linear infinite;margin-bottom:20px;"></div>
                  <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;">⚓ Caricamento Posti Barca</h2>
                  <p style="font-size:14px;opacity:0.85;margin:0;">Attendere connessione sistema Marine...</p>
                  <style>@keyframes mspin { to { transform: rotate(360deg) } }</style>
                `;
                document.body.appendChild(ov);
              } catch {}
              // Naviga (Next gestisce il routing client-side se possibile, altrimenti hard nav)
              window.location.href = '/posti-barca';
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-1.5"
          >
            <Anchor className="w-4 h-4" /> Posti Barca
          </button>
          <button
            type="button"
            onClick={() => setView('rentals')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${view === 'rentals' || view === 'rental-detail' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            🏖️ Locazioni
          </button>
          {[['b2b', t('b2b')], ['admin', t('admin')]].map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {l}
            </button>
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
          {[['home', t('home')], ['catalog', t('experiences')]].map(([v, l]) => (
            <button key={v} onClick={() => { setView(v); setMobileOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{l}</button>
          ))}
          <button
            type="button"
            onClick={() => {
              try {
                const ov = document.createElement('div');
                ov.id = 'marina-loader';
                ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;backdrop-filter:blur(4px);';
                ov.innerHTML = `<div style="width:64px;height:64px;border:5px solid rgba(255,255,255,0.25);border-top-color:#06b6d4;border-radius:50%;animation:mspin 0.9s linear infinite;margin-bottom:20px;"></div><h2 style="font-size:22px;font-weight:700;margin:0 0 8px;">⚓ Caricamento Posti Barca</h2><p style="font-size:14px;opacity:0.85;margin:0;">Attendere connessione sistema Marine...</p><style>@keyframes mspin { to { transform: rotate(360deg) } }</style>`;
                document.body.appendChild(ov);
              } catch {}
              window.location.href = '/posti-barca';
            }}
            className="w-full text-left block px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted"
          >⚓ Posti Barca</button>
          {[['b2b', t('b2b')], ['admin', t('admin')]].map(([v, l]) => (
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
function Footer({ companyBrand, currentUser }) {
  const [showWorkWithUs, setShowWorkWithUs] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [sending, setSending] = useState(false);
  
  // Determina i contatti da mostrare
  // - Super Admin (o nessun contesto company): contatti Trivor
  // - Company branded (B2C catalog /[slug], Company Admin loggato): contatti della company
  const isSuperAdminView = currentUser?.role === 'SUPER_ADMIN' && !companyBrand;
  const hasCompanyContext = Boolean(companyBrand);
  
  const contactInfo = hasCompanyContext ? {
    name: companyBrand.name,
    phone: companyBrand.phone || companyBrand.whatsapp || '',
    whatsapp: companyBrand.whatsapp || companyBrand.phone || '',
    email: companyBrand.email || '',
    address: [companyBrand.address, companyBrand.city].filter(Boolean).join(', '),
    description: companyBrand.description || 'Esperienze marine indimenticabili in Sardegna.',
    pIva: companyBrand.vat_number || companyBrand.piva || '',
    logo: companyBrand.logo_url || LOGO_URL
  } : {
    // Default = Trivor (Super Admin o senza contesto)
    name: 'Trivor SRL',
    phone: '+39 320 8083839',
    whatsapp: '+39 320 8083839',
    email: 'trivorsrl@gmail.com',
    address: '',
    description: 'Piattaforma multi-tenant per operatori turistici.',
    pIva: '',
    logo: LOGO_URL
  };
  const showAddress = hasCompanyContext && contactInfo.address;

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Compila almeno Nome, Email e Messaggio');
      return;
    }

    setSending(true);
    const res = await api('contact', { method: 'POST', body: formData });
    setSending(false);

    if (res.error) {
      safeToastError(res.error);
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
            <div><img src={contactInfo.logo} alt={contactInfo.name} className="h-12 mb-4 rounded bg-white/90 p-1" /><p className="text-white/70 text-sm">{contactInfo.description}</p></div>
            <div>
              <h4 className="font-semibold mb-3">Contatti</h4>
              <div className="space-y-2 text-sm text-white/70">
                {contactInfo.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a href={`tel:${contactInfo.phone.replace(/\s+/g,'')}`} className="hover:text-white transition-colors">{contactInfo.phone}</a>
                    {contactInfo.whatsapp && (
                      <a href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-green-600/80 rounded hover:bg-green-600" title="WhatsApp">WA</a>
                    )}
                  </p>
                )}
                {contactInfo.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors break-all">{contactInfo.email}</a>
                  </p>
                )}
                {showAddress && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{contactInfo.address}</span>
                  </p>
                )}
              </div>
            </div>
            <div><h4 className="font-semibold mb-3">Info</h4><p className="text-sm text-white/70">{hasCompanyContext ? `Operatore turistico - ${contactInfo.name}` : 'Piattaforma SaaS multi-tenant per operatori turistici. Ogni company gestisce il proprio catalogo, prenotazioni e flotta.'}</p></div>
            <div>
              <h4 className="font-semibold mb-3">Diventa Partner</h4>
              <p className="text-sm text-white/90 mb-3 font-bold">Sei un'agenzia viaggi? Entra nella nostra rete B2B.</p>
              <Button variant="outline" className="w-full bg-white/10 text-white border-2 border-white hover:bg-white hover:text-primary backdrop-blur-sm" onClick={() => setShowWorkWithUs(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                <span className="font-bold">Lavora con noi</span>
              </Button>
            </div>
          </div>
          <Separator className="my-8 bg-white/20" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-white/50">
              &copy; {new Date().getFullYear()} {contactInfo.name}
              {contactInfo.pIva && ` - P.IVA ${contactInfo.pIva}`}
            </p>
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
function HomePage({ setView, experiences, rentalUnits = [], companies = [], companyBrand }) {
  const { language } = useLanguage();
  // Helper per abbreviare nome company (es. "MARLIN SUB S.N.C. DI CORONAS..." -> "Marlin Sub")
  const abbrevCompany = (cid) => {
    const c = companies.find(x => x.id === cid);
    if (!c) return null;
    const raw = c.short_name || c.name || '';
    const cleaned = raw.replace(/\b(s\.?n\.?c\.?|s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?a\.?s\.?|di\s+.+)$/gi, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };
  // Ordina per home_priority (1-8 ASC), poi prezzo B2C decrescente, max 8 items in vetrina
  const sortByPriority = (a, b) => {
    const pa = Number(a.home_priority || 0);
    const pb = Number(b.home_priority || 0);
    if (pa > 0 && pb > 0) return pa - pb;
    if (pa > 0) return -1;
    if (pb > 0) return 1;
    const priceA = Number(a.price_b2c || 0);
    const priceB = Number(b.price_b2c || 0);
    return priceB - priceA;
  };
  const sortRentalsByPriority = (a, b) => {
    const pa = Number(a.home_priority || 0);
    const pb = Number(b.home_priority || 0);
    if (pa > 0 && pb > 0) return pa - pb;
    if (pa > 0) return -1;
    if (pb > 0) return 1;
    const priceA = Number(a.base_price || 0);
    const priceB = Number(b.base_price || 0);
    return priceB - priceA;
  };
  const featuredSource = useMemo(() => [...experiences].sort(sortByPriority).slice(0, 8), [experiences]);
  const { translated: featured, isTranslating: isTransHome } = useTranslatedItems(
    featuredSource,
    language,
    ['name', 'description']
  );
  const featuredRentals = useMemo(() => [...(rentalUnits || [])].sort(sortRentalsByPriority).slice(0, 8), [rentalUnits]);
  const heroImg = companyBrand?.hero_image || HERO_IMG;
  const logoUrl = companyBrand?.logo_url || LOGO_URL;
  const brandName = companyBrand?.name || 'Maretrek';
  
  return (
    <div>
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img src={heroImg} alt={brandName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Scopri la Sardegna dal Mare</h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">Escursioni in barca, visite guidate, noleggio gommoni. Vivi il Mediterraneo con guide esperte.</p>
          <Button size="lg" className="bg-primary text-white hover:bg-primary/90 font-bold text-base px-8 py-6 shadow-2xl border-2 border-white" onClick={() => setView('catalog')}><Compass className="w-5 h-5 mr-2" />Esplora le Esperienze</Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>
      <section className="container mx-auto px-4 -mt-16 relative z-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map(exp => {
            const sp = getStartingPrice(exp);
            return (
            <Card key={exp.id} className="card-hover overflow-hidden cursor-pointer border-0 shadow-lg" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-48"><img src={getExpImage(exp)} alt={exp.name} className="w-full h-full object-cover" onError={(e)=>{e.target.src=DEFAULT_EXP_IMG;}} /><div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div><div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full font-bold text-primary flex items-baseline gap-1">{sp.isFromTiers && <span className="text-[10px] font-normal opacity-75">da</span>}{fmtPrice(sp.price)}</div></div>
              <CardHeader className="pb-2"><CardTitle className="text-lg leading-tight">{exp.name}</CardTitle></CardHeader>
              <CardContent className="pb-4"><p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><div className="flex items-center gap-3"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h{exp.duration_minutes%60>0?` ${exp.duration_minutes%60}min`:''}</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span></div>{abbrevCompany(exp.company_id) && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold whitespace-nowrap" title="Fornitore">🏢 {abbrevCompany(exp.company_id)}</span>}</div></CardContent>
            </Card>
            );
          })}
        </div>
      </section>

      {/* === LOCAZIONI BREVI SECTION === */}
      {featuredRentals.length > 0 && (
        <section className="bg-gradient-to-b from-slate-50 to-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-end justify-between mb-8 gap-3">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                  🏖️ Locazioni Brevi
                </h2>
                <p className="text-muted-foreground mt-1">Bici, Auto, Appartamenti, Ville e Barche per la tua vacanza</p>
              </div>
              <Button variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50" onClick={() => setView('rentals')}>
                Vedi tutte <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredRentals.map((u) => {
                const sp = (() => {
                  if (Array.isArray(u.seasonal_pricing) && u.seasonal_pricing.length > 0) {
                    const prices = u.seasonal_pricing.map(s => Number(s.price_per_unit || 0)).filter(p => p > 0);
                    if (prices.length > 0) return { price: Math.min(...prices), isFromTiers: true };
                  }
                  return { price: Number(u.base_price || 0), isFromTiers: false };
                })();
                const catLabel = {BIKE: 'Bici', CAR: 'Auto', APARTMENT: 'Appartamento', VILLA: 'Villa', BOAT: 'Barca'}[u.category] || u.category;
                const catBg = {BIKE: 'bg-emerald-100 text-emerald-800', CAR: 'bg-blue-100 text-blue-800', APARTMENT: 'bg-amber-100 text-amber-800', VILLA: 'bg-purple-100 text-purple-800', BOAT: 'bg-cyan-100 text-cyan-800'}[u.category] || 'bg-slate-100';
                // Placeholder SVG gradient se nessuna foto caricata
                const _palette = {BIKE: ['#10b981','#059669'], CAR: ['#3b82f6','#1e40af'], APARTMENT: ['#f59e0b','#b45309'], VILLA: ['#a855f7','#6b21a8'], BOAT: ['#06b6d4','#0e7490']}[u.category] || ['#64748b','#334155'];
                const _safeName = String(u.name || '').replace(/[<>&"]/g, '').slice(0, 60);
                const _svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><defs><linearGradient id="g${u.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${_palette[0]}"/><stop offset="100%" stop-color="${_palette[1]}"/></linearGradient></defs><rect width="800" height="400" fill="url(#g${u.id})"/><text x="400" y="195" font-family="system-ui,sans-serif" font-size="40" font-weight="700" text-anchor="middle" fill="white" opacity="0.95">${_safeName}</text><text x="400" y="240" font-family="system-ui,sans-serif" font-size="18" text-anchor="middle" fill="white" opacity="0.75">Foto in arrivo</text></svg>`;
                const _placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(_svg)}`;
                const img = u.images?.[0] || _placeholder;
                return (
                  <Card key={u.id} className="card-hover overflow-hidden cursor-pointer border-0 shadow-lg" onClick={() => setView('rental-detail', { rentalUnit: u })}>
                    <div className="relative h-48">
                      <img src={img} alt={u.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3"><Badge className={catBg}>{catLabel}</Badge></div>
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full font-bold text-teal-700 flex items-baseline gap-1">
                        {sp.isFromTiers && <span className="text-[10px] font-normal opacity-75">da</span>}
                        {fmtPrice(sp.price)}
                        <span className="text-[10px] font-normal">/{u.duration_unit === 'NIGHTS' ? 'notte' : 'giorno'}</span>
                      </div>
                    </div>
                    <CardHeader className="pb-2"><CardTitle className="text-lg leading-tight">{u.name}</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{u.description || u.location || '—'}</p>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {u.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{u.location}</span>}
                          {(u.category === 'APARTMENT' || u.category === 'VILLA') && u.max_guests && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {u.max_guests}</span>}
                        </div>
                        {abbrevCompany(u.company_id) && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold whitespace-nowrap" title="Fornitore">🏢 {abbrevCompany(u.company_id)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}
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
function CatalogPage({ setView, experiences, currentUser, companies, companyBrand }) {
  const { t, language } = useLanguage();
  const [typeF, setTypeF] = useState('ALL');
  const [langF, setLangF] = useState('ALL');
  const [q, setQ] = useState('');
  
  // Determina il logo da mostrare
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  
  // Per Company Admin, usa il branding della sua società
  let logoUrl = LOGO_URL;
  let brandName = 'Trivor';
  
  if (isCompanyAdmin && currentUser?.company_id && companies) {
    const userCompany = companies.find(c => c.id === currentUser.company_id);
    if (userCompany) {
      logoUrl = userCompany.logo_url || LOGO_URL;
      brandName = userCompany.name || 'Trivor';
    }
  } else if (companyBrand) {
    // Usa il branding passato come prop (per utenti pubblici)
    logoUrl = companyBrand.logo_url || LOGO_URL;
    brandName = companyBrand.name || 'Trivor';
  }
  
  // Filtra esperienze in base al ruolo
  let displayExperiences = experiences;
  if (isCompanyAdmin && currentUser?.company_id) {
    // Company Admin vede solo le sue esperienze
    displayExperiences = experiences.filter(e => e.company_id === currentUser.company_id);
  }
  
  const filtered = useMemo(() => {
    const sortFn = (a, b) => {
      const pa = Number(a.home_priority || 0);
      const pb = Number(b.home_priority || 0);
      if (pa > 0 && pb > 0) return pa - pb;
      if (pa > 0) return -1;
      if (pb > 0) return 1;
      return Number(b.price_b2c || 0) - Number(a.price_b2c || 0);
    };
    return displayExperiences.filter(e => {
      if (typeF !== 'ALL' && e.type !== typeF) return false;
      if (langF !== 'ALL' && !(e.languages||[]).includes(langF)) return false;
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort(sortFn);
  }, [displayExperiences, typeF, langF, q]);
  
  // Traduzione on-demand delle esperienze filtrate
  const { translated: filteredTranslated, isTranslating } = useTranslatedItems(
    filtered,
    language,
    ['name', 'description', 'meeting_point']
  );
  
  // Helper per ottenere il nome della società
  const getCompanyName = (companyId) => {
    const company = companies?.find(c => c.id === companyId);
    return company ? company.name : 'N/A';
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header con logo dinamico per Company Admin */}
      {isCompanyAdmin && (
        <div className="mb-6 flex items-center gap-4">
          <img src={logoUrl} alt={brandName} className="h-16 object-contain rounded" />
          <div>
            <h2 className="text-2xl font-bold">{brandName}</h2>
            <p className="text-sm text-muted-foreground">{t('your_experiences')}</p>
          </div>
        </div>
      )}
      
      <div className="mb-8"><h1 className="text-3xl md:text-4xl font-bold mb-2">{t('our_experiences')}</h1><p className="text-muted-foreground">{t('discover_all_activities')}</p></div>
      <div className="flex flex-wrap gap-3 mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={t('search_placeholder')} value={q} onChange={e=>setQ(e.target.value)} className="pl-9" /></div></div>
        <Select value={typeF} onValueChange={setTypeF}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{t('all_types')}</SelectItem><SelectItem value="GITA_GOMMONE">{t('GITA_GOMMONE')}</SelectItem><SelectItem value="GITA_BARCA">{t('GITA_BARCA')}</SelectItem><SelectItem value="VISITA_GUIDATA">{t('VISITA_GUIDATA')}</SelectItem><SelectItem value="NOLEGGIO_NATANTE">{t('NOLEGGIO_NATANTE')}</SelectItem></SelectContent></Select>
        <Select value={langF} onValueChange={setLangF}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL"><span className="flex items-center gap-2"><span className="text-base">🌐</span>{t('all_languages')}</span></SelectItem><SelectItem value="IT"><span className="flex items-center gap-2"><span className="text-base">🇮🇹</span>Italiano</span></SelectItem><SelectItem value="EN"><span className="flex items-center gap-2"><span className="text-base">🇬🇧</span>English</span></SelectItem><SelectItem value="FR"><span className="flex items-center gap-2"><span className="text-base">🇫🇷</span>Français</span></SelectItem><SelectItem value="DE"><span className="flex items-center gap-2"><span className="text-base">🇩🇪</span>Deutsch</span></SelectItem><SelectItem value="ES"><span className="flex items-center gap-2"><span className="text-base">🇪🇸</span>Español</span></SelectItem></SelectContent></Select>
      </div>
      {isTranslating && language !== 'it' && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          {language === 'en' ? 'Translating content...' : language === 'fr' ? 'Traduction en cours...' : language === 'de' ? 'Übersetzung läuft...' : language === 'es' ? 'Traduciendo...' : 'Traduzione in corso...'}
        </div>
      )}
      {filteredTranslated.length === 0 ? <div className="text-center py-20"><Waves className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">Nessuna esperienza trovata.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTranslated.map(exp => {
            const sp = getStartingPrice(exp);
            return (
            <Card key={exp.id} className="card-hover overflow-hidden border shadow-sm cursor-pointer group" onClick={() => setView('detail', { experience: exp })}>
              <div className="relative h-52 overflow-hidden"><img src={getExpImage(exp)} alt={exp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e)=>{e.target.src=DEFAULT_EXP_IMG;}} /><div className="absolute top-3 left-3"><TypeBadge type={exp.type} /></div></div>
              <CardHeader className="pb-2"><CardTitle className="text-lg leading-tight">{exp.name}</CardTitle><CardDescription className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{exp.meeting_point}</CardDescription>{isSuperAdmin && exp.company_id && (<div className="mt-2"><Badge className="bg-purple-100 text-purple-800 text-xs">{getCompanyName(exp.company_id)}</Badge></div>)}</CardHeader>
              <CardContent className="pb-2"><p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exp.description}</p><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><div className="flex flex-wrap gap-3"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(exp.duration_minutes/60)}h{exp.duration_minutes%60>0?` ${exp.duration_minutes%60}min`:''}</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {exp.max_capacity}</span><span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{(exp.languages||[]).join(', ')}</span></div>{(() => { const c = (companies||[]).find(x => x.id === exp.company_id); if (!c) return null; const raw = c.short_name || c.name || ''; const cleaned = raw.replace(/\b(s\.?n\.?c\.?|s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?a\.?s\.?|di\s+.+)$/gi, '').trim(); const w = cleaned.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x.charAt(0).toUpperCase()+x.slice(1).toLowerCase()).join(' '); return w ? <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold whitespace-nowrap" title="Fornitore">🏢 {w}</span> : null; })()}</div></CardContent>
              <CardFooter className="pt-0 flex justify-between items-center"><div className="flex items-baseline gap-1">{sp.isFromTiers && <span className="text-xs font-normal text-muted-foreground">da</span>}<span className="text-2xl font-bold text-primary">{fmtPrice(sp.price)}</span><span className="text-xs font-normal text-muted-foreground">{t('per_person')}</span></div><Button size="sm">{t('discover')} <ChevronRight className="w-4 h-4 ml-1" /></Button></CardFooter>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ EXPERIENCE DETAIL (with waitlist) ============
function ExperienceDetail({ experience: experienceProp, setView }) {
  const { language, t } = useLanguage();
  // Traduzione on-demand dell'esperienza
  const { translated: experience, isTranslating } = useTranslatedItem(
    experienceProp,
    language,
    ['name', 'description', 'meeting_point'],
    ['itinerary_stops']
  );
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
    const nowMs = now.getTime();
    const today = now.toISOString().split('T')[0];
    
    if (!selectedDate) {
      // Mostra solo slot futuri (la cui partenza non è ancora passata)
      const futureSlots = allSlots.filter(sl => {
        const slotStartMs = new Date(sl.start_datetime).getTime();
        return slotStartMs > nowMs;
      });
      setSlots(futureSlots);
    } else {
      const filtered = allSlots.filter(slot => {
        const slotStartMs = new Date(slot.start_datetime).getTime();
        const slotStartDate = new Date(slot.start_datetime).toISOString().split('T')[0];
        const slotEndDate = new Date(slot.end_datetime).toISOString().split('T')[0];
        
        // Controlla se la data selezionata cade DENTRO il periodo dello slot
        const isInRange = selectedDate >= slotStartDate && selectedDate <= slotEndDate;
        
        // La data selezionata deve essere >= oggi
        const isNotPast = selectedDate >= today;
        
        // E lo slot non deve essere già iniziato
        const slotNotStarted = slotStartMs > nowMs;
        
        return isInRange && isNotPast && slotNotStarted;
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
    if (res.error) { safeToastError(res.error); return; }
    toast.success('Aggiunto alla lista d\'attesa! Ti contatteremo quando si libera un posto.');
    setShowWaitlist(null);
    setWlForm({ name: '', email: '', phone: '', seats: 1 });
  };

  // Funzione per gestire il click su una data - controlla se ci sono più slot per la stessa data
  const handleDateClick = (dateSlots) => {
    const nowMs = new Date().getTime();
    // Conta quanti slot hanno posti disponibili E non sono già iniziati
    const availableSlots = dateSlots.filter(s => {
      const avail = s.max_seats - s.booked_seats - (s.blocked_seats || 0);
      const notStarted = new Date(s.start_datetime).getTime() > nowMs;
      return avail > 0 && notStarted;
    });

    if (availableSlots.length === 0) {
      // Tutti gli slot sono pieni o passati
      return;
    } else if (dateSlots.length === 1) {
      // Un solo slot totale (deve essere disponibile e non passato)
      setView('booking', { experience, slot: dateSlots[0] });
    } else {
      // Più slot per la stessa data, mostra il selettore
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
      <button onClick={() => setView('catalog')} className="flex items-center gap-2 text-primary hover:underline mb-6 font-medium"><ArrowLeft className="w-4 h-4" />{t('back_to_experiences')}</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-[400px]"><img src={getExpImage(experience)} alt={experience.name} className="w-full h-full object-cover" onError={(e)=>{e.target.src=DEFAULT_EXP_IMG;}} /><div className="absolute top-4 left-4"><TypeBadge type={experience.type} /></div></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{experience.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{experience.meeting_point}{experience.meeting_point_map_url && (<a href={experience.meeting_point_map_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs text-blue-600 underline hover:text-blue-800">🗺️ Maps</a>)}</span>
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
              <div className="mb-6"><h3 className="text-xl font-semibold mb-3">{t('assigned_resources')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{assigned.map(r=>(<div key={r.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.type==='GUIDE'?'bg-emerald-100 text-emerald-700':'bg-sky-100 text-sky-700'}`}>{r.type==='GUIDE'?<User className="w-5 h-5"/>:<Ship className="w-5 h-5"/>}</div><div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.type==='GUIDE'?'Guida':(BOAT_TYPE_LABELS[r.boat_type]||'Imbarcazione')}{r.capacity?` - ${r.capacity} posti`:''}</p></div></div>))}</div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              {(() => {
                const sp = getStartingPrice(experience);
                return (
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      {sp.isFromTiers && <span className="text-sm font-normal text-muted-foreground">da</span>}
                      <CardTitle className="text-2xl">{fmtPrice(sp.price)}</CardTitle>
                    </div>
                    <span className="text-sm text-muted-foreground">{t('per_person').replace('/','')}</span>
                  </div>
                );
              })()}
              <CardDescription>{t('choose_available_date')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Date Picker per selezionare data custom */}
              <div className="pb-3 border-b">
                <Label htmlFor="date-picker" className="text-sm font-medium mb-2 block">📅 {t('search_specific_date')}</Label>
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
                  
                  // Conta disponibilità per questo giorno (escludendo slot già iniziati)
                  let totalAvail = 0;
                  let hasSlots = false;
                  const nowMs = new Date().getTime();
                  
                  allSlots.forEach(slot => {
                    const slotDate = slot.start_datetime.split('T')[0];
                    const slotStartMs = new Date(slot.start_datetime).getTime();
                    if (slotDate === dateKey && slotStartMs > nowMs) {
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
                        ? t('click_date_for_times') 
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

                  // Calcola il prezzo applicato per questa data (price_override > tier > base)
                  let slotPrice = experience.price_b2c;
                  let slotTierName = null;
                  if (firstSlot.price_override) {
                    slotPrice = firstSlot.price_override;
                  } else {
                    const tier = getPriceTierForDate(experience, firstSlot.start_datetime);
                    if (tier && tier.price_b2c) {
                      slotPrice = tier.price_b2c;
                      slotTierName = tier.tier_name;
                    }
                  }

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
                        <div className="flex flex-col items-end gap-1">
                          {allFull ? (
                            <Badge className="bg-red-500 text-white border-red-600 text-xs">Completo</Badge>
                          ) : (() => {
                            const totalMax = dateSlots.reduce((sum, s) => sum + s.max_seats, 0);
                            return (
                              <Badge className={`text-xs ${seatsBadgeColor(totalAvailable, totalMax)}`}>{totalAvailable} posti</Badge>
                            );
                          })()}
                          {/* Prezzo applicato per questa data */}
                          <div className="text-right">
                            <div className="text-base font-bold text-primary leading-none">{fmtPrice(slotPrice)}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">/pers.</span></div>
                            <div className="text-[9px] text-muted-foreground italic mt-0.5">Adulto &gt;3 anni · Sotto 3 anni gratuito</div>
                            {slotTierName && (
                              <div className="text-[10px] text-muted-foreground italic mt-0.5">📊 {slotTierName}</div>
                            )}
                          </div>
                        </div>
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
                          {hasMultipleSlots ? t('choose_resource') : t('book_now')}
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
              const slotStartMs = new Date(slot.start_datetime).getTime();
              const isPast = slotStartMs <= Date.now();
              const isFull = avail <= 0;
              const isUnavailable = isFull || isPast;
              const resourceIds = slot.resource_ids || [];
              const slotResources = resources.filter(r => resourceIds.includes(r.id));
              
              return (
                <Card 
                  key={slot.id} 
                  className={`overflow-hidden transition ${isUnavailable ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-primary hover:shadow-md'}`}
                  onClick={() => {
                    if (!isUnavailable) {
                      setShowResourceSelector(false);
                      setView('booking', { experience, slot });
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Ship className={`w-4 h-4 ${isUnavailable ? 'text-gray-400' : 'text-primary'}`} />
                          <p className={`font-semibold text-sm ${isUnavailable ? 'text-gray-500' : ''}`}>
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
                      {isPast ? (
                        <Badge className="bg-gray-500 text-white border-gray-600 text-xs">
                          <Clock className="w-3 h-3 mr-1" />Orario passato
                        </Badge>
                      ) : (
                        <Badge className={`text-xs ${seatsBadgeColor(avail, slot.max_seats)}`}>
                          {isFull ? 'Completo' : `${avail} posti`}
                        </Badge>
                      )}
                    </div>
                    <AvailabilityBar 
                      booked={slot.booked_seats + (slot.blocked_seats || 0)} 
                      max={slot.max_seats} 
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        Orario: {fmtTime(slot.start_datetime)} - {fmtTime(slot.end_datetime)}
                      </p>
                      {isPast ? (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />Non più prenotabile
                        </p>
                      ) : isFull ? (
                        <p className="text-xs text-red-600 font-medium">Non disponibile</p>
                      ) : null}
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Metodi di pagamento - caricati dalla company
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'ONLINE' | 'BANK_TRANSFER'
  const [bankReceiptFile, setBankReceiptFile] = useState(null);
  const [bankReceiptDataUrl, setBankReceiptDataUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Carica i metodi di pagamento della company al mount
  useEffect(() => {
    if (!experience?.company_id) return;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${experience.company_id}/payment-methods`);
        const data = await res.json();
        const methods = Array.isArray(data?.methods) ? data.methods : [];
        setPaymentMethods(methods);
        // Pre-seleziona automaticamente se c'è un solo metodo
        if (methods.length === 1) setPaymentMethod(methods[0].type);
      } catch (e) {
        console.error('Errore caricamento metodi pagamento:', e);
      }
    })();
  }, [experience?.company_id]);

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
    // Validazione metodo di pagamento
    if (paymentMethods.length > 0 && !paymentMethod) {
      toast.error('Seleziona un metodo di pagamento');
      return;
    }
    if (paymentMethod === 'BANK_TRANSFER' && !bankReceiptDataUrl) {
      toast.error('Carica la ricevuta del bonifico per procedere');
      return;
    }
    if (!termsAccepted) {
      toast.error('Devi accettare le Condizioni di Vendita per procedere');
      return;
    }
    setLoading(true);
    try {
      const res = await api('bookings', { method: 'POST', body: {
        slot_id: slot.id,
        experience_id: experience.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        seats,
        total_amount: subtotal,
        voucher_code: voucherResult?.valid ? voucherCode : null,
        special_requests: form.special_requests,
        participants,
        payment_method: paymentMethod === 'ONLINE_STRIPE' ? 'STRIPE' : (paymentMethod || 'ONLINE'),
        bank_transfer_receipt_url: paymentMethod === 'BANK_TRANSFER' ? bankReceiptDataUrl : null,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      } });
      if (res.error) { safeToastError(res.error); setLoading(false); return; }

      // Se ONLINE (SumUp): chiama SumUp per generare hosted checkout → redirect immediato
      if (paymentMethod === 'ONLINE') {
        try {
          const sumRes = await fetch('/api/sumup/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: res.id, return_url: window.location.origin + '/booking-success?ref=' + res.booking_ref }),
          });
          const sumData = await sumRes.json();
          if (sumData.hosted_url) {
            // Redirect alla pagina di pagamento sicura SumUp
            window.location.href = sumData.hosted_url;
            return;
          } else {
            toast.error('Errore generazione pagamento: ' + (sumData.error || 'unknown'));
            setLoading(false);
            return;
          }
        } catch (e) {
          toast.error('Errore SumUp: ' + e.message);
          setLoading(false);
          return;
        }
      }

      // Se ONLINE_STRIPE: crea Stripe Checkout Session e redirect
      if (paymentMethod === 'ONLINE_STRIPE') {
        try {
          const stRes = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: res.id }),
          });
          const stData = await stRes.json();
          if (stData.url) {
            window.location.href = stData.url;
            return;
          } else {
            toast.error('Errore Stripe: ' + (stData.error || 'unknown'));
            setLoading(false);
            return;
          }
        } catch (e) {
          toast.error('Errore Stripe: ' + e.message);
          setLoading(false);
          return;
        }
      }

      setBookingResult(res); setStep(5);
      if (paymentMethod === 'BANK_TRANSFER') {
        toast.success('Prenotazione registrata! In attesa di verifica del bonifico.');
      } else {
        toast.success('Prenotazione confermata!');
      }
    } catch { toast.error('Errore nella prenotazione'); }
    setLoading(false);
  };

  // Upload ricevuta bonifico (converte in dataURL come fa il sistema per gli altri upload)
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande (max 5MB)');
      return;
    }
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBankReceiptFile(file);
      setBankReceiptDataUrl(reader.result);
      setUploadingReceipt(false);
      toast.success('Ricevuta caricata');
    };
    reader.onerror = () => { setUploadingReceipt(false); toast.error('Errore lettura file'); };
    reader.readAsDataURL(file);
  };

  if (step === 5 && bookingResult) {
    const isPending = bookingResult.status === 'PENDING_VERIFICATION' || bookingResult.status === 'PENDING_CONFIRMATION';
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${isPending ? 'bg-amber-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isPending
              ? <Clock className="w-10 h-10 text-amber-600" />
              : <CheckCircle2 className="w-10 h-10 text-green-600" />}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isPending ? 'Prenotazione Registrata!' : 'Prenotazione Confermata!'}
          </h1>
          {isPending && (
            <p className="text-amber-700 max-w-md mx-auto">
              ⏳ La tua prenotazione è <strong>in attesa di verifica</strong>. Lo staff confermerà il bonifico entro 24 ore e riceverai un'email di conferma definitiva.
            </p>
          )}
        </div>
        <Card className="shadow-lg">
          <CardHeader className="bg-primary/5"><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">Codice prenotazione</p><p className="text-2xl font-bold font-mono text-primary">{bookingResult.booking_ref}</p></div><StatusBadge status={bookingResult.status} /></div></CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div><div><p className="text-muted-foreground">Data</p><p className="font-medium capitalize">{fmtDateTime(slot.start_datetime)}</p></div><div><p className="text-muted-foreground">Posti</p><p className="font-medium">{bookingResult.seats}</p></div><div><p className="text-muted-foreground">Totale</p><p className="font-medium text-primary">{fmtPrice(bookingResult.total_amount)}</p></div>
              {bookingResult.payment_method && (
                <div className="col-span-2"><p className="text-muted-foreground">Metodo Pagamento</p><p className="font-medium">{bookingResult.payment_method === 'BANK_TRANSFER' ? '🏦 Bonifico Istantaneo (in verifica)' : bookingResult.payment_method === 'ONLINE' ? '💳 Carta di Credito' : '✋ Pagamento Diretto'}</p></div>
              )}
            </div>
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
            <img src={getExpImage(experience)} alt={experience.name} className="w-16 h-16 rounded-lg object-cover" onError={(e)=>{e.target.src=DEFAULT_EXP_IMG;}} />
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
          {step===4&&(
            <div className="space-y-6">
              {/* Riepilogo */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg text-sm">
                <div><p className="text-muted-foreground">Esperienza</p><p className="font-medium">{experience.name}</p></div>
                <div><p className="text-muted-foreground">Data</p><p className="font-medium capitalize">{fmtDateTime(slot.start_datetime)}</p></div>
                <div><p className="text-muted-foreground">Partecipanti</p><p className="font-medium">{seats}</p></div>
                <div><p className="text-muted-foreground">Referente</p><p className="font-medium">{form.name}</p></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotale</span><span>{fmtPrice(subtotal)}</span></div>
                {discount>0&&<div className="flex justify-between text-green-600"><span>Sconto</span><span>-{fmtPrice(discount)}</span></div>}
                <div className="flex justify-between text-xl font-bold pt-2 border-t"><span>Totale</span><span className="text-primary">{fmtPrice(total)}</span></div>
              </div>

              <Separator />

              {/* Scelta metodo di pagamento */}
              <div>
                <h3 className="font-semibold mb-3">Metodo di Pagamento</h3>
                {paymentMethods.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      <CreditCard className="w-4 h-4 inline mr-2"/>Nessun metodo online configurato. La prenotazione sarà confermata e il pagamento gestito direttamente con l'organizzatore.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map(pm => {
                      const key = pm.type === 'ONLINE' && pm.provider === 'stripe' ? 'ONLINE_STRIPE' : pm.type;
                      return (
                        <label
                          key={`${pm.type}-${pm.provider || 'default'}`}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${paymentMethod === key ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <input
                            type="radio"
                            checked={paymentMethod === key}
                            onChange={() => setPaymentMethod(key)}
                            className="mt-1.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{pm.icon}</span>
                              <span className="font-semibold">{pm.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{pm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dettagli Bonifico Istantaneo */}
              {paymentMethod === 'BANK_TRANSFER' && (() => {
                const bt = paymentMethods.find(m => m.type === 'BANK_TRANSFER')?.bank_transfer || {};
                return (
                  <div className="space-y-4 p-4 bg-emerald-50/50 border-2 border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-900 flex items-center gap-2">🏦 Coordinate Bancarie</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">IBAN</p>
                        <p className="font-mono font-semibold tracking-wider break-all">{bt.iban}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Intestatario</p>
                        <p className="font-medium">{bt.account_holder}</p>
                      </div>
                      {bt.bank_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Banca</p>
                          <p className="font-medium">{bt.bank_name}</p>
                        </div>
                      )}
                      {bt.bic_swift && (
                        <div>
                          <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                          <p className="font-mono font-medium">{bt.bic_swift}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground">Importo</p>
                        <p className="text-xl font-bold text-emerald-700">{fmtPrice(total)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground">Causale Consigliata</p>
                        <p className="font-mono text-sm bg-white p-2 rounded border">Prenotazione {experience.name} - {form.name}</p>
                      </div>
                    </div>
                    {bt.instructions && (
                      <div className="p-3 bg-white border border-emerald-200 rounded text-xs text-emerald-900">
                        💡 {bt.instructions}
                      </div>
                    )}

                    {/* Upload Ricevuta */}
                    <div className="space-y-2 pt-2 border-t border-emerald-200">
                      <Label className="font-semibold flex items-center gap-2">
                        📎 Carica la Ricevuta del Bonifico *
                      </Label>
                      <p className="text-xs text-muted-foreground">PDF, JPG o PNG (max 5MB)</p>
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        onChange={handleReceiptUpload}
                        disabled={uploadingReceipt}
                        className="cursor-pointer"
                      />
                      {bankReceiptFile && (
                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-emerald-200 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium">{bankReceiptFile.name}</span>
                          <span className="text-muted-foreground text-xs">({(bankReceiptFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                      )}
                      <p className="text-xs text-amber-700">
                        ⚠️ La prenotazione resterà <strong>IN ATTESA DI VERIFICA</strong> finché lo staff non confermerà il pagamento. Riceverai una conferma via email entro 24h.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Info Pagamento Online */}
              {paymentMethod === 'ONLINE' && (
                <div className="p-4 bg-blue-50/50 border-2 border-blue-200 rounded-lg text-sm">
                  <p className="text-blue-900">
                    💳 Sarai reindirizzato alla pagina di pagamento sicura per inserire i dati della carta. La prenotazione sarà confermata immediatamente.
                  </p>
                </div>
              )}

              {/* === CONDIZIONI DI VENDITA + FLAG ACCETTAZIONE (obbligatorio per procedere) === */}
              {(experience.refund_conditions || experience.terms_pdf_url) && (
                <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50/60 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-amber-900">📋 Condizioni di Vendita</h3>
                  {experience.refund_conditions && (
                    <div>
                      <p className="text-xs font-semibold text-amber-900 mb-1">Condizioni di Rimborso</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{experience.refund_conditions}</p>
                    </div>
                  )}
                  {experience.terms_pdf_url && (
                    <a href={experience.terms_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline font-medium">
                      📎 Scarica le Condizioni di Servizio (PDF)
                    </a>
                  )}
                </div>
              )}
              <div className={`flex items-start gap-3 p-3 border-2 rounded-lg ${termsAccepted ? 'bg-emerald-50/60 border-emerald-300' : 'bg-rose-50/40 border-rose-300'}`}>
                <input
                  id="terms_accepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 cursor-pointer accent-emerald-600"
                />
                <label htmlFor="terms_accepted" className="text-sm cursor-pointer select-none flex-1">
                  <span className="font-semibold text-slate-900">Dichiaro</span> di aver preso visione delle condizioni di rimborso{experience.terms_pdf_url ? ' e del documento delle condizioni di servizio (PDF)' : ''} e di <strong>accettarle incondizionatamente</strong>. <span className="text-red-600">*</span>
                </label>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6 bg-gray-50">
          <Button variant="outline" onClick={()=>step===1?setView('detail',{experience}):setStep(step-1)} className="border-2 border-gray-400 hover:bg-gray-100 font-semibold"><ArrowLeft className="w-4 h-4 mr-2"/>{step===1?'Indietro':'Precedente'}</Button>
          {step<4?<Button onClick={()=>{if(step===2&&(!form.name||!form.email||!form.phone)){toast.error('Compila tutti i campi');return;}setStep(step+1);}} className="bg-primary text-white hover:bg-primary/90 font-semibold px-6">Continua <ChevronRight className="w-4 h-4 ml-2"/></Button>:<Button onClick={handleBook} disabled={loading || !termsAccepted} title={!termsAccepted ? 'Accetta le Condizioni di Vendita per procedere' : ''} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 disabled:opacity-50 disabled:cursor-not-allowed">{loading?<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>:<CreditCard className="w-4 h-4 mr-2"/>}Conferma e Paga {fmtPrice(total)}</Button>}
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
    if (res.error) safeToastError(res.error);
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

// ============ SUPER ADMIN: RIPROGRAMMAZIONE PRENOTAZIONE ============
function SuperAdminReschedulePanel({ booking, onDone }) {
  const initialIso = booking?.slot_datetime || '';
  const initialLocal = initialIso ? new Date(initialIso).toISOString().slice(0, 16) : '';
  const [newDt, setNewDt] = useState(initialLocal);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [force, setForce] = useState(false);
  const [lastError, setLastError] = useState(null);

  const submit = async () => {
    if (!newDt) {
      toast.error('Seleziona una nuova data e ora');
      return;
    }
    const newIso = new Date(newDt).toISOString();
    if (newIso === initialIso) {
      toast.info('La data selezionata è uguale a quella attuale. Nessun cambiamento.');
      return;
    }
    const confirmMsg = `⚠️ Confermi lo spostamento della prenotazione ${booking.booking_ref}?\n\nDA: ${initialIso ? new Date(initialIso).toLocaleString('it-IT') : '—'}\nA:  ${new Date(newDt).toLocaleString('it-IT')}\n\nQuesta operazione aggiorna gli slot e l'occupazione posti.`;
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setLastError(null);
    try {
      const resp = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_slot_datetime: newIso,
          force,
          note,
          requested_by: 'SUPER_ADMIN',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLastError(data);
        if (data.error?.includes('Capacità insufficiente') && !force) {
          toast.error(`${data.error} Spunta 'Forza overbooking' per procedere.`);
        } else {
          toast.error(data.error || 'Errore durante la riprogrammazione');
        }
        setBusy(false);
        return;
      }
      toast.success(`✅ Prenotazione spostata al ${new Date(newDt).toLocaleString('it-IT')}${data.slot_created ? ' (nuovo slot creato)' : ''}`);
      onDone?.();
    } catch (e) {
      toast.error('Errore di rete: ' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="border-2 border-violet-300 bg-violet-50/60 rounded-lg p-3 space-y-3">
      <Label className="text-sm font-bold flex items-center gap-2 text-violet-900">
        <Sparkles className="w-4 h-4" />
        Super Admin · Riprogrammazione Data
      </Label>
      <p className="text-xs text-violet-700">
        Solo Super Admin può cambiare data/ora di una prenotazione anche se CONFERMATA. L'operazione verifica la disponibilità sul nuovo slot e aggiorna automaticamente l'occupazione posti.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600">Data/ora attuale</Label>
          <div className="h-9 px-3 py-1.5 rounded-md border bg-white text-sm font-mono">
            {initialIso ? new Date(initialIso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Nuova data/ora *</Label>
          <Input
            type="datetime-local"
            value={newDt}
            onChange={(e) => setNewDt(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-600">Note operative (opzionali)</Label>
        <Input
          placeholder="Es: richiesta dal cliente, cambio meteo, etc."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9"
        />
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="w-4 h-4 accent-rose-600"
        />
        <span className="text-rose-700 font-medium">Forza overbooking (ignora capacità slot di destinazione)</span>
      </label>

      {lastError && lastError.available !== undefined && (
        <div className="text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded p-2">
          ℹ️ Slot destinazione: disponibili <b>{lastError.available}</b>, richiesti <b>{lastError.required}</b>.
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={busy || !newDt}
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          {busy ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />In corso...</> : <><CalIcon className="w-4 h-4 mr-1" />Riprogramma Data</>}
        </Button>
      </div>
    </div>
  );
}

// ============ GANTT CALENDAR ============
const GanttCalendar = memo(function GanttCalendar({ resources, allSlots, allBookings, experiences, companies, isSuperAdmin, onRefresh }) {
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
  const getCompanyName = (cid) => {
    if (!cid) return '—';
    const c = (companies || []).find(co => co.id === cid);
    if (!c) return `#${String(cid).slice(0,6)}`;
    // Tronca nomi lunghi: "MARLIN SUB S.N.C. DI CORONAS GIOVANNA E PUTZU EMANUEL" → "Marlin Sub"
    // Strategia: prendi solo la parte prima della prima forma giuridica (S.R.L., S.N.C., S.A.S., S.P.A.)
    let display = c.short_name || c.name;
    const idx = display.search(/\s+(S\.R\.L\.|S\.N\.C\.|S\.A\.S\.|S\.P\.A\.|SRL|SNC|SAS|SPA|S\.S\.|SS|SARL|LTD|GMBH)/i);
    if (idx > 0) display = display.slice(0, idx).trim();
    // Hard cap 18 caratteri con ellipsis
    if (display.length > 18) display = display.slice(0, 18).trim() + '…';
    return display;
  };

  // Helper: scarica il PDF "Registro Trasportati" salvato dallo skipper per (resourceId, date).
  // Se non esiste, fallback alla generazione lista check-in dalle bookings.
  const downloadCheckinPdf = async ({ resourceId, date, resource, exp, slot, sb, comp }) => {
    try {
      // 1) Cerca un transport_log esistente
      const logsRes = await fetch(`/api/transport-logs?resource_id=${resourceId}&date=${date}`);
      const logs = await logsRes.json();
      const log = Array.isArray(logs) && logs.length > 0 ? logs[0] : null;
      if (log && log.pdf_data) {
        // Usa il PDF generato dallo skipper
        const a = document.createElement('a');
        a.href = log.pdf_data;
        a.download = `RegistroTrasportati_${log.resource_name || resource?.name || 'risorsa'}_${log.date}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Registro Trasportati (skipper) scaricato');
        return true;
      }
      // 2) Se esiste log senza pdf_data, lo rigenero dal client
      if (log) {
        const { downloadTransportLogPdf } = await import('@/app/lib/transportLogPdf');
        await downloadTransportLogPdf({
          resource: { name: log.resource_name || resource?.name, id: log.resource_id },
          skipper: { full_name: log.skipper_name, phone: log.skipper_phone },
          date: log.date,
          bookings: log.bookings_snapshot || sb || [],
          company: comp || {},
        });
        toast.success('Registro Trasportati rigenerato');
        return true;
      }
      // 3) Nessun log skipper: fallback alla lista check-in tradizionale
      const { downloadPassengersListPdf } = await import('@/app/lib/passengersListPdf');
      await downloadPassengersListPdf({
        resource: { name: resource?.name, type: resource?.type, license_plate: resource?.license_plate, capacity: resource?.capacity },
        date,
        bookings: (sb || []).map(bk => ({
          ...bk,
          experience_name: exp?.name,
          slot_time: slot ? `${fmtTime(slot.start_datetime)} - ${fmtTime(slot.end_datetime)}` : '',
          slot_datetime: slot?.start_datetime,
        })),
        company: comp,
      });
      toast.success('Lista check-in scaricata');
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Errore generazione PDF');
      return false;
    }
  };

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
      if (res.error) safeToastError(res.error);
      else { toast.success('Prenotazione riassegnata!'); onRefresh(); }
    } catch (err) { console.error(err); }
    setDragInfo(null);
  };

  const openSlotDetail = (slot) => { setSlotBookings(getSlotBookings(slot.id)); setSelectedSlot(slot); };

  const saveBookingEdit = async () => {
    if (!editBk) return;
    const res = await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'update_details', ...editForm } });
    if (res.error) safeToastError(res.error);
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
                            {/* Bottone stampa lista check-in (visibile su hover) */}
                            {sb.some(b => b.checked_in_at) && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const dateStr = (slot.start_datetime || '').split('T')[0];
                                  const exp = experiences.find(x => x.id === slot.experience_id) || {};
                                  const comp = companies.find(c => c.id === slot.company_id) || null;
                                  await downloadCheckinPdf({
                                    resourceId: res.id,
                                    date: dateStr,
                                    resource: res,
                                    exp,
                                    slot,
                                    sb,
                                    comp,
                                  });
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/95 hover:bg-emerald-50 border border-emerald-300 text-emerald-700 rounded p-1 shadow z-10"
                                title="Stampa lista passeggeri / Registro skipper"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-sm leading-tight flex-1">{getExpName(slot.experience_id)}</p>
                              {sb.length > 0 && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            {isSuperAdmin && (
                              <div className="mb-1">
                                {slot.company_id ? (
                                  <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] py-0 px-1.5 h-auto leading-4">{getCompanyName(slot.company_id)}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0 px-1.5 h-auto leading-4">ORFANO</Badge>
                                )}
                              </div>
                            )}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" />Prenotazioni ({slotBookings.length})</h4>
                  {slotBookings.some(b => b.checked_in_at) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800"
                      onClick={async () => {
                        const dateStr = (selectedSlot.start_datetime || '').split('T')[0];
                        const exp = experiences.find(x => x.id === selectedSlot.experience_id) || {};
                        const resourcesForSlot = (resources || []).filter(r => (selectedSlot.resource_ids || []).includes(r.id));
                        const resInfo = resourcesForSlot[0] || { name: 'Slot', type: 'BOAT' };
                        const comp = (companies || []).find(c => c.id === selectedSlot.company_id) || null;
                        await downloadCheckinPdf({
                          resourceId: resInfo.id,
                          date: dateStr,
                          resource: resInfo,
                          exp,
                          slot: selectedSlot,
                          sb: slotBookings,
                          comp,
                        });
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Stampa Lista Check-in
                    </Button>
                  )}
                </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editForm.customer_email || ''} onChange={e => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
              <div><Label>Telefono</Label><Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
              <div><Label>Stato</Label><Input value={editBk?.status || ''} disabled className="bg-slate-50" /></div>
            </div>
            <div><Label>Richieste speciali</Label><Textarea value={editForm.special_requests || ''} onChange={e => setEditForm({ ...editForm, special_requests: e.target.value })} /></div>

            {/* === SUPER ADMIN: RIPROGRAMMAZIONE DATA === */}
            {isSuperAdmin && editBk && (
              <SuperAdminReschedulePanel
                booking={editBk}
                onDone={() => {
                  setEditBk(null);
                  if (typeof onRefresh === 'function') onRefresh();
                  else if (typeof load === 'function') load();
                  else window.location.reload();
                }}
              />
            )}

            {/* === RICALCOLO POSTI / PREZZO === */}
            <div className="border-2 border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2 text-blue-900">
                💰 Posti e Prezzo (ricalcolo automatico)
              </Label>
              {(() => {
                const seatsNow = Number(editForm.seats ?? editBk?.seats ?? 0) || 0;
                const unitNow = Number(editForm.unit_price ?? editBk?.b2c_price ?? editBk?.unit_price ?? (editBk?.total_amount && editBk?.seats ? editBk.total_amount/editBk.seats : 0)) || 0;
                const totalNow = Math.round(seatsNow * unitNow * 100) / 100;
                const oldTotal = Number(editBk?.total_amount) || 0;
                const diff = Math.round((totalNow - oldTotal) * 100) / 100;
                return (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-xs">N. Posti</Label>
                      <Input
                        type="number"
                        min="1"
                        value={seatsNow}
                        onChange={e => setEditForm({ ...editForm, seats: Number(e.target.value) || 1 })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Prezzo Unit. (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitNow}
                        onChange={e => setEditForm({ ...editForm, unit_price: Number(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Totale Ricalcolato</Label>
                      <div className="h-9 px-3 py-1.5 rounded-md border border-blue-300 bg-white font-bold text-blue-700 text-base">{fmtPrice(totalNow)}</div>
                    </div>
                    <div className="col-span-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Importo precedente: <strong>{fmtPrice(oldTotal)}</strong></span>
                      {diff !== 0 && (
                        <span className={diff > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                          {diff > 0 ? '↑ +' : '↓ '}{fmtPrice(Math.abs(diff))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {editBk && editBk.seats > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Assegnazione Posti ({Number(editForm.seats ?? editBk.seats)} {Number(editForm.seats ?? editBk.seats) === 1 ? 'posto' : 'posti'})
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: Number(editForm.seats ?? editBk.seats) }).map((_, idx) => (
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
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveBookingEdit}>💾 Salva e Ricalcola</Button>
              <Button variant="destructive" onClick={async () => {
                if (!confirm(`⚠️ Confermi di voler CANCELLARE la prenotazione ${editBk.booking_ref || ''}?\n\nL'operazione e' definitiva. Eventuali pagamenti dovranno essere rimborsati separatamente.`)) return;
                await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'cancel' } });
                toast.success('Prenotazione cancellata');
                setEditBk(null);
                onRefresh();
              }}>Cancella</Button>
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
function AdminDashboard({ currentUser, onLogout }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  
  // Verifica ruolo
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const [experiences, setExps] = useState([]);
  const [resources, setResources] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [companies, setCompanies] = useState([]); // Multi-Tenant
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({});
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({});
  const [showDialog, setShowDialog] = useState(null);
  const [formData, setFormData] = useState({});
  const [editRes, setEditRes] = useState(null);
  const [editResForm, setEditResForm] = useState({});
  const [editBk, setEditBk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewBk, setPreviewBk] = useState(null); // Stato per dialog anteprima prenotazione
  const [seeding, setSeeding] = useState(false);
  const [resBookings, setResBookings] = useState(null);
  // Link Pagamento Online (SumUp) - solo Company Admin
  const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);

  // === Funzioni Gestione Utenti Multi-Tenant (Super Admin) ===
  // Carica gli utenti della società selezionata
  const loadCompanyUsers = useCallback(async (companyId) => {
    if (!companyId) return;
    try {
      const r = await fetch(`/api/users?company_id=${companyId}`);
      const data = await r.json();
      setCompanyUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadCompanyUsers:', e);
      setCompanyUsers([]);
    }
  }, []);

  useEffect(() => {
    if (showUsersDialog && selectedCompany?.id) loadCompanyUsers(selectedCompany.id);
  }, [showUsersDialog, selectedCompany, loadCompanyUsers]);

  // Crea o aggiorna utente
  const createOrUpdateUser = async () => {
    try {
      if (!userForm.email || (!userForm.id && !userForm.password)) {
        toast.error('Email e password (per nuovi utenti) sono obbligatori');
        return;
      }
      const isEdit = !!userForm.id;
      const url = isEdit ? `/api/users/${userForm.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        email: userForm.email,
        username: userForm.username || '',
        role: userForm.role || 'COMPANY_ADMIN',
        company_id: selectedCompany?.id || userForm.company_id || null,
        is_active: userForm.is_active !== false,
        full_name: userForm.full_name || '',
        phone: userForm.phone || '',
      };
      if (userForm.password) payload.password = userForm.password;

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data?.error || 'Errore salvataggio utente');
        return;
      }
      toast.success(isEdit ? 'Utente aggiornato' : 'Utente creato');
      setShowUserForm(false);
      setUserForm({});
      if (selectedCompany?.id) await loadCompanyUsers(selectedCompany.id);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
  };

  // Elimina utente
  const deleteUser = async (userId) => {
    if (!userId) return;
    if (!confirm('Eliminare definitivamente questo utente?')) return;
    try {
      const r = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(data?.error || 'Errore eliminazione utente');
        return;
      }
      toast.success('Utente eliminato');
      if (selectedCompany?.id) await loadCompanyUsers(selectedCompany.id);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
  };

  // Vista Moduli - permette di nascondere sezioni della dashboard
  // 'all' | 'experiences' | 'marina' | 'cantiere' | 'magazzino' | 'locazioni'
  const [viewMode, setViewMode] = useState('all');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_view_mode');
      if (saved && ['all', 'experiences', 'marina', 'cantiere', 'magazzino', 'locazioni'].includes(saved)) {
        setViewMode(saved);
      }
    } catch {}
  }, []);
  const [activeTab, setActiveTab] = useState('overview');
  const changeViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('admin_view_mode', mode); } catch {}
    // Resetta il tab attivo per evitare di mostrare contenuti di altri moduli
    const defaultTabPerMode = {
      'all': 'overview',
      'experiences': 'experiences',
      'marina': 'marina-bookings',
      'cantiere': 'cantiere',
      'magazzino': 'magazzino',
      'locazioni': 'locazioni',
    };
    setActiveTab(defaultTabPerMode[mode] || 'overview');
  };
  const showExperiences = viewMode === 'all' || viewMode === 'experiences';
  const showMarina = viewMode === 'all' || viewMode === 'marina';
  const showCantiere = viewMode === 'all' || viewMode === 'cantiere';
  const showMagazzino = viewMode === 'all' || viewMode === 'magazzino';
  const showLocazioni = viewMode === 'all' || viewMode === 'locazioni';
  
  // Filtri Report
  const [filters, setFilters] = useState({
    code: '',
    date: '',
    resource_id: '',
    experience_id: '',
    customer_name: '',
    payment_method: '',
    status: '',
    date_from: '',
    date_to: '',
  });
  const [filteredBookings, setFilteredBookings] = useState([]);
  
  // Filtri Bookings Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingExpFilter, setBookingExpFilter] = useState('ALL');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingCustomerFilter, setBookingCustomerFilter] = useState('');
  const [bookingCodeFilter, setBookingCodeFilter] = useState('');
  const [bookingAgencyFilter, setBookingAgencyFilter] = useState('ALL'); // NUOVO filtro agenzia
  
  // Filtro Slot Tab
  const [slotExpFilter, setSlotExpFilter] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [slotPage, setSlotPage] = useState(0);
  const SLOTS_PER_PAGE = 10;
  
  // Filtri Panoramica
  const [overviewDateFilter, setOverviewDateFilter] = useState('');
  const [overviewExpFilter, setOverviewExpFilter] = useState('ALL');

  const load = useCallback(async () => {
    // Multi-tenancy: Company Admin vede SOLO i dati della sua Company
    const cid = currentUser?.company_id;
    const q = (!isSuperAdmin && cid) ? `?company_id=${cid}` : '';
    const qAll = (!isSuperAdmin && cid) ? `&company_id=${cid}` : '';
    
    // Carica solo dati essenziali all'avvio per velocizzare
    const [s, e, r] = await Promise.all([
      api(`stats${q}`), 
      api(`experiences?all=true${qAll}`), 
      api(`resources${q}`)
    ]);
    setStats(s||{}); 
    setExps(Array.isArray(e)?e:[]); 
    setResources(Array.isArray(r)?r:[]);
    
    // Carica il resto in background (non-blocking)
    setTimeout(async () => {
      const agenciesUrl = isSuperAdmin ? 'agencies' : `agencies?company_id=${cid || ''}`;
      const [sl, b, v, ag, co] = await Promise.all([
        api(`slots${q}`), 
        api(`bookings${q}`), 
        api(`vouchers${q}`), 
        api(agenciesUrl), 
        api('companies')
      ]);
      setSlots(Array.isArray(sl)?sl:[]); 
      setBookings(Array.isArray(b)?b:[]); 
      setVouchers(Array.isArray(v)?v:[]);
      setAgencies(Array.isArray(ag)?ag:[]);
      setCompanies(Array.isArray(co)?co:[]);
      setFilteredBookings(Array.isArray(b)?b:[]);
    }, 100);
  }, [isSuperAdmin, currentUser?.company_id]);

  useEffect(() => { load(); }, [load]);

  // Cantiere visibility: Super Admin OR Company Admin di Marlin Sub
  const isMarlinSub = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!isCompanyAdmin || !currentUser?.company_id) return false;
    const co = (companies || []).find(c => c.id === currentUser.company_id);
    if (!co) return false;
    const name = (co.name || '').toLowerCase();
    const slug = (co.slug || '').toLowerCase();
    return name.includes('marlin') || slug.includes('marlin');
  }, [isSuperAdmin, isCompanyAdmin, currentUser?.company_id, companies]);

  // Marina Bookings visibility: Super Admin OR Company Admin di una company che possiede/condivide marine
  const [hasMarinaOwnership, setHasMarinaOwnership] = useState(false);
  // Lista marine accessibili per il filtro globale
  const [ownedMarinas, setOwnedMarinas] = useState([]);
  // Filtro Marina globale: 'ALL' o ID marina specifico
  const [globalMarinaFilter, setGlobalMarinaFilter] = useState('ALL');
  // Nuovo Preventivo (dialog admin) - apertura
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  // Nuova Prenotazione Esperienza (dialog admin) - apertura
  const [showNewBookingDialog, setShowNewBookingDialog] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/marinas');
        const list = await r.json();
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        if (isSuperAdmin) {
          setHasMarinaOwnership(true);
          setOwnedMarinas(arr);
          return;
        }
        if (!isCompanyAdmin || !currentUser?.company_id) {
          setHasMarinaOwnership(false);
          setOwnedMarinas([]);
          return;
        }
        const accessible = arr.filter(m =>
          m.company_id === currentUser.company_id ||
          (Array.isArray(m.shared_with_companies) && m.shared_with_companies.includes(currentUser.company_id))
        );
        setHasMarinaOwnership(accessible.length > 0);
        setOwnedMarinas(accessible);
      } catch (e) {
        setHasMarinaOwnership(false);
        setOwnedMarinas([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isSuperAdmin, isCompanyAdmin, currentUser?.company_id]);

  const seedData = async () => { setSeeding(true); await api('seed', { method: 'POST' }); toast.success('Dati demo caricati!'); await load(); setSeeding(false); };
  const createItem = async (ep, data) => {
    // Multi-tenant: Company Admin assegna automaticamente company_id alle nuove entità
    const payload = (!isSuperAdmin && currentUser?.company_id && !data.company_id) 
      ? { ...data, company_id: currentUser.company_id }
      : data;
    const res = await api(ep, { method: 'POST', body: payload });
    if (res?.error) { safeToastError(res.error); return; }
    toast.success('Creato!'); 
    setShowDialog(null); 
    setFormData({}); 
    await load();
  };
  const deleteItem = async (ep, id) => { if (!confirm('Eliminare?')) return; await api(`${ep}/${id}`, { method: 'DELETE' }); toast.success('Eliminato!'); await load(); };
  const cancelBooking = async (id, ref) => {
    const label = ref ? `la prenotazione ${ref}` : 'questa prenotazione';
    if (!confirm(`⚠️ Confermi di voler CANCELLARE ${label}?\n\nL'operazione e' definitiva e libera i posti dello slot. Eventuali pagamenti dovranno essere rimborsati separatamente tramite la procedura di Rimborso.`)) return;
    await api(`bookings/${id}`, { method: 'PUT', body: { action: 'cancel' } });
    toast.success('Prenotazione cancellata');
    await load();
  };
  // Eliminazione definitiva di una prenotazione CANCELLED (solo admin company)
  const deleteBookingPermanently = async (booking) => {
    if (!isCompanyAdmin && !isSuperAdmin) {
      toast.error('Operazione riservata agli amministratori');
      return;
    }
    if (booking.status !== 'CANCELLED') {
      toast.error('Solo le prenotazioni CANCELLED possono essere eliminate definitivamente');
      return;
    }
    const ref = booking.booking_ref || booking.id;
    // Doppia conferma
    if (!window.confirm(`🗑️  ATTENZIONE: stai per ELIMINARE DEFINITIVAMENTE la prenotazione ${ref}\n\nCliente: ${booking.customer_name || '-'}\nEsperienza: ${booking.experience_name || '-'}\nStato: CANCELLED\n\nQuesta operazione è IRREVERSIBILE — rimuove la prenotazione dall'archivio e gli eventuali rimborsi collegati.\n\nVuoi procedere?`)) return;
    const confirmText = prompt(`Per conferma finale, digita ELIMINA in maiuscolo:`);
    if (confirmText !== 'ELIMINA') { toast.info('Eliminazione annullata'); return; }
    try {
      const r = await api(`bookings/${booking.id}`, { method: 'DELETE' });
      if (r?.error) { toast.error(r.error); return; }
      toast.success(`Prenotazione ${ref} eliminata definitivamente`);
      await load();
    } catch (e) {
      toast.error('Errore eliminazione: ' + (e.message || e));
    }
  };
  const checkinBooking = async (id) => { await api(`bookings/${id}`, { method: 'PUT', body: { action: 'checkin' } }); toast.success('Check-in!'); await load(); };
  // Conferma bonifico ricevuto: passa a CONFIRMED/PAID
  const confirmBankTransfer = async (b) => {
    const ok = window.confirm(`Confermi di aver ricevuto il bonifico di ${new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR' }).format(b.total_amount)} per la prenotazione ${b.booking_ref}?\n\nLa prenotazione passerà a CONFERMATA.`);
    if (!ok) return;
    try {
      await api(`bookings/${b.id}`, { method: 'PUT', body: { action: 'confirm-bank-transfer', verified_by: currentUser?.username || 'admin' } });
      toast.success('✅ Bonifico confermato - prenotazione attiva');
      await load();
    } catch (e) { toast.error('Errore conferma'); }
  };
  // Rifiuta bonifico: cancella prenotazione, libera posti
  const rejectBankTransfer = async (b) => {
    const reason = window.prompt(`Motivo del rifiuto bonifico per ${b.booking_ref}:`, 'Bonifico non ricevuto');
    if (reason === null) return;
    try {
      await api(`bookings/${b.id}`, { method: 'PUT', body: { action: 'reject-bank-transfer', verified_by: currentUser?.username || 'admin', reason } });
      toast.success('Prenotazione cancellata - posti liberati');
      await load();
    } catch (e) { toast.error('Errore rifiuto'); }
  };
  // Re-invia voucher via email (provvisorio se PENDING, finale se CONFIRMED) + scarica PDF
  const resendVoucherEmail = async (b) => {
    const voucherType = b.status === 'CONFIRMED' ? 'FINAL' : 'PROVISIONAL';
    // 1) Genera e scarica PDF
    try {
      const { downloadVoucherPdf } = await import('@/app/lib/voucherPdf');
      // Carica esperienza + company + agenzia (se booking B2B) per arricchire il voucher
      let exp = null, company = null, bankTransfer = null, agencyData = null;
      try {
        const [eRes, cRes, aRes] = await Promise.all([
          b.experience_id ? fetch(`/api/experiences/${b.experience_id}`).then(r => r.json()) : Promise.resolve(null),
          b.company_id ? fetch(`/api/companies/${b.company_id}`).then(r => r.json()) : Promise.resolve(null),
          b.agency_id ? fetch(`/api/agencies/${b.agency_id}`).then(r => r.json()) : Promise.resolve(null),
        ]);
        exp = eRes && !eRes.error ? eRes : null;
        company = cRes && !cRes.error ? cRes : null;
        agencyData = aRes && !aRes.error ? aRes : null;
        if (voucherType === 'PROVISIONAL' && b.payment_method === 'BANK_TRANSFER') {
          const pc = company?.payment_config || {};
          if (pc.bank_transfer?.iban) {
            bankTransfer = {
              iban: pc.bank_transfer.iban,
              account_holder: pc.bank_transfer.account_holder || company?.name,
              bank_name: pc.bank_transfer.bank_name,
              bic_swift: pc.bank_transfer.bic_swift,
            };
          }
        }
      } catch {}
      await downloadVoucherPdf(b, exp, company, {
        type: voucherType,
        bankTransfer,
        agencyName: agencyData?.name || b.agency_name,
        agencyEmail: agencyData?.email,
        agencyPhone: agencyData?.phone,
      });
      toast.success(`📄 PDF Voucher ${voucherType === 'FINAL' ? 'definitivo' : 'provvisorio'} scaricato`);
    } catch (e) {
      console.error('PDF voucher error:', e);
      toast.error('Errore generazione PDF: ' + e.message);
    }
    // 2) Invia email (se ha email)
    if (b.customer_email) {
      try {
        const res = await fetch('/api/send-booking-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: b.id, type: voucherType }),
        });
        const data = await res.json();
        if (data.error) { toast.error('Errore invio email: ' + data.error); return; }
        toast.success(`📧 Voucher inviato anche a ${b.customer_email}`);
      } catch (e) { toast.error('Errore invio email'); }
    }
  };
  const getExpName = (id) => experiences.find(e => e.id === id)?.name || '-';
  
  // Helper: nome agenzia da booking (preferisce agency_name, fallback su lookup tramite agency_id)
  const getAgencyName = (b) => {
    if (b?.agency_name) return b.agency_name;
    if (b?.agency_id) {
      const a = (agencies || []).find(x => x.id === b.agency_id);
      return a?.name || null;
    }
    return null;
  };
  
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

  // Helper: nome company + badge colorato per Super Admin view
  const getCompanyName = (companyId) => {
    if (!companyId) return '—';
    const c = companies?.find(co => co.id === companyId);
    return c ? c.name : `#${String(companyId).slice(0,6)}`;
  };

  const CompanyBadge = ({ companyId }) => {
    if (!isSuperAdmin) return null;
    if (!companyId) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">ORFANO</Badge>;
    return <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-xs hover:bg-purple-200">{getCompanyName(companyId)}</Badge>;
  };

  const saveResource = async () => {
    if (!editRes) return;
    const res = await api(`resources/${editRes.id}`, { method: 'PUT', body: editResForm });
    if (res.error) safeToastError(res.error); else { toast.success('Risorsa aggiornata!'); setEditRes(null); await load(); }
  };

  const saveBookingEdit = async () => {
    if (!editBk) return;
    const res = await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'update_details', ...editForm } });
    if (res.error) safeToastError(res.error); else { toast.success('Prenotazione aggiornata!'); setEditBk(null); await load(); }
  };

  const createCompany = async () => {
    if (!newCompanyForm.name) {
      toast.error('Il nome della società è obbligatorio');
      return;
    }
    
    const isEdit = !!newCompanyForm.id;
    
    // Validazione credenziali admin solo per nuove società O se sono state modificate
    const hasAdminCredentials = newCompanyForm.admin_username || newCompanyForm.admin_password || newCompanyForm.admin_email;
    
    if (!isEdit && (!newCompanyForm.admin_username || !newCompanyForm.admin_password || !newCompanyForm.admin_email)) {
      toast.error('Username, email e password dell\'amministratore sono obbligatori');
      return;
    }
    
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `companies/${newCompanyForm.id}` : 'companies';
    
    // Separa i dati della company dai dati admin
    const { admin_username, admin_password, admin_email, ...companyData } = newCompanyForm;
    
    const res = await api(endpoint, { 
      method, 
      body: companyData 
    });
    
    if (res.error) {
      safeToastError(res.error);
      return;
    }
    
    // Se è una nuova società, crea l'utente admin
    if (!isEdit && res.id) {
      const userRes = await api('users', {
        method: 'POST',
        body: {
          email: admin_email,
          username: admin_username,
          password: admin_password,
          role: 'COMPANY_ADMIN',
          company_id: res.id,
          is_active: true
        }
      });
      
      if (userRes.error) {
        toast.error('Società creata ma errore creazione utente: ' + userRes.error);
      } else {
        toast.success('Società e utente admin creati con successo!');
      }
    } 
    // Se è una modifica E ci sono credenziali admin, aggiorna l'utente
    else if (isEdit && hasAdminCredentials) {
      try {
        // Trova l'utente admin della società
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        const companyAdmin = users.find(u => u.company_id === newCompanyForm.id && u.role === 'COMPANY_ADMIN');
        
        if (companyAdmin) {
          // Aggiorna solo i campi che sono stati forniti
          const updateData = {};
          if (admin_username) updateData.username = admin_username;
          if (admin_email) updateData.email = admin_email;
          if (admin_password) updateData.password = admin_password;
          
          const userRes = await api(`users/${companyAdmin.id}`, {
            method: 'PUT',
            body: updateData
          });
          
          if (userRes.error) {
            toast.error('Società aggiornata ma errore aggiornamento credenziali: ' + userRes.error);
          } else {
            toast.success('Società e credenziali aggiornate con successo!');
          }
        } else {
          toast.success('Società aggiornata con successo!');
        }
      } catch (err) {
        console.error('Error updating admin user:', err);
        toast.success('Società aggiornata con successo!');
      }
    } else {
      toast.success('Società aggiornata con successo!');
    }
    
    setShowCompanyDialog(false);
    setNewCompanyForm({});
    await load();
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
    
    // Filtro per Agenzia
    if (bookingAgencyFilter && bookingAgencyFilter !== 'ALL') {
      if (bookingAgencyFilter === 'B2C') {
        // Mostra solo prenotazioni dirette (senza agenzia)
        filtered = filtered.filter(b => !b.agency_id);
      } else {
        // Mostra solo prenotazioni dell'agenzia specifica
        filtered = filtered.filter(b => b.agency_id === bookingAgencyFilter);
      }
    }
    
    return filtered;
  }, [bookings, bookingExpFilter, bookingDateFilter, bookingCustomerFilter, bookingCodeFilter, bookingAgencyFilter, slots]);
  
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
    
    // Filtra per esperienza se specificata
    if (overviewExpFilter && overviewExpFilter !== 'ALL') {
      result = result.filter(b => b.experience_id === overviewExpFilter);
    }
    
    // Ordina per created_at decrescente
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA; // Decrescente
    });
    
    return result;
  }, [bookings, overviewDateFilter, overviewExpFilter]);
  
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

    if (filters.payment_method) {
      result = result.filter(b => (b.payment_method || 'NONE') === filters.payment_method);
    }

    if (filters.status) {
      result = result.filter(b => (b.status || '') === filters.status);
    }

    if (filters.date_from) {
      result = result.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        return (slot.start_datetime || '').split('T')[0] >= filters.date_from;
      });
    }

    if (filters.date_to) {
      result = result.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        return (slot.start_datetime || '').split('T')[0] <= filters.date_to;
      });
    }

    setFilteredBookings(result);
  };
  
  const clearFilters = () => {
    setFilters({ code: '', date: '', resource_id: '', experience_id: '', customer_name: '', payment_method: '', status: '', date_from: '', date_to: '' });
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
      const doc = new jsPDF('l'); // landscape per più colonne
      
      // Header
      doc.setFontSize(18);
      doc.text('Report Prenotazioni - Maretrek', 14, 18);
      doc.setFontSize(10);
      doc.text(`Generato: ${new Date().toLocaleString('it-IT')}`, 14, 26);
      doc.text(`Risultati: ${filteredBookings.length}`, 14, 32);

      // Riepilogo filtri attivi
      const activeFilters = [];
      if (filters.code) activeFilters.push(`Codice: ${filters.code}`);
      if (filters.date) activeFilters.push(`Data: ${filters.date}`);
      if (filters.date_from || filters.date_to) activeFilters.push(`Range: ${filters.date_from || '...'} → ${filters.date_to || '...'}`);
      if (filters.customer_name) activeFilters.push(`Cliente: ${filters.customer_name}`);
      if (filters.payment_method) activeFilters.push(`Pagamento: ${filters.payment_method}`);
      if (filters.status) activeFilters.push(`Stato: ${filters.status}`);
      if (filters.experience_id) {
        const exp = experiences.find(e => e.id === filters.experience_id);
        if (exp) activeFilters.push(`Esperienza: ${exp.name}`);
      }
      if (activeFilters.length > 0) {
        doc.setFontSize(9);
        doc.text(`Filtri: ${activeFilters.join(' · ')}`, 14, 38);
      }
      
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
          PAYMENT_METHOD_LABEL[b.payment_method] || (b.payment_method || '—'),
          b.status,
          `€ ${Number(b.total_amount || 0).toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: activeFilters.length > 0 ? 44 : 40,
        head: [['Codice', 'Cliente', 'Data', 'Esperienza', 'Risorsa', 'Posti', 'Pagamento', 'Stato', 'Totale']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        foot: [['', '', '', '', '', '', '', 'TOTALE', `€ ${filteredBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0).toFixed(2)}`]],
        footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
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
          'Posti': b.seats,
          'Metodo Pagamento': PAYMENT_METHOD_LABEL[b.payment_method] || (b.payment_method || ''),
          'Stato Pagamento': b.payment_status || '',
          'Stato': b.status,
          'Totale': Number(b.total_amount || 0)
        };
      });
      // Aggiungi riga totale
      const tot = filteredBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
      tableData.push({
        'Codice': '', 'Cliente': '', 'Email': '', 'Telefono': '', 'Data': '', 'Esperienza': '',
        'Risorsa': '', 'Posti': '', 'Metodo Pagamento': '', 'Stato Pagamento': '', 'Stato': 'TOTALE',
        'Totale': tot,
      });

      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
      // Imposta larghezza colonne
      ws['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 28 },
        { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
      ];
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
        <div>
          <h1 className="text-3xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground">
            {currentUser && (
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4" />
                {currentUser.username || currentUser.email}
                {isSuperAdmin && <Badge className="ml-2 bg-purple-600">SUPER ADMIN</Badge>}
                {isCompanyAdmin && <Badge className="ml-2 bg-blue-600">COMPANY ADMIN</Badge>}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Toggle Vista Moduli - solo dentro company (non Super Admin globale) */}
          {(currentUser?.company_id || isSuperAdmin) && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border">
              <button
                type="button"
                onClick={() => changeViewMode('all')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                title="Mostra tutti i moduli"
              >
                🎯 Tutto
              </button>
              <button
                type="button"
                onClick={() => changeViewMode('experiences')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'experiences' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                title="Mostra solo modulo esperienze"
              >
                🚤 Esperienze
              </button>
              {(hasMarinaOwnership || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => changeViewMode('marina')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'marina' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Mostra solo modulo marina"
                >
                  ⚓ Marina
                </button>
              )}
              {(isMarlinSub || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => changeViewMode('cantiere')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'cantiere' ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Mostra solo modulo cantiere"
                >
                  🔧 Cantiere
                </button>
              )}
              <button
                type="button"
                onClick={() => changeViewMode('magazzino')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'magazzino' ? 'bg-white shadow text-rose-700' : 'text-slate-500 hover:text-slate-700'}`}
                title="Mostra solo modulo magazzino"
              >
                📦 Magazzino
              </button>
              <button
                type="button"
                onClick={() => changeViewMode('locazioni')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'locazioni' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                title="Mostra solo modulo Locazioni Brevi"
              >
                🏖️ Locazioni Brevi
              </button>
            </div>
          )}
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
          {/* Link Pagamento Online (SumUp) - solo Company Admin */}
          {isCompanyAdmin && (
            <Button
              onClick={() => setShowPaymentLinkDialog(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
              title="Genera link di pagamento SumUp da inviare al cliente"
            >
              <Link2 className="w-4 h-4 mr-2" />Link Pagamento Online
            </Button>
          )}
          {/* Pulsante "Dati Demo" RIMOSSO per prevenire cancellazioni accidentali del DB.
              L'endpoint POST /api/seed esiste ancora ma non è più richiamabile dalla UI. */}
          {onLogout && (
            <Button variant="outline" onClick={onLogout} className="border-red-200 text-red-600 hover:bg-red-50">
              <LogIn className="w-4 h-4 mr-2 rotate-180" />
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Dialog Link Pagamento Online - solo Company Admin */}
      {isCompanyAdmin && showPaymentLinkDialog && (
        <PaymentLinkDialogLazy
          open={showPaymentLinkDialog}
          onOpenChange={setShowPaymentLinkDialog}
          companyId={currentUser?.company_id}
          allBookings={bookings}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        {/* Riga 1A: Gestione Operativa (azzurro) */}
        {showExperiences && (
        <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 p-2 rounded-lg shadow-md w-full">
          <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
            <Eye className="w-4 h-4" />Gestione Operativa
          </div>
          <TabsTrigger value="gantt" className="text-white data-[state=active]:bg-white data-[state=active]:text-sky-800 hover:bg-white/20 font-semibold"><CalIcon className="w-4 h-4 mr-1.5" />{t('calendar')}</TabsTrigger>
          <TabsTrigger value="bookings" className="text-white data-[state=active]:bg-white data-[state=active]:text-sky-800 hover:bg-white/20 font-semibold"><CreditCard className="w-4 h-4 mr-1.5" />{t('bookings')}</TabsTrigger>
          <TabsTrigger value="fleet" className="text-white data-[state=active]:bg-white data-[state=active]:text-sky-800 hover:bg-white/20 font-semibold"><Map className="w-4 h-4 mr-1.5" />{t('fleet_map')}</TabsTrigger>
        </TabsList>
        )}

        {/* Riga 1B: Creazione Prodotto Esperienza (verde) */}
        {showExperiences && (
        <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-2 rounded-lg shadow-md w-full">
          <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
            <Compass className="w-4 h-4" />Creazione Prodotto "Esperienza"
          </div>
          <TabsTrigger value="resources" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold"><Ship className="w-4 h-4 mr-1.5" />{t('resources')}</TabsTrigger>
          <TabsTrigger value="skippers" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold"><Anchor className="w-4 h-4 mr-1.5" />Skipper</TabsTrigger>
          <TabsTrigger value="experiences" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold"><Compass className="w-4 h-4 mr-1.5" />{t('experiences')}</TabsTrigger>
          <TabsTrigger value="slots" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold"><CalIcon className="w-4 h-4 mr-1.5" />{t('slots')}</TabsTrigger>
          <TabsTrigger value="gps-setup" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold"><Navigation className="w-4 h-4 mr-1.5" />{t('gps_setup')}</TabsTrigger>
        </TabsList>
        )}

        {/* Riga 1C: Strumenti Trasversali (neutro slate) */}
        {showExperiences && (
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 p-2 rounded-lg w-full">
          <div className="flex items-center gap-2 px-3 mr-2 text-slate-700 font-semibold text-xs uppercase tracking-wider border-r border-slate-300 pr-3">
            <BarChart3 className="w-4 h-4" />Reportistica & Partner
          </div>
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />{t('overview')}</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1.5" />{t('reports')}</TabsTrigger>
          <TabsTrigger value="agencies"><Building2 className="w-4 h-4 mr-1.5" />{t('agencies')}</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="companies"><Building2 className="w-4 h-4 mr-1.5" />Multi-Tenant</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="backups"><Database className="w-4 h-4 mr-1.5" />Backup DB</TabsTrigger>}
        </TabsList>
        )}

        {/* === BANDA AZIONI RAPIDE — Crea Preventivo / Prenotazione (visibile anche per agenzia) === */}
        {(currentUser?.company_id || isSuperAdmin) && (
          <TabsList className="flex-wrap h-auto gap-2 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 p-2 rounded-lg shadow-lg w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
              <Plus className="w-4 h-4" />Azioni Rapide
            </div>
            {showMarina && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowNewQuoteDialog(true)}
              className="bg-white text-fuchsia-700 hover:bg-fuchsia-50 font-semibold shadow-md border border-white/40 h-9"
              title="Nuovo preventivo posto barca"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <Anchor className="w-4 h-4 mr-1.5" />
              Nuovo Preventivo Posto Barca
            </Button>
            )}
            {showExperiences && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowNewBookingDialog(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 font-semibold shadow-md border border-white/40 h-9"
              title="Crea prenotazione esperienza"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <Ship className="w-4 h-4 mr-1.5" />
              Crea Prenotazione Esperienza
            </Button>
            )}
          </TabsList>
        )}

        {/* Riga 2: Tab MARINE (sfondo blu, scritte bianche) - Super Admin o owner marina */}
        {hasMarinaOwnership && showMarina && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-blue-700 via-primary to-blue-800 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/30 pr-3">
              <Anchor className="w-4 h-4" />Step 2 - Modulo Marina
            </div>
            <TabsTrigger value="marinas" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-900 hover:bg-white/20"><Anchor className="w-4 h-4 mr-1.5" />Marine</TabsTrigger>
            <TabsTrigger value="berths" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-900 hover:bg-white/20"><Ship className="w-4 h-4 mr-1.5" />Posti Barca</TabsTrigger>
            <TabsTrigger value="quotes" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-900 hover:bg-white/20"><ClipboardList className="w-4 h-4 mr-1.5" />Preventivi</TabsTrigger>
            <TabsTrigger value="transits" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-900 hover:bg-white/20"><Ship className="w-4 h-4 mr-1.5" />Transiti</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="port-settings" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-900 hover:bg-white/20"><Shield className="w-4 h-4 mr-1.5" />Impostazioni Porto</TabsTrigger>}
          </TabsList>
        )}

        {/* Filtro Marina Globale - sotto Step 2 (collegato visivamente alle funzioni Marina) */}
        {hasMarinaOwnership && showMarina && ownedMarinas.length > 1 && (
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200 rounded-lg p-3 flex flex-wrap items-center gap-2 shadow-sm">
            <div className="flex items-center gap-2 px-2 text-blue-900 font-semibold text-xs uppercase tracking-wider border-r border-blue-300 pr-3">
              <Anchor className="w-4 h-4" />Filtro Marina
            </div>
            <button
              type="button"
              onClick={() => setGlobalMarinaFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                globalMarinaFilter === 'ALL'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-300'
                  : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              🌊 Tutte le Marine ({ownedMarinas.length})
            </button>
            {ownedMarinas.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGlobalMarinaFilter(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  globalMarinaFilter === m.id
                    ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-300'
                    : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
                title={m.location || m.name}
              >
                ⚓ {m.name}
              </button>
            ))}
            {globalMarinaFilter !== 'ALL' && (
              <Badge className="ml-auto bg-amber-500 text-white text-xs">
                Filtro attivo: visualizzando solo {ownedMarinas.find(m => m.id === globalMarinaFilter)?.name || ''}
              </Badge>
            )}
          </div>
        )}

        {/* Riga 2.5: Tab RICHIESTE PRENOTAZIONE (cyan band) - Super Admin o owner marina */}
        {hasMarinaOwnership && showMarina && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/30 pr-3">
              <Ship className="w-4 h-4" />Step 3 - Prenotazioni
            </div>
            <TabsTrigger value="marina-bookings" className="text-white data-[state=active]:bg-white data-[state=active]:text-cyan-800 hover:bg-white/20">
              <Ship className="w-4 h-4 mr-1.5" />Richieste Prenotazione Marine
            </TabsTrigger>
          </TabsList>
        )}

        {/* Modulo CANTIERE - aggregato sotto Step 3 come funzione marina */}
        {isMarlinSub && showCantiere && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/30 pr-3">
              <Wrench className="w-4 h-4" />Modulo Cantiere
            </div>
            <TabsTrigger value="cantiere" className="text-white data-[state=active]:bg-white data-[state=active]:text-amber-800 hover:bg-white/20">
              <FileSignature className="w-4 h-4 mr-1.5" />Preventivi Rimessaggio
            </TabsTrigger>
          </TabsList>
        )}

        {/* Modulo MAGAZZINO */}
        {showMagazzino && currentUser?.company_id && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/30 pr-3">
              <Package className="w-4 h-4" />Modulo Magazzino
            </div>
            <TabsTrigger value="magazzino" className="text-white data-[state=active]:bg-white data-[state=active]:text-rose-800 hover:bg-white/20 font-semibold">
              <Package className="w-4 h-4 mr-1.5" />Articoli, Bolle e Inventario
            </TabsTrigger>
          </TabsList>
        )}

        {/* Modulo LOCAZIONI BREVI */}
        {showLocazioni && (currentUser?.company_id || isSuperAdmin) && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/30 pr-3">
              <Home className="w-4 h-4" />Locazioni Brevi
            </div>
            <TabsTrigger value="locazioni" className="text-white data-[state=active]:bg-white data-[state=active]:text-teal-800 hover:bg-white/20 font-semibold">
              <Home className="w-4 h-4 mr-1.5" />Bici · Auto · Appartamenti · Ville · Barche
            </TabsTrigger>
          </TabsList>
        )}

        {/* Riga 2.6: Tab REGISTRO CONTRATTI + CONTABILITÀ - Super Admin o owner marina o company */}
        {(hasMarinaOwnership || currentUser?.company_id) && (
          <TabsList className="flex-wrap h-auto gap-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-emerald-500 p-2 rounded-lg shadow-md w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
              <FileSignature className="w-4 h-4" />Step 4 - Contratti & Contabilità
            </div>
            {hasMarinaOwnership && (
              <TabsTrigger value="contracts-registry" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold drop-shadow">
                <FileSignature className="w-4 h-4 mr-1.5" />Registro Contratti
              </TabsTrigger>
            )}
            <TabsTrigger value="accounting" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold drop-shadow">
              <Wallet className="w-4 h-4 mr-1.5" />Registro Contabilità
            </TabsTrigger>
            <TabsTrigger value="transport-logs" className="text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800 hover:bg-white/20 font-semibold drop-shadow">
              <FileText className="w-4 h-4 mr-1.5" />Registro Trasportati
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-white data-[state=active]:bg-white data-[state=active]:text-rose-800 hover:bg-white/20 font-semibold drop-shadow">
              <Banknote className="w-4 h-4 mr-1.5" />Procedura Rimborsi
            </TabsTrigger>
          </TabsList>
        )}

        {/* Riga 3 (ex Modulo Cantiere): rimosso da qui — spostato sotto Step 3 */}

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{l:'Prenotazioni',v:stats.total_bookings||0,i:CreditCard,c:'text-blue-600 bg-blue-100',show:showExperiences},{l:'Fatturato Esperienze',v:fmtPrice(stats.total_revenue||0),i:BarChart3,c:'text-green-600 bg-green-100',show:showExperiences},{l:'Esperienze',v:stats.total_experiences||0,i:Compass,c:'text-purple-600 bg-purple-100',show:showExperiences},{l:'Risorse',v:stats.total_resources||0,i:Ship,c:'text-amber-600 bg-amber-100',show:showExperiences}].filter(s=>s.show).map((s,i)=>(
              <Card key={i}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{s.l}</p><p className="text-2xl font-bold mt-1">{s.v}</p></div><div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.c}`}><s.i className="w-6 h-6"/></div></div></CardContent></Card>
            ))}
          </div>
          
          {showExperiences && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Prenotazioni per Data Acquisto</CardTitle>
                <p className="text-sm text-muted-foreground">Ordinate dalla più recente</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-muted-foreground" />
                  <Select value={overviewExpFilter} onValueChange={setOverviewExpFilter}>
                    <SelectTrigger className="w-56 h-9">
                      <SelectValue placeholder="Tutte le esperienze" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tutte le esperienze</SelectItem>
                      {experiences.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {overviewExpFilter !== 'ALL' && (
                    <Button variant="ghost" size="sm" onClick={() => setOverviewExpFilter('ALL')}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
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
                {sortedOverviewBookings.slice(0,15).map(b=>{const _ag = getAgencyName(b); return (<tr key={b.id} className="border-b last:border-0"><td className="py-2.5 text-xs">{b.created_at ? new Date(b.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="py-2.5 font-mono text-xs">{b.booking_ref}</td><td className="py-2.5">{b.customer_name}{_ag && <Badge className="ml-1.5 text-[9px] bg-indigo-100 text-indigo-800 border-indigo-200" title={`Venduto da ${_ag}`}>AG: {_ag.length > 12 ? _ag.slice(0,12)+'…' : _ag}</Badge>}</td><td className="py-2.5">{b.experience_name||getExpName(b.experience_id)}</td><td className="py-2.5">{b.seats}</td><td className="py-2.5 font-medium">{fmtPrice(b.total_amount)}</td><td className="py-2.5"><StatusBadge status={b.status}/></td></tr>);})}
              </tbody></table>{sortedOverviewBookings.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione{overviewDateFilter ? ' per questa data' : ''}. Carica i dati demo!</p>}</div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Gantt Calendar */}
        <TabsContent value="gantt">
          <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary"/><p className="ml-3 text-muted-foreground">Caricamento calendario...</p></div>}>
            <GanttCalendar resources={resources} allSlots={slots} allBookings={bookings} experiences={experiences} companies={companies} isSuperAdmin={isSuperAdmin} onRefresh={load} />
          </Suspense>

          {/* Registri Trasportati - PDF generati dagli skipper, accessibili da Calendario */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-blue-600" />
                Registri Trasportati (PDF Skipper)
              </CardTitle>
              <CardDescription>Lista dei registri giornalieri chiusi dagli skipper - scaricabili in PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <TransportLogsListLazy companyId={currentUser?.company_id || (companies?.[0]?.id)} limit={50} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiences */}
        <TabsContent value="experiences" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Esperienze ({experiences.length})</h2><Button onClick={()=>{setFormData({type:'GITA_GOMMONE',languages:['IT'],is_active:true});setShowDialog('experience');}}><Plus className="w-4 h-4 mr-2"/>Nuova</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Tipo</th>{isSuperAdmin && <th className="p-3 font-medium">Company</th>}<th className="p-3 font-medium">B2C</th><th className="p-3 font-medium">B2B</th><th className="p-3 font-medium">Durata</th><th className="p-3 font-medium">Cap.</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {experiences.map(e=>(<tr key={e.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{e.name}</td><td className="p-3"><TypeBadge type={e.type}/></td>{isSuperAdmin && <td className="p-3"><CompanyBadge companyId={e.company_id}/></td>}<td className="p-3">{fmtPrice(e.price_b2c)}</td><td className="p-3">{fmtPrice(e.price_b2b)}</td><td className="p-3">{Math.floor(e.duration_minutes/60)}h{e.duration_minutes%60>0?` ${e.duration_minutes%60}min`:''}</td><td className="p-3">{e.max_capacity}</td><td className="p-3">{e.is_active === false ? <Badge variant="outline" className="text-muted-foreground">Sospesa</Badge> : e.is_visible_on_home === false ? <Badge variant="secondary" className="bg-amber-100 text-amber-800">NO View</Badge> : <Badge className="bg-green-100 text-green-800">Attiva</Badge>}</td><td className="p-3"><div className="flex gap-1 flex-wrap"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData({...e,duration_hours:Math.floor(e.duration_minutes/60)});setShowDialog('edit_experience');}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button><Button variant="secondary" size="sm" className="h-7 text-xs" onClick={async ()=>{const {id,created_at,updated_at,...expData}=e;const duplicated=await api('experiences',{method:'POST',body:{...expData,name:`${e.name} (Copia)`,duration_hours:Math.floor(e.duration_minutes/60)}});if(duplicated.error){toast.error(duplicated.error);}else{toast.success('Esperienza duplicata!');await load();setFormData({...duplicated,duration_hours:Math.floor(duplicated.duration_minutes/60)});setShowDialog('edit_experience');}}}><Copy className="w-3 h-3 mr-1"/>Duplica</Button><Button variant={e.is_active !== false ? "ghost" : "outline"} size="sm" className="h-7 text-xs" onClick={async ()=>{await api(`experiences/${e.id}`,{method:'PUT',body:{is_active:!(e.is_active !== false)}});toast.success(e.is_active !== false ? 'Esperienza sospesa':'Esperienza attivata');await load();}}>{e.is_active !== false ? 'Sospendi' : 'Attiva'}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('experiences',e.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button></div></td></tr>))}
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
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={()=>{setEditRes(r);setEditResForm({name:r.name,type:r.type,boat_type:r.boat_type||'GOMMONE',capacity:r.capacity||0,bio:r.bio||'',email:r.email||'',phone:r.phone||'',languages:r.languages||[],is_available:r.is_available,gps_imei:r.gps_imei||'',marca:r.marca||'',potenza_motore:r.potenza_motore||'',consumo_orario_litri:r.consumo_orario_litri||'',ore_inizio_stagione:r.ore_inizio_stagione||''});}}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('resources',r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.bio}</p>
                        {r.languages?.length>0&&<div className="mt-2 flex gap-1">{r.languages.map(l=><Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{rb.length} prenotazioni</Badge>
                          {rb.length>0&&<Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={()=>setResBookings({resource:r,bookings:rb})}>Vedi lista</Button>}
                          <CompanyBadge companyId={r.company_id}/>
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
              
              {(isCompanyAdmin || isSuperAdmin) && (
                <BulkSlotsDeleteLazy
                  companies={companies}
                  isSuperAdmin={isSuperAdmin}
                  isCompanyAdmin={isCompanyAdmin}
                  currentUser={currentUser}
                />
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
                              <p className="font-semibold flex items-center gap-2">{getExpName(group.experience_id)}<CompanyBadge companyId={group.slots[0]?.company_id}/></p>
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-semibold">Prenotazioni ({filteredBookingsTab.length})</h2>
              <div className="flex gap-2 flex-wrap">
                {isSuperAdmin && (
                  <SuperAdminBookingDeleteLazy
                    isSuperAdmin={isSuperAdmin}
                    onDeleted={() => load()}
                  />
                )}
                <Button
                  onClick={() => setShowNewBookingDialog(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />Crea Prenotazione
                </Button>
              </div>
            </div>
            
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
                <div className="flex items-center gap-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-9 w-9 flex-shrink-0"
                    title="Giorno precedente"
                    onClick={() => {
                      const toYMD = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                      const base = bookingDateFilter || toYMD(new Date());
                      const [y,m,d] = base.split('-').map(Number);
                      const dt = new Date(y, m-1, d);
                      dt.setDate(dt.getDate() - 1);
                      setBookingDateFilter(toYMD(dt));
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Input 
                    type="date" 
                    className="h-9 flex-1"
                    value={bookingDateFilter} 
                    onChange={e => setBookingDateFilter(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-9 w-9 flex-shrink-0"
                    title="Giorno successivo"
                    onClick={() => {
                      const toYMD = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                      const base = bookingDateFilter || toYMD(new Date());
                      const [y,m,d] = base.split('-').map(Number);
                      const dt = new Date(y, m-1, d);
                      dt.setDate(dt.getDate() + 1);
                      setBookingDateFilter(toYMD(dt));
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
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
                <Label className="text-xs mb-1 block">Agenzia</Label>
                <Select value={bookingAgencyFilter} onValueChange={setBookingAgencyFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte (B2C + B2B)</SelectItem>
                    <SelectItem value="B2C">Solo B2C (Dirette)</SelectItem>
                    {agencies.map(ag => (
                      <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Rif.</th><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Esperienza</th>{isSuperAdmin && <th className="p-3 font-medium">Company</th>}<th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Risorsa</th><th className="p-3 font-medium">Posti</th><th className="p-3 font-medium">Totale</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {filteredBookingsTab.map(b=>{const _agencyName = getAgencyName(b); return (<tr key={b.id} className="border-b hover:bg-muted/30"><td className="p-3 font-mono text-xs">{b.booking_ref}</td><td className="p-3"><div>{b.customer_name}</div>{_agencyName && <Badge className="text-[10px] bg-indigo-100 text-indigo-800 border-indigo-200 mt-1" title={`Venduto da ${_agencyName}`}><Building2 className="w-2.5 h-2.5 mr-0.5" />AG: {_agencyName.length > 14 ? _agencyName.slice(0, 14) + '…' : _agencyName}</Badge>}</td><td className="p-3 text-xs">{b.customer_email}</td><td className="p-3">{b.experience_name||getExpName(b.experience_id)}</td>{isSuperAdmin && <td className="p-3"><CompanyBadge companyId={b.company_id}/></td>}<td className="p-3 text-xs capitalize">{fmtDate(b.slot_datetime||b.created_at)}</td><td className="p-3 text-xs font-mono font-semibold">{getResourceName(b)}</td><td className="p-3">{b.seats}</td><td className="p-3 font-medium">{fmtPrice(b.total_amount)}</td><td className="p-3"><StatusBadge status={b.status}/></td>
              <td className="p-3"><div className="flex gap-1 flex-wrap">
                <Button variant="secondary" size="sm" className="text-xs h-7" onClick={()=>setPreviewBk(b)}><Eye className="w-3 h-3 mr-1"/>Anteprima</Button>
                {/* Azioni per Bonifico in attesa di verifica */}
                {b.status==='PENDING_VERIFICATION' && (
                  <>
                    {b.bank_transfer_receipt_url && (
                      <Button variant="outline" size="sm" className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={()=>window.open(b.bank_transfer_receipt_url, '_blank')}>
                        <Eye className="w-3 h-3 mr-1"/>Ricevuta
                      </Button>
                    )}
                    <Button variant="default" size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700" onClick={()=>confirmBankTransfer(b)}>
                      <CheckCircle2 className="w-3 h-3 mr-1"/>Conferma €
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50" onClick={()=>rejectBankTransfer(b)}>
                      <X className="w-3 h-3 mr-1"/>Rifiuta
                    </Button>
                  </>
                )}
                {/* Azioni per Da Confermare (admin/agency pagamento diretto/successivo) */}
                {b.status==='PENDING_CONFIRMATION' && (
                  <>
                    <Button variant="default" size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700" onClick={()=>confirmBankTransfer(b)} title="Marca come pagato + conferma">
                      <CheckCircle2 className="w-3 h-3 mr-1"/>Conferma €
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>{setEditBk(b);setEditForm({customer_name:b.customer_name,customer_email:b.customer_email,customer_phone:b.customer_phone,special_requests:b.special_requests||'',seats:b.seats,seat_assignments:b.seat_assignments||[]});}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>
                    {/* Se ha già un link SumUp, mostra pulsante per riaprirlo */}
                    {b.sumup_hosted_url && (
                      <Button variant="outline" size="sm" className="text-xs h-7 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={()=>{navigator.clipboard.writeText(b.sumup_hosted_url); toast.success('Link SumUp copiato!');}} title="Copia link pagamento SumUp">
                        🔗 Link
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={()=>cancelBooking(b.id, b.booking_ref)}>Cancella</Button>
                  </>
                )}
                {/* Re-invio voucher email */}
                {b.customer_email && (b.status==='CONFIRMED' || b.status==='PENDING_VERIFICATION' || b.status==='PENDING_CONFIRMATION') && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 hover:bg-blue-50" onClick={()=>resendVoucherEmail(b)} title="Re-invia voucher via email">
                    📧 Voucher
                  </Button>
                )}
                {(b.status==='CONFIRMED'&&!b.checked_in_at)&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>{setEditBk(b);setEditForm({customer_name:b.customer_name,customer_email:b.customer_email,customer_phone:b.customer_phone,special_requests:b.special_requests||'',seats:b.seats,seat_assignments:b.seat_assignments||[]});}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>checkinBooking(b.id)}>Check-in</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={()=>cancelBooking(b.id, b.booking_ref)}>Cancella</Button>}
                {b.checked_in_at&&<Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1"/>OK</Badge>}
                {/* Eliminazione DEFINITIVA solo per CANCELLED e solo admin (company/super) */}
                {b.status==='CANCELLED'&&(isCompanyAdmin||isSuperAdmin)&&(
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                    onClick={()=>deleteBookingPermanently(b)}
                    title="Elimina definitivamente dall'archivio (solo CANCELLED)"
                  >
                    <Trash2 className="w-3 h-3 mr-1"/>Elimina
                  </Button>
                )}
              </div></td>
            </tr>);})}
          </tbody>
          {filteredBookingsTab.length > 0 && (
            <tfoot className="bg-muted/80 font-semibold border-t-2 border-primary/20 sticky bottom-0">
              <tr>
                <td colSpan={isSuperAdmin ? 7 : 6} className="p-3 text-right text-muted-foreground uppercase text-xs tracking-wide">
                  Totale {filteredBookingsTab.length} {filteredBookingsTab.length === 1 ? 'prenotazione' : 'prenotazioni'}
                </td>
                <td className="p-3 text-primary">
                  {filteredBookingsTab.reduce((sum, b) => sum + (b.seats || 0), 0)}
                </td>
                <td className="p-3 text-primary font-bold text-base">
                  {fmtPrice(filteredBookingsTab.reduce((sum, b) => sum + (b.total_amount || 0), 0))}
                </td>
                <td className="p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
          </table>{filteredBookingsTab.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione trovata.</p>}</div>
        </TabsContent>

        {/* Vouchers */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Voucher ({vouchers.length})</h2><Button onClick={()=>{setFormData({type:'PERCENTAGE',value:10,max_uses:100});setShowDialog('voucher');}}><Plus className="w-4 h-4 mr-2"/>Nuovo</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Codice</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valore</th><th className="p-3 font-medium">Utilizzi</th><th className="p-3 font-medium">Scadenza</th>{isSuperAdmin && <th className="p-3 font-medium">Company</th>}<th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {vouchers.map(v=>(<tr key={v.id} className="border-b"><td className="p-3 font-mono font-bold">{v.code}</td><td className="p-3">{v.type==='PERCENTAGE'?'%':v.type==='FIXED'?'Fisso':'Regalo'}</td><td className="p-3 font-medium">{v.type==='PERCENTAGE'?`${v.value}%`:fmtPrice(v.value)}</td><td className="p-3">{v.uses_count}/{v.max_uses}</td><td className="p-3 text-xs">{v.valid_until?fmtDate(v.valid_until):'Illimitato'}</td>{isSuperAdmin && <td className="p-3"><CompanyBadge companyId={v.company_id}/></td>}<td className="p-3"><Button variant="ghost" size="icon" onClick={()=>deleteItem('vouchers',v.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></td></tr>))}
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
                {/* === Nuovi filtri: Metodo Pagamento, Stato, Range Date === */}
                <div>
                  <Label>Metodo Pagamento</Label>
                  <Select value={filters.payment_method || 'all'} onValueChange={(v) => setFilters({...filters, payment_method: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Tutti i metodi" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stato Prenotazione</Label>
                  <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({...filters, status: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="CONFIRMED">Confermata</SelectItem>
                      <SelectItem value="HELD">In sospeso</SelectItem>
                      <SelectItem value="PENDING_VERIFICATION">In Verifica Bonifico</SelectItem>
                      <SelectItem value="CANCELLED">Annullata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Da</Label>
                  <Input type="date" value={filters.date_from} onChange={(e) => setFilters({...filters, date_from: e.target.value})} />
                </div>
                <div>
                  <Label>Data A</Label>
                  <Input type="date" value={filters.date_to} onChange={(e) => setFilters({...filters, date_to: e.target.value})} />
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
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Stato Venduto</th>
                      <th className="p-3 text-right">Totale</th>
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
                      const pmLabel = PAYMENT_METHOD_LABEL[b.payment_method] || (b.payment_method || '—');
                      const pmColor = b.payment_method === 'ONLINE' || b.payment_method === 'CARD' ? 'bg-violet-100 text-violet-800'
                                    : b.payment_method === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800'
                                    : b.payment_method === 'CASH' || b.payment_method === 'DIRECT' ? 'bg-emerald-100 text-emerald-800'
                                    : b.payment_method === 'AGENCY' ? 'bg-amber-100 text-amber-800'
                                    : b.payment_method === 'FREE' ? 'bg-pink-100 text-pink-800'
                                    : 'bg-gray-100 text-gray-700';
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
                          <td className="p-3">
                            <Badge className={`${pmColor} border-0 text-[11px] px-2 py-0.5`}>{pmLabel}</Badge>
                            {b.payment_status && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{b.payment_status}</div>
                            )}
                          </td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                          <td className="p-3 font-semibold text-right">{fmtPrice(b.total_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filteredBookings.length > 0 && (
                    <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold border-t-2 border-emerald-300 sticky bottom-0">
                      <tr>
                        <td colSpan={5} className="p-3 text-right text-muted-foreground uppercase text-xs tracking-wide">
                          Totale {filteredBookings.length} {filteredBookings.length === 1 ? 'prenotazione' : 'prenotazioni'}
                        </td>
                        <td className="p-3 text-emerald-700">
                          {filteredBookings.reduce((sum, b) => sum + (Number(b.seats) || 0), 0)}
                        </td>
                        <td colSpan={2}></td>
                        <td className="p-3 text-emerald-700 text-base text-right">
                          {fmtPrice(filteredBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
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
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Agenzie B2B ({agencies.length})</h2><Button onClick={()=>{setFormData({discount_percentage:15,payment_terms:'30_70',logo:'',company_id:currentUser?.company_id||null});setShowDialog('agency');}}><Plus className="w-4 h-4 mr-2"/>Nuova Agenzia</Button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th>{isSuperAdmin && <th className="p-3 font-medium">Società</th>}<th className="p-3 font-medium">Email</th><th className="p-3 font-medium">P.IVA</th><th className="p-3 font-medium">Telefono</th><th className="p-3 font-medium">Sconto</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {agencies.map(a=>(
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {a.logo && <img src={a.logo} alt={a.name} className="w-8 h-8 rounded object-cover" />}
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    {isSuperAdmin && <td className="p-3 text-xs">{companies.find(c=>c.id===a.company_id)?.name || 'N/A'}</td>}
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

        {/* Skippers - Gestione account skipper */}
        <TabsContent value="skippers" className="space-y-4">
          <SkippersAdminLazy
            companyId={currentUser?.company_id || (companies?.[0]?.id)}
            companies={companies}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>

        {/* Mappa Flotta GPS */}
        <TabsContent value="fleet">
          <MappaFlottaWrapper currentUser={currentUser} isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        {/* Setup GPS */}
        <TabsContent value="gps-setup">
          <SetupGPS />
        </TabsContent>

        {/* Backup DB Tab - Super Admin only */}
        {isSuperAdmin && (
          <TabsContent value="backups" className="space-y-6">
            <BackupManagerLazy currentUser={currentUser} />
          </TabsContent>
        )}

        {/* Multi-Tenant Companies Tab */}
        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Gestione Multi-Tenant
                  </CardTitle>
                  <CardDescription>Genera link diretti per le company con branding personalizzato</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isSuperAdmin && <BulkSlotsDeleteLazy companies={companies} isSuperAdmin={isSuperAdmin} />}
                  <Button onClick={() => setShowCompanyDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Società
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {companies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium mb-2">Nessuna società configurata</p>
                  <p className="text-sm">Clicca su "Nuova Società" per aggiungere la prima company al sistema multi-tenant.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {companies.map(company => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const directLink = `${baseUrl}/${company.slug}`;
                    
                    return (
                      <Card key={company.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {company.logo_url && (
                                <img 
                                  src={company.logo_url} 
                                  alt={company.name} 
                                  className="w-12 h-12 rounded object-cover border"
                                />
                              )}
                              <div>
                                <CardTitle className="text-lg">{company.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {company.subscription_plan || 'STANDARD'}
                                  </Badge>
                                  {company.is_active === false ? (
                                    <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                      <EyeOff className="w-3 h-3 mr-1" />Sospesa
                                    </Badge>
                                  ) : (
                                    <Badge className="text-xs bg-green-100 text-green-800">
                                      <Eye className="w-3 h-3 mr-1" />Visibile
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Colori preview */}
                              <div className="flex items-center gap-2">
                                {company.primary_color && (
                                  <div 
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{ backgroundColor: company.primary_color }}
                                    title="Colore Primario"
                                  />
                                )}
                                {company.secondary_color && (
                                  <div 
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{ backgroundColor: company.secondary_color }}
                                    title="Colore Secondario"
                                  />
                                )}
                              </div>
                              {/* Pulsanti azione */}
                              <div className="flex items-center gap-2">
                                {/* Toggle Visibile/Sospesa */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={company.is_active === false
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                                  onClick={async () => {
                                    const newState = !(company.is_active === false ? false : true);
                                    const action = newState ? 'attivare' : 'sospendere';
                                    if (!confirm(`Vuoi ${action} la societa\u0300 "${company.name}"?\n${newState ? 'Sara\u0300 nuovamente visibile e operativa.' : 'Verra\u0300 nascosta dal catalogo pubblico e dal portale B2B.'}`)) return;
                                    const res = await api(`companies/${company.id}`, {
                                      method: 'PUT',
                                      body: { is_active: newState },
                                    });
                                    if (res.error) {
                                      safeToastError(res.error);
                                    } else {
                                      toast.success(newState ? 'Societa\u0300 attivata' : 'Societa\u0300 sospesa');
                                      await load();
                                    }
                                  }}
                                  title={company.is_active === false ? 'Attiva (rendi visibile)' : 'Sospendi (nascondi dal pubblico)'}
                                >
                                  {company.is_active === false ? (
                                    <><EyeOff className="w-4 h-4 mr-1" />Sospesa</>
                                  ) : (
                                    <><Eye className="w-4 h-4 mr-1" />Visibile</>
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setShowUsersDialog(true);
                                  }}
                                  title="Gestisci utenti"
                                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    // Carica le credenziali dell'admin della società
                                    try {
                                      const usersRes = await fetch('/api/users');
                                      const users = await usersRes.json();
                                      const companyAdmin = users.find(u => u.company_id === company.id && u.role === 'COMPANY_ADMIN');
                                      
                                      setNewCompanyForm({
                                        ...company,
                                        admin_username: companyAdmin?.username || '',
                                        admin_email: companyAdmin?.email || '',
                                        admin_password: '' // Non mostriamo la password per sicurezza
                                      });
                                      setShowCompanyDialog(true);
                                    } catch (err) {
                                      console.error('Error loading company admin:', err);
                                      setNewCompanyForm(company);
                                      setShowCompanyDialog(true);
                                    }
                                  }}
                                  title="Modifica società"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={async () => {
                                    if (confirm(`Sei sicuro di voler eliminare "${company.name}"? Questa azione è irreversibile.`)) {
                                      const res = await api(`companies/${company.id}`, { method: 'DELETE' });
                                      if (res.error) {
                                        safeToastError(res.error);
                                      } else {
                                        toast.success('Società eliminata');
                                        await load();
                                      }
                                    }
                                  }}
                                  title="Elimina società"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">P.IVA</p>
                              <p className="font-medium">{company.vat_number || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Slug</p>
                              <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{company.slug}</p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Link Diretto con Branding</Label>
                            <div className="flex items-center gap-2">
                              <Input 
                                value={directLink}
                                readOnly
                                className="flex-1 font-mono text-sm"
                              />
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(directLink);
                                  toast.success('Link copiato negli appunti!');
                                }}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Copia
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => window.open(directLink, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Anteprima
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Questo link mostrerà automaticamente il logo, i colori e solo le esperienze di {company.name}.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            <div className="text-center p-3 bg-muted/30 rounded">
                              <p className="text-2xl font-bold text-blue-600">{company.total_bookings || 0}</p>
                              <p className="text-xs text-muted-foreground">Prenotazioni</p>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded">
                              <p className="text-2xl font-bold text-green-600">{fmtPrice(company.total_revenue || 0)}</p>
                              <p className="text-xs text-muted-foreground">Fatturato</p>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded">
                              <p className="text-2xl font-bold text-purple-600">{company.max_experiences || 0}</p>
                              <p className="text-xs text-muted-foreground">Max Exp.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Creazione Nuova Società */}
          <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {newCompanyForm.id ? 'Modifica Società' : 'Crea Nuova Società'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Link Pubblici & Accessi (solo per company esistenti) */}
                {newCompanyForm.id && newCompanyForm.slug && (
                  <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Link Pubblici & Accessi
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Condividi questi link per dare accesso diretto al catalogo pubblico e alle dashboard di questa società
                    </p>
                    
                    {(() => {
                      const base = typeof window !== 'undefined' ? window.location.origin : '';
                      const catalogUrl = `${base}/${newCompanyForm.slug}`;
                      const adminUrl = `${base}/`;
                      const b2bUrl = `${base}/${newCompanyForm.slug}/b2b`;
                      const copy = (url, label) => {
                        navigator.clipboard.writeText(url);
                        toast.success(`${label} copiato!`);
                      };
                      return (
                        <div className="space-y-2">
                          {/* Catalogo pubblico B2C */}
                          <div className="flex items-center gap-2 bg-white p-2 rounded-md border">
                            <Badge className="bg-green-100 text-green-800 text-xs shrink-0">B2C</Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">Catalogo Pubblico</p>
                              <a href={catalogUrl} target="_blank" rel="noopener" className="text-xs font-mono text-primary hover:underline truncate block">
                                {catalogUrl}
                              </a>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => copy(catalogUrl, 'Link catalogo')}>
                              <Copy className="w-3 h-3 mr-1" />Copia
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => window.open(catalogUrl, '_blank')}>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Login Company Admin */}
                          <div className="flex items-center gap-2 bg-white p-2 rounded-md border">
                            <Badge className="bg-purple-100 text-purple-800 text-xs shrink-0">ADMIN</Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">Login Amministratore Company</p>
                              <a href={adminUrl} target="_blank" rel="noopener" className="text-xs font-mono text-primary hover:underline truncate block">
                                {adminUrl} → B2B Company
                              </a>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => copy(adminUrl, 'Link admin')}>
                              <Copy className="w-3 h-3 mr-1" />Copia
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => window.open(adminUrl, '_blank')}>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Login Agenzie B2B */}
                          <div className="flex items-center gap-2 bg-white p-2 rounded-md border">
                            <Badge className="bg-amber-100 text-amber-800 text-xs shrink-0">B2B</Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">Login Agenzie B2B</p>
                              <a href={b2bUrl} target="_blank" rel="noopener" className="text-xs font-mono text-primary hover:underline truncate block">
                                {b2bUrl}
                              </a>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => copy(b2bUrl, 'Link B2B')}>
                              <Copy className="w-3 h-3 mr-1" />Copia
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => window.open(b2bUrl, '_blank')}>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="text-xs text-muted-foreground pt-1 border-t border-blue-200">
                      💡 Slug società: <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{newCompanyForm.slug}</span>
                    </div>
                  </div>
                )}
                
                {/* Informazioni Base */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Società *</Label>
                    <Input 
                      placeholder="Es: Maretrek" 
                      value={newCompanyForm.name || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma Giuridica</Label>
                    <Select 
                      value={newCompanyForm.legal_form || 'S.R.L.'}
                      onValueChange={v => setNewCompanyForm({...newCompanyForm, legal_form: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S.R.L.">S.R.L.</SelectItem>
                        <SelectItem value="S.P.A.">S.P.A.</SelectItem>
                        <SelectItem value="S.N.C.">S.N.C.</SelectItem>
                        <SelectItem value="S.A.S.">S.A.S.</SelectItem>
                        <SelectItem value="DITTA_INDIVIDUALE">Ditta Individuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Partita IVA</Label>
                    <Input 
                      placeholder="IT12345678901" 
                      value={newCompanyForm.vat_number || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, vat_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Codice SDI</Label>
                    <Input 
                      placeholder="ABC1234" 
                      value={newCompanyForm.sdi_code || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, sdi_code: e.target.value})}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Contatti */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      placeholder="info@company.com" 
                      value={newCompanyForm.email || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input 
                      placeholder="+39 070 123456" 
                      value={newCompanyForm.phone || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <Separator />
                

                <Separator />
                
                {/* Credenziali Amministratore */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Credenziali Amministratore
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Crea le credenziali di accesso per l'amministratore di questa società
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username Admin *</Label>
                      <Input 
                        placeholder="Admin_NomeSocieta"
                        value={newCompanyForm.admin_username || ''}
                        onChange={e => setNewCompanyForm({...newCompanyForm, admin_username: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password Admin {!newCompanyForm.id && <span className="text-red-500">*</span>}</Label>
                      <div className="relative">
                        <Input 
                          type={newCompanyForm._show_admin_password ? 'text' : 'password'}
                          placeholder={newCompanyForm.id ? "Lascia vuoto per non modificare" : "Password123!"}
                          value={newCompanyForm.admin_password || ''}
                          onChange={e => setNewCompanyForm({...newCompanyForm, admin_password: e.target.value})}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setNewCompanyForm({...newCompanyForm, _show_admin_password: !newCompanyForm._show_admin_password})}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                          title={newCompanyForm._show_admin_password ? 'Nascondi' : 'Mostra'}
                        >
                          {newCompanyForm._show_admin_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newCompanyForm.id && (
                        <p className="text-xs text-amber-600">
                          ⚠️ Per motivi di sicurezza la password attuale non è recuperabile (hash bcrypt). Inserisci una nuova password per reimpostarla.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Admin *</Label>
                    <Input 
                      type="email"
                      placeholder="admin@nomesocieta.com"
                      value={newCompanyForm.admin_email || ''}
                      onChange={e => setNewCompanyForm({...newCompanyForm, admin_email: e.target.value})}
                    />
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-800">
                      <strong>💡 Nota:</strong> Queste credenziali permetteranno all'amministratore della società di accedere alla dashboard.
                    </p>
                  </div>
                </div>
                
                {/* Configurazione Metodi di Pagamento (Esperienze pubbliche) */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    💳 Configurazione Pagamenti (Esperienze)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configura come i clienti possono pagare le prenotazioni delle esperienze sul catalogo pubblico.
                  </p>

                  {/* Online Payment - SumUp diretto sulla Company */}
                  <div className="rounded-lg border p-3 bg-blue-50/50">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="enable_online_payment"
                        checked={newCompanyForm.payment_config?.enable_online_payment !== false}
                        onChange={e => setNewCompanyForm({
                          ...newCompanyForm,
                          payment_config: {
                            ...(newCompanyForm.payment_config || {}),
                            enable_online_payment: e.target.checked,
                          }
                        })}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <Label htmlFor="enable_online_payment" className="font-semibold cursor-pointer">💳 POS Web SumUp (Carta di Credito Online)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configura le credenziali SumUp per accettare pagamenti con carta di credito sul catalogo pubblico e generare link di pagamento esterno.
                        </p>
                      </div>
                    </div>

                    {newCompanyForm.payment_config?.enable_online_payment !== false && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-7">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs flex items-center gap-1">
                            🔑 SumUp API Key (Secret) *
                            {newCompanyForm.payment_config?.sumup?.merchant_code && (
                              <Badge variant="secondary" className="text-[10px] ml-2">Merchant: {newCompanyForm.payment_config.sumup.merchant_code}</Badge>
                            )}
                          </Label>
                          <Input
                            type="password"
                            placeholder="sup_sk_xxxxxxxxxxxxxxx"
                            value={newCompanyForm.payment_config?.sumup?.api_key || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                sumup: {
                                  ...(newCompanyForm.payment_config?.sumup || {}),
                                  enabled: true,
                                  api_key: e.target.value.trim(),
                                  mode: newCompanyForm.payment_config?.sumup?.mode || 'live',
                                }
                              }
                            })}
                          />
                          <p className="text-[11px] text-muted-foreground">Trova la tua chiave in: <a href="https://me.sumup.com" target="_blank" rel="noopener" className="text-blue-600 underline">me.sumup.com</a> → Settings → For Developers → API Keys</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Modalità</Label>
                          <Select
                            value={newCompanyForm.payment_config?.sumup?.mode || 'live'}
                            onValueChange={v => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                sumup: {
                                  ...(newCompanyForm.payment_config?.sumup || {}),
                                  mode: v,
                                }
                              }
                            })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="live">🟢 Live (transazioni reali)</SelectItem>
                              <SelectItem value="test">🟡 Test (sandbox)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Merchant Code (auto-rilevato)</Label>
                          <Input
                            readOnly
                            placeholder="Sarà rilevato dalla chiave"
                            value={newCompanyForm.payment_config?.sumup?.merchant_code || ''}
                            className="bg-muted text-sm font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Online Payment - Stripe diretto sulla Company */}
                  <div className="rounded-lg border p-3 bg-violet-50/50">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="enable_stripe"
                        checked={!!newCompanyForm.payment_config?.stripe?.enabled}
                        onChange={e => setNewCompanyForm({
                          ...newCompanyForm,
                          payment_config: {
                            ...(newCompanyForm.payment_config || {}),
                            stripe: {
                              ...(newCompanyForm.payment_config?.stripe || {}),
                              enabled: e.target.checked,
                            },
                          },
                        })}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <Label htmlFor="enable_stripe" className="font-semibold cursor-pointer">💜 Stripe Checkout (Carta + Apple/Google Pay)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pagamenti online tramite Stripe Checkout. Supporta carte di credito, Apple Pay e Google Pay automaticamente.
                        </p>
                      </div>
                    </div>

                    {newCompanyForm.payment_config?.stripe?.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-7">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs flex items-center gap-1">
                            🔑 Stripe Secret Key (sk_test_* o sk_live_*) *
                            {newCompanyForm.payment_config?.stripe?.secret_key && (
                              <Badge variant="secondary" className="text-[10px] ml-2">
                                {newCompanyForm.payment_config.stripe.secret_key.startsWith('sk_test_') ? '🟡 TEST' : '🟢 LIVE'}
                              </Badge>
                            )}
                          </Label>
                          <Input
                            type="password"
                            placeholder="sk_test_..."
                            value={newCompanyForm.payment_config?.stripe?.secret_key || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                stripe: {
                                  ...(newCompanyForm.payment_config?.stripe || {}),
                                  enabled: true,
                                  secret_key: e.target.value.trim(),
                                },
                              },
                            })}
                          />
                          <p className="text-[11px] text-muted-foreground">Trova la chiave segreta in: <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-violet-600 underline">dashboard.stripe.com/apikeys</a></p>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">🌐 Stripe Publishable Key (pk_test_* / pk_live_*)</Label>
                          <Input
                            type="text"
                            placeholder="pk_test_..."
                            value={newCompanyForm.payment_config?.stripe?.publishable_key || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                stripe: {
                                  ...(newCompanyForm.payment_config?.stripe || {}),
                                  publishable_key: e.target.value.trim(),
                                },
                              },
                            })}
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">🔐 Webhook Secret (opzionale - whsec_*)</Label>
                          <Input
                            type="password"
                            placeholder="whsec_... (per validare i webhook)"
                            value={newCompanyForm.payment_config?.stripe?.webhook_secret || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                stripe: {
                                  ...(newCompanyForm.payment_config?.stripe || {}),
                                  webhook_secret: e.target.value.trim(),
                                },
                              },
                            })}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Configura un webhook su Stripe verso: <code className="text-[10px] bg-muted px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook?company_id={newCompanyForm.id || '<COMPANY_ID>'}</code> ed evento <strong>checkout.session.completed</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bonifico Istantaneo */}
                  <div className="rounded-lg border p-3 bg-emerald-50/50">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="enable_bank_transfer"
                        checked={!!newCompanyForm.payment_config?.enable_bank_transfer}
                        onChange={e => setNewCompanyForm({
                          ...newCompanyForm,
                          payment_config: {
                            ...(newCompanyForm.payment_config || {}),
                            enable_bank_transfer: e.target.checked,
                            bank_transfer: newCompanyForm.payment_config?.bank_transfer || {},
                          }
                        })}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <Label htmlFor="enable_bank_transfer" className="font-semibold cursor-pointer">🏦 Bonifico Istantaneo</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Il cliente vede le coordinate IBAN, effettua il bonifico e carica la ricevuta. La prenotazione resta in <strong>PENDING</strong> finché la società non conferma.
                        </p>
                      </div>
                    </div>

                    {newCompanyForm.payment_config?.enable_bank_transfer && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-7">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">IBAN *</Label>
                          <Input
                            placeholder="IT60X0542811101000000123456"
                            value={newCompanyForm.payment_config?.bank_transfer?.iban || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                bank_transfer: {
                                  ...(newCompanyForm.payment_config?.bank_transfer || {}),
                                  iban: e.target.value.toUpperCase().replace(/\s/g, ''),
                                }
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Intestatario</Label>
                          <Input
                            placeholder="MARLIN SUB SRL"
                            value={newCompanyForm.payment_config?.bank_transfer?.account_holder || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                bank_transfer: {
                                  ...(newCompanyForm.payment_config?.bank_transfer || {}),
                                  account_holder: e.target.value,
                                }
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nome Banca</Label>
                          <Input
                            placeholder="Banca Intesa Sanpaolo"
                            value={newCompanyForm.payment_config?.bank_transfer?.bank_name || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                bank_transfer: {
                                  ...(newCompanyForm.payment_config?.bank_transfer || {}),
                                  bank_name: e.target.value,
                                }
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">BIC / SWIFT</Label>
                          <Input
                            placeholder="BCITITMM"
                            value={newCompanyForm.payment_config?.bank_transfer?.bic_swift || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                bank_transfer: {
                                  ...(newCompanyForm.payment_config?.bank_transfer || {}),
                                  bic_swift: e.target.value.toUpperCase(),
                                }
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">Istruzioni per il cliente</Label>
                          <Textarea
                            rows={2}
                            placeholder="Indica nella causale 'Prenotazione [Booking Ref]' e carica la ricevuta..."
                            value={newCompanyForm.payment_config?.bank_transfer?.instructions || ''}
                            onChange={e => setNewCompanyForm({
                              ...newCompanyForm,
                              payment_config: {
                                ...(newCompanyForm.payment_config || {}),
                                bank_transfer: {
                                  ...(newCompanyForm.payment_config?.bank_transfer || {}),
                                  instructions: e.target.value,
                                }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* Branding */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Branding</h3>
                  
                  <div className="space-y-2">
                    <ImageUploader 
                      images={newCompanyForm.logo_url ? [newCompanyForm.logo_url] : []}
                      onChange={(urls) => setNewCompanyForm({...newCompanyForm, logo_url: urls[0] || ''})}
                      maxImages={1}
                    />
                    <p className="text-xs text-muted-foreground">Carica il logo della società (1 immagine)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hero Images (Immagini Homepage)</Label>
                    <ImageUploader 
                      images={newCompanyForm.hero_images || []}
                      onChange={(urls) => setNewCompanyForm({...newCompanyForm, hero_images: urls, hero_image: urls[0] || ''})}
                      maxImages={3}
                    />
                    <p className="text-xs text-muted-foreground">Carica fino a 3 immagini per la homepage (la prima sarà quella principale)</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Colore Primario</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          value={newCompanyForm.primary_color || '#0066CC'}
                          onChange={e => setNewCompanyForm({...newCompanyForm, primary_color: e.target.value})}
                          className="w-16"
                        />
                        <Input 
                          value={newCompanyForm.primary_color || '#0066CC'}
                          onChange={e => setNewCompanyForm({...newCompanyForm, primary_color: e.target.value})}
                          placeholder="#0066CC"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Colore Secondario</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          value={newCompanyForm.secondary_color || '#FF6B35'}
                          onChange={e => setNewCompanyForm({...newCompanyForm, secondary_color: e.target.value})}
                          className="w-16"
                        />
                        <Input 
                          value={newCompanyForm.secondary_color || '#FF6B35'}
                          onChange={e => setNewCompanyForm({...newCompanyForm, secondary_color: e.target.value})}
                          placeholder="#FF6B35"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Piano e Limiti */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Piano</Label>
                    <Select 
                      value={newCompanyForm.subscription_plan || 'STANDARD'}
                      onValueChange={v => setNewCompanyForm({...newCompanyForm, subscription_plan: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">FREE</SelectItem>
                        <SelectItem value="STANDARD">STANDARD</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Esperienze</Label>
                    <Input 
                      type="number"
                      value={newCompanyForm.max_experiences || 50}
                      onChange={e => setNewCompanyForm({...newCompanyForm, max_experiences: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Risorse</Label>
                    <Input 
                      type="number"
                      value={newCompanyForm.max_resources || 20}
                      onChange={e => setNewCompanyForm({...newCompanyForm, max_resources: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
                  Annulla
                </Button>
                <Button onClick={createCompany}>
                  <Building2 className="w-4 h-4 mr-2" />
                  {newCompanyForm.id ? 'Salva Modifiche' : 'Crea Società'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>



          {/* Dialog Gestione Utenti Società */}
          <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Gestione Utenti - {selectedCompany?.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Crea e gestisci gli utenti Company Admin per questa società
                  </p>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setUserForm({ email: '', password: '', username: '' });
                      setShowUserForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Utente
                  </Button>
                </div>
                
                {companyUsers.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground mb-2">Nessun utente configurato</p>
                    <p className="text-xs text-muted-foreground">Crea il primo utente Company Admin</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {companyUsers.map(user => (
                      <Card key={user.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{user.username || user.email}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {(() => {
                                  const roleMap = {
                                    'SUPER_ADMIN':   { label: 'SUPER ADMIN',   cls: 'bg-purple-600 text-white' },
                                    'COMPANY_ADMIN': { label: 'COMPANY ADMIN', cls: 'bg-blue-600 text-white' },
                                    'SKIPPER':       { label: 'SKIPPER',       cls: 'bg-emerald-600 text-white' },
                                    'STAFF':         { label: 'STAFF',         cls: 'bg-amber-600 text-white' },
                                  };
                                  const r = roleMap[user.role] || { label: user.role || 'UTENTE', cls: 'bg-slate-600 text-white' };
                                  return <Badge className={`text-xs ${r.cls}`}>{r.label}</Badge>;
                                })()}
                                {user.is_active ? (
                                  <Badge className="text-xs bg-green-100 text-green-800">Attivo</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Disattivato</Badge>
                                )}
                                {user.full_name && (
                                  <span className="text-xs text-slate-600">· {user.full_name}</span>
                                )}
                                {user.role === 'SKIPPER' && Array.isArray(user.assigned_resource_ids) && user.assigned_resource_ids.length > 0 && (
                                  <Badge variant="outline" className="text-xs bg-emerald-50">
                                    🛥️ {user.assigned_resource_ids.length} risors{user.assigned_resource_ids.length === 1 ? 'a' : 'e'}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Creato: {new Date(user.created_at).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setUserForm(user);
                                  setShowUserForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => deleteUser(user.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Form Creazione/Modifica Utente */}
                {showUserForm && (
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {userForm.id ? 'Modifica Utente' : 'Nuovo Utente'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input 
                            type="email"
                            placeholder="admin@company.com"
                            value={userForm.email || ''}
                            onChange={e => setUserForm({...userForm, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input 
                            placeholder="Admin_Company"
                            value={userForm.username || ''}
                            onChange={e => setUserForm({...userForm, username: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Password {!userForm.id && <span className="text-red-500">*</span>}</Label>
                        <div className="relative">
                          <Input 
                            type={userForm._show_password ? 'text' : 'password'}
                            placeholder={userForm.id ? "Lascia vuoto per non modificare" : "Password123!"}
                            value={userForm.password || ''}
                            onChange={e => setUserForm({...userForm, password: e.target.value})}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setUserForm({...userForm, _show_password: !userForm._show_password})}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                            title={userForm._show_password ? 'Nascondi' : 'Mostra'}
                          >
                            {userForm._show_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Minimo 8 caratteri, almeno una maiuscola, un numero e un carattere speciale
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Ruolo *</Label>
                        <select
                          value={userForm.role || 'COMPANY_ADMIN'}
                          onChange={e => setUserForm({...userForm, role: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="COMPANY_ADMIN">Company Admin</option>
                          <option value="SKIPPER">Skipper</option>
                          <option value="STAFF">Staff</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome completo</Label>
                          <Input
                            value={userForm.full_name || ''}
                            onChange={e => setUserForm({...userForm, full_name: e.target.value})}
                            placeholder="Mario Rossi"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefono</Label>
                          <Input
                            value={userForm.phone || ''}
                            onChange={e => setUserForm({...userForm, phone: e.target.value})}
                            placeholder="+39 ..."
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id="is_active"
                          checked={userForm.is_active !== false}
                          onChange={e => setUserForm({...userForm, is_active: e.target.checked})}
                          className="rounded"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">Utente attivo</Label>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowUserForm(false);
                            setUserForm({});
                          }}
                        >
                          Annulla
                        </Button>
                        <Button onClick={createOrUpdateUser}>
                          <User className="w-4 h-4 mr-2" />
                          {userForm.id ? 'Salva Modifiche' : 'Crea Utente'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>


        </TabsContent>

        {/* Super Admin / Owner Marina: Marine */}
        {hasMarinaOwnership && (
          <TabsContent value="marinas" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Anchor className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <MarinasManagerLazy />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Owner Marina: Posti Barca */}
        {hasMarinaOwnership && (
          <TabsContent value="berths" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Ship className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <BerthsManagerLazy marinaFilterId={globalMarinaFilter} />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Owner Marina: Preventivi */}
        {hasMarinaOwnership && (
          <TabsContent value="quotes" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><ClipboardList className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <QuotesManagerLazy marinaFilterId={globalMarinaFilter} />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Owner Marina: Transiti */}
        {hasMarinaOwnership && (
          <TabsContent value="transits" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Ship className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <TransitsManagerLazy marinaFilterId={globalMarinaFilter} />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Owner Marina: REGISTRO CONTRATTI (Step 4) */}
        {hasMarinaOwnership && (
          <TabsContent value="contracts-registry" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><FileSignature className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <ContractsRegistryLazy currentUser={currentUser} marinaFilterId={globalMarinaFilter} />
            </Suspense>
          </TabsContent>
        )}

        {/* Registro Contabilità - per company admin / super admin / owner marina */}
        {(hasMarinaOwnership || currentUser?.company_id) && (
          <TabsContent value="accounting" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Wallet className="w-8 h-8 mx-auto animate-pulse text-emerald-600" /></div>}>
              <AccountingRegistryLazy
                companyId={isSuperAdmin ? null : currentUser?.company_id}
                companies={companies}
                marinas={ownedMarinas || []}
              />
            </Suspense>
          </TabsContent>
        )}

        {/* Registro Trasportati - vista admin con filtri data/risorsa/esperienza */}
        {(hasMarinaOwnership || currentUser?.company_id) && (
          <TabsContent value="transport-logs" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><FileText className="w-8 h-8 mx-auto animate-pulse text-blue-600" /></div>}>
              <TransportLogsRegistryLazy
                companyId={isSuperAdmin ? null : currentUser?.company_id}
                companies={companies}
              />
            </Suspense>
          </TabsContent>
        )}

        {/* Procedura Rimborsi - Company Admin + Super Admin */}
        {(currentUser?.company_id || isSuperAdmin) && (
          <TabsContent value="refunds" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Banknote className="w-8 h-8 mx-auto animate-pulse text-rose-600" /></div>}>
              <RefundsManagementLazy
                companyId={isSuperAdmin ? null : currentUser?.company_id}
                isSuperAdmin={isSuperAdmin}
                currentUser={currentUser}
              />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin: Impostazioni Porto */}
        {isSuperAdmin && (
          <TabsContent value="port-settings" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Shield className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <PortSettingsManagerLazy />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Marlin Sub: Cantiere */}
        {isMarlinSub && (
          <TabsContent value="cantiere" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Wrench className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <CantiereAdminLazy currentUser={currentUser} />
            </Suspense>
          </TabsContent>
        )}

        {/* MAGAZZINO - tutti gli utenti company */}
        {currentUser?.company_id && (
          <TabsContent value="magazzino" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Package className="w-8 h-8 mx-auto animate-pulse text-rose-600" /></div>}>
              <WarehouseAdminLazy
                companyId={currentUser.company_id}
                companyName={currentUser.company_name || companies?.find(c => c.id === currentUser.company_id)?.name || ''}
                resources={resources || []}
                currentUser={currentUser}
              />
            </Suspense>
          </TabsContent>
        )}

        {/* LOCAZIONI BREVI - tutti gli utenti company + Super Admin */}
        {(currentUser?.company_id || isSuperAdmin) && (
          <TabsContent value="locazioni" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Home className="w-8 h-8 mx-auto animate-pulse text-teal-600" /></div>}>
              <LocazioniBreviAdminLazy currentUser={currentUser} isSuperAdmin={isSuperAdmin} />
            </Suspense>
          </TabsContent>
        )}

        {/* Super Admin / Owner Marine: Richieste Prenotazione */}
        {hasMarinaOwnership && (
          <TabsContent value="marina-bookings" className="space-y-4">
            <Suspense fallback={<div className="text-center py-8"><Ship className="w-8 h-8 mx-auto animate-pulse" /></div>}>
              <MarinaBookingsLazy currentUser={currentUser} marinaFilterId={globalMarinaFilter} />
            </Suspense>
          </TabsContent>
        )}

      </Tabs>

      {/* Nuovo Preventivo Posto Barca - Admin Dialog */}
      {showNewQuoteDialog && (
        <Suspense fallback={null}>
          <NewQuoteDialogLazy
            open={showNewQuoteDialog}
            onClose={() => setShowNewQuoteDialog(false)}
            currentUser={currentUser}
            onCreated={() => { /* il preventivo è già visibile nel tab Preventivi */ }}
          />
        </Suspense>
      )}

      {/* Nuova Prenotazione Esperienza - Admin Dialog */}
      {showNewBookingDialog && (
        <Suspense fallback={null}>
          <NewBookingDialogLazy
            open={showNewBookingDialog}
            onClose={() => setShowNewBookingDialog(false)}
            currentUser={currentUser}
            onCreated={() => { load(); }}
          />
        </Suspense>
      )}

      {/* Create Dialogs */}
      <Dialog open={showDialog==='experience'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label>{(() => {
              const stdSet = new Set(Object.keys(TYPE_LABELS));
              const customMap = new globalThis.Map();
              (experiences || []).forEach(e => {
                if (e?.type && !stdSet.has(e.type) && !customMap.has(e.type)) {
                  customMap.set(e.type, { value: e.type, label: '⚙️ ' + e.type.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) });
                }
              });
              return (
                <Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>{
                  if (v === '__custom__') {
                    const customLabel = prompt('Inserisci il nome della nuova tipologia esperienza (es: "Tour Enogastronomico"):');
                    if (customLabel && customLabel.trim()) {
                      const slug = customLabel.trim().toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'');
                      if (slug) setFormData({...formData, type: slug});
                    }
                  } else {
                    setFormData({...formData, type: v});
                  }
                }}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    {[...customMap.values()].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    <SelectItem value="__custom__" className="text-blue-600 font-semibold border-t mt-1 pt-2">
                      ➕ Aggiungi tipologia personalizzata...
                    </SelectItem>
                  </SelectContent>
                </Select>
              );
            })()}
            {formData.type && !Object.keys(TYPE_LABELS).includes(formData.type) && (
              <p className="text-xs text-blue-600 mt-1">
                Tipologia personalizzata: <code className="bg-blue-50 px-1 rounded">{formData.type}</code>
              </p>
            )}
            </div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata (min)</Label><Input type="number" value={formData.duration_minutes||''} onChange={e=>setFormData({...formData,duration_minutes:e.target.value})}/></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
              <Label className="flex items-center gap-2 mb-2">⭐ Priorità Vetrina Home <span className="text-[11px] text-muted-foreground font-normal">(0 = automatico per prezzo, 1-8 = slot fisso in vetrina)</span></Label>
              <Select value={String(formData.home_priority||0)} onValueChange={v=>setFormData({...formData,home_priority:Number(v)})}>
                <SelectTrigger className="bg-white max-w-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">🔁 Automatico (ordinato per prezzo)</SelectItem>
                  <SelectItem value="1">🥇 Slot 1 (in cima)</SelectItem>
                  <SelectItem value="2">🥈 Slot 2</SelectItem>
                  <SelectItem value="3">🥉 Slot 3</SelectItem>
                  <SelectItem value="4">🏅 Slot 4</SelectItem>
                  <SelectItem value="5">🏅 Slot 5</SelectItem>
                  <SelectItem value="6">🏅 Slot 6</SelectItem>
                  <SelectItem value="7">🏅 Slot 7</SelectItem>
                  <SelectItem value="8">🏅 Slot 8</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-amber-700 mt-1.5">L'home page mostra fino a 8 esperienze prioritarie nei rispettivi slot. Le altre seguono ordinate per prezzo decrescente.</p>
            </div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            <div>
              <Label className="flex items-center gap-1">📍 Link Google Maps <span className="text-xs text-muted-foreground font-normal">(opzionale)</span></Label>
              <Input
                type="url"
                placeholder="https://maps.app.goo.gl/xyz oppure https://maps.google.com/?q=40.30,9.20"
                value={formData.meeting_point_map_url || ''}
                onChange={e => setFormData({...formData, meeting_point_map_url: e.target.value.trim()})}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                💡 Apri Google Maps → trova il punto → tasto destro o "Condividi" → copia il link e incollalo qui. Sarà incluso nel voucher email del cliente.
              </p>
              {formData.meeting_point_map_url && (
                <a href={formData.meeting_point_map_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
                  🔗 Verifica link →
                </a>
              )}
            </div>
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">📝 Condizioni di Rimborso</Label>
              <Textarea
                placeholder="Es: Rimborso 100% fino a 48h prima. 50% fino a 24h. Nessun rimborso oltre."
                value={formData.refund_conditions||''}
                onChange={e=>setFormData({...formData,refund_conditions:e.target.value})}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Saranno mostrate al cliente in fase di prenotazione e nel voucher.</p>
            </div>
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
            <div><Label>Tipo</Label>{(() => {
              const stdSet = new Set(Object.keys(TYPE_LABELS));
              const customMap = new globalThis.Map();
              (experiences || []).forEach(e => {
                if (e?.type && !stdSet.has(e.type) && !customMap.has(e.type)) {
                  customMap.set(e.type, { value: e.type, label: '⚙️ ' + e.type.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) });
                }
              });
              return (
                <Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>{
                  if (v === '__custom__') {
                    const customLabel = prompt('Inserisci il nome della nuova tipologia esperienza (es: "Tour Enogastronomico"):');
                    if (customLabel && customLabel.trim()) {
                      const slug = customLabel.trim().toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'');
                      if (slug) setFormData({...formData, type: slug});
                    }
                  } else {
                    setFormData({...formData, type: v});
                  }
                }}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    {[...customMap.values()].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    <SelectItem value="__custom__" className="text-blue-600 font-semibold border-t mt-1 pt-2">
                      ➕ Aggiungi tipologia personalizzata...
                    </SelectItem>
                  </SelectContent>
                </Select>
              );
            })()}
            {formData.type && !Object.keys(TYPE_LABELS).includes(formData.type) && (
              <p className="text-xs text-blue-600 mt-1">
                Tipologia personalizzata: <code className="bg-blue-50 px-1 rounded">{formData.type}</code>
              </p>
            )}
            </div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata</Label><div className="flex gap-1.5 items-center"><Input type="number" min="0" placeholder="Ore" value={Math.floor((formData.duration_minutes||0)/60)||''} onChange={e=>{const h=parseInt(e.target.value)||0;const m=(formData.duration_minutes||0)%60;const tot=h*60+m;setFormData({...formData,duration_hours:h,duration_minutes:tot});}} className="w-20"/><span className="text-xs text-muted-foreground">h</span><Input type="number" min="0" max="59" step="5" placeholder="Minuti" value={(formData.duration_minutes||0)%60||''} onChange={e=>{const m=Math.max(0,Math.min(59,parseInt(e.target.value)||0));const h=Math.floor((formData.duration_minutes||0)/60);const tot=h*60+m;setFormData({...formData,duration_hours:h,duration_minutes:tot});}} className="w-20"/><span className="text-xs text-muted-foreground">min</span></div><p className="text-[11px] text-muted-foreground mt-1">es. 0h 40min · 1h 30min · 3h 0min</p></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
              <Label className="flex items-center gap-2 mb-2">⭐ Priorità Vetrina Home <span className="text-[11px] text-muted-foreground font-normal">(0 = automatico per prezzo, 1-8 = slot fisso in vetrina)</span></Label>
              <Select value={String(formData.home_priority||0)} onValueChange={v=>setFormData({...formData,home_priority:Number(v)})}>
                <SelectTrigger className="bg-white max-w-xs"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">🔁 Automatico (ordinato per prezzo)</SelectItem>
                  <SelectItem value="1">🥇 Slot 1 (in cima)</SelectItem>
                  <SelectItem value="2">🥈 Slot 2</SelectItem>
                  <SelectItem value="3">🥉 Slot 3</SelectItem>
                  <SelectItem value="4">🏅 Slot 4</SelectItem>
                  <SelectItem value="5">🏅 Slot 5</SelectItem>
                  <SelectItem value="6">🏅 Slot 6</SelectItem>
                  <SelectItem value="7">🏅 Slot 7</SelectItem>
                  <SelectItem value="8">🏅 Slot 8</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-amber-700 mt-1.5">L'home page mostra fino a 8 esperienze prioritarie nei rispettivi slot. Le altre seguono ordinate per prezzo decrescente.</p>
            </div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            <div>
              <Label className="flex items-center gap-1">📍 Link Google Maps <span className="text-xs text-muted-foreground font-normal">(opzionale)</span></Label>
              <Input
                type="url"
                placeholder="https://maps.app.goo.gl/xyz oppure https://maps.google.com/?q=40.30,9.20"
                value={formData.meeting_point_map_url || ''}
                onChange={e => setFormData({...formData, meeting_point_map_url: e.target.value.trim()})}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                💡 Apri Google Maps → trova il punto → "Condividi" → copia il link e incollalo qui. Sarà incluso nel voucher email del cliente.
              </p>
              {formData.meeting_point_map_url && (
                <a href={formData.meeting_point_map_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
                  🔗 Verifica link →
                </a>
              )}
            </div>
            
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">📝 Condizioni di Rimborso</Label>
              <Textarea
                placeholder="Es: Rimborso 100% fino a 48h prima. 50% fino a 24h. Nessun rimborso oltre."
                value={formData.refund_conditions||''}
                onChange={e=>setFormData({...formData,refund_conditions:e.target.value})}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Saranno mostrate al cliente in fase di prenotazione e nel voucher.</p>
            </div>
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
            {(() => {
              const STANDARD_TYPES = [
                { value: 'GUIDE', label: '👤 Guida' },
                { value: 'BOAT', label: '⛵ Imbarcazione' },
                { value: 'AUTO_TRANSFER', label: '🚗 Auto per Transfer' },
                { value: 'VAN_TRANSFER', label: '🚐 Van per Transfer' },
                { value: 'MINIBUS', label: '🚌 Minibus' },
                { value: 'SUP', label: '🏄 Tavola Sup' },
                { value: 'CANOA', label: '🛶 Canoa' },
                { value: 'GOMMONE_NOLEGGIO', label: '🚤 Gommone Noleggio' },
                { value: 'STANZA', label: '🛏️ Stanza' },
                { value: 'APPARTAMENTO', label: '🏠 Appartamento' },
                { value: 'VILLA', label: '🏡 Villa' },
                { value: 'POSTO_EVENTO', label: '🎪 Posto Evento' },
                { value: 'POSTO_MANIFESTAZIONE', label: '🎉 Posto Manifestazione' },
              ];
              const stdSet = new Set(STANDARD_TYPES.map(t => t.value));
              const customMap = new globalThis.Map();
              (resources || []).forEach(r => {
                if (r?.type && !stdSet.has(r.type) && !customMap.has(r.type)) {
                  customMap.set(r.type, { value: r.type, label: '⚙️ ' + r.type.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) });
                }
              });
              const allTypes = [...STANDARD_TYPES, ...customMap.values()];
              return (
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.type||'GUIDE'} onValueChange={v=>{
                    if (v === '__custom__') {
                      const customLabel = prompt('Inserisci il nome della nuova tipologia (es: "Bici Elettrica"):');
                      if (customLabel && customLabel.trim()) {
                        const slug = customLabel.trim().toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'');
                        if (slug) setFormData({...formData, type: slug});
                      }
                    } else {
                      setFormData({...formData, type: v});
                    }
                  }}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {allTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      <SelectItem value="__custom__" className="text-blue-600 font-semibold border-t mt-1 pt-2">
                        ➕ Aggiungi tipologia personalizzata...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.type && !stdSet.has(formData.type) && (
                    <p className="text-xs text-blue-600 mt-1">
                      Tipologia personalizzata: <code className="bg-blue-50 px-1 rounded">{formData.type}</code>
                    </p>
                  )}
                </div>
              );
            })()}
            {/* Mostra Capacità (posti) per tipologie pertinenti */}
            {['SUP','CANOA','GOMMONE_NOLEGGIO','STANZA','APPARTAMENTO','VILLA','POSTO_EVENTO','POSTO_MANIFESTAZIONE'].includes(formData.type) && (
              <div>
                <Label>Capacità (posti)</Label>
                <Input type="number" value={formData.capacity||''} onChange={e=>setFormData({...formData,capacity:e.target.value})} placeholder="Es: 4"/>
              </div>
            )}
            {formData.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={formData.boat_type||'GOMMONE'} onValueChange={v=>setFormData({...formData,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem><SelectItem value="AUTO_TRANSFER">🚗 Auto per Transfer</SelectItem><SelectItem value="VAN_TRANSFER">🚐 Van per Transfer</SelectItem><SelectItem value="MINIBUS">🚌 Minibus</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti)</Label><Input type="number" value={formData.capacity||''} onChange={e=>setFormData({...formData,capacity:e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={formData.marca||''} onChange={e=>setFormData({...formData,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={formData.potenza_motore||''} onChange={e=>setFormData({...formData,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={formData.consumo_orario_litri||''} onChange={e=>setFormData({...formData,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={formData.ore_inizio_stagione||''} onChange={e=>setFormData({...formData,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={formData.gps_imei||''} onChange={e=>setFormData({...formData,gps_imei:e.target.value})} placeholder="359633109558000"/></div></>}
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
            
            <Button className="w-full" disabled={formData._generating} onClick={async ()=>{
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
              
              // Calcola totale giorni per progress bar
              const oneDay = 24 * 60 * 60 * 1000;
              const totalDays = Math.round((endDate - startDate) / oneDay) + 1;
              
              let created = 0;
              let currentDate = new Date(startDate);
              setFormData(prev => ({ ...prev, _generating: true, _progress: 0, _total_days: totalDays }));
              const toastId = toast.loading(`Generazione slot in corso... 0/${totalDays}`);
              
              try {
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
                  
                  if (priceOverride && priceOverride !== experience.price_b2c) {
                    slotData.price_override = priceOverride;
                  }
                  
                  await api('slots', { method: 'POST', body: slotData });
                  created++;
                  // Update progress
                  setFormData(prev => ({ ...prev, _progress: created }));
                  toast.loading(`Generazione slot in corso... ${created}/${totalDays}`, { id: toastId });
                  
                  currentDate.setDate(currentDate.getDate() + 1);
                }
                
                toast.success(`✅ ${created} slot creati con tariffe stagionali applicate!`, { id: toastId });
                setShowDialog(null);
                setFormData({});
                await load();
              } catch (e) {
                toast.error(`Errore generazione slot: ${e.message}`, { id: toastId });
                setFormData(prev => ({ ...prev, _generating: false }));
              }
            }}>
              {formData._generating ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generazione in corso... {formData._progress || 0}/{formData._total_days || 0}</>
              ) : (
                <><CalIcon className="w-4 h-4 mr-2" />Crea Slot Giornalieri Automatici</>
              )}
            </Button>
            
            {/* Progress bar */}
            {formData._generating && formData._total_days > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.round(((formData._progress || 0) / formData._total_days) * 100)}%` }}
                />
              </div>
            )}
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
            {isSuperAdmin && (
              <div>
                <Label>Società</Label>
                <Select value={formData.company_id||''} onValueChange={v=>setFormData({...formData,company_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Seleziona società" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
              <div><Label>Tipo</Label><Select value={editResForm.type||'GUIDE'} onValueChange={v=>setEditResForm({...editResForm,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GUIDE">👤 Guida</SelectItem><SelectItem value="BOAT">⛵ Imbarcazione</SelectItem><SelectItem value="AUTO_TRANSFER">🚗 Auto per Transfer</SelectItem><SelectItem value="VAN_TRANSFER">🚐 Van per Transfer</SelectItem><SelectItem value="MINIBUS">🚌 Minibus</SelectItem><SelectItem value="SUP">🏄 Tavola Sup</SelectItem><SelectItem value="CANOA">🛶 Canoa</SelectItem><SelectItem value="GOMMONE_NOLEGGIO">🚤 Gommone Noleggio</SelectItem><SelectItem value="STANZA">🛏️ Stanza</SelectItem><SelectItem value="APPARTAMENTO">🏠 Appartamento</SelectItem><SelectItem value="VILLA">🏡 Villa</SelectItem><SelectItem value="POSTO_EVENTO">🎪 Posto Evento</SelectItem><SelectItem value="POSTO_MANIFESTAZIONE">🎉 Posto Manifestazione</SelectItem></SelectContent></Select></div>
              {editResForm.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={editResForm.boat_type||'GOMMONE'} onValueChange={v=>setEditResForm({...editResForm,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem><SelectItem value="AUTO_TRANSFER">🚗 Auto per Transfer</SelectItem><SelectItem value="VAN_TRANSFER">🚐 Van per Transfer</SelectItem><SelectItem value="MINIBUS">🚌 Minibus</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti vendibili)</Label><Input type="number" value={editResForm.capacity||''} onChange={e=>setEditResForm({...editResForm,capacity:parseInt(e.target.value)||0})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={editResForm.marca||''} onChange={e=>setEditResForm({...editResForm,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={editResForm.potenza_motore||''} onChange={e=>setEditResForm({...editResForm,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={editResForm.consumo_orario_litri||''} onChange={e=>setEditResForm({...editResForm,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={editResForm.ore_inizio_stagione||''} onChange={e=>setEditResForm({...editResForm,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={editResForm.gps_imei||''} onChange={e=>setEditResForm({...editResForm,gps_imei:e.target.value})} placeholder="359633109558000"/><p className="text-xs text-muted-foreground mt-1">Codice IMEI del dispositivo GPS per tracking real-time</p></div></>}
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
                    <div className="flex gap-1 items-center"><StatusBadge status={b.status}/>{b.status==='CONFIRMED'&&<Button variant="ghost" size="sm" className="text-xs text-red-500 h-7" onClick={()=>cancelBooking(b.id, b.booking_ref)}>Cancella</Button>}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editBk} onOpenChange={() => setEditBk(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editForm.customer_email || ''} onChange={e => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
              <div><Label>Telefono</Label><Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
              <div><Label>Stato</Label><Input value={editBk?.status || ''} disabled className="bg-slate-50" /></div>
            </div>
            <div><Label>Richieste speciali</Label><Textarea value={editForm.special_requests || ''} onChange={e => setEditForm({ ...editForm, special_requests: e.target.value })} /></div>

            {/* === SUPER ADMIN: RIPROGRAMMAZIONE DATA === */}
            {isSuperAdmin && editBk && (
              <SuperAdminReschedulePanel
                booking={editBk}
                onDone={() => {
                  setEditBk(null);
                  if (typeof onRefresh === 'function') onRefresh();
                  else if (typeof load === 'function') load();
                  else window.location.reload();
                }}
              />
            )}

            {/* === RICALCOLO POSTI / PREZZO === */}
            <div className="border-2 border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2 text-blue-900">
                💰 Posti e Prezzo (ricalcolo automatico)
              </Label>
              {(() => {
                const seatsNow = Number(editForm.seats ?? editBk?.seats ?? 0) || 0;
                const unitNow = Number(editForm.unit_price ?? editBk?.b2c_price ?? editBk?.unit_price ?? (editBk?.total_amount && editBk?.seats ? editBk.total_amount/editBk.seats : 0)) || 0;
                const totalNow = Math.round(seatsNow * unitNow * 100) / 100;
                const oldTotal = Number(editBk?.total_amount) || 0;
                const diff = Math.round((totalNow - oldTotal) * 100) / 100;
                return (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-xs">N. Posti</Label>
                      <Input type="number" min="1" value={seatsNow} onChange={e => setEditForm({ ...editForm, seats: Number(e.target.value) || 1 })} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Prezzo Unit. (€)</Label>
                      <Input type="number" min="0" step="0.01" value={unitNow} onChange={e => setEditForm({ ...editForm, unit_price: Number(e.target.value) || 0 })} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Totale Ricalcolato</Label>
                      <div className="h-9 px-3 py-1.5 rounded-md border border-blue-300 bg-white font-bold text-blue-700 text-base">{fmtPrice(totalNow)}</div>
                    </div>
                    <div className="col-span-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Importo precedente: <strong>{fmtPrice(oldTotal)}</strong></span>
                      {diff !== 0 && (
                        <span className={diff > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>{diff > 0 ? '↑ +' : '↓ '}{fmtPrice(Math.abs(diff))}</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {editBk && editBk.seats > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Assegnazione Posti ({Number(editForm.seats ?? editBk.seats)} {Number(editForm.seats ?? editBk.seats) === 1 ? 'posto' : 'posti'})
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: Number(editForm.seats ?? editBk.seats) }).map((_, idx) => (
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
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveBookingEdit}>💾 Salva e Ricalcola</Button>
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
// ============ B2B COMPANY SELECTOR ============
function B2BCompanySelector() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch('/api/companies');
        const data = await res.json();
        // Escludi company sospese (is_active=false) dal portale B2B pubblico
        const visible = Array.isArray(data) ? data.filter(c => c.is_active !== false) : [];
        setCompanies(visible);
      } catch (err) {
        console.error('Error loading companies:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCompanies();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Portale B2B Agenzie</h1>
          <p className="text-lg text-muted-foreground">
            Seleziona la società per accedere al portale B2B dedicato
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map(company => (
            <Card 
              key={company.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => window.location.href = `/${company.slug}/b2b`}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  {company.logo_url && (
                    <img 
                      src={company.logo_url} 
                      alt={company.name} 
                      className="w-16 h-16 object-contain rounded"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {company.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Accedi al portale B2B
                    </CardDescription>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>/{company.slug}/b2b</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nessuna società disponibile</p>
          </div>
        )}

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-5 h-5" />
            Sei un'agenzia?
          </h3>
          <p className="text-sm text-blue-800">
            Clicca sulla società di riferimento per accedere al portale B2B dedicato con le tue credenziali agenzia.
          </p>
        </div>
      </div>
    </div>
  );
}

import LoginScreen from '@/components/auth/LoginScreen';

// ============ MAIN APP ============
export default function App() {
  const [view, setView] = useState('home');
  const [experiences, setExperiences] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [rentalUnits, setRentalUnits] = useState([]); // Public-visible rental units
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedRentalUnit, setSelectedRentalUnit] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Autenticazione
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Branding dinamico
  const [companyBrand, setCompanyBrand] = useState(null);
  const [brandedMode, setBrandedMode] = useState(false);

  // Verifica sessione esistente al mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedUser = localStorage.getItem('user');
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (savedUser && sessionToken) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Ripristina il branding per Company Admin
        if (user.role === 'COMPANY_ADMIN' && user.company_id) {
          fetch(`/api/companies/${user.company_id}`)
            .then(r => r.json())
            .then(cd => {
              if (cd && cd.id) {
                setCompanyBrand(cd);
                setBrandedMode(true);
                applyCompanyBranding(cd);
              }
            })
            .catch(() => {});
        }
      } catch (error) {
        console.error('Errore parsing sessione:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('sessionToken');
      }
    }
  }, []);

  // Carica companies, experiences e rental units pubblici all'avvio
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [companiesRes, experiencesRes, rentalsRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/experiences'),
          fetch('/api/rental-units?public=true'),
        ]);
        
        const companiesData = await companiesRes.json();
        const experiencesData = await experiencesRes.json();
        const rentalsData = await rentalsRes.json();
        
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setExperiences(Array.isArray(experiencesData) ? experiencesData : []);
        setRentalUnits(Array.isArray(rentalsData) ? rentalsData : []);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };
    
    loadInitialData();
  }, []);

  // Prefetch passivo della route /posti-barca in background per velocizzare il primo accesso
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        // Fetch della pagina per scaldare cache Next.js (non blocca rendering)
        fetch('/posti-barca', { method: 'GET', cache: 'force-cache' }).catch(() => {});
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Se è un Company Admin, carica i dati della società per il branding
    if (user.role === 'COMPANY_ADMIN' && user.company_id) {
      try {
        const companyRes = await fetch(`/api/companies/${user.company_id}`);
        const companyData = await companyRes.json();
        
        if (companyData && companyData.id) {
          setCompanyBrand(companyData);
          setBrandedMode(true);
          applyCompanyBranding(companyData);
          
          // Carica anche le esperienze della società
          const expsRes = await fetch(`/api/experiences?company_id=${user.company_id}`);
          const expsData = await expsRes.json();
          setExperiences(Array.isArray(expsData) ? expsData : []);
        }
      } catch (err) {
        console.error('Error loading company brand:', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCompanyBrand(null);
    setBrandedMode(false);
    resetCompanyBranding();
    setView('home');
    toast.success('Logout effettuato');
  };

  // Carica company branding se presente in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const companyId = params.get('company_id');
    const isBranded = params.get('branded') === 'true';
    
    if (companyId && isBranded) {
      setBrandedMode(true);
      api(`companies/${companyId}`).then(company => {
        if (company && !company.error) {
          setCompanyBrand(company);
          applyCompanyBranding(company);
        }
      }).catch(err => console.error('Errore caricamento branding:', err));
    }
  }, []);

  useEffect(() => {
    // Filtra experiences per company se in modalità branded
    const filter = brandedMode && companyBrand ? `?company_id=${companyBrand.id}` : '';
    api(`experiences${filter}`).then(data => { 
      if (Array.isArray(data)) setExperiences(data); 
    }).catch(() => {});
  }, [view, brandedMode, companyBrand]);

  const navigate = (newView, data = {}) => {
    if (data.experience) setSelectedExperience(data.experience);
    if (data.slot) setSelectedSlot(data.slot);
    if (data.rentalUnit) setSelectedRentalUnit(data.rentalUnit);
    setView(newView);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar 
          view={view} 
          setView={navigate} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen}
          companyBrand={companyBrand}
          currentUser={currentUser}
        />
        <main className="flex-1">
          {view === 'home' && <HomePage setView={navigate} experiences={experiences} rentalUnits={rentalUnits} companies={companies} companyBrand={companyBrand} currentUser={currentUser} />}
          {view === 'catalog' && <CatalogPage setView={navigate} experiences={experiences} currentUser={currentUser} companies={companies} companyBrand={companyBrand} />}
          {view === 'rentals' && <Suspense fallback={<div className="text-center py-16"><Home className="w-8 h-8 mx-auto animate-pulse text-teal-600" /></div>}><RentalsCatalogPageLazy setView={navigate} rentalUnits={rentalUnits} companies={companies} companyBrand={companyBrand} /></Suspense>}
          {view === 'rental-detail' && <Suspense fallback={<div className="text-center py-16"><Home className="w-8 h-8 mx-auto animate-pulse text-teal-600" /></div>}><RentalDetailPageLazy unit={selectedRentalUnit} setView={navigate} /></Suspense>}
          {view === 'detail' && <ExperienceDetail experience={selectedExperience} setView={navigate} />}
          {view === 'booking' && <BookingWizard experience={selectedExperience} slot={selectedSlot} setView={navigate} />}
          {view === 'admin' && (
            isAuthenticated ? (
              <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )
          )}
          {view === 'b2b' && (
            <B2BCompanySelector />
          )}
        </main>
        <Footer companyBrand={companyBrand} currentUser={currentUser} />
      </div>
    </LanguageProvider>
  );
}

