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
  Upload, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
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
  const [zoom, setZoom] = useState(1);
  
  // Form occupazione (con foto barca opzionale)
  const initialForm = {
    customer: { name: '', surname: '', email: '', phone: '' },
    boat: { name: '', registration: '', type: 'motor', length: '', beam: '', photo_url: '' },
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  };
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      const mRes = await fetch(`/api/marinas/${slug}`);
      const m = await mRes.json();
      if (m?.error) { router.push('/posti-barca'); return; }
      setMarina(m);
      const bRes = await fetch(`/api/berths?marina_id=${m.id}`);
      const b = await bRes.json();
      setBerths(Array.isArray(b) ? b : []);
    } catch (e) {
      toast.error('Errore caricamento: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (slug) loadData(); /* eslint-disable-next-line */ }, [slug]);

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
    } catch (e) { toast.error('Errore upload: ' + e.message); }
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
      setForm(initialForm);
      await loadData();
    } catch (e) { toast.error(e.message); }
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
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200">
      <Anchor className="w-12 h-12 animate-pulse text-primary" />
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="border-2 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs uppercase tracking-wide">Totali</p>
          </CardContent></Card>
          <Card className="border-2 border-emerald-500 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.free}</p>
            <p className="text-xs uppercase tracking-wide">Liberi</p>
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
            <p className="text-2xl font-bold text-primary">{stats.total ? Math.round((stats.occupied + stats.releasing) / stats.total * 100) : 0}%</p>
            <p className="text-xs uppercase tracking-wide">Occupazione</p>
          </CardContent></Card>
        </div>

        {/* Legenda + Zoom */}
        <Card className="mb-4 shadow-sm"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold">Legenda:</span>
            <span className="flex items-center gap-1.5"><BoatIcon type="motor" status="free" small /> Libero</span>
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
                      <PontoonRealistic key={p} pontoonNum={p} data={pontoonsData[p]} onClick={handleBerthClick} />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBerth?.status === 'releasing' ? <Clock className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-red-500" />}
              Posto {selectedBerth?.label} — {selectedBerth?.status === 'releasing' ? 'In liberazione' : 'Occupato'}
            </DialogTitle>
          </DialogHeader>
          {selectedBerth?.current_occupation && (
            <div className="space-y-3 text-sm">
              {selectedBerth.current_occupation.boat?.photo_url && (
                <img src={selectedBerth.current_occupation.boat.photo_url} alt="Foto barca" className="w-full h-40 rounded object-cover border" />
              )}
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

// ============ COMPONENTE: BANCHINA (parte fissa, terraferma) ============
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
function PontoonRealistic({ pontoonNum, data, onClick }) {
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
        {left.map(b => <BerthSlotRealistic key={b.id} berth={b} side="top" onClick={onClick} />)}
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
        {right.map(b => <BerthSlotRealistic key={b.id} berth={b} side="bottom" onClick={onClick} />)}
      </div>
    </div>
  );
}

// ============ COMPONENTE: SINGOLO POSTO BARCA REALISTICO ============
function BerthSlotRealistic({ berth, side, onClick }) {
  const isOccupied = berth.status !== 'free';
  const boat = berth.current_occupation?.boat;
  const boatType = boat?.type || 'motor';
  
  // Larghezza dello slot proporzionale alla lunghezza max
  const slotWidth = berth.length_max >= 12 ? 60 : berth.length_max >= 10 ? 52 : berth.length_max >= 8 ? 46 : 40;
  const slotHeight = berth.length_max >= 12 ? 78 : berth.length_max >= 10 ? 70 : berth.length_max >= 8 ? 60 : 52;

  // Bordo dello slot (acqua tra finger pier)
  const slotBorderColor = berth.status === 'free' ? 'rgba(34,197,94,0.3)' : berth.status === 'releasing' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
  const slotBgColor = 'rgba(40,90,160,0.35)'; // acqua scura
  
  return (
    <button
      onClick={() => onClick(berth)}
      title={`${berth.label} · max ${berth.length_max}m · ${berth.status === 'free' ? 'LIBERO' : berth.status === 'releasing' ? 'IN LIBERAZIONE' : `OCCUPATO da ${boat?.name || ''}`}`}
      className="group relative cursor-pointer transition-all hover:scale-105 hover:z-10"
      style={{ width: `${slotWidth}px`, height: `${slotHeight}px` }}
    >
      {/* Slot di acqua (cornice) */}
      <div
        className="absolute inset-0 rounded-sm border-2 transition-all group-hover:shadow-2xl"
        style={{
          backgroundColor: slotBgColor,
          borderColor: slotBorderColor,
          borderStyle: berth.status === 'free' ? 'dashed' : 'solid',
          backgroundImage: berth.status === 'free' ? `
            repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 6px)
          ` : 'none',
        }}
      />
      
      {/* Numero posto (in alto) */}
      <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-white/80 bg-black/30 rounded px-1">
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
