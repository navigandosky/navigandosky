'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, Search, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmtPrice = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtDate = (s) => { try { return new Date(s).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '-'; } };

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PENDING_VERIFICATION: 'bg-orange-100 text-orange-800',
  HELD: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

/**
 * SuperAdminBookingDelete - Strumento ESCLUSIVO Super Admin
 * Permette di eliminare DEFINITIVAMENTE prenotazioni anche CONFIRMED in base ai codici.
 * Doppia verifica: preview + token di conferma "ELIMINA DEFINITIVAMENTE".
 */
export default function SuperAdminBookingDelete({ isSuperAdmin, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [refsInput, setRefsInput] = useState('');
  const [preview, setPreview] = useState(null); // { requested, found, missing, bookings: [] }
  const [loading, setLoading] = useState(false);
  const [confirmToken, setConfirmToken] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!isSuperAdmin) return null;

  const parseRefs = (text) => {
    return Array.from(new Set(
      String(text || '')
        .split(/[\s,;\n\r]+/)
        .map(r => r.trim().toUpperCase())
        .filter(Boolean)
    ));
  };

  const handlePreview = async () => {
    const refs = parseRefs(refsInput);
    if (refs.length === 0) { toast.error('Inserisci almeno un codice prenotazione'); return; }
    if (refs.length > 50) { toast.error('Massimo 50 prenotazioni alla volta'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/admin-bookings-force-delete/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin': '1' },
        body: JSON.stringify({ refs }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || 'Errore'); setLoading(false); return; }
      setPreview(d);
      if (d.found === 0) toast.warning('Nessuna prenotazione trovata con i codici indicati');
      else toast.success(`${d.found} prenotazioni trovate · ${d.missing.length} non esistenti`);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
    setLoading(false);
  };

  const handleExecute = async () => {
    if (!preview || preview.found === 0) { toast.error('Esegui prima l\'anteprima'); return; }
    if (confirmToken !== 'ELIMINA DEFINITIVAMENTE') {
      toast.error('Devi digitare esattamente: ELIMINA DEFINITIVAMENTE');
      return;
    }
    // Ulteriore conferma con dialog browser
    if (!window.confirm(`🗑️ ATTENZIONE FINALE\n\nStai per ELIMINARE DEFINITIVAMENTE ${preview.found} prenotazioni dal database.\n\nQuesta operazione è IRREVERSIBILE.\nI posti degli slot verranno liberati e i rimborsi collegati eliminati.\n\nVuoi VERAMENTE procedere?`)) return;

    setDeleting(true);
    try {
      const refs = parseRefs(refsInput);
      const r = await fetch('/api/admin-bookings-force-delete/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin': '1' },
        body: JSON.stringify({ refs, confirm_token: confirmToken }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || 'Errore'); setDeleting(false); return; }
      toast.success(`✅ ${d.deleted} prenotazioni eliminate definitivamente`);
      setOpen(false);
      // Reset
      setRefsInput('');
      setPreview(null);
      setConfirmToken('');
      if (typeof onDeleted === 'function') onDeleted(d);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
    setDeleting(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => { setRefsInput(''); setPreview(null); setConfirmToken(''); }, 300);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
        title="SUPER ADMIN: Elimina prenotazioni per codice (anche CONFIRMED)"
      >
        <ShieldAlert className="w-4 h-4 mr-2" />
        Cancella per Codice
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              Eliminazione Definitiva Prenotazioni per Codice
            </DialogTitle>
            <DialogDescription>
              <strong>SUPER ADMIN</strong> · Permette di eliminare definitivamente prenotazioni anche <strong>CONFIRMED</strong>.
              I posti degli slot verranno liberati e i rimborsi collegati rimossi. <strong>Operazione irreversibile.</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Avviso */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-red-900">
                <strong>Doppia verifica richiesta:</strong> prima esegui l'anteprima, poi digita il token di conferma per eliminare.
              </div>
            </div>

            {/* Input codici */}
            <div>
              <Label className="font-semibold">Codici Prenotazione (uno per riga o separati da virgole)</Label>
              <Textarea
                value={refsInput}
                onChange={(e) => setRefsInput(e.target.value)}
                placeholder="MK-2026-0003&#10;MK-2026-0007&#10;MK-2026-0008&#10;MK-2026-0009"
                rows={5}
                className="font-mono text-sm"
                disabled={deleting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max 50 codici alla volta. Formato: <code>MK-2026-XXXX</code>.
              </p>
            </div>

            {/* Pulsante Anteprima */}
            <div className="flex gap-2">
              <Button onClick={handlePreview} disabled={loading || deleting || !refsInput.trim()} variant="outline">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Search className="w-4 h-4 mr-2"/>}
                Anteprima
              </Button>
              {preview && (
                <Button variant="ghost" size="sm" onClick={() => { setPreview(null); setConfirmToken(''); }}>
                  Reset Anteprima
                </Button>
              )}
            </div>

            {/* Risultati anteprima */}
            {preview && (
              <div className="space-y-3 border-2 border-amber-300 bg-amber-50/30 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                    Trovate: <span className="text-emerald-700">{preview.found}</span> · Non esistenti: <span className="text-red-700">{preview.missing.length}</span>
                  </h3>
                </div>

                {/* Lista non trovate */}
                {preview.missing.length > 0 && (
                  <div className="text-xs bg-red-50 border border-red-200 rounded p-2">
                    <strong className="text-red-700">⚠️ Codici non trovati ({preview.missing.length}):</strong>
                    <div className="mt-1 font-mono">{preview.missing.join(', ')}</div>
                  </div>
                )}

                {/* Tabella prenotazioni trovate */}
                {preview.bookings.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border rounded bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Codice</th>
                          <th className="p-2 text-left">Cliente</th>
                          <th className="p-2 text-left">Data Slot</th>
                          <th className="p-2 text-center">Posti</th>
                          <th className="p-2 text-right">Importo</th>
                          <th className="p-2 text-center">Stato</th>
                          <th className="p-2 text-left">Agenzia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.bookings.map(b => (
                          <tr key={b.booking_ref} className="border-t">
                            <td className="p-2 font-mono font-semibold">{b.booking_ref}</td>
                            <td className="p-2">{b.customer_name || '-'}</td>
                            <td className="p-2">{b.slot_datetime ? fmtDate(b.slot_datetime) : '-'}</td>
                            <td className="p-2 text-center">{b.seats || 0}</td>
                            <td className="p-2 text-right">{fmtPrice(b.total_amount)}</td>
                            <td className="p-2 text-center"><Badge className={STATUS_COLORS[b.status] || 'bg-gray-100'}>{b.status}</Badge></td>
                            <td className="p-2 text-[10px] text-muted-foreground">{b.agency_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Token di conferma */}
                {preview.found > 0 && (
                  <div className="border-2 border-red-400 rounded-lg p-3 bg-red-50/50 space-y-2">
                    <Label className="text-red-700 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4"/>
                      VERIFICA FINALE - Digita esattamente: <code className="bg-white px-2 py-0.5 rounded border">ELIMINA DEFINITIVAMENTE</code>
                    </Label>
                    <Input
                      value={confirmToken}
                      onChange={(e) => setConfirmToken(e.target.value)}
                      placeholder="ELIMINA DEFINITIVAMENTE"
                      className={`font-bold ${confirmToken === 'ELIMINA DEFINITIVAMENTE' ? 'border-emerald-500 bg-emerald-50' : 'border-red-300'}`}
                      disabled={deleting}
                    />
                    {confirmToken && confirmToken !== 'ELIMINA DEFINITIVAMENTE' && (
                      <p className="text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3"/>Token non valido</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={close} disabled={deleting}>Annulla</Button>
              {preview && preview.found > 0 && (
                <Button
                  onClick={handleExecute}
                  disabled={deleting || confirmToken !== 'ELIMINA DEFINITIVAMENTE'}
                  className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2"/>}
                  Elimina {preview.found} Prenotazioni
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
