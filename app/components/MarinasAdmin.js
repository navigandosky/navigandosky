'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Anchor, Plus, Edit, Trash2, Save, X, AlertCircle, Ship, Lock, Unlock, RefreshCw, Eye, MapPin, FileText, Map as MapIcon, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  { num: '1', name: 'Gennaio' }, { num: '2', name: 'Febbraio' }, { num: '3', name: 'Marzo' },
  { num: '4', name: 'Aprile' }, { num: '5', name: 'Maggio' }, { num: '6', name: 'Giugno' },
  { num: '7', name: 'Luglio' }, { num: '8', name: 'Agosto' }, { num: '9', name: 'Settembre' },
  { num: '10', name: 'Ottobre' }, { num: '11', name: 'Novembre' }, { num: '12', name: 'Dicembre' },
];

const fmtPrice = (p) => (p ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

// =============================================================
// SECTION: MARINAS MANAGER (Super Admin)
// =============================================================
export function MarinasManager() {
  const [marinas, setMarinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marinas');
      const data = await res.json();
      setMarinas(Array.isArray(data) ? data : []);
    } catch (e) { toast.error('Errore caricamento marine'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Marine ({marinas.length})</h2>
        <Button onClick={() => setEditing({ pricing: { annual: [], daily_by_month: {}, monthly_by_month: {}, summer_flat: [], yard_services: {} }, is_active: true })}>
          <Plus className="w-4 h-4 mr-2" />Nuova Marina
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground"><Anchor className="w-8 h-8 mx-auto animate-pulse" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marinas.map(m => (
            <Card key={m.id} className="overflow-hidden hover:shadow-lg transition">
              <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 relative">
                {m.cover_image && <img src={m.cover_image} alt={m.name} className="w-full h-full object-cover" />}
                <Badge className="absolute top-2 right-2 bg-white text-primary">{m.total_berths || 0} posti</Badge>
                {!m.is_active && <Badge className="absolute top-2 left-2 bg-red-500">Non attiva</Badge>}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{m.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{m.location}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.short_description || m.description?.slice(0, 80)}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(m)}>
                    <Edit className="w-3 h-3 mr-1" />Modifica
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/posti-barca/${m.slug}`, '_blank')}>
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && <MarinaEditDialog marina={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

// =============================================================
// MARINA EDIT DIALOG (with tariff editor)
// =============================================================
function MarinaEditDialog({ marina, onClose, onSaved }) {
  const [form, setForm] = useState(marina);
  const [saving, setSaving] = useState(false);
  const isNew = !marina.id;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updatePricing = (k, v) => setForm(f => ({ ...f, pricing: { ...f.pricing, [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      const url = isNew ? '/api/marinas' : `/api/marinas/${marina.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(isNew ? 'Marina creata!' : 'Marina aggiornata!');
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nuova Marina' : `Modifica: ${marina.name}`}</DialogTitle>
          <DialogDescription>Gestisci dati e tariffe della marina</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="info">Info Generali</TabsTrigger>
            <TabsTrigger value="annual">Tariffe Stagionali (Giu-Set)</TabsTrigger>
            <TabsTrigger value="daily">Tariffe Giornaliere</TabsTrigger>
            <TabsTrigger value="monthly">Tariffe Mensili</TabsTrigger>
            <TabsTrigger value="extra">Servizi Extra</TabsTrigger>
            <TabsTrigger value="payments">💳 Pagamenti</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.name || ''} onChange={e => update('name', e.target.value)} /></div>
              <div><Label>Slug</Label><Input value={form.slug || ''} onChange={e => update('slug', e.target.value)} placeholder="bosa-marina" /></div>
              <div><Label>Località</Label><Input value={form.location || ''} onChange={e => update('location', e.target.value)} /></div>
              <div><Label>Indirizzo</Label><Input value={form.address || ''} onChange={e => update('address', e.target.value)} /></div>
              <div><Label>Telefono</Label><Input value={form.contact_phone || ''} onChange={e => update('contact_phone', e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp || ''} onChange={e => update('contact_whatsapp', e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.contact_email || ''} onChange={e => update('contact_email', e.target.value)} /></div>
              <div><Label>Posti barca totali</Label><Input type="number" value={form.total_berths || 0} onChange={e => update('total_berths', Number(e.target.value))} /></div>
              <div><Label>Latitudine</Label><Input type="number" step="0.0001" value={form.latitude || ''} onChange={e => update('latitude', parseFloat(e.target.value))} /></div>
              <div><Label>Longitudine</Label><Input type="number" step="0.0001" value={form.longitude || ''} onChange={e => update('longitude', parseFloat(e.target.value))} /></div>
              <div className="col-span-2 space-y-2">
                <Label>Immagine di copertina</Label>
                <div className="flex items-start gap-3">
                  {form.cover_image ? (
                    <div className="relative">
                      <img src={form.cover_image} alt="Cover" className="w-32 h-32 rounded-lg border-2 object-cover" />
                      <button
                        type="button"
                        onClick={() => update('cover_image', '')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      ><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <ImageUploader onUpload={(url) => update('cover_image', url)} />
                    <Input value={form.cover_image || ''} onChange={e => update('cover_image', e.target.value)} placeholder="oppure incolla URL immagine..." className="text-xs" />
                    <p className="text-[10px] text-muted-foreground">JPG/PNG max 5MB. Verrà mostrata come banner principale.</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Galleria immagini aggiuntive</Label>
                <ImageGalleryUploader images={form.images || []} onChange={(imgs) => update('images', imgs)} />
              </div>

              {/* Google Maps Preview */}
              {(form.latitude && form.longitude) && (
                <div className="col-span-2 space-y-1">
                  <Label className="flex items-center gap-1"><MapIcon className="w-4 h-4" />Anteprima posizione</Label>
                  <div className="rounded-lg overflow-hidden border-2 shadow-sm">
                    <iframe
                      title="Marina position"
                      width="100%"
                      height="200"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.longitude - 0.01}%2C${form.latitude - 0.01}%2C${form.longitude + 0.01}%2C${form.latitude + 0.01}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`}
                      style={{ border: 0 }}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  ><MapIcon className="w-3 h-3" />Apri in Google Maps</a>
                </div>
              )}
              <div className="col-span-2"><Label>Descrizione breve</Label><Input value={form.short_description || ''} onChange={e => update('short_description', e.target.value)} /></div>
              <div className="col-span-2"><Label>Descrizione completa</Label><Textarea rows={4} value={form.description || ''} onChange={e => update('description', e.target.value)} /></div>
              <div className="col-span-2"><Label>Note (una per riga)</Label><Textarea rows={3} value={(form.pricing_notes || []).join('\n')} onChange={e => update('pricing_notes', e.target.value.split('\n').filter(Boolean))} /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active !== false} onChange={e => update('is_active', e.target.checked)} />
                Marina attiva (visibile nel catalogo pubblico)
              </label>
            </div>
          </TabsContent>

          <TabsContent value="annual" className="pt-3">
            <TariffTable
              title="Tariffe Stagionali per lunghezza (Giugno-Settembre)"
              hint="Tariffa fissa stagionale di 4 mesi (giu-set). Si applica automaticamente quando la permanenza copre la stagione estiva oppure dura ≥ 4 mesi nei mesi giu-ott."
              tiers={form.pricing?.annual || []}
              onChange={(tiers) => updatePricing('annual', tiers)}
            />
            <div className="mt-6">
              <TariffTable
                title="Prezzo speciale per nuovi utenti - pagamento anticipato"
                hint="Sconto promozionale per nuovi clienti che pagano in anticipo. Si applica nel periodo estivo (giu-set)."
                tiers={form.pricing?.summer_flat || []}
                onChange={(tiers) => updatePricing('summer_flat', tiers)}
              />
            </div>
          </TabsContent>

          <TabsContent value="daily" className="pt-3">
            <MonthTariffEditor
              title="Tariffe GIORNALIERE per mese"
              data={form.pricing?.daily_by_month || {}}
              onChange={(d) => updatePricing('daily_by_month', d)}
            />
          </TabsContent>

          <TabsContent value="monthly" className="pt-3">
            <MonthTariffEditor
              title="Tariffe MENSILI per mese"
              data={form.pricing?.monthly_by_month || {}}
              onChange={(d) => updatePricing('monthly_by_month', d)}
            />
          </TabsContent>

          <TabsContent value="extra" className="pt-3 space-y-4">
            {[
              { key: 'parking_daily', label: 'Sosta carrello/piazzale (giornaliera)' },
              { key: 'parking_monthly', label: 'Sosta carrello/piazzale (mensile)' },
              { key: 'launch', label: 'Alaggio o Varo a movimento' },
              { key: 'hull_wash', label: 'Lavaggio carena con pulivapor' },
              { key: 'antifouling_1', label: 'Antivegetativa 1 mano' },
              { key: 'antifouling_2', label: 'Antivegetativa 2 mani' },
            ].map(svc => (
              <TariffTable
                key={svc.key}
                title={svc.label}
                hint=""
                tiers={form.pricing?.yard_services?.[svc.key] || []}
                onChange={(tiers) => updatePricing('yard_services', { ...(form.pricing?.yard_services || {}), [svc.key]: tiers })}
              />
            ))}
          </TabsContent>

          {/* ====================== TAB PAGAMENTI ====================== */}
          <TabsContent value="payments" className="pt-3 space-y-4">
            <PaymentsConfigEditor
              config={form.payment_config || {}}
              onChange={(cfg) => update('payment_config', cfg)}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={save} disabled={saving || !form.name}>
            {saving ? 'Salvo...' : <><Save className="w-4 h-4 mr-2" />Salva</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// TARIFF TABLE (single list of length/price tiers)
// =============================================================
function TariffTable({ title, hint, tiers, onChange }) {
  const [local, setLocal] = useState(tiers);
  useEffect(() => { setLocal(tiers); }, [tiers]);

  const updateTier = (i, field, value) => {
    const next = [...local];
    next[i] = { ...next[i], [field]: parseFloat(value) || 0 };
    setLocal(next);
    onChange(next);
  };
  const addTier = () => {
    const last = local[local.length - 1];
    const next = [...local, { length: (last?.length || 0) + 1, price: 0 }];
    setLocal(next); onChange(next);
  };
  const removeTier = (i) => {
    const next = local.filter((_, idx) => idx !== i);
    setLocal(next); onChange(next);
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={addTier}><Plus className="w-3 h-3 mr-1" />Aggiungi</Button>
      </div>
      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-3 text-center">Nessuna tariffa. Aggiungi righe per definire prezzi per lunghezza.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {local.map((t, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-xs">fino a</span>
              <Input className="h-7 text-xs" type="number" step="0.5" value={t.length || 0} onChange={e => updateTier(i, 'length', e.target.value)} placeholder="m" />
              <span className="text-xs">m →</span>
              <Input className="h-7 text-xs" type="number" step="0.01" value={t.price || 0} onChange={e => updateTier(i, 'price', e.target.value)} placeholder="€" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeTier(i)}>
                <X className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================
// MONTH TARIFF EDITOR (12 months × N lengths)
// =============================================================
function MonthTariffEditor({ title, data, onChange }) {
  const [selectedMonth, setSelectedMonth] = useState('7');
  const monthData = data[selectedMonth] || [];

  const updateMonth = (newTiers) => {
    const next = { ...data, [selectedMonth]: newTiers };
    onChange(next);
  };

  const copyToAll = () => {
    if (!confirm(`Copiare le tariffe di ${MONTHS.find(m => m.num === selectedMonth)?.name} a TUTTI i mesi?`)) return;
    const next = {};
    MONTHS.forEach(m => { next[m.num] = [...monthData]; });
    onChange(next);
    toast.success('Tariffe copiate a tutti i mesi');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-base">{title}</h3>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Mese:</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.num} value={m.num}>
                  {m.name} {data[m.num]?.length > 0 && '✓'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={copyToAll} disabled={monthData.length === 0}>
            <RefreshCw className="w-3 h-3 mr-1" />Copia a tutti
          </Button>
        </div>
      </div>
      <TariffTable
        title={`${MONTHS.find(m => m.num === selectedMonth)?.name}`}
        hint="Le tariffe vengono applicate solo ai giorni che ricadono in questo mese."
        tiers={monthData}
        onChange={updateMonth}
      />
    </div>
  );
}

// =============================================================
// SECTION: BERTHS MANAGER (Super Admin)
// =============================================================
export function BerthsManager({ marinaFilterId } = {}) {
  const [marinas, setMarinas] = useState([]);
  const [selectedMarinaId, setSelectedMarinaId] = useState('');
  const [berths, setBerths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedConfig, setSeedConfig] = useState({ pontoons: 3, berths_per_side: 20 });
  const [filter, setFilter] = useState('all'); // all|free|occupied|releasing

  useEffect(() => {
    fetch('/api/marinas').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setMarinas(arr);
      // Se è impostato un filtro globale e valido, usalo
      if (marinaFilterId && marinaFilterId !== 'ALL' && arr.find(m => m.id === marinaFilterId)) {
        setSelectedMarinaId(marinaFilterId);
      } else if (arr?.[0]?.id) {
        setSelectedMarinaId(arr[0].id);
      }
    });
  }, [marinaFilterId]);

  // Quando cambia il filtro globale (e non è 'ALL'), forza la selezione
  useEffect(() => {
    if (marinaFilterId && marinaFilterId !== 'ALL' && marinas.find(m => m.id === marinaFilterId)) {
      setSelectedMarinaId(marinaFilterId);
    }
  }, [marinaFilterId, marinas]);

  const loadBerths = useCallback(async () => {
    if (!selectedMarinaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/berths?marina_id=${selectedMarinaId}`);
      const data = await res.json();
      setBerths(Array.isArray(data) ? data : []);
    } catch (e) { toast.error('Errore caricamento'); }
    finally { setLoading(false); }
  }, [selectedMarinaId]);

  useEffect(() => { loadBerths(); }, [loadBerths]);

  const releaseBerth = async (b) => {
    if (!confirm(`Liberare il posto ${b.label}?`)) return;
    try {
      const res = await fetch(`/api/berths/${b.id}/release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('errore');
      toast.success('Posto liberato');
      loadBerths();
    } catch (e) { toast.error(e.message); }
  };

  const seedLayout = async () => {
    if (!confirm(`Generare layout di ${seedConfig.pontoons * 2 * seedConfig.berths_per_side} posti? I posti esistenti verranno cancellati.`)) return;
    try {
      const res = await fetch('/api/berths/seed-layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marina_id: selectedMarinaId, ...seedConfig }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Layout creato: ${data.count} posti`);
      setShowSeed(false);
      loadBerths();
    } catch (e) { toast.error(e.message); }
  };

  const filtered = berths.filter(b => filter === 'all' || b.status === filter);
  const stats = {
    total: berths.length,
    free: berths.filter(b => b.status === 'free').length,
    occupied: berths.filter(b => b.status === 'occupied').length,
    releasing: berths.filter(b => b.status === 'releasing').length,
  };
  const selectedMarina = marinas.find(m => m.id === selectedMarinaId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label>Marina:</Label>
          <Select value={selectedMarinaId} onValueChange={setSelectedMarinaId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Seleziona marina" /></SelectTrigger>
            <SelectContent>
              {marinas.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBerths}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
          <Button variant="outline" onClick={() => selectedMarina && window.open(`/posti-barca/${selectedMarina.slug}/mappa`, '_blank')} disabled={!selectedMarina}>
            <MapIcon className="w-4 h-4 mr-2" />Apri Mappa Gestione
          </Button>
          <Button variant="outline" onClick={() => selectedMarina && window.open(`/posti-barca/${selectedMarina.slug}/mappa-pubblica`, '_blank')} disabled={!selectedMarina}>
            <MapIcon className="w-4 h-4 mr-2" />Apri Mappa Pubblica
          </Button>
          <Button onClick={() => setShowSeed(true)} disabled={!selectedMarinaId}>
            <Plus className="w-4 h-4 mr-2" />Genera Layout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-2"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs uppercase">Totali</p>
        </CardContent></Card>
        <Card className="border-2 border-emerald-500 cursor-pointer" onClick={() => setFilter('free')}><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.free}</p>
          <p className="text-xs uppercase">Liberi</p>
        </CardContent></Card>
        <Card className="border-2 border-amber-500 cursor-pointer" onClick={() => setFilter('releasing')}><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats.releasing}</p>
          <p className="text-xs uppercase">In liberazione</p>
        </CardContent></Card>
        <Card className="border-2 border-red-500 cursor-pointer" onClick={() => setFilter('occupied')}><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
          <p className="text-xs uppercase">Occupati</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-sm">Filtro stato:</Label>
        {['all', 'free', 'releasing', 'occupied'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s === 'all' ? 'Tutti' : s === 'free' ? 'Liberi' : s === 'releasing' ? 'In liberazione' : 'Occupati'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8"><Anchor className="w-8 h-8 mx-auto animate-pulse text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Posto</th>
                <th className="p-2 text-left">Pontile</th>
                <th className="p-2 text-left">Lato</th>
                <th className="p-2 text-left">Lung. max</th>
                <th className="p-2 text-left">Stato</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Barca</th>
                <th className="p-2 text-left">Periodo</th>
                <th className="p-2 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono font-semibold">{b.label}</td>
                  <td className="p-2">P{b.pontoon}</td>
                  <td className="p-2">{b.side === 'left' ? 'SX' : 'DX'}</td>
                  <td className="p-2">{b.length_max}m</td>
                  <td className="p-2">
                    <Badge className={
                      b.status === 'free' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                      b.status === 'releasing' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      'bg-red-100 text-red-700 border-red-300'
                    }>
                      {b.status === 'free' ? 'Libero' : b.status === 'releasing' ? 'In liberazione' : 'Occupato'}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs">
                    {b.current_occupation ? `${b.current_occupation.customer?.name} ${b.current_occupation.customer?.surname || ''}` : '—'}
                  </td>
                  <td className="p-2 text-xs">
                    {b.current_occupation ? `${b.current_occupation.boat?.name || '—'} (${b.current_occupation.boat?.length || 0}m)` : '—'}
                  </td>
                  <td className="p-2 text-xs">
                    {b.current_occupation ? `${new Date(b.current_occupation.start_date).toLocaleDateString('it-IT')} → ${new Date(b.current_occupation.end_date).toLocaleDateString('it-IT')}` : '—'}
                  </td>
                  <td className="p-2">
                    {b.current_occupation && (
                      <Button size="sm" variant="outline" onClick={() => releaseBerth(b)}>
                        <Unlock className="w-3 h-3 mr-1" />Libera
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">Nessun posto barca trovato per i filtri selezionati.</p>
          )}
        </div>
      )}

      <Dialog open={showSeed} onOpenChange={setShowSeed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Genera Layout Posti Barca</DialogTitle>
            <DialogDescription>Crea automaticamente la disposizione dei posti per la marina selezionata.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Numero pontili</Label>
              <Input type="number" min="1" max="10" value={seedConfig.pontoons} onChange={e => setSeedConfig(c => ({ ...c, pontoons: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Posti per lato (per ogni pontile)</Label>
              <Input type="number" min="1" max="50" value={seedConfig.berths_per_side} onChange={e => setSeedConfig(c => ({ ...c, berths_per_side: Number(e.target.value) }))} />
            </div>
            <div className="bg-amber-50 p-3 rounded text-xs text-amber-800 border border-amber-200">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Verranno creati <strong>{seedConfig.pontoons * 2 * seedConfig.berths_per_side}</strong> posti totali. <strong>I posti esistenti per questa marina saranno cancellati</strong>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeed(false)}>Annulla</Button>
            <Button onClick={seedLayout}>Genera</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================
// IMAGE UPLOADER (Sfoglia & Carica)
// =============================================================
function ImageUploader({ onUpload }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [base64] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const url = data.urls?.[0];
      if (url) { onUpload(url); toast.success('Immagine caricata!'); }
    } catch (err) { toast.error('Errore upload: ' + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? 'Carico...' : <><Upload className="w-3 h-3 mr-1" />Sfoglia e carica</>}
      </Button>
    </>
  );
}

// =============================================================
// IMAGE GALLERY UPLOADER (galleria multipla)
// =============================================================
function ImageGalleryUploader({ images, onChange }) {
  const handleAdd = (url) => onChange([...(images || []), url]);
  const handleRemove = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(images || []).map((img, i) => (
          <div key={i} className="relative">
            <img src={img} alt="" className="w-20 h-20 rounded border-2 object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
            ><X className="w-3 h-3" /></button>
          </div>
        ))}
        <div className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center bg-muted/30">
          <ImageUploader onUpload={handleAdd} />
        </div>
      </div>
      {(images || []).length > 0 && <p className="text-[10px] text-muted-foreground">{images.length} immagine/i in galleria</p>}
    </div>
  );
}


// =====================================================================
// PaymentsConfigEditor — configurazione SumUp/Stripe + metodi manuali
// =====================================================================
function PaymentsConfigEditor({ config, onChange }) {
  const c = config || {};
  const provider = c.online_provider || 'none';
  const set = (k, v) => onChange({ ...c, [k]: v });

  const adminMethods = c.admin_methods || { contanti: true, bonifico: true, pos: true, carta: true, assegno: true };
  const setAdminMethod = (k, v) => set('admin_methods', { ...adminMethods, [k]: v });

  return (
    <div className="space-y-5">
      {/* Banner info */}
      <div className="bg-blue-50 border border-blue-300 rounded p-3 text-sm flex items-start gap-2">
        <div className="text-blue-600 mt-0.5">💳</div>
        <div className="text-blue-900">
          Configurazione dei metodi di pagamento per questa marina (multi-tenant).
          Le impostazioni si applicano automaticamente al checkout pubblico (utente non loggato) e al registro contratti (admin loggato).
        </div>
      </div>

      {/* Online Provider */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div>
          <h3 className="font-semibold text-sm">Pagamenti Online (utente non loggato · checkout B2C)</h3>
          <p className="text-xs text-muted-foreground">Provider per accettare pagamenti online dal pubblico (acconto 30% prenotazioni).</p>
        </div>
        <div>
          <Label className="text-xs">Provider</Label>
          <select
            className="w-full border rounded h-9 px-2 text-sm"
            value={provider}
            onChange={(e) => set('online_provider', e.target.value)}
          >
            <option value="none">Nessuno (pagamento solo offline)</option>
            <option value="sumup">SumUp (POS Web)</option>
            <option value="stripe">Stripe</option>
          </select>
        </div>

        {provider === 'sumup' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="col-span-2 text-xs bg-amber-50 border border-amber-300 rounded p-2 text-amber-900">
              ⚠️ <strong>SumUp:</strong> ottieni le credenziali dal pannello SumUp Developer (<a href="https://developer.sumup.com/" target="_blank" rel="noopener" className="underline">developer.sumup.com</a>) → API Keys.
            </div>
            <div><Label className="text-xs">SumUp Merchant Code</Label><Input value={c.sumup_merchant_code || ''} onChange={(e) => set('sumup_merchant_code', e.target.value)} placeholder="MXXXXXXX" /></div>
            <div><Label className="text-xs">API Key (Secret)</Label><Input type="password" value={c.sumup_api_key || ''} onChange={(e) => set('sumup_api_key', e.target.value)} placeholder="sup_sk_..." /></div>
            <div className="col-span-2">
              <Label className="text-xs">Modalità</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={c.sumup_mode || 'sandbox'} onChange={(e) => set('sumup_mode', e.target.value)}>
                <option value="sandbox">Sandbox (test)</option>
                <option value="live">Live (produzione)</option>
              </select>
            </div>
          </div>
        )}

        {provider === 'stripe' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="col-span-2 text-xs bg-amber-50 border border-amber-300 rounded p-2 text-amber-900">
              ⚠️ <strong>Stripe:</strong> ottieni le chiavi da <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="underline">dashboard.stripe.com/apikeys</a>.
            </div>
            <div><Label className="text-xs">Publishable Key</Label><Input value={c.stripe_publishable_key || ''} onChange={(e) => set('stripe_publishable_key', e.target.value)} placeholder="pk_test_..." /></div>
            <div><Label className="text-xs">Secret Key</Label><Input type="password" value={c.stripe_secret_key || ''} onChange={(e) => set('stripe_secret_key', e.target.value)} placeholder="sk_test_..." /></div>
            <div className="col-span-2">
              <Label className="text-xs">Modalità</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={c.stripe_mode || 'test'} onChange={(e) => set('stripe_mode', e.target.value)}>
                <option value="test">Test</option>
                <option value="live">Live (produzione)</option>
              </select>
            </div>
          </div>
        )}

        {provider !== 'none' && (
          <label className="flex items-center gap-2 text-sm pt-2 border-t">
            <input type="checkbox" checked={c.online_enabled !== false} onChange={(e) => set('online_enabled', e.target.checked)} />
            <span>Abilita pagamenti online B2C (checkout pubblico)</span>
          </label>
        )}
      </div>

      {/* Admin manual methods */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div>
          <h3 className="font-semibold text-sm">Metodi Manuali (Super Admin · Company Admin Marina)</h3>
          <p className="text-xs text-muted-foreground">Metodi disponibili nel "Registro Contratti → Pagamento" per registrare manualmente incassi.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { key: 'contanti', label: '💰 Contanti' },
            { key: 'bonifico', label: '🏦 Bonifico' },
            { key: 'pos', label: '🟦 POS fisico' },
            { key: 'carta', label: '💳 Carta credito/debito' },
            { key: 'assegno', label: '📃 Assegno' },
            { key: 'altro', label: 'Altro' },
          ].map(m => (
            <label key={m.key} className={`flex items-center gap-2 border rounded p-2 cursor-pointer text-sm ${adminMethods[m.key] ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <input type="checkbox" checked={!!adminMethods[m.key]} onChange={(e) => setAdminMethod(m.key, e.target.checked)} />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Acconto richiesto */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div>
          <h3 className="font-semibold text-sm">Acconto B2C</h3>
          <p className="text-xs text-muted-foreground">Percentuale di acconto richiesta al cliente B2C in fase di prenotazione.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Acconto %</Label>
          <Input
            type="number"
            min="0" max="100" step="5"
            className="w-24"
            value={c.deposit_percentage ?? 30}
            onChange={(e) => set('deposit_percentage', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          />
          <span className="text-sm text-muted-foreground">% (default 30%)</span>
        </div>
      </div>

      {/* SMTP Override (opzionale) */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div>
          <h3 className="font-semibold text-sm">📧 Email (SMTP)</h3>
          <p className="text-xs text-muted-foreground">
            Configurazione SMTP per invio ricevute. Se non valorizzato, usa la configurazione globale (.env).
          </p>
        </div>
        <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
          ℹ️ <strong>Configurazione globale attiva:</strong> Aruba SMTP (smtps.aruba.it). Override solo se questa marina usa un'altra casella email.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">SMTP Host</Label><Input value={c.smtp_host || ''} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtps.aruba.it (default)" /></div>
          <div><Label className="text-xs">SMTP Port</Label><Input type="number" value={c.smtp_port || ''} onChange={(e) => set('smtp_port', e.target.value)} placeholder="465" /></div>
          <div><Label className="text-xs">User (email)</Label><Input value={c.smtp_user || ''} onChange={(e) => set('smtp_user', e.target.value)} placeholder="info@miamarina.com" /></div>
          <div><Label className="text-xs">Password</Label><Input type="password" value={c.smtp_password || ''} onChange={(e) => set('smtp_password', e.target.value)} placeholder="••••••" /></div>
          <div className="col-span-2"><Label className="text-xs">Nome mittente (display)</Label><Input value={c.smtp_from_name || ''} onChange={(e) => set('smtp_from_name', e.target.value)} placeholder="Marina Resort (default = nome marina)" /></div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-300 rounded p-3 text-xs text-emerald-900">
        <strong>📌 Riepilogo configurazione attuale:</strong>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>Pagamenti online: <strong>{provider === 'none' ? 'Disabilitati' : provider.toUpperCase() + (c.online_enabled !== false ? ' (attivi)' : ' (configurati ma disabilitati)')}</strong></li>
          <li>Metodi admin abilitati: <strong>{Object.entries(adminMethods).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'Nessuno'}</strong></li>
          <li>Acconto richiesto: <strong>{c.deposit_percentage ?? 30}%</strong></li>
        </ul>
      </div>
    </div>
  );
}

