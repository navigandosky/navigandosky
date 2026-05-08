'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { Anchor, MapPin, Phone, Mail, Ship, ArrowLeft, Calculator, FileText, CheckCircle2, MessageCircle, Map, AlertCircle, ClipboardList, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/app/lib/safeFetch';

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
  const [tariffChoice, setTariffChoice] = useState(''); // tipologia tariffa scelta
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState(''); // descrizione tariffa personalizzata
  
  // Calcola totale finale in base a tariffa scelta + extra
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
  
  // Form cliente per PDF
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [clientData, setClientData] = useState({
    name: '', surname: '', email: '', phone: '', boat_name: '', boat_registration: '',
    tax_code: '', address: '', city: '', zip: '', country: 'IT'
  });
  
  // Salva preventivo
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [savedQuoteNumber, setSavedQuoteNumber] = useState('');
  const [savedQuoteId, setSavedQuoteId] = useState('');

  // Richiedi Prenotazione
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingMode, setBookingMode] = useState('current'); // 'current' | 'lookup'
  const [bookingQuoteNumber, setBookingQuoteNumber] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null); // booking object dopo creazione
  const [payingDeposit, setPayingDeposit] = useState(false);

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
      else { 
        setQuote(data); 
        setTariffChoice(data.recommended?.type || ''); // pre-seleziona la consigliata
        toast.success('Preventivo calcolato!'); 
      }
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

      // Carica logo della company che gestisce questa marina (singolo logo)
      let company = null;
      if (marina?.company_id) {
        try {
          const cRes = await fetch('/api/companies').then(r => r.json());
          company = (Array.isArray(cRes) ? cRes : []).find(c => c.id === marina.company_id) || null;
        } catch (e) { /* ignore */ }
      }
      const companyLogo = company?.logo_url ? await loadImageAsDataURL(company.logo_url) : null;

      // === HEADER con logo company emittente ===
      if (companyLogo) {
        try { doc.addImage(companyLogo, 14, 10, 32, 25); } catch (e) {}
      }

      // Titolo centrato
      doc.setFontSize(16); doc.setTextColor(20, 80, 160);
      doc.text('PREVIEW POSTO BARCA', 105, 18, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(60);
      doc.text(marina.name, 105, 25, { align: 'center' });
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Data emissione: ${new Date().toLocaleDateString('it-IT')} · Validità: 30 giorni`, 105, 31, { align: 'center' });
      if (company?.name) {
        doc.setFontSize(8); doc.setTextColor(140);
        doc.text(`Emesso da: ${company.name}`, 196, 36, { align: 'right' });
      }

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
          `${new Date(quote.period.start_date).toLocaleDateString('it-IT')} - ${new Date(quote.period.end_date).toLocaleDateString('it-IT')}`,
          `${quote.period.days} gg`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [20, 80, 160], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;

      // === TARIFFA SCELTA ===
      const chosenOpt = tariffChoice === 'custom'
        ? { type: 'custom', label: 'Tariffa personalizzata', total: Number(customAmount) || 0, detail: [{ subtotal: Number(customAmount) || 0 }], description: customDescription }
        : quote.options?.find(o => o.type === tariffChoice) || quote.recommended;
      
      if (chosenOpt) {
        doc.setFontSize(10); doc.setTextColor(20, 120, 60);
        doc.text(`Tariffa applicata: ${chosenOpt.label}`, 14, y);
        y += 3;
        autoTable(doc, {
          startY: y,
          head: [['Descrizione', 'Importo']],
          body: (chosenOpt.detail || []).map(d => [
            d.month_name ? `${d.month_name} - ${d.days} giorni × €${d.daily_price?.toFixed(2)}` :
            d.months ? `${d.months} mes${d.months > 1 ? 'i' : 'e'} × €${d.monthly_price?.toFixed(2)}` :
            chosenOpt.label,
            fmtPrice(d.subtotal)
          ]),
          foot: [['TOTALE ORMEGGIO', fmtPrice(chosenOpt.total)]],
          theme: 'striped',
          headStyles: { fillColor: [20, 80, 160], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          footStyles: { fillColor: [20, 80, 160], textColor: 255, fontStyle: 'bold', fontSize: 10 },
          margin: { left: 14, right: 14 },
          columnStyles: { 1: { halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 6;
        
        // Stampa descrizione tariffa personalizzata se presente
        if (chosenOpt.description) {
          doc.setFontSize(8); doc.setTextColor(60, 80, 120);
          doc.text('Dettaglio tariffa personalizzata:', 14, y);
          y += 4;
          doc.setFontSize(8); doc.setTextColor(40);
          const wrapped = doc.splitTextToSize(chosenOpt.description, 180);
          wrapped.forEach(line => { doc.text(line, 14, y); y += 4; });
          y += 3;
        }
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
      doc.text('TOTALE PREVIEW POSTO BARCA', 18, y + 10);
      doc.setFontSize(15);
      doc.text(fmtPrice(finalTotal), 192, y + 10, { align: 'right' });
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
      doc.text(`${company?.name || marina.name} — ${marina.contact_email || ''}`, 105, pageH - 16, { align: 'center' });
      doc.text(`Tel. ${marina.contact_phone || ''}  ·  ${marina.address || ''}`, 105, pageH - 12, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(140);
      doc.text('Documento generato automaticamente. Per accettare il preventivo contattare la Marina.', 105, pageH - 7, { align: 'center' });

      const fileName = `Preventivo_${marina.slug}_${clientData.surname || clientData.name || 'cliente'}_${quote.boat.length}m.pdf`.replace(/\s+/g, '_');
      doc.save(fileName);
      toast.success('PDF preventivo scaricato!');
      setShowPdfDialog(false);
    } catch (e) {
      console.error(e);
      toast.error(friendlyError(e) || 'Errore generazione PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Genera Word .docx editabile (analogo al PDF, stesso layout, stesso logo company)
  const generateDOCX = async () => {
    if (!quote) return;
    if (!clientData.name || !clientData.email) {
      toast.error('Nome ed Email sono obbligatori');
      return;
    }
    setGeneratingPdf(true);
    try {
      // Trova company emittente
      let company = null;
      if (marina?.company_id) {
        const cRes = await fetch('/api/companies').then(r => r.json());
        company = (Array.isArray(cRes) ? cRes : []).find(c => c.id === marina.company_id) || null;
      }
      const tariffOption = quote.options?.find(o => o.type === tariffChoice) || quote.recommended;
      const tariffTotal = tariffChoice === 'custom' ? Number(customTotal || 0) : (tariffOption?.total || 0);
      const tariffLabel = tariffChoice === 'custom' ? `Personalizzata${customDescription ? ' - ' + customDescription : ''}` : (tariffOption?.label || '—');
      const extras_list = (quote.extras || []).map(ex => ({ ...ex, total: ex.total || ex.subtotal || 0 }));
      const { downloadMarinaQuoteDOCX } = await import('@/app/lib/marinaDoc');
      await downloadMarinaQuoteDOCX({
        marina,
        customer: { name: clientData.name, surname: clientData.surname, email: clientData.email, phone: clientData.phone },
        boat: { name: clientData.boat_name, registration: clientData.boat_registration, length: quote.boat?.length, type: quote.boat?.type },
        period: quote.period,
        tariff: { label: tariffLabel, total: tariffTotal },
        extras: extras_list,
        extras_total: quote.extras_total || 0,
        grand_total: tariffTotal + (quote.extras_total || 0),
        notes: '',
        company,
      });
      toast.success('Word (.docx) scaricato!');
      setShowPdfDialog(false);
    } catch (e) {
      console.error(e);
      toast.error(friendlyError(e) || 'Errore generazione Word');
    } finally { setGeneratingPdf(false); }
  };

  const saveQuote = async () => {
    if (!quote) { toast.error('Calcola prima il preventivo'); return; }
    if (!clientData.name || !clientData.email) {
      toast.error('Nome ed Email sono obbligatori per salvare');
      return;
    }
    setSavingQuote(true);
    try {
      const chosenOpt = tariffChoice === 'custom'
        ? { type: 'custom', label: customDescription ? 'Tariffa personalizzata' : 'Tariffa personalizzata', total: Number(customAmount) || 0, description: customDescription }
        : quote.options?.find(o => o.type === tariffChoice) || quote.recommended;
      
      const payload = {
        marina_id: marina.id,
        marina_name: marina.name,
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
      };
      
      const res = await fetch('/api/port-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSavedQuoteNumber(data.quote_number);
      setSavedQuoteId(data.id);
      toast.success(`Preventivo ${data.quote_number} salvato in archivio!`);
    } catch (e) {
      toast.error(friendlyError(e) || 'Errore salvataggio');
    } finally {
      setSavingQuote(false);
    }
  };

  // ============== RICHIESTA PRENOTAZIONE ==============
  const requestBooking = async () => {
    if (bookingMode === 'lookup' && !bookingQuoteNumber.trim()) {
      toast.error('Inserisci il numero del preventivo');
      return;
    }
    if (bookingMode === 'current' && !savedQuoteId) {
      toast.error('Salva prima il preventivo');
      return;
    }
    setBookingLoading(true);
    try {
      let payload = {};
      if (bookingMode === 'lookup') {
        // Verifica esistenza preventivo
        const lookupRes = await fetch(`/api/marina-bookings/lookup-quote?quote_number=${encodeURIComponent(bookingQuoteNumber.trim())}`);
        if (!lookupRes.ok) {
          const err = await lookupRes.json();
          throw new Error(err.error || 'Preventivo non trovato');
        }
        const quoteFound = await lookupRes.json();
        payload = { quote_id: quoteFound.id, quote_number: quoteFound.quote_number, source: 'PUBLIC' };
      } else {
        payload = { quote_id: savedQuoteId, quote_number: savedQuoteNumber, source: 'PUBLIC' };
      }
      const r = await fetch('/api/marina-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || 'Errore creazione prenotazione');
      }
      const booking = await r.json();
      setCreatedBooking(booking);
      toast.success(`Prenotazione ${booking.booking_number} creata!`);
    } catch (e) {
      toast.error(friendlyError(e) || 'Errore prenotazione');
    } finally { setBookingLoading(false); }
  };

  // Pagamento acconto (MOCK SumUp)
  const payDeposit = async () => {
    if (!createdBooking) return;
    setPayingDeposit(true);
    try {
      const r = await fetch(`/api/marina-bookings/${createdBooking.id}?action=pay-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'SUMUP_MOCK' }),
      });
      if (!r.ok) throw new Error('Errore pagamento');
      const updated = await r.json();
      setCreatedBooking(updated);
      toast.success(`Acconto di ${updated.deposit_amount.toLocaleString('it-IT')}€ pagato (MOCK)`);
    } catch (e) {
      toast.error(friendlyError(e) || 'Errore pagamento');
    } finally { setPayingDeposit(false); }
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
                <Button className="bg-amber-500 text-white hover:bg-amber-600 font-semibold shadow-lg" onClick={() => router.push(`/posti-barca/${slug}/mappa-pubblica`)}>
                  <Map className="w-4 h-4 mr-2" /> Vedi Mappa Posti
                </Button>
                <SuperAdminMapButton slug={slug} />
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

            {/* Google Maps della Marina */}
            {marina.latitude && marina.longitude && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-primary" />Posizione</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <iframe
                    title="Marina Map"
                    width="100%"
                    height="350"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${marina.longitude - 0.01}%2C${marina.latitude - 0.01}%2C${marina.longitude + 0.01}%2C${marina.latitude + 0.01}&layer=mapnik&marker=${marina.latitude}%2C${marina.longitude}`}
                    style={{ border: 0, display: 'block' }}
                  />
                  <div className="p-3 bg-muted/30 border-t flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">📍 {marina.latitude}, {marina.longitude}</span>
                    <a
                      href={`https://www.google.com/maps?q=${marina.latitude},${marina.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-medium"
                    ><Map className="w-4 h-4" />Apri in Google Maps</a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabella tariffe stagionali (se presenti) */}
            {marina.pricing?.annual?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Tariffe Ormeggio Stagionali · Giugno-Settembre (IVA inclusa)</CardTitle></CardHeader>
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
          <div className="lg:col-span-1" translate="no">
            <Card className="sticky top-4 border-2 border-primary shadow-2xl">
              <CardHeader className="bg-gradient-to-br from-primary via-blue-700 to-blue-900 text-white">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="w-5 h-5" />Preview Posto Barca
                </CardTitle>
                <p className="text-xs text-white/80 -mt-1">Configura e ottieni un preventivo personalizzato</p>
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
                    {!quote.recommended && (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1 mb-1">
                          <AlertCircle className="w-4 h-4" />Tariffa non disponibile
                        </p>
                        <p className="text-xs text-red-600">Non sono presenti tariffe d'ormeggio per il periodo selezionato. Verranno calcolati solo gli eventuali servizi extra. Contatta direttamente la Marina per un preventivo personalizzato.</p>
                      </div>
                    )}
                    
                    {/* Selezione tariffa con radio button */}
                    {quote.options?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />Scegli la tariffa da applicare
                        </p>
                        <div className="space-y-1.5">
                          {quote.options.map(opt => (
                            <label
                              key={opt.type}
                              className={`flex items-start justify-between gap-2 p-2 rounded cursor-pointer border-2 transition-all ${tariffChoice === opt.type ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/30 bg-white'}`}
                            >
                              <div className="flex items-start gap-2 flex-1">
                                <input
                                  type="radio"
                                  name="tariff"
                                  className="mt-0.5"
                                  checked={tariffChoice === opt.type}
                                  onChange={() => setTariffChoice(opt.type)}
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-medium leading-tight">
                                    {opt.label}
                                    {quote.recommended?.type === opt.type && <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-[9px] py-0 px-1">★</Badge>}
                                  </p>
                                </div>
                              </div>
                              <strong className="text-sm text-primary whitespace-nowrap">€ {opt.total.toFixed(0)}</strong>
                            </label>
                          ))}
                          <label className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer border-2 transition-all ${tariffChoice === 'custom' ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/30 bg-white'}`}>
                            <div className="flex items-center gap-2 flex-1">
                              <input type="radio" name="tariff" checked={tariffChoice === 'custom'} onChange={() => setTariffChoice('custom')} />
                              <span className="text-xs font-medium">Personalizzata</span>
                            </div>
                            <Input
                              type="number" step="0.01" placeholder="0"
                              className="w-20 h-7 text-right text-xs"
                              disabled={tariffChoice !== 'custom'}
                              value={customAmount}
                              onChange={e => setCustomAmount(e.target.value)}
                              onClick={() => setTariffChoice('custom')}
                            />
                          </label>
                          {tariffChoice === 'custom' && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-1">
                              <Label className="text-xs font-semibold text-blue-900">Descrizione tariffa personalizzata (multiriga)</Label>
                              <textarea
                                rows={3}
                                value={customDescription}
                                onChange={e => setCustomDescription(e.target.value)}
                                placeholder="es. Tariffa concordata per posto barca dal 1/1 al 31/12 inclusi servizi extra, pulizia banchina, parking auto, accesso WiFi, lavanderia, scontistica fedeltà..."
                                className="w-full mt-1 text-xs px-2 py-1.5 border rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                              <p className="text-[10px] text-blue-700 mt-1">Questa descrizione comparirà nel PDF preventivo e nel registro preventivi.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {quote.extras?.length > 0 && (
                      <div className="bg-amber-50 p-2 rounded border border-amber-200">
                        <p className="text-xs font-semibold text-amber-700 mb-1">SERVIZI EXTRA</p>
                        {quote.extras.map((e, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span>{e.name}</span>
                            <strong>{fmtPrice(e.subtotal)}</strong>
                          </div>
                        ))}
                        <p className="text-xs font-bold text-amber-700 mt-1 pt-1 border-t flex justify-between">
                          <span>Subtotale extra</span><span>{fmtPrice(quote.extras_total)}</span>
                        </p>
                      </div>
                    )}
                    
                    <Separator />
                    <div className="bg-gradient-to-br from-primary to-blue-700 text-white p-4 rounded shadow-lg">
                      <p className="text-xs uppercase tracking-wide opacity-80">Totale Preventivo</p>
                      <p className="text-3xl font-bold">{fmtPrice(finalTotal)}</p>
                      <p className="text-xs opacity-80">{quote.period.days} giorni · barca {quote.boat.length}m</p>
                    </div>
                    
                    <Button variant="outline" className="w-full bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100" onClick={() => setShowPdfDialog(true)}>
                      <ClipboardList className="w-4 h-4 mr-2" />Genera Preview Posto Barca (PDF)
                    </Button>
                    <Button variant="outline" className="w-full bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100" onClick={() => setShowSaveDialog(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />Salva Preventivo in Archivio
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 shadow-md" onClick={() => { setCreatedBooking(null); setBookingMode(savedQuoteId ? 'current' : 'lookup'); setBookingQuoteNumber(''); setShowBookingDialog(true); }}>
                      <Ship className="w-4 h-4 mr-2" />Richiedi Prenotazione (Step 3/3)
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
        <DialogContent className="max-w-md" translate="no">
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
            <Button variant="secondary" onClick={generateDOCX} disabled={generatingPdf} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              {generatingPdf ? 'Genero...' : <><FileText className="w-4 h-4 mr-2" />Word (.docx)</>}
            </Button>
            <Button onClick={generatePDF} disabled={generatingPdf}>
              {generatingPdf ? 'Genero PDF...' : <><FileText className="w-4 h-4 mr-2" />PDF</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Salva Preventivo in Archivio */}
      <Dialog open={showSaveDialog} onOpenChange={(o) => { setShowSaveDialog(o); if (!o) setSavedQuoteNumber(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" />Salva Preventivo in Archivio</DialogTitle>
            <DialogDescription>
              Il preventivo verrà salvato nel registro per essere consultato e modificato in seguito.
            </DialogDescription>
          </DialogHeader>
          {savedQuoteNumber ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
              <h3 className="text-xl font-bold text-emerald-900">Preventivo Salvato!</h3>
              <p className="text-sm text-emerald-700 mt-2">Numero preventivo:</p>
              <p className="text-3xl font-mono font-bold text-emerald-900 mt-1">{savedQuoteNumber}</p>
              <p className="text-xs text-emerald-700 mt-3">Lo trovi nella dashboard Super Admin → tab "Preventivi"</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome *</Label><Input value={clientData.name} onChange={e => setClientData(d => ({ ...d, name: e.target.value }))} /></div>
                <div><Label>Cognome / Rag.Soc.</Label><Input value={clientData.surname} onChange={e => setClientData(d => ({ ...d, surname: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email *</Label><Input type="email" value={clientData.email} onChange={e => setClientData(d => ({ ...d, email: e.target.value }))} /></div>
                <div><Label>Telefono</Label><Input value={clientData.phone} onChange={e => setClientData(d => ({ ...d, phone: e.target.value }))} /></div>
              </div>
              <div><Label>Codice Fiscale / P.IVA</Label><Input value={clientData.tax_code} onChange={e => setClientData(d => ({ ...d, tax_code: e.target.value.toUpperCase() }))} /></div>
              <div><Label>Indirizzo</Label><Input value={clientData.address} onChange={e => setClientData(d => ({ ...d, address: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Città</Label><Input value={clientData.city} onChange={e => setClientData(d => ({ ...d, city: e.target.value }))} /></div>
                <div><Label>CAP</Label><Input value={clientData.zip} onChange={e => setClientData(d => ({ ...d, zip: e.target.value }))} /></div>
                <div>
                  <Label>Paese</Label>
                  <Select value={clientData.country} onValueChange={v => setClientData(d => ({ ...d, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">Italia</SelectItem>
                      <SelectItem value="FR">Francia</SelectItem>
                      <SelectItem value="DE">Germania</SelectItem>
                      <SelectItem value="ES">Spagna</SelectItem>
                      <SelectItem value="OTHER">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome Barca</Label><Input value={clientData.boat_name} onChange={e => setClientData(d => ({ ...d, boat_name: e.target.value }))} /></div>
                <div><Label>Targa / Sigla</Label><Input value={clientData.boat_registration} onChange={e => setClientData(d => ({ ...d, boat_registration: e.target.value }))} /></div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs text-emerald-800">
                <strong>Riepilogo:</strong> {marina.name} · {boatLength}m · {startDate} → {endDate} · {tariffChoice ? quote?.options?.find(o => o.type === tariffChoice)?.label || (tariffChoice === 'custom' ? 'Personalizzata' : '') : 'Nessuna tariffa'} · TOTALE <strong>€ {finalTotal.toFixed(2)}</strong>
              </div>
            </div>
          )}
          <DialogFooter>
            {savedQuoteNumber ? (
              <Button onClick={() => { setShowSaveDialog(false); setSavedQuoteNumber(''); }}>Chiudi</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annulla</Button>
                <Button onClick={saveQuote} disabled={savingQuote || !clientData.name || !clientData.email}>
                  {savingQuote ? 'Salvo...' : <><Sparkles className="w-4 h-4 mr-2" />Salva Preventivo</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog RICHIEDI PRENOTAZIONE (Step 3) */}
      <Dialog open={showBookingDialog} onOpenChange={(o) => { setShowBookingDialog(o); if (!o) { setCreatedBooking(null); setBookingQuoteNumber(''); } }}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto" translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-600" />
              {createdBooking ? `Prenotazione ${createdBooking.booking_number}` : 'Richiedi Prenotazione Posto Barca'}
            </DialogTitle>
            {!createdBooking && (
              <DialogDescription>
                La tua richiesta verrà inviata alla marina e gestita nei tempi previsti. Per confermare il posto è richiesto il pagamento di un acconto del 30%.
              </DialogDescription>
            )}
          </DialogHeader>

          {!createdBooking ? (
            <div className="space-y-4">
              {/* Selettore modalità */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Da quale preventivo vuoi creare la prenotazione?</Label>
                <div className="space-y-2">
                  {savedQuoteId && (
                    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${bookingMode === 'current' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" checked={bookingMode === 'current'} onChange={() => setBookingMode('current')} className="mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">Usa il preventivo appena salvato</div>
                        <div className="text-xs text-slate-600">{savedQuoteNumber}</div>
                      </div>
                    </label>
                  )}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${bookingMode === 'lookup' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" checked={bookingMode === 'lookup'} onChange={() => setBookingMode('lookup')} className="mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Inserisci numero di un preventivo precedente</div>
                      <div className="text-xs text-slate-600 mb-2">Formato: PQ-2026/0001</div>
                      <Input
                        placeholder="PQ-2026/0001"
                        value={bookingQuoteNumber}
                        onChange={e => setBookingQuoteNumber(e.target.value)}
                        disabled={bookingMode !== 'lookup'}
                        className="font-mono"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {!savedQuoteId && bookingMode === 'current' && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>Salva prima il preventivo per usare questa opzione, oppure inserisci il numero di un preventivo già esistente.</div>
                </div>
              )}
            </div>
          ) : (
            // === BOOKING CREATED - show details + pay deposit ===
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">Prenotazione registrata!</span>
                </div>
                <div className="text-sm text-emerald-800">
                  Numero: <span className="font-mono font-bold">{createdBooking.booking_number}</span><br />
                  Cliente: {createdBooking.customer?.name} {createdBooking.customer?.surname}<br />
                  Periodo: {new Date(createdBooking.start_date).toLocaleDateString('it-IT')} → {new Date(createdBooking.end_date).toLocaleDateString('it-IT')}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Totale preventivo</span>
                  <span className="font-medium">€ {createdBooking.grand_total?.toLocaleString('it-IT')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Acconto richiesto ({createdBooking.deposit_pct}%)</span>
                  <span className="font-bold text-blue-700">€ {createdBooking.deposit_amount?.toLocaleString('it-IT')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Saldo</span>
                  <span className="font-medium">€ {createdBooking.balance_amount?.toLocaleString('it-IT')}</span>
                </div>
              </div>

              {/* Stato pagamento */}
              {createdBooking.deposit_paid ? (
                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-700 mb-2" />
                  <div className="font-bold text-green-900">Acconto pagato!</div>
                  <div className="text-xs text-green-700 mt-1">
                    Riferimento: {createdBooking.deposit_payment_reference}<br />
                    La marina ti contatterà a breve per la conferma definitiva.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={payDeposit}
                    disabled={payingDeposit}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 h-12 text-base font-semibold shadow-md"
                  >
                    {payingDeposit ? 'Elaborazione...' : <>💳 Paga Acconto € {createdBooking.deposit_amount?.toLocaleString('it-IT')} (30%)</>}
                  </Button>
                  <p className="text-xs text-slate-500 text-center">Pagamento sicuro via SumUp · MOCK demo (in attivazione)</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!createdBooking ? (
              <>
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Annulla</Button>
                <Button
                  onClick={requestBooking}
                  disabled={bookingLoading || (bookingMode === 'current' && !savedQuoteId) || (bookingMode === 'lookup' && !bookingQuoteNumber.trim())}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {bookingLoading ? 'Invio richiesta...' : <><Ship className="w-4 h-4 mr-2" />Conferma Richiesta</>}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowBookingDialog(false)}>Chiudi</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bottone visibile solo a SUPER_ADMIN per accedere alla mappa di gestione (admin)
function SuperAdminMapButton({ slug }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?.role === 'SUPER_ADMIN') setShow(true);
    } catch (e) { /* */ }
  }, []);
  if (!show) return null;
  return (
    <Button
      className="bg-amber-700 text-white hover:bg-amber-800 font-semibold shadow-lg border border-amber-900"
      onClick={() => router.push(`/posti-barca/${slug}/mappa`)}
      title="Solo Super Admin"
    >
      🔐 Gestione Mappa
    </Button>
  );
}

