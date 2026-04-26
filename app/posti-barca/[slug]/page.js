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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Anchor, MapPin, Phone, Mail, Ship, ArrowLeft, Calculator, FileText, CheckCircle2, MessageCircle, Map } from 'lucide-react';
import { toast } from 'sonner';

const fmtPrice = (p) => (p ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

const SERVICES_LIST = [
  { type: 'parking_daily', label: 'Sosta carrello/piazzale (giornaliera)' },
  { type: 'parking_monthly', label: 'Sosta carrello/piazzale (mensile)' },
  { type: 'launch', label: 'Alaggio o Varo a movimento' },
  { type: 'hull_wash', label: 'Lavaggio carena con pulivapor' },
  { type: 'antifouling', label: 'Ciclo di Antivegetativa' },
];

// Carica un'immagine come dataURL per inserirla nel PDF
const loadImageAsDataURL = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
};

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
  
  // Form cliente per PDF
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [clientData, setClientData] = useState({
    name: '', surname: '', email: '', phone: '', boat_name: '', boat_registration: ''
  });

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

  const generatePDF = async () => {
    if (!quote) return;
    if (!clientData.name || !clientData.email) {
      toast.error('Nome ed Email sono obbligatori');
      return;
    }
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Carica i loghi (Trivor + Maretrek)
      const [trivorLogo, maretrekLogo] = await Promise.all([
        loadImageAsDataURL('/logos/trivor.png'),
        loadImageAsDataURL('/logos/maretrek.png'),
      ]);

      // === HEADER con loghi ===
      // Logo Maretrek a sinistra
      if (maretrekLogo) {
        try { doc.addImage(maretrekLogo, 'PNG', 14, 10, 25, 25); } catch (e) {}
      }
      // Logo Trivor a destra
      if (trivorLogo) {
        try { doc.addImage(trivorLogo, 'PNG', 165, 12, 30, 22); } catch (e) {}
      }

      // Titolo centrato
      doc.setFontSize(16); doc.setTextColor(20, 80, 160);
      doc.text('PREVENTIVO ORMEGGIO', 105, 18, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(60);
      doc.text(marina.name, 105, 25, { align: 'center' });
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Data emissione: ${new Date().toLocaleDateString('it-IT')} · Validità: 30 giorni`, 105, 31, { align: 'center' });

      // Linea separatrice
      doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.6);
      doc.line(14, 40, 196, 40);

      let y = 48;

      // === DATI MARINA + CLIENTE (due colonne) ===
      doc.setFontSize(9); doc.setTextColor(20, 80, 160);
      doc.text('MARINA', 14, y);
      doc.text('CLIENTE', 110, y);
      y += 5;
      doc.setFontSize(9); doc.setTextColor(0);
      const marinaLines = [
        marina.name,
        marina.address || marina.location || '',
        marina.contact_phone || '',
        marina.contact_email || '',
      ].filter(Boolean);
      const clientLines = [
        `${clientData.name} ${clientData.surname}`.trim(),
        clientData.email,
        clientData.phone,
        clientData.boat_name ? `Barca: ${clientData.boat_name}` : '',
        clientData.boat_registration ? `Targa: ${clientData.boat_registration}` : '',
      ].filter(Boolean);
      const maxLines = Math.max(marinaLines.length, clientLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (marinaLines[i]) doc.text(String(marinaLines[i]).slice(0, 50), 14, y + i * 4.5);
        if (clientLines[i]) doc.text(String(clientLines[i]).slice(0, 50), 110, y + i * 4.5);
      }
      y += maxLines * 4.5 + 8;

      // === DETTAGLI IMBARCAZIONE / PERIODO ===
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Lunghezza', 'Periodo', 'Giorni']],
        body: [[
          quote.boat.type === 'sail' ? 'Vela' : quote.boat.type === 'catamaran' ? 'Catamarano' : 'Motore',
          `${quote.boat.length} m`,
          `${new Date(quote.period.start_date).toLocaleDateString('it-IT')} → ${new Date(quote.period.end_date).toLocaleDateString('it-IT')}`,
          `${quote.period.days} gg`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;

      // === TARIFFA CONSIGLIATA ===
      if (quote.recommended) {
        doc.setFontSize(10); doc.setTextColor(20, 120, 60);
        doc.text(`✓ Tariffa consigliata: ${quote.recommended.label}`, 14, y);
        y += 3;
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
          headStyles: { fillColor: [20, 80, 160], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          footStyles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold', fontSize: 10 },
          margin: { left: 14, right: 14 },
          columnStyles: { 1: { halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 6;
      }

      // === SERVIZI EXTRA ===
      if (quote.extras?.length > 0) {
        doc.setFontSize(10); doc.setTextColor(160, 80, 20);
        doc.text('Servizi aggiuntivi:', 14, y);
        y += 3;
        autoTable(doc, {
          startY: y,
          head: [['Servizio', 'Dettaglio', 'Importo']],
          body: quote.extras.map(e => [e.name, e.detail, fmtPrice(e.subtotal)]),
          foot: [['TOTALE EXTRA', '', fmtPrice(quote.extras_total)]],
          theme: 'striped',
          headStyles: { fillColor: [160, 80, 20], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          footStyles: { fillColor: [160, 80, 20], textColor: 255, fontStyle: 'bold', fontSize: 10 },
          margin: { left: 14, right: 14 },
          columnStyles: { 2: { halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 6;
      }

      // === TOTALE FINALE ===
      doc.setFillColor(20, 120, 60);
      doc.rect(14, y, 182, 16, 'F');
      doc.setFontSize(13); doc.setTextColor(255);
      doc.text('TOTALE PREVENTIVO', 18, y + 10);
      doc.setFontSize(15);
      doc.text(fmtPrice(quote.grand_total), 192, y + 10, { align: 'right' });
      y += 22;

      // === NOTE ===
      doc.setFontSize(8); doc.setTextColor(100);
      if (marina.pricing_notes?.length > 0) {
        doc.text('Note:', 14, y); y += 3.5;
        marina.pricing_notes.forEach(n => {
          const wrapped = doc.splitTextToSize(`• ${n}`, 180);
          wrapped.forEach(line => { doc.text(line, 14, y); y += 3.5; });
        });
        y += 2;
      }

      // === FOOTER ===
      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(20, 80, 160); doc.setLineWidth(0.4);
      doc.line(14, pageH - 22, 196, pageH - 22);
      doc.setFontSize(8); doc.setTextColor(80);
      doc.text(`Maretrek by Trivor S.r.l. — ${marina.contact_email || ''}`, 105, pageH - 16, { align: 'center' });
      doc.text(`Tel. ${marina.contact_phone || ''}  ·  ${marina.address || ''}`, 105, pageH - 12, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(140);
      doc.text('Documento generato automaticamente. Per accettare il preventivo contattare la Marina.', 105, pageH - 7, { align: 'center' });

      const fileName = `Preventivo_${marina.slug}_${clientData.surname || clientData.name || 'cliente'}_${quote.boat.length}m.pdf`.replace(/\s+/g, '_');
      doc.save(fileName);
      toast.success('PDF preventivo scaricato!');
      setShowPdfDialog(false);
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione PDF: ' + (e.message || ''));
    } finally {
      setGeneratingPdf(false);
    }
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
              <div className="flex items-center gap-2">
                {marina.total_berths > 0 && (
                  <Badge className="bg-white text-primary font-bold text-lg px-4 py-2"><Ship className="w-5 h-5 mr-2" />{marina.total_berths} posti</Badge>
                )}
                <Button className="bg-amber-500 text-white hover:bg-amber-600 font-semibold shadow-lg" onClick={() => router.push(`/posti-barca/${slug}/mappa`)}>
                  <Map className="w-4 h-4 mr-2" /> Mappa Interattiva
                </Button>
              </div>
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
                    
                    <Button variant="outline" className="w-full" onClick={() => setShowPdfDialog(true)}>
                      <FileText className="w-4 h-4 mr-2" />Scarica PDF Preventivo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog dati cliente per PDF */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Dati per il preventivo PDF</DialogTitle>
            <DialogDescription>Compila i tuoi dati per personalizzare il documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={clientData.name} onChange={e => setClientData(d => ({ ...d, name: e.target.value }))} /></div>
              <div><Label>Cognome</Label><Input value={clientData.surname} onChange={e => setClientData(d => ({ ...d, surname: e.target.value }))} /></div>
            </div>
            <div><Label>Email *</Label><Input type="email" value={clientData.email} onChange={e => setClientData(d => ({ ...d, email: e.target.value }))} /></div>
            <div><Label>Telefono</Label><Input value={clientData.phone} onChange={e => setClientData(d => ({ ...d, phone: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome Barca</Label><Input value={clientData.boat_name} onChange={e => setClientData(d => ({ ...d, boat_name: e.target.value }))} placeholder="Aurora" /></div>
              <div><Label>Targa / Sigla</Label><Input value={clientData.boat_registration} onChange={e => setClientData(d => ({ ...d, boat_registration: e.target.value }))} placeholder="CA-1234" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>Annulla</Button>
            <Button onClick={generatePDF} disabled={generatingPdf}>
              {generatingPdf ? 'Genero PDF...' : <><FileText className="w-4 h-4 mr-2" />Genera e Scarica</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
