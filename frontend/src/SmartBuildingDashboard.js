import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { formatDateIT } from "./TicketCalendarQR";
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Zap,
  Power,
  Lightbulb,
  Camera,
  Shield,
  Home,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Wrench,
  Calendar,
  Bell,
  Menu,
  X,
  Eye,
  Lock,
  Unlock,
  Tv,
  Fan,
  Waves,
  Gauge,
  Activity,
  Radio,
  DoorOpen,
  Trees,
  Lamp,
  Armchair,
  ExternalLink,
  Monitor,
  Smartphone,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Device icon mapping
const getDeviceIcon = (name, capabilities) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('luce') || nameLower.includes('luci') || nameLower.includes('applique')) return Lightbulb;
  if (nameLower.includes('tv') || nameLower.includes('samsung') && (nameLower.includes('series') || nameLower.includes('m5'))) return Tv;
  if (nameLower.includes('condizionatore') || nameLower.includes('aria')) return Fan;
  if (nameLower.includes('temperatura')) return Thermometer;
  if (nameLower.includes('cancello')) return Lock;
  if (nameLower.includes('irrigazione') || nameLower.includes('h2o') || nameLower.includes('prato') || nameLower.includes('fioriera') || nameLower.includes('aiuole')) return Droplets;
  if (nameLower.includes('autoclave') || nameLower.includes('idropulitrice')) return Waves;
  if (nameLower.includes('abbanoa')) return Gauge;
  if (capabilities?.includes('switch')) return Power;
  return Radio;
};

// Weather icon component
const WeatherIcon = ({ code, size = 48 }) => {
  const iconMap = {
    0: Sun,
    1: Sun,
    2: Cloud,
    3: Cloud,
    45: Cloud,
    48: Cloud,
    51: CloudRain,
    53: CloudRain,
    55: CloudRain,
    61: CloudRain,
    63: CloudRain,
    65: CloudRain,
    71: Snowflake,
    73: Snowflake,
    75: Snowflake,
    80: CloudRain,
    81: CloudRain,
    82: CloudRain,
    95: CloudRain,
    96: CloudRain,
    99: CloudRain
  };
  const Icon = iconMap[code] || Cloud;
  return <Icon size={size} />;
};

// SmartThings Device Card
const DeviceCard = ({ device, onToggle }) => {
  // Leggi lo stato iniziale dal dispositivo (se disponibile)
  const initialState = device.status?.switch === 'on' || device.switchState === 'on' || false;
  const [isOn, setIsOn] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const Icon = getDeviceIcon(device.name, device.capabilities);
  
  // Aggiorna stato quando cambia il dispositivo
  useEffect(() => {
    const newState = device.status?.switch === 'on' || device.switchState === 'on' || false;
    setIsOn(newState);
  }, [device]);
  
  const hasSwitch = device.capabilities?.includes('switch');
  const hasTemp = device.capabilities?.includes('temperatureMeasurement');
  const hasHumidity = device.capabilities?.includes('relativeHumidityMeasurement');
  
  const handleToggle = async () => {
    if (!hasSwitch) return;
    setLoading(true);
    try {
      const action = isOn ? 'off' : 'on';
      await axios.post(`${API_URL}/api/smartthings/device/${device.id}/switch/${action}`);
      setIsOn(!isOn);
      toast.success(`${device.name} ${action === 'on' ? 'acceso' : 'spento'}`);
    } catch (error) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${isOn ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'}`}>
          <Icon size={20} />
        </div>
        {hasSwitch && (
          <Switch 
            checked={isOn} 
            onCheckedChange={handleToggle}
            disabled={loading}
            className="data-[state=checked]:bg-cyan-500"
          />
        )}
      </div>
      <h3 className="text-sm font-medium text-white mb-1 truncate">{device.name}</h3>
      <p className="text-xs text-slate-400">
        {hasTemp && <span className="text-cyan-400">Sensore Temp</span>}
        {hasSwitch && !hasTemp && (isOn ? 'Acceso' : 'Spento')}
      </p>
    </div>
  );
};

// Ezviz Camera Card (placeholder for when it works)
const CameraCard = ({ camera }) => {
  const isOnline = camera?.status === 'online';
  
  // Deep link per aprire l'app Ezviz su smartphone
  const openEzvizApp = () => {
    const ezvizAppScheme = `ezviz://open?deviceSerial=${camera?.serial}`;
    window.location.href = ezvizAppScheme;
  };
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300">
      {/* Header con stato */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-cyan-400" />
          <h3 className="text-sm font-medium text-white">{camera?.name || 'Camera'}</h3>
        </div>
        <Badge variant={isOnline ? "default" : "destructive"} className={isOnline ? "bg-green-500" : ""}>
          <span className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-white animate-pulse' : 'bg-red-300'}`}></span>
          {isOnline ? "ONLINE" : "OFFLINE"}
        </Badge>
      </div>
      
      {/* Dettagli Camera */}
      <div className="space-y-1 text-xs text-slate-400 mb-3">
        <div className="flex justify-between">
          <span>Seriale:</span>
          <span className="text-slate-300 font-mono">{camera?.serial || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span>Modello:</span>
          <span className="text-slate-300">{camera?.model || '-'}</span>
        </div>
      </div>
      
      {/* Pulsante App Mobile */}
      <Button 
        size="sm" 
        className="w-full text-xs bg-cyan-600 hover:bg-cyan-500"
        onClick={openEzvizApp}
      >
        <Smartphone size={14} className="mr-2" />
        Apri App Ezviz (Mobile)
      </Button>
    </div>
  );
};

// Componente per le istruzioni PC
const EzvizPCInstructions = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor size={24} className="text-blue-400" />
          <div>
            <h3 className="text-sm font-medium text-white">Visualizza su PC</h3>
            <p className="text-xs text-slate-400">Usa Ezviz Studio per vedere tutte le telecamere</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <Info size={14} className="mr-2" />
          {showInstructions ? 'Nascondi' : 'Istruzioni'}
        </Button>
      </div>
      
      {showInstructions && (
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <p className="text-sm text-slate-300 mb-2">Per visualizzare le telecamere su PC:</p>
          <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
            <li>Apri <span className="text-cyan-400 font-mono">Ezviz Studio</span> dal menu Start</li>
            <li>Oppure vai in: <span className="text-cyan-400 font-mono break-all">C:\Program Files (x86)\Ezviz Studio</span></li>
            <li>Accedi con le tue credenziali Ezviz</li>
            <li>Tutte le telecamere saranno disponibili nella console</li>
          </ol>
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            💡 Suggerimento: Crea un collegamento sul desktop per un accesso rapido
          </div>
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
export default function SmartBuildingDashboard({ onNavigate, manutenzioni = [], elettrodomestici = [] }) {
  const [activeTab, setActiveTab] = useState('clima');
  const [smartThingsDevices, setSmartThingsDevices] = useState([]);
  const [devicesByRoom, setDevicesByRoom] = useState([]);
  const [ezvizCameras, setEzvizCameras] = useState([]);
  const [weather, setWeather] = useState(null);
  const [climaData, setClimaData] = useState(null); // Dati sensore temperatura SmartThings
  const [systemStatus, setSystemStatus] = useState({ ok: 0, attenzione: 0, critici: 0, totali: 0 });
  const [loading, setLoading] = useState(true);
  const [matterportSpaceId, setMatterportSpaceId] = useState('j1r4zUjanif');
  const [expandedRooms, setExpandedRooms] = useState({});

  // Toggle room expansion - default collapsed
  const toggleRoom = (roomName) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomName]: !prev[roomName]
    }));
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch SmartThings devices grouped by room
      const devicesByRoomRes = await axios.get(`${API_URL}/api/smartthings/devices-by-room`);
      setDevicesByRoom(devicesByRoomRes.data.rooms || []);
      
      // Also fetch flat list for other uses
      const devicesRes = await axios.get(`${API_URL}/api/smartthings/devices`);
      setSmartThingsDevices(devicesRes.data.devices || []);
      
      // Start with all rooms COLLAPSED
      const collapsed = {};
      (devicesByRoomRes.data.rooms || []).forEach(room => {
        collapsed[room.roomName] = false; // false = collapsed
      });
      setExpandedRooms(collapsed);
      
      // Fetch clima data from SmartThings sensor (Temperatura living)
      try {
        const climaRes = await axios.get(`${API_URL}/api/smartthings/clima`);
        setClimaData(climaRes.data);
      } catch (e) {
        console.log('Clima sensor not available:', e.message);
      }
      
      // Fetch Ezviz cameras (may fail)
      try {
        const camerasRes = await axios.get(`${API_URL}/api/ezviz/cameras`);
        setEzvizCameras(camerasRes.data.cameras || []);
      } catch (e) {
        console.log('Ezviz not available:', e.message);
      }
      
      // Fetch weather
      const weatherRes = await axios.get(`${API_URL}/api/weather`);
      setWeather(weatherRes.data);
      
      // Fetch system status
      try {
        const statusRes = await axios.get(`${API_URL}/api/system/status`);
        setSystemStatus(statusRes.data);
      } catch (e) {
        // Calculate from devices
        setSystemStatus({
          ok: devicesRes.data.count || 0,
          attenzione: 0,
          critici: 0,
          totali: devicesRes.data.count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter devices by category
  const climaDevices = smartThingsDevices.filter(d => 
    d.name.toLowerCase().includes('condizionatore') || 
    d.name.toLowerCase().includes('temperatura') ||
    d.name.toLowerCase().includes('aria') ||
    d.capabilities?.includes('temperatureMeasurement')
  );

  const domoticaDevices = smartThingsDevices.filter(d => 
    !climaDevices.includes(d)
  );

  // Manutenzioni prossime
  const prossimeManutenzioni = manutenzioni
    .filter(m => m.stato === 'pianificata')
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Smart Building</h1>
              <p className="text-xs text-slate-400">Sistema Domotico Integrato</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status Badge */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-slate-300">{systemStatus.ok} OK</span>
              </div>
              {systemStatus.attenzione > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-slate-300">{systemStatus.attenzione}</span>
                </div>
              )}
              {systemStatus.critici > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-slate-300">{systemStatus.critici}</span>
                </div>
              )}
              <span className="text-xs text-slate-500 ml-2">Totali: {systemStatus.totali}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchData}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* System Status Card */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Activity size={16} />
                  Stato Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{systemStatus.ok}</p>
                    <p className="text-xs text-green-400/70">OK</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{systemStatus.attenzione}</p>
                    <p className="text-xs text-yellow-400/70">Attenzione</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{systemStatus.critici}</p>
                    <p className="text-xs text-red-400/70">Critici</p>
                  </div>
                  <div className="bg-slate-700/30 border border-slate-600/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-slate-300">{systemStatus.totali}</p>
                    <p className="text-xs text-slate-400">Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Access */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Zap size={16} />
                  Accesso Rapido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => onNavigate && onNavigate('elettrodomestici')}
                >
                  <Power size={16} className="mr-2" />
                  Elettrodomestici ({elettrodomestici.length})
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => onNavigate && onNavigate('manutenzioni')}
                >
                  <Wrench size={16} className="mr-2" />
                  Manutenzioni ({manutenzioni.length})
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => onNavigate && onNavigate('calendario')}
                >
                  <Calendar size={16} className="mr-2" />
                  Calendario
                </Button>
              </CardContent>
            </Card>

            {/* Prossime Manutenzioni */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Prossime Manutenzioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prossimeManutenzioni.length > 0 ? (
                  <div className="space-y-2">
                    {prossimeManutenzioni.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-800/50 rounded-lg">
                        <Clock size={14} className="text-cyan-400" />
                        <div className="flex-1 truncate">
                          <p className="text-white truncate">{m.descrizione}</p>
                          <p className="text-xs text-slate-400">{formatDateIT(m.data_programmata)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Nessuna manutenzione programmata</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Matterport + Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Matterport 3D Viewer */}
            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
              <div className="relative">
                <div className="absolute top-3 left-3 z-10">
                  <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                </div>
                <div className="aspect-video bg-slate-900">
                  <iframe
                    title="Matterport 3D"
                    src={`https://my.matterport.com/show/?m=${matterportSpaceId}&play=1`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="fullscreen; vr"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 bg-slate-900/50 border border-slate-800 p-1 rounded-xl">
                <TabsTrigger 
                  value="clima" 
                  className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 rounded-lg"
                >
                  <Thermometer size={16} className="mr-2" />
                  Clima
                </TabsTrigger>
                <TabsTrigger 
                  value="domotica"
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg"
                >
                  <Zap size={16} className="mr-2" />
                  Domotica
                </TabsTrigger>
                <TabsTrigger 
                  value="sicurezza"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg"
                >
                  <Shield size={16} className="mr-2" />
                  Sicurezza
                </TabsTrigger>
                <TabsTrigger 
                  value="meteo"
                  className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 rounded-lg"
                >
                  <Sun size={16} className="mr-2" />
                  Meteo
                </TabsTrigger>
              </TabsList>

              {/* CLIMA TAB */}
              <TabsContent value="clima" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Temperature Card - from SmartThings sensor */}
                  <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm text-green-400/70">Temperatura Interna</p>
                            {climaData?.online && (
                              <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                                LIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-5xl font-bold text-green-400 mt-2">
                            {climaData?.temperature !== null ? climaData?.temperature?.toFixed(1) : '--'}°C
                          </p>
                          <p className="text-sm text-slate-400 mt-2">
                            Umidità: {climaData?.humidity !== null ? climaData?.humidity : '--'}%
                          </p>
                          {climaData?.device_name && (
                            <p className="text-xs text-slate-500 mt-2">
                              📍 {climaData.device_name}
                            </p>
                          )}
                        </div>
                        <Thermometer size={64} className="text-green-500/30" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Climate Devices */}
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-400">Dispositivi Clima</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-16 bg-slate-800" />
                          <Skeleton className="h-16 bg-slate-800" />
                        </div>
                      ) : climaDevices.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {climaDevices.map(device => (
                            <DeviceCard key={device.id} device={device} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Nessun dispositivo clima trovato
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 24h Temperature Chart Placeholder */}
                  <Card className="md:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-slate-400">Temperatura 24h</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 flex items-center justify-center">
                        <div className="flex items-end gap-1 h-full w-full">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div 
                              key={i}
                              className="flex-1 bg-gradient-to-t from-green-500/50 to-green-400/30 rounded-t"
                              style={{ height: `${30 + Math.random() * 60}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* DOMOTICA TAB */}
              <TabsContent value="domotica" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">
                      Dispositivi SmartThings ({smartThingsDevices.length}) - {devicesByRoom.length} Stanze
                    </h3>
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                      <Wifi size={12} className="mr-1" /> Connesso
                    </Badge>
                  </div>
                  
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 bg-slate-800 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    // Stanze in colonne verticali
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {devicesByRoom.map((room) => {
                        // Get room icon based on name
                        const getRoomIcon = (name) => {
                          const n = name.toLowerCase();
                          if (n.includes('luci') || n.includes('luce')) return Lamp;
                          if (n.includes('aperto') || n.includes('esterno') || n.includes('giardino')) return Trees;
                          if (n.includes('acqua') || n.includes('irrigazione')) return Droplets;
                          if (n.includes('living') || n.includes('soggiorno') || n.includes('salotto')) return Armchair;
                          if (n.includes('accessi') || n.includes('cancello') || n.includes('ingresso')) return DoorOpen;
                          if (n.includes('studio') || n.includes('ufficio')) return Home;
                          return Home;
                        };
                        const RoomIcon = getRoomIcon(room.roomName);
                        const isExpanded = expandedRooms[room.roomName] === true;
                        
                        // Room card color based on type
                        const getRoomColor = (name) => {
                          const n = name.toLowerCase();
                          if (n.includes('luci')) return 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
                          if (n.includes('acqua')) return 'from-blue-500/20 to-cyan-500/10 border-blue-500/30';
                          if (n.includes('aperto')) return 'from-green-500/20 to-emerald-500/10 border-green-500/30';
                          if (n.includes('living')) return 'from-purple-500/20 to-violet-500/10 border-purple-500/30';
                          if (n.includes('accessi')) return 'from-red-500/20 to-orange-500/10 border-red-500/30';
                          if (n.includes('studio')) return 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30';
                          return 'from-slate-500/20 to-slate-600/10 border-slate-500/30';
                        };
                        
                        return (
                          <Card 
                            key={room.roomId || room.roomName} 
                            className={`bg-gradient-to-b ${getRoomColor(room.roomName)} overflow-hidden transition-all duration-300 ${isExpanded ? 'row-span-2' : ''}`}
                          >
                            <button
                              onClick={() => toggleRoom(room.roomName)}
                              className="w-full p-4 text-center hover:bg-white/5 transition-colors"
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-3 rounded-xl bg-slate-900/50">
                                  <RoomIcon size={28} className="text-white" />
                                </div>
                                <div>
                                  <h4 className="text-white font-medium text-sm">{room.roomName}</h4>
                                  <p className="text-xs text-slate-400 mt-1">{room.devices.length} dispositivi</p>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                  {isExpanded ? (
                                    <ChevronUp size={16} />
                                  ) : (
                                    <ChevronDown size={16} />
                                  )}
                                </div>
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="px-3 pb-4 space-y-2">
                                {room.devices.map(device => (
                                  <DeviceCard key={device.id} device={device} />
                                ))}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* SICUREZZA TAB */}
              <TabsContent value="sicurezza" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">
                      Telecamere Ezviz ({ezvizCameras.length})
                    </h3>
                    {ezvizCameras.length > 0 ? (
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        <CheckCircle size={12} className="mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                        <AlertTriangle size={12} className="mr-1" /> Non Configurato
                      </Badge>
                    )}
                  </div>

                  {ezvizCameras.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ezvizCameras.map(camera => (
                        <CameraCard key={camera.id} camera={camera} />
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardContent className="py-12 text-center">
                        <Camera size={48} className="mx-auto text-slate-600 mb-4" />
                        <p className="text-slate-400">Telecamere Ezviz non disponibili</p>
                        <p className="text-sm text-slate-500 mt-2">
                          L&apos;integrazione con Ezviz non è attualmente attiva.
                          <br />Verifica le credenziali o riprova più tardi.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Security Status */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Card className="bg-green-500/10 border-green-500/20">
                      <CardContent className="p-4 text-center">
                        <Shield size={24} className="mx-auto text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-green-400">OK</p>
                        <p className="text-xs text-green-400/70">Allarme</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <Lock size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-2xl font-bold text-white">2</p>
                        <p className="text-xs text-slate-400">Cancelli</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <Camera size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{ezvizCameras.length || 7}</p>
                        <p className="text-xs text-slate-400">Telecamere</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <Eye size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-2xl font-bold text-white">24/7</p>
                        <p className="text-xs text-slate-400">Monitoraggio</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* METEO TAB */}
              <TabsContent value="meteo" className="mt-4">
                {weather ? (
                  <div className="space-y-4">
                    {/* Current Weather */}
                    <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin size={16} className="text-orange-400" />
                              <span className="text-orange-400">{weather.current?.city || 'Nuoro'}</span>
                            </div>
                            <p className="text-6xl font-bold text-white">
                              {weather.current?.temperature}°
                            </p>
                            <p className="text-lg text-slate-300 mt-2">
                              {weather.current?.weather_icon} {weather.current?.weather_description}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Droplets size={14} />
                                {weather.current?.humidity}%
                              </span>
                              <span className="flex items-center gap-1">
                                <Wind size={14} />
                                {weather.current?.wind_speed} km/h
                              </span>
                            </div>
                          </div>
                          <div className="text-orange-400/50">
                            <WeatherIcon code={weather.current?.weather_code} size={96} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 7 Day Forecast */}
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-sm text-slate-400">Previsioni 7 Giorni</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-2">
                          {weather.forecast?.map((day, i) => (
                            <div key={i} className="text-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                              <p className="text-xs text-slate-400 mb-2">
                                {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                              </p>
                              <p className="text-2xl mb-2">{day.weather_icon}</p>
                              <p className="text-sm font-medium text-white">{Math.round(day.temp_max)}°</p>
                              <p className="text-xs text-slate-500">{Math.round(day.temp_min)}°</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="py-12 text-center">
                      <Cloud size={48} className="mx-auto text-slate-600 mb-4" />
                      <p className="text-slate-400">Caricamento dati meteo...</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
