'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, LogIn, BarChart3, CreditCard, TrendingUp, DollarSign, Calendar, Users, Eye, EyeOff, Ship, Compass, Plus, FileText, Mail, CheckCircle2, ExternalLink, Search, FileSpreadsheet, Filter, X } from 'lucide-react';
const AgencyCalendarLazy = dynamic(() => import('@/app/components/AgencyCalendar'), { ssr: false });
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const NewBookingDialog = dynamic(() => import('@/app/components/NewBookingDialog'), { ssr: false });

const API_BASE = '/api';

export default function AgencyB2BPortal() {
  const params = useParams();
  const slug = params?.slug;
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [showNewBookingDialog, setShowNewBookingDialog] = useState(false);

  // Filtri Report (clonati dalla company)
  const [filters, setFilters] = useState({
    code: '', customer_name: '', experience_id: '',
    payment_method: '', status: '', date_from: '', date_to: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  // Loading dei singoli bottoni (voucher/email/confirm)
  const [actionLoading, setActionLoading] = useState({});

  // Carica dati società
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`${API_BASE}/companies?slug=${slug}`);
        const data = await res.json();
        if (data && data.id) {
          setCompany(data);
        } else {
          toast.error('Società non trovata');
        }
      } catch (err) {
        console.error('Error fetching company:', err);
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchCompany();
  }, [slug]);

  // Carica dati agenzia dopo login
  useEffect(() => {
    if (agency && company) {
      loadAgencyData();
    }
  }, [agency, company]);

  const loadAgencyData = async () => {
    try {
      // Carica esperienze della società
      const [exps, bks] = await Promise.all([
        fetch(`${API_BASE}/experiences?company_id=${company.id}`).then(r => r.json()),
        fetch(`${API_BASE}/bookings?agency_id=${agency.id}`).then(r => r.json())
      ]);
      
      setExperiences(Array.isArray(exps) ? exps : []);
      setBookings(Array.isArray(bks) ? bks : []);
      
      // Calcola statistiche
      const confirmedBookings = (Array.isArray(bks) ? bks : []).filter(b => b.status === 'CONFIRMED');
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.price_b2b || 0), 0);
      const totalCommission = confirmedBookings.reduce((sum, b) => sum + ((b.price_b2c || 0) - (b.price_b2b || 0)), 0);
      
      setStats({
        total_bookings: confirmedBookings.length,
        total_revenue: totalRevenue,
        total_commission: totalCommission
      });
    } catch (err) {
      console.error('Error loading agency data:', err);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast.error('Inserisci email e password');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/agencies/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      // Verifica che l'agenzia appartenga alla società corretta
      if (data.agency.company_id !== company.id) {
        toast.error('Questa agenzia non appartiene a questa società');
        return;
      }
      
      setAgency(data.agency);
      toast.success(`Benvenuto ${data.agency.name}!`);
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Errore durante il login');
    }
  };

  const handleLogout = () => {
    setAgency(null);
    setLoginForm({ email: '', password: '' });
    toast.success('Disconnesso');
  };

  const fmtPrice = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
  const fmtDate = (d) => {
    if (!d) return 'N/A';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: it }); } 
    catch { return 'N/A'; }
  };

  const getExpName = (expId) => {
    const exp = experiences.find(e => e.id === expId);
    return exp ? exp.name : 'N/A';
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PENDING_VERIFICATION: 'bg-orange-100 text-orange-800',
      HELD: 'bg-amber-100 text-amber-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      PENDING: 'In Attesa',
      PENDING_VERIFICATION: 'Verifica Bonifico',
      HELD: 'Sospesa',
      CONFIRMED: 'Confermata',
      CANCELLED: 'Cancellata',
      COMPLETED: 'Completata'
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{labels[status] || status}</Badge>;
  };

  // Label metodo pagamento
  const PM_LABEL = {
    ONLINE: 'SumUp/Online', CARD: 'SumUp/Online', SUMUP: 'SumUp/Online', STRIPE: 'Stripe',
    BANK_TRANSFER: 'Bonifico', CASH: 'Contanti', DIRECT: 'Cassa Diretta',
    MANUAL: 'Manuale', AGENCY: 'Agenzia', FREE: 'Omaggio', NONE: '—',
  };
  const PM_COLOR = (m) => ({
    ONLINE: 'bg-violet-100 text-violet-800', CARD: 'bg-violet-100 text-violet-800', SUMUP: 'bg-violet-100 text-violet-800',
    STRIPE: 'bg-indigo-100 text-indigo-800',
    BANK_TRANSFER: 'bg-blue-100 text-blue-800',
    CASH: 'bg-emerald-100 text-emerald-800', DIRECT: 'bg-emerald-100 text-emerald-800',
    MANUAL: 'bg-orange-100 text-orange-800', AGENCY: 'bg-amber-100 text-amber-800', FREE: 'bg-pink-100 text-pink-800',
  }[m] || 'bg-gray-100 text-gray-700');

  // Filtri applicati
  const filteredBookings = (bookings || []).filter(b => {
    if (filters.code && !(b.booking_ref || '').toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.customer_name && !(b.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase())) return false;
    if (filters.experience_id && b.experience_id !== filters.experience_id) return false;
    if (filters.payment_method && (b.payment_method || 'NONE') !== filters.payment_method) return false;
    if (filters.status && b.status !== filters.status) return false;
    if (filters.date_from && (b.slot_datetime || '').split('T')[0] < filters.date_from) return false;
    if (filters.date_to && (b.slot_datetime || '').split('T')[0] > filters.date_to) return false;
    return true;
  });

  // Totali dinamici basati sui filtri
  const totals = {
    count: filteredBookings.length,
    seats: filteredBookings.reduce((s, b) => s + (Number(b.seats) || 0), 0),
    revenue: filteredBookings.reduce((s, b) => s + (Number(b.total_amount || b.price_b2b) || 0), 0),
    commission: filteredBookings.reduce((s, b) => s + ((Number(b.price_b2c) || 0) - (Number(b.price_b2b) || 0)), 0),
  };

  // ============ AZIONI BOOKING ============
  const setLoadingFor = (id, key, val) => {
    setActionLoading(prev => ({ ...prev, [`${id}_${key}`]: val }));
  };

  const downloadVoucher = async (booking) => {
    setLoadingFor(booking.id, 'voucher', true);
    try {
      const { downloadVoucherPdf } = await import('@/app/lib/voucherPdf');
      const exp = experiences.find(e => e.id === booking.experience_id) || null;
      const isPaid = booking.status === 'CONFIRMED' || booking.payment_status === 'PAID';
      await downloadVoucherPdf(booking, exp, company, { type: isPaid ? 'FINAL' : 'PROVISIONAL' });
      toast.success('Voucher scaricato');
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione voucher');
    } finally {
      setLoadingFor(booking.id, 'voucher', false);
    }
  };

  const sendVoucherEmail = async (booking) => {
    setLoadingFor(booking.id, 'email', true);
    try {
      const r = await fetch(`${API_BASE}/send-booking-voucher`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      if (!r.ok) {
        const t = await r.text();
        let msg = 'Errore invio'; try { msg = (JSON.parse(t)?.error || msg); } catch { /* */ }
        throw new Error(msg);
      }
      toast.success(`📧 Voucher inviato a ${booking.customer_email}`);
    } catch (e) {
      toast.error('Errore email: ' + (e?.message || ''));
    } finally {
      setLoadingFor(booking.id, 'email', false);
    }
  };

  const confirmBankTransfer = async (booking) => {
    if (!confirm(`Confermi di aver ricevuto il bonifico per ${booking.booking_ref}?`)) return;
    setLoadingFor(booking.id, 'confirm', true);
    try {
      const r = await fetch(`${API_BASE}/bookings/${booking.id}?action=confirm-bank-transfer`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error('Errore conferma');
      toast.success('Pagamento confermato. Voucher finale inviato automaticamente.');
      // ricarica
      loadAgencyData(agency);
    } catch (e) {
      toast.error('Errore: ' + (e?.message || ''));
    } finally {
      setLoadingFor(booking.id, 'confirm', false);
    }
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = filteredBookings.map(b => ({
        'Codice': b.booking_ref,
        'Cliente': b.customer_name,
        'Email': b.customer_email,
        'Esperienza': getExpName(b.experience_id),
        'Data': b.slot_datetime ? new Date(b.slot_datetime).toLocaleDateString('it-IT') : '-',
        'Posti': b.seats,
        'Prezzo B2B': Number(b.price_b2b) || 0,
        'Provvigione': (Number(b.price_b2c) || 0) - (Number(b.price_b2b) || 0),
        'Totale': Number(b.total_amount || b.price_b2b) || 0,
        'Metodo Pagamento': PM_LABEL[b.payment_method] || (b.payment_method || ''),
        'Stato Pagamento': b.payment_status || '',
        'Stato': b.status,
      }));
      rows.push({ 'Codice': '', 'Cliente': '', 'Email': '', 'Esperienza': '', 'Data': '',
        'Posti': totals.seats, 'Prezzo B2B': '', 'Provvigione': totals.commission,
        'Totale': totals.revenue, 'Metodo Pagamento': '', 'Stato Pagamento': '', 'Stato': 'TOTALE' });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 25 }, { wch: 26 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
      XLSX.writeFile(wb, `${agency?.name || 'agenzia'}_prenotazioni_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato');
    } catch (e) { console.error(e); toast.error('Errore export Excel'); }
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = atMod.default || atMod;
      const doc = new jsPDF('l');
      doc.setFontSize(16).text(`Prenotazioni Agenzia - ${agency?.name || ''}`, 14, 16);
      doc.setFontSize(9).text(`Generato: ${new Date().toLocaleString('it-IT')} · Risultati: ${totals.count}`, 14, 22);
      autoTable(doc, {
        startY: 30,
        head: [['Codice', 'Cliente', 'Esperienza', 'Data', 'Posti', 'Pagamento', 'Stato', 'Prezzo B2B', 'Provvigione', 'Totale']],
        body: filteredBookings.map(b => [
          b.booking_ref,
          b.customer_name || '-',
          getExpName(b.experience_id),
          b.slot_datetime ? new Date(b.slot_datetime).toLocaleDateString('it-IT') : '-',
          b.seats,
          PM_LABEL[b.payment_method] || (b.payment_method || '—'),
          b.status,
          fmtPrice(b.price_b2b),
          fmtPrice((b.price_b2c || 0) - (b.price_b2b || 0)),
          fmtPrice(b.total_amount || b.price_b2b),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
        foot: [['', '', '', '', totals.seats, '', 'TOTALE', '', fmtPrice(totals.commission), fmtPrice(totals.revenue)]],
        footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      });
      doc.save(`${agency?.name || 'agenzia'}_prenotazioni_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato');
    } catch (e) { console.error(e); toast.error('Errore export PDF'); }
  };

  const TypeBadge = ({ type }) => {
    const colors = {
      GITA_GOMMONE: 'bg-sky-100 text-sky-800',
      GITA_BARCA: 'bg-blue-100 text-blue-800',
      VISITA_GUIDATA: 'bg-emerald-100 text-emerald-800',
      NOLEGGIO_NATANTE: 'bg-amber-100 text-amber-800'
    };
    const labels = {
      GITA_GOMMONE: 'Gita in Gommone',
      GITA_BARCA: 'Gita in Barca',
      VISITA_GUIDATA: 'Visita Guidata',
      NOLEGGIO_NATANTE: 'Noleggio Natante'
    };
    return <Badge className={colors[type] || 'bg-gray-100'}>{labels[type] || type}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Società non trovata</CardTitle>
            <CardDescription>La società richiesta non esiste</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Branding della società
  const logoUrl = company.logo_url || 'https://via.placeholder.com/150x50?text=Logo';
  const primaryColor = company.primary_color || '#0f766e';
  const secondaryColor = company.secondary_color || '#14b8a6';

  // LOGIN SCREEN
  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            {/* Logo società */}
            <div className="flex justify-center">
              <img src={logoUrl} alt={company.name} className="h-16 object-contain" />
            </div>
            
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: primaryColor }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            
            <CardTitle className="text-2xl">Portale B2B Company</CardTitle>
            <CardDescription className="text-base">
              Accedi con le credenziali della tua agenzia per {company.name}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agenzia@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              className="w-full text-white" 
              onClick={handleLogin}
              style={{ backgroundColor: primaryColor }}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Accedi
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              🔒 Accesso riservato alle agenzie autorizzate
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DASHBOARD AGENZIA
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt={company.name} className="h-10 object-contain" />
              <div className="border-l pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{agency.name}</h1>
                <p className="text-sm text-muted-foreground">Portale B2B - {company.name}</p>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleLogout}>
              Disconnetti
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          {/* === BANDA AZIONI RAPIDE B2B === */}
          <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 p-2 rounded-lg shadow-lg w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
              <Plus className="w-4 h-4" />Azioni Rapide
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowNewBookingDialog(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 font-semibold shadow-md border border-white/40 h-9"
              title="Crea prenotazione esperienza"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <CreditCard className="w-4 h-4 mr-1.5" />
              Crea Prenotazione Esperienza
            </Button>
          </div>

          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="experiences">
              <Compass className="w-4 h-4 mr-2" />
              Esperienze
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <CreditCard className="w-4 h-4 mr-2" />
              Prenotazioni
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendario
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prenotazioni Totali</p>
                      <p className="text-3xl font-bold mt-2">{stats.total_bookings || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Fatturato B2B</p>
                      <p className="text-3xl font-bold mt-2">{fmtPrice(stats.total_revenue)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Provvigioni</p>
                      <p className="text-3xl font-bold mt-2">{fmtPrice(stats.total_commission)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Agenzia */}
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Agenzia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{agency.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium">{agency.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">P.IVA</p>
                    <p className="font-medium">{agency.vat_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sconto</p>
                    <Badge className="bg-green-100 text-green-800">{agency.discount_percentage || 0}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Esperienze */}
          <TabsContent value="experiences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Esperienze Disponibili ({experiences.length})</CardTitle>
                <CardDescription>Catalogo esperienze con prezzi B2B</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {experiences.map(exp => (
                    <Card key={exp.id} className="overflow-hidden">
                      <div className="flex">
                        {exp.images?.[0] && (
                          <img 
                            src={exp.images[0]} 
                            alt={exp.name} 
                            className="w-32 h-32 object-cover"
                          />
                        )}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{exp.name}</h3>
                              <TypeBadge type={exp.type} />
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {exp.description || 'Nessuna descrizione'}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm text-muted-foreground line-through">{fmtPrice(exp.price_b2c)}</p>
                              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                                {fmtPrice(exp.price_b2b)}
                              </p>
                              <p className="text-xs text-green-600 font-medium">
                                Risparmi {fmtPrice((exp.price_b2c || 0) - (exp.price_b2b || 0))}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                            <span>⏱️ {Math.floor((exp.duration_minutes || 0) / 60)}h</span>
                            <span>👥 Max {exp.max_capacity} posti</span>
                            {exp.meeting_point && <span>📍 {exp.meeting_point}</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {experiences.length === 0 && (
                    <div className="text-center py-12">
                      <Compass className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Nessuna esperienza disponibile</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prenotazioni */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Le Tue Prenotazioni ({totals.count} su {bookings.length})</CardTitle>
                    <CardDescription>
                      Storico prenotazioni · Totale {fmtPrice(totals.revenue)}
                      {' · '}
                      Provv. <span className="text-emerald-700 font-semibold">{fmtPrice(totals.commission)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                      <Filter className="w-4 h-4 mr-2" />{showFilters ? 'Nascondi filtri' : 'Filtri'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportExcel}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF}>
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                    <Button
                      onClick={() => setShowNewBookingDialog(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-2" />Crea Prenotazione
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Pannello filtri */}
              {showFilters && (
                <CardContent className="border-y bg-muted/30 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Codice</Label>
                      <Input value={filters.code} onChange={(e) => setFilters({ ...filters, code: e.target.value })} placeholder="MK-2026-..." />
                    </div>
                    <div>
                      <Label className="text-xs">Cliente</Label>
                      <Input value={filters.customer_name} onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })} placeholder="Nome cliente" />
                    </div>
                    <div>
                      <Label className="text-xs">Esperienza</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.experience_id} onChange={(e) => setFilters({ ...filters, experience_id: e.target.value })}>
                        <option value="">Tutte</option>
                        {experiences.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Metodo Pagamento</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.payment_method} onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}>
                        <option value="">Tutti</option>
                        <option value="ONLINE">SumUp/Online</option>
                        <option value="BANK_TRANSFER">Bonifico</option>
                        <option value="CASH">Contanti</option>
                        <option value="DIRECT">Cassa Diretta</option>
                        <option value="MANUAL">Manuale</option>
                        <option value="AGENCY">Agenzia</option>
                        <option value="FREE">Omaggio</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Stato</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">Tutti</option>
                        <option value="CONFIRMED">Confermata</option>
                        <option value="HELD">In sospeso</option>
                        <option value="PENDING_VERIFICATION">Verifica Bonifico</option>
                        <option value="CANCELLED">Annullata</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Data Da</Label>
                      <Input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Data A</Label>
                      <Input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" onClick={() => setFilters({ code: '', customer_name: '', experience_id: '', payment_method: '', status: '', date_from: '', date_to: '' })}>
                        <X className="w-4 h-4 mr-1" />Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left bg-muted/50">
                        <th className="p-3 font-medium">Rif.</th>
                        <th className="p-3 font-medium">Cliente</th>
                        <th className="p-3 font-medium">Esperienza</th>
                        <th className="p-3 font-medium">Data</th>
                        <th className="p-3 font-medium">Posti</th>
                        <th className="p-3 font-medium">Prezzo B2B</th>
                        <th className="p-3 font-medium">Provvigione</th>
                        <th className="p-3 font-medium">Pagamento</th>
                        <th className="p-3 font-medium">Stato</th>
                        <th className="p-3 font-medium text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map(booking => {
                        const isPaid = booking.status === 'CONFIRMED' || booking.payment_status === 'PAID';
                        const isPendingBT = booking.status === 'PENDING_VERIFICATION';
                        const isOnlinePending = booking.payment_method === 'ONLINE' && !isPaid && booking.sumup_hosted_url;
                        const pm = booking.payment_method || 'NONE';
                        const lFor = (k) => actionLoading[`${booking.id}_${k}`];
                        return (
                          <tr key={booking.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs">{booking.booking_ref}</td>
                            <td className="p-3">{booking.customer_name}</td>
                            <td className="p-3">{getExpName(booking.experience_id)}</td>
                            <td className="p-3 text-xs">{fmtDate(booking.slot_datetime)}</td>
                            <td className="p-3">{booking.seats}</td>
                            <td className="p-3 font-semibold">{fmtPrice(booking.price_b2b)}</td>
                            <td className="p-3 font-semibold text-green-600">
                              {fmtPrice((booking.price_b2c || 0) - (booking.price_b2b || 0))}
                            </td>
                            <td className="p-3">
                              <Badge className={`${PM_COLOR(pm)} border-0 text-[11px]`}>{PM_LABEL[pm] || pm}</Badge>
                              {booking.payment_status && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">{booking.payment_status}</div>
                              )}
                            </td>
                            <td className="p-3"><StatusBadge status={booking.status} /></td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 justify-center">
                                {/* Voucher */}
                                <Button
                                  size="icon" variant="ghost"
                                  title={isPaid ? 'Scarica voucher PDF' : 'Scarica voucher provvisorio PDF'}
                                  onClick={() => downloadVoucher(booking)}
                                  disabled={lFor('voucher')}
                                  className="h-8 w-8 hover:bg-cyan-50"
                                >
                                  <FileText className={`w-4 h-4 ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`} />
                                </Button>
                                {/* Invia email */}
                                {booking.customer_email && (
                                  <Button
                                    size="icon" variant="ghost"
                                    title="Invia voucher via email"
                                    onClick={() => sendVoucherEmail(booking)}
                                    disabled={lFor('email')}
                                    className="h-8 w-8 hover:bg-blue-50"
                                  >
                                    <Mail className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
                                {/* Conferma bonifico (se in attesa verifica) */}
                                {isPendingBT && (
                                  <Button
                                    size="icon" variant="ghost"
                                    title="Conferma ricezione bonifico"
                                    onClick={() => confirmBankTransfer(booking)}
                                    disabled={lFor('confirm')}
                                    className="h-8 w-8 hover:bg-emerald-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  </Button>
                                )}
                                {/* Apri link SumUp pendente */}
                                {isOnlinePending && (
                                  <Button
                                    size="icon" variant="ghost"
                                    title="Apri link pagamento SumUp"
                                    onClick={() => window.open(booking.sumup_hosted_url, '_blank')}
                                    className="h-8 w-8 hover:bg-violet-50"
                                  >
                                    <ExternalLink className="w-4 h-4 text-violet-600" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredBookings.length > 0 && (
                      <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold border-t-2 border-emerald-300 sticky bottom-0">
                        <tr>
                          <td colSpan={4} className="p-3 text-right uppercase text-xs tracking-wide text-muted-foreground">
                            Totale {totals.count} {totals.count === 1 ? 'prenotazione' : 'prenotazioni'}
                          </td>
                          <td className="p-3 text-emerald-700">{totals.seats}</td>
                          <td className="p-3"></td>
                          <td className="p-3 text-emerald-700">{fmtPrice(totals.commission)}</td>
                          <td colSpan={2}></td>
                          <td className="p-3 text-emerald-700 text-right">{fmtPrice(totals.revenue)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Nessuna prenotazione</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Calendario - vista settimanale */}
          <TabsContent value="calendar" className="space-y-4">
            <AgencyCalendarLazy
              companyId={company?.id}
              agencyId={agency?.id}
              experiences={experiences}
            />
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog Nuova Prenotazione Agenzia */}
      {showNewBookingDialog && (
        <NewBookingDialog
          open={showNewBookingDialog}
          onClose={() => setShowNewBookingDialog(false)}
          companyId={agency?.company_id}
          agencyId={agency?.id}
          currentUser={{ username: agency?.name || 'agency', company_id: agency?.company_id }}
          onCreated={() => {
            // Ricarica prenotazioni
            if (agency?.id) {
              fetch(`${API_BASE}/bookings?agency_id=${agency.id}`)
                .then(r => r.json())
                .then(d => setBookings(Array.isArray(d) ? d : []));
            }
          }}
        />
      )}
    </div>
  );
}
