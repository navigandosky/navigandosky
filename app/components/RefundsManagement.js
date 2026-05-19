'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Banknote, Mail, Send, Upload, CheckCircle2, Search, Filter, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fmtEur = (n) => `${Number(n || 0).toFixed(2)} €`;
const fmtDate = (iso) => { if (!iso) return '-'; try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return iso; } };

const STATUS_LABEL = {
  NONE: { label: 'Da avviare', color: 'bg-slate-200 text-slate-700' },
  REQUESTED: { label: 'Email IBAN inviata', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  IBAN_RECEIVED: { label: 'IBAN ricevuto', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  COMPLETED: { label: 'Rimborsato', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

export default function RefundsManagement({ companyId, isSuperAdmin, currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = companyId ? `?company_id=${companyId}` : '';
      const res = await fetch(`/api/bookings${qs}`);
      const data = await res.json();
      // Solo prenotazioni rimborsabili: CANCELLED o PAID
      const refundable = (Array.isArray(data) ? data : []).filter((b) =>
        b.status === 'CANCELLED' || b.payment_status === 'PAID' || b.refund_status
      );
      setBookings(refundable);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  // KPI
  const stats = useMemo(() => {
    const r = { total: bookings.length, to_start: 0, requested: 0, iban_received: 0, completed: 0, total_amount: 0 };
    bookings.forEach((b) => {
      const s = b.refund_status || 'NONE';
      if (s === 'NONE') r.to_start += 1;
      else if (s === 'REQUESTED') r.requested += 1;
      else if (s === 'IBAN_RECEIVED') r.iban_received += 1;
      else if (s === 'COMPLETED') r.completed += 1;
      r.total_amount += Number(b.refund_amount || b.total_amount || 0);
    });
    return r;
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'all') {
        const s = b.refund_status || 'NONE';
        if (s !== statusFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!(
          (b.customer_name || '').toLowerCase().includes(q) ||
          (b.customer_email || '').toLowerCase().includes(q) ||
          (b.booking_ref || '').toLowerCase().includes(q) ||
          (b.experience_name || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [bookings, search, statusFilter]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const toggleAll = () => {
    const allSelected = filtered.every((b) => selected[b.id]);
    const next = { ...selected };
    filtered.forEach((b) => { next[b.id] = !allSelected; });
    setSelected(next);
  };

  const handleSendRequests = async () => {
    if (selectedIds.length === 0) {
      toast.error('Seleziona almeno una prenotazione');
      return;
    }
    if (!confirm(`Invio email di richiesta IBAN a ${selectedIds.length} cliente/i?`)) return;
    setSending(true);
    try {
      const res = await fetch('/api/refunds/send-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore invio');
      toast.success(`Email inviate: ${data.sent}, fallite: ${data.failed}`);
      if (data.failed > 0) {
        const failures = (data.results || []).filter((r) => !r.ok).map((r) => `${r.id}: ${r.error}`).join('\n');
        console.warn('Refund email failures:', failures);
        alert('Alcune email non sono state inviate:\n\n' + failures);
      }
      setSelected({});
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Banknote className="w-6 h-6 text-rose-600" />
            Procedura Rimborsi
          </CardTitle>
          <CardDescription>
            Selezione massiva prenotazioni, invio richiesta IBAN al cliente via email, registrazione IBAN e completamento rimborso con allegato bonifico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Totale</div><div className="text-2xl font-bold">{stats.total}</div></div>
            <div className="bg-white rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Da avviare</div><div className="text-2xl font-bold text-slate-700">{stats.to_start}</div></div>
            <div className="bg-white rounded-lg p-3 border"><div className="text-xs text-muted-foreground">In attesa IBAN</div><div className="text-2xl font-bold text-amber-700">{stats.requested}</div></div>
            <div className="bg-white rounded-lg p-3 border"><div className="text-xs text-muted-foreground">IBAN ricevuto</div><div className="text-2xl font-bold text-blue-700">{stats.iban_received}</div></div>
            <div className="bg-white rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Rimborsati</div><div className="text-2xl font-bold text-emerald-700">{stats.completed}</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Cerca (cliente, email, riferimento, esperienza)</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
                <Input className="pl-8" placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Stato rimborso</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="NONE">Da avviare</SelectItem>
                  <SelectItem value="REQUESTED">Email IBAN inviata</SelectItem>
                  <SelectItem value="IBAN_RECEIVED">IBAN ricevuto</SelectItem>
                  <SelectItem value="COMPLETED">Rimborsato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Aggiorna
            </Button>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              <CheckCircle2 className="w-4 h-4 mr-1" />Seleziona tutto ({filtered.length})
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              size="sm"
              onClick={handleSendRequests}
              disabled={sending || selectedIds.length === 0}
            >
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Invia richiesta IBAN ({selectedIds.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prenotazioni Rimborsabili ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-6 text-center text-muted-foreground">Caricamento...</div>}
          {!loading && filtered.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Banknote className="w-10 h-10 mx-auto opacity-40 mb-2" />
              Nessuna prenotazione rimborsabile trovata
            </div>
          )}
          <div className="space-y-2">
            {filtered.map((b) => {
              const stat = STATUS_LABEL[b.refund_status || 'NONE'];
              return (
                <div key={b.id} className="border rounded-lg p-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3 flex-wrap">
                    <input
                      type="checkbox"
                      className="mt-2 w-4 h-4"
                      checked={!!selected[b.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [b.id]: e.target.checked }))}
                      disabled={!b.customer_email}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-xs">{b.booking_ref || b.id.slice(0, 8)}</Badge>
                        <Badge className={`text-xs ${stat.color}`}>{stat.label}</Badge>
                        {b.status === 'CANCELLED' && <Badge variant="destructive" className="text-xs">Cancellata</Badge>}
                        {b.payment_status === 'PAID' && b.refund_status !== 'COMPLETED' && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Pagata</Badge>
                        )}
                        {b.payment_status === 'REFUNDED' && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">Rimborsata</Badge>
                        )}
                      </div>
                      <div className="font-semibold text-sm mt-1">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>{b.experience_name}</span>
                        <span>{fmtDate(b.slot_datetime)}</span>
                        <span><strong>{fmtEur(b.refund_amount || b.total_amount)}</strong></span>
                        <span><Mail className="w-3 h-3 inline mr-1" />{b.customer_email || <em className="text-red-600">no email</em>}</span>
                      </div>
                      {b.refund_iban && (
                        <div className="text-xs mt-1 bg-blue-50 px-2 py-1 rounded inline-block">
                          IBAN: <span className="font-mono">{b.refund_iban}</span>
                          {b.refund_iban_holder && ` · ${b.refund_iban_holder}`}
                        </div>
                      )}
                      {b.refund_transfer_reference && (
                        <div className="text-xs mt-1 text-emerald-700">
                          ✓ Rimborsato il {fmtDate(b.refund_completed_at || b.refund_transfer_date)} · CRO: {b.refund_transfer_reference}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                      Gestisci
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {editing && <RefundDialog booking={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

// === Dialog per gestire singolo rimborso ===
function RefundDialog({ booking, onClose, onSaved }) {
  const [iban, setIban] = useState(booking.refund_iban || '');
  const [holder, setHolder] = useState(booking.refund_iban_holder || booking.customer_name || '');
  const [bic, setBic] = useState(booking.refund_iban_bic || '');
  const [notes, setNotes] = useState(booking.refund_notes || '');
  const [amount, setAmount] = useState(booking.refund_amount || booking.total_amount || 0);
  const [cro, setCro] = useState(booking.refund_transfer_reference || '');
  const [transferDate, setTransferDate] = useState(booking.refund_transfer_date || new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState(booking.refund_transfer_receipt_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, data: reader.result }),
          });
          const data = await res.json();
          if (data.url) setReceiptUrl(data.url);
          else toast.error('Upload fallito');
        } catch (err) {
          toast.error(err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploading(false);
      toast.error(err.message);
    }
  };

  const saveIban = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/refunds/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_iban: iban,
          refund_iban_holder: holder,
          refund_iban_bic: bic,
          refund_notes: notes,
          refund_amount: amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success('IBAN salvato');
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const completeRefund = async () => {
    if (!cro) { toast.error('Inserisci numero CRO/riferimento bonifico'); return; }
    if (!confirm(`Confermare l'avvenuto rimborso di ${amount}€ con CRO ${cro}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/refunds/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_iban: iban,
          refund_iban_holder: holder,
          refund_iban_bic: bic,
          refund_notes: notes,
          refund_amount: amount,
          complete: true,
          refund_transfer_reference: cro,
          refund_transfer_date: transferDate,
          refund_transfer_receipt_url: receiptUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success('Rimborso completato');
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-rose-600" />Gestione Rimborso
          </DialogTitle>
          <DialogDescription>
            {booking.booking_ref} - {booking.customer_name} ({booking.customer_email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sezione IBAN */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Banknote className="w-4 h-4" />Dati Bancari Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="md:col-span-2">
                <Label className="text-xs">IBAN *</Label>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="IT60X0542811101000000123456"
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Intestatario</Label>
                <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome Cognome" />
              </div>
              <div>
                <Label className="text-xs">BIC/SWIFT (esteri)</Label>
                <Input value={bic} onChange={(e) => setBic(e.target.value.toUpperCase())} placeholder="BPMOIT22XXX" />
              </div>
              <div>
                <Label className="text-xs">Importo da rimborsare (€)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Es. al netto commissioni..." />
              </div>
            </div>
            <Button size="sm" className="mt-2" variant="outline" onClick={saveIban} disabled={saving || !iban}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Salva IBAN
            </Button>
          </div>

          {/* Sezione Bonifico */}
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Esecuzione Bonifico</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Numero CRO / Riferimento bonifico *</Label>
                <Input value={cro} onChange={(e) => setCro(e.target.value)} placeholder="20260520-1234" />
              </div>
              <div>
                <Label className="text-xs">Data bonifico</Label>
                <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Ricevuta bonifico (PDF/immagine)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} />
                {receiptUrl && (
                  <div className="text-xs mt-1 text-emerald-700">
                    ✓ Allegato caricato: <a href={receiptUrl} target="_blank" rel="noreferrer" className="underline">vedi</a>
                  </div>
                )}
              </div>
            </div>
            <Button
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={completeRefund}
              disabled={saving || !iban || !cro}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Conferma Rimborso Eseguito
            </Button>
          </div>

          {booking.refund_status === 'COMPLETED' && (
            <div className="bg-emerald-100 border border-emerald-300 rounded p-3 text-sm text-emerald-800">
              ✓ Rimborso gia\u0300 completato il {fmtDate(booking.refund_completed_at)} - CRO: {booking.refund_transfer_reference}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
