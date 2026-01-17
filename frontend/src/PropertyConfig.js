import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Building2,
  Home,
  MapPin,
  FileText,
  Settings,
  Wifi,
  Camera,
  Cloud,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Zap,
  Thermometer,
  Phone,
  Mail,
  Users,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Categorie catastali
const CATEGORIE_CATASTALI = [
  { value: "A/1", label: "A/1 - Abitazioni signorili" },
  { value: "A/2", label: "A/2 - Abitazioni civili" },
  { value: "A/3", label: "A/3 - Abitazioni economiche" },
  { value: "A/4", label: "A/4 - Abitazioni popolari" },
  { value: "A/5", label: "A/5 - Abitazioni ultrapopolari" },
  { value: "A/6", label: "A/6 - Abitazioni rurali" },
  { value: "A/7", label: "A/7 - Villini" },
  { value: "A/8", label: "A/8 - Ville" },
  { value: "A/9", label: "A/9 - Castelli/palazzi storici" },
  { value: "A/10", label: "A/10 - Uffici/studi privati" },
  { value: "A/11", label: "A/11 - Abitazioni tipiche" },
];

const CLASSI_ENERGETICHE = [
  { value: "A4", label: "A4", color: "bg-green-600" },
  { value: "A3", label: "A3", color: "bg-green-500" },
  { value: "A2", label: "A2", color: "bg-green-400" },
  { value: "A1", label: "A1", color: "bg-lime-500" },
  { value: "B", label: "B", color: "bg-lime-400" },
  { value: "C", label: "C", color: "bg-yellow-400" },
  { value: "D", label: "D", color: "bg-orange-400" },
  { value: "E", label: "E", color: "bg-orange-500" },
  { value: "F", label: "F", color: "bg-red-400" },
  { value: "G", label: "G", color: "bg-red-600" },
];

// Password Input con toggle visibilità
const PasswordInput = ({ value, onChange, placeholder, id }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

// Status Badge per integrazioni
const IntegrationStatus = ({ enabled, connected, name }) => {
  if (!enabled) {
    return <Badge variant="secondary" className="text-xs">Disabilitato</Badge>;
  }
  return connected ? (
    <Badge className="bg-green-500 text-xs">
      <Check className="h-3 w-3 mr-1" /> Connesso
    </Badge>
  ) : (
    <Badge variant="destructive" className="text-xs">
      <X className="h-3 w-3 mr-1" /> Non configurato
    </Badge>
  );
};

// eWeLink Status Component
const EweLinkStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/ewelink/status`);
      setStatus(response.data);
    } catch (error) {
      setStatus({ connected: false, message: "Errore connessione" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 animate-spin" /></Badge>;
  }

  if (status?.connected) {
    return (
      <Badge className="bg-green-500 text-xs">
        <Check className="h-3 w-3 mr-1" /> {status.user?.email || "Connesso"}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="text-xs">
      <X className="h-3 w-3 mr-1" /> Non connesso
    </Badge>
  );
};

// eWeLink Login Section Component
const EweLinkLoginSection = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState(null);

  useEffect(() => {
    checkStatus();
    
    // Check for OAuth callback result
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ewelink_auth') === 'success') {
      toast.success(`eWeLink connesso! Email: ${urlParams.get('email') || ''}`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkStatus();
    }
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/ewelink/status`);
      setStatus(response.data);
    } catch (error) {
      setStatus({ connected: false, auth_required: true });
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async () => {
    try {
      const response = await axios.get(`${API}/ewelink/auth-url`);
      setAuthUrl(response.data.auth_url);
      // Open in new window or redirect
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error("Errore generazione URL autenticazione");
    }
  };

  const disconnectEwelink = async () => {
    // Just clear the status display, actual logout would need API call
    setStatus({ connected: false, auth_required: true });
    toast.info("Per disconnetterti completamente, rimuovi l'app da eWeLink");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="text-sm text-slate-600">Verifica connessione...</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-green-800">eWeLink Connesso</p>
              <p className="text-sm text-green-600">{status.user?.email || status.user?.nickname || "Account collegato"}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            className="border-green-300"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Aggiorna
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-blue-800">Collega il tuo account eWeLink</p>
            <p className="text-sm text-blue-600">Accedi con le tue credenziali eWeLink per gestire i dispositivi Sonoff</p>
          </div>
        </div>
        <Button
          onClick={startOAuth}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="h-4 w-4 mr-2" />
          Accedi con eWeLink
        </Button>
        <p className="text-xs text-blue-500 text-center">
          Verrai reindirizzato alla pagina di login eWeLink
        </p>
      </div>
    </div>
  );
};

export default function PropertyConfig() {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smartThingsStatus, setSmartThingsStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cadastral: {
      address: "",
      comune: "",
      provincia: "",
      cap: "",
      foglio: "",
      particella: "",
      subalterno: "",
      categoria: "",
      rendita: null,
      superficie_mq: null,
      vani: null,
      classe_energetica: "",
      anno_costruzione: null,
      note: ""
    },
    matterport: {
      space_id: "",
      sdk_key: "",
      enabled: true
    },
    integrations: {
      smartthings: {
        enabled: false,
        token: "",
        location_id: "auto"
      },
      ewelink: {
        enabled: false,
        email: "",
        password: "",
        region: "eu"
      }
    },
    ezviz: {
      enabled: false,
      username: "",
      password: "",
      app_key: "",
      secret: "",
      region: "eu"
    },
    weather: {
      enabled: true,
      city: "",
      lat: null,
      lon: null
    }
  });

  // Load property
  const loadProperty = useCallback(async () => {
    setLoading(true);
    try {
      // Try to get active property
      let response = await axios.get(`${API}/property/active`);
      
      if (!response.data) {
        // Initialize from env if no property exists
        response = await axios.post(`${API}/property/init-from-env`);
        if (response.data.property) {
          setProperty(response.data.property);
          setFormData(response.data.property);
          toast.success("Proprietà inizializzata dalla configurazione esistente");
        }
      } else {
        setProperty(response.data);
        setFormData(response.data);
      }
    } catch (error) {
      console.error("Error loading property:", error);
      // If 404, try to init
      if (error.response?.status === 404 || !error.response) {
        try {
          const initResponse = await axios.post(`${API}/property/init-from-env`);
          if (initResponse.data.property) {
            setProperty(initResponse.data.property);
            setFormData(initResponse.data.property);
          }
        } catch (initError) {
          toast.error("Errore nel caricamento della proprietà");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check SmartThings connection
  const checkSmartThingsConnection = useCallback(async () => {
    if (!formData.integrations?.smartthings?.enabled) {
      setSmartThingsStatus(null);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/smartthings/devices`);
      setSmartThingsStatus({
        connected: true,
        deviceCount: response.data.count || 0
      });
    } catch (error) {
      setSmartThingsStatus({
        connected: false,
        error: error.response?.status === 401 ? "Token non valido" : "Errore connessione"
      });
    }
  }, [formData.integrations?.smartthings?.enabled]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  useEffect(() => {
    if (!loading) {
      checkSmartThingsConnection();
    }
  }, [loading, checkSmartThingsConnection]);

  // Save property
  const saveProperty = async () => {
    if (!property?.id) {
      toast.error("Nessuna proprietà da salvare");
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(`${API}/property/${property.id}`, formData);
      toast.success("Proprietà salvata con successo!");
      await loadProperty();
      checkSmartThingsConnection();
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // Update nested form data
  const updateFormData = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Caricamento configurazione...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="property-config">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Configurazione Proprietà
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestisci i dati dell'immobile e le integrazioni smart home
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadProperty} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </Button>
          <Button onClick={saveProperty} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salva Modifiche
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Generale
          </TabsTrigger>
          <TabsTrigger value="cadastral" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Catastali
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Integrazioni
          </TabsTrigger>
          <TabsTrigger value="matterport" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Matterport
          </TabsTrigger>
          <TabsTrigger value="centri" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Centri
          </TabsTrigger>
        </TabsList>

        {/* Tab: Generale */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Generali</CardTitle>
              <CardDescription>Nome e descrizione della proprietà</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Proprietà *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    placeholder="Es: Villa Trivor"
                    data-testid="property-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Input
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder="Es: Residenza principale"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                Configurazione Meteo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="weather-enabled"
                  checked={formData.weather?.enabled ?? true}
                  onCheckedChange={(checked) => updateFormData("weather.enabled", checked)}
                />
                <Label htmlFor="weather-enabled">Abilita widget meteo</Label>
              </div>
              
              {formData.weather?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weather-city">Città</Label>
                    <Input
                      id="weather-city"
                      value={formData.weather?.city || ""}
                      onChange={(e) => updateFormData("weather.city", e.target.value)}
                      placeholder="Es: Nuoro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weather-lat">Latitudine</Label>
                    <Input
                      id="weather-lat"
                      type="number"
                      step="0.0001"
                      value={formData.weather?.lat || ""}
                      onChange={(e) => updateFormData("weather.lat", parseFloat(e.target.value) || null)}
                      placeholder="Es: 40.3125"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weather-lon">Longitudine</Label>
                    <Input
                      id="weather-lon"
                      type="number"
                      step="0.0001"
                      value={formData.weather?.lon || ""}
                      onChange={(e) => updateFormData("weather.lon", parseFloat(e.target.value) || null)}
                      placeholder="Es: 9.3125"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dati Catastali */}
        <TabsContent value="cadastral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Indirizzo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cadastral-address">Indirizzo completo</Label>
                <Input
                  id="cadastral-address"
                  value={formData.cadastral?.address || ""}
                  onChange={(e) => updateFormData("cadastral.address", e.target.value)}
                  placeholder="Via Roma 1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cadastral-comune">Comune</Label>
                  <Input
                    id="cadastral-comune"
                    value={formData.cadastral?.comune || ""}
                    onChange={(e) => updateFormData("cadastral.comune", e.target.value)}
                    placeholder="Nuoro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-provincia">Provincia</Label>
                  <Input
                    id="cadastral-provincia"
                    value={formData.cadastral?.provincia || ""}
                    onChange={(e) => updateFormData("cadastral.provincia", e.target.value)}
                    placeholder="NU"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-cap">CAP</Label>
                  <Input
                    id="cadastral-cap"
                    value={formData.cadastral?.cap || ""}
                    onChange={(e) => updateFormData("cadastral.cap", e.target.value)}
                    placeholder="08100"
                    maxLength={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Riferimenti Catastali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cadastral-foglio">Foglio</Label>
                  <Input
                    id="cadastral-foglio"
                    value={formData.cadastral?.foglio || ""}
                    onChange={(e) => updateFormData("cadastral.foglio", e.target.value)}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-particella">Particella</Label>
                  <Input
                    id="cadastral-particella"
                    value={formData.cadastral?.particella || ""}
                    onChange={(e) => updateFormData("cadastral.particella", e.target.value)}
                    placeholder="345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-subalterno">Subalterno</Label>
                  <Input
                    id="cadastral-subalterno"
                    value={formData.cadastral?.subalterno || ""}
                    onChange={(e) => updateFormData("cadastral.subalterno", e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cadastral-categoria">Categoria Catastale</Label>
                  <Select
                    value={formData.cadastral?.categoria || ""}
                    onValueChange={(value) => updateFormData("cadastral.categoria", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIE_CATASTALI.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-rendita">Rendita Catastale (€)</Label>
                  <Input
                    id="cadastral-rendita"
                    type="number"
                    step="0.01"
                    value={formData.cadastral?.rendita || ""}
                    onChange={(e) => updateFormData("cadastral.rendita", parseFloat(e.target.value) || null)}
                    placeholder="1250.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-600" />
                Caratteristiche Immobile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cadastral-superficie">Superficie (mq)</Label>
                  <Input
                    id="cadastral-superficie"
                    type="number"
                    value={formData.cadastral?.superficie_mq || ""}
                    onChange={(e) => updateFormData("cadastral.superficie_mq", parseFloat(e.target.value) || null)}
                    placeholder="250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-vani">Vani</Label>
                  <Input
                    id="cadastral-vani"
                    type="number"
                    value={formData.cadastral?.vani || ""}
                    onChange={(e) => updateFormData("cadastral.vani", parseInt(e.target.value) || null)}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadastral-anno">Anno Costruzione</Label>
                  <Input
                    id="cadastral-anno"
                    type="number"
                    value={formData.cadastral?.anno_costruzione || ""}
                    onChange={(e) => updateFormData("cadastral.anno_costruzione", parseInt(e.target.value) || null)}
                    placeholder="1985"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Classe Energetica</Label>
                  <Select
                    value={formData.cadastral?.classe_energetica || ""}
                    onValueChange={(value) => updateFormData("cadastral.classe_energetica", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSI_ENERGETICHE.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${cls.color}`} />
                            {cls.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cadastral-note">Note</Label>
                <Textarea
                  id="cadastral-note"
                  value={formData.cadastral?.note || ""}
                  onChange={(e) => updateFormData("cadastral.note", e.target.value)}
                  placeholder="Note aggiuntive sull'immobile..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Integrazioni */}
        <TabsContent value="integrations" className="space-y-4">
          {/* SmartThings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  <CardTitle>SmartThings</CardTitle>
                </div>
                <IntegrationStatus
                  enabled={formData.integrations?.smartthings?.enabled}
                  connected={smartThingsStatus?.connected}
                />
              </div>
              <CardDescription>
                Connetti i tuoi dispositivi Samsung SmartThings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="smartthings-enabled"
                  checked={formData.integrations?.smartthings?.enabled ?? false}
                  onCheckedChange={(checked) => updateFormData("integrations.smartthings.enabled", checked)}
                />
                <Label htmlFor="smartthings-enabled">Abilita SmartThings</Label>
              </div>
              
              {formData.integrations?.smartthings?.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="smartthings-token">Personal Access Token (PAT)</Label>
                    <PasswordInput
                      id="smartthings-token"
                      value={formData.integrations?.smartthings?.token}
                      onChange={(e) => updateFormData("integrations.smartthings.token", e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                    <p className="text-xs text-gray-500">
                      Genera un token su{" "}
                      <a
                        href="https://account.smartthings.com/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        account.smartthings.com/tokens
                      </a>
                    </p>
                  </div>
                  
                  {smartThingsStatus && (
                    <div className={`p-3 rounded-lg ${smartThingsStatus.connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {smartThingsStatus.connected ? (
                        <p className="text-green-700 text-sm">
                          ✅ Connesso! {smartThingsStatus.deviceCount} dispositivi trovati
                        </p>
                      ) : (
                        <p className="text-red-700 text-sm">
                          ❌ {smartThingsStatus.error}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* eWeLink */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-blue-600" />
                  <CardTitle>eWeLink / Sonoff</CardTitle>
                </div>
                <EweLinkStatus />
              </div>
              <CardDescription>
                Connetti dispositivi Sonoff e compatibili eWeLink tramite OAuth2
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ewelink-enabled"
                  checked={formData.integrations?.ewelink?.enabled ?? false}
                  onCheckedChange={(checked) => updateFormData("integrations.ewelink.enabled", checked)}
                />
                <Label htmlFor="ewelink-enabled">Abilita eWeLink</Label>
              </div>
              
              {formData.integrations?.ewelink?.enabled && (
                <div className="space-y-4">
                  {/* OAuth2 Login Button */}
                  <EweLinkLoginSection />
                  
                  {/* Region selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ewelink-region">Regione</Label>
                      <Select
                        value={formData.integrations?.ewelink?.region || "eu"}
                        onValueChange={(value) => updateFormData("integrations.ewelink.region", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eu">Europa</SelectItem>
                          <SelectItem value="us">USA</SelectItem>
                          <SelectItem value="cn">Cina</SelectItem>
                          <SelectItem value="as">Asia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ezviz */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-red-600" />
                  <CardTitle>Ezviz Telecamere</CardTitle>
                </div>
                <IntegrationStatus
                  enabled={formData.ezviz?.enabled}
                  connected={!!formData.ezviz?.username}
                />
              </div>
              <CardDescription>
                Integra le tue telecamere Ezviz / Hikvision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ezviz-enabled"
                  checked={formData.ezviz?.enabled ?? false}
                  onCheckedChange={(checked) => updateFormData("ezviz.enabled", checked)}
                />
                <Label htmlFor="ezviz-enabled">Abilita Ezviz</Label>
              </div>
              
              {formData.ezviz?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ezviz-username">Username/Email</Label>
                    <Input
                      id="ezviz-username"
                      value={formData.ezviz?.username || ""}
                      onChange={(e) => updateFormData("ezviz.username", e.target.value)}
                      placeholder="tua@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ezviz-password">Password</Label>
                    <PasswordInput
                      id="ezviz-password"
                      value={formData.ezviz?.password}
                      onChange={(e) => updateFormData("ezviz.password", e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ezviz-appkey">App Key</Label>
                    <PasswordInput
                      id="ezviz-appkey"
                      value={formData.ezviz?.app_key}
                      onChange={(e) => updateFormData("ezviz.app_key", e.target.value)}
                      placeholder="at.xxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ezviz-secret">Secret</Label>
                    <PasswordInput
                      id="ezviz-secret"
                      value={formData.ezviz?.secret}
                      onChange={(e) => updateFormData("ezviz.secret", e.target.value)}
                      placeholder="xxxxx"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Matterport */}
        <TabsContent value="matterport" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-pink-600" />
                Configurazione Matterport
              </CardTitle>
              <CardDescription>
                Configura lo spazio 3D Matterport per il digital twin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="matterport-enabled"
                  checked={formData.matterport?.enabled ?? true}
                  onCheckedChange={(checked) => updateFormData("matterport.enabled", checked)}
                />
                <Label htmlFor="matterport-enabled">Abilita Vista 3D</Label>
              </div>
              
              {formData.matterport?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matterport-spaceid">Space ID *</Label>
                    <Input
                      id="matterport-spaceid"
                      value={formData.matterport?.space_id || ""}
                      onChange={(e) => updateFormData("matterport.space_id", e.target.value)}
                      placeholder="j1r4zUjanif"
                    />
                    <p className="text-xs text-gray-500">
                      L'ID dello spazio Matterport (dalla URL: my.matterport.com/show/?m=<strong>ID</strong>)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matterport-sdkkey">SDK Key</Label>
                    <PasswordInput
                      id="matterport-sdkkey"
                      value={formData.matterport?.sdk_key}
                      onChange={(e) => updateFormData("matterport.sdk_key", e.target.value)}
                      placeholder="xxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-gray-500">
                      Ottieni la SDK Key dal{" "}
                      <a
                        href="https://matterport.com/developers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Matterport Developer Portal
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matterport Cloud API - Per POI persistenti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                Matterport Cloud API
              </CardTitle>
              <CardDescription>
                Configura le credenziali API per sincronizzare i POI su my.matterport.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 mb-2">Come ottenere le credenziali:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Vai su <a href="https://my.matterport.com" target="_blank" rel="noopener noreferrer" className="underline">my.matterport.com</a></li>
                  <li>Account Settings → Developer Tools → API Applications</li>
                  <li>Crea nuova applicazione "Machine-to-Machine"</li>
                  <li>Copia Client ID e Client Secret</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matterport-clientid">Client ID</Label>
                  <PasswordInput
                    id="matterport-clientid"
                    value={formData.matterport?.api_client_id}
                    onChange={(e) => updateFormData("matterport.api_client_id", e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matterport-clientsecret">Client Secret</Label>
                  <PasswordInput
                    id="matterport-clientsecret"
                    value={formData.matterport?.api_client_secret}
                    onChange={(e) => updateFormData("matterport.api_client_secret", e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>

              {formData.matterport?.api_client_id && formData.matterport?.api_client_secret && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await axios.post(`${API}/matterport/cloud/test-connection`, {
                          client_id: formData.matterport.api_client_id,
                          client_secret: formData.matterport.api_client_secret
                        });
                        if (response.data.connected) {
                          toast.success(response.data.message);
                        } else {
                          toast.error(response.data.error);
                        }
                      } catch (error) {
                        toast.error("Errore test connessione");
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Testa Connessione
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Centri Assistenza */}
        <TabsContent value="centri" className="space-y-4">
          <CentriAssistenzaManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
