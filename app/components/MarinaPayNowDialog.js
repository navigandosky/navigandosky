'use client';
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Anchor, Copy, ExternalLink, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

/**
 * MarinaPayNowDialog
 * Replica la "Modalità di Pagamento" delle Esperienze, ma per Marina Bookings.
 * Mostra prima la scelta dell'importo (% / € / Saldo), poi le 5 modalità:
 *  - CASH                → registra come pagato direttamente
 *  - ONLINE              → apre subito il POS Web SumUp in nuova scheda
 *  - BANK_TRANSFER       → registra in attesa di verifica + opzionale email con coordinate
 *  - LATER               → non registra nulla, mantiene PENDING (placeholder)
 *  - PAYMENT_LINK        → genera link SumUp, mostra o invia via email
 */
export default function MarinaPayNowDialog({ open, booking, currentUser, isAgency = false, onClose, onSuccess }) {
  const grandTotal = useMemo(() => Math.round(Number(booking?.grand_total || booking?.total || 0) * 100) / 100, [booking]);
  const alreadyPaid = useMemo(() => {
    const dep = booking?.deposit_paid ? Number(booking?.deposit_amount || 0) : 0;
    const bal = booking?.balance_paid ? Number(booking?.balance_amount || 0) : 0;
    const integrPaid = (booking?.integration_payments || [])
      .filter(p => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return Math.round((dep + bal + integrPaid) * 100) / 100;
  }, [booking]);
  const remaining = Math.max(0, Math.round((grandTotal - alreadyPaid) * 100) / 100);

  // Step 1: importo. Step 2: modalità. Step 3 (solo PAYMENT_LINK): link generato.
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('pct'); // 'pct' | 'amount'
  const [pct, setPct] = useState(String(booking?.deposit_pct || 30));
  const [amount, setAmount] = useState(String((Math.round(grandTotal * (booking?.deposit_pct || 30) / 100 * 100) / 100).toFixed(2)));
  const [paymentMethod, setPaymentMethod] = useState('PAYMENT_LINK');
  const [paymentRef, setPaymentRef] = useState('');
  const [note, setNote] = useState('');
  const [sendBankEmail, setSendBankEmail] = useState(true);
  const [linkSendVia, setLinkSendVia] = useState('show'); // 'show' | 'email'
  const [generatedLink, setGeneratedLink] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset al cambio booking
  useEffect(() => {
    if (open && booking) {
      const defaultPct = Number(booking?.deposit_pct || 30);
      setStep(1);
      setMode('pct');
      setPct(String(defaultPct));
      setAmount(String((Math.round(grandTotal * defaultPct / 100 * 100) / 100).toFixed(2)));
      setPaymentMethod('PAYMENT_LINK');
      setPaymentRef('');
      setNote('');
      setSendBankEmail(true);
      setLinkSendVia('show');
      setGeneratedLink(null);
      setSubmitting(false);
    }
  }, [open, booking, grandTotal]);

  const previewAmount = useMemo(() => {
    if (mode === 'pct') {
      const n = Number(String(pct).replace(',', '.'));
      return Number.isFinite(n) ? Math.round(grandTotal * n / 100 * 100) / 100 : 0;
    }
    const n = Number(String(amount).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }, [mode, pct, amount, grandTotal]);

  const previewPct = grandTotal > 0 ? Math.round((previewAmount / grandTotal) * 10000) / 100 : 0;
  const isFull = previewAmount > 0 && previewAmount >= remaining - 0.01;

  const setPctAndSync = (val) => {
    const v = String(val).replace(',', '.');
    const n = Number(v);
    const amt = (Number.isFinite(n) && grandTotal > 0) ? (Math.round(grandTotal * n / 100 * 100) / 100).toFixed(2) : '';
    setMode('pct');
    setPct(v);
    setAmount(amt);
  };
  const setAmountAndSync = (val) => {
    const v = String(val).replace(',', '.');
    const n = Number(v);
    const p = (Number.isFinite(n) && grandTotal > 0) ? String(Math.round((n / grandTotal) * 10000) / 100) : '';
    setMode('amount');
    setAmount(v);
    setPct(p);
  };

  const senderLabel = isAgency
    ? `Agenzia · ${currentUser?.full_name || currentUser?.username || ''}`
    : `Admin · ${currentUser?.full_name || currentUser?.username || 'admin'}`;

  // Esegue il pagamento per la modalità scelta
  const handleSubmit = async () => {
    if (!booking || previewAmount <= 0 || previewAmount > grandTotal + 0.01) {
      toast.error('Importo non valido');
      return;
    }
    setSubmitting(true);
    try {
      if (paymentMethod === 'CASH' || paymentMethod === 'BANK_TRANSFER') {
        // Registra il pagamento direttamente
        const pmCode = paymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER';
        const r = await fetch(`/api/marina-bookings/${booking.id}?action=pay-deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paid_amount: previewAmount,
            payment_method: pmCode,
            payment_reference: paymentRef || (paymentMethod === 'CASH' ? `CASH-${Date.now()}` : null),
            note: note || `Inserito da ${senderLabel}`,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Errore registrazione pagamento');

        // Se Bonifico: invia email con coordinate (opzionale)
        if (paymentMethod === 'BANK_TRANSFER' && sendBankEmail && booking.customer?.email) {
          try {
            await fetch('/api/marina-payment-link/send-bank-transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: booking.id,
                amount: previewAmount,
                payment_type: isFull ? 'full' : 'deposit',
              }),
            });
            toast.success('Coordinate bonifico inviate via email');
          } catch (e) { console.warn('Errore invio email bonifico:', e.message); }
        }
        toast.success(paymentMethod === 'CASH' ? '✅ Pagamento registrato' : '🏦 Pagamento bonifico registrato (in attesa)');
        if (onSuccess) onSuccess(data);
        onClose();
      } else if (paymentMethod === 'ONLINE') {
        // Apri POS Web SumUp in nuova scheda
        const r = await fetch('/api/marina-payment-link/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: booking.id,
            customer_name: `${booking.customer?.name || ''} ${booking.customer?.surname || ''}`.trim(),
            customer_email: booking.customer?.email || 'noemail@maretrek.local',
            amount: previewAmount,
            send_via: 'show',
            payment_type: isFull ? 'full' : 'deposit',
            from_label: senderLabel,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Errore SumUp');
        if (data.hosted_url) {
          window.open(data.hosted_url, '_blank');
          toast.success('💳 POS Web SumUp aperto in una nuova scheda');
          if (onSuccess) onSuccess(data);
          onClose();
        }
      } else if (paymentMethod === 'LATER') {
        toast.success('⏳ Prenotazione lasciata in attesa di pagamento');
        onClose();
      } else if (paymentMethod === 'PAYMENT_LINK') {
        const r = await fetch('/api/marina-payment-link/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: booking.id,
            customer_name: `${booking.customer?.name || ''} ${booking.customer?.surname || ''}`.trim(),
            customer_email: booking.customer?.email || '',
            amount: previewAmount,
            send_via: linkSendVia,
            payment_type: isFull ? 'full' : 'deposit',
            from_label: senderLabel,
            description: note || undefined,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Errore generazione link');
        setGeneratedLink({ url: data.hosted_url, amount: previewAmount, sentViaEmail: linkSendVia === 'email' && data.email_sent });
        if (linkSendVia === 'email' && data.email_sent) toast.success('✉️ Link inviato via email al cliente');
        else if (linkSendVia === 'email' && !data.email_sent) toast.warning('Link generato ma invio email non riuscito: usa Copia');
        else toast.success('🔗 Link generato!');
        if (onSuccess) onSuccess(data);
        // resta aperto per mostrare il link
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !booking) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" translate="no">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            💳 Paga Ora · {booking.booking_number}
          </DialogTitle>
          <DialogDescription>
            Cliente: <span className="font-medium">{booking.customer?.name} {booking.customer?.surname}</span> · Totale prenotazione: <strong>{fmtEur(grandTotal)}</strong>
            {alreadyPaid > 0 && <> · Già pagato: <span className="text-emerald-700 font-medium">{fmtEur(alreadyPaid)}</span> · Residuo: <strong className="text-blue-700">{fmtEur(remaining)}</strong></>}
          </DialogDescription>
        </DialogHeader>

        {/* Mostra link generato se PAYMENT_LINK ha avuto successo */}
        {generatedLink && (
          <div className="space-y-3">
            <div className="text-center py-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-emerald-900">Link di Pagamento Pronto!</h3>
              <p className="text-sm text-emerald-700 mt-1">Importo: <strong>{fmtEur(generatedLink.amount)}</strong></p>
              {generatedLink.sentViaEmail && <Badge className="bg-emerald-100 text-emerald-700 mt-2">📧 Inviato a {booking.customer?.email}</Badge>}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg space-y-2">
              <Label className="text-xs">Link SumUp</Label>
              <div className="flex gap-2">
                <Input value={generatedLink.url} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generatedLink.url); toast.success('Link copiato'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {generatedLink.sentViaEmail
                  ? 'Il link è già stato inviato al cliente via email. La prenotazione passerà automaticamente a CONFERMATA appena il cliente completerà il pagamento.'
                  : 'Invia questo link al cliente via Email, WhatsApp o SMS. La prenotazione passerà automaticamente a CONFERMATA appena il cliente completerà il pagamento.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => window.open(generatedLink.url, '_blank')} className="border-purple-300 text-purple-700">
                <ExternalLink className="w-4 h-4 mr-2" />Apri pagina
              </Button>
              <Button variant="outline" onClick={() => {
                const phone = (booking.customer?.phone || '').replace(/\D/g, '');
                if (!phone) { toast.error('Cliente senza numero telefono'); return; }
                const txt = `Ciao ${booking.customer?.name},%0A%0APer completare la prenotazione ${booking.booking_number} clicca sul link sicuro qui sotto:%0A${generatedLink.url}%0A%0AGrazie!`;
                window.open(`https://wa.me/${phone}?text=${txt}`, '_blank');
              }} className="border-green-300 text-green-700">
                💬 Invia via WhatsApp
              </Button>
            </div>
          </div>
        )}

        {!generatedLink && step === 1 && (
          <div className="space-y-4">
            {/* Stepper indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">1. Importo</div>
              <div className="flex-1 h-0.5 bg-slate-200" />
              <div className="px-2 py-1 bg-slate-100 rounded">2. Modalità</div>
            </div>

            <div>
              <Label className="text-sm">Importo Rapido</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[20, 30, 50, 70].map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={Math.round(previewPct) === p ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setPctAndSync(p)}
                  >
                    {p}% ({fmtEur(grandTotal * p / 100)})
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={remaining > 0 && Math.abs(previewAmount - remaining) < 0.01 ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs bg-emerald-50 hover:bg-emerald-100"
                  onClick={() => setAmountAndSync(remaining)}
                >
                  Saldo residuo ({fmtEur(remaining)})
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Percentuale (%)</Label>
                <Input type="number" min="0.01" max="100" step="0.01" value={pct} onChange={(e) => setPctAndSync(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Importo (€)</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmountAndSync(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="font-semibold text-emerald-700">{fmtEur(previewAmount)} <span className="text-xs text-muted-foreground">({previewPct.toFixed(2)}%)</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stato risultante</span>
                <span className={`text-xs font-bold ${isFull ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {isFull ? '✓ CONFERMATA (saldo completo)' : '• ACCONTO PAGATO'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={onClose}>Annulla</Button>
              <Button onClick={() => setStep(2)} disabled={previewAmount <= 0 || previewAmount > grandTotal + 0.01}>
                Avanti · Scegli Modalità →
              </Button>
            </div>
          </div>
        )}

        {!generatedLink && step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">1. Importo · {fmtEur(previewAmount)}</div>
              <div className="flex-1 h-0.5 bg-emerald-300" />
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold">2. Modalità</div>
            </div>

            <Label className="text-sm">Modalità di Pagamento</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* CASH - Direct */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">💵 Pagamento Diretto / Contanti</div>
                  <div className="text-xs text-muted-foreground">Il cliente paga in contanti o POS. Tu confermi che hai ricevuto.</div>
                </div>
              </label>

              {/* ONLINE - SumUp POS Web */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'ONLINE' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">💳 Carta di Credito (SumUp/Stripe)</div>
                  <div className="text-xs text-muted-foreground">Apre <strong>subito il POS Web SumUp</strong> in una nuova scheda. La prenotazione passa automaticamente a PAGATA.</div>
                </div>
              </label>

              {/* BANK_TRANSFER */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'BANK_TRANSFER' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => setPaymentMethod('BANK_TRANSFER')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">🏦 Bonifico (in attesa di verifica)</div>
                  <div className="text-xs text-muted-foreground">Registra il pagamento come <strong>PENDING</strong>. Confermerai dopo aver verificato l&apos;accredito.</div>
                  {paymentMethod === 'BANK_TRANSFER' && (
                    <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={sendBankEmail} onChange={(e) => setSendBankEmail(e.target.checked)} />
                      <span>📧 Invia coordinate bonifico al cliente via email</span>
                    </label>
                  )}
                </div>
              </label>

              {/* LATER */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'LATER' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'LATER'} onChange={() => setPaymentMethod('LATER')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">⏳ Da Pagare Successivamente</div>
                  <div className="text-xs text-muted-foreground">Prenotazione lasciata in <strong>PENDING</strong> finché non viene marcata come pagata.</div>
                </div>
              </label>

              {/* PAYMENT_LINK */}
              <label className={`md:col-span-2 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'PAYMENT_LINK' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'} bg-gradient-to-r from-purple-50/30 to-pink-50/30`}>
                <input type="radio" checked={paymentMethod === 'PAYMENT_LINK'} onChange={() => setPaymentMethod('PAYMENT_LINK')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">🔗 Link Pagamento Esterno (SumUp)</div>
                  <div className="text-xs text-muted-foreground">Genera un <strong>link di pagamento SumUp</strong> da inviare al cliente via email/WhatsApp. La prenotazione passa automaticamente a PAGATA appena il cliente completa il pagamento.</div>
                  {paymentMethod === 'PAYMENT_LINK' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs ${linkSendVia === 'show' ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`}>
                        <input type="radio" checked={linkSendVia === 'show'} onChange={() => setLinkSendVia('show')} />
                        <span>👁 Mostra link (copia + WhatsApp)</span>
                      </label>
                      <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs ${linkSendVia === 'email' ? 'border-purple-400 bg-purple-50' : 'border-slate-200'} ${!booking.customer?.email ? 'opacity-50' : ''}`}>
                        <input type="radio" checked={linkSendVia === 'email'} onChange={() => setLinkSendVia('email')} disabled={!booking.customer?.email} />
                        <Mail className="w-3 h-3" />
                        <span>Invia subito via email{!booking.customer?.email && ' (no email)'}</span>
                      </label>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Riferimento e nota per i pagamenti diretti */}
            {(paymentMethod === 'CASH' || paymentMethod === 'BANK_TRANSFER') && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-xs">Riferimento (opzionale)</Label>
                  <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="CRO, TRN, n. ricevuta..." />
                </div>
                <div>
                  <Label className="text-xs">Nota (opzionale)</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note interne" />
                </div>
              </div>
            )}
            {paymentMethod === 'PAYMENT_LINK' && (
              <div>
                <Label className="text-xs">Descrizione (opzionale)</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. Acconto 30% prenotazione marina luglio..." />
              </div>
            )}

            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>← Indietro</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Elaborazione…' : (
                  paymentMethod === 'ONLINE' ? '💳 Apri POS SumUp' :
                  paymentMethod === 'PAYMENT_LINK' ? (linkSendVia === 'email' ? '✉️ Genera e Invia Link' : '🔗 Genera Link') :
                  paymentMethod === 'LATER' ? 'Conferma · Lascia in attesa' :
                  `Registra ${fmtEur(previewAmount)}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {generatedLink && (
          <DialogFooter className="pt-3 border-t">
            <Button onClick={onClose}>Chiudi</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
