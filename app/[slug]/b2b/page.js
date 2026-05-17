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
import { Building2, LogIn, BarChart3, CreditCard, TrendingUp, DollarSign, Calendar, Users, Eye, EyeOff, Ship, Compass, Plus } from 'lucide-react';
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
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800'
    };
    const labels = { PENDING: 'In Attesa', CONFIRMED: 'Confermata', CANCELLED: 'Cancellata', COMPLETED: 'Completata' };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{labels[status] || status}</Badge>;
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
                    <CardTitle>Le Tue Prenotazioni ({bookings.length})</CardTitle>
                    <CardDescription>Storico prenotazioni effettuate</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowNewBookingDialog(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-2" />Crea Prenotazione
                  </Button>
                </div>
              </CardHeader>
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
                        <th className="p-3 font-medium">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => (
                        <tr key={booking.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{booking.booking_ref}</td>
                          <td className="p-3">{booking.customer_name}</td>
                          <td className="p-3">{getExpName(booking.experience_id)}</td>
                          <td className="p-3">{fmtDate(booking.slot_datetime)}</td>
                          <td className="p-3">{booking.seats}</td>
                          <td className="p-3 font-semibold">{fmtPrice(booking.price_b2b)}</td>
                          <td className="p-3 font-semibold text-green-600">
                            {fmtPrice((booking.price_b2c || 0) - (booking.price_b2b || 0))}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={booking.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bookings.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Nessuna prenotazione</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
