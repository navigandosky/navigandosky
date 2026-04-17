'use client';
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Anchor, Ship, MapPin, Calendar as CalIcon, Clock, Users, Star, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Plus, Trash2, Search, CheckCircle2, BarChart3, Menu, X, Globe, Phone, Mail, Waves, Sun, Compass, Eye, Edit, Download, RefreshCw, Navigation, CreditCard, Tag, User, ChevronLeft, GripVertical, Building2, LogIn, ListOrdered, AlertCircle, Bell, Upload, Image as ImageIcon, Map, Languages, Copy } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLanguage } from '../../app/i18n/LanguageContext';
import { api, safeToastError, fmtDate, fmtTime, fmtDateTime, fmtPrice, TYPE_LABELS, TYPE_ICONS, TYPE_COLORS, GANTT_COLORS, LANG_MAP, BOAT_TYPE_LABELS, getPriceTierForDate } from '../shared/utilities';
import { TypeBadge, StatusBadge, AvailabilityBar } from '../shared/BadgeComponents';
import ImageUploader from '../shared/ImageUploader';
import PDFUploader from '../shared/PDFUploader';

const MappaFlottaWrapper = dynamic(() => import('../../app/components/MappaFlottaWrapper'), { ssr: false });
const GanttCalendar = lazy(() => import('../../app/components/GanttCalendar'));

function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [experiences, setExps] = useState([]);
  const [resources, setResources] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [showDialog, setShowDialog] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Multi-Tenant: Company Admin
  const [companyAdmin, setCompanyAdmin] = useState(null);
  const [company, setCompany] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);

  const [editRes, setEditRes] = useState(null);
  const [editResForm, setEditResForm] = useState({});
  const [editBk, setEditBk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewBk, setPreviewBk] = useState(null); // Stato per dialog anteprima prenotazione
  const [seeding, setSeeding] = useState(false);
  const [resBookings, setResBookings] = useState(null);
  
  // Filtri Report
  const [filters, setFilters] = useState({
    code: '',
    date: '',
    resource_id: '',
    experience_id: '',
    customer_name: ''
  });
  const [filteredBookings, setFilteredBookings] = useState([]);
  
  // Filtri Bookings Tab
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingExpFilter, setBookingExpFilter] = useState('ALL');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingCustomerFilter, setBookingCustomerFilter] = useState('');
  const [bookingCodeFilter, setBookingCodeFilter] = useState('');
  const [bookingAgencyFilter, setBookingAgencyFilter] = useState('ALL'); // NUOVO filtro agenzia
  
  // Filtro Slot Tab
  const [slotExpFilter, setSlotExpFilter] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [slotPage, setSlotPage] = useState(0);
  const SLOTS_PER_PAGE = 10;
  

  // Login Company Admin
  const handleCompanyAdminLogin = async () => {
    const res = await api('users/login', { method: 'POST', body: loginForm });
    if (res.error) {
      safeToastError(res.error);
      return;
    }
    
    if (res.user.role !== 'COMPANY_ADMIN') {
      toast.error('Accesso negato: solo Company Admin');
      return;
    }
    
    setCompanyAdmin(res.user);
    setShowLogin(false);
    
    // Carica company info
    const companyData = await api(`companies/${res.user.company_id}`);
    setCompany(companyData);
    
    // Carica dati della company (tutto filtrato per company_id)
    await load();
    
    toast.success(`Benvenuto ${companyData.name}!`);
  };

  // Filtri Panoramica
  const [overviewDateFilter, setOverviewDateFilter] = useState('');

  const load = useCallback(async () => {
    // Filtro company per multi-tenant
    const companyFilter = companyAdmin ? `&company_id=${companyAdmin.company_id}` : '';
    
    // Carica solo dati essenziali all'avvio per velocizzare
    const [s, e, r] = await Promise.all([
      api('stats'), 
      api(`experiences?all=true${companyFilter}`), 
      api(`resources${companyFilter ? '?' + companyFilter.slice(1) : ''}`)
    ]);
    setStats(s||{}); 
    setExps(Array.isArray(e)?e:[]); 
    setResources(Array.isArray(r)?r:[]);
    
    // Carica il resto in background (non-blocking)
    setTimeout(async () => {
      const [sl, b, v, ag] = await Promise.all([
        api(`slots${companyFilter ? '?' + companyFilter.slice(1) : ''}`), 
        api(`bookings${companyFilter ? '?' + companyFilter.slice(1) : ''}`), 
        api(`vouchers${companyFilter ? '?' + companyFilter.slice(1) : ''}`), 
        api(`agencies${companyFilter ? '?' + companyFilter.slice(1) : ''}`)
      ]);
      setSlots(Array.isArray(sl)?sl:[]); 
      setBookings(Array.isArray(b)?b:[]); 
      setVouchers(Array.isArray(v)?v:[]);
      setAgencies(Array.isArray(ag)?ag:[]);
      setFilteredBookings(Array.isArray(b)?b:[]);
    }, 100);
  }, [companyAdmin]);

  useEffect(() => { load(); }, [load]);

  const seedData = async () => { setSeeding(true); await api('seed', { method: 'POST' }); toast.success('Dati demo caricati!'); await load(); setSeeding(false); };
  const createItem = async (ep, data) => { await api(ep, { method: 'POST', body: data }); toast.success('Creato!'); setShowDialog(null); setFormData({}); await load(); };
  const deleteItem = async (ep, id) => { if (!confirm('Eliminare?')) return; await api(`${ep}/${id}`, { method: 'DELETE' }); toast.success('Eliminato!'); await load(); };
  const cancelBooking = async (id) => { await api(`bookings/${id}`, { method: 'PUT', body: { action: 'cancel' } }); toast.success('Cancellata'); await load(); };
  const checkinBooking = async (id) => { await api(`bookings/${id}`, { method: 'PUT', body: { action: 'checkin' } }); toast.success('Check-in!'); await load(); };
  const getExpName = (id) => experiences.find(e => e.id === id)?.name || '-';
  
  // Helper: Ottieni nome risorsa da prenotazione (max 6 caratteri)
  const getResourceName = (booking) => {
    const slot = slots.find(s => s.id === booking.slot_id);
    if (!slot || !slot.resource_ids || slot.resource_ids.length === 0) return '-';
    
    const resourceId = slot.resource_ids[0]; // Prendi la prima risorsa
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return '-';
    
    // Tronca a 6 caratteri
    return resource.name.substring(0, 6);
  };

  const saveResource = async () => {
    if (!editRes) return;
    const res = await api(`resources/${editRes.id}`, { method: 'PUT', body: editResForm });
    if (res.error) safeToastError(res.error); else { toast.success('Risorsa aggiornata!'); setEditRes(null); await load(); }
  };

  const saveBookingEdit = async () => {
    if (!editBk) return;
    const res = await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'update_details', ...editForm } });
    if (res.error) safeToastError(res.error); else { toast.success('Prenotazione aggiornata!'); setEditBk(null); await load(); }
  };

  const getResourceBookings = (resId) => {
    const resSlotIds = slots.filter(s => (s.resource_ids || []).includes(resId)).map(s => s.id);
    return bookings.filter(b => resSlotIds.includes(b.slot_id) && b.status !== 'CANCELLED');
  };

  // Filtro bookings con filtri avanzati
  const filteredBookingsTab = useMemo(() => {
    let filtered = bookings;
    
    // Filtro per Esperienza
    if (bookingExpFilter && bookingExpFilter !== 'ALL') {
      filtered = filtered.filter(b => b.experience_id === bookingExpFilter);
    }
    
    // Filtro per Data Servizio
    if (bookingDateFilter) {
      filtered = filtered.filter(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        if (!slot) return false;
        const slotDate = slot.start_datetime.split('T')[0];
        return slotDate === bookingDateFilter;
      });
    }
    
    // Filtro per Cliente
    if (bookingCustomerFilter) {
      const search = bookingCustomerFilter.toLowerCase();
      filtered = filtered.filter(b => 
        (b.customer_name || '').toLowerCase().includes(search)
      );
    }
    
    // Filtro per Codice Prenotazione
    if (bookingCodeFilter) {
      const search = bookingCodeFilter.toLowerCase();
      filtered = filtered.filter(b => 
        (b.booking_ref || '').toLowerCase().includes(search)
      );
    }
    
    // Filtro per Agenzia
    if (bookingAgencyFilter && bookingAgencyFilter !== 'ALL') {
      if (bookingAgencyFilter === 'B2C') {
        // Mostra solo prenotazioni dirette (senza agenzia)
        filtered = filtered.filter(b => !b.agency_id);
      } else {
        // Mostra solo prenotazioni dell'agenzia specifica
        filtered = filtered.filter(b => b.agency_id === bookingAgencyFilter);
      }
    }
    
    return filtered;
  }, [bookings, bookingExpFilter, bookingDateFilter, bookingCustomerFilter, bookingCodeFilter, bookingAgencyFilter, slots]);
  
  // Filtro slot per esperienza
  const filteredSlots = useMemo(() => {
    if (slotExpFilter === 'ALL') return slots;
    return slots.filter(s => s.experience_id === slotExpFilter);
  }, [slots, slotExpFilter]);
  
  // Panoramica ordinata e filtrata
  const sortedOverviewBookings = useMemo(() => {
    let result = [...bookings];
    
    // Filtra per data se specificato
    if (overviewDateFilter) {
      result = result.filter(b => b.created_at?.startsWith(overviewDateFilter));
    }
    
    // Ordina per created_at decrescente
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA; // Decrescente
    });
    
    return result;
  }, [bookings, overviewDateFilter]);
  
  // Totale economico
  const totalRevenue = useMemo(() => {
    return sortedOverviewBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  }, [sortedOverviewBookings]);

  // Funzioni filtri report
  const applyFilters = () => {
    let result = [...bookings];
    
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
    setFilteredBookings(bookings);
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
      
      // Header
      doc.setFontSize(18);
      doc.text('Report Prenotazioni - Maretrek', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, 14, 30);
      doc.text(`Risultati: ${filteredBookings.length}`, 14, 36);
      
      // Tabella
      const tableData = filteredBookings.map(b => {
        const slot = slots.find(s => s.id === b.slot_id);
        const exp = experiences.find(e => e.id === slot?.experience_id);
        const resourceIds = slot?.resource_ids || [];
        const resourceNames = resourceIds.map(rid => {
          const res = resources.find(r => r.id === rid);
          return res?.name || '';
        }).filter(Boolean).join(', ');
        
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
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.save(`maretrek-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato con successo!');
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
        const resourceNames = resourceIds.map(rid => {
          const res = resources.find(r => r.id === rid);
          return res?.name || '';
        }).filter(Boolean).join(', ');
        
        return {
          'Codice': b.booking_ref,
          'Cliente': b.customer_name,
          'Email': b.customer_email,
          'Telefono': b.customer_phone || '-',
          'Data': slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-',
          'Esperienza': exp?.name || '-',
          'Risorsa': resourceNames || '-',
          'Posti Venduti': b.seats,
          'Stato Venduto': b.status,
          'Totale': `€ ${(b.total_amount || 0).toFixed(2)}`
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
      
      // Imposta larghezza colonne
      const wscols = [
        { wch: 12 }, // Codice
        { wch: 20 }, // Cliente
        { wch: 25 }, // Email
        { wch: 15 }, // Telefono
        { wch: 12 }, // Data
        { wch: 30 }, // Esperienza
        { wch: 25 }, // Risorsa
        { wch: 12 }, // Posti
        { wch: 12 }, // Stato
        { wch: 12 }  // Totale
      ];
      ws['!cols'] = wscols;
      
      XLSX.writeFile(wb, `maretrek-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato con successo!');
    } catch (error) {
      console.error('Errore export Excel:', error);
      toast.error('❌ Errore durante l\'esportazione Excel');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h1 className="text-3xl font-bold">Dashboard Admin</h1><p className="text-muted-foreground">Gestione completa del booking engine</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Aggiorna</Button>
          <Button onClick={seedData} disabled={seeding} variant="secondary">{seeding?<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>:<Download className="w-4 h-4 mr-2"/>}Dati Demo</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="experiences"><Compass className="w-4 h-4 mr-1.5" />{t('experiences')}</TabsTrigger>
          <TabsTrigger value="bookings"><CreditCard className="w-4 h-4 mr-1.5" />{t('bookings')}</TabsTrigger>
          <TabsTrigger value="gantt"><CalIcon className="w-4 h-4 mr-1.5" />{t('calendar')}</TabsTrigger>
          <TabsTrigger value="fleet"><Map className="w-4 h-4 mr-1.5" />{t('fleet_map')}</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1.5" />{t('reports')}</TabsTrigger>
          <TabsTrigger value="slots"><CalIcon className="w-4 h-4 mr-1.5" />{t('slots')}</TabsTrigger>
          <TabsTrigger value="resources"><Ship className="w-4 h-4 mr-1.5" />{t('resources')}</TabsTrigger>
          <TabsTrigger value="agencies"><Building2 className="w-4 h-4 mr-1.5" />{t('agencies')}</TabsTrigger>
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />{t('overview')}</TabsTrigger>
          <TabsTrigger value="gps-setup"><Navigation className="w-4 h-4 mr-1.5" />{t('gps_setup')}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{l:'Prenotazioni',v:stats.total_bookings||0,i:CreditCard,c:'text-blue-600 bg-blue-100'},{l:'Fatturato',v:fmtPrice(stats.total_revenue||0),i:BarChart3,c:'text-green-600 bg-green-100'},{l:'Esperienze',v:stats.total_experiences||0,i:Compass,c:'text-purple-600 bg-purple-100'},{l:'Risorse',v:stats.total_resources||0,i:Ship,c:'text-amber-600 bg-amber-100'}].map((s,i)=>(
              <Card key={i}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{s.l}</p><p className="text-2xl font-bold mt-1">{s.v}</p></div><div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.c}`}><s.i className="w-6 h-6"/></div></div></CardContent></Card>
            ))}
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Prenotazioni per Data Acquisto</CardTitle>
                <p className="text-sm text-muted-foreground">Ordinate dalla più recente</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="w-40"
                    value={overviewDateFilter}
                    onChange={(e) => setOverviewDateFilter(e.target.value)}
                    placeholder="Filtra per data"
                  />
                  {overviewDateFilter && (
                    <Button variant="ghost" size="sm" onClick={() => setOverviewDateFilter('')}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Totale Valore</p>
                  <p className="text-xl font-bold text-green-600">{fmtPrice(totalRevenue)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Data/Ora Acquisto</th><th className="pb-2 font-medium">Rif.</th><th className="pb-2 font-medium">Cliente</th><th className="pb-2 font-medium">Esperienza</th><th className="pb-2 font-medium">Posti</th><th className="pb-2 font-medium">Totale</th><th className="pb-2 font-medium">Stato</th></tr></thead><tbody>
                {sortedOverviewBookings.slice(0,15).map(b=>(<tr key={b.id} className="border-b last:border-0"><td className="py-2.5 text-xs">{b.created_at ? new Date(b.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="py-2.5 font-mono text-xs">{b.booking_ref}</td><td className="py-2.5">{b.customer_name}</td><td className="py-2.5">{b.experience_name||getExpName(b.experience_id)}</td><td className="py-2.5">{b.seats}</td><td className="py-2.5 font-medium">{fmtPrice(b.total_amount)}</td><td className="py-2.5"><StatusBadge status={b.status}/></td></tr>))}
              </tbody></table>{sortedOverviewBookings.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione{overviewDateFilter ? ' per questa data' : ''}. Carica i dati demo!</p>}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gantt Calendar */}
        <TabsContent value="gantt">
          <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary"/><p className="ml-3 text-muted-foreground">Caricamento calendario...</p></div>}>
            <GanttCalendar resources={resources} allSlots={slots} allBookings={bookings} experiences={experiences} onRefresh={load} />
          </Suspense>
        </TabsContent>

        {/* Experiences */}
        <TabsContent value="experiences" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Esperienze ({experiences.length})</h2><Button onClick={()=>{setFormData({type:'GITA_GOMMONE',languages:['IT'],is_active:true});setShowDialog('experience');}}><Plus className="w-4 h-4 mr-2"/>Nuova</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">B2C</th><th className="p-3 font-medium">B2B</th><th className="p-3 font-medium">Durata</th><th className="p-3 font-medium">Cap.</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {experiences.map(e=>(<tr key={e.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{e.name}</td><td className="p-3"><TypeBadge type={e.type}/></td><td className="p-3">{fmtPrice(e.price_b2c)}</td><td className="p-3">{fmtPrice(e.price_b2b)}</td><td className="p-3">{Math.floor(e.duration_minutes/60)}h</td><td className="p-3">{e.max_capacity}</td><td className="p-3">{e.is_active === false ? <Badge variant="outline" className="text-muted-foreground">Sospesa</Badge> : e.is_visible_on_home === false ? <Badge variant="secondary" className="bg-amber-100 text-amber-800">NO View</Badge> : <Badge className="bg-green-100 text-green-800">Attiva</Badge>}</td><td className="p-3"><div className="flex gap-1 flex-wrap"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData({...e,duration_hours:Math.floor(e.duration_minutes/60)});setShowDialog('edit_experience');}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button><Button variant="secondary" size="sm" className="h-7 text-xs" onClick={async ()=>{const {id,created_at,updated_at,...expData}=e;const duplicated=await api('experiences',{method:'POST',body:{...expData,name:`${e.name} (Copia)`,duration_hours:Math.floor(e.duration_minutes/60)}});if(duplicated.error){toast.error(duplicated.error);}else{toast.success('Esperienza duplicata!');await load();setFormData({...duplicated,duration_hours:Math.floor(duplicated.duration_minutes/60)});setShowDialog('edit_experience');}}}><Copy className="w-3 h-3 mr-1"/>Duplica</Button><Button variant={e.is_active !== false ? "ghost" : "outline"} size="sm" className="h-7 text-xs" onClick={async ()=>{await api(`experiences/${e.id}`,{method:'PUT',body:{is_active:!(e.is_active !== false)}});toast.success(e.is_active !== false ? 'Esperienza sospesa':'Esperienza attivata');await load();}}>{e.is_active !== false ? 'Sospendi' : 'Attiva'}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('experiences',e.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button></div></td></tr>))}
          </tbody></table></div>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Risorse ({resources.length})</h2><Button onClick={()=>{setFormData({type:'GUIDE'});setShowDialog('resource');}}><Plus className="w-4 h-4 mr-2"/>Nuova Risorsa</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map(r => {
              const rb = getResourceBookings(r.id);
              return (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${r.type==='GUIDE'?'bg-emerald-100 text-emerald-700':'bg-sky-100 text-sky-700'}`}>{r.type==='GUIDE'?<User className="w-6 h-6"/>:<Ship className="w-6 h-6"/>}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{r.name}</h3>
                            <p className="text-xs text-muted-foreground">{r.type==='GUIDE'?'Guida':(BOAT_TYPE_LABELS[r.boat_type]||'Imbarcazione')}{r.capacity?` - ${r.capacity} posti`:''}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={()=>{setEditRes(r);setEditResForm({name:r.name,type:r.type,boat_type:r.boat_type||'GOMMONE',capacity:r.capacity||0,bio:r.bio||'',email:r.email||'',phone:r.phone||'',languages:r.languages||[],is_available:r.is_available});}}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>deleteItem('resources',r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.bio}</p>
                        {r.languages?.length>0&&<div className="mt-2 flex gap-1">{r.languages.map(l=><Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{rb.length} prenotazioni</Badge>
                          {rb.length>0&&<Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={()=>setResBookings({resource:r,bookings:rb})}>Vedi lista</Button>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Slots */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Slot ({filteredSlots.length})</h2>
            <div className="flex items-center gap-3">
              {/* Filtro Esperienza */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Esperienza:</Label>
                <Select value={slotExpFilter} onValueChange={setSlotExpFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Tutte le esperienze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte le esperienze</SelectItem>
                    {experiences.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {slotExpFilter !== 'ALL' && (
                <Button variant="ghost" size="sm" onClick={() => setSlotExpFilter('ALL')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              
              <Button onClick={()=>{setFormData({status:'OPEN'});setShowDialog('slot');}}><Plus className="w-4 h-4 mr-2"/>Nuovo Slot</Button>
            </div>
          </div>
          
          {/* Slot Raggruppati con Paginazione */}
          <div className="space-y-2">
            {(() => {
              // Raggruppa slot per esperienza + data
              const grouped = {};
              filteredSlots.forEach(slot => {
                const date = slot.start_datetime.split('T')[0];
                const key = `${slot.experience_id}-${date}`;
                if (!grouped[key]) {
                  grouped[key] = {
                    experience_id: slot.experience_id,
                    date: date,
                    slots: []
                  };
                }
                grouped[key].slots.push(slot);
              });
              
              const groups = Object.values(grouped);
              const totalPages = Math.ceil(groups.length / SLOTS_PER_PAGE);
              const paginatedGroups = groups.slice(slotPage * SLOTS_PER_PAGE, (slotPage + 1) * SLOTS_PER_PAGE);
              
              return (<>
                {/* Controlli Paginazione Sopra */}
                {groups.length > SLOTS_PER_PAGE && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(0)}
                        disabled={slotPage === 0}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.max(0, p - 1))}
                        disabled={slotPage === 0}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Indietro
                      </Button>
                    </div>
                    
                    <span className="text-sm font-medium">
                      Pagina {slotPage + 1} di {totalPages} ({groups.length} gruppi totali)
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={slotPage >= totalPages - 1}
                      >
                        Avanti
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(totalPages - 1)}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              
                {/* Card Gruppi */}
                {paginatedGroups.map((group, idx) => {
                  const totalSeats = group.slots.reduce((sum, s) => sum + s.max_seats, 0);
                  const bookedSeats = group.slots.reduce((sum, s) => sum + s.booked_seats, 0);
                  const availSeats = totalSeats - bookedSeats;
                  const allOpen = group.slots.every(s => s.status === 'OPEN');
                  const expanded = expandedGroups[`${group.experience_id}-${group.date}`];
                  
                  return (
                    <Card key={idx} className="overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition flex items-center justify-between"
                        onClick={() => {
                          const key = `${group.experience_id}-${group.date}`;
                          setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                            <div>
                              <p className="font-semibold">{getExpName(group.experience_id)}</p>
                              <p className="text-sm text-muted-foreground capitalize">{fmtDate(group.slots[0].start_datetime)} • {group.slots.length} slot</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 ml-auto">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Posti</p>
                              <p className="font-semibold">{bookedSeats}/{totalSeats}</p>
                            </div>
                            
                            <div className="w-32">
                              <AvailabilityBar booked={bookedSeats} max={totalSeats} />
                              <p className="text-xs text-muted-foreground mt-1 text-center">{availSeats} disponibili</p>
                            </div>
                            
                            <StatusBadge status={allOpen ? 'OPEN' : 'CLOSED'} />
                            
                            {/* Pulsante Elimina Gruppo */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Eliminare tutti i ${group.slots.length} slot di "${getExpName(group.experience_id)}" per il ${fmtDate(group.slots[0].start_datetime)}?`)) {
                                  for (const slot of group.slots) {
                                    await api(`slots/${slot.id}`, { method: 'DELETE' });
                                  }
                                  toast.success(`${group.slots.length} slot eliminati!`);
                                  await load();
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Elimina Data
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dettagli Slot Espansi */}
                      {expanded && (
                        <div className="border-t bg-muted/20">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b bg-muted/50"><th className="p-2 text-left font-medium">Ora</th><th className="p-2 text-left font-medium">Posti</th><th className="p-2 text-left font-medium">Disp.</th><th className="p-2 text-left font-medium">Stato</th><th className="p-2 text-left font-medium">Azioni</th></tr></thead>
                            <tbody>
                              {group.slots.map(s => (
                                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                  <td className="p-2">{fmtTime(s.start_datetime)} - {fmtTime(s.end_datetime)}</td>
                                  <td className="p-2">{s.booked_seats}/{s.max_seats}</td>
                                  <td className="p-2 w-24"><AvailabilityBar booked={s.booked_seats} max={s.max_seats}/></td>
                                  <td className="p-2"><StatusBadge status={s.status}/></td>
                                  <td className="p-2">
                                    <div className="flex gap-1">
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e)=>{e.stopPropagation();const exp=experiences.find(e=>e.id===s.experience_id);setFormData({...s,experience_name:exp?.name,resource_names:resources.filter(r=>s.resource_ids?.includes(r.id)).map(r=>r.name).join(', ')});setShowDialog('view_slot');}}><Eye className="w-3 h-3 mr-1"/>Vedi</Button>
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e)=>{e.stopPropagation();setFormData({...s});setShowDialog('edit_slot');}}><Edit className="w-3 h-3"/>Mod</Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={(e)=>{e.stopPropagation();deleteItem('slots',s.id);}}><Trash2 className="w-3 h-3"/>Del</Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  );
                })}
                
                {/* Controlli Paginazione Sotto */}
                {groups.length > SLOTS_PER_PAGE && (
                  <div className="flex items-center justify-center p-3 bg-muted/30 rounded-lg mt-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(0)}
                        disabled={slotPage === 0}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.max(0, p - 1))}
                        disabled={slotPage === 0}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      
                      <span className="text-sm font-medium px-4">
                        Pagina {slotPage + 1} di {totalPages}
                      </span>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSlotPage(totalPages - 1)}
                        disabled={slotPage >= totalPages - 1}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>);
            })()}
          </div>
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">Prenotazioni ({filteredBookingsTab.length})</h2>
            
            {/* Filtri Avanzati */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <Label className="text-xs mb-1 block">Esperienza</Label>
                <Select value={bookingExpFilter} onValueChange={setBookingExpFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tutte le esperienze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte le esperienze</SelectItem>
                    {experiences.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Data Servizio</Label>
                <Input 
                  type="date" 
                  className="h-9"
                  value={bookingDateFilter} 
                  onChange={e => setBookingDateFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Cliente</Label>
                <Input 
                  placeholder="Nome cliente..."
                  className="h-9"
                  value={bookingCustomerFilter}
                  onChange={e => setBookingCustomerFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Label className="text-xs mb-1 block">Agenzia</Label>
                <Select value={bookingAgencyFilter} onValueChange={setBookingAgencyFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tutte (B2C + B2B)</SelectItem>
                    <SelectItem value="B2C">Solo B2C (Dirette)</SelectItem>
                    {agencies.map(ag => (
                      <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div>
                <Label className="text-xs mb-1 block">Codice Prenotazione</Label>
                <Input 
                  placeholder="Codice..."
                  className="h-9"
                  value={bookingCodeFilter}
                  onChange={e => setBookingCodeFilter(e.target.value)}
                />
              </div>
            </div>
            
            {/* Reset Filtri */}
            {(bookingExpFilter !== 'ALL' || bookingDateFilter || bookingCustomerFilter || bookingCodeFilter) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mb-3"
                onClick={() => {
                  setBookingExpFilter('ALL');
                  setBookingDateFilter('');
                  setBookingCustomerFilter('');
                  setBookingCodeFilter('');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Reimposta Filtri
              </Button>
            )}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Rif.</th><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Esperienza</th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Risorsa</th><th className="p-3 font-medium">Posti</th><th className="p-3 font-medium">Totale</th><th className="p-3 font-medium">Stato</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {filteredBookingsTab.map(b=>(<tr key={b.id} className="border-b hover:bg-muted/30"><td className="p-3 font-mono text-xs">{b.booking_ref}</td><td className="p-3">{b.customer_name}</td><td className="p-3 text-xs">{b.customer_email}</td><td className="p-3">{b.experience_name||getExpName(b.experience_id)}</td><td className="p-3 text-xs capitalize">{fmtDate(b.slot_datetime||b.created_at)}</td><td className="p-3 text-xs font-mono font-semibold">{getResourceName(b)}</td><td className="p-3">{b.seats}</td><td className="p-3 font-medium">{fmtPrice(b.total_amount)}</td><td className="p-3"><StatusBadge status={b.status}/></td>
              <td className="p-3"><div className="flex gap-1">
                <Button variant="secondary" size="sm" className="text-xs h-7" onClick={()=>setPreviewBk(b)}><Eye className="w-3 h-3 mr-1"/>Anteprima</Button>
                {(b.status==='CONFIRMED'&&!b.checked_in_at)&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>{setEditBk(b);setEditForm({customer_name:b.customer_name,customer_email:b.customer_email,customer_phone:b.customer_phone,special_requests:b.special_requests||'',seats:b.seats,seat_assignments:b.seat_assignments||[]});}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="outline" size="sm" className="text-xs h-7" onClick={()=>checkinBooking(b.id)}>Check-in</Button>}
                {b.status==='CONFIRMED'&&!b.checked_in_at&&<Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={()=>cancelBooking(b.id)}>Cancella</Button>}
                {b.checked_in_at&&<Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1"/>OK</Badge>}
              </div></td>
            </tr>))}
          </tbody></table>{filteredBookingsTab.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna prenotazione trovata.</p>}</div>
        </TabsContent>

        {/* Vouchers */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Voucher ({vouchers.length})</h2><Button onClick={()=>{setFormData({type:'PERCENTAGE',value:10,max_uses:100});setShowDialog('voucher');}}><Plus className="w-4 h-4 mr-2"/>Nuovo</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Codice</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valore</th><th className="p-3 font-medium">Utilizzi</th><th className="p-3 font-medium">Scadenza</th><th className="p-3 font-medium">Azioni</th></tr></thead><tbody>
            {vouchers.map(v=>(<tr key={v.id} className="border-b"><td className="p-3 font-mono font-bold">{v.code}</td><td className="p-3">{v.type==='PERCENTAGE'?'%':v.type==='FIXED'?'Fisso':'Regalo'}</td><td className="p-3 font-medium">{v.type==='PERCENTAGE'?`${v.value}%`:fmtPrice(v.value)}</td><td className="p-3">{v.uses_count}/{v.max_uses}</td><td className="p-3 text-xs">{v.valid_until?fmtDate(v.valid_until):'Illimitato'}</td><td className="p-3"><Button variant="ghost" size="icon" onClick={()=>deleteItem('vouchers',v.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></td></tr>))}
          </tbody></table></div>
        </TabsContent>

        {/* Waitlist */}
        {/* Report & Filtri Prenotazioni */}
        <TabsContent value="reports" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('reports')}</h2>
            <p className="text-muted-foreground">{t('advanced_filters')}</p>
          </div>

          {/* Filtri */}
          <Card>
            <CardHeader>
              <CardTitle>{t('search')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t('search_by_code')}</Label>
                  <Input 
                    placeholder="MRT12345"
                    value={filters.code}
                    onChange={(e) => setFilters({...filters, code: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_date')}</Label>
                  <Input 
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_name')}</Label>
                  <Input 
                    placeholder={t('name')}
                    value={filters.customer_name}
                    onChange={(e) => setFilters({...filters, customer_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('search_by_resource')}</Label>
                  <Select value={filters.resource_id || 'all'} onValueChange={(v) => setFilters({...filters, resource_id: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder={t('resources')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('search_by_experience')}</Label>
                  <Select value={filters.experience_id || 'all'} onValueChange={(v) => setFilters({...filters, experience_id: v === 'all' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder={t('experiences')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      {experiences.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clearFilters}>{t('clear_filters')}</Button>
                <Button onClick={applyFilters}><Search className="w-4 h-4 mr-2" />{t('apply_filters')}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Risultati */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('bookings')} - {t('total_results')}: {filteredBookings.length}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPDF}><Download className="w-4 h-4 mr-2" />{t('export_pdf')}</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />{t('export_excel')}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left bg-muted/50">
                      <th className="p-3">Codice</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">{t('date')}</th>
                      <th className="p-3">Esperienza</th>
                      <th className="p-3">Risorsa</th>
                      <th className="p-3">Posti Venduti</th>
                      <th className="p-3">Stato Venduto</th>
                      <th className="p-3">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const slot = slots.find(s => s.id === b.slot_id);
                      const exp = experiences.find(e => e.id === slot?.experience_id);
                      const resourceIds = slot?.resource_ids || [];
                      const resourceNames = resourceIds.map(rid => {
                        const res = resources.find(r => r.id === rid);
                        return res?.name || '';
                      }).filter(Boolean).join(', ');
                      
                      return (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{b.booking_ref}</td>
                          <td className="p-3">{b.customer_name}</td>
                          <td className="p-3 text-xs">{slot?.start_datetime ? new Date(slot.start_datetime).toLocaleDateString('it-IT') : '-'}</td>
                          <td className="p-3">{exp?.name || '-'}</td>
                          <td className="p-3">
                            {resourceNames ? (
                              <div className="flex items-center gap-2">
                                <Ship className="w-4 h-4 text-primary" />
                                <span className="text-xs">{resourceNames}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold">{b.seats}</td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                          <td className="p-3 font-semibold">{fmtPrice(b.total_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBookings.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">Nessun risultato trovato</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agencies */}
        <TabsContent value="agencies" className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Agenzie B2B ({agencies.length})</h2><Button onClick={()=>{setFormData({discount_percentage:15,payment_terms:'30_70',logo:''});setShowDialog('agency');}}><Plus className="w-4 h-4 mr-2"/>Nuova Agenzia</Button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left bg-muted/50"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">P.IVA</th><th className="p-3 font-medium">Telefono</th><th className="p-3 font-medium">Sconto</th><th className="p-3 font-medium">Azioni</th></tr></thead>
              <tbody>
                {agencies.map(a=>(
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {a.logo && <img src={a.logo} alt={a.name} className="w-8 h-8 rounded object-cover" />}
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">{a.email}</td>
                    <td className="p-3">{a.vat_number}</td>
                    <td className="p-3">{a.phone}</td>
                    <td className="p-3"><Badge className="bg-green-100 text-green-800">{a.discount_percentage}%</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData(a);setShowDialog('view_agency');}}><Eye className="w-3 h-3 mr-1"/>Visualizza</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setFormData({...a});setShowDialog('edit_agency');}}><Edit className="w-3 h-3 mr-1"/>Modifica</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={()=>deleteItem('agencies',a.id)}><Trash2 className="w-3 h-3"/>Elimina</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agencies.length===0&&<p className="text-center py-8 text-muted-foreground">Nessuna agenzia. Crea la prima!</p>}
          </div>
        </TabsContent>

        {/* Mappa Flotta GPS */}
        <TabsContent value="fleet">
          <MappaFlottaWrapper />
        </TabsContent>

        {/* Setup GPS */}
        <TabsContent value="gps-setup">
          <SetupGPS />
        </TabsContent>
      </Tabs>

      {/* Create Dialogs */}
      <Dialog open={showDialog==='experience'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GITA_GOMMONE">Gita in Gommone</SelectItem><SelectItem value="GITA_BARCA">Gita in Barca</SelectItem><SelectItem value="VISITA_GUIDATA">Visita Guidata</SelectItem><SelectItem value="NOLEGGIO_NATANTE">Noleggio Natante</SelectItem></SelectContent></Select></div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata (min)</Label><Input type="number" value={formData.duration_minutes||''} onChange={e=>setFormData({...formData,duration_minutes:e.target.value})}/></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            <div>
              <Label>Risorse Assegnate</Label>
              <div className="space-y-2 mt-2">
                {resources.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`res-${r.id}`}
                      checked={(formData.resource_ids||[]).includes(r.id)}
                      onChange={e => {
                        const current = formData.resource_ids || [];
                        const updated = e.target.checked 
                          ? [...current, r.id]
                          : current.filter(id => id !== r.id);
                        setFormData({...formData, resource_ids: updated});
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`res-${r.id}`} className="text-sm flex items-center gap-2">
                      <Badge variant="outline">{r.type === 'GUIDE' ? 'Guida' : 'Barca'}</Badge>
                      {r.name} {r.capacity && `(${r.capacity} posti)`}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Seleziona le risorse da utilizzare per questa esperienza</p>
            </div>
            <Separator />
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Separator />
            <PDFUploader pdfUrl={formData.terms_pdf_url||''} onChange={url=>setFormData({...formData,terms_pdf_url:url})} />
            <Separator />
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Visibile su Home page</Label>
                <p className="text-xs text-muted-foreground">Mostra questa esperienza nel catalogo pubblico B2C</p>
              </div>
              <Switch 
                checked={formData.is_visible_on_home !== false} 
                onCheckedChange={v => setFormData({...formData, is_visible_on_home: v})}
              />
            </div>
            <Button className="w-full" onClick={()=>createItem('experiences',formData)}>Crea Esperienza</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Experience Dialog */}
      <Dialog open={showDialog==='edit_experience'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Modifica Esperienza</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GITA_GOMMONE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GITA_GOMMONE">Gita in Gommone</SelectItem><SelectItem value="GITA_BARCA">Gita in Barca</SelectItem><SelectItem value="VISITA_GUIDATA">Visita Guidata</SelectItem><SelectItem value="NOLEGGIO_NATANTE">Noleggio Natante</SelectItem></SelectContent></Select></div>
            <div><Label>Descrizione</Label><Textarea value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Durata (ore)</Label><Input type="number" value={formData.duration_hours||''} onChange={e=>setFormData({...formData,duration_hours:e.target.value,duration_minutes:e.target.value*60})}/></div><div><Label>Capacita Max</Label><Input type="number" value={formData.max_capacity||''} onChange={e=>setFormData({...formData,max_capacity:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Prezzo B2C</Label><Input type="number" value={formData.price_b2c||''} onChange={e=>setFormData({...formData,price_b2c:e.target.value})}/></div><div><Label>Prezzo B2B</Label><Input type="number" value={formData.price_b2b||''} onChange={e=>setFormData({...formData,price_b2b:e.target.value})}/></div></div>
            <div><Label>Punto d'Incontro</Label><Input value={formData.meeting_point||''} onChange={e=>setFormData({...formData,meeting_point:e.target.value})}/></div>
            
            <Separator className="my-6" />
            
            {/* Listini Prezzi Stagionali */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Listini Prezzi Stagionali (4 Fasce)</h3>
              </div>
              <p className="text-sm text-muted-foreground">Configura fino a 4 fasce di prezzo in base al periodo. I prezzi base sopra verranno usati se nessuna fascia copre la data.</p>
              
              {[0, 1, 2, 3].map(tierIndex => {
                const tier = (formData.price_tiers || [])[tierIndex] || {};
                const updateTier = (field, value) => {
                  const tiers = [...(formData.price_tiers || [{}, {}, {}, {}])];
                  tiers[tierIndex] = { ...tiers[tierIndex], [field]: value };
                  setFormData({ ...formData, price_tiers: tiers });
                };
                
                return (
                  <Card key={tierIndex} className="p-4 bg-muted/30">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${tierIndex === 0 ? 'bg-red-500' : tierIndex === 1 ? 'bg-yellow-500' : tierIndex === 2 ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <Label className="font-semibold">Fascia {tierIndex + 1}</Label>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Nome Fascia</Label>
                        <Input 
                          placeholder={tierIndex === 0 ? "es: Alta Stagione" : tierIndex === 1 ? "es: Media Stagione" : tierIndex === 2 ? "es: Bassa Stagione" : "es: Fuori Stagione"}
                          value={tier.tier_name || ''} 
                          onChange={e => updateTier('tier_name', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Data Inizio (dal)</Label>
                          <Input 
                            type="date" 
                            value={tier.start_date || ''} 
                            onChange={e => updateTier('start_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Fine (al)</Label>
                          <Input 
                            type="date" 
                            value={tier.end_date || ''} 
                            onChange={e => updateTier('end_date', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Prezzo B2C (€)</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={tier.price_b2c || ''} 
                            onChange={e => updateTier('price_b2c', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prezzo B2B (€)</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={tier.price_b2b || ''} 
                            onChange={e => updateTier('price_b2b', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            <Separator />
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Separator />
            <PDFUploader pdfUrl={formData.terms_pdf_url||''} onChange={url=>setFormData({...formData,terms_pdf_url:url})} />
            <Separator />
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Visibile su Home page</Label>
                <p className="text-xs text-muted-foreground">Mostra questa esperienza nel catalogo pubblico B2C</p>
              </div>
              <Switch 
                checked={formData.is_visible_on_home !== false} 
                onCheckedChange={v => setFormData({...formData, is_visible_on_home: v})}
              />
            </div>
            <Button className="w-full" onClick={async ()=>{const {id,duration_hours,...data}=formData;await api(`experiences/${id}`,{method:'PUT',body:data});toast.success('Esperienza aggiornata!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='resource'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Risorsa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'GUIDE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GUIDE">Guida</SelectItem><SelectItem value="BOAT">Imbarcazione</SelectItem></SelectContent></Select></div>
            {formData.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={formData.boat_type||'GOMMONE'} onValueChange={v=>setFormData({...formData,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti)</Label><Input type="number" value={formData.capacity||''} onChange={e=>setFormData({...formData,capacity:e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={formData.marca||''} onChange={e=>setFormData({...formData,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={formData.potenza_motore||''} onChange={e=>setFormData({...formData,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={formData.consumo_orario_litri||''} onChange={e=>setFormData({...formData,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={formData.ore_inizio_stagione||''} onChange={e=>setFormData({...formData,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={formData.gps_imei||''} onChange={e=>setFormData({...formData,gps_imei:e.target.value})} placeholder="359633109558000"/></div></>}
            <div><Label>Descrizione</Label><Textarea value={formData.bio||''} onChange={e=>setFormData({...formData,bio:e.target.value})}/></div>
            <div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div>
            <div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div>
            <ImageUploader images={formData.images||[]} onChange={imgs=>setFormData({...formData,images:imgs})} maxImages={3} />
            <Button className="w-full" onClick={()=>createItem('resources',formData)}>Crea Risorsa</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Slot Giornalieri con Tariffe Stagionali</DialogTitle>
            <p className="text-sm text-muted-foreground">Il sistema creerà uno slot per ogni giorno nel periodo selezionato, applicando automaticamente la tariffa della fascia stagionale corretta.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Esperienza</Label>
              <Select value={formData.experience_id||''} onValueChange={v=>{
                const exp = experiences.find(e => e.id === v);
                setFormData({...formData, experience_id: v, selectedExperience: exp});
              }}>
                <SelectTrigger><SelectValue placeholder="Seleziona..."/></SelectTrigger>
                <SelectContent>
                  {experiences.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Risorsa (Barca/Guida)</Label>
              <Select value={(formData.resource_ids||[])[0]||'none'} onValueChange={v=>{
                if(v==='none'){
                  setFormData({...formData,resource_ids:[],max_seats:12})
                }else{
                  const res=resources.find(r=>r.id===v);
                  setFormData({...formData,resource_ids:[v],max_seats:res?.capacity||12})
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Seleziona risorsa..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna risorsa</SelectItem>
                  {resources.map(r=><SelectItem key={r.id} value={r.id}>
                    {r.name} - {r.capacity} posti ({r.type==='GUIDE'?'Guida':BOAT_TYPE_LABELS[r.boat_type]||'Barca'})
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <Label className="text-base font-semibold">Periodo e Orari</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data Inizio Periodo</Label>
                  <Input type="date" value={formData.period_start||''} onChange={e=>setFormData({...formData,period_start:e.target.value})}/>
                </div>
                <div>
                  <Label className="text-xs">Data Fine Periodo</Label>
                  <Input type="date" value={formData.period_end||''} onChange={e=>setFormData({...formData,period_end:e.target.value})}/>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ora Inizio</Label>
                  <Input type="time" value={formData.time_start||'09:00'} onChange={e=>setFormData({...formData,time_start:e.target.value})}/>
                </div>
                <div>
                  <Label className="text-xs">Ora Fine</Label>
                  <Input type="time" value={formData.time_end||'13:00'} onChange={e=>setFormData({...formData,time_end:e.target.value})}/>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Posti Massimi per Slot</Label>
              <Input type="number" value={formData.max_seats||12} onChange={e=>setFormData({...formData,max_seats:parseInt(e.target.value)||12})}/>
            </div>
            
            {/* Anteprima Fasce Stagionali */}
            {formData.selectedExperience?.price_tiers && formData.selectedExperience.price_tiers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <Label className="text-xs font-semibold text-blue-900 mb-2 block">📊 Fasce Stagionali Configurate</Label>
                <div className="space-y-1 text-xs">
                  {formData.selectedExperience.price_tiers.map((tier, idx) => tier.tier_name && (
                    <div key={idx} className="flex justify-between">
                      <span className="font-medium">{tier.tier_name}:</span>
                      <span>{tier.start_date} → {tier.end_date} (€{tier.price_b2c})</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-2">Il sistema applicherà automaticamente la tariffa corretta per ogni giorno.</p>
              </div>
            )}
            
            <Button className="w-full" onClick={async ()=>{
              // Genera slot giornalieri con tariffe stagionali
              if (!formData.experience_id || !formData.period_start || !formData.period_end) {
                toast.error('Compila tutti i campi obbligatori');
                return;
              }
              
              const startDate = new Date(formData.period_start);
              const endDate = new Date(formData.period_end);
              const timeStart = formData.time_start || '09:00';
              const timeEnd = formData.time_end || '13:00';
              const experience = formData.selectedExperience;
              
              let created = 0;
              let currentDate = new Date(startDate);
              
              while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const startDatetime = `${dateStr}T${timeStart}:00Z`;
                const endDatetime = `${dateStr}T${timeEnd}:00Z`;
                
                // Calcola fascia di prezzo per questa data
                let priceOverride = null;
                if (experience?.price_tiers) {
                  const tier = getPriceTierForDate(experience, dateStr);
                  if (tier && tier.price_b2c) {
                    priceOverride = tier.price_b2c;
                  }
                }
                
                // Crea lo slot
                const slotData = {
                  experience_id: formData.experience_id,
                  resource_ids: formData.resource_ids || [],
                  start_datetime: startDatetime,
                  end_datetime: endDatetime,
                  max_seats: formData.max_seats || 12,
                  status: 'OPEN'
                };
                
                // Aggiungi price_override solo se diverso dal prezzo base
                if (priceOverride && priceOverride !== experience.price_b2c) {
                  slotData.price_override = priceOverride;
                }
                
                await api('slots', { method: 'POST', body: slotData });
                created++;
                
                // Prossimo giorno
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              toast.success(`${created} slot creati con tariffe stagionali applicate!`);
              setShowDialog(null);
              setFormData({});
              await load();
            }}>
              <CalIcon className="w-4 h-4 mr-2" />
              Crea Slot Giornalieri Automatici
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='voucher'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Nuovo Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Codice</Label><Input value={formData.code||''} onChange={e=>setFormData({...formData,code:e.target.value.toUpperCase()})} className="font-mono"/></div>
            <div><Label>Tipo</Label><Select value={formData.type||'PERCENTAGE'} onValueChange={v=>setFormData({...formData,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="PERCENTAGE">Percentuale</SelectItem><SelectItem value="FIXED">Fisso (EUR)</SelectItem><SelectItem value="GIFT">Regalo</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Valore</Label><Input type="number" value={formData.value||''} onChange={e=>setFormData({...formData,value:e.target.value})}/></div><div><Label>Utilizzi Max</Label><Input type="number" value={formData.max_uses||''} onChange={e=>setFormData({...formData,max_uses:e.target.value})}/></div></div>
            <Button className="w-full" onClick={()=>createItem('vouchers',formData)}>Crea Voucher</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog==='agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuova Agenzia B2B</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Agenzia</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div><div><Label>Password</Label><Input value={formData.password||'agency2025'} onChange={e=>setFormData({...formData,password:e.target.value})}/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div><div><Label>P.IVA</Label><Input value={formData.vat_number||''} onChange={e=>setFormData({...formData,vat_number:e.target.value})}/></div></div>
            <div><Label>Indirizzo</Label><Input value={formData.address||''} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
            <div><Label>Sconto %</Label><Input type="number" value={formData.discount_percentage||''} onChange={e=>setFormData({...formData,discount_percentage:e.target.value})}/></div>
            <Separator />
            <ImageUploader images={formData.logo ? [formData.logo] : []} onChange={imgs=>setFormData({...formData,logo:imgs[0]||''})} maxImages={1} />
            <Button className="w-full" onClick={()=>createItem('agencies',formData)}>Crea Agenzia</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Agency Dialog */}
      <Dialog open={showDialog==='view_agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dettagli Agenzia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {formData.logo && (
              <div className="flex justify-center">
                <img src={formData.logo} alt={formData.name} className="h-20 w-auto object-contain rounded border" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Nome Agenzia</Label><p className="font-semibold text-lg">{formData.name}</p></div>
              <div><Label className="text-muted-foreground">Sconto</Label><Badge className="bg-green-100 text-green-800 text-lg">{formData.discount_percentage}%</Badge></div>
              <div><Label className="text-muted-foreground">Email</Label><p>{formData.email}</p></div>
              <div><Label className="text-muted-foreground">Telefono</Label><p>{formData.phone}</p></div>
              <div><Label className="text-muted-foreground">P.IVA</Label><p>{formData.vat_number}</p></div>
              <div><Label className="text-muted-foreground">Termini Pagamento</Label><p>{formData.payment_terms}</p></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Indirizzo</Label><p>{formData.address}</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Agency Dialog */}
      <Dialog open={showDialog==='edit_agency'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Modifica Agenzia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Agenzia</Label><Input value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div><div><Label>Password</Label><Input value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})} placeholder="Lascia vuoto per non modificare"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Telefono</Label><Input value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div><div><Label>P.IVA</Label><Input value={formData.vat_number||''} onChange={e=>setFormData({...formData,vat_number:e.target.value})}/></div></div>
            <div><Label>Indirizzo</Label><Input value={formData.address||''} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
            <div><Label>Sconto %</Label><Input type="number" value={formData.discount_percentage||''} onChange={e=>setFormData({...formData,discount_percentage:e.target.value})}/></div>
            <Separator />
            <ImageUploader images={formData.logo ? [formData.logo] : []} onChange={imgs=>setFormData({...formData,logo:imgs[0]||''})} maxImages={1} />
            <Button className="w-full" onClick={async ()=>{const {id,...data}=formData;if(!data.password)delete data.password;await api(`agencies/${id}`,{method:'PUT',body:data});toast.success('Agenzia aggiornata!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Slot Dialog */}
      <Dialog open={showDialog==='view_slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dettagli Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Esperienza</Label><p className="font-semibold text-lg">{formData.experience_name}</p></div>
              <div><Label className="text-muted-foreground">Stato</Label><StatusBadge status={formData.status}/></div>
              <div><Label className="text-muted-foreground">Data</Label><p className="capitalize">{fmtDate(formData.start_datetime)}</p></div>
              <div><Label className="text-muted-foreground">Orario</Label><p>{fmtTime(formData.start_datetime)} - {fmtTime(formData.end_datetime)}</p></div>
              <div><Label className="text-muted-foreground">Posti Totali</Label><p>{formData.max_seats}</p></div>
              <div><Label className="text-muted-foreground">Posti Prenotati</Label><p className="font-bold text-primary">{formData.booked_seats}</p></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Disponibilità</Label><AvailabilityBar booked={formData.booked_seats||0} max={formData.max_seats||0}/></div>
              <div className="col-span-2"><Label className="text-muted-foreground">Risorse Abbinate</Label><p>{formData.resource_names || 'Nessuna risorsa'}</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={showDialog==='edit_slot'} onOpenChange={v=>!v&&setShowDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Modifica Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Data Inizio</Label><Input type="datetime-local" value={formData.start_datetime?.slice(0,16)||''} onChange={e=>setFormData({...formData,start_datetime:e.target.value})}/></div>
            <div><Label>Data Fine</Label><Input type="datetime-local" value={formData.end_datetime?.slice(0,16)||''} onChange={e=>setFormData({...formData,end_datetime:e.target.value})}/></div>
            <div><Label>Posti Massimi</Label><Input type="number" value={formData.max_seats||''} onChange={e=>setFormData({...formData,max_seats:e.target.value})}/></div>
            <div><Label>Stato</Label><Select value={formData.status||'OPEN'} onValueChange={v=>setFormData({...formData,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="OPEN">Aperto</SelectItem><SelectItem value="CLOSED">Chiuso</SelectItem><SelectItem value="FULL">Completo</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={async ()=>{const {id,experience_name,resource_names,...data}=formData;await api(`slots/${id}`,{method:'PUT',body:data});toast.success('Slot aggiornato!');setShowDialog(null);setFormData({});await load();}}>Salva Modifiche</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={!!editRes} onOpenChange={() => setEditRes(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Risorsa: {editRes?.name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="bookings">Prenotazioni ({editRes ? getResourceBookings(editRes.id).length : 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4 mt-4">
              <div><Label>Nome</Label><Input value={editResForm.name||''} onChange={e=>setEditResForm({...editResForm,name:e.target.value})}/></div>
              <div><Label>Tipo</Label><Select value={editResForm.type||'GUIDE'} onValueChange={v=>setEditResForm({...editResForm,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GUIDE">Guida</SelectItem><SelectItem value="BOAT">Imbarcazione</SelectItem></SelectContent></Select></div>
              {editResForm.type==='BOAT'&&<><div><Label>Tipo Imbarcazione</Label><Select value={editResForm.boat_type||'GOMMONE'} onValueChange={v=>setEditResForm({...editResForm,boat_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GOMMONE">Gommone</SelectItem><SelectItem value="NATANTE">Natante</SelectItem><SelectItem value="IMBARCAZIONE">Imbarcazione</SelectItem><SelectItem value="GOMMONE_SKIPPER">Gommone con Skipper</SelectItem><SelectItem value="BARCA_SKIPPER">Barca con Skipper</SelectItem><SelectItem value="BARCA_VELA_SKIPPER">Barca a Vela con Skipper</SelectItem><SelectItem value="BARCA">Barca</SelectItem></SelectContent></Select></div><div><Label>Capacita (posti vendibili)</Label><Input type="number" value={editResForm.capacity||''} onChange={e=>setEditResForm({...editResForm,capacity:parseInt(e.target.value)||0})}/></div><div className="grid grid-cols-2 gap-3"><div><Label>Marca Motore</Label><Input value={editResForm.marca||''} onChange={e=>setEditResForm({...editResForm,marca:e.target.value})} placeholder="es: Yamaha, Mercury"/></div><div><Label>Potenza (HP)</Label><Input type="number" value={editResForm.potenza_motore||''} onChange={e=>setEditResForm({...editResForm,potenza_motore:e.target.value})} placeholder="es: 150"/></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Consumo Orario (L/h)</Label><Input type="number" step="0.1" value={editResForm.consumo_orario_litri||''} onChange={e=>setEditResForm({...editResForm,consumo_orario_litri:e.target.value})} placeholder="es: 25.5"/></div><div><Label>Ore Motore Inizio Stagione</Label><Input type="number" value={editResForm.ore_inizio_stagione||''} onChange={e=>setEditResForm({...editResForm,ore_inizio_stagione:e.target.value})} placeholder="es: 1250"/></div></div><div><Label>GPS IMEI (Balin.app)</Label><Input value={editResForm.gps_imei||''} onChange={e=>setEditResForm({...editResForm,gps_imei:e.target.value})} placeholder="359633109558000"/><p className="text-xs text-muted-foreground mt-1">Codice IMEI del dispositivo GPS per tracking real-time</p></div></>}
              <div><Label>Descrizione</Label><Textarea value={editResForm.bio||''} onChange={e=>setEditResForm({...editResForm,bio:e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input value={editResForm.email||''} onChange={e=>setEditResForm({...editResForm,email:e.target.value})}/></div><div><Label>Telefono</Label><Input value={editResForm.phone||''} onChange={e=>setEditResForm({...editResForm,phone:e.target.value})}/></div></div>
              <Button className="w-full" onClick={saveResource}>Salva Modifiche</Button>
            </TabsContent>
            <TabsContent value="bookings" className="mt-4">
              {editRes && editRes.type === 'BOAT' ? (
                <ResourceBookingsList resource={editRes} bookings={getResourceBookings(editRes.id)} onUpdate={load} />
              ) : (
                <div className="space-y-2">
                  {editRes && getResourceBookings(editRes.id).map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{b.customer_name} <span className="text-muted-foreground font-normal">({b.booking_ref})</span></p>
                        <p className="text-xs text-muted-foreground">{b.experience_name||getExpName(b.experience_id)} | {fmtDate(b.slot_datetime||b.created_at)} | {b.seats} posti</p>
                      </div>
                      <StatusBadge status={b.status}/>
                    </div>
                  ))}
                  {editRes && getResourceBookings(editRes.id).length === 0 && <p className="text-center py-8 text-muted-foreground">Nessuna prenotazione.</p>}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Resource Bookings Dialog */}
      <Dialog open={!!resBookings} onOpenChange={() => setResBookings(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {resBookings && (
            <>
              <DialogHeader><DialogTitle>Prenotazioni - {resBookings.resource.name}</DialogTitle><p className="text-sm text-muted-foreground">{resBookings.bookings.length} prenotazioni attive</p></DialogHeader>
              <div className="space-y-2">
                {resBookings.bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div><p className="font-medium text-sm">{b.customer_name} <span className="text-muted-foreground font-normal">({b.booking_ref})</span></p><p className="text-xs text-muted-foreground">{b.experience_name||getExpName(b.experience_id)} | {fmtDate(b.slot_datetime||b.created_at)} | {b.seats} posti | {fmtPrice(b.total_amount)}</p></div>
                    <div className="flex gap-1 items-center"><StatusBadge status={b.status}/>{b.status==='CONFIRMED'&&<Button variant="ghost" size="sm" className="text-xs text-red-500 h-7" onClick={()=>cancelBooking(b.id)}>Cancella</Button>}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editBk} onOpenChange={() => setEditBk(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editForm.customer_email || ''} onChange={e => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
            <div><Label>Telefono</Label><Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
            <div><Label>Richieste speciali</Label><Textarea value={editForm.special_requests || ''} onChange={e => setEditForm({ ...editForm, special_requests: e.target.value })} /></div>
            
            {editBk && editBk.seats > 0 && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Assegnazione Posti ({editBk.seats} {editBk.seats === 1 ? 'posto' : 'posti'})
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: editBk.seats }).map((_, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Posto ${idx + 1}`}
                      value={(editForm.seat_assignments || [])[idx] || ''}
                      onChange={e => {
                        const newAssignments = [...(editForm.seat_assignments || [])];
                        newAssignments[idx] = e.target.value;
                        setEditForm({ ...editForm, seat_assignments: newAssignments });
                      }}
                      className="h-8 text-sm"
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveBookingEdit}>Salva Modifiche</Button>
              <Button variant="destructive" onClick={async () => { await api(`bookings/${editBk.id}`, { method: 'PUT', body: { action: 'cancel' } }); toast.success('Cancellata'); setEditBk(null); await load(); }}>Cancella</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Anteprima Prenotazione */}
      <Dialog open={!!previewBk} onOpenChange={() => setPreviewBk(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Anteprima Prenotazione {previewBk?.booking_ref}
            </DialogTitle>
          </DialogHeader>
          
          {previewBk && (
            <div className="space-y-4">
              {/* Stato e Info Principali */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Stato Prenotazione</p>
                  <div className="mt-1"><StatusBadge status={previewBk.status} /></div>
                </div>
                {previewBk.checked_in_at && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="text-sm font-medium text-green-600">{fmtDate(previewBk.checked_in_at)}</p>
                  </div>
                )}
              </div>
              
              {/* Esperienza e Risorsa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Esperienza</p>
                  <p className="font-semibold">{previewBk.experience_name || getExpName(previewBk.experience_id)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{fmtDate(previewBk.slot_datetime || previewBk.created_at)}</p>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <p className="text-xs text-muted-foreground mb-1">Risorsa Assegnata</p>
                  <p className="font-semibold text-blue-900">{getResourceName(previewBk) || 'Non assegnata'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{previewBk.seats} {previewBk.seats === 1 ? 'posto' : 'posti'}</p>
                </div>
              </div>
              
              {/* Dati Cliente */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dati Cliente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{previewBk.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{previewBk.customer_email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <p className="font-medium">{previewBk.customer_phone || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Lista Partecipanti */}
              {previewBk.seat_assignments && previewBk.seat_assignments.length > 0 && previewBk.seat_assignments.some(s => s) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Lista Completa Partecipanti ({previewBk.seat_assignments.filter(s => s).length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {previewBk.seat_assignments.map((name, idx) => 
                      name && (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              
              {/* Prezzo Pagato */}
              <div className="border-t pt-4">


// ============ SUPER ADMIN DASHBOARD ============

export default AdminDashboard;
