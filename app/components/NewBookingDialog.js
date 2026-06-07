'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tag, ChevronRight, ChevronLeft, Calendar, Users, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const fmtPrice = p => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p || 0);
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

// Helper: trova la fascia di prezzo attiva per una data
function getPriceTierForDate(experience, date) {
  if (!experience?.price_tiers || experience.price_tiers.length === 0) return null;
  const dateStr = typeof date === 'string' ? date.split('T')[0] : '';
  for (const tier of experience.price_tiers) {
    if (!tier.start_date || !tier.end_date) continue;
    if (dateStr >= tier.start_date && dateStr <= tier.end_date) return tier;
  }
  return null;
}

export default function NewBookingDialog({ open, onClose, currentUser, companyId: propCompanyId, agencyId: propAgencyId, agencyName: propAgencyName, prefillExperienceId, onCreated }) {
  // Risolvi company_id: priorità a prop, poi a currentUser
  const companyId = propCompanyId || currentUser?.company_id || null;
  const agencyId = propAgencyId || null;
  const isAgency = !!agencyId; // se è settato, siamo nel flusso agenzia
  const userLabel = currentUser?.username || 'admin';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [seats, setSeats] = useState(1);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER'); // CASH | ONLINE | BANK_TRANSFER | LATER | PAYMENT_LINK
  const [paymentMarked, setPaymentMarked] = useState(true); // se il cliente ha già pagato
  const [paymentMethods, setPaymentMethods] = useState([]); // metodi disponibili da company config
  const [generatedLink, setGeneratedLink] = useState(null); // hosted URL SumUp dopo creazione
  const [searchDate, setSearchDate] = useState(''); // ricerca slot per data specifica (YYYY-MM-DD)
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Reset al chiudere
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSelectedExp(null);
        setSelectedSlot(null);
        setSlots([]);
        setSeats(1);
        setCustomer({ name: '', email: '', phone: '', notes: '' });
        setPaymentMethod('CASH');
        setPaymentMarked(true);
        setGeneratedLink(null);
        setSearchDate('');
        setTermsAccepted(false);
      }, 300);
    }
  }, [open]);

  // Carica esperienze e metodi pagamento all'apertura
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (companyId) params.set('company_id', companyId);
        const r = await fetch(`/api/experiences?${params.toString()}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data.filter(e => e.is_active !== false) : [];
        setExperiences(list);
        // Carica metodi di pagamento configurati per questa company
        if (companyId) {
          const pmRes = await fetch(`/api/companies/${companyId}/payment-methods`);
          const pmData = await pmRes.json();
          setPaymentMethods(Array.isArray(pmData?.methods) ? pmData.methods : []);
        }
        // Se è stata passata una esperienza pre-selezionata, saltala allo step 2
        if (prefillExperienceId) {
          const exp = list.find(e => e.id === prefillExperienceId);
          if (exp) {
            setSelectedExp(exp);
            setStep(2);
          }
        }
      } catch (e) { console.error(e); }
    })();
  }, [open, companyId, prefillExperienceId]);

  // Carica slot quando si sceglie un'esperienza
  useEffect(() => {
    if (!selectedExp?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/slots?experience_id=${selectedExp.id}`);
        const data = await r.json();
        const future = (Array.isArray(data) ? data : [])
          // Escludi slot CHIUSI o CANCELLATI: non prenotabili neppure dall'admin/agenzia
          .filter(s => s.status !== 'CLOSED' && s.status !== 'CANCELLED')
          .filter(s => new Date(s.start_datetime) >= new Date(Date.now() - 3600 * 1000))
          .filter(s => (s.max_seats - s.booked_seats - (s.blocked_seats || 0)) > 0)
          .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        setSlots(future);
      } catch (e) { setSlots([]); }
    })();
  }, [selectedExp?.id]);

  // Calcola prezzo dello slot selezionato
  const pricePerSeat = useMemo(() => {
    if (!selectedSlot || !selectedExp) return 0;
    if (selectedSlot.price_override) return selectedSlot.price_override;
    const tier = getPriceTierForDate(selectedExp, selectedSlot.start_datetime);
    return tier?.price_b2c || selectedExp.price_b2c || 0;
  }, [selectedSlot, selectedExp]);

  const tierName = useMemo(() => {
    if (!selectedSlot || !selectedExp || selectedSlot.price_override) return null;
    const tier = getPriceTierForDate(selectedExp, selectedSlot.start_datetime);
    return tier?.tier_name || null;
  }, [selectedSlot, selectedExp]);

  const total = pricePerSeat * seats;

  // Submit prenotazione
  const handleCreate = async () => {
    if (!selectedSlot || !selectedExp || !customer.name) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    if (!termsAccepted) {
      toast.error('È necessario confermare l\'accettazione delle condizioni di vendita');
      return;
    }
    setLoading(true);
    try {
      // Determina status/payment_status finale lato client (verrà confermato dal backend)
      let pmForBackend = 'ONLINE';
      if (paymentMethod === 'BANK_TRANSFER') pmForBackend = 'BANK_TRANSFER';
      // Per AGENCY: "Da Pagare Successivamente" si comporta come bonifico (PENDING_VERIFICATION + upload ricevuta)
      else if (paymentMethod === 'LATER') {
        pmForBackend = isAgency ? 'BANK_TRANSFER' : 'DIRECT';
      }
      else if (paymentMethod === 'CASH') pmForBackend = 'DIRECT';
      else if (paymentMethod === 'PAYMENT_LINK') pmForBackend = 'ONLINE'; // resta PENDING_VERIFICATION until SumUp webhook confirms

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          experience_id: selectedExp.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          seats,
          total_amount: total,
          special_requests: customer.notes,
          payment_method: pmForBackend,
          company_id: companyId,
          agency_id: agencyId,
          agency_name: propAgencyName || null,
          // Flag che indica all'admin la modalità desiderata (post-process)
          admin_created: true,
          admin_payment_intent: paymentMethod,
          // Accettazione condizioni di vendita
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        }),
      });
      // Lettura robusta del body: in caso di risposta non-JSON o vuota, evita crash con messaggio chiaro
      const rawText = await res.text();
      let created;
      try {
        created = rawText ? JSON.parse(rawText) : null;
      } catch (jsonErr) {
        console.error('[NewBookingDialog] Risposta non valida dal server:', rawText?.slice(0, 300));
        toast.error('Risposta non valida dal server (status ' + res.status + '). Controlla la console.');
        setLoading(false);
        return;
      }
      if (!res.ok || created?.error) {
        toast.error(created?.error || `Errore HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      if (!created?.id) {
        toast.error('Risposta del server senza ID prenotazione');
        setLoading(false);
        return;
      }

      // Se l'admin ha segnato CASH come "già pagato" → marca subito come PAID/CONFIRMED
      // NOTA: per ONLINE (Carta SumUp) NON marchiamo come pagato: apriamo direttamente il POS Web
      if (paymentMethod === 'CASH' && paymentMarked) {
        await fetch(`/api/bookings/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm-bank-transfer',
            verified_by: userLabel,
            note: 'Pagamento contanti/POS in loco',
          }),
        });
      }

      // Se ONLINE (Carta SumUp): apri SUBITO il POS Web in una nuova scheda
      if (paymentMethod === 'ONLINE') {
        try {
          const lkRes = await fetch('/api/sumup/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: created.id }),
          });
          const lk = await lkRes.json();
          if (lk.hosted_url) {
            // Apri POS Web SumUp in nuova scheda
            window.open(lk.hosted_url, '_blank');
            toast.success(`✅ Prenotazione ${created.booking_ref} creata - POS SumUp aperto!`);
            if (onCreated) onCreated(created);
            onClose();
            setLoading(false);
            return;
          } else {
            toast.error('Errore apertura POS SumUp: ' + (lk.error || 'unknown'));
            setLoading(false);
            return;
          }
        } catch (e) { toast.error('Errore SumUp: ' + e.message); setLoading(false); return; }
      }

      // Se PAYMENT_LINK: genera l'hosted checkout SumUp e mostra il link
      if (paymentMethod === 'PAYMENT_LINK') {
        try {
          const lkRes = await fetch('/api/sumup/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: created.id }),
          });
          const lk = await lkRes.json();
          if (lk.hosted_url) {
            setGeneratedLink({ url: lk.hosted_url, booking: created });
            toast.success(`✅ Prenotazione ${created.booking_ref} creata - Link generato!`);
            if (onCreated) onCreated(created);
            setLoading(false);
            return; // NON chiudo: mostro il link generato all'utente
          } else {
            toast.error('Prenotazione creata ma errore generazione link: ' + (lk.error || 'unknown'));
          }
        } catch (e) { toast.error('Errore generazione link SumUp: ' + e.message); }
      }

      toast.success(`Prenotazione ${created.booking_ref} creata!`);
      if (onCreated) onCreated(created);
      onClose();
    } catch (e) { toast.error('Errore: ' + e.message); }
    setLoading(false);
  };

  const availableSeats = selectedSlot
    ? Math.max(0, (selectedSlot.max_seats || 0) - (selectedSlot.booked_seats || 0) - (selectedSlot.blocked_seats || 0))
    : 0;
  const seatsExceed = selectedSlot && seats > availableSeats;

  const canNext = () => {
    if (step === 1) return !!selectedExp;
    if (step === 2) return !!selectedSlot;
    if (step === 3) return !!customer.name && !seatsExceed;
    return true;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6 shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            🎫 Crea Prenotazione Manuale · <span className="text-sm font-normal text-muted-foreground">Step {step}/4</span>
          </DialogTitle>
        </DialogHeader>

        {/* Area scrollabile interna: footer rimane SEMPRE visibile in basso */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">

        {/* Step indicator (nascosto se mostriamo il link generato) */}
        {!generatedLink && (
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          {['Esperienza', 'Data', 'Cliente', 'Pagamento'].map((label, i) => (
            <div key={i} className="flex-1 flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-xs hidden sm:inline ${step === i + 1 ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-green-500' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
        )}

        {/* STEP 1: Esperienza */}
        {!generatedLink && step === 1 && (
          <div className="space-y-3">
            <Label>Seleziona Esperienza</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {experiences.length === 0 && <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Nessuna esperienza disponibile</p>}
              {experiences.map(exp => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => setSelectedExp(exp)}
                  className={`text-left p-3 rounded-lg border-2 transition ${selectedExp?.id === exp.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="font-semibold text-sm">{exp.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{exp.duration_minutes / 60}h • Max {exp.max_capacity} pers.</div>
                  <div className="text-xs font-bold text-primary mt-1">da {fmtPrice(exp.price_b2c)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Data / Slot */}
        {!generatedLink && step === 2 && selectedExp && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <strong>{selectedExp.name}</strong>
            </div>
            {/* Cerca per data specifica */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-sm flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Cerca per data specifica
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="bg-white"
                />
                {searchDate && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSearchDate('')}>
                    Mostra tutte
                  </Button>
                )}
              </div>
              {searchDate && (() => {
                const matching = slots.filter(s => (s.start_datetime || '').split('T')[0] === searchDate);
                return (
                  <p className="text-xs text-muted-foreground mt-2">
                    {matching.length === 0
                      ? '⚠️ Nessuno slot disponibile per questa data. Prova a scegliere un\'altra data o rimuovi il filtro.'
                      : `${matching.length} slot disponibili per ${new Date(searchDate).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
                  </p>
                );
              })()}
            </div>
            <Label>Seleziona Data Disponibile</Label>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 border rounded-lg p-2 bg-slate-50/30">
              {slots.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessuno slot disponibile per questa esperienza</p>}
              {(() => {
                const filteredSlots = searchDate
                  ? slots.filter(s => (s.start_datetime || '').split('T')[0] === searchDate)
                  : slots;
                if (slots.length > 0 && filteredSlots.length === 0) {
                  return <p className="text-sm text-amber-700 text-center py-4">Nessuno slot per la data selezionata · <button type="button" className="underline" onClick={() => setSearchDate('')}>Mostra tutte le date</button></p>;
                }
                return filteredSlots.map(s => {
                const tier = getPriceTierForDate(selectedExp, s.start_datetime);
                const price = s.price_override || tier?.price_b2c || selectedExp.price_b2c;
                const avail = s.max_seats - s.booked_seats - (s.blocked_seats || 0);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlot(s)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition flex justify-between items-center bg-white ${selectedSlot?.id === s.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div>
                      <div className="font-semibold text-sm capitalize">{fmtDateTime(s.start_datetime)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Users className="w-3 h-3 inline mr-1" />{avail} posti disponibili
                        {tier && <Badge variant="secondary" className="ml-2 text-[10px]"><Tag className="w-2.5 h-2.5 mr-1" />{tier.tier_name}</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{fmtPrice(price)}</div>
                      <div className="text-[10px] text-muted-foreground">/persona</div>
                    </div>
                  </button>
                );
                });
              })()}
            </div>
          </div>
        )}

        {/* STEP 3: Cliente */}
        {!generatedLink && step === 3 && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
              <div><strong>{selectedExp?.name}</strong></div>
              <div className="text-xs text-muted-foreground capitalize">{fmtDateTime(selectedSlot?.start_datetime)} • {fmtPrice(pricePerSeat)}/pers</div>
            </div>

            <div>
              <Label className="text-sm">Numero Partecipanti</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setSeats(Math.max(1, seats - 1))}>-</Button>
                <span className={`text-xl font-bold w-12 text-center ${seatsExceed ? 'text-red-600' : ''}`}>{seats}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setSeats(seats + 1)} disabled={seats >= availableSeats}>+</Button>
                <span className="text-sm text-muted-foreground ml-2">Totale: <strong className="text-primary">{fmtPrice(total)}</strong></span>
                {selectedSlot && (
                  <span className={`text-xs ml-2 ${seatsExceed ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    Posti disponibili: <strong>{availableSeats}</strong>
                  </span>
                )}
              </div>
              {seatsExceed && (
                <div className="mt-2 bg-red-50 border border-red-300 rounded-md p-2 text-sm text-red-700 flex items-start gap-2">
                  <span>⚠️</span>
                  <div>
                    <strong>Posti insufficienti!</strong> Hai richiesto <strong>{seats}</strong> posti ma sono disponibili solo <strong>{availableSeats}</strong> per questo slot. Riduci il numero o scegli un'altra data.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Nome Cliente *</Label>
                <Input placeholder="Mario Rossi" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Telefono</Label>
                <Input placeholder="+39 333 1234567" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Email</Label>
                <Input type="email" placeholder="cliente@email.com" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Note / Richieste Speciali</Label>
                <Textarea rows={2} placeholder="Allergie, esigenze..." value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Pagamento */}
        {!generatedLink && step === 4 && (
          <div className="space-y-3">
            <div className="p-2.5 bg-slate-50 rounded-lg text-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong>{selectedExp?.name}</strong>
                <span className="text-xs text-muted-foreground ml-2">· {customer.name} · {seats} pers.</span>
              </div>
              <div className="text-lg font-bold text-primary">{fmtPrice(total)}</div>
            </div>

            <Label className="text-sm">Modalità di Pagamento</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Cash / In loco — NASCOSTO per agenzia */}
              {!isAgency && (
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">💵 Pagamento Diretto / Contanti</div>
                    <div className="text-xs text-muted-foreground">Il cliente paga in contanti o POS. Tu confermi che hai ricevuto.</div>
                    {paymentMethod === 'CASH' && (
                      <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={paymentMarked} onChange={e => setPaymentMarked(e.target.checked)} />
                        <span>✅ Pagamento già ricevuto (marca come <strong>PAGATO</strong>)</span>
                      </label>
                    )}
                  </div>
                </label>
              )}

              {/* Online */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'ONLINE' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">💳 Carta di Credito (SumUp/Stripe)</div>
                  <div className="text-xs text-muted-foreground">Apre <strong>subito il POS Web SumUp</strong> in una nuova scheda. Il cliente paga e la prenotazione passa automaticamente a PAGATA.</div>
                </div>
              </label>

              {/* Bonifico */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'BANK_TRANSFER' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => setPaymentMethod('BANK_TRANSFER')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">🏦 Bonifico (in attesa di verifica)</div>
                  <div className="text-xs text-muted-foreground">Prenotazione resta <strong>PENDING</strong>. {isAgency ? 'Caricherai la ricevuta dalla lista prenotazioni. La Company verificherà e confermerà.' : 'Confermerai dopo aver verificato l\'accredito.'}</div>
                </div>
              </label>

              {/* Da Pagare Successivamente */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'LATER' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" checked={paymentMethod === 'LATER'} onChange={() => setPaymentMethod('LATER')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">⏳ Da Pagare Successivamente</div>
                  <div className="text-xs text-muted-foreground">
                    {isAgency
                      ? <>Prenoti ora, il cliente pagherà dopo. Resta <strong>PENDING</strong>: appena ricevi il pagamento, carica la <strong>ricevuta</strong> dal pulsante <em>📤 Upload</em> in lista prenotazioni e la Company la verificherà.</>
                      : <>Prenota ora, pagherà dopo. Resta <strong>PENDING</strong> finché non lo marchi come pagato.</>}
                  </div>
                </div>
              </label>

              {/* Link Pagamento Esterno - SumUp */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${paymentMethod === 'PAYMENT_LINK' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'} bg-gradient-to-r from-purple-50/30 to-pink-50/30`}>
                <input type="radio" checked={paymentMethod === 'PAYMENT_LINK'} onChange={() => setPaymentMethod('PAYMENT_LINK')} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">🔗 Link Pagamento Esterno (SumUp)</div>
                  <div className="text-xs text-muted-foreground">Genera un <strong>link di pagamento SumUp</strong> da inviare al cliente via email/WhatsApp. La prenotazione resta PENDING fino a pagamento confermato automaticamente.</div>
                </div>
              </label>
            </div>

            {/* CONDIZIONI DI VENDITA + FLAG ACCETTAZIONE */}
            {(selectedExp?.refund_conditions || selectedExp?.terms_pdf_url) && (
              <div className="border-2 border-amber-300 rounded-lg p-3 bg-amber-50/60 space-y-2 mt-3">
                <h4 className="font-semibold flex items-center gap-2 text-amber-900 text-sm">📋 Condizioni di Vendita</h4>
                {selectedExp?.refund_conditions && (
                  <div>
                    <p className="text-xs font-semibold text-amber-900 mb-1">Condizioni di Rimborso</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border max-h-32 overflow-y-auto">{selectedExp.refund_conditions}</p>
                  </div>
                )}
                {selectedExp?.terms_pdf_url && (
                  <a href={selectedExp.terms_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium">
                    📎 Scarica le Condizioni di Servizio (PDF)
                  </a>
                )}
              </div>
            )}
            <div className={`flex items-start gap-3 p-3 border-2 rounded-lg mt-2 ${termsAccepted ? 'bg-emerald-50/60 border-emerald-300' : 'bg-rose-50/40 border-rose-300'}`}>
              <input
                id="nbd_terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 cursor-pointer accent-emerald-600 flex-shrink-0"
              />
              <label htmlFor="nbd_terms" className="text-sm cursor-pointer select-none flex-1">
                <span className="font-semibold text-slate-900">Il cliente dichiara</span> di aver preso visione delle condizioni di rimborso{selectedExp?.terms_pdf_url ? ' e del documento delle condizioni di servizio (PDF)' : ''} e di <strong>accettarle incondizionatamente</strong>. <span className="text-red-600">*</span>
              </label>
            </div>
          </div>
        )}

        {/* SCHERMATA FINALE: Link Pagamento Generato */}
        {generatedLink && (
          <div className="space-y-4">
            <div className="text-center py-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-emerald-900">Link di Pagamento Pronto!</h3>
              <p className="text-sm text-emerald-700 mt-1">Prenotazione <strong>{generatedLink.booking?.booking_ref}</strong></p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg space-y-2">
              <Label className="text-xs">Link SumUp</Label>
              <div className="flex gap-2">
                <Input value={generatedLink.url} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink.url);
                    toast.success('Link copiato!');
                  }}
                >📋 Copia</Button>
              </div>
              <p className="text-xs text-muted-foreground">Invia questo link al cliente via Email, WhatsApp o SMS. La prenotazione passerà a <strong>PAGATA</strong> automaticamente non appena il cliente completerà il pagamento.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(generatedLink.url, '_blank')}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                🌐 Apri pagina pagamento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const txt = `Ciao ${generatedLink.booking?.customer_name},%0A%0APer completare la prenotazione ${generatedLink.booking?.booking_ref} clicca sul link sicuro qui sotto:%0A${generatedLink.url}%0A%0AGrazie!`;
                  const phone = (generatedLink.booking?.customer_phone || '').replace(/\D/g, '');
                  if (phone) window.open(`https://wa.me/${phone}?text=${txt}`, '_blank');
                  else toast.error('Cliente senza numero telefono');
                }}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                💬 Invia via WhatsApp
              </Button>
            </div>
          </div>
        )}

        {/* SCHERMATA FINALE: Link Pagamento Generato - FINE */}

        </div>
        {/* === Fine area scrollabile === */}

        <DialogFooter className="flex justify-between gap-2 px-4 sm:px-6 py-3 border-t bg-white shrink-0">
          <Button type="button" variant="outline" onClick={() => generatedLink ? onClose() : (step === 1 ? onClose() : setStep(step - 1))}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {generatedLink ? 'Chiudi' : (step === 1 ? 'Annulla' : 'Indietro')}
          </Button>
          {!generatedLink && (step < 4 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Avanti<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={loading || !termsAccepted}
              title={!termsAccepted ? 'Spunta la conferma di accettazione delle condizioni' : ''}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creazione...' : (paymentMethod === 'PAYMENT_LINK' ? '🔗 Crea + Genera Link' : '✅ Crea Prenotazione')}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
