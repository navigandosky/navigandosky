'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Anchor, ArrowLeft, MapPin, Ship, Sailboat, AlertCircle, Clock, RefreshCw, Lock, Unlock,
  Upload, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, Maximize2, CreditCard,
  Users, Mail, Phone, FileText, Calendar as CalIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/app/lib/safeFetch';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

export default function MarinaMapPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [marina, setMarina] = useState(null);
  const [berths, setBerths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedBerth, setSelectedBerth] = useState(null);
  const [showOccupy, setShowOccupy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Filtro/ricerca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');  // all | free | standby | releasing | occupied | contract | transit | no_contract
  // Filtro DATA: mostra solo i posti occupati alla data selezionata (default = oggi)
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Auth check: SUPER_ADMIN o COMPANY_ADMIN proprietario della marina
  useEffect(() => {
    // Verifica auth: SUPER_ADMIN sempre, COMPANY_ADMIN se la marina è della sua company
    const checkAuth = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (!u) {
          router.replace(`/posti-barca/${slug}/mappa-pubblica`);
          return;
        }
        if (u?.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
          setAuthChecked(true);
          return;
        }
        // COMPANY_ADMIN: controlla se la marina è della sua company
        if (u?.role === 'COMPANY_ADMIN' && u?.company_id) {
          try {
            const r = await fetch(`/api/marinas/${encodeURIComponent(slug)}`);
            const m = await r.json();
            if (r.ok && m?.company_id === u.company_id) {
              setIsSuperAdmin(true); // riusa il flag per abilitare la gestione
              setAuthChecked(true);
              return;
            }
          } catch (e) { /* */ }
        }
        // Default: redirect a pubblica
        router.replace(`/posti-barca/${slug}/mappa-pubblica`);
      } catch (e) {
        router.replace(`/posti-barca/${slug}/mappa-pubblica`);
      }
    };
    checkAuth();
    /* eslint-disable-next-line */
  }, []);
  
  // Form occupazione (con foto barca opzionale + dati completi cliente + calcolo tariffa)
  const initialForm = {
    customer: { name: '', surname: '', email: '', phone: '', tax_code: '', address: '', city: '', zip: '', country: 'IT' },
    boat: { name: '', registration: '', type: 'motor', length: '', beam: '', photo_url: '' },
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    tariff_choice: '', // 'daily'|'monthly'|'summer_flat'|'annual'|'custom'|'complimentary'
    custom_amount: '',
    extras: { parking_daily: false, parking_monthly: false, launch: false, hull_wash: false, antifouling: false },
    antifouling_coats: 1,
    payment_status: 'DA_PAGARE',
    payment_method: '',
    is_complimentary: false,
    complimentary_authorized_at: null,
    complimentary_reason: '',
  };
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Quote dinamico
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  
  // Password autorizzazione tariffa servizio
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authReason, setAuthReason] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Tracking unmount per evitare toast/state update dopo navigazione
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);
  const safeToastError = (e) => {
    if (unmountedRef.current) return;
    const msg = friendlyError(e);
    if (msg) toast.error(msg);
  };

  const loadData = async () => {
    try {
      const { safeFetchJson } = await import('@/app/lib/safeFetch');
      const m = await safeFetchJson(`/api/marinas/${encodeURIComponent(slug)}`);
      if (!m || m?.error) { router.push('/posti-barca'); return; }
      setMarina(m);
      const b = await safeFetchJson(`/api/berths?marina_id=${m.id}`);
      setBerths(Array.isArray(b) ? b : []);
    } catch (e) {
      safeToastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (slug && authChecked) loadData(); /* eslint-disable-next-line */ }, [slug, authChecked]);

  // Calcolo automatico preventivo quando cambiano i parametri
  useEffect(() => {
    if (!showOccupy || !marina) return;
    if (!form.boat.length || !form.start_date || !form.end_date) { setQuote(null); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setQuote(null); return; }
    
    let cancelled = false;
    setCalculating(true);
    const services = Object.entries(form.extras).filter(([_, v]) => v).map(([type]) =>
      type === 'antifouling' ? { type, coats: form.antifouling_coats } : { type }
    );
    fetch('/api/marina-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marina_id: marina.id,
        boat_type: form.boat.type,
        boat_length: parseFloat(form.boat.length),
        start_date: form.start_date,
        end_date: form.end_date,
        services,
      }),
    }).then(r => r.json()).then(data => {
      if (cancelled) return;
      if (data?.error) setQuote(null);
      else {
        setQuote(data);
        // Pre-seleziona l'opzione consigliata se nessuna scelta esistente
        setForm(f => f.tariff_choice ? f : { ...f, tariff_choice: data.recommended?.type || '' });
      }
    }).catch(() => setQuote(null))
      .finally(() => { if (!cancelled) setCalculating(false); });
    
    return () => { cancelled = true; };
  }, [showOccupy, marina, form.boat.length, form.boat.type, form.start_date, form.end_date, form.extras, form.antifouling_coats]);

  // Calcola totale finale in base a scelta tariffa
  const finalTotal = useMemo(() => {
    if (form.tariff_choice === 'complimentary') return 0; // tariffa servizio = gratuita
    if (!quote) return 0;
    let mooring = 0;
    if (form.tariff_choice === 'custom') mooring = Number(form.custom_amount) || 0;
    else {
      const opt = quote.options?.find(o => o.type === form.tariff_choice);
      if (opt) mooring = opt.total;
    }
    return mooring + (quote.extras_total || 0);
  }, [quote, form.tariff_choice, form.custom_amount]);

  // ──────────────────────────────────────────────────────────────
  // DATE FILTER: per ogni berth calcola lo stato e l'occupazione "effettiva"
  // alla data selezionata (viewDate). Una occupazione/transito è attiva se
  // start_date <= viewDate <= end_date. Si controlla prima current_occupation
  // poi occupation_history[]. Se nessuna corrispondenza → status='free'.
  // ──────────────────────────────────────────────────────────────
  const isOccActiveOn = (occ, dateStr) => {
    if (!occ) return false;
    const start = occ.start_date ? String(occ.start_date).slice(0, 10) : null;
    const end = occ.end_date ? String(occ.end_date).slice(0, 10) : null;
    if (start && dateStr < start) return false;
    if (end && dateStr > end) return false;
    // Se l'occupazione è stata RILASCIATA (released_at impostato), il posto NON è
    // più occupato dalla data di rilascio in poi (incluso il giorno stesso del rilascio).
    // Questo è il caso quando si preme "Libera Posto": l'entry finisce in occupation_history[]
    // con released_at = now e da quel momento il posto deve apparire libero anche se
    // end_date originale è in futuro.
    if (occ.released_at) {
      const releasedDay = String(occ.released_at).slice(0, 10);
      if (dateStr >= releasedDay) return false;
    }
    return true;
  };

  const displayBerths = useMemo(() => {
    if (!viewDate) return berths;
    return berths.map(b => {
      // 1) current_occupation attiva nella data?
      if (b.current_occupation && isOccActiveOn(b.current_occupation, viewDate)) {
        return b; // tutto invariato (status, current_occupation, ecc.)
      }
      // 2) cerca in occupation_history[] una voce che includa la data
      const histMatch = (b.occupation_history || []).find(h => isOccActiveOn(h, viewDate));
      if (histMatch) {
        // Determina lo stato in base al tipo di occupazione storica
        const isTransit = !!histMatch.is_transit;
        const synthStatus = isTransit ? 'occupied' : 'occupied'; // contratto storico attivo nella data = occupied
        return { ...b, status: synthStatus, current_occupation: histMatch, _historical: true };
      }
      // 3) nessuna occupazione attiva quel giorno → posto LIBERO (anche se ha standby pendente per altre date)
      return { ...b, status: 'free', current_occupation: null, _historical: false };
    });
  }, [berths, viewDate]);

  const pontoonsData = useMemo(() => {
    const grouped = {};
    displayBerths.forEach(b => {
      if (!grouped[b.pontoon]) grouped[b.pontoon] = { left: [], right: [] };
      grouped[b.pontoon][b.side].push(b);
    });
    Object.values(grouped).forEach(p => {
      p.left.sort((a, b) => a.position - b.position);
      p.right.sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [displayBerths]);

  const stats = useMemo(() => {
    const free = displayBerths.filter(b => b.status === 'free').length;
    const standby = displayBerths.filter(b => b.status === 'standby').length;
    const occupied = displayBerths.filter(b => b.status === 'occupied').length;
    const releasing = displayBerths.filter(b => b.status === 'releasing').length;
    return { free, standby, occupied, releasing, total: displayBerths.length };
  }, [displayBerths]);

  // Filtraggio: calcola il set di id che soddisfano i filtri attivi
  const isFilterActive = !!searchQuery.trim() || (filterStatus && filterStatus !== 'all');
  const matchedIds = useMemo(() => {
    if (!isFilterActive) return null;
    const q = searchQuery.trim().toLowerCase();
    const ids = new Set();
    displayBerths.forEach(b => {
      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'transit') {
          if (!b.current_occupation?.is_transit) return;
        } else if (filterStatus === 'contract') {
          const occ = b.current_occupation;
          if (!occ || occ.is_transit) return;
          // Contratto = occupazione non-transito (per ora qualunque occupazione non-transit conta come contratto)
        } else if (filterStatus === 'no_contract') {
          // Standby pendente, no contratto
          if (b.status !== 'standby') return;
        } else if (b.status !== filterStatus) {
          return;
        }
      }
      // Filtro testo (cliente / barca / numero posto)
      if (q) {
        const occ = b.current_occupation;
        const fields = [
          b.label,
          occ?.customer?.name,
          occ?.customer?.surname,
          occ?.customer?.email,
          occ?.customer?.phone,
          occ?.boat?.name,
          occ?.boat?.registration,
        ].filter(Boolean).map(s => String(s).toLowerCase());
        if (!fields.some(f => f.includes(q))) return;
      }
      ids.add(b.id);
    });
    return ids;
  }, [displayBerths, searchQuery, filterStatus, isFilterActive]);

  const handleBerthClick = (berth) => {
    setSelectedBerth(berth);
    if (berth.status === 'free') {
      setForm(initialForm);
      setShowOccupy(true);
    } else {
      setShowInfo(true);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Immagine max 5MB'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [base64] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const url = data.urls?.[0];
      if (url) {
        setForm(f => ({ ...f, boat: { ...f.boat, photo_url: url } }));
        toast.success('Foto caricata');
      }
    } catch (e) { safeToastError(e); }
    finally { setUploading(false); }
  };

  const submitOccupy = async () => {
    if (!form.customer.name || !form.customer.email) {
      toast.error('Nome e Email cliente obbligatori'); return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Date di occupazione obbligatorie'); return;
    }
    if (Number(form.boat.length) > selectedBerth.length_max) {
      toast.error(`La barca (${form.boat.length}m) supera la lunghezza max del posto (${selectedBerth.length_max}m)`); return;
    }
    if (!form.tariff_choice) {
      toast.error('Seleziona una tariffa da applicare'); return;
    }
    setSubmitting(true);
    try {
      // Costruisci dettaglio tariffa scelta
      const chosenOption = form.tariff_choice === 'custom'
        ? { type: 'custom', label: 'Tariffa personalizzata', total: Number(form.custom_amount) || 0 }
        : quote?.options?.find(o => o.type === form.tariff_choice);
      
      const payload = {
        ...form,
        total_amount: finalTotal,
        tariff_applied: chosenOption ? {
          type: chosenOption.type,
          label: chosenOption.label,
          mooring_amount: chosenOption.total,
          extras: quote?.extras || [],
          extras_total: quote?.extras_total || 0,
          grand_total: finalTotal,
        } : null,
        // Forza payment_status='GRATUITO' se complimentary
        payment_status: form.tariff_choice === 'complimentary' ? 'GRATUITO' : form.payment_status,
      };
      
      const res = await fetch(`/api/berths/${selectedBerth.id}/occupy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Posto ${selectedBerth.label} occupato! Totale: €${finalTotal.toFixed(2)}`);
      setShowOccupy(false);
      setForm(initialForm);
      setQuote(null);
      await loadData();
    } catch (e) { safeToastError(e); }
    finally { setSubmitting(false); }
  };

  const releaseBerth = async () => {
    if (!confirm(`Liberare il posto ${selectedBerth.label}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/berths/${selectedBerth.id}/release`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Errore');
      toast.success('Posto liberato');
      setShowInfo(false);
      await loadData();
    } catch (e) { safeToastError(e); }
    finally { setSubmitting(false); }
  };

  // Genera ricevuta PDF post-pagamento
  const generateReceipt = async () => {
    try {
      const { generateReceiptPDF } = await import('@/app/lib/pdfGen');
      let company = null;
      if (marina?.company_id) {
        const cRes = await fetch('/api/companies').then(r => r.json());
        company = (Array.isArray(cRes) ? cRes : []).find(c => c.id === marina.company_id) || null;
      }
      await generateReceiptPDF({
        marina,
        occupation: selectedBerth.current_occupation,
        berth_label: selectedBerth.label,
        receipt_number: `R-${new Date().getFullYear()}-${selectedBerth.label}-${Date.now().toString().slice(-6)}`,
        company,
      });
      toast.success('Ricevuta scaricata');
    } catch (e) { safeToastError(e); }
  };

  // Verifica password autorizzazione tariffa servizio
  const verifyAuth = async () => {
    if (!authPassword) { toast.error('Inserisci password'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/port-settings/global/verify-complimentary-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: authPassword }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Autorizzazione concessa');
      setForm(f => ({
        ...f,
        tariff_choice: 'complimentary',
        is_complimentary: true,
        complimentary_authorized_at: data.authorized_at,
        complimentary_reason: authReason,
      }));
      setShowAuthDialog(false);
      setAuthPassword('');
      setAuthReason('');
    } catch (e) {
      safeToastError(e);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading || !authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200">
      <div className="text-center">
        <Anchor className="w-12 h-12 mx-auto animate-pulse text-primary" />
        {!authChecked && <p className="text-sm text-muted-foreground mt-2">Verifico autorizzazione...</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-100 to-cyan-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-primary to-blue-800 text-white py-6 px-6 shadow-xl">
        <div className="container mx-auto">
          <Button variant="ghost" className="text-white hover:bg-white/20 mb-3" onClick={() => router.push(`/posti-barca/${slug}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Torna alla Marina
          </Button>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <MapPin className="w-8 h-8" /> Mappa Interattiva — {marina?.name}
                <Badge className="bg-amber-500 text-white text-xs">🔐 ADMIN</Badge>
              </h1>
              <p className="text-white/90 mt-1">Visualizzazione realistica del porto · Click su un posto per gestirlo</p>
            </div>
            <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <Card className="border-2 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs uppercase tracking-wide">Totali</p>
          </CardContent></Card>
          <Card className="border-2 border-emerald-500 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.free}</p>
            <p className="text-xs uppercase tracking-wide">Liberi</p>
          </CardContent></Card>
          <Card className="border-2 border-yellow-400 shadow-sm bg-yellow-50/40"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.standby}</p>
            <p className="text-xs uppercase tracking-wide">Standby</p>
          </CardContent></Card>
          <Card className="border-2 border-amber-500 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.releasing}</p>
            <p className="text-xs uppercase tracking-wide">In liberazione</p>
          </CardContent></Card>
          <Card className="border-2 border-red-500 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
            <p className="text-xs uppercase tracking-wide">Occupati</p>
          </CardContent></Card>
          <Card className="border-2 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total ? Math.round((stats.occupied + stats.releasing + stats.standby) / stats.total * 100) : 0}%</p>
            <p className="text-xs uppercase tracking-wide">Occupazione</p>
          </CardContent></Card>
        </div>

        {/* 🔍 Filtri Ricerca */}
        <Card className="mb-3 shadow-sm border-blue-200">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            {/* 📅 Data: mostra solo i posti occupati alla data selezionata */}
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border-2 border-blue-300 rounded-md">
              <CalIcon className="w-4 h-4 text-blue-700" />
              <Label className="text-xs font-semibold text-blue-900 whitespace-nowrap">Data:</Label>
              <Input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value || new Date().toISOString().split('T')[0])}
                className="h-8 w-[150px] text-xs font-mono"
                title="Mostra posti occupati alla data selezionata"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => setViewDate(new Date().toISOString().split('T')[0])}
                title="Torna ad oggi"
              >Oggi</Button>
              <div className="text-[10px] text-blue-700 font-medium">
                Solo contratti/transiti attivi in data
              </div>
            </div>
            <div className="flex-1 min-w-[240px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
              <Input
                className="pl-8 h-9"
                placeholder="Cerca per cliente, barca, posto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                  title="Cancella ricerca"
                >✕</button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="free">🟢 Liberi</SelectItem>
                <SelectItem value="standby">🟡 Standby</SelectItem>
                <SelectItem value="releasing">🟠 In Liberazione</SelectItem>
                <SelectItem value="occupied">🔴 Occupati</SelectItem>
                <SelectItem value="contract">📝 Contratto (occupazione)</SelectItem>
                <SelectItem value="transit">⚓ Transiti</SelectItem>
                <SelectItem value="no_contract">⏳ Senza Contratto (Standby)</SelectItem>
              </SelectContent>
            </Select>
            {isFilterActive && (
              <>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                  {matchedIds ? matchedIds.size : 0} risultati
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                >
                  ✕ Pulisci Filtri
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Legenda + Zoom */}
        <Card className="mb-4 shadow-sm"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold">Legenda:</span>
            <span className="flex items-center gap-1.5"><BoatIcon type="motor" status="free" small /> Libero</span>
            <span className="flex items-center gap-1.5"><BoatIcon type="motor" status="standby" small /> <span className="font-medium text-yellow-700">Standby</span></span>
            <span className="flex items-center gap-1.5"><BoatIcon type="motor" status="releasing" small /> In liberazione</span>
            <span className="flex items-center gap-1.5"><BoatIcon type="motor" status="occupied" small /> Occupato</span>
            <span className="flex items-center gap-1.5"><Sailboat className="w-4 h-4 text-blue-700" /> Vela</span>
            <span className="flex items-center gap-1.5"><Ship className="w-4 h-4 text-blue-700" /> Motore</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}><ZoomOut className="w-3 h-3" /></Button>
            <span className="text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}><ZoomIn className="w-3 h-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => setZoom(1)}><Maximize2 className="w-3 h-3" /></Button>
          </div>
        </CardContent></Card>

        {/* Mappa Porto Realistica */}
        <Card className="overflow-hidden shadow-xl border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-primary text-white py-3">
            <CardTitle className="flex items-center gap-2 text-base"><Ship className="w-5 h-5" />Layout Porto · 3 Pontili Bifacciali</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Sea Background con onde */}
            <div
              className="relative overflow-auto"
              style={{
                background: 'linear-gradient(180deg, #5dafd9 0%, #3a7bd5 30%, #1e5b9d 100%)',
                backgroundImage: `
                  linear-gradient(180deg, rgba(93,175,217,0.85) 0%, rgba(58,123,213,0.95) 100%),
                  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='40' viewBox='0 0 200 40'><path d='M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20' stroke='rgba(255,255,255,0.15)' fill='none' stroke-width='2'/></svg>")
                `,
                backgroundSize: 'auto, 200px 40px',
                minHeight: '600px',
              }}
            >
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }} className="py-6 px-4">
                {/* Banchina (terra ferma) */}
                <div className="relative mx-auto" style={{ maxWidth: '1200px' }}>
                  <Banchina />

                  <div className="space-y-12 mt-8">
                    {[1, 2, 3].map(p => (
                      <PontoonRealistic key={p} pontoonNum={p} data={pontoonsData[p]} onClick={handleBerthClick} matchedIds={matchedIds} />
                    ))}
                  </div>

                  {/* Mare aperto in fondo */}
                  <div className="mt-12 text-center">
                    <p className="text-white/80 text-xs italic flex items-center justify-center gap-2">
                      <span className="inline-block w-12 h-px bg-white/40"></span>
                      ⛵ MARE APERTO ⛵
                      <span className="inline-block w-12 h-px bg-white/40"></span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Occupa posto libero */}
      <Dialog open={showOccupy} onOpenChange={setShowOccupy}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />Registra occupazione — {selectedBerth?.label}
            </DialogTitle>
            <DialogDescription>
              Posto libero · Lunghezza max: {selectedBerth?.length_max}m · Larghezza max: {selectedBerth?.beam_max?.toFixed(1)}m
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <h3 className="font-semibold text-sm mb-2 text-primary">Dati Cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome *</Label><Input value={form.customer.name} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))} /></div>
                <div><Label>Cognome / Ragione Sociale</Label><Input value={form.customer.surname} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, surname: e.target.value } }))} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.customer.email} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, email: e.target.value } }))} /></div>
                <div><Label>Telefono</Label><Input value={form.customer.phone} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, phone: e.target.value } }))} /></div>
                <div className="col-span-2"><Label>Codice Fiscale / P.IVA</Label><Input value={form.customer.tax_code} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, tax_code: e.target.value.toUpperCase() } }))} placeholder="RSSMRA80A01H501Z o IT01234567890" /></div>
                <div className="col-span-2"><Label>Indirizzo</Label><Input value={form.customer.address} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, address: e.target.value } }))} placeholder="Via Roma 12" /></div>
                <div><Label>Città</Label><Input value={form.customer.city} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, city: e.target.value } }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>CAP</Label><Input value={form.customer.zip} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, zip: e.target.value } }))} /></div>
                  <div>
                    <Label>Paese</Label>
                    <Select value={form.customer.country} onValueChange={v => setForm(f => ({ ...f, customer: { ...f.customer, country: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">Italia</SelectItem>
                        <SelectItem value="FR">Francia</SelectItem>
                        <SelectItem value="DE">Germania</SelectItem>
                        <SelectItem value="ES">Spagna</SelectItem>
                        <SelectItem value="CH">Svizzera</SelectItem>
                        <SelectItem value="GB">Regno Unito</SelectItem>
                        <SelectItem value="US">USA</SelectItem>
                        <SelectItem value="OTHER">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 text-primary">Dati Imbarcazione</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome Barca</Label><Input value={form.boat.name} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, name: e.target.value } }))} placeholder="es. Aurora" /></div>
                <div><Label>Targa / Registrazione</Label><Input value={form.boat.registration} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, registration: e.target.value } }))} placeholder="es. CA-1234" /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.boat.type} onValueChange={v => setForm(f => ({ ...f, boat: { ...f.boat, type: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motor">Motore</SelectItem>
                      <SelectItem value="sail">Vela</SelectItem>
                      <SelectItem value="catamaran">Catamarano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Lung. (m) *</Label><Input type="number" step="0.1" value={form.boat.length} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, length: e.target.value } }))} /></div>
                  <div><Label>Larg. (m)</Label><Input type="number" step="0.1" value={form.boat.beam} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, beam: e.target.value } }))} /></div>
                </div>
              </div>
              {/* Foto barca opzionale */}
              <div className="mt-3">
                <Label>Foto Barca (opzionale)</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.boat.photo_url ? (
                    <div className="relative">
                      <img src={form.boat.photo_url} alt="Foto barca" className="w-24 h-24 rounded border-2 object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, boat: { ...f.boat, photo_url: '' } }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center bg-muted/30">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Carico...' : <><Upload className="w-3 h-3 mr-1" />Sfoglia e carica</>}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG/PNG max 5MB</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 text-primary">Periodo</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dal *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, tariff_choice: '' }))} /></div>
                <div><Label>Al *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value, tariff_choice: '' }))} /></div>
              </div>
            </div>

            {/* === Servizi extra === */}
            <div>
              <h3 className="font-semibold text-sm mb-2 text-primary">Servizi extra (opzionali)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { key: 'parking_daily', label: 'Sosta piazzale (giornaliera)' },
                  { key: 'parking_monthly', label: 'Sosta piazzale (mensile)' },
                  { key: 'launch', label: 'Alaggio o Varo a movimento' },
                  { key: 'hull_wash', label: 'Lavaggio carena' },
                  { key: 'antifouling', label: 'Antivegetativa' },
                ].map(s => (
                  <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.extras[s.key]}
                      onChange={e => setForm(f => ({ ...f, extras: { ...f.extras, [s.key]: e.target.checked } }))}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
              {form.extras.antifouling && (
                <div className="mt-2 ml-1">
                  <Label className="text-xs">N° mani antivegetativa</Label>
                  <Select value={String(form.antifouling_coats)} onValueChange={v => setForm(f => ({ ...f, antifouling_coats: Number(v) }))}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mano</SelectItem>
                      <SelectItem value="2">2 mani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* === CALCOLATORE TARIFFA === */}
            <div className="border-2 border-primary/30 rounded-lg p-4 bg-blue-50/50">
              <h3 className="font-semibold text-sm mb-2 text-primary flex items-center gap-2">
                <CreditCard className="w-4 h-4" />Calcolo Costo · Scegli la tariffa
              </h3>
              {!form.boat.length || !form.start_date || !form.end_date ? (
                <p className="text-xs text-muted-foreground italic">Inserisci lunghezza barca e date per vedere le tariffe disponibili.</p>
              ) : calculating ? (
                <p className="text-sm text-muted-foreground">Calcolo tariffe...</p>
              ) : !quote || quote.options?.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                  <AlertCircle className="w-3 h-3 inline mr-1" />Nessuna tariffa disponibile per questo periodo. Inserisci un importo personalizzato.
                </div>
              ) : (
                <div className="space-y-2">
                  {quote.options?.map(opt => (
                    <label
                      key={opt.type}
                      className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer border-2 transition-all ${form.tariff_choice === opt.type ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/30 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="radio"
                          name="tariff"
                          checked={form.tariff_choice === opt.type}
                          onChange={() => setForm(f => ({ ...f, tariff_choice: opt.type }))}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {opt.label}
                            {quote.recommended?.type === opt.type && <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-[10px]">CONSIGLIATA</Badge>}
                          </p>
                          {opt.detail && opt.detail.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {opt.detail.map((d, i) => (
                                <span key={i}>
                                  {d.month_name ? `${d.month_name}: ${d.days}gg × €${d.daily_price?.toFixed(2)}` :
                                   d.months ? `${d.months} mese${d.months > 1 ? 'i' : ''} × €${d.monthly_price?.toFixed(2)}` :
                                   `Forfait: €${d.subtotal}`}
                                  {i < opt.detail.length - 1 ? ' + ' : ''}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                      <strong className="text-base text-primary">€ {opt.total.toFixed(2)}</strong>
                    </label>
                  ))}
                  {/* Custom amount option */}
                  <label className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer border-2 transition-all ${form.tariff_choice === 'custom' ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/30 bg-white'}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="radio" name="tariff" checked={form.tariff_choice === 'custom'} onChange={() => setForm(f => ({ ...f, tariff_choice: 'custom' }))} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Tariffa personalizzata (manuale)</p>
                        <p className="text-xs text-muted-foreground">Inserisci un importo concordato a parte</p>
                      </div>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-24 h-8 text-right"
                      disabled={form.tariff_choice !== 'custom'}
                      value={form.custom_amount}
                      onChange={e => setForm(f => ({ ...f, custom_amount: e.target.value }))}
                      onClick={() => setForm(f => ({ ...f, tariff_choice: 'custom' }))}
                    />
                  </label>

                  {/* Tariffa servizio (cortesia) */}
                  <label className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer border-2 transition-all ${form.tariff_choice === 'complimentary' ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-amber-300 bg-white'}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="radio"
                        name="tariff"
                        checked={form.tariff_choice === 'complimentary'}
                        onChange={() => {
                          if (!form.is_complimentary) {
                            setShowAuthDialog(true);
                          } else {
                            setForm(f => ({ ...f, tariff_choice: 'complimentary' }));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-1">
                          🎁 Tariffa Servizio (Gratuita)
                          {form.is_complimentary && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">AUTORIZZATA</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {form.is_complimentary 
                            ? `Autorizzata · ${form.complimentary_reason || 'Senza motivazione'}`
                            : 'Richiede password Super Admin'}
                        </p>
                      </div>
                    </div>
                    <strong className="text-sm text-emerald-600 whitespace-nowrap">€ 0,00</strong>
                  </label>

                  {/* Servizi extra dettaglio */}
                  {quote.extras?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                      <p className="font-semibold text-amber-800 mb-1">Servizi extra applicati:</p>
                      {quote.extras.map((e, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{e.name} ({e.detail})</span>
                          <strong>€ {e.subtotal.toFixed(2)}</strong>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-amber-300 mt-1 pt-1">
                        <span className="font-semibold">Subtotale extra:</span>
                        <strong>€ {(quote.extras_total || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Totale finale */}
                  <div className="bg-primary text-white rounded p-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide">Totale da pagare</span>
                      <span className="text-2xl font-bold">€ {finalTotal.toFixed(2)}</span>
                    </div>
                    {quote.period && (
                      <p className="text-xs opacity-80">{quote.period.days} giorni · barca {form.boat.length}m</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* === STATO PAGAMENTO === */}
            <div className="border rounded-lg p-3 bg-slate-50">
              <h3 className="font-semibold text-sm mb-2 text-primary flex items-center gap-2">
                <CreditCard className="w-4 h-4" />Stato Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stato</Label>
                  <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DA_PAGARE">Da pagare</SelectItem>
                      <SelectItem value="PAGATO_PARZIALE">Pagato parziale</SelectItem>
                      <SelectItem value="PAGATO">Pagato</SelectItem>
                      <SelectItem value="GRATUITO">Gratuito (servizio)</SelectItem>
                      <SelectItem value="STORNATO">Stornato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Metodo pagamento</Label>
                  <Select value={form.payment_method || 'NESSUNO'} onValueChange={v => setForm(f => ({ ...f, payment_method: v === 'NESSUNO' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Non specificato" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NESSUNO">Non specificato</SelectItem>
                      <SelectItem value="CONTANTI">Contanti</SelectItem>
                      <SelectItem value="BONIFICO">Bonifico</SelectItem>
                      <SelectItem value="POS">POS / Carta</SelectItem>
                      <SelectItem value="STRIPE">Stripe online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Note interne</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note aggiuntive (visibili solo internamente)..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOccupy(false)}>Annulla</Button>
            <Button onClick={submitOccupy} disabled={submitting}>
              {submitting ? 'Salvo...' : <><Lock className="w-4 h-4 mr-2" />Conferma Occupazione</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Info posto occupato */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedBerth?.status === 'standby' ? <Clock className="w-6 h-6 text-yellow-500" /> 
                : selectedBerth?.status === 'releasing' ? <Clock className="w-6 h-6 text-amber-500" /> 
                : <Lock className="w-6 h-6 text-red-500" />}
              Posto {selectedBerth?.label}
              <Badge className={
                selectedBerth?.status === 'standby' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                : selectedBerth?.status === 'releasing' ? 'bg-amber-100 text-amber-700 border-amber-300' 
                : 'bg-red-100 text-red-700 border-red-300'
              }>
                {selectedBerth?.status === 'standby' ? '⏳ STANDBY' 
                  : selectedBerth?.status === 'releasing' ? 'IN LIBERAZIONE' 
                  : 'OCCUPATO'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedBerth?.current_occupation && (
            <div className="space-y-3 text-sm">
              {/* Foto barca se presente */}
              {selectedBerth.current_occupation.boat?.photo_url && (
                <div className="rounded-lg overflow-hidden border-2 border-primary/20 shadow">
                  <img src={selectedBerth.current_occupation.boat.photo_url} alt="Foto barca" className="w-full h-48 object-cover" />
                </div>
              )}

              {/* CLIENTE - dati completi */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <p className="font-semibold text-blue-900 flex items-center gap-1.5 mb-2">
                    <Users className="w-4 h-4" />Cliente
                  </p>
                  <p className="text-base font-medium">
                    {selectedBerth.current_occupation.customer?.name} {selectedBerth.current_occupation.customer?.surname}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    {selectedBerth.current_occupation.customer?.email && (
                      <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{selectedBerth.current_occupation.customer.email}</p>
                    )}
                    {selectedBerth.current_occupation.customer?.phone && (
                      <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{selectedBerth.current_occupation.customer.phone}</p>
                    )}
                    {selectedBerth.current_occupation.customer?.tax_code && (
                      <p className="flex items-center gap-1.5 col-span-2"><FileText className="w-3 h-3" />CF/P.IVA: <strong className="text-foreground">{selectedBerth.current_occupation.customer.tax_code}</strong></p>
                    )}
                    {(selectedBerth.current_occupation.customer?.address || selectedBerth.current_occupation.customer?.city) && (
                      <p className="flex items-center gap-1.5 col-span-2"><MapPin className="w-3 h-3" />
                        {[
                          selectedBerth.current_occupation.customer.address,
                          selectedBerth.current_occupation.customer.zip,
                          selectedBerth.current_occupation.customer.city,
                          selectedBerth.current_occupation.customer.country !== 'IT' ? selectedBerth.current_occupation.customer.country : ''
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* IMBARCAZIONE */}
              <Card className="border-l-4 border-l-cyan-500">
                <CardContent className="p-3">
                  <p className="font-semibold text-cyan-900 flex items-center gap-1.5 mb-2">
                    <Ship className="w-4 h-4" />Imbarcazione
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-base font-medium">
                      {selectedBerth.current_occupation.boat?.name || '—'}
                      {selectedBerth.current_occupation.boat?.registration && (
                        <span className="text-sm text-muted-foreground font-normal ml-2">({selectedBerth.current_occupation.boat.registration})</span>
                      )}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {selectedBerth.current_occupation.boat?.type === 'sail' ? 'Vela' : selectedBerth.current_occupation.boat?.type === 'catamaran' ? 'Catamarano' : 'Motore'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dimensioni: <strong className="text-foreground">{selectedBerth.current_occupation.boat?.length}m × {selectedBerth.current_occupation.boat?.beam}m</strong>
                  </p>
                </CardContent>
              </Card>

              {/* PERIODO */}
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-3">
                  <p className="font-semibold text-purple-900 flex items-center gap-1.5 mb-2">
                    <CalIcon className="w-4 h-4" />Periodo Soggiorno
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Arrivo</p>
                      <p className="font-bold">{fmtDate(selectedBerth.current_occupation.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Partenza</p>
                      <p className="font-bold">{fmtDate(selectedBerth.current_occupation.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durata</p>
                      <p className="font-bold">
                        {selectedBerth.current_occupation.start_date && selectedBerth.current_occupation.end_date
                          ? Math.ceil((new Date(selectedBerth.current_occupation.end_date) - new Date(selectedBerth.current_occupation.start_date)) / (1000 * 60 * 60 * 24)) + 1
                          : 0} giorni
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TARIFFA APPLICATA */}
              {selectedBerth.current_occupation.tariff_applied ? (
                <Card className={`border-l-4 ${selectedBerth.current_occupation.is_complimentary ? 'border-l-amber-500 bg-amber-50/40' : 'border-l-emerald-500 bg-emerald-50/40'}`}>
                  <CardContent className="p-3">
                    <p className="font-semibold flex items-center gap-1.5 mb-2">
                      <CreditCard className="w-4 h-4" />
                      {selectedBerth.current_occupation.is_complimentary ? '🎁 Tariffa Servizio (Gratuita)' : 'Tariffa Applicata'}
                    </p>
                    <p className="text-sm font-medium">{selectedBerth.current_occupation.tariff_applied.label}</p>
                    {selectedBerth.current_occupation.is_complimentary && (
                      <p className="text-xs text-amber-700 italic mt-1">
                        Autorizzata il {fmtDate(selectedBerth.current_occupation.complimentary_authorized_at)}
                        {selectedBerth.current_occupation.complimentary_reason && ` · ${selectedBerth.current_occupation.complimentary_reason}`}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Ormeggio:</span>
                        <strong>€ {(selectedBerth.current_occupation.tariff_applied.mooring_amount || 0).toFixed(2)}</strong>
                      </div>
                      {selectedBerth.current_occupation.tariff_applied.extras?.map((e, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>+ {e.name}</span>
                          <span>€ {(e.subtotal || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      {selectedBerth.current_occupation.tariff_applied.extras_total > 0 && (
                        <div className="flex justify-between text-xs">
                          <span>Subtotale extra:</span>
                          <strong>€ {selectedBerth.current_occupation.tariff_applied.extras_total.toFixed(2)}</strong>
                        </div>
                      )}
                      <div className={`flex justify-between text-base mt-2 pt-2 border-t-2 font-bold ${selectedBerth.current_occupation.is_complimentary ? 'border-amber-300 text-amber-700' : 'border-emerald-300 text-emerald-700'}`}>
                        <span>TOTALE:</span>
                        <span>€ {(selectedBerth.current_occupation.tariff_applied.grand_total || selectedBerth.current_occupation.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-l-4 border-l-slate-300 bg-slate-50/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground italic">⚠️ Tariffa non specificata in fase di registrazione</p>
                  </CardContent>
                </Card>
              )}

              {/* STATO PAGAMENTO */}
              <Card className="border-l-4 border-l-rose-500">
                <CardContent className="p-3">
                  <p className="font-semibold text-rose-900 flex items-center gap-1.5 mb-2">
                    <CreditCard className="w-4 h-4" />Pagamento
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge className={
                      selectedBerth.current_occupation.payment_status === 'PAGATO' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                      selectedBerth.current_occupation.payment_status === 'GRATUITO' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      selectedBerth.current_occupation.payment_status === 'PAGATO_PARZIALE' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                      selectedBerth.current_occupation.payment_status === 'STORNATO' ? 'bg-red-100 text-red-700 border-red-300' :
                      'bg-orange-100 text-orange-700 border-orange-300'
                    }>
                      {(selectedBerth.current_occupation.payment_status || 'DA_PAGARE').replace('_', ' ')}
                    </Badge>
                    {selectedBerth.current_occupation.payment_method && (
                      <span className="text-xs text-muted-foreground">{selectedBerth.current_occupation.payment_method}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* NOTE */}
              {selectedBerth.current_occupation.notes && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/40">
                  <CardContent className="p-3">
                    <p className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-4 h-4" />Note interne
                    </p>
                    <p className="text-xs">{selectedBerth.current_occupation.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* META: registrato il */}
              <p className="text-xs text-muted-foreground italic text-right">
                Registrato il {fmtDate(selectedBerth.current_occupation.created_at)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfo(false)}>Chiudi</Button>
            {selectedBerth?.current_occupation?.payment_status === 'PAGATO' && (
              <Button variant="outline" className="bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100" onClick={generateReceipt}>
                <FileText className="w-4 h-4 mr-2" />Ricevuta PDF
              </Button>
            )}
            <Button variant="destructive" onClick={releaseBerth} disabled={submitting}>
              <Unlock className="w-4 h-4 mr-2" />Libera Posto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog: Autorizzazione tariffa servizio */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-md" translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              🎁 Autorizzazione Tariffa Servizio
            </DialogTitle>
            <DialogDescription>
              La tariffa servizio è gratuita e richiede autorizzazione tramite password Super Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Password autorizzazione *</Label>
              <Input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="Inserisci la password Super Admin"
                onKeyDown={e => e.key === 'Enter' && verifyAuth()}
                autoFocus
              />
            </div>
            <div>
              <Label>Motivazione (consigliata)</Label>
              <Input
                value={authReason}
                onChange={e => setAuthReason(e.target.value)}
                placeholder="es. Ospite di rappresentanza, Cortesia familiare, ecc."
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              L'autorizzazione viene registrata nel sistema con timestamp e motivazione per tracciabilità contabile.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAuthDialog(false); setAuthPassword(''); setAuthReason(''); }}>
              Annulla
            </Button>
            <Button onClick={verifyAuth} disabled={authLoading || !authPassword}>
              {authLoading ? 'Verifico...' : 'Autorizza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Banchina() {
  return (
    <div className="relative">
      <div
        className="border-2 border-stone-700 rounded-lg shadow-2xl py-3 text-center font-bold text-sm tracking-widest uppercase"
        style={{
          background: 'linear-gradient(180deg, #d4a574 0%, #b8865a 50%, #9a6b3f 100%)',
          color: '#3d2817',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 -3px 10px rgba(0,0,0,0.2)',
          backgroundImage: `
            linear-gradient(180deg, #d4a574 0%, #b8865a 50%, #9a6b3f 100%),
            repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(0,0,0,0.1) 40px, rgba(0,0,0,0.1) 42px)
          `,
        }}
      >
        ⚓ BANCHINA PRINCIPALE · INGRESSO PORTO ⚓
      </div>
    </div>
  );
}

// ============ COMPONENTE: PONTILE REALISTICO ============
function PontoonRealistic({ pontoonNum, data, onClick, matchedIds }) {
  if (!data) return null;
  const { left, right } = data;

  return (
    <div className="relative">
      {/* Etichetta pontile */}
      <div className="text-center mb-2">
        <Badge className="bg-stone-800 text-amber-100 px-3 py-1 text-xs font-bold border border-amber-700">
          PONTILE {pontoonNum}
        </Badge>
      </div>

      {/* Lato sinistro (sopra il pontile) - barche puntano verso l'alto */}
      <div className="flex justify-center gap-1 mb-1">
        {left.map(b => <BerthSlotRealistic key={b.id} berth={b} side="top" onClick={onClick} matchedIds={matchedIds} />)}
      </div>

      {/* Pontile in stile legno */}
      <div
        className="relative rounded-md shadow-lg border border-stone-700"
        style={{
          background: 'linear-gradient(180deg, #c9956a 0%, #a67849 50%, #8b5e35 100%)',
          height: '32px',
          backgroundImage: `
            linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%),
            repeating-linear-gradient(90deg, transparent 0, transparent 30px, rgba(0,0,0,0.15) 30px, rgba(0,0,0,0.15) 32px),
            linear-gradient(180deg, #c9956a 0%, #a67849 50%, #8b5e35 100%)
          `,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold text-[10px] tracking-widest opacity-70">
          ════════════ PONTILE {pontoonNum} ════════════
        </div>
      </div>

      {/* Lato destro (sotto il pontile) - barche puntano verso il basso */}
      <div className="flex justify-center gap-1 mt-1">
        {right.map(b => <BerthSlotRealistic key={b.id} berth={b} side="bottom" onClick={onClick} matchedIds={matchedIds} />)}
      </div>
    </div>
  );
}

// ============ COMPONENTE: SINGOLO POSTO BARCA REALISTICO ============
function BerthSlotRealistic({ berth, side, onClick, matchedIds }) {
  const isOccupied = berth.status !== 'free';
  const boat = berth.current_occupation?.boat;
  const customer = berth.current_occupation?.customer;
  const boatType = boat?.type || 'motor';
  
  // Etichetta cliente: cognome (o nome se cognome vuoto), max 10 char
  const customerLabel = (customer?.surname || customer?.name || '').toUpperCase().slice(0, 10);
  
  // Larghezza dello slot proporzionale alla lunghezza max
  const slotWidth = berth.length_max >= 12 ? 60 : berth.length_max >= 10 ? 52 : berth.length_max >= 8 ? 46 : 40;
  const slotHeight = berth.length_max >= 12 ? 78 : berth.length_max >= 10 ? 70 : berth.length_max >= 8 ? 60 : 52;

  // Bordo dello slot (acqua tra finger pier)
  const slotBorderColor = berth.status === 'free' ? 'rgba(34,197,94,0.3)' 
    : berth.status === 'standby' ? 'rgba(234,179,8,0.5)' 
    : berth.status === 'releasing' ? 'rgba(245,158,11,0.4)' 
    : 'rgba(239,68,68,0.4)';
  const slotBgColor = berth.status === 'standby' ? 'rgba(250,204,21,0.25)' : 'rgba(40,90,160,0.35)'; // acqua scura, giallo per standby
  
  const statusLabel = berth.status === 'free' ? 'LIBERO' 
    : berth.status === 'standby' ? `STANDBY (in attesa contratto) · ${customer?.name || ''} ${customer?.surname || ''} · barca: ${boat?.name || ''}` 
    : berth.status === 'releasing' ? 'IN LIBERAZIONE' 
    : `OCCUPATO da ${customer?.name || ''} ${customer?.surname || ''} · barca: ${boat?.name || ''}`;

  // Calcolo evidenziazione per filtro
  const isFilteringActive = matchedIds instanceof Set;
  const isMatched = isFilteringActive ? matchedIds.has(berth.id) : true;
  const filterOpacity = isFilteringActive && !isMatched ? 0.18 : 1;
  const filterRing = isFilteringActive && isMatched ? '0 0 0 3px rgba(59,130,246,0.85), 0 0 12px rgba(59,130,246,0.6)' : 'none';

  return (
    <button
      onClick={() => onClick(berth)}
      title={`${berth.label} · max ${berth.length_max}m · ${statusLabel}`}
      className="group relative cursor-pointer transition-all hover:scale-105 hover:z-10"
      style={{
        width: `${slotWidth}px`,
        height: `${slotHeight + (isOccupied && customerLabel ? 12 : 0)}px`,
        opacity: filterOpacity,
        filter: isFilteringActive && !isMatched ? 'grayscale(0.8)' : 'none',
        boxShadow: filterRing,
        borderRadius: filterRing !== 'none' ? '6px' : undefined,
        zIndex: isFilteringActive && isMatched ? 10 : undefined,
        transition: 'opacity 0.2s, filter 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
    >
      {/* Etichetta CLIENTE (top, fuori slot) - solo per occupati nella vista admin */}
      {isOccupied && customerLabel && (
        <div
          className="absolute -top-3 left-0 right-0 text-center z-10 pointer-events-none"
          style={{
            fontSize: '8px',
            fontWeight: 800,
            color: 'white',
            background: berth.status === 'standby' ? 'rgba(234,179,8,0.95)' 
              : berth.status === 'releasing' ? 'rgba(245,158,11,0.95)' 
              : 'rgba(168,85,247,0.95)',
            borderRadius: '3px',
            padding: '1px 2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            letterSpacing: '0.3px',
            border: '1px solid white',
          }}
        >
          {berth.status === 'standby' ? '⏳ ' : ''}{customerLabel}
        </div>
      )}

      {/* Slot di acqua (cornice) */}
      <div
        className="absolute left-0 right-0 rounded-sm border-2 transition-all group-hover:shadow-2xl"
        style={{
          top: isOccupied && customerLabel ? '12px' : '0',
          bottom: '0',
          backgroundColor: slotBgColor,
          borderColor: slotBorderColor,
          borderStyle: berth.status === 'free' ? 'dashed' : 'solid',
          backgroundImage: berth.status === 'free' ? `
            repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 6px)
          ` : 'none',
        }}
      />
      
      {/* Numero posto (in alto) */}
      <span
        className="absolute left-0.5 text-[8px] font-bold text-white/80 bg-black/30 rounded px-1"
        style={{ top: isOccupied && customerLabel ? '14px' : '2px' }}
      >
        {berth.position}
      </span>

      {/* Barca (al centro) - direzione opposta al lato del pontile */}
      <div
        className={`absolute left-1/2 ${side === 'top' ? 'top-1' : 'bottom-1'} -translate-x-1/2`}
        style={{ transform: `translateX(-50%) ${side === 'top' ? 'rotate(180deg)' : ''}` }}
      >
        <BoatIcon type={boatType} status={berth.status} length={berth.length_max} />
      </div>

      {/* Nome barca (in basso) per occupati */}
      {isOccupied && boat?.name && (
        <div
          className="absolute bottom-0 left-0 right-0 px-0.5 truncate text-center"
          style={{
            fontSize: '7px',
            fontWeight: 700,
            color: 'white',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '0 0 2px 2px',
          }}
        >
          {boat.name?.toUpperCase().slice(0, 8)}
        </div>
      )}
    </button>
  );
}

// ============ COMPONENTE: ICONA BARCA ============
function BoatIcon({ type, status, length, small }) {
  const colorMap = {
    free: '#22c55e',       // verde (outline barca, slot dashed - non c'è barca)
    standby: '#eab308',    // giallo (prenotazione in attesa contratto)
    occupied: '#ef4444',   // rosso
    releasing: '#f59e0b',  // ambra
  };
  const color = colorMap[status] || '#94a3b8';
  
  // Dimensione barca proporzionale alla lunghezza
  const size = small ? 14 : length >= 12 ? 32 : length >= 10 ? 28 : length >= 8 ? 24 : 20;

  // Se libero non mostriamo barca, solo un placeholder leggero
  if (status === 'free' && !small) {
    return (
      <div
        className="rounded-sm flex items-center justify-center opacity-30"
        style={{ width: size, height: size + 4 }}
      >
        <span style={{ fontSize: size * 0.6, color: '#22c55e' }}>+</span>
      </div>
    );
  }

  // Vela: silhouette con triangolo
  if (type === 'sail') {
    return (
      <svg width={size} height={size + 6} viewBox="0 0 32 38" fill={color} stroke="#1a3a5c" strokeWidth="1">
        {/* Vela (triangolo) */}
        <polygon points="16,4 16,22 4,22" fill="white" stroke={color} strokeWidth="1.2" />
        <polygon points="16,4 16,22 28,22" fill={color} opacity="0.85" stroke="#1a3a5c" strokeWidth="0.8" />
        {/* Albero */}
        <line x1="16" y1="4" x2="16" y2="28" stroke="#1a3a5c" strokeWidth="1" />
        {/* Scafo */}
        <path d="M 4 28 L 28 28 L 24 34 L 8 34 Z" fill={color} stroke="#1a3a5c" strokeWidth="1" />
      </svg>
    );
  }

  // Catamarano: due scafi
  if (type === 'catamaran') {
    return (
      <svg width={size + 4} height={size + 2} viewBox="0 0 36 32" fill={color} stroke="#1a3a5c" strokeWidth="1">
        <path d="M 4 18 L 14 18 L 12 26 L 6 26 Z" fill={color} />
        <path d="M 22 18 L 32 18 L 30 26 L 24 26 Z" fill={color} />
        <rect x="4" y="14" width="28" height="6" fill={color} stroke="#1a3a5c" />
        <rect x="14" y="6" width="8" height="10" fill="white" stroke="#1a3a5c" />
      </svg>
    );
  }

  // Motoscafo (default)
  return (
    <svg width={size} height={size + 6} viewBox="0 0 32 38" fill={color} stroke="#1a3a5c" strokeWidth="1">
      {/* Cabina */}
      <path d="M 10 8 L 22 8 L 24 18 L 8 18 Z" fill="white" stroke="#1a3a5c" strokeWidth="1" />
      <rect x="12" y="11" width="8" height="4" fill="#7dd3fc" stroke="#1a3a5c" strokeWidth="0.5" />
      {/* Scafo */}
      <path d="M 4 18 L 28 18 L 26 30 L 6 30 Z" fill={color} stroke="#1a3a5c" strokeWidth="1" />
      {/* Prua (a punta) */}
      <path d="M 6 30 L 26 30 L 16 36 Z" fill={color} stroke="#1a3a5c" strokeWidth="1" />
    </svg>
  );
}
