'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Anchor, ArrowLeft, MapPin, Ship, AlertCircle, CheckCircle2, Clock, RefreshCw, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

export default function MarinaMapPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [marina, setMarina] = useState(null);
  const [berths, setBerths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBerth, setSelectedBerth] = useState(null);
  const [showOccupy, setShowOccupy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form occupazione
  const [form, setForm] = useState({
    customer: { name: '', surname: '', email: '', phone: '' },
    boat: { name: '', registration: '', type: 'motor', length: '', beam: '' },
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const mRes = await fetch(`/api/marinas/${slug}`);
      const m = await mRes.json();
      console.log('[mappa] marina loaded:', m?.id, m?.name);
      if (m?.error) { router.push('/posti-barca'); return; }
      setMarina(m);
      const bRes = await fetch(`/api/berths?marina_id=${m.id}`);
      const b = await bRes.json();
      console.log('[mappa] berths loaded:', Array.isArray(b) ? b.length : 'not array');
      setBerths(Array.isArray(b) ? b : []);
    } catch (e) {
      console.error('[mappa] load error:', e);
      toast.error('Errore caricamento: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (slug) loadData(); /* eslint-disable-next-line */ }, [slug]);

  // Raggruppa berths per pontile
  const pontoonsData = useMemo(() => {
    const grouped = {};
    berths.forEach(b => {
      if (!grouped[b.pontoon]) grouped[b.pontoon] = { left: [], right: [] };
      grouped[b.pontoon][b.side].push(b);
    });
    Object.values(grouped).forEach(p => {
      p.left.sort((a, b) => a.position - b.position);
      p.right.sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [berths]);

  const stats = useMemo(() => {
    const free = berths.filter(b => b.status === 'free').length;
    const occupied = berths.filter(b => b.status === 'occupied').length;
    const releasing = berths.filter(b => b.status === 'releasing').length;
    return { free, occupied, releasing, total: berths.length };
  }, [berths]);

  const handleBerthClick = (berth) => {
    setSelectedBerth(berth);
    if (berth.status === 'free') {
      setShowOccupy(true);
    } else {
      setShowInfo(true);
    }
  };

  const submitOccupy = async () => {
    if (!form.customer.name || !form.customer.email) {
      toast.error('Inserisci almeno Nome e Email cliente'); return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Inserisci date di occupazione'); return;
    }
    if (Number(form.boat.length) > selectedBerth.length_max) {
      toast.error(`La barca (${form.boat.length}m) supera la lunghezza max del posto (${selectedBerth.length_max}m)`); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/berths/${selectedBerth.id}/occupy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Posto ${selectedBerth.label} occupato!`);
      setShowOccupy(false);
      setForm({
        customer: { name: '', surname: '', email: '', phone: '' },
        boat: { name: '', registration: '', type: 'motor', length: '', beam: '' },
        start_date: new Date().toISOString().split('T')[0],
        end_date: '', notes: '',
      });
      await loadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const releaseBerth = async () => {
    if (!confirm(`Liberare il posto ${selectedBerth.label}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/berths/${selectedBerth.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Errore');
      toast.success('Posto liberato');
      setShowInfo(false);
      await loadData();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Anchor className="w-12 h-12 animate-pulse text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-900 text-white py-6 px-6 shadow-lg">
        <div className="container mx-auto">
          <Button variant="ghost" className="text-white hover:bg-white/20 mb-3" onClick={() => router.push(`/posti-barca/${slug}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Torna alla Marina
          </Button>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <MapPin className="w-8 h-8" /> Mappa Interattiva — {marina?.name}
              </h1>
              <p className="text-white/90 mt-1">Clicca su un posto per occupare o vedere dettagli</p>
            </div>
            <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats + Legenda */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="border-2"><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Totali</p>
          </CardContent></Card>
          <Card className="border-2 border-emerald-500"><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats.free}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Liberi</p>
          </CardContent></Card>
          <Card className="border-2 border-amber-500"><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{stats.releasing}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">In liberazione</p>
          </CardContent></Card>
          <Card className="border-2 border-red-500"><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Occupati</p>
          </CardContent></Card>
          <Card className="border-2"><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total ? Math.round((stats.occupied + stats.releasing) / stats.total * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Occupazione</p>
          </CardContent></Card>
        </div>

        {/* Legenda */}
        <Card className="mb-6"><CardContent className="p-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold">Legenda:</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 inline-block" /> Libero</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-400 inline-block" /> In liberazione (entro 1 giorno)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500 inline-block" /> Occupato</span>
        </CardContent></Card>

        {/* Mappa con pontili */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-b from-sky-100 to-blue-50">
            <CardTitle className="flex items-center gap-2"><Ship className="w-5 h-5 text-primary" />Layout Porto — 3 Pontili Bifacciali</CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-sky-50 to-blue-100">
            {/* Banchina */}
            <div className="bg-stone-300 border-2 border-stone-400 rounded-t-lg py-2 text-center text-stone-700 font-semibold text-sm tracking-wide shadow-inner">
              ⚓ BANCHINA PRINCIPALE — Ingresso/Uscita Porto
            </div>

            <div className="space-y-12 py-8">
              {[1, 2, 3].map(p => (
                <PontoonRow key={p} pontoonNum={p} data={pontoonsData[p]} onClick={handleBerthClick} />
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground italic">
              Distanza tra pontili: 20 metri · Pontili bifacciali · Click su un posto per dettagli
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Occupa posto libero */}
      <Dialog open={showOccupy} onOpenChange={setShowOccupy}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div><Label>Cognome</Label><Input value={form.customer.surname} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, surname: e.target.value } }))} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.customer.email} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, email: e.target.value } }))} /></div>
                <div><Label>Telefono</Label><Input value={form.customer.phone} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, phone: e.target.value } }))} /></div>
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
                  <div><Label>Lung. (m)</Label><Input type="number" step="0.1" value={form.boat.length} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, length: e.target.value } }))} /></div>
                  <div><Label>Larg. (m)</Label><Input type="number" step="0.1" value={form.boat.beam} onChange={e => setForm(f => ({ ...f, boat: { ...f.boat, beam: e.target.value } }))} /></div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 text-primary">Periodo</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dal *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>Al *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note aggiuntive..." />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBerth?.status === 'releasing' ? <Clock className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-red-500" />}
              Posto {selectedBerth?.label} — {selectedBerth?.status === 'releasing' ? 'In liberazione' : 'Occupato'}
            </DialogTitle>
          </DialogHeader>
          {selectedBerth?.current_occupation && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <p className="font-semibold">Cliente:</p>
                <p>{selectedBerth.current_occupation.customer?.name} {selectedBerth.current_occupation.customer?.surname}</p>
                <p className="text-xs text-muted-foreground">{selectedBerth.current_occupation.customer?.email} · {selectedBerth.current_occupation.customer?.phone}</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <p className="font-semibold">Imbarcazione:</p>
                <p>{selectedBerth.current_occupation.boat?.name || '—'} ({selectedBerth.current_occupation.boat?.registration || 'no targa'})</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBerth.current_occupation.boat?.type} · {selectedBerth.current_occupation.boat?.length}m × {selectedBerth.current_occupation.boat?.beam}m
                </p>
              </div>
              <div className="bg-muted p-3 rounded">
                <p className="font-semibold">Periodo:</p>
                <p>Dal <strong>{fmtDate(selectedBerth.current_occupation.start_date)}</strong> al <strong>{fmtDate(selectedBerth.current_occupation.end_date)}</strong></p>
              </div>
              {selectedBerth.current_occupation.notes && (
                <div className="bg-muted p-3 rounded">
                  <p className="font-semibold">Note:</p>
                  <p className="text-xs">{selectedBerth.current_occupation.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfo(false)}>Chiudi</Button>
            <Button variant="destructive" onClick={releaseBerth} disabled={submitting}>
              <Unlock className="w-4 h-4 mr-2" />Libera Posto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ COMPONENTE: PONTILE BIFACCIALE ============
function PontoonRow({ pontoonNum, data, onClick }) {
  if (!data) return null;
  const { left, right } = data;
  const maxBerths = Math.max(left.length, right.length);

  return (
    <div className="relative">
      {/* Etichetta pontile */}
      <div className="text-center mb-1">
        <Badge className="bg-primary text-white px-3 py-1 text-xs font-bold">PONTILE {pontoonNum}</Badge>
      </div>

      {/* Lato sinistro (sopra il pontile) */}
      <div className="flex justify-center gap-0.5 mb-1">
        {left.map(b => <BerthSlot key={b.id} berth={b} side="top" onClick={onClick} />)}
      </div>

      {/* Pontile */}
      <div className="relative bg-gradient-to-r from-stone-400 via-stone-500 to-stone-400 border border-stone-600 h-6 rounded shadow-md flex items-center justify-center">
        <div className="text-white text-[10px] font-bold tracking-widest opacity-80">━━━━━━━━━━━ PONTILE {pontoonNum} ━━━━━━━━━━━</div>
      </div>

      {/* Lato destro (sotto il pontile) */}
      <div className="flex justify-center gap-0.5 mt-1">
        {right.map(b => <BerthSlot key={b.id} berth={b} side="bottom" onClick={onClick} />)}
      </div>
    </div>
  );
}

// ============ COMPONENTE: SINGOLO POSTO BARCA ============
function BerthSlot({ berth, side, onClick }) {
  const colors = {
    free: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700',
    occupied: 'bg-red-500 hover:bg-red-600 border-red-700',
    releasing: 'bg-amber-400 hover:bg-amber-500 border-amber-600',
  };
  // Larghezza proporzionale alla lunghezza max
  const heightClass = berth.length_max >= 12 ? 'h-12' : berth.length_max >= 10 ? 'h-10' : berth.length_max >= 8 ? 'h-8' : 'h-7';
  const widthClass = 'w-7 md:w-8';

  return (
    <button
      onClick={() => onClick(berth)}
      title={`${berth.label} · max ${berth.length_max}m · ${berth.status === 'free' ? 'LIBERO' : berth.status === 'releasing' ? 'IN LIBERAZIONE' : 'OCCUPATO'}`}
      className={`${widthClass} ${heightClass} ${colors[berth.status] || colors.free} text-white rounded-sm border-2 transition-all hover:scale-110 hover:shadow-lg flex items-center justify-center text-[8px] font-bold cursor-pointer`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
    >
      {berth.position}
    </button>
  );
}
