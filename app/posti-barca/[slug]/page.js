'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Anchor, MapPin, Phone, Mail, Ship, ArrowLeft, Calculator, FileText, CheckCircle2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmtPrice = (p) => (p ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

const SERVICES_LIST = [
  { type: 'parking_daily', label: 'Sosta carrello/piazzale (giornaliera)' },
  { type: 'parking_monthly', label: 'Sosta carrello/piazzale (mensile)' },
  { type: 'launch', label: 'Alaggio o Varo a movimento' },
  { type: 'hull_wash', label: 'Lavaggio carena con pulivapor' },
  { type: 'antifouling', label: 'Ciclo di Antivegetativa' },
];

export default function MarinaDetailPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [marina, setMarina] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Calcolatore
  const [boatType, setBoatType] = useState('motor');
  const [boatLength, setBoatLength] = useState('8');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [selectedServices, setSelectedServices] = useState({});
  const [antifoulingCoats, setAntifoulingCoats] = useState(1);
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetch(`/api/marinas/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data?.error) router.push('/posti-barca');
        else setMarina(data);
        setLoading(false);
      });
  }, [slug, router]);

  const calculateQuote = async () => {
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
          marina_id: marina.id,
          boat_type: boatType,
          boat_length: parseFloat(boatLength),
          start_date: startDate,
          end_date: endDate,
          services
        })
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { setQuote(data); toast.success('Preventivo calcolato!'); }
    } catch (e) { toast.error('Errore calcolo'); }
    finally { setCalculating(false); }
  };

  const downloadPDF = async () => {
    if (!quote) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20); doc.setTextColor(20, 80, 160);
    doc.text(marina.name, 14, 20);
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text('PREVENTIVO ORMEGGIO - ' + new Date().toLocaleDateString('it-IT'), 14, 28);
    if (marina.address) doc.text(marina.address, 14, 34);
    
    // Dati barca
    doc.setFontSize(12); doc.setTextColor(0);
    doc.text('Dettagli imbarcazione:', 14, 46);
    doc.setFontSize(10);
    doc.text(`Tipo: ${quote.boat.type === 'sail' ? 'Vela' : 'Motore'}`, 14, 53);
    doc.text(`Lunghezza: ${quote.boat.length} m`, 14, 59);
    doc.text(`Periodo: dal ${new Date(quote.period.start_date).toLocaleDateString('it-IT')} al ${new Date(quote.period.end_date).toLocaleDateString('it-IT')} (${quote.period.days} giorni)`, 14, 65);
    
    // Tariffe
    let y = 78;
    if (quote.recommended) {
      doc.setFontSize(12); doc.setTextColor(20, 120, 60);
      doc.text(`Tariffa consigliata: ${quote.recommended.label}`, 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Descrizione', 'Importo']],
        body: quote.recommended.detail.map(d => [
          d.month_name ? `${d.month_name} - ${d.days} giorni × €${d.daily_price?.toFixed(2)}` :
          d.months ? `${d.months} mese${d.months > 1 ? 'i' : ''} × €${d.monthly_price?.toFixed(2)}` :
          quote.recommended.label,
          fmtPrice(d.subtotal)
        ]),
        foot: [['TOTALE ORMEGGIO', fmtPrice(quote.recommended.total)]],
        theme: 'striped',
        headStyles: { fillColor: [20, 80, 160] },
        footStyles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold' }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Servizi extra
    if (quote.extras?.length > 0) {
      doc.setFontSize(12); doc.setTextColor(160, 80, 20);
      doc.text('Servizi aggiuntivi:', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Servizio', 'Dettaglio', 'Importo']],
        body: quote.extras.map(e => [e.name, e.detail, fmtPrice(e.subtotal)]),
        foot: [['TOTALE EXTRA', '', fmtPrice(quote.extras_total)]],
        theme: 'striped',
        headStyles: { fillColor: [160, 80, 20] },
        footStyles: { fillColor: [160, 80, 20], textColor: 255, fontStyle: 'bold' }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Totale
    doc.setFillColor(20, 120, 60);
    doc.rect(14, y, 182, 14, 'F');
    doc.setFontSize(14); doc.setTextColor(255);
    doc.text('TOTALE PREVENTIVO', 18, y + 9);
    doc.text(fmtPrice(quote.grand_total), 195, y + 9, { align: 'right' });
    y += 22;
    
    // Note + contatti
    doc.setFontSize(8); doc.setTextColor(100);
    if (marina.pricing_notes?.length > 0) {
      doc.text('Note:', 14, y); y += 4;
      marina.pricing_notes.forEach(n => { doc.text(`• ${n}`, 14, y); y += 4; });
    }
    y += 4;
    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`Contatti: ${marina.contact_phone || ''} | ${marina.contact_email || ''}`, 14, y);
    
    doc.save(`Preventivo_${marina.slug}_${quote.boat.length}m.pdf`);
    toast.success('PDF scaricato!');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Anchor className="w-12 h-12 animate-pulse text-primary" /></div>;
  if (!marina) return null;
  
  const hasPricing = marina.pricing?.annual?.length > 0 || marina.pricing?.summer_flat?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img src={marina.cover_image} alt={marina.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex items-end">
          <div className="container mx-auto px-6 pb-8">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4" onClick={() => router.push('/posti-barca')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Torna alle Marine
            </Button>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
                  <Anchor className="w-10 h-10" />{marina.name}
                </h1>
                {marina.location && <p className="text-white/90 flex items-center gap-1"><MapPin className="w-4 h-4" />{marina.location}</p>}
              </div>
              {marina.total_berths > 0 && (
                <Badge className="bg-white text-primary font-bold text-lg px-4 py-2"><Ship className="w-5 h-5 mr-2" />{marina.total_berths} posti</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Descrizione + contatti */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Descrizione</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground whitespace-pre-line">{marina.description}</p></CardContent>
            </Card>
            
            {(marina.contact_phone || marina.contact_email) && (
              <Card>
                <CardHeader><CardTitle>Contatti</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {marina.contact_phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><a href={`tel:${marina.contact_phone}`} className="hover:underline">{marina.contact_phone}</a></p>}
                  {marina.contact_whatsapp && <p className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-600" /><a href={`https://wa.me/${marina.contact_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener" className="hover:underline">{marina.contact_whatsapp}</a></p>}
                  {marina.contact_email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><a href={`mailto:${marina.contact_email}`} className="hover:underline">{marina.contact_email}</a></p>}
                  {marina.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{marina.address}</p>}
                </CardContent>
              </Card>
            )}

            {/* Tabella tariffe annuali (se presenti) */}
            {marina.pricing?.annual?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Tariffe Ormeggio Annuali (IVA inclusa)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {marina.pricing.annual.map((t, i) => (
                      <div key={i} className="flex justify-between p-2 bg-muted rounded">
                        <span>fino a {t.length}m</span>
                        <strong>{fmtPrice(t.price)}</strong>
                      </div>
                    ))}
                  </div>
                  {marina.pricing_notes?.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      {marina.pricing_notes.map((n, i) => <p key={i}>• {n}</p>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Calcolatore preventivo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-2 border-primary">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Calcolatore Preventivo</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {!hasPricing ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Listino in fase di pubblicazione.<br />Contatta direttamente la marina per un preventivo.</div>
                ) : (
                  <>
                    <div>
                      <Label>Tipo barca</Label>
                      <Select value={boatType} onValueChange={setBoatType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="motor">A motore</SelectItem>
                          <SelectItem value="sail">A vela</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Lunghezza (metri)</Label>
                      <Input type="number" step="0.5" min="3" max="25" value={boatLength} onChange={e => setBoatLength(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Dal</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Al</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="block mb-2">Servizi aggiuntivi</Label>
                      <div className="space-y-1.5 text-sm">
                        {SERVICES_LIST.filter(s => marina.pricing?.yard_services?.[s.type] || (s.type === 'antifouling' && marina.pricing?.yard_services?.antifouling_1)).map(s => (
                          <label key={s.type} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={!!selectedServices[s.type]} onCheckedChange={v => setSelectedServices(p => ({ ...p, [s.type]: v }))} />
                            <span>{s.label}</span>
                          </label>
                        ))}
                      </div>
                      {selectedServices.antifouling && (
                        <div className="mt-2 ml-6">
                          <Label className="text-xs">N° mani antivegetativa</Label>
                          <Select value={String(antifoulingCoats)} onValueChange={v => setAntifoulingCoats(Number(v))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 mano</SelectItem>
                              <SelectItem value="2">2 mani</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    <Button className="w-full bg-primary text-white hover:bg-primary/90" onClick={calculateQuote} disabled={calculating}>
                      {calculating ? 'Calcolo...' : <><Calculator className="w-4 h-4 mr-2" />Calcola Preventivo</>}
                    </Button>
                  </>
                )}

                {/* Risultato preventivo */}
                {quote && (
                  <div className="mt-4 pt-4 border-t-2 space-y-3">
                    {quote.recommended && (
                      <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3 h-3" />OPZIONE CONSIGLIATA
                        </p>
                        <p className="text-sm font-medium">{quote.recommended.label}</p>
                        {quote.recommended.detail.map((d, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {d.month_name ? `${d.month_name}: ${d.days} gg × €${d.daily_price?.toFixed(2)} = ${fmtPrice(d.subtotal)}` : 
                             d.months ? `${d.months} mese${d.months > 1 ? 'i' : ''} × €${d.monthly_price?.toFixed(2)} = ${fmtPrice(d.subtotal)}` :
                             fmtPrice(d.subtotal)}
                          </p>
                        ))}
                        <p className="text-base font-bold text-emerald-700 mt-1">Subtotale: {fmtPrice(quote.recommended.total)}</p>
                      </div>
                    )}
                    
                    {quote.options.length > 1 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium">Altre opzioni disponibili</summary>
                        <div className="mt-1 space-y-1">
                          {quote.options.slice(1).map((o, i) => (
                            <p key={i}>• {o.label}: {fmtPrice(o.total)}</p>
                          ))}
                        </div>
                      </details>
                    )}

                    {quote.extras?.length > 0 && (
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <p className="text-xs font-semibold text-amber-700 mb-1">SERVIZI EXTRA</p>
                        {quote.extras.map((e, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span>{e.name}</span>
                            <strong>{fmtPrice(e.subtotal)}</strong>
                          </div>
                        ))}
                        <p className="text-sm font-bold text-amber-700 mt-1 pt-1 border-t">Subtotale: {fmtPrice(quote.extras_total)}</p>
                      </div>
                    )}
                    
                    <Separator />
                    <div className="bg-primary text-white p-4 rounded">
                      <p className="text-xs uppercase tracking-wide">Totale Preventivo</p>
                      <p className="text-3xl font-bold">{fmtPrice(quote.grand_total)}</p>
                      <p className="text-xs opacity-80">{quote.period.days} giorni · barca {quote.boat.length}m</p>
                    </div>
                    
                    <Button variant="outline" className="w-full" onClick={downloadPDF}>
                      <FileText className="w-4 h-4 mr-2" />Scarica PDF Preventivo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
