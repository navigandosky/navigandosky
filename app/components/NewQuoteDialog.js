'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardList, Calculator, Anchor, Sparkles, RefreshCw, CheckCircle2, User, Ship, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/app/lib/safeFetch';

const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

const SERVICES_LIST = [
  { type: 'parking_daily', label: 'Sosta carrello/piazzale (giornaliera)' },
  { type: 'parking_monthly', label: 'Sosta carrello/piazzale (mensile)' },
  { type: 'launch', label: 'Alaggio o Varo a movimento' },
  { type: 'hull_wash', label: 'Lavaggio carena con pulivapor' },
  { type: 'antifouling', label: 'Ciclo di Antivegetativa' },
];

/**
 * Dialog per creare un Nuovo Preventivo Posto Barca dal pannello Admin.
 * Replica la card "Preview Posto Barca" pubblica + dati cliente,
 * salva nel registro Preventivi (/api/port-quotes).
 *
 * Props:
 *  - open: bool
 *  - onClose: fn
 *  - currentUser: { role, company_id, ... }
 *  - onCreated: fn(savedQuote) (opzionale - per refresh esterni)
 */
export default function NewQuoteDialog({ open, onClose, currentUser, onCreated }) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Step state
  const [step, setStep] = useState(1); // 1=marina+barca, 2=tariffa, 3=cliente+salva
  const [marinas, setMarinas] = useState([]);
  const [loadingMarinas, setLoadingMarinas] = useState(false);
  const [marinaId, setMarinaId] = useState('');

  // Form preventivo
  const [boatType, setBoatType] = useState('motor');
  const [boatLength, setBoatLength] = useState('8');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [selectedServices, setSelectedServices] = useState({});
  const [antifoulingCoats, setAntifoulingCoats] = useState(1);

  // Quote result
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [tariffChoice, setTariffChoice] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Customer data
  const [clientData, setClientData] = useState({
    name: '', surname: '', email: '', phone: '', boat_name: '', boat_registration: '',
    tax_code: '', address: '', city: '', zip: '', country: 'IT'
  });

  const [saving, setSaving] = useState(false);
  const [savedNumber, setSavedNumber] = useState('');
  const [savedId, setSavedId] = useState('');

  // Carica marine al primo open
  useEffect(() => {
    if (!open) return;
    setLoadingMarinas(true);
    const params = new URLSearchParams();
    if (!isSuperAdmin && currentUser?.company_id) {
      params.set('company_id', currentUser.company_id);
    }
    fetch(`/api/marinas?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setMarinas(list);
        // Auto-seleziona se solo una
        if (list.length === 1) setMarinaId(list[0].id);
      })
      .catch(() => toast.error('Errore caricamento marine'))
      .finally(() => setLoadingMarinas(false));
  }, [open, isSuperAdmin, currentUser?.company_id]);

  // Reset alla chiusura
  const handleClose = useCallback(() => {
    setStep(1);
    setMarinaId(marinas.length === 1 ? marinas[0].id : '');
    setBoatType('motor');
    setBoatLength('8');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setSelectedServices({});
    setAntifoulingCoats(1);
    setQuote(null);
    setTariffChoice('');
    setCustomAmount('');
    setCustomDescription('');
    setClientData({
      name: '', surname: '', email: '', phone: '', boat_name: '', boat_registration: '',
      tax_code: '', address: '', city: '', zip: '', country: 'IT'
    });
    setSavedNumber('');
    setSavedId('');
    onClose();
  }, [onClose, marinas]);

  const selectedMarina = useMemo(
    () => marinas.find(m => m.id === marinaId) || null,
    [marinas, marinaId]
  );

  const finalTotal = useMemo(() => {
    if (!quote) return 0;
    let mooring = 0;
    if (tariffChoice === 'custom') mooring = Number(customAmount) || 0;
    else {
      const opt = quote.options?.find(o => o.type === tariffChoice);
      if (opt) mooring = opt.total;
    }
    return mooring + (quote.extras_total || 0);
  }, [quote, tariffChoice, customAmount]);

  const calculate = async () => {
    if (!marinaId) { toast.error('Seleziona un marina'); return; }
    if (!startDate || !endDate) { toast.error('Inserisci data inizio e fine'); return; }
    if (new Date(endDate) < new Date(startDate)) { toast.error('Data fine deve essere dopo inizio'); return; }
    setCalculating(true);
    try {
      const services = Object.entries(selectedServices).filter(([_, v]) => v).map(([type]) =>
        type === 'antifouling' ? { type, coats: antifoulingCoats } : { type }
      );
      const res = await fetch('/api/marina-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marina_id: marinaId,
          boat_type: boatType,
          boat_length: parseFloat(boatLength),
          start_date: startDate,
          end_date: endDate,
          services
        })
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setQuote(data);
      setTariffChoice(data.recommended?.type || '');
      setStep(2);
      toast.success('Preventivo calcolato!');
    } catch (e) {
      toast.error(friendlyError(e) || 'Errore calcolo');
    } finally { setCalculating(false); }
  };

  const saveQuote = async () => {
    if (!quote) { toast.error('Calcola prima il preventivo'); return; }
    if (!clientData.name || !clientData.email) {
      toast.error('Nome ed Email sono obbligatori per salvare');
      return;
    }
    setSaving(true);
    try {
      const chosenOpt = tariffChoice === 'custom'
        ? { type: 'custom', label: 'Tariffa personalizzata', total: Number(customAmount) || 0, description: customDescription }
        : quote.options?.find(o => o.type === tariffChoice) || quote.recommended;

      const payload = {
        marina_id: selectedMarina.id,
        marina_name: selectedMarina.name,
        customer: {
          name: clientData.name,
          surname: clientData.surname,
          email: clientData.email,
          phone: clientData.phone,
          tax_code: clientData.tax_code,
          address: clientData.address,
          city: clientData.city,
          zip: clientData.zip,
          country: clientData.country,
        },
        boat: {
          name: clientData.boat_name,
          registration: clientData.boat_registration,
          type: boatType,
          length: parseFloat(boatLength),
          beam: 0,
        },
        start_date: startDate,
        end_date: endDate,
        days: quote.period?.days || 0,
        tariff_choice: tariffChoice,
        tariff_label: chosenOpt?.label || '',
        tariff_description: tariffChoice === 'custom' ? customDescription : '',
        mooring_amount: chosenOpt?.total || 0,
        extras: quote.extras || [],
        extras_total: quote.extras_total || 0,
        grand_total: finalTotal,
        status: 'BOZZA',
        source: 'ADMIN',
        created_by_user_id: currentUser?.id,
      };

      const res = await fetch('/api/port-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSavedNumber(data.quote_number);
      setSavedId(data.id);
      toast.success(`Preventivo ${data.quote_number} salvato in archivio!`);
      if (typeof onCreated === 'function') onCreated(data);
    } catch (e) {
      toast.error(friendlyError(e) || 'Errore salvataggio');
    } finally { setSaving(false); }
  };

  // ===== RENDER =====
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        translate="no"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-900">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Nuovo Preventivo Posto Barca
          </DialogTitle>
          <DialogDescription>
            Crea un preventivo dall'area amministrativa. Verrà salvato nel registro Preventivi e potrà essere
            convertito in Prenotazione e in Contratto seguendo il flusso standard.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <StepIndicator n={1} active={step === 1} done={step > 1} label="Configura" />
          <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
          <StepIndicator n={2} active={step === 2} done={step > 2} label="Tariffa" />
          <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
          <StepIndicator n={3} active={step === 3} done={!!savedId} label="Cliente & Salva" />
        </div>

        {/* STEP 1: Marina + Barca + Date + Servizi */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Anchor className="w-4 h-4" />Marina</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMarinas ? (
                  <div className="text-sm text-muted-foreground"><RefreshCw className="w-4 h-4 inline animate-spin mr-2" />Carico...</div>
                ) : marinas.length === 0 ? (
                  <div className="text-sm text-amber-700">Nessun marina disponibile per la tua company.</div>
                ) : (
                  <Select value={marinaId} onValueChange={setMarinaId}>
                    <SelectTrigger><SelectValue placeholder="Seleziona marina..." /></SelectTrigger>
                    <SelectContent>
                      {marinas.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" />Barca & Periodo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo barca</Label>
                    <Select value={boatType} onValueChange={setBoatType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motor">A motore</SelectItem>
                        <SelectItem value="sail">A vela</SelectItem>
                        <SelectItem value="catamaran">Catamarano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Lunghezza (metri)</Label>
                    <Input type="number" value={boatLength} onChange={(e) => setBoatLength(e.target.value)} step="0.5" min="3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Dal</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Al</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Servizi aggiuntivi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SERVICES_LIST.map(s => (
                  <div key={s.type} className="flex items-center gap-2">
                    <Checkbox
                      id={`new-q-${s.type}`}
                      checked={!!selectedServices[s.type]}
                      onCheckedChange={(v) => setSelectedServices(prev => ({ ...prev, [s.type]: !!v }))}
                    />
                    <label htmlFor={`new-q-${s.type}`} className="text-sm cursor-pointer">{s.label}</label>
                    {s.type === 'antifouling' && selectedServices[s.type] && (
                      <Input
                        type="number"
                        min="1" max="5"
                        value={antifoulingCoats}
                        onChange={(e) => setAntifoulingCoats(parseInt(e.target.value) || 1)}
                        className="w-16 h-7 ml-2"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: Scelta tariffa */}
        {step === 2 && quote && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs flex items-center gap-2 flex-wrap">
              <Anchor className="w-4 h-4 text-blue-600" />
              <strong>{selectedMarina?.name}</strong> · {boatType} {boatLength}m · {startDate} → {endDate} · <strong>{quote.period?.days} giorni</strong>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scegli tariffa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(quote.options || []).map(opt => (
                  <label
                    key={opt.type}
                    className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition ${tariffChoice === opt.type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      checked={tariffChoice === opt.type}
                      onChange={() => setTariffChoice(opt.type)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{opt.label}</span>
                        {opt.recommended && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Consigliata</Badge>}
                      </div>
                      {opt.detail && <div className="text-xs text-muted-foreground">{opt.detail}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{fmtEur(opt.total)}</div>
                    </div>
                  </label>
                ))}

                {/* Tariffa personalizzata */}
                <label className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition ${tariffChoice === 'custom' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" checked={tariffChoice === 'custom'} onChange={() => setTariffChoice('custom')} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="font-semibold">Tariffa personalizzata</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Importo €"
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setTariffChoice('custom'); }}
                        disabled={tariffChoice !== 'custom'}
                      />
                      <Input
                        placeholder="Descrizione (opzionale)"
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        disabled={tariffChoice !== 'custom'}
                      />
                    </div>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Extras */}
            {(quote.extras?.length || 0) > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Extra</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {quote.extras.map((ex, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{ex.label || ex.type}</span>
                      <span>{fmtEur(ex.total || ex.subtotal || 0)}</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>Totale Extra</span>
                    <span>{fmtEur(quote.extras_total || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-blue-400 bg-blue-50">
              <CardContent className="p-3 flex justify-between items-center">
                <div className="text-sm font-semibold text-blue-900">TOTALE PREVENTIVO</div>
                <div className="text-2xl font-bold text-blue-700">{fmtEur(finalTotal)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: Cliente */}
        {step === 3 && (
          <div className="space-y-4">
            {savedId ? (
              <Card className="border-emerald-400 bg-emerald-50">
                <CardContent className="p-5 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
                  <div className="text-lg font-bold text-emerald-900">Preventivo Salvato</div>
                  <div className="font-mono text-2xl text-emerald-800">{savedNumber}</div>
                  <p className="text-xs text-emerald-700">
                    Trovi questo preventivo nel tab <strong>Preventivi</strong> del Modulo Marina.
                    Da lì puoi convertirlo in Prenotazione e poi in Contratto.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Dati Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome *</Label>
                      <Input value={clientData.name} onChange={(e) => setClientData({ ...clientData, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Cognome</Label>
                      <Input value={clientData.surname} onChange={(e) => setClientData({ ...clientData, surname: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" value={clientData.email} onChange={(e) => setClientData({ ...clientData, email: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Telefono</Label>
                      <Input value={clientData.phone} onChange={(e) => setClientData({ ...clientData, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">CF / P.IVA</Label>
                      <Input value={clientData.tax_code} onChange={(e) => setClientData({ ...clientData, tax_code: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Città</Label>
                      <Input value={clientData.city} onChange={(e) => setClientData({ ...clientData, city: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" />Dati Imbarcazione</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome barca</Label>
                      <Input value={clientData.boat_name} onChange={(e) => setClientData({ ...clientData, boat_name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Targa / Sigla</Label>
                      <Input value={clientData.boat_registration} onChange={(e) => setClientData({ ...clientData, boat_registration: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                {/* Riepilogo */}
                <Card className="border-blue-300 bg-blue-50/50">
                  <CardContent className="p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span>Marina:</span><strong>{selectedMarina?.name}</strong></div>
                    <div className="flex justify-between"><span>Periodo:</span><strong>{startDate} → {endDate} ({quote?.period?.days} gg)</strong></div>
                    <div className="flex justify-between"><span>Barca:</span><strong>{boatType} {boatLength}m</strong></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base font-bold text-blue-800"><span>TOTALE</span><span>{fmtEur(finalTotal)}</span></div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>Annulla</Button>
              <Button
                onClick={calculate}
                disabled={calculating || !marinaId || !endDate}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                {calculating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                Calcola Preventivo
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Indietro</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!tariffChoice || (tariffChoice === 'custom' && !customAmount)}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                Avanti: Cliente <FileText className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              {!savedId && <Button variant="outline" onClick={() => setStep(2)}>← Indietro</Button>}
              {savedId ? (
                <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Chiudi
                </Button>
              ) : (
                <Button
                  onClick={saveQuote}
                  disabled={saving || !clientData.name || !clientData.email}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Salva Preventivo
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ n, active, done, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        done ? 'bg-emerald-500 border-emerald-500 text-white' :
        active ? 'bg-blue-600 border-blue-600 text-white' :
        'bg-white border-slate-300 text-slate-500'
      }`}>
        {done ? '✓' : n}
      </div>
      <span className={active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-slate-500'}>{label}</span>
    </div>
  );
}
