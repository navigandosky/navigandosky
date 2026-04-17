'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LogIn, Users, Calendar, BarChart3, Tag, Clock, MapPin, Ship, Compass, Anchor, Globe, User, CreditCard, TrendingUp, Eye, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { api, safeToastError, fmtDate, fmtTime, fmtDateTime, fmtPrice, TYPE_LABELS, TYPE_ICONS, TYPE_COLORS } from '../shared/utilities';
import { TypeBadge, StatusBadge } from '../shared/BadgeComponents';
import { useLanguage } from '../../app/i18n/LanguageContext';

function B2BPortal({ setView, allExperiences }) {
  const { t } = useLanguage();
  const [agency, setAgency] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bkForm, setBkForm] = useState({ name: '', email: '', phone: '', seats: 1 });
  const [resources, setResources] = useState([]);
  
  // Filtri Report B2B
  const [filters, setFilters] = useState({
    code: '',
    date: '',
    resource_id: '',
    experience_id: '',
    customer_name: ''
  });
  const [filteredBookings, setFilteredBookings] = useState([]);

  const handleLogin = async () => {
    setLoading(true);
    const res = await api('agencies/login', { method: 'POST', body: loginForm });
    if (res.error) { safeToastError(res.error); setLoading(false); return; }
    setAgency(res.agency);
    
    // Carica dati ottimizzati per agenzia
    const [exps, bks, res_data, sl] = await Promise.all([
      api('experiences'), 
      api(`bookings?agency_id=${res.agency.id}`), // Solo prenotazioni dell'agenzia
      api('resources'),
      api('slots')
    ]);
    
    setExperiences(Array.isArray(exps) ? exps : []);
    setMyBookings(Array.isArray(bks) ? bks : []);
    setFilteredBookings(Array.isArray(bks) ? bks : []);
    setResources(Array.isArray(res_data) ? res_data : []);
    setSlots(Array.isArray(sl) ? sl : []);
    setLoading(false);
    toast.success(`Benvenuto ${res.agency.name}!`);
  };

  const loadSlots = async (exp) => {
    setSelectedExp(exp);
    const s = await api(`slots?experience_id=${exp.id}&date_from=${new Date().toISOString()}`);
    console.log('Slots caricati:', s);
    const filtered = Array.isArray(s) ? s.filter(sl => {
      if (sl.status === 'CANCELLED') return false;
      const slotDate = new Date(sl.start_datetime);
      const now = new Date();
      return slotDate > now;
    }) : [];
    console.log('Slots filtrati:', filtered);
    setSlots(filtered);
  };

  const handleB2BBook = async () => {
    if (!bookingSlot || !agency) return;
    setLoading(true);
    
    const exp = selectedExp;
    const priceB2C = exp.price_b2c || 0; // Prezzo cliente finale
    const priceB2B = exp.price_b2b || priceB2C; // Prezzo netto Maretrek
    const commission = (priceB2C - priceB2B) * bkForm.seats; // Provvigione agenzia
    
    const bookingData = {
      slot_id: bookingSlot.id,
      experience_id: exp.id,
      customer_name: bkForm.name,
      customer_email: bkForm.email,
      customer_phone: bkForm.phone,
      seats: bkForm.seats,
      total_amount: priceB2C * bkForm.seats, // Cliente finale paga prezzo B2C
      agency_id: agency.id, // Traccia agenzia
      commission_amount: commission, // Provvigione agenzia
      b2c_price: priceB2C, // Prezzo per posto B2C
      b2b_price: priceB2B, // Prezzo per posto B2B
      special_requests: bkForm.special_requests || ''
    };
    
    const res = await api('bookings', { method: 'POST', body: bookingData });
    
    if (res.error) { 
      safeToastError(res.error); 
    } else { 
      toast.success(`✅ Prenotazione ${res.booking_ref} confermata! Provvigione: €${commission.toFixed(2)}`);
      
      // Ricarica prenotazioni
      const bks = await api(`bookings?agency_id=${agency.id}`);
      setMyBookings(Array.isArray(bks) ? bks : []);
      setFilteredBookings(Array.isArray(bks) ? bks : []);
      
      // Reset form
      setBookingSlot(null);
      setBkForm({ name: '', email: '', phone: '', seats: 1, special_requests: '' });
    }
    
    setLoading(false);
  };

  // Filtri Report B2B
  const applyFilters = () => {
    let result = [...myBookings];
    
    if (filters.code) {
      result = result.filter(b => 
        (b.booking_ref || '').toLowerCase().includes(filters.code.toLowerCase())
      );
    }
    
    if (filters.date) {
      result = result.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        return slot.start_datetime?.startsWith(filters.date);
      });
    }
    
    if (filters.resource_id) {
      const resSlotIds = slots.filter(s => 
        (s.resource_ids || []).includes(filters.resource_id)
      ).map(s => s.id);
      result = result.filter(b => resSlotIds.includes(b.slot_id));
    }
    
    if (filters.experience_id) {
      const expSlotIds = slots.filter(s => 
        s.experience_id === filters.experience_id
      ).map(s => s.id);
      result = result.filter(b => expSlotIds.includes(b.slot_id));
    }
    
    if (filters.customer_name) {
      result = result.filter(b =>
        (b.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase())
      );
    }
    
    setFilteredBookings(result);
  };
  
  const clearFilters = () => {
    setFilters({ code: '', date: '', resource_id: '', experience_id: '', customer_name: '' });
    setFilteredBookings(myBookings);
  };
  
  const exportPDF = async () => {
    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const { jsPDF } = jsPDFModule;
      const autoTable = autoTableModule.default || autoTableModule;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(`Report Vendite - ${agency.name}`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, 14, 30);
      doc.text(`Totale Vendite: ${filteredBookings.length}`, 14, 36);
      
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
        
        return [
          b.booking_ref,
          b.customer_name,
          slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          exp?.name || '-',
          resourceNames || '-',
          b.seats,
          b.status,
          `€ ${(b.total_amount || 0).toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: 42,
        head: [['Codice', 'Cliente', 'Data', 'Esperienza', 'Risorsa', 'Posti', 'Stato', 'Totale']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.save(`${agency.name}-vendite-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato!');
    } catch (error) {
      console.error('Errore export PDF:', error);
      toast.error('❌ Errore durante l\'esportazione PDF');
    }
  };
  
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
        
        return {
          'Codice': b.booking_ref,
          'Cliente': b.customer_name,
          'Email': b.customer_email,
          'Telefono': b.customer_phone || '-',
          'Data': slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          'Esperienza': exp?.name || '-',
          'Risorsa': resourceNames || '-',
          'Posti Venduti': b.seats,
          'Stato': b.status,
          'Totale': `€ ${(b.total_amount || 0).toFixed(2)}`
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendite');
      
      const wscols = [
        { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, 
        { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      ws['!cols'] = wscols;
      
      XLSX.writeFile(wb, `${agency.name}-vendite-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato!');
    } catch (error) {
      console.error('Errore export Excel:', error);
      toast.error('❌ Errore durante l\'esportazione Excel');
    }
  };

  if (!agency) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center"><div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-primary" /></div><CardTitle className="text-2xl">Portale B2B Agenzie</CardTitle><CardDescription>Accedi con le credenziali della tua agenzia</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="info@agenzia.it" /></div>
            <div><Label>Password</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" /></div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>{loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}Accedi</Button>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground">Demo: info@sardiniatours.it / agency2025</CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold">Portale B2B</h1><p className="text-muted-foreground">{agency.name} - Sconto {agency.discount_percentage}%</p></div>
        <Button variant="outline" onClick={() => setAgency(null)}><LogIn className="w-4 h-4 mr-2" />Esci</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Sconto Dedicato</p><p className="text-3xl font-bold text-green-600">{agency.discount_percentage}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Esperienze Disponibili</p><p className="text-3xl font-bold">{experiences.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-muted-foreground">Le Tue Prenotazioni</p><p className="text-3xl font-bold">{myBookings.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalogo B2B</TabsTrigger>
          <TabsTrigger value="mybookings">Le Mie Prenotazioni</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1.5" />Report Vendite</TabsTrigger>
          <TabsTrigger value="calendar"><CalIcon className="w-4 h-4 mr-1.5" />Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="space-y-4 mt-4">
          {selectedExp ? (
            <div>
              <button onClick={() => setSelectedExp(null)} className="flex items-center gap-2 text-primary hover:underline mb-4"><ArrowLeft className="w-4 h-4" />Torna al catalogo</button>
              <Card className="mb-4"><CardContent className="pt-4">
                <div className="flex gap-4">
                  {selectedExp.images && selectedExp.images[0] ? (
                    <img src={selectedExp.images[0]} alt={selectedExp.name} className="w-24 h-24 rounded-lg object-cover" />
                  ) : selectedExp.image_url ? (
                    <img src={selectedExp.image_url} alt={selectedExp.name} className="w-24 h-24 rounded-lg object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center"><ImageIcon className="w-12 h-12 text-gray-400" /></div>
                  )}
                  <div><h2 className="text-xl font-bold">{selectedExp.name}</h2><TypeBadge type={selectedExp.type} /><div className="mt-2 flex gap-4"><div><span className="text-sm text-muted-foreground">Prezzo Listino:</span> <span className="line-through text-muted-foreground">{fmtPrice(selectedExp.price_b2c)}</span></div><div><span className="text-sm text-muted-foreground">Prezzo B2B:</span> <span className="font-bold text-green-600">{fmtPrice(selectedExp.price_b2b * (1 - agency.discount_percentage/100))}</span></div></div></div></div>
              </CardContent></Card>
              <h3 className="font-semibold mb-3">Disponibilita</h3>
              {slots.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-2">Nessuna disponibilità al momento</p>
                  <p className="text-xs text-muted-foreground">Gli slot potrebbero non essere ancora stati creati per questa esperienza</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map(slot => {
                    const avail = slot.max_seats - slot.booked_seats;
                    return (
                      <div key={slot.id} className={`p-3 rounded-lg border ${avail <= 0 ? 'bg-red-50' : 'bg-white hover:border-primary hover:shadow-md cursor-pointer transition'}`} onClick={() => avail > 0 && setBookingSlot(slot)}>
                        <p className="font-medium text-sm capitalize">{fmtDate(slot.start_datetime)}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(slot.start_datetime)} - {fmtTime(slot.end_datetime)}</p>
                        <AvailabilityBar booked={slot.booked_seats} max={slot.max_seats} />
                        <p className="text-xs text-green-600 font-medium mt-2">Clicca per prenotare</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiences.map(exp => {
                const imgSrc = (exp.images && exp.images.length > 0) ? exp.images[0] : (exp.image_url || '/uploads/placeholder.jpg');
                return (
                  <Card key={exp.id} className="cursor-pointer card-hover" onClick={() => loadSlots(exp)}>
                    <div className="relative h-40"><img src={imgSrc} alt={exp.name} className="w-full h-full object-cover rounded-t-lg" /><div className="absolute top-2 left-2"><TypeBadge type={exp.type} /></div></div>
                    <CardContent className="pt-3">
                      <h3 className="font-semibold mb-1">{exp.name}</h3>
                      <div className="flex justify-between items-center">
                        <div><span className="text-xs text-muted-foreground line-through">{fmtPrice(exp.price_b2c)}</span><span className="ml-2 font-bold text-green-600">{fmtPrice(exp.price_b2b * (1 - agency.discount_percentage/100))}</span></div>
                        <Badge variant="secondary" className="text-xs">-{agency.discount_percentage}%</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="mybookings" className="mt-4">
          {myBookings.length === 0 ? <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione.</p> : (
            <div className="space-y-3">{myBookings.map(b => {
              const commission = b.commission_amount || 0;
              const b2cPrice = b.b2c_price || b.total_amount / b.seats;
              const b2bPrice = b.b2b_price || b2cPrice;
              
              return (
                <Card key={b.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold font-mono">{b.booking_ref}</p>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-sm font-medium">{b.experience_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(b.slot_datetime)} • {b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{b.seats} {b.seats === 1 ? 'posto' : 'posti'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Cliente Paga</p>
                        <p className="font-bold text-lg">{fmtPrice(b.total_amount)}</p>
                        {commission > 0 && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs text-green-700">Tua Provvigione</p>
                            <p className="font-bold text-green-700">+{fmtPrice(commission)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}</div>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6 mt-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Report Vendite - {agency.name}</h2>
            <p className="text-muted-foreground">Analizza le tue vendite e esporta i report</p>
          </div>

          {/* Statistiche Provvigioni */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Totale Vendite</p>
                <p className="text-3xl font-bold">{myBookings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Fatturato Clienti</p>
                <p className="text-2xl font-bold text-blue-600">
                  {fmtPrice(myBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Netto Maretrek</p>
                <p className="text-2xl font-bold text-amber-600">
                  {fmtPrice(myBookings.reduce((sum, b) => sum + ((b.b2b_price || 0) * b.seats), 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-green-700 font-medium">Tue Provvigioni</p>
                <p className="text-3xl font-bold text-green-700">
                  +{fmtPrice(myBookings.reduce((sum, b) => sum + (b.commission_amount || 0), 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtri */}
          <Card>
            <CardHeader><CardTitle>Filtri Ricerca</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Codice Prenotazione</Label><Input placeholder="MRT12345" value={filters.code} onChange={(e) => setFilters({...filters, code: e.target.value})} /></div>
                <div><Label>Data</Label><Input type="date" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})} /></div>
                <div><Label>Cliente</Label><Input placeholder="Nome cliente" value={filters.customer_name} onChange={(e) => setFilters({...filters, customer_name: e.target.value})} /></div>
                <div><Label>Risorsa</Label><Select value={filters.resource_id || 'all'} onValueChange={(v) => setFilters({...filters, resource_id: v === 'all' ? '' : v})}><SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Esperienza</Label><Select value={filters.experience_id || 'all'} onValueChange={(v) => setFilters({...filters, experience_id: v === 'all' ? '' : v})}><SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{experiences.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clearFilters}>Pulisci</Button>
                <Button onClick={applyFilters}><Search className="w-4 h-4 mr-2" />Applica Filtri</Button>
              </div>
            </CardContent>
          </Card>

          {/* Risultati */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Le Tue Vendite - Totale: {filteredBookings.length}</CardTitle></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPDF}><Download className="w-4 h-4 mr-2" />PDF</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Codice</th><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Esperienza</th><th className="p-3">Risorsa</th><th className="p-3">Posti</th><th className="p-3">Cliente Paga</th><th className="p-3">Provvigione</th><th className="p-3">Stato</th></tr></thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const slot = slots.find(s => s.id === b.slot_id);
                      const exp = experiences.find(e => e.id === slot?.experience_id);
                      const resourceIds = slot?.resource_ids || [];
                      const resourceNames = resourceIds.map(rid => resources.find(r => r.id === rid)?.name || '').filter(Boolean).join(', ');
                      const commission = b.commission_amount || 0;
                      return (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                          <td className="p-3">{b.customer_name}</td>
                          <td className="p-3 text-xs">{slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-'}</td>
                          <td className="p-3">{exp?.name || '-'}</td>
                          <td className="p-3">{resourceNames ? <div className="flex items-center gap-2"><Ship className="w-4 h-4 text-primary" /><span className="text-xs">{resourceNames}</span></div> : '-'}</td>
                          <td className="p-3 font-semibold">{b.seats}</td>
                          <td className="p-3 font-semibold">{fmtPrice(b.total_amount)}</td>
                          <td className="p-3 font-bold text-green-600">+{fmtPrice(commission)}</td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBookings.length === 0 && <p className="text-center py-12 text-muted-foreground">Nessun risultato trovato</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab Calendario */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario Disponibilità</CardTitle>
              <CardDescription>Visualizza tutte le disponibilità e le tue prenotazioni evidenziate</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary"/></div>}>
                <GanttCalendar 
                  resources={resources} 
                  allSlots={slots} 
                  allBookings={myBookings} 
                  experiences={experiences} 
                  onRefresh={() => {}}
                />
              </Suspense>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ℹ️ <strong>Legenda:</strong> Il calendario mostra tutte le disponibilità. Le tue prenotazioni sono evidenziate.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* B2B Booking Dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">Prenota per Cliente Finale</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {bookingSlot && selectedExp && (
              <>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-bold text-base">{selectedExp.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(bookingSlot.start_datetime)}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-gray-50 rounded border text-center">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-bold">{fmtPrice(selectedExp.price_b2c)}</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-center">
                    <p className="text-xs text-amber-700">Netto</p>
                    <p className="text-sm font-bold text-amber-700">{fmtPrice(selectedExp.price_b2b || selectedExp.price_b2c)}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded border border-green-200 text-center">
                    <p className="text-xs text-green-700">Provvigione</p>
                    <p className="text-sm font-bold text-green-700">+{fmtPrice((selectedExp.price_b2c - (selectedExp.price_b2b || selectedExp.price_b2c)) * (bkForm.seats || 1))}</p>
                  </div>
                </div>
              </>
            )}
            
            <div><Label className="text-sm">Nome Cliente *</Label><Input className="h-9" value={bkForm.name} onChange={e=>setBkForm({...bkForm,name:e.target.value})} placeholder="Mario Rossi" required /></div>
            <div><Label className="text-sm">Email Cliente *</Label><Input className="h-9" type="email" value={bkForm.email} onChange={e=>setBkForm({...bkForm,email:e.target.value})} placeholder="cliente@email.com" required /></div>
            <div><Label className="text-sm">Telefono Cliente *</Label><Input className="h-9" value={bkForm.phone} onChange={e=>setBkForm({...bkForm,phone:e.target.value})} placeholder="+39 333 1234567" required /></div>
            <div><Label className="text-sm">Posti</Label><Input className="h-9" type="number" min="1" max={bookingSlot ? bookingSlot.max_seats - bookingSlot.booked_seats : 1} value={bkForm.seats} onChange={e=>setBkForm({...bkForm,seats:parseInt(e.target.value)||1})} /></div>
            <div><Label className="text-sm">Note (opzionale)</Label><textarea className="w-full p-2 border rounded text-sm" rows="2" value={bkForm.special_requests||''} onChange={e=>setBkForm({...bkForm,special_requests:e.target.value})} placeholder="Allergie, esigenze..." /></div>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-900 mb-1">Riepilogo</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Cliente paga:</span>
                  <span className="font-bold">{fmtPrice((selectedExp?.price_b2c || 0) * (bkForm.seats || 1))}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Tu guadagni:</span>
                  <span className="font-bold">+{fmtPrice(((selectedExp?.price_b2c || 0) - (selectedExp?.price_b2b || selectedExp?.price_b2c || 0)) * (bkForm.seats || 1))}</span>
                </div>
              </div>
            </div>
            
            <Button className="w-full h-10" onClick={handleB2BBook} disabled={loading || !bkForm.name || !bkForm.email || !bkForm.phone}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
              Conferma Prenotazione
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ MAIN APP ============

export default B2BPortal;
