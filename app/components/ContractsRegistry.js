'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  FileSignature, Edit, Receipt, Wallet, Search, RefreshCw, Anchor, Ship, Calendar,
  Trash2, FileText, Download, Mail, CheckCircle2, Plus, AlertCircle, User, Euro,
  ChevronDown, ChevronRight, Upload, Paperclip, ScrollText, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/app/lib/safeFetch';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

const PAYMENT_METHODS = [
  { value: 'CONTANTI', label: 'Contanti' },
  { value: 'BONIFICO', label: 'Bonifico' },
  { value: 'CARTA', label: 'Carta di credito/debito' },
  { value: 'POS', label: 'POS' },
  { value: 'ASSEGNO', label: 'Assegno' },
  { value: 'ALTRO', label: 'Altro' },
];

const PAY_STATUS = {
  DA_PAGARE: { label: 'DA PAGARE', cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
  ACCONTO: { label: 'ACCONTO', cls: 'bg-blue-100 text-blue-800 border border-blue-300' },
  SALDATO: { label: 'SALDATO', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
};

/**
 * Calcola lo stato pagamento di un contratto considerando:
 * - payments[] custom array
 * - legacy: deposit_paid + balance_paid
 */
function computePaymentStatus(c) {
  const payments = Array.isArray(c.payments) ? c.payments : [];
  let paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  // Legacy: se non ci sono pagamenti custom ma deposit/balance pagati
  if (paid === 0) {
    if (c.deposit_paid) paid += Number(c.deposit_amount || 0);
    if (c.balance_paid) paid += Number(c.balance_amount || 0);
  }
  const total = Number(c.grand_total || 0);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  let status = 'DA_PAGARE';
  if (paid >= total && total > 0) status = 'SALDATO';
  else if (paid > 0) status = 'ACCONTO';
  return { paid_total: paid, balance_remaining: balance, status };
}

export default function ContractsRegistry({ currentUser }) {
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Dialog state
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [issuingReceipt, setIssuingReceipt] = useState(null);
  const [generatingContract, setGeneratingContract] = useState(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'CONTRACT');
      if (!isSuperAdmin && currentUser?.company_id) {
        params.set('company_id', currentUser.company_id);
      }
      const [cRes, compRes] = await Promise.all([
        fetch(`/api/marina-bookings?${params.toString()}`),
        fetch('/api/companies'),
      ]);
      const cData = await cRes.json();
      const compData = await compRes.json();
      setContracts(Array.isArray(cData) ? cData : []);
      setCompanies(Array.isArray(compData) ? compData : []);
    } catch (e) { toast.error('Errore caricamento contratti'); }
    finally { setLoading(false); }
  }, [isSuperAdmin, currentUser?.company_id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const ps = computePaymentStatus(c);
      if (statusFilter !== 'ALL' && ps.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const txt = [
          c.booking_number, c.berth_label, c.marina_name,
          c.customer?.name, c.customer?.surname, c.customer?.email, c.customer?.tax_code,
          c.boat?.name, c.boat?.registration,
        ].filter(Boolean).join(' ').toLowerCase();
        return txt.includes(s);
      }
      return true;
    });
  }, [contracts, search, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: 0, da_pagare: 0, acconto: 0, saldato: 0, valore_totale: 0, incassato: 0, da_incassare: 0 };
    for (const c of contracts) {
      const ps = computePaymentStatus(c);
      s.total++;
      if (ps.status === 'DA_PAGARE') s.da_pagare++;
      if (ps.status === 'ACCONTO') s.acconto++;
      if (ps.status === 'SALDATO') s.saldato++;
      s.valore_totale += Number(c.grand_total || 0);
      s.incassato += ps.paid_total;
      s.da_incassare += ps.balance_remaining;
    }
    return s;
  }, [contracts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-amber-50 border-2 border-amber-300 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-emerald-600 text-white rounded-lg p-2">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Registro Contratti</h2>
            <p className="text-sm text-emerald-800">Gestione contabile dei contratti attivi · Pagamenti e ricevute</p>
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" />Aggiorna
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p><p className="text-xs uppercase">Contratti</p>
        </CardContent></Card>
        <Card className="border-amber-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.da_pagare}</p><p className="text-xs uppercase">Da pagare</p>
        </CardContent></Card>
        <Card className="border-blue-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.acconto}</p><p className="text-xs uppercase">Acconto</p>
        </CardContent></Card>
        <Card className="border-emerald-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.saldato}</p><p className="text-xs uppercase">Saldati</p>
        </CardContent></Card>
        <Card className="border-emerald-400"><CardContent className="p-3 text-center">
          <p className="text-base font-bold text-emerald-700">{fmtEur(stats.incassato)}</p><p className="text-xs uppercase">Incassato</p>
        </CardContent></Card>
        <Card className="border-amber-400"><CardContent className="p-3 text-center">
          <p className="text-base font-bold text-amber-700">{fmtEur(stats.da_incassare)}</p><p className="text-xs uppercase">Da incassare</p>
        </CardContent></Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Cerca</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente, posto, marina, barca..." className="pl-8" />
            </div>
          </div>
          <div className="min-w-[180px]">
            <Label className="text-xs">Stato Pagamento</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti</SelectItem>
                <SelectItem value="DA_PAGARE">Da pagare</SelectItem>
                <SelectItem value="ACCONTO">Acconto</SelectItem>
                <SelectItem value="SALDATO">Saldati</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista Contratti */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSignature className="w-5 h-5" />Contratti Attivi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground"><RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileSignature className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nessun contratto trovato</p>
              <p className="text-xs mt-1">I contratti vengono creati convertendo una prenotazione e assegnando un posto barca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-2">N° Contratto</th>
                    <th className="text-left p-2">Posto</th>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Imbarcazione</th>
                    <th className="text-left p-2">Periodo</th>
                    <th className="text-left p-2">Tariffa</th>
                    <th className="text-right p-2">Totale</th>
                    <th className="text-right p-2">Incassato</th>
                    <th className="text-right p-2">Saldo</th>
                    <th className="text-center p-2">Stato</th>
                    <th className="text-center p-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ps = computePaymentStatus(c);
                    const stCfg = PAY_STATUS[ps.status];
                    return (
                      <tr key={c.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono font-bold text-emerald-700">{c.booking_number}</td>
                        <td className="p-2"><Badge variant="outline" className="font-mono bg-purple-50 text-purple-700 border-purple-300">{c.berth_label || '—'}</Badge></td>
                        <td className="p-2">
                          <div className="font-medium">{c.customer?.name} {c.customer?.surname}</div>
                          <div className="text-xs text-muted-foreground">{c.customer?.email}</div>
                          {c.customer?.tax_code && <div className="text-[10px] text-muted-foreground">CF/P.IVA: {c.customer.tax_code}</div>}
                        </td>
                        <td className="p-2 text-xs">
                          <div>{c.boat?.name || '—'}</div>
                          <div className="text-muted-foreground">{c.boat?.type} · {c.boat?.length}m</div>
                        </td>
                        <td className="p-2 text-xs">
                          {fmtDate(c.start_date)}<br />→ {fmtDate(c.end_date)}<br />
                          <span className="text-muted-foreground">({c.days} gg)</span>
                        </td>
                        <td className="p-2 text-xs max-w-[140px]">{c.tariff_label}</td>
                        <td className="p-2 text-right font-semibold">{fmtEur(c.grand_total)}</td>
                        <td className="p-2 text-right">
                          <div className="text-emerald-700 font-semibold">{fmtEur(ps.paid_total)}</div>
                          {Array.isArray(c.payments) && c.payments.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">{c.payments.length} mov.</div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className={ps.balance_remaining > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
                            {fmtEur(ps.balance_remaining)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <Badge className={stCfg.cls}>{stCfg.label}</Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" title="Edita contratto" onClick={() => setEditing(c)}>
                              <Edit className="w-3 h-3 mr-1" />Edita
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300" title="Pagamenti" onClick={() => setPaying(c)}>
                              <Wallet className="w-3 h-3 mr-1" />Pagamento
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300" title="Ricevuta" onClick={() => setIssuingReceipt(c)}>
                              <Receipt className="w-3 h-3 mr-1" />Ricevuta
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300" title="Genera Contratto Word" onClick={() => setGeneratingContract(c)}>
                              <ScrollText className="w-3 h-3 mr-1" />Contratto
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

      {/* Dialogs */}
      {editing && <EditContractDialog contract={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {paying && <PaymentDialog contract={paying} onClose={() => setPaying(null)} onChange={load} />}
      {issuingReceipt && <ReceiptDialog contract={issuingReceipt} companies={companies} onClose={() => setIssuingReceipt(null)} />}
      {generatingContract && <ContractDocDialog contract={generatingContract} companies={companies} onClose={() => setGeneratingContract(null)} />}
    </div>
  );
}

// =====================================================================
// EDIT CONTRACT DIALOG
// =====================================================================
function EditContractDialog({ contract, onClose, onSaved }) {
  const [data, setData] = useState({
    customer: { ...(contract.customer || {}) },
    customer_extras: { ...(contract.customer_extras || {}) },
    boat: { ...(contract.boat || {}) },
    boat_extras: { ...(contract.boat_extras || {}) },
    boat_class: contract.boat_class || (contract.boat?.length && Number(contract.boat.length) >= 10 ? 'diporto' : 'natante'),
    documents: { ...(contract.documents || {}) },
    start_date: contract.start_date?.slice(0, 10) || '',
    end_date: contract.end_date?.slice(0, 10) || '',
    tariff_label: contract.tariff_label || '',
    grand_total: contract.grand_total || 0,
    notes: contract.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // 'libretto' | 'assicurazione' | null

  const setCust = (k, v) => setData(d => ({ ...d, customer: { ...d.customer, [k]: v } }));
  const setCustEx = (k, v) => setData(d => ({ ...d, customer_extras: { ...d.customer_extras, [k]: v } }));
  const setBoat = (k, v) => setData(d => ({ ...d, boat: { ...d.boat, [k]: v } }));
  const setBoatEx = (k, v) => setData(d => ({ ...d, boat_extras: { ...d.boat_extras, [k]: v } }));

  const isCompany = !!data.customer_extras?.is_company;

  const uploadFile = async (which, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setUploading(which);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      // Usa /api/upload-pdf (accetta anche immagini convertendo l'estensione - sennò usa /api/upload per immagini)
      const isImage = file.type.startsWith('image/');
      const endpoint = isImage ? '/api/upload' : '/api/upload-pdf';
      const body = isImage ? { images: [base64] } : { pdf: base64, filename: file.name };
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok || result.error) throw new Error(result.error || 'Errore upload');
      const url = isImage ? result.urls?.[0] : result.url;
      if (!url) throw new Error('URL non ricevuto');
      setData(d => ({
        ...d,
        documents: {
          ...d.documents,
          [`${which}_url`]: url,
          [`${which}_filename`]: file.name,
        },
      }));
      toast.success(`${which === 'libretto' ? 'Libretto' : 'Certificato assicurazione'} caricato`);
    } catch (e) { toast.error(e.message); }
    finally { setUploading(null); }
  };

  const removeDoc = (which) => {
    setData(d => ({
      ...d,
      documents: {
        ...d.documents,
        [`${which}_url`]: '',
        [`${which}_filename`]: '',
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      let days = contract.days;
      if (data.start_date && data.end_date) {
        const ms = new Date(data.end_date) - new Date(data.start_date);
        days = Math.max(1, Math.round(ms / 86400000));
      }
      const payload = { ...data, days, grand_total: Number(data.grand_total || 0) };
      const r = await fetch(`/api/marina-bookings/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Errore salvataggio');
      toast.success('Contratto aggiornato');
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" translate="no">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-amber-600" />Edita Contratto {contract.booking_number}</DialogTitle>
          <DialogDescription>Posto barca: <strong>{contract.berth_label}</strong> · Marina: <strong>{contract.marina_name}</strong></DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipologia cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Tipologia Cliente</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!isCompany} onChange={() => setCustEx('is_company', false)} />
                  <span className="text-sm">Persona fisica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={isCompany} onChange={() => setCustEx('is_company', true)} />
                  <span className="text-sm">Persona giuridica (azienda)</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Dati Cliente {isCompany ? '(Azienda)' : '(Persona Fisica)'}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{isCompany ? 'Ragione sociale' : 'Nome'}</Label><Input value={data.customer.name || ''} onChange={(e) => setCust('name', e.target.value)} /></div>
              <div><Label className="text-xs">{isCompany ? '' : 'Cognome'}</Label><Input value={data.customer.surname || ''} onChange={(e) => setCust('surname', e.target.value)} disabled={isCompany} /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={data.customer.email || ''} onChange={(e) => setCust('email', e.target.value)} /></div>
              <div><Label className="text-xs">Telefono</Label><Input value={data.customer.phone || ''} onChange={(e) => setCust('phone', e.target.value)} /></div>
              <div><Label className="text-xs">{isCompany ? 'P.IVA' : 'Codice Fiscale'}</Label><Input value={data.customer.tax_code || ''} onChange={(e) => setCust('tax_code', e.target.value)} /></div>
              <div><Label className="text-xs">Città / Comune</Label><Input value={data.customer.city || ''} onChange={(e) => setCust('city', e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Indirizzo</Label><Input value={data.customer.address || ''} onChange={(e) => setCust('address', e.target.value)} /></div>

              {!isCompany && (
                <>
                  <div><Label className="text-xs">Luogo di nascita</Label><Input value={data.customer_extras.birth_place || ''} onChange={(e) => setCustEx('birth_place', e.target.value)} /></div>
                  <div><Label className="text-xs">Data di nascita</Label><Input type="date" value={data.customer_extras.birth_date?.slice(0, 10) || ''} onChange={(e) => setCustEx('birth_date', e.target.value)} /></div>
                </>
              )}

              {isCompany && (
                <>
                  <div className="col-span-2"><Label className="text-xs">Sede legale</Label><Input value={data.customer_extras.company_legal_seat || ''} onChange={(e) => setCustEx('company_legal_seat', e.target.value)} placeholder="Es. Via Roma 1, 00100 Roma" /></div>
                  <div><Label className="text-xs">N° iscrizione CCIAA</Label><Input value={data.customer_extras.camera_iscrizione || ''} onChange={(e) => setCustEx('camera_iscrizione', e.target.value)} /></div>
                  <div><Label className="text-xs">Camera Commercio di</Label><Input value={data.customer_extras.camera_citta || ''} onChange={(e) => setCustEx('camera_citta', e.target.value)} placeholder="Es. Nuoro" /></div>
                  <div className="col-span-2"><Label className="text-xs font-semibold mt-2">Legale rappresentante</Label></div>
                  <div><Label className="text-xs">Nome e cognome</Label><Input value={data.customer_extras.legal_rep_name || ''} onChange={(e) => setCustEx('legal_rep_name', e.target.value)} /></div>
                  <div><Label className="text-xs">Codice fiscale</Label><Input value={data.customer_extras.legal_rep_cf || ''} onChange={(e) => setCustEx('legal_rep_cf', e.target.value)} /></div>
                  <div><Label className="text-xs">Luogo di nascita</Label><Input value={data.customer_extras.legal_rep_birth_place || ''} onChange={(e) => setCustEx('legal_rep_birth_place', e.target.value)} /></div>
                  <div><Label className="text-xs">Data di nascita</Label><Input type="date" value={data.customer_extras.legal_rep_birth_date?.slice(0, 10) || ''} onChange={(e) => setCustEx('legal_rep_birth_date', e.target.value)} /></div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Categoria imbarcazione */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" />Categoria Imbarcazione</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={data.boat_class === 'natante'} onChange={() => setData(d => ({ ...d, boat_class: 'natante' }))} />
                  <span className="text-sm font-medium">☐ Natante</span>
                  <span className="text-xs text-muted-foreground">(piccola imbarcazione, no immatricolazione)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={data.boat_class === 'diporto'} onChange={() => setData(d => ({ ...d, boat_class: 'diporto' }))} />
                  <span className="text-sm font-medium">☐ Diporto</span>
                  <span className="text-xs text-muted-foreground">(imbarcazione iscritta ai R.I.D.)</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Dati barca COMUNI */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" />Dati Imbarcazione</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{data.boat_class === 'diporto' ? 'Denominazione (nome)' : 'Nome barca'}</Label><Input value={data.boat.name || ''} onChange={(e) => setBoat('name', e.target.value)} /></div>
              <div><Label className="text-xs">Tipo</Label>
                <Select value={data.boat.type || 'motor'} onValueChange={(v) => setBoat('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motor">A motore</SelectItem>
                    <SelectItem value="sail">A vela</SelectItem>
                    <SelectItem value="catamaran">Catamarano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Lunghezza max (m)</Label><Input type="number" step="0.1" value={data.boat.length || 0} onChange={(e) => setBoat('length', parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Larghezza max (m)</Label><Input type="number" step="0.1" value={data.boat.beam || 0} onChange={(e) => setBoat('beam', parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Colore scafo</Label><Input value={data.boat_extras.hull_color || ''} onChange={(e) => setBoatEx('hull_color', e.target.value)} placeholder="Es. bianco" /></div>

              {data.boat_class === 'natante' && (
                <>
                  <div><Label className="text-xs">Note sovrastruttura</Label><Input value={data.boat_extras.superstructure_notes || ''} onChange={(e) => setBoatEx('superstructure_notes', e.target.value)} /></div>
                  <div className="col-span-2 grid grid-cols-3 gap-3 pt-2 border-t">
                    <div><Label className="text-xs">Motore tipo</Label><Input value={data.boat_extras.engine_type || ''} onChange={(e) => setBoatEx('engine_type', e.target.value)} placeholder="Es. fuoribordo" /></div>
                    <div><Label className="text-xs">Marca</Label><Input value={data.boat_extras.engine_brand || ''} onChange={(e) => setBoatEx('engine_brand', e.target.value)} placeholder="Es. Yamaha" /></div>
                    <div><Label className="text-xs">HP</Label><Input type="number" value={data.boat_extras.engine_hp || ''} onChange={(e) => setBoatEx('engine_hp', e.target.value)} placeholder="Es. 40" /></div>
                  </div>
                </>
              )}

              {data.boat_class === 'diporto' && (
                <>
                  <div><Label className="text-xs">Colore sovrastruttura</Label><Input value={data.boat_extras.superstructure_color || ''} onChange={(e) => setBoatEx('superstructure_color', e.target.value)} /></div>
                  <div><Label className="text-xs">Modello</Label><Input value={data.boat_extras.model || ''} onChange={(e) => setBoatEx('model', e.target.value)} /></div>
                  <div><Label className="text-xs">N° iscrizione R.I.D.</Label><Input value={data.boat_extras.registration_number || data.boat.registration || ''} onChange={(e) => setBoatEx('registration_number', e.target.value)} /></div>
                  <div><Label className="text-xs">R.I.D. di (Capitaneria)</Label><Input value={data.boat_extras.registration_office || ''} onChange={(e) => setBoatEx('registration_office', e.target.value)} placeholder="Es. Cagliari" /></div>
                  <div className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t">
                    <div><Label className="text-xs">Tipo motore</Label><Input value={data.boat_extras.engine_type || ''} onChange={(e) => setBoatEx('engine_type', e.target.value)} placeholder="Es. entrobordo diesel" /></div>
                    <div><Label className="text-xs">Potenza</Label><Input value={data.boat_extras.engine_power || ''} onChange={(e) => setBoatEx('engine_power', e.target.value)} placeholder="Es. 250 HP" /></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documenti allegati */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Paperclip className="w-4 h-4" />Documenti Allegati</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <DocumentField
                label="Libretto motore / imbarcazione"
                which="libretto"
                docs={data.documents}
                uploading={uploading}
                onUpload={uploadFile}
                onRemove={removeDoc}
              />
              <DocumentField
                label="Certificato di assicurazione obbligatoria"
                which="assicurazione"
                docs={data.documents}
                uploading={uploading}
                onUpload={uploadFile}
                onRemove={removeDoc}
              />
              <p className="text-[11px] text-muted-foreground italic">Formati ammessi: PDF, JPG, PNG · Max 10MB per file. I documenti sono allegati al contratto e citati come allegati nella generazione del file Word.</p>
            </CardContent>
          </Card>

          {/* Periodo & Tariffa */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Periodo & Tariffa</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Dal</Label><Input type="date" value={data.start_date} onChange={(e) => setData(d => ({ ...d, start_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Al</Label><Input type="date" value={data.end_date} onChange={(e) => setData(d => ({ ...d, end_date: e.target.value }))} /></div>
              <div className="col-span-2"><Label className="text-xs">Etichetta tariffa</Label><Input value={data.tariff_label} onChange={(e) => setData(d => ({ ...d, tariff_label: e.target.value }))} /></div>
              <div><Label className="text-xs">Totale (€)</Label><Input type="number" step="0.01" value={data.grand_total} onChange={(e) => setData(d => ({ ...d, grand_total: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs">Note interne</Label>
            <Textarea value={data.notes} onChange={(e) => setData(d => ({ ...d, notes: e.target.value }))} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
            Salva modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sotto-componente per upload documento
function DocumentField({ label, which, docs, uploading, onUpload, onRemove }) {
  const url = docs[`${which}_url`];
  const filename = docs[`${which}_filename`];
  const inputRef = useRef(null);
  const isUploading = uploading === which;

  return (
    <div className="border rounded p-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {url ? (
            <>
              <a href={url} target="_blank" rel="noopener" className="text-xs text-blue-700 hover:underline flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {filename || 'Visualizza file'}
              </a>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => onRemove(which)}>
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            </>
          ) : <span className="text-xs text-muted-foreground italic">Nessun file caricato</span>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => onUpload(which, e.target.files?.[0])}
        />
        <Button type="button" size="sm" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          {url ? 'Sostituisci' : 'Carica file'}
        </Button>
      </div>
    </div>
  );
}

// =====================================================================
// PAYMENT DIALOG (storico + nuovo pagamento)
// =====================================================================
function PaymentDialog({ contract: initial, onClose, onChange }) {
  const [contract, setContract] = useState(initial);
  const [form, setForm] = useState({
    amount: '',
    method: 'BONIFICO',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const ps = computePaymentStatus(contract);

  const refresh = async () => {
    try {
      const r = await fetch(`/api/marina-bookings/${contract.id}`);
      const d = await r.json();
      if (!d.error) setContract(d);
      onChange?.();
    } catch {}
  };

  const addPayment = async () => {
    const amt = Number(form.amount || 0);
    if (!amt || amt <= 0) { toast.error('Importo non valido'); return; }
    if (amt > ps.balance_remaining + 0.01) {
      if (!confirm(`L'importo (${fmtEur(amt)}) supera il saldo rimanente (${fmtEur(ps.balance_remaining)}). Confermi comunque?`)) return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/marina-bookings/${contract.id}?action=add-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: form.method,
          date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          reference: form.reference,
          notes: form.notes,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      setContract(data);
      onChange?.();
      setForm({ amount: '', method: 'BONIFICO', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });
      toast.success('Pagamento registrato');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deletePayment = async (paymentId) => {
    if (!confirm('Eliminare questo pagamento?')) return;
    try {
      const r = await fetch(`/api/marina-bookings/${contract.id}?action=delete-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      setContract(data);
      onChange?.();
      toast.success('Pagamento eliminato');
    } catch (e) { toast.error(e.message); }
  };

  // Combina pagamenti custom + legacy deposit/balance per visualizzazione
  const visiblePayments = useMemo(() => {
    const list = [...(contract.payments || [])];
    if (list.length === 0) {
      // Mostra legacy come righe info
      if (contract.deposit_paid) {
        list.push({
          id: 'legacy_deposit',
          legacy: true,
          amount: contract.deposit_amount,
          method: contract.deposit_payment_method || 'MANUALE',
          date: contract.deposit_payment_date,
          reference: contract.deposit_payment_reference,
          notes: 'Acconto registrato in fase di prenotazione (legacy)',
        });
      }
      if (contract.balance_paid) {
        list.push({
          id: 'legacy_balance',
          legacy: true,
          amount: contract.balance_amount,
          method: contract.balance_payment_method || 'MANUALE',
          date: contract.balance_payment_date,
          notes: 'Saldo registrato (legacy)',
        });
      }
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [contract]);

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" translate="no">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" />Pagamenti · {contract.booking_number}</DialogTitle>
          <DialogDescription>Cliente: <strong>{contract.customer?.name} {contract.customer?.surname}</strong> · Posto: <strong>{contract.berth_label}</strong></DialogDescription>
        </DialogHeader>

        {/* Riepilogo */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Totale Contratto</p>
            <p className="text-xl font-bold">{fmtEur(contract.grand_total)}</p>
          </CardContent></Card>
          <Card className="border-emerald-300"><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Incassato</p>
            <p className="text-xl font-bold text-emerald-700">{fmtEur(ps.paid_total)}</p>
          </CardContent></Card>
          <Card className={ps.balance_remaining > 0 ? 'border-amber-300' : 'border-emerald-300'}><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-xl font-bold ${ps.balance_remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtEur(ps.balance_remaining)}</p>
          </CardContent></Card>
        </div>

        {/* Storico Pagamenti */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Storico Pagamenti ({visiblePayments.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {visiblePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">Nessun pagamento registrato</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Metodo</th>
                    <th className="text-right p-2">Importo</th>
                    <th className="text-left p-2">Riferimento</th>
                    <th className="text-left p-2">Note</th>
                    <th className="text-center p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePayments.map((p, i) => (
                    <tr key={p.id || i} className="border-t">
                      <td className="p-2 text-xs">{fmtDate(p.date)}</td>
                      <td className="p-2 text-xs"><Badge variant="outline" className="text-[10px]">{p.method}</Badge></td>
                      <td className="p-2 text-right font-semibold text-emerald-700">{fmtEur(p.amount)}</td>
                      <td className="p-2 text-xs font-mono">{p.reference || '—'}</td>
                      <td className="p-2 text-xs">{p.notes || '—'}{p.legacy && <Badge variant="outline" className="ml-1 text-[9px]">legacy</Badge>}</td>
                      <td className="p-2 text-center">
                        {!p.legacy && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deletePayment(p.id)} title="Elimina">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Nuovo pagamento */}
        {ps.balance_remaining > 0 && (
          <Card className="border-blue-300 bg-blue-50/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-blue-900"><Plus className="w-4 h-4" />Registra nuovo pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Importo (€) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={`max ${ps.balance_remaining}`} />
                </div>
                <div>
                  <Label className="text-xs">Metodo *</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Riferimento (CRO, n° assegno, ecc.)</Label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs">Note</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={addPayment} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Registra pagamento
                </Button>
                <Button variant="outline" onClick={() => setForm(f => ({ ...f, amount: String(ps.balance_remaining) }))}>
                  <Euro className="w-4 h-4 mr-1" />Importo saldo ({fmtEur(ps.balance_remaining)})
                </Button>
                <Button variant="outline" onClick={() => setForm(f => ({ ...f, amount: String(Math.round(contract.grand_total * 0.3 * 100) / 100) }))}>
                  Acconto 30%
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {ps.balance_remaining === 0 && ps.paid_total > 0 && (
          <div className="bg-emerald-50 border border-emerald-300 rounded p-3 text-sm flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-5 h-5" />Contratto saldato. Nessun ulteriore pagamento dovuto.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// RECEIPT DIALOG (PDF / Word / Email)
// =====================================================================
function ReceiptDialog({ contract, companies, onClose }) {
  const [issuing, setIssuing] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('TOTAL'); // 'TOTAL' o id specifico

  const company = useMemo(() => {
    return (companies || []).find(c => c.id === contract.company_id) || null;
  }, [companies, contract.company_id]);

  const ps = computePaymentStatus(contract);
  const allPayments = Array.isArray(contract.payments) ? contract.payments : [];

  const selectedPayment = useMemo(() => {
    if (selectedPaymentId === 'TOTAL') return null;
    return allPayments.find(p => p.id === selectedPaymentId) || null;
  }, [selectedPaymentId, allPayments]);

  const generatePDF = async () => {
    setIssuing(true);
    try {
      const { downloadReceiptPDF } = await import('@/app/lib/receiptDoc');
      await downloadReceiptPDF(contract, company, selectedPayment);
      toast.success('Ricevuta PDF generata');
    } catch (e) { toast.error(friendlyError(e) || 'Errore PDF'); }
    finally { setIssuing(false); }
  };

  const generateDOCX = async () => {
    setIssuing(true);
    try {
      const { downloadReceiptDOCX } = await import('@/app/lib/receiptDoc');
      await downloadReceiptDOCX(contract, company, selectedPayment);
      toast.success('Ricevuta Word (.docx) generata');
    } catch (e) { toast.error(friendlyError(e) || 'Errore Word'); }
    finally { setIssuing(false); }
  };

  // Calcolo preview
  const receiptAmount = selectedPayment ? Number(selectedPayment.amount || 0) : ps.paid_total;
  const imponibile = Math.round((receiptAmount / 1.10) * 100) / 100;
  const iva = Math.round((receiptAmount - imponibile) * 100) / 100;

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" translate="no">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-600" />Genera Ricevuta · {contract.booking_number}</DialogTitle>
          <DialogDescription>Cliente: <strong>{contract.customer?.name} {contract.customer?.surname}</strong> · Posto: <strong>{contract.berth_label}</strong></DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selezione tipo ricevuta */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Tipo di ricevuta</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOTAL">Cumulativa: tutti gli importi incassati ({fmtEur(ps.paid_total)})</SelectItem>
                  {allPayments.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      Singolo pagamento del {fmtDate(p.date)} · {p.method} · {fmtEur(p.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground italic">
                La ricevuta cumulativa riepiloga tutti gli importi incassati. Quella singola si riferisce a un solo pagamento.
              </p>
            </CardContent>
          </Card>

          {/* Preview scorporo IVA 10% */}
          <Card className="border-blue-300 bg-blue-50/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scorporo IVA 10%</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td>Imponibile (netto)</td><td className="text-right font-semibold">{fmtEur(imponibile)}</td></tr>
                  <tr><td>IVA 10%</td><td className="text-right font-semibold">{fmtEur(iva)}</td></tr>
                  <tr className="border-t-2 border-blue-400"><td className="font-bold pt-1">TOTALE RICEVUTA</td><td className="text-right font-bold text-blue-800 pt-1">{fmtEur(receiptAmount)}</td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Avviso se nessun pagamento */}
          {ps.paid_total === 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              <div>
                Nessun pagamento è stato ancora registrato. <br />
                <span className="text-xs">Per generare una ricevuta valida, registra prima un pagamento dal pulsante "Pagamento".</span>
              </div>
            </div>
          )}

          {/* Avviso company */}
          {!company && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              <div>Company emittente non trovata. Il documento sarà generato senza logo.</div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose} disabled={issuing}>Chiudi</Button>
          <Button variant="outline" disabled title="Funzionalità in arrivo (richiede SendGrid/SMTP)" className="opacity-60 cursor-not-allowed">
            <Mail className="w-4 h-4 mr-2" />Invia via Email <Badge variant="outline" className="ml-2 text-[9px]">soon</Badge>
          </Button>
          <Button onClick={generateDOCX} disabled={issuing || receiptAmount === 0} variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
            {issuing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}Word
          </Button>
          <Button onClick={generatePDF} disabled={issuing || receiptAmount === 0} className="bg-amber-600 hover:bg-amber-700 text-white">
            {issuing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// CONTRACT DOC DIALOG (genera Word del contratto compilato)
// =====================================================================
function ContractDocDialog({ contract, companies, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [marina, setMarina] = useState(null);

  const company = useMemo(() => (companies || []).find(c => c.id === contract.company_id) || null, [companies, contract.company_id]);

  useEffect(() => {
    if (!contract.marina_id) return;
    fetch(`/api/marinas/${contract.marina_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setMarina(d))
      .catch(() => {});
  }, [contract.marina_id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { downloadContractDOCX } = await import('@/app/lib/contractDoc');
      await downloadContractDOCX(contract, company, marina);
      toast.success('Contratto Word generato');
    } catch (e) { toast.error(friendlyError(e) || 'Errore generazione contratto'); }
    finally { setGenerating(false); }
  };

  // Verifica completezza dati per warning
  const cust = contract.customer || {};
  const custEx = contract.customer_extras || {};
  const isCompany = !!custEx.is_company;
  const boat = contract.boat || {};
  const boatEx = contract.boat_extras || {};
  const docs = contract.documents || {};
  const boatClass = contract.boat_class || (boat.length && Number(boat.length) >= 10 ? 'diporto' : 'natante');

  const missing = [];
  if (!cust.name) missing.push('Nome cliente');
  if (!cust.tax_code) missing.push(isCompany ? 'P.IVA' : 'Codice fiscale');
  if (!cust.address && !cust.city) missing.push('Indirizzo cliente');
  if (!isCompany && !custEx.birth_place) missing.push('Luogo nascita cliente');
  if (!isCompany && !custEx.birth_date) missing.push('Data nascita cliente');
  if (isCompany && !custEx.legal_rep_name) missing.push('Legale rappresentante');
  if (!boat.length) missing.push('Lunghezza barca');
  if (boatClass === 'natante' && !boatEx.engine_type) missing.push('Motore (tipo)');
  if (boatClass === 'diporto' && !boatEx.registration_number && !boat.registration) missing.push('N° R.I.D.');

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" translate="no">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScrollText className="w-5 h-5 text-emerald-600" />Genera Contratto · {contract.booking_number}</DialogTitle>
          <DialogDescription>
            Contratto di servizi di ormeggio compilato con i dati del cliente, dell'imbarcazione e del posto barca.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Riepilogo dati</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div><strong>Tipo cliente:</strong> {isCompany ? 'Persona giuridica' : 'Persona fisica'}</div>
              <div><strong>Cliente:</strong> {cust.name} {cust.surname}</div>
              <div><strong>Categoria barca:</strong> {boatClass === 'natante' ? '☐ Natante' : '☐ Diporto'}</div>
              <div><strong>Imbarcazione:</strong> {boat.name || '—'} ({boat.type}, {boat.length}m × {boat.beam || 0}m)</div>
              <div><strong>Posto barca:</strong> {contract.berth_label || '—'}</div>
              <div><strong>Periodo:</strong> {fmtDate(contract.start_date)} → {fmtDate(contract.end_date)} ({contract.days} gg)</div>
              <div><strong>Corrispettivo:</strong> {fmtEur(contract.grand_total)}</div>
              <div className="flex gap-3 mt-1">
                <span className={docs.libretto_url ? 'text-emerald-700' : 'text-amber-700'}>
                  {docs.libretto_url ? '✓' : '○'} Libretto motore
                </span>
                <span className={docs.assicurazione_url ? 'text-emerald-700' : 'text-amber-700'}>
                  {docs.assicurazione_url ? '✓' : '○'} Cert. assicurazione
                </span>
              </div>
            </CardContent>
          </Card>

          {missing.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm flex gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1">Campi mancanti (verranno mostrati come "_____"):</div>
                <ul className="text-xs list-disc list-inside space-y-0.5">
                  {missing.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
                <div className="text-xs italic mt-1">Suggerimento: clicca su "Edita" per completare i dati prima di generare il contratto.</div>
              </div>
            </div>
          )}

          {!company && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              <div>Company emittente non trovata. Il contratto sarà generato senza logo.</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Chiudi</Button>
          <Button onClick={generate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Scarica Contratto Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

