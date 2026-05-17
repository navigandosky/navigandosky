'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, SkipBack, SkipForward, Flame, AlertTriangle, Gauge, Clock } from 'lucide-react';

const PLAYBACK_SPEEDS = [1, 2, 4, 8, 16, 32];

const fmtTime = (ts) => {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return '-'; }
};

export default function TripReplayDialog({ open, onOpenChange, route = [], speedAlerts = [], alertThreshold = 30, device, date }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const boatMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const alertMarkersRef = useRef([]);
  const animRef = useRef(null);
  const lastTickRef = useRef(0);

  const [LRef, setLRef] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8); // multiplo
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);

  const validRoute = useMemo(() => (route || []).filter(p => p?.lat != null && p?.lng != null), [route]);
  const positions = useMemo(() => validRoute.map(p => [p.lat, p.lng]), [validRoute]);
  const currentPoint = validRoute[Math.min(currentIdx, validRoute.length - 1)] || null;

  // === Init Leaflet (dinamico, solo client) ===
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Inietta Leaflet CSS via <link> (l'import dinamico CSS in Next.js client component non funziona affidabile)
      if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const Lmod = await import('leaflet');
      await import('leaflet.heat');
      if (cancelled) return;
      setLRef(Lmod.default || Lmod);
    })();
    return () => { cancelled = true; };
  }, [open]);

  // === Setup mappa al primo render ===
  useEffect(() => {
    if (!LRef || !containerRef.current || !open) return;
    if (mapRef.current) return; // già inizializzata

    const center = positions[0] || [40.9, 9.5];
    const map = LRef.map(containerRef.current, { zoomControl: true }).setView(center, 13);
    LRef.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;

    // Polyline base
    if (positions.length >= 2) {
      polylineRef.current = LRef.polyline(positions, { color: '#0891b2', weight: 4, opacity: 0.6 }).addTo(map);
      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }

    // Boat marker
    const boatIcon = LRef.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;background:#0891b2;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;">⛵</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    if (positions[0]) {
      boatMarkerRef.current = LRef.marker(positions[0], { icon: boatIcon, zIndexOffset: 1000 }).addTo(map);
    }

    return () => {
      // teardown when dialog closes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LRef, open]);

  // === Cleanup quando la dialog si chiude ===
  useEffect(() => {
    if (open) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    heatLayerRef.current = null;
    boatMarkerRef.current = null;
    polylineRef.current = null;
    alertMarkersRef.current = [];
    setCurrentIdx(0);
    setPlaying(false);
  }, [open]);

  // === Heatmap toggle ===
  useEffect(() => {
    if (!LRef || !mapRef.current) return;
    if (showHeatmap) {
      if (heatLayerRef.current) {
        mapRef.current.addLayer(heatLayerRef.current);
        return;
      }
      const heatPoints = validRoute.map(p => [p.lat, p.lng, Math.min(1, (p.speed || 1) / 50)]);
      heatLayerRef.current = LRef.heatLayer(heatPoints, {
        radius: 22,
        blur: 18,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' },
      });
      heatLayerRef.current.addTo(mapRef.current);
    } else if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
    }
  }, [LRef, showHeatmap, validRoute]);

  // === Alert markers ===
  useEffect(() => {
    if (!LRef || !mapRef.current) return;
    // rimuovi vecchi
    alertMarkersRef.current.forEach(m => mapRef.current.removeLayer(m));
    alertMarkersRef.current = [];
    if (!showAlerts) return;

    (speedAlerts || []).forEach((a, idx) => {
      const lat = (a.start_lat + a.end_lat) / 2;
      const lng = (a.start_lng + a.end_lng) / 2;
      const icon = LRef.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:#dc2626;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;">⚠</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = LRef.marker([lat, lng], { icon, zIndexOffset: 500 })
        .bindPopup(
          `<div style="font-size:12px;">
            <strong>Alert velocità #${idx + 1}</strong><br/>
            Max: <strong style="color:#dc2626">${a.max_speed.toFixed(1)} km/h</strong><br/>
            Soglia: ${alertThreshold} km/h<br/>
            Da ${fmtTime(a.start_ts)} a ${fmtTime(a.end_ts)}<br/>
            ${a.points} punti consecutivi
          </div>`
        );
      marker.addTo(mapRef.current);
      alertMarkersRef.current.push(marker);
    });
  }, [LRef, speedAlerts, showAlerts, alertThreshold]);

  // === Aggiorna posizione marker barca al cambio indice ===
  useEffect(() => {
    if (!boatMarkerRef.current || !currentPoint) return;
    boatMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);
    if (mapRef.current && playing) {
      mapRef.current.panTo([currentPoint.lat, currentPoint.lng], { animate: true, duration: 0.3 });
    }
  }, [currentIdx, currentPoint, playing]);

  // === Animation loop ===
  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    if (currentIdx >= validRoute.length - 1) {
      setPlaying(false);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now) => {
      const dt = now - lastTickRef.current;
      // Avanza 1 punto ogni (1000 / speed) ms — speed=1 → 1 punto/sec; speed=32 → 32 punti/sec
      if (dt >= 1000 / speed) {
        lastTickRef.current = now;
        setCurrentIdx((i) => {
          const next = i + 1;
          if (next >= validRoute.length - 1) {
            setPlaying(false);
            return validRoute.length - 1;
          }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, speed, validRoute.length, currentIdx]);

  if (!open) return null;

  const totalPoints = validRoute.length;
  const progressPct = totalPoints > 0 ? Math.round((currentIdx / Math.max(1, totalPoints - 1)) * 100) : 0;
  const currentSpeed = currentPoint?.speed || 0;
  const isAlertSpeed = currentSpeed > alertThreshold;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-cyan-600" />
            Replay Viaggio — {device?.resource?.name || 'Dispositivo'}
          </DialogTitle>
          <DialogDescription>
            {date ? new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            {' · '}
            <span>{totalPoints} punti GPS</span>
            {speedAlerts?.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {speedAlerts.length} alert
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {totalPoints < 2 ? (
          <div className="py-10 text-center text-muted-foreground">
            Rotta troppo corta o vuota: impossibile riprodurre.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mappa */}
            <div ref={containerRef} className="w-full h-[480px] rounded-lg border bg-gray-50" />

            {/* KPI live */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Orario</div>
                <div className="text-lg font-bold font-mono">{fmtTime(currentPoint?.timestamp)}</div>
              </div>
              <div className={`border rounded-lg p-3 ${isAlertSpeed ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> Velocità</div>
                <div className={`text-lg font-bold ${isAlertSpeed ? 'text-red-600' : ''}`}>
                  {currentSpeed.toFixed(1)} km/h
                  {isAlertSpeed && <AlertTriangle className="inline w-4 h-4 ml-1" />}
                </div>
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-muted-foreground">Posizione</div>
                <div className="text-sm font-mono">
                  {currentPoint?.lat?.toFixed(5)}, {currentPoint?.lng?.toFixed(5)}
                </div>
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-muted-foreground">Progresso</div>
                <div className="text-lg font-bold">{progressPct}% <span className="text-xs text-muted-foreground">({currentIdx + 1}/{totalPoints})</span></div>
              </div>
            </div>

            {/* Slider scrub */}
            <div className="px-1">
              <Slider
                min={0}
                max={Math.max(0, totalPoints - 1)}
                step={1}
                value={[currentIdx]}
                onValueChange={(v) => { setPlaying(false); setCurrentIdx(v[0]); }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPlaying(false); setCurrentIdx(0); }}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => {
                    if (currentIdx >= totalPoints - 1) setCurrentIdx(0);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="ml-2">{playing ? 'Pausa' : 'Play'}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setPlaying(false); setCurrentIdx(totalPoints - 1); }}>
                  <SkipForward className="w-4 h-4" />
                </Button>

                {/* Speed selector */}
                <div className="ml-2 flex items-center gap-1 border rounded-md p-1 bg-white">
                  <span className="text-xs text-muted-foreground px-1">Velocità</span>
                  {PLAYBACK_SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`text-xs px-2 py-1 rounded ${speed === s ? 'bg-cyan-600 text-white' : 'hover:bg-gray-100'}`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-white">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="heatmap-toggle" className="text-sm cursor-pointer">Heatmap</Label>
                  <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
                </div>
                <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-white">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <Label htmlFor="alerts-toggle" className="text-sm cursor-pointer">Alert ({speedAlerts?.length || 0})</Label>
                  <Switch id="alerts-toggle" checked={showAlerts} onCheckedChange={setShowAlerts} />
                </div>
              </div>
            </div>

            {/* Lista alert */}
            {speedAlerts && speedAlerts.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-900">Avvisi velocità anomala</span>
                  <Badge variant="outline" className="ml-auto">Soglia: {alertThreshold} km/h</Badge>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {speedAlerts.map((a, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setPlaying(false); setCurrentIdx(a.start_index || 0); }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 border-b text-left text-sm"
                    >
                      <div className="font-mono text-xs text-muted-foreground w-12">#{idx + 1}</div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {fmtTime(a.start_ts)} → {fmtTime(a.end_ts)}
                        </div>
                        <div className="text-xs text-muted-foreground">{a.points} punti consecutivi</div>
                      </div>
                      <div className="font-bold text-red-600">
                        {a.max_speed.toFixed(1)} km/h
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
