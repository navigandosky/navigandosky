'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ClipboardList, Ship, FileSignature, Shield, Save, Eye, Trash2, Search, RefreshCw, Download, FileText, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const fmtPrice = (p) => (p ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

// =====================================================================
// PREVENTIVI MANAGER
// =====================================================================
export function QuotesManager() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/port-quotes');
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (e) { toast.error('Errore caricamento'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.quote_number?.toLowerCase().includes(s) ||
          q.customer?.name?.toLowerCase().includes(s) ||
          q.customer?.surname?.toLowerCase().includes(s) ||
          q.customer?.email?.toLowerCase().includes(s) ||
          q.boat?.name?.toLowerCase().includes(s) ||
          q.boat?.registration?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [quotes, statusFilter, search]);

  const stats = useMemo(() => ({
    total: quotes.length,
    bozza: quotes.filter(q => q.status === 'BOZZA').length,
    inviato: quotes.filter(q => q.status === 'INVIATO').length,
    accettato: quotes.filter(q => q.status === 'ACCETTATO').length,
    convertito: quotes.filter(q => q.status === 'CONVERTITO').length,
    valore_totale: quotes.reduce((s, q) => s + (q.grand_total || 0), 0),
  }), [quotes]);

  const updateStatus = async (q, newStatus) => {
    try {
      await fetch(`/api/port-quotes/${q.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      toast.success('Stato aggiornato');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const deleteQuote = async (q) => {
    if (!confirm(`Eliminare preventivo ${q.quote_number}?`)) return;
    try {
      await fetch(`/api/port-quotes/${q.id}`, { method: 'DELETE' });
      toast.success('Eliminato');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs uppercase">Preventivi</p>
        </CardContent></Card>
        <Card className="border-slate-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.bozza}</p>
          <p className="text-xs uppercase">Bozze</p>
        </CardContent></Card>
        <Card className="border-blue-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.inviato}</p>
          <p className="text-xs uppercase">Inviati</p>
        </CardContent></Card>
        <Card className="border-emerald-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.accettato + stats.convertito}</p>
          <p className="text-xs uppercase">Accettati</p>
        </CardContent></Card>
        <Card className="border-amber-300"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{fmtPrice(stats.valore_totale)}</p>
          <p className="text-xs uppercase">Valore Tot.</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cerca per numero, cliente, barca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="BOZZA">Bozza</SelectItem>
            <SelectItem value="INVIATO">Inviato</SelectItem>
            <SelectItem value="ACCETTATO">Accettato</SelectItem>
            <SelectItem value="SCADUTO">Scaduto</SelectItem>
            <SelectItem value="CONVERTITO">Convertito in transito</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
      </div>

      {loading ? <div className="text-center py-8"><ClipboardList className="w-8 h-8 mx-auto animate-pulse" /></div> : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">N°</th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Barca</th>
                <th className="p-2 text-left">Periodo</th>
                <th className="p-2 text-right">Totale</th>
                <th className="p-2 text-left">Stato</th>
                <th className="p-2 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono font-bold text-primary">{q.quote_number}</td>
                  <td className="p-2 text-xs">{fmtDate(q.created_at)}</td>
                  <td className="p-2">
                    <p className="font-medium">{q.customer?.name} {q.customer?.surname}</p>
                    <p className="text-xs text-muted-foreground">{q.customer?.email}</p>
                  </td>
                  <td className="p-2 text-xs">
                    {q.boat?.name || '—'} ({q.boat?.length}m)
                  </td>
                  <td className="p-2 text-xs">{fmtDate(q.start_date)} → {fmtDate(q.end_date)}</td>
                  <td className="p-2 text-right font-semibold">{fmtPrice(q.grand_total)}</td>
                  <td className="p-2">
                    <Select value={q.status} onValueChange={(v) => updateStatus(q, v)}>
                      <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOZZA">BOZZA</SelectItem>
                        <SelectItem value="INVIATO">INVIATO</SelectItem>
                        <SelectItem value="ACCETTATO">ACCETTATO</SelectItem>
                        <SelectItem value="SCADUTO">SCADUTO</SelectItem>
                        <SelectItem value="CONVERTITO">CONVERTITO</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(q)}><Eye className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteQuote(q)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Nessun preventivo trovato</p>}
        </div>
      )}

      {selected && <QuoteDetailDialog quote={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function QuoteDetailDialog({ quote, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />Preventivo {quote.quote_number}
            <Badge variant="outline">{quote.status}</Badge>
          </DialogTitle>
          <DialogDescription>{quote.marina_name} · {fmtDate(quote.created_at)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Card><CardContent className="p-3">
            <p className="font-semibold mb-1">Cliente</p>
            <p>{quote.customer?.name} {quote.customer?.surname}</p>
            <p className="text-xs text-muted-foreground">{quote.customer?.email} · {quote.customer?.phone}</p>
            {quote.customer?.tax_code && <p className="text-xs">CF/PIVA: <strong>{quote.customer.tax_code}</strong></p>}
            {quote.customer?.address && <p className="text-xs">{quote.customer.address}, {quote.customer.zip} {quote.customer.city} ({quote.customer.country})</p>}
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="font-semibold mb-1">Imbarcazione</p>
            <p>{quote.boat?.name || '—'} ({quote.boat?.registration || 'no targa'})</p>
            <p className="text-xs text-muted-foreground">{quote.boat?.type} · {quote.boat?.length}m × {quote.boat?.beam}m</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="font-semibold mb-1">Periodo</p>
            <p>{fmtDate(quote.start_date)} → {fmtDate(quote.end_date)} ({quote.days} giorni)</p>
          </CardContent></Card>
          <Card className="bg-emerald-50"><CardContent className="p-3">
            <p className="font-semibold mb-1">{quote.tariff_label}</p>
            <div className="flex justify-between"><span>Ormeggio:</span><strong>{fmtPrice(quote.mooring_amount)}</strong></div>
            {quote.extras?.map((e, i) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>+ {e.name}</span><span>{fmtPrice(e.subtotal)}</span></div>
            ))}
            {quote.extras_total > 0 && <div className="flex justify-between text-xs"><span>Subtotale extra:</span><strong>{fmtPrice(quote.extras_total)}</strong></div>}
            <div className="flex justify-between mt-2 pt-2 border-t-2 border-emerald-300 font-bold text-emerald-700 text-base">
              <span>TOTALE:</span><span>{fmtPrice(quote.grand_total)}</span>
            </div>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground italic">Valido fino al {fmtDate(quote.valid_until)}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// TRANSITI MANAGER (occupazioni current + history)
// =====================================================================
export function TransitsManager() {
  const [transits, setTransits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('current'); // current|history|all
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get all marinas and aggregate berths
      const marinasRes = await fetch('/api/marinas');
      const marinas = await marinasRes.json();
      const allTransits = [];
      
      for (const m of marinas) {
        const bRes = await fetch(`/api/berths?marina_id=${m.id}`);
        const berths = await bRes.json();
        if (Array.isArray(berths)) {
          berths.forEach(b => {
            // Current occupation
            if (b.current_occupation) {
              allTransits.push({
                ...b.current_occupation,
                berth_label: b.label,
                marina_name: m.name,
                berth_id: b.id,
                marina_id: m.id,
                is_active: true,
                status: b.status,
              });
            }
            // Historical
            (b.occupation_history || []).forEach(h => {
              allTransits.push({
                ...h,
                berth_label: b.label,
                marina_name: m.name,
                berth_id: b.id,
                marina_id: m.id,
                is_active: false,
                status: 'concluded',
              });
            });
          });
        }
      }
      setTransits(allTransits.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)));
    } catch (e) { toast.error('Errore: ' + e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return transits.filter(t => {
      if (statusFilter === 'current' && !t.is_active) return false;
      if (statusFilter === 'history' && t.is_active) return false;
      if (search) {
        const s = search.toLowerCase();
        return t.customer?.name?.toLowerCase().includes(s) ||
          t.customer?.surname?.toLowerCase().includes(s) ||
          t.customer?.email?.toLowerCase().includes(s) ||
          t.boat?.name?.toLowerCase().includes(s) ||
          t.boat?.registration?.toLowerCase().includes(s) ||
          t.berth_label?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [transits, statusFilter, search]);

  const stats = useMemo(() => ({
    total: transits.length,
    active: transits.filter(t => t.is_active).length,
    historical: transits.filter(t => !t.is_active).length,
    revenue: transits.reduce((s, t) => s + (t.tariff_applied?.grand_total || t.total_amount || 0), 0),
  }), [transits]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs uppercase">Transiti totali</p>
        </CardContent></Card>
        <Card className="border-emerald-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-xs uppercase">In corso</p>
        </CardContent></Card>
        <Card className="border-slate-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.historical}</p>
          <p className="text-xs uppercase">Concluse</p>
        </CardContent></Card>
        <Card className="border-amber-300"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{fmtPrice(stats.revenue)}</p>
          <p className="text-xs uppercase">Fatturato</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cerca cliente, barca, posto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="current">Attivi (in corso)</SelectItem>
            <SelectItem value="history">Storici</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
      </div>

      {loading ? <div className="text-center py-8"><Ship className="w-8 h-8 mx-auto animate-pulse" /></div> : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Posto</th>
                <th className="p-2 text-left">Marina</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Barca</th>
                <th className="p-2 text-left">Arrivo</th>
                <th className="p-2 text-left">Partenza</th>
                <th className="p-2 text-left">Tariffa</th>
                <th className="p-2 text-right">Importo</th>
                <th className="p-2 text-left">Pagamento</th>
                <th className="p-2 text-left">Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono font-semibold">{t.berth_label}</td>
                  <td className="p-2 text-xs">{t.marina_name}</td>
                  <td className="p-2">
                    <p className="font-medium text-xs">{t.customer?.name} {t.customer?.surname}</p>
                    <p className="text-[10px] text-muted-foreground">{t.customer?.tax_code || t.customer?.email}</p>
                  </td>
                  <td className="p-2 text-xs">{t.boat?.name || '—'} ({t.boat?.registration || ''})</td>
                  <td className="p-2 text-xs">{fmtDate(t.start_date)}</td>
                  <td className="p-2 text-xs">{fmtDate(t.end_date)}</td>
                  <td className="p-2 text-xs">
                    {t.is_complimentary ? <Badge className="bg-amber-100 text-amber-700 text-[10px]">🎁 SERVIZIO</Badge> : (t.tariff_applied?.label || '—')}
                  </td>
                  <td className="p-2 text-right font-semibold text-xs">{fmtPrice(t.tariff_applied?.grand_total || t.total_amount)}</td>
                  <td className="p-2">
                    <Badge className={
                      t.payment_status === 'PAGATO' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                      t.payment_status === 'GRATUITO' ? 'bg-amber-100 text-amber-700 text-[10px]' :
                      t.payment_status === 'STORNATO' ? 'bg-red-100 text-red-700 text-[10px]' :
                      'bg-orange-100 text-orange-700 text-[10px]'
                    }>{t.payment_status || 'DA_PAGARE'}</Badge>
                  </td>
                  <td className="p-2">
                    {t.is_active ? <Badge className="bg-blue-100 text-blue-700 text-[10px]">IN CORSO</Badge> : <Badge variant="outline" className="text-[10px]">CONCLUSA</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Nessun transito</p>}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// CONTRATTI MANAGER (occupations with contract status / signed)
// =====================================================================
export function ContractsManager() {
  // Per ora mostro le stesse occupazioni "attive" come contratti in essere (con badge contratto)
  // In futuro: collection separata `contracts` con PDF firmato
  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed">
        <CardContent className="p-6 text-center">
          <FileSignature className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-semibold">Gestione Contratti</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            I contratti rappresentano gli accordi formalizzati delle occupazioni a lungo termine (mensile/annuale).<br />
            Funzionalità in arrivo: generazione PDF contratto, firma digitale, archiviazione, scadenze.
          </p>
          <Badge className="bg-amber-100 text-amber-700">PROSSIMO RILASCIO</Badge>
        </CardContent>
      </Card>
      
      {/* Per ora mostro un riassunto delle occupazioni mensili/annuali */}
      <ContractsLikeList />
    </div>
  );
}

function ContractsLikeList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const marinasRes = await fetch('/api/marinas');
        const marinas = await marinasRes.json();
        const result = [];
        for (const m of marinas) {
          const bRes = await fetch(`/api/berths?marina_id=${m.id}`);
          const berths = await bRes.json();
          if (Array.isArray(berths)) {
            berths.forEach(b => {
              if (b.current_occupation && ['monthly', 'summer_flat', 'annual'].includes(b.current_occupation.tariff_applied?.type)) {
                result.push({ ...b.current_occupation, berth_label: b.label, marina_name: m.name });
              }
            });
          }
        }
        setContracts(result);
      } catch (e) { /* */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-center py-4 text-sm text-muted-foreground">Carico...</div>;
  if (contracts.length === 0) return <p className="text-sm text-muted-foreground italic text-center py-4">Nessun contratto attivo (mensile/annuale).</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Contratti attivi (occupazioni mensili/annuali/forfait)</CardTitle></CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Posto</th>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">Barca</th>
              <th className="p-2 text-left">Periodo</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-right">Importo</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 font-mono font-bold">{c.berth_label}</td>
                <td className="p-2 text-xs">{c.customer?.name} {c.customer?.surname}</td>
                <td className="p-2 text-xs">{c.boat?.name}</td>
                <td className="p-2 text-xs">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</td>
                <td className="p-2 text-xs">{c.tariff_applied?.label}</td>
                <td className="p-2 text-right font-semibold">{fmtPrice(c.tariff_applied?.grand_total || c.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// SETTINGS (Impostazioni Marina - password tariffa servizio)
// =====================================================================
export function PortSettingsManager() {
  const [settings, setSettings] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/port-settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) { toast.error('Errore'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setPassword = async () => {
    if (newPassword.length < 4) { toast.error('Min 4 caratteri'); return; }
    if (newPassword !== confirmPassword) { toast.error('Le password non coincidono'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/port-settings/global/set-complimentary-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Password impostata!');
      setNewPassword(''); setConfirmPassword('');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (!settings) return <div className="text-center py-8"><Shield className="w-8 h-8 mx-auto animate-pulse" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Password Autorizzazione Tariffa Servizio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
            <p className="font-semibold text-amber-900 mb-1">🎁 Cos'è la "Tariffa Servizio"?</p>
            <p className="text-xs text-amber-800">
              È la tariffa <strong>gratuita di cortesia</strong> applicabile in casi particolari (ospiti istituzionali, omaggi, agevolazioni).
              Per autorizzarla, l'operatore deve inserire questa password al momento della registrazione del posto barca.
              Ogni autorizzazione viene tracciata con timestamp e motivazione per fini contabili.
            </p>
          </div>
          
          <div>
            <Label>Stato attuale</Label>
            <div className="flex items-center gap-2 mt-1">
              {settings.complimentary_password_set ? (
                <Badge className="bg-emerald-100 text-emerald-700"><Lock className="w-3 h-3 mr-1" />PASSWORD CONFIGURATA</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700"><Unlock className="w-3 h-3 mr-1" />PASSWORD NON IMPOSTATA</Badge>
              )}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">{settings.complimentary_password_set ? 'Modifica password' : 'Imposta nuova password'}</h4>
            <div className="space-y-2">
              <div>
                <Label>Nuova password (min 4 caratteri)</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <Label>Conferma password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && setPassword()} />
              </div>
              <Button onClick={setPassword} disabled={saving || !newPassword || !confirmPassword}>
                {saving ? 'Salvo...' : <><Save className="w-4 h-4 mr-2" />Salva Password</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
