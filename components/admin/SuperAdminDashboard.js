'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, Eye, EyeOff, Edit, Copy } from 'lucide-react';
import { api, safeToastError, fmtDateTime, fmtPrice } from '../shared/utilities';

function SuperAdminDashboard() {
  const [superAdmin, setSuperAdmin] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(null);
  const [formData, setFormData] = useState({});
  
  const api = async (endpoint, options = {}) => {
    const res = await fetch(`/api/${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return res.json();
  };
  
  const handleLogin = async () => {
    setLoading(true);
    const res = await api('users/login', { method: 'POST', body: loginForm });
    if (res.error) {
      toast.error(res.error);
      setLoading(false);
      return;
    }
    
    if (res.user.role !== 'SUPER_ADMIN') {
      toast.error('Accesso negato: solo Super Admin');
      setLoading(false);
      return;
    }
    
    setSuperAdmin(res.user);
    toast.success(`Benvenuto Super Admin!`);
    
    // Carica dati
    const [comps, usrs] = await Promise.all([
      api('companies'),
      api('users')
    ]);
    setCompanies(Array.isArray(comps) ? comps : []);
    setUsers(Array.isArray(usrs) ? usrs : []);
    setLoading(false);
  };
  
  const createCompany = async () => {
    setLoading(true);
    const res = await api('companies', { method: 'POST', body: formData });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Company creata con successo!');
      setShowDialog(null);
      setFormData({});
      const comps = await api('companies');
      setCompanies(Array.isArray(comps) ? comps : []);
    }
    setLoading(false);
  };
  
  const toggleCompanyStatus = async (companyId, currentStatus) => {
    const res = await api(`companies/${companyId}`, {
      method: 'PUT',
      body: { is_active: !currentStatus }
    });
    if (!res.error) {
      toast.success(currentStatus ? 'Company disattivata' : 'Company attivata');
      const comps = await api('companies');
      setCompanies(Array.isArray(comps) ? comps : []);
    }
  };
  
  // Login Screen
  if (!superAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Super Admin Login</CardTitle>
            <CardDescription>Sardinia Tours Hub - Multi-Tenant Platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="superadmin@sardinia-tours.com"
                onKeyPress={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                onKeyPress={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              Accedi come Super Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Dashboard
  const activeCompanies = companies.filter(c => c.is_active).length;
  const totalUsers = users.length;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Sardinia Tours Hub - Multi-Tenant Platform</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSuperAdmin(null)}>
              Logout
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totale Companies</p>
                  <p className="text-3xl font-bold">{companies.length}</p>
                </div>
                <Building2 className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Companies Attive</p>
                  <p className="text-3xl font-bold text-green-600">{activeCompanies}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totale Utenti</p>
                  <p className="text-3xl font-bold">{totalUsers}</p>
                </div>
                <Users className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Company Inattive</p>
                  <p className="text-3xl font-bold text-red-600">{companies.length - activeCompanies}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => { setShowDialog('new_company'); setFormData({}); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuova Company
          </Button>
        </div>
        
        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>Gestione Companies</CardTitle>
            <CardDescription>Lista di tutte le società sulla piattaforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companies.map(company => (
                <div key={company.id} className="p-4 border rounded-lg hover:bg-muted/30 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{company.name}</h3>
                          {company.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Attiva</Badge>
                          ) : (
                            <Badge variant="destructive">Disattivata</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{company.legal_form} • P.IVA: {company.vat_number}</p>
                        <p className="text-sm text-muted-foreground">{company.email} • {company.phone}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Piano: {company.subscription_plan}</span>
                          <span>Max Esperienze: {company.max_experiences}</span>
                          <span>Max Agenzie: {company.max_agencies}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={company.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                      >
                        {company.is_active ? 'Disattiva' : 'Attiva'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData(company);
                          setShowDialog('edit_company');
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {companies.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground">Nessuna company ancora creata</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog Nuova/Modifica Company */}
      <Dialog open={showDialog === 'new_company' || showDialog === 'edit_company'} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showDialog === 'new_company' ? 'Crea Nuova Company' : 'Modifica Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome Company *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es: Sardinia Experience S.R.L."
                />
              </div>
              <div>
                <Label>Forma Giuridica</Label>
                <Select value={formData.legal_form || 'S.R.L.'} onValueChange={v => setFormData({ ...formData, legal_form: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S.R.L.">S.R.L.</SelectItem>
                    <SelectItem value="S.R.L.S.">S.R.L.S.</SelectItem>
                    <SelectItem value="DITTA_INDIVIDUALE">Ditta Individuale</SelectItem>
                    <SelectItem value="S.P.A.">S.P.A.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>P.IVA *</Label>
                <Input
                  value={formData.vat_number || ''}
                  onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="IT12345678901"
                />
              </div>
              <div>
                <Label>Codice SDI</Label>
                <Input
                  value={formData.sdi_code || ''}
                  onChange={e => setFormData({ ...formData, sdi_code: e.target.value })}
                  placeholder="ABC1234"
                />
              </div>
            </div>
            
            <div>
              <Label>Sede Legale</Label>
              <Input
                value={formData.legal_address || ''}
                onChange={e => setFormData({ ...formData, legal_address: e.target.value })}
                placeholder="Via Roma 1, 09124 Cagliari (CA)"
              />
            </div>
            
            <Separator />
            <h4 className="font-semibold">Contatti</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 070 123456"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.website || ''}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.company.com"
                />
              </div>
            </div>
            
            <Separator />
            <h4 className="font-semibold">Branding</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={formData.logo_url || ''}
                  onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Hero Image URL</Label>
                <Input
                  value={formData.hero_image || ''}
                  onChange={e => setFormData({ ...formData, hero_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Colore Primario</Label>
                <Input
                  type="color"
                  value={formData.primary_color || '#0066CC'}
                  onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                />
              </div>
              <div>
                <Label>Colore Secondario</Label>
                <Input
                  type="color"
                  value={formData.secondary_color || '#FF6B35'}
                  onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                />
              </div>
            </div>
            
            <Separator />
            <h4 className="font-semibold">Configurazione</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Piano</Label>
                <Select value={formData.subscription_plan || 'STANDARD'} onValueChange={v => setFormData({ ...formData, subscription_plan: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Esperienze</Label>
                <Input
                  type="number"
                  value={formData.max_experiences || 50}
                  onChange={e => setFormData({ ...formData, max_experiences: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Agenzie</Label>
                <Input
                  type="number"
                  value={formData.max_agencies || 10}
                  onChange={e => setFormData({ ...formData, max_agencies: e.target.value })}
                />
              </div>
            </div>
            
            <Button className="w-full" onClick={createCompany} disabled={loading || !formData.name || !formData.email}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {showDialog === 'new_company' ? 'Crea Company' : 'Salva Modifiche'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Importo Totale Pagato</p>
                      {previewBk.discount_applied && previewBk.discount_applied > 0 && (
                        <p className="text-xs text-green-600 mt-1">Sconto applicato: {fmtPrice(previewBk.discount_applied)}</p>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-green-700">{fmtPrice(previewBk.total_amount)}</p>
                  </div>
                </div>
              </div>
              
              {/* Richieste Speciali */}
              {previewBk.special_requests && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 text-sm">Richieste Speciali</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">{previewBk.special_requests}</p>
                </div>
              )}
              
              {/* Info Aggiuntive */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Codice Riferimento</span>
                  <span className="font-mono font-bold">{previewBk.booking_ref}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Prenotazione creata</span>
                  <span>{fmtDate(previewBk.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ B2B PORTAL ============

export default SuperAdminDashboard;
