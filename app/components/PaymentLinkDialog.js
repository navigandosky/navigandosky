"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link2, Search, Copy, Mail, Send, CheckCircle2, AlertCircle, ExternalLink, Euro } from 'lucide-react';

/**
 * PaymentLinkDialog - Genera link SumUp per integrazione importo
 *
 * Flusso:
 * 1. L'admin inserisce/seleziona codice Voucher (MK-yyyy-xxxx)
 * 2. Auto-lookup → pre-compila nome cliente, email, importo totale prenotazione
 * 3. L'admin specifica l'importo da integrare e sceglie come consegnare il link
 * 4. Bottone "Genera Link" → chiama /api/payment-link/create
 */
export default function PaymentLinkDialog({ open, onOpenChange, companyId, allBookings = [] }) {
  const [voucherRef, setVoucherRef] = useState('');
  const [booking, setBooking] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sendVia, setSendVia] = useState('show'); // 'show' | 'email'

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setVoucherRef('');
      setBooking(null);
      setCustomerName('');
      setCustomerEmail('');
      setAmount('');
      setDescription('');
      setSendVia('show');
      setResult(null);
      setError(null);
      setShowSuggest(false);
    }
  }, [open]);

  // Suggerimenti dalla lista bookings caricata in admin
  const suggestions = React.useMemo(() => {
    const q = (voucherRef || '').trim().toUpperCase();
    if (!q || q.length < 2) return [];
    return (allBookings || [])
      .filter(b => (b.booking_ref || '').toUpperCase().includes(q))
      .slice(0, 8);
  }, [voucherRef, allBookings]);

  // Lookup automatico quando l'utente smette di digitare (debounce 400ms)
  useEffect(() => {
    if (!voucherRef || voucherRef.length < 5) {
      setBooking(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await doLookup(voucherRef.trim().toUpperCase());
    }, 450);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherRef]);

  const doLookup = async (ref) => {
    setLookingUp(true);
    setError(null);
    try {
      const url = `/api/payment-link/lookup?ref=${encodeURIComponent(ref)}${companyId ? `&company_id=${companyId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setBooking(null);
        if (res.status === 404) setError('Prenotazione non trovata');
        else setError(data?.error || 'Errore lookup');
        return;
      }
      const b = data.booking;
      setBooking(b);
      // Pre-compila campi
      if (b.customer_name) setCustomerName(b.customer_name);
      if (b.customer_email) setCustomerEmail(b.customer_email);
      if (b.experience_name) {
        setDescription(`Integrazione Voucher ${b.booking_ref} - ${b.experience_name}`);
      }
      // Suggerisce un importo residuo se possibile
      const total = Number(b.total_amount || 0);
      const paidIntegrations = Number(b.paid_integrations_total || 0);
      const remaining = Math.max(total - paidIntegrations, 0);
      if (remaining > 0 && !amount) setAmount(remaining.toFixed(2));
    } catch (e) {
      setError(e.message);
      setBooking(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSelectSuggestion = (b) => {
    setVoucherRef(b.booking_ref);
    setShowSuggest(false);
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!booking) {
      setError('Seleziona una prenotazione valida (codice MK-...)');
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Nome e email cliente obbligatori');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Importo non valido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payment-link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          booking_ref: booking.booking_ref,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          amount: amt,
          description: description.trim(),
          send_via: sendVia,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Errore generazione link');
        return;
      }
      setResult(data);
      if (sendVia === 'email') {
        if (data.email_sent) toast.success(`✅ Link inviato a ${customerEmail} via ${data.email_provider}`);
        else if (data.warning) toast.warning(data.warning);
      } else {
        toast.success('✅ Link generato con successo');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.hosted_url) return;
    try {
      await navigator.clipboard.writeText(result.hosted_url);
      toast.success('🔗 Link copiato negli appunti');
    } catch {
      toast.error('Impossibile copiare. Seleziona manualmente il testo.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            Genera Link Pagamento Online (SumUp)
          </DialogTitle>
          <DialogDescription>
            Crea un link di pagamento SumUp da inviare al cliente per integrare un importo
            su una prenotazione esistente. Il pagamento verrà tracciato automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4 mt-2">
            {/* Step 1: Voucher Ref */}
            <div className="space-y-2">
              <Label htmlFor="voucher-ref">
                Riferimento Voucher <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="voucher-ref"
                      placeholder="MK-2026-0001"
                      value={voucherRef}
                      onChange={(e) => {
                        setVoucherRef(e.target.value.toUpperCase());
                        setShowSuggest(true);
                      }}
                      onFocus={() => setShowSuggest(true)}
                      onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                      className="pl-9 font-mono"
                    />
                  </div>
                  {lookingUp && (
                    <div className="flex items-center text-xs text-slate-500">Ricerca…</div>
                  )}
                </div>

                {/* Suggerimenti */}
                {showSuggest && suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0 text-sm"
                      >
                        <div className="font-mono font-semibold text-emerald-700">{s.booking_ref}</div>
                        <div className="text-xs text-slate-600 truncate">
                          {s.customer_name} · {s.experience_name || '—'} · €{Number(s.total_amount || 0).toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {booking && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-900">
                      <CheckCircle2 className="inline w-4 h-4 mr-1" />
                      Prenotazione trovata
                    </span>
                    <Badge variant="outline" className="bg-white">{booking.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-700 space-y-0.5">
                    <div><strong>Esperienza:</strong> {booking.experience_name || '—'}</div>
                    <div><strong>Totale:</strong> €{Number(booking.total_amount || 0).toFixed(2)} · <strong>Posti:</strong> {booking.seats}</div>
                    {Number(booking.paid_integrations_total || 0) > 0 && (
                      <div className="text-amber-700">
                        <strong>Integrazioni già pagate:</strong> €{Number(booking.paid_integrations_total).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Dati Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cust-name">Nome Cliente <span className="text-red-500">*</span></Label>
                <Input id="cust-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Mario Rossi" />
              </div>
              <div>
                <Label htmlFor="cust-email">Email Cliente <span className="text-red-500">*</span></Label>
                <Input id="cust-email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="cliente@example.com" />
              </div>
            </div>

            {/* Step 3: Importo */}
            <div>
              <Label htmlFor="amount">
                Importo da Integrare <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-9"
                  placeholder="50.00"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Importo in EUR che il cliente pagherà tramite SumUp.</p>
            </div>

            {/* Step 4: Descrizione */}
            <div>
              <Label htmlFor="desc">Descrizione (opzionale)</Label>
              <Textarea
                id="desc"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Es: Integrazione Voucher MK-2026-0001"
              />
            </div>

            {/* Step 5: Modalità invio */}
            <div>
              <Label>Modalità Consegna Link <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSendVia('show')}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition ${
                    sendVia === 'show' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Copy className="w-5 h-5 text-emerald-700" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Mostra & Copia</div>
                    <div className="text-xs text-slate-500">Il link viene mostrato da copiare</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSendVia('email')}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition ${
                    sendVia === 'email' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Mail className="w-5 h-5 text-emerald-700" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Invia via Email</div>
                    <div className="text-xs text-slate-500">Inviato direttamente al cliente</div>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Risultato */}
        {result && (
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-2">
                <CheckCircle2 className="w-5 h-5" />
                Link di pagamento generato!
              </div>
              <div className="text-sm text-slate-700 space-y-1">
                <div><strong>Voucher:</strong> <span className="font-mono">{result.booking_ref}</span></div>
                <div><strong>Importo:</strong> €{Number(result.amount).toFixed(2)} {result.currency}</div>
                {result.email_sent && (
                  <div className="text-emerald-700">
                    📧 Email inviata via <strong>{result.email_provider}</strong>
                  </div>
                )}
                {result.warning && (
                  <div className="text-amber-700">⚠️ {result.warning}</div>
                )}
              </div>
            </div>

            <div>
              <Label>Link Pagamento SumUp</Label>
              <div className="flex gap-2 mt-1">
                <Input value={result.hosted_url} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => window.open(result.hosted_url, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Riferimento checkout: <span className="font-mono">{result.checkout_reference}</span>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Annulla
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !booking}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>Generazione…</>
                ) : sendVia === 'email' ? (
                  <><Send className="w-4 h-4 mr-2" />Genera & Invia Email</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Genera Link</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setResult(null); setError(null); }}>
                Genera un altro
              </Button>
              <Button onClick={() => onOpenChange(false)}>Chiudi</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
