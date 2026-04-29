'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Anchor, ArrowLeft, MapPin, Ship, Sailboat, Lock, RefreshCw, ZoomIn, ZoomOut, Maximize2, ClipboardList, Eye
} from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

export default function MarinaMapPublicPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [marina, setMarina] = useState(null);
  const [berths, setBerths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBerth, setSelectedBerth] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);

  const loadData = async () => {
    try {
      const mRes = await fetch(`/api/marinas/${slug}`);
      const m = await mRes.json();
      if (m?.error) { router.push('/posti-barca'); return; }
      setMarina(m);
      const bRes = await fetch(`/api/berths?marina_id=${m.id}`);
      const b = await bRes.json();
      setBerths(Array.isArray(b) ? b : []);
    } catch (e) { /* */ }
    finally { setLoading(false); }
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
    const occupied = berths.filter(b => b.status !== 'free').length;
    return { free, occupied, total: berths.length };
  }, [berths]);

  const handleBerthClick = (berth) => {
    setSelectedBerth(berth);
    setShowInfo(true);
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
                <MapPin className="w-8 h-8" /> Stato Posti Barca — {marina?.name}
              </h1>
              <p className="text-white/90 mt-1">Vista pubblica · Disponibilità in tempo reale</p>
            </div>
            <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats pubblici - solo libere/occupati */}
        <div className="grid grid-cols-3 gap-3 mb-4 max-w-2xl mx-auto">
          <Card className="border-2"><CardContent className="p-3 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs uppercase tracking-wide">Totali</p>
          </CardContent></Card>
          <Card className="border-2 border-emerald-500"><CardContent className="p-3 text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats.free}</p>
            <p className="text-xs uppercase tracking-wide">Disponibili</p>
          </CardContent></Card>
          <Card className="border-2 border-red-500"><CardContent className="p-3 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
            <p className="text-xs uppercase tracking-wide">Occupati</p>
          </CardContent></Card>
        </div>

        {/* Legenda + zoom */}
        <Card className="mb-4 shadow-sm"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold">Legenda:</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 inline-block border-2 border-emerald-700"></span>Disponibile</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500 inline-block border-2 border-red-700"></span>Occupato</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}><ZoomOut className="w-3 h-3" /></Button>
            <span className="text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}><ZoomIn className="w-3 h-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => setZoom(1)}><Maximize2 className="w-3 h-3" /></Button>
          </div>
        </CardContent></Card>

        {/* Mappa porto pubblica */}
        <Card className="overflow-hidden shadow-xl border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-primary text-white py-3">
            <CardTitle className="flex items-center gap-2 text-base"><Ship className="w-5 h-5" />{marina?.name} — 3 Pontili Bifacciali</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                <div className="relative mx-auto" style={{ maxWidth: '1200px' }}>
                  {/* Banchina */}
                  <div
                    className="border-2 border-stone-700 rounded-lg shadow-2xl py-3 text-center font-bold text-sm tracking-widest uppercase"
                    style={{
                      background: 'linear-gradient(180deg, #d4a574 0%, #b8865a 50%, #9a6b3f 100%)',
                      color: '#3d2817',
                    }}
                  >
                    ⚓ BANCHINA PRINCIPALE ⚓
                  </div>

                  <div className="space-y-12 mt-8">
                    {[1, 2, 3].map(p => (
                      <PontoonRow key={p} pontoonNum={p} data={pontoonsData[p]} onClick={handleBerthClick} />
                    ))}
                  </div>

                  <div className="mt-12 text-center">
                    <p className="text-white/80 text-xs italic">⛵ MARE APERTO ⛵</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground italic mt-6">
          Per richiedere un posto barca, torna alla pagina della marina e usa "Preview Posto Barca".
        </p>
      </div>

      {/* Dialog: Info posto pubblico (NIENTE prezzi/cliente/pagamento) */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBerth?.status === 'free' ? <span className="text-emerald-500">🟢</span> : <Lock className="w-5 h-5 text-red-500" />}
              Posto {selectedBerth?.label}
            </DialogTitle>
            <DialogDescription>
              {selectedBerth?.status === 'free' ? 'Disponibile' : 'Non disponibile'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Specifiche posto</p>
                <p className="font-medium">Pontile {selectedBerth?.pontoon} · Lato {selectedBerth?.side === 'left' ? 'Sinistro' : 'Destro'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lunghezza max: <strong>{selectedBerth?.length_max}m</strong> · Larghezza max: <strong>{selectedBerth?.beam_max?.toFixed(1)}m</strong>
                </p>
              </CardContent>
            </Card>

            {selectedBerth?.status === 'free' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-800 text-sm">
                <p className="font-semibold">✓ Posto disponibile</p>
                <p className="text-xs">Per riservare questo posto barca, richiedi un preventivo personalizzato.</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 text-sm">
                <p className="font-semibold">Posto attualmente non disponibile</p>
                {selectedBerth?.current_occupation?.end_date && (
                  <p className="text-xs">Si libera approssimativamente il <strong>{fmtDate(selectedBerth.current_occupation.end_date)}</strong></p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfo(false)}>Chiudi</Button>
            {selectedBerth?.status === 'free' && (
              <Button onClick={() => { setShowInfo(false); router.push(`/posti-barca/${slug}`); }}>
                <ClipboardList className="w-4 h-4 mr-2" />Richiedi Preventivo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ COMPONENTE: PONTILE (read-only) ============
function PontoonRow({ pontoonNum, data, onClick }) {
  if (!data) return null;
  const { left, right } = data;

  return (
    <div className="relative">
      <div className="text-center mb-2">
        <Badge className="bg-stone-800 text-amber-100 px-3 py-1 text-xs font-bold border border-amber-700">
          PONTILE {pontoonNum}
        </Badge>
      </div>

      <div className="flex justify-center gap-1 mb-1">
        {left.map(b => <BerthSlot key={b.id} berth={b} side="top" onClick={onClick} />)}
      </div>

      <div
        className="relative rounded-md shadow-lg border border-stone-700"
        style={{
          background: 'linear-gradient(180deg, #c9956a 0%, #a67849 50%, #8b5e35 100%)',
          height: '32px',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold text-[10px] tracking-widest opacity-70">
          ════════════ PONTILE {pontoonNum} ════════════
        </div>
      </div>

      <div className="flex justify-center gap-1 mt-1">
        {right.map(b => <BerthSlot key={b.id} berth={b} side="bottom" onClick={onClick} />)}
      </div>
    </div>
  );
}

// ============ COMPONENTE: SINGOLO POSTO (read-only, no boat data) ============
function BerthSlot({ berth, side, onClick }) {
  const slotWidth = berth.length_max >= 12 ? 60 : berth.length_max >= 10 ? 52 : berth.length_max >= 8 ? 46 : 40;
  const slotHeight = berth.length_max >= 12 ? 78 : berth.length_max >= 10 ? 70 : berth.length_max >= 8 ? 60 : 52;

  const slotBorderColor = berth.status === 'free' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)';
  const slotBgColor = berth.status === 'free' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.35)';
  
  return (
    <button
      onClick={() => onClick(berth)}
      title={`${berth.label} · max ${berth.length_max}m · ${berth.status === 'free' ? 'DISPONIBILE' : 'OCCUPATO'}`}
      className="group relative cursor-pointer transition-all hover:scale-105 hover:z-10"
      style={{ width: `${slotWidth}px`, height: `${slotHeight}px` }}
    >
      <div
        className="absolute inset-0 rounded-sm border-2 transition-all group-hover:shadow-2xl"
        style={{
          backgroundColor: slotBgColor,
          borderColor: slotBorderColor,
          borderStyle: berth.status === 'free' ? 'dashed' : 'solid',
          backgroundImage: berth.status === 'free' ? `
            repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 6px)
          ` : 'none',
        }}
      />
      
      <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-white/80 bg-black/30 rounded px-1">
        {berth.position}
      </span>
      
      <div className={`absolute left-1/2 ${side === 'top' ? 'top-1' : 'bottom-1'} -translate-x-1/2 flex items-center justify-center`}
           style={{ width: slotWidth - 8, height: slotHeight - 12 }}>
        {berth.status !== 'free' && (
          <Lock className="w-5 h-5 text-white/90 drop-shadow" />
        )}
      </div>
    </button>
  );
}
