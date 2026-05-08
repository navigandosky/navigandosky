'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Ship, RefreshCw, Search, FileText, CheckCircle2, XCircle, CreditCard, FileSignature,
  Eye, Trash2, Anchor, Calendar, Euro, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

const STATUSES = [
  { value: 'PENDING', label: 'In attesa', color: 'bg-amber-100 text-amber-800' },
  { value: 'DEPOSIT_PAID', label: 'Acconto pagato', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONFIRMED', label: 'Confermata', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'CONTRACT', label: 'Contrattualizzata', color: 'bg-purple-100 text-purple-800' },
  { value: 'REJECTED', label: 'Rifiutata', color: 'bg-red-100 text-red-800' },
  { value: 'CANCELLED', label: 'Annullata', color: 'bg-slate-100 text-slate-700' },
];

export default function MarinaBookings({ currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [marinas, setMarinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [marinaFilter, setMarinaFilter] = useState('ALL');
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Company Admin vede solo le proprie prenotazioni (filtrate per company_id)
      if (!isSuperAdmin && currentUser?.company_id) {
        params.set('company_id', currentUser.company_id);
      }
      const [bRes, mRes] = await Promise.all([
        fetch(`/api/marina-bookings?${params.toString()}`),
        fetch('/api/marinas'),
      ]);
      const bData = await bRes.json();
      const mData = await mRes.json();
      setBookings(Array.isArray(bData) ? bData : []);
      setMarinas(Array.isArray(mData) ? mData : []);
    } catch (e) { toast.error('Errore caricamento'); }
    finally { setLoading(false); }
  }, [isSuperAdmin, currentUser?.company_id]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const s = { total: bookings.length, pending: 0, deposit_paid: 0, confirmed: 0, contract: 0, total_revenue: 0 };
    for (const b of bookings) {
      if (b.status === 'PENDING') s.pending++;
      if (b.status === 'DEPOSIT_PAID') s.deposit_paid++;
      if (b.status === 'CONFIRMED') s.confirmed++;
      if (b.status === 'CONTRACT') s.contract++;
      if (b.deposit_paid) s.total_revenue += (b.deposit_amount || 0);
    }
    return s;
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (marinaFilter !== 'ALL' && b.marina_id !== marinaFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          b.booking_number?.toLowerCase().includes(s) ||
          b.quote_number?.toLowerCase().includes(s) ||
          b.customer?.name?.toLowerCase().includes(s) ||
          b.customer?.surname?.toLowerCase().includes(s) ||
          b.customer?.email?.toLowerCase().includes(s) ||
          b.boat?.name?.toLowerCase().includes(s) ||
          b.marina_name?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, marinaFilter, search]);

  const doAction = async (booking, action, body = {}) => {
    try {
      const r = await fetch(`/api/marina-bookings/${booking.id}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Errore');
      const updated = await r.json();
      toast.success('Operazione completata');
      await load();
      return updated;
    } catch (e) { toast.error(e.message); return null; }
  };

  const payDepositManual = async (b) => {
    if (!confirm(`Confermare il pagamento manuale dell'acconto di ${fmtEur(b.deposit_amount)}?`)) return;
    await doAction(b, 'pay-deposit', { payment_method: 'MANUAL' });
  };

  const confirmBooking = async (b) => {
    if (!confirm('Confermare definitivamente questa prenotazione?')) return;
    await doAction(b, 'confirm');
  };

  const convertToContract = async (b) => {
    if (!confirm(`Convertire la prenotazione ${b.booking_number} in contratto attivo?`)) return;
    await doAction(b, 'convert-to-contract');
  };

  const handleReject = async () => {
    if (!rejecting) return;
    await doAction(rejecting, 'reject', { reason: rejectReason });
    setRejecting(null);
    setRejectReason('');
  };

  const deleteBooking = async (b) => {
    if (!confirm(`Eliminare la prenotazione ${b.booking_number}? Questa azione è irreversibile.`)) return;
    try {
      await fetch(`/api/marina-bookings/${b.id}`, { method: 'DELETE' });
      toast.success('Eliminata');
      await load();
    } catch (e) { toast.error('Errore eliminazione'); }
  };

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-lg p-2">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-900">Richieste Prenotazione Marina</h2>
            <p className="text-sm text-blue-700">Step 3: Richieste pubbliche da convertire in contratti</p>
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" />Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p><p className="text-xs uppercase">Totali</p>
        </CardContent></Card>
        <Card className="border-amber-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p><p className="text-xs uppercase">In attesa</p>
        </CardContent></Card>
        <Card className="border-blue-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.deposit_paid}</p><p className="text-xs uppercase">Acconto pagato</p>
        </CardContent></Card>
        <Card className="border-emerald-300"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.confirmed + stats.contract}</p><p className="text-xs uppercase">Confermate</p>
        </CardContent></Card>
        <Card className="border-purple-300"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-purple-700">{fmtEur(stats.total_revenue)}</p><p className="text-xs uppercase">Acconti incassati</p>
        </CardContent></Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Cerca</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="N°, cliente, barca, email..." className="pl-8" />
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
          {isSuperAdmin && (
            <div className="min-w-[200px]">
              <Label className="text-xs">Marina</Label>
              <Select value={marinaFilter} onValueChange={setMarinaFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutte</SelectItem>
                  {marinas.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />Archivio Richieste ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground"><RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Ship className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nessuna richiesta trovata</p>
              <p className="text-xs mt-1">Le richieste pubbliche di prenotazione appariranno qui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3">N° Prenotazione</th>
                    <th className="text-left p-3">Marina</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Periodo</th>
                    <th className="text-right p-3">Totale</th>
                    <th className="text-right p-3">Acconto 30%</th>
                    <th className="text-center p-3">Stato</th>
                    <th className="text-center p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const status = STATUSES.find(s => s.value === b.status) || STATUSES[0];
                    return (
                      <tr key={b.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-mono font-semibold text-blue-700">{b.booking_number}</div>
                          {b.quote_number && <div className="text-[10px] text-muted-foreground">da: {b.quote_number}</div>}
                        </td>
                        <td className="p-3 text-sm">{b.marina_name}</td>
                        <td className="p-3">
                          <div className="font-medium">{b.customer?.name} {b.customer?.surname}</div>
                          <div className="text-xs text-muted-foreground">{b.customer?.email}</div>
                          {b.boat?.name && <div className="text-xs text-muted-foreground">⛵ {b.boat.name} · {b.boat.length}m</div>}
                        </td>
                        <td className="p-3 text-xs">
                          {fmtDate(b.start_date)}<br />→ {fmtDate(b.end_date)}<br />
                          <span className="text-muted-foreground">({b.days} giorni)</span>
                        </td>
                        <td className="p-3 text-right font-semibold">{fmtEur(b.grand_total)}</td>
                        <td className="p-3 text-right">
                          <div className={b.deposit_paid ? 'text-emerald-700 font-semibold' : 'text-blue-700 font-medium'}>{fmtEur(b.deposit_amount)}</div>
                          {b.deposit_paid ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] mt-1">✓ Pagato</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] mt-1">Non pagato</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center"><Badge className={status.color}>{status.label}</Badge></td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap justify-center">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setViewing(b)}>
                              <Eye className="w-3 h-3 mr-1" />Dettaglio
                            </Button>
                            {!b.deposit_paid && b.status !== 'REJECTED' && (
                              <Button variant="secondary" size="sm" className="h-7 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={() => payDepositManual(b)}>
                                <CreditCard className="w-3 h-3 mr-1" />Marca Pagato
                              </Button>
                            )}
                            {b.status === 'DEPOSIT_PAID' && (
                              <Button variant="secondary" size="sm" className="h-7 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => confirmBooking(b)}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Conferma
                              </Button>
                            )}
                            {(b.status === 'CONFIRMED' || b.status === 'DEPOSIT_PAID') && (
                              <Button variant="secondary" size="sm" className="h-7 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200" onClick={() => convertToContract(b)}>
                                <FileSignature className="w-3 h-3 mr-1" />Contratto
                              </Button>
                            )}
                            {b.status !== 'REJECTED' && b.status !== 'CONTRACT' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Rifiuta" onClick={() => setRejecting(b)}>
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Elimina" onClick={() => deleteBooking(b)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
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

      {/* Dialog Dettaglio */}
      {viewing && (
        <Dialog open={true} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" translate="no">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-600" />Prenotazione {viewing.booking_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div><strong>{viewing.customer?.name} {viewing.customer?.surname}</strong></div>
                    <div>{viewing.customer?.email}</div>
                    <div>{viewing.customer?.phone}</div>
                    {viewing.customer?.tax_code && <div>CF/P.IVA: {viewing.customer.tax_code}</div>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Barca</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div><strong>{viewing.boat?.name || '—'}</strong></div>
                    <div>Targa: {viewing.boat?.registration || '—'}</div>
                    <div>Lunghezza: {viewing.boat?.length || 0} m · {viewing.boat?.type}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Periodo e Tariffa</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <div><Calendar className="w-3.5 h-3.5 inline mr-1" />{fmtDate(viewing.start_date)} → {fmtDate(viewing.end_date)} ({viewing.days} giorni)</div>
                  <div><Anchor className="w-3.5 h-3.5 inline mr-1" />{viewing.marina_name}</div>
                  <div className="font-medium">{viewing.tariff_label}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Importi</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Ormeggio</span><span>{fmtEur(viewing.mooring_amount)}</span></div>
                  {viewing.extras_total > 0 && <div className="flex justify-between"><span>Extra</span><span>{fmtEur(viewing.extras_total)}</span></div>}
                  <div className="flex justify-between font-bold border-t pt-1"><span>TOTALE</span><span>{fmtEur(viewing.grand_total)}</span></div>
                  <div className="flex justify-between mt-2 text-blue-700"><span>Acconto {viewing.deposit_pct}%</span><span className="font-semibold">{fmtEur(viewing.deposit_amount)} {viewing.deposit_paid && <span className="text-emerald-700">✓ pagato</span>}</span></div>
                  <div className="flex justify-between"><span>Saldo</span><span>{fmtEur(viewing.balance_amount)}</span></div>
                </CardContent>
              </Card>

              {viewing.deposit_paid && (
                <Card className="border-emerald-300">
                  <CardContent className="p-3 text-xs space-y-1">
                    <div className="font-semibold text-emerald-700">Pagamento Acconto</div>
                    <div>Metodo: <span className="font-mono">{viewing.deposit_payment_method}</span></div>
                    <div>Riferimento: <span className="font-mono">{viewing.deposit_payment_reference}</span></div>
                    <div>Data: {fmtDate(viewing.deposit_payment_date)}</div>
                  </CardContent>
                </Card>
              )}

              {viewing.notes && <div className="text-xs bg-muted p-3 rounded"><strong>Note:</strong> {viewing.notes}</div>}
              {viewing.reject_reason && <div className="text-xs bg-red-50 border border-red-200 p-3 rounded text-red-800"><strong>Motivo rifiuto:</strong> {viewing.reject_reason}</div>}
            </div>
            <DialogFooter>
              <Button onClick={() => setViewing(null)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Rifiuto */}
      {rejecting && (
        <Dialog open={true} onOpenChange={(o) => !o && setRejecting(null)}>
          <DialogContent className="max-w-md" translate="no">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />Rifiuta prenotazione {rejecting.booking_number}
              </DialogTitle>
              <DialogDescription>La prenotazione verrà marcata come rifiutata. Il cliente non potrà completarla.</DialogDescription>
            </DialogHeader>
            <div>
              <Label>Motivo (opzionale)</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Posto non disponibile, periodo non gestito, ecc." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejecting(null)}>Annulla</Button>
              <Button variant="destructive" onClick={handleReject}>Rifiuta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
