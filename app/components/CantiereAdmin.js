'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Edit, Trash2, Save, FileText, FileDown, Wrench, Package, Anchor, Search,
  Eye, RefreshCw, X, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

// ---------- Helpers calcolo riga ----------
const calcRow = (it) => {
  const qty = Number(it.qty) || 0;
  const unit = Number(it.unit_price) || 0;
  const amount = qty * unit;
  const discount = Number(it.discount) || 0;
  const net = Math.max(0, amount - discount);
  return { ...it, qty, unit_price: unit, amount, discount, net_taxable: net };
};

const STATUSES = [
  { value: 'BOZZA', label: 'Bozza', color: 'bg-slate-100 text-slate-700' },
  { value: 'INVIATO', label: 'Inviato', color: 'bg-blue-100 text-blue-700' },
  { value: 'ACCETTATO', label: 'Accettato', color: 'bg-green-100 text-green-700' },
  { value: 'RIFIUTATO', label: 'Rifiutato', color: 'bg-red-100 text-red-700' },
  { value: 'COMPLETATO', label: 'Completato', color: 'bg-purple-100 text-purple-700' },
];

const PAYMENT_METHODS = [
  'Bonifico bancario',
  'Contanti',
  'Carta di credito',
  'Assegno',
  'POS',
  'Altro',
];

// =============================================================
// COMPONENT PRINCIPALE
// =============================================================
export default function CantiereAdmin({ currentUser }) {
  const [quotes, setQuotes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, tRes] = await Promise.all([
        fetch('/api/cantiere'),
        fetch('/api/cantiere-templates'),
      ]);
      const qData = await qRes.json();
      const tData = await tRes.json();
      setQuotes(Array.isArray(qData) ? qData : []);
      setTemplates(Array.isArray(tData) ? tData : []);
    } catch (e) {
      toast.error('Errore caricamento dati cantiere');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const c = q.customer || {};
        const b = q.boat || {};
        return (
          q.quote_number?.toLowerCase().includes(s) ||
          c.name?.toLowerCase().includes(s) ||
          c.surname?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          b.name?.toLowerCase().includes(s) ||
          b.registration?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [quotes, statusFilter, search]);

  const handleNew = () => {
    setEditing({
      _isNew: true,
      customer: { name: '', surname: '', email: '', phone: '', vat_number: '' },
      boat: { name: '', registration: '', length: 0, type: 'motor' },
      items: [],
      iva_rate: 22,
      payment_method: '',
      payment_status: 'DA_PAGARE',
      notes: '',
      status: 'BOZZA',
      created_by: currentUser?.username || currentUser?.email || '',
    });
  };

  const handleDelete = async (q) => {
    if (!confirm(`Eliminare il preventivo ${q.quote_number}?`)) return;
    try {
      const r = await fetch(`/api/cantiere/${q.id}`, { method: 'DELETE' });
      if (r.ok || r.status === 204) {
        toast.success('Preventivo eliminato');
        await load();
      } else {
        toast.error('Errore eliminazione');
      }
    } catch (e) { toast.error('Errore di rete'); }
  };

  const handleDownloadPDF = async (q) => {
    try {
      const { downloadCantierePDF } = await import('../lib/cantiereDoc');
      await downloadCantierePDF(q);
      toast.success('PDF generato');
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione PDF');
    }
  };
  const handleDownloadDOCX = async (q) => {
    try {
      const { downloadCantiereDOCX } = await import('../lib/cantiereDoc');
      await downloadCantiereDOCX(q);
      toast.success('Word (.docx) generato');
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione Word');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-white rounded-lg p-2">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900">Cantiere · Preventivi Rimessaggio</h2>
            <p className="text-sm text-amber-700">Generatore preventivi per servizi nautici · Marlin Sub</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />Aggiorna
          </Button>
          <Button onClick={handleNew} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-2" />Nuovo Preventivo
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Cerca</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N° preventivo, cliente, barca, targa..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <Label className="text-xs">Stato</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista preventivi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />Archivio Preventivi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
              Caricamento...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nessun preventivo trovato</p>
              <p className="text-xs mt-1">Crea il tuo primo preventivo cantiere</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3">N° Preventivo</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Barca</th>
                    <th className="text-right p-3">Totale</th>
                    <th className="text-center p-3">Stato</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-center p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const c = q.customer || {};
                    const b = q.boat || {};
                    const status = STATUSES.find(s => s.value === q.status) || STATUSES[0];
                    return (
                      <tr key={q.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono font-semibold text-blue-700">{q.quote_number}</td>
                        <td className="p-3">
                          <div className="font-medium">{c.name} {c.surname}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </td>
                        <td className="p-3">
                          {b.name ? (
                            <>
                              <div>{b.name}</div>
                              <div className="text-xs text-muted-foreground">{b.registration}{b.length ? ` · ${b.length}m` : ''}</div>
                            </>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-right font-semibold">{fmtEur(q.grand_total)}</td>
                        <td className="p-3 text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{fmtDate(q.created_at)}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap justify-center">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(q)}>
                              <Edit className="w-3 h-3 mr-1" />Modifica
                            </Button>
                            <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => handleDownloadPDF(q)}>
                              <FileDown className="w-3 h-3 mr-1" />PDF
                            </Button>
                            <Button variant="secondary" size="sm" className="h-7 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => handleDownloadDOCX(q)}>
                              <FileText className="w-3 h-3 mr-1" />Word
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(q)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      {editing && (
        <CantiereEditor
          quote={editing}
          templates={templates}
          onClose={() => setEditing(null)}
          onSaved={async () => { await load(); setEditing(null); }}
        />
      )}
    </div>
  );
}

// =============================================================
// EDITOR PREVENTIVO (Dialog full-form)
// =============================================================
function CantiereEditor({ quote, templates, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...quote,
    customer: { ...(quote.customer || {}) },
    boat: { ...(quote.boat || {}) },
    items: (quote.items || []).map(calcRow),
    iva_rate: quote.iva_rate ?? 22,
  }));
  const [saving, setSaving] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Calcoli reattivi
  const totals = useMemo(() => {
    const items = (form.items || []).map(calcRow);
    const subtotal = items.reduce((s, it) => s + (it.net_taxable || 0), 0);
    const ivaRate = Number(form.iva_rate) || 0;
    const ivaAmt = subtotal * ivaRate / 100;
    const grand = subtotal + ivaAmt;
    return { subtotal, ivaAmt, grand, items };
  }, [form.items, form.iva_rate]);

  const updateCustomer = (k, v) => setForm(f => ({ ...f, customer: { ...f.customer, [k]: v } }));
  const updateBoat = (k, v) => setForm(f => ({ ...f, boat: { ...f.boat, [k]: v } }));

  const addItem = (tmpl = null) => {
    setForm(f => ({
      ...f,
      items: [...(f.items || []), {
        description: tmpl?.description || '',
        category: tmpl?.category || '',
        qty: 1,
        unit_price: tmpl?.default_unit_price || 0,
        discount: 0,
      }],
    }));
  };
  const updateItem = (idx, k, v) => {
    setForm(f => ({
      ...f,
      items: (f.items || []).map((it, i) => i === idx ? { ...it, [k]: v } : it),
    }));
  };
  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: (f.items || []).filter((_, i) => i !== idx) }));
  };
  const addTemplatesBulk = (selected) => {
    setForm(f => ({
      ...f,
      items: [
        ...(f.items || []),
        ...selected.map(t => ({
          description: t.description,
          category: t.category,
          qty: 1,
          unit_price: t.default_unit_price || 0,
          discount: 0,
        })),
      ],
    }));
    setShowTemplatePicker(false);
  };

  const handleSave = async () => {
    if (!form.customer?.name && !form.customer?.surname) {
      toast.error('Inserisci almeno Nome o Cognome cliente');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: totals.items,
        subtotal_net: totals.subtotal,
        iva_amount: totals.ivaAmt,
        grand_total: totals.grand,
      };
      const isNew = form._isNew || !form.id;
      const url = isNew ? '/api/cantiere' : `/api/cantiere/${form.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Errore salvataggio');
      toast.success(isNew ? 'Preventivo creato' : 'Preventivo aggiornato');
      await onSaved();
    } catch (e) {
      toast.error(e.message || 'Errore salvataggio');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            {form._isNew ? 'Nuovo Preventivo Cantiere' : `Modifica ${form.quote_number || 'Preventivo'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* DATI CLIENTE */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Dati Cliente</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.customer?.name || ''} onChange={e => updateCustomer('name', e.target.value)} />
              </div>
              <div>
                <Label>Cognome</Label>
                <Input value={form.customer?.surname || ''} onChange={e => updateCustomer('surname', e.target.value)} />
              </div>
              <div>
                <Label>P.IVA / Codice Fiscale</Label>
                <Input
                  value={form.customer?.vat_number || ''}
                  onChange={e => updateCustomer('vat_number', e.target.value)}
                  placeholder="Campo libero (P.IVA o CF)"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.customer?.email || ''} onChange={e => updateCustomer('email', e.target.value)} />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input value={form.customer?.phone || ''} onChange={e => updateCustomer('phone', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* DATI BARCA */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Anchor className="w-4 h-4" />Dati Barca</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Nome Barca</Label>
                <Input value={form.boat?.name || ''} onChange={e => updateBoat('name', e.target.value)} />
              </div>
              <div>
                <Label>Targa / Sigla</Label>
                <Input value={form.boat?.registration || ''} onChange={e => updateBoat('registration', e.target.value)} />
              </div>
              <div>
                <Label>Lunghezza (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.boat?.length || ''}
                  onChange={e => updateBoat('length', Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.boat?.type || 'motor'} onValueChange={v => updateBoat('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motor">Motore</SelectItem>
                    <SelectItem value="sail">Vela</SelectItem>
                    <SelectItem value="rib">Gommone</SelectItem>
                    <SelectItem value="catamaran">Catamarano</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* SERVIZI */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" />Servizi e Prestazioni</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowTemplatePicker(true)}>
                  <Sparkles className="w-4 h-4 mr-1" />Da Lista Servizi
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addItem()}>
                  <Plus className="w-4 h-4 mr-1" />Riga Libera
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="text-left p-2">Descrizione</th>
                      <th className="text-center p-2 w-16">Q.tà</th>
                      <th className="text-right p-2 w-28">Prezzo unit. €</th>
                      <th className="text-right p-2 w-28">Importo</th>
                      <th className="text-right p-2 w-24">Sconto €</th>
                      <th className="text-right p-2 w-28">Netto</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.items || []).length === 0 && (
                      <tr><td colSpan="7" className="text-center py-6 text-muted-foreground italic text-xs">Nessun servizio. Clicca "Da Lista Servizi" o "Riga Libera"</td></tr>
                    )}
                    {(form.items || []).map((it, i) => {
                      const calc = calcRow(it);
                      return (
                        <tr key={i} className="border-b">
                          <td className="p-2">
                            <Input
                              value={it.description || ''}
                              onChange={e => updateItem(i, 'description', e.target.value)}
                              placeholder="Descrizione servizio"
                              className="h-8 text-sm"
                            />
                            {it.category && <span className="text-[10px] text-muted-foreground ml-1">{it.category}</span>}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.5"
                              value={it.qty}
                              onChange={e => updateItem(i, 'qty', e.target.value)}
                              className="h-8 text-sm text-center"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={it.unit_price}
                              onChange={e => updateItem(i, 'unit_price', e.target.value)}
                              className="h-8 text-sm text-right"
                            />
                          </td>
                          <td className="p-2 text-right text-muted-foreground">{fmtEur(calc.amount)}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={it.discount}
                              onChange={e => updateItem(i, 'discount', e.target.value)}
                              className="h-8 text-sm text-right"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">{fmtEur(calc.net_taxable)}</td>
                          <td className="p-2 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i)}>
                              <X className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* TOTALI + PAGAMENTO + STATO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pagamento e Stato</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Modalità di pagamento</Label>
                  <Select value={form.payment_method || ''} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Stato pagamento</Label>
                    <Select value={form.payment_status || 'DA_PAGARE'} onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DA_PAGARE">Da pagare</SelectItem>
                        <SelectItem value="ACCONTO">Acconto versato</SelectItem>
                        <SelectItem value="PAGATO">Pagato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stato preventivo</Label>
                    <Select value={form.status || 'BOZZA'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Validità preventivo (giorni)</Label>
                  <Input
                    type="date"
                    value={form.valid_until ? form.valid_until.split('T')[0] : ''}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Totali</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Imponibile</span><span className="font-medium">{fmtEur(totals.subtotal)}</span></div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Aliquota IVA</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="1"
                      value={form.iva_rate}
                      onChange={e => setForm(f => ({ ...f, iva_rate: Number(e.target.value) }))}
                      className="h-8 w-16 text-right"
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span className="font-medium">{fmtEur(totals.ivaAmt)}</span></div>
                <div className="border-t pt-2 mt-1 flex justify-between text-lg font-bold text-blue-700">
                  <span>TOTALE</span>
                  <span>{fmtEur(totals.grand)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NOTE */}
          <div>
            <Label>Note / Condizioni</Label>
            <Textarea
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Eventuali note, garanzie, condizioni di pagamento..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {form._isNew ? 'Crea Preventivo' : 'Salva Modifiche'}
          </Button>
        </DialogFooter>

        {/* Picker template */}
        {showTemplatePicker && (
          <TemplatePicker
            templates={templates}
            onClose={() => setShowTemplatePicker(false)}
            onConfirm={addTemplatesBulk}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// TEMPLATE PICKER
// =============================================================
function TemplatePicker({ templates, onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('');

  const grouped = useMemo(() => {
    const g = {};
    for (const t of templates) {
      if (filter && !t.description.toLowerCase().includes(filter.toLowerCase())) continue;
      const cat = t.category || 'Altro';
      if (!g[cat]) g[cat] = [];
      g[cat].push(t);
    }
    return g;
  }, [templates, filter]);

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const confirm = () => {
    const items = templates.filter(t => selected.includes(t.id));
    onConfirm(items);
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />Seleziona servizi dal catalogo
          </DialogTitle>
        </DialogHeader>
        <div>
          <Input
            placeholder="Cerca servizio..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="mb-3"
          />
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-xs font-bold uppercase text-amber-700 mb-1.5 sticky top-0 bg-white py-1">{cat}</div>
                <div className="space-y-1">
                  {items.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selected.includes(t.id)}
                        onCheckedChange={() => toggle(t.id)}
                      />
                      <span className="flex-1 text-sm">{t.description}</span>
                      {t.default_unit_price > 0 && (
                        <span className="text-xs text-muted-foreground">{fmtEur(t.default_unit_price)}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">Nessun servizio trovato</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={confirm} disabled={selected.length === 0} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-2" />Aggiungi {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
