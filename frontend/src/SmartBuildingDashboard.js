import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { formatDateIT } from "./TicketCalendarQR";
import MatterportViewer from "./MatterportViewer";
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
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from "recharts";

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

// Sensor History Dialog Component
const SensorHistoryDialog = ({ device, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("24");
  const [sensorType, setSensorType] = useState("temperature");

  const hasTemp = device?.capabilities?.includes('temperatureMeasurement');
  const hasHumidity = device?.capabilities?.includes('relativeHumidityMeasurement');

  useEffect(() => {
    if (open && device) {
      fetchData();
    }
  }, [open, device, period, sensorType]);

  const fetchData = async () => {
    if (!device?.id) return;
    setLoading(true);
    try {
      // Prima raccogli i dati se necessario
      await axios.post(`${API_URL}/api/sensors/collect`);
      
      // Poi ottieni i dati del grafico
      const chartResponse = await axios.get(
        `${API_URL}/api/sensors/chart-data/${device.id}?sensor_type=${sensorType}&hours=${period}&interval=hour`
      );
      setChartData(chartResponse.data);

      // Ottieni le statistiche
      const statsResponse = await axios.get(
        `${API_URL}/api/sensors/stats/${device.id}?sensor_type=${sensorType}&hours=${period}`
      );
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error("Error fetching sensor history:", error);
      toast.error("Errore nel caricamento dello storico");
    } finally {
      setLoading(false);
    }
  };

  // Formatta i dati per il grafico
  const formatChartData = () => {
    if (!chartData?.labels) return [];
    return chartData.labels.map((label, index) => ({
      time: label.split('T')[1]?.substring(0, 5) || label,
      fullTime: label,
      avg: chartData.datasets.avg[index],
      min: chartData.datasets.min[index],
      max: chartData.datasets.max[index]
    }));
  };

  const getUnit = () => sensorType === 'temperature' ? '°C' : '%';
  const getColor = () => sensorType === 'temperature' ? '#ef4444' : '#06b6d4';
  const getTitle = () => sensorType === 'temperature' ? 'Temperatura' : 'Umidità';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {sensorType === 'temperature' ? (
              <Thermometer className="h-6 w-6 text-red-400" />
            ) : (
              <Droplets className="h-6 w-6 text-cyan-400" />
            )}
            Storico {getTitle()} - {device?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controlli */}
          <div className="flex flex-wrap gap-3">
            {/* Selettore tipo sensore */}
            {hasTemp && hasHumidity && (
              <Select value={sensorType} onValueChange={setSensorType}>
                <SelectTrigger className="w-[160px] bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="temperature">🌡️ Temperatura</SelectItem>
                  <SelectItem value="humidity">💧 Umidità</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Selettore periodo */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="6">Ultime 6 ore</SelectItem>
                <SelectItem value="12">Ultime 12 ore</SelectItem>
                <SelectItem value="24">Ultime 24 ore</SelectItem>
                <SelectItem value="48">Ultimi 2 giorni</SelectItem>
                <SelectItem value="168">Ultima settimana</SelectItem>
              </SelectContent>
            </Select>

            {/* Pulsante aggiorna */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
              className="border-slate-600"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>

          {/* Statistiche */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                <p className="text-xs text-blue-300 mb-1">Minima</p>
                <p className="text-2xl font-bold text-blue-400">{stats.min}{getUnit()}</p>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4 text-center">
                <p className="text-xs text-green-300 mb-1">Media</p>
                <p className="text-2xl font-bold text-green-400">{stats.avg}{getUnit()}</p>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 text-center">
                <p className="text-xs text-red-300 mb-1">Massima</p>
                <p className="text-2xl font-bold text-red-400">{stats.max}{getUnit()}</p>
              </div>
            </div>
          )}

          {/* Grafico */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-cyan-400" />
                  <p className="text-slate-400">Caricamento dati...</p>
                </div>
              </div>
            ) : chartData?.labels?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-${sensorType}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getColor()} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={getColor()} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      stroke="#4b5563"
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `${value}${getUnit()}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value, name) => [`${value}${getUnit()}`, name === 'avg' ? 'Media' : name === 'min' ? 'Min' : 'Max']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke={getColor()}
                      fillOpacity={1}
                      fill={`url(#gradient-${sensorType})`}
                      name="Media"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="min"
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Min"
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Max"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-400">Nessun dato storico disponibile</p>
                  <p className="text-xs text-slate-500 mt-1">I dati verranno raccolti automaticamente</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchData}
                    className="mt-4 border-cyan-500/50 text-cyan-400"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Raccogli dati ora
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info aggiuntive */}
          {stats && (
            <div className="text-xs text-slate-500 flex justify-between">
              <span>{stats.count} letture nel periodo</span>
              <span>Periodo: {stats.period_start?.split('T')[0]} - {stats.period_end?.split('T')[0]}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// SmartThings Device Card
const DeviceCard = ({ device, onToggle, onShowHistory }) => {
  // Leggi lo stato iniziale dal dispositivo (se disponibile)
  const initialState = device.status?.switch === 'on' || device.switchState === 'on' || false;
  const [isOn, setIsOn] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const Icon = getDeviceIcon(device.name, device.capabilities);
  
  // Aggiorna stato quando cambia il dispositivo
  useEffect(() => {
    const newState = device.status?.switch === 'on' || device.switchState === 'on' || false;
    setIsOn(newState);
  }, [device]);

  // Carica dati sensori per questo dispositivo
  useEffect(() => {
    const fetchSensorData = async () => {
      if (device.capabilities?.includes('temperatureMeasurement') || 
          device.capabilities?.includes('relativeHumidityMeasurement')) {
        try {
          const response = await axios.get(`${API_URL}/api/smartthings/device/${device.id}/status`);
          const main = response.data?.components?.main || {};
          setSensorData({
            temperature: main.temperatureMeasurement?.temperature?.value,
            temperatureUnit: main.temperatureMeasurement?.temperature?.unit || 'C',
            humidity: main.relativeHumidityMeasurement?.humidity?.value
          });
        } catch (error) {
          console.log(`Could not fetch sensor data for ${device.name}`);
        }
      }
    };
    fetchSensorData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchSensorData, 60000);
    return () => clearInterval(interval);
  }, [device.id, device.capabilities, device.name]);
  
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

  const handleCardClick = () => {
    if ((hasTemp || hasHumidity) && onShowHistory) {
      onShowHistory(device);
    }
  };

  // Determina il colore della temperatura
  const getTempColor = (temp) => {
    if (temp === undefined || temp === null) return 'text-slate-400';
    const numTemp = Number(temp);
    if (isNaN(numTemp)) return 'text-slate-400';
    if (numTemp > 26) return 'text-orange-400';
    if (numTemp < 18) return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <div 
      className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300 group ${(hasTemp || hasHumidity) ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      data-testid={`device-card-${device.id}`}
    >
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
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <h3 className="text-sm font-medium text-white mb-1 truncate" title={device.name}>{device.name}</h3>
      
      {/* Valori sensori */}
      {(hasTemp || hasHumidity) && sensorData && (
        <div className="flex flex-wrap gap-2 mt-2">
          {hasTemp && sensorData.temperature !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 ${getTempColor(sensorData.temperature)}`}>
              <Thermometer size={14} />
              <span className="text-sm font-bold">{sensorData.temperature}°{sensorData.temperatureUnit}</span>
            </div>
          )}
          {hasHumidity && sensorData.humidity !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-cyan-400">
              <Droplets size={14} />
              <span className="text-sm font-bold">{sensorData.humidity}%</span>
            </div>
          )}
        </div>
      )}
      
      {/* Stato o tipo */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">
          {hasTemp && !sensorData && <span className="text-cyan-400">Sensore Temp</span>}
          {hasSwitch && !hasTemp && (isOn ? 'Acceso' : 'Spento')}
        </p>
        {(hasTemp || hasHumidity) && onShowHistory && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-cyan-400 hover:bg-cyan-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onShowHistory(device);
            }}
          >
            <BarChart3 size={12} className="mr-1" />
            Storico
          </Button>
        )}
      </div>
    </div>
  );
};

// Ezviz Camera Card with periodic snapshots
const CameraCard = ({ camera, ezvizToken }) => {
  const isOnline = camera?.status === 'online';
  const [imageError, setImageError] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState(camera?.image_url || null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  
  // Deep link per aprire l'app Ezviz
  const openEzvizApp = () => {
    const ezvizAppScheme = `ezviz://open?deviceSerial=${camera?.serial}`;
    const ezvizWebUrl = `https://www.ezvizlife.com/`;
    window.location.href = ezvizAppScheme;
    setTimeout(() => {
      window.open(ezvizWebUrl, '_blank');
    }, 2000);
  };

  // Fetch snapshot
  const fetchSnapshot = async (showLoading = false) => {
    if (!camera?.serial) return;
    
    if (showLoading) setLoading(true);
    
    try {
      // Add timestamp to prevent caching
      const response = await axios.get(`${API_URL}/api/ezviz/camera/${camera.serial}/capture`);
      if (response.data?.url || response.data?.image_url) {
        const newUrl = (response.data.url || response.data.image_url) + '&t=' + Date.now();
        setSnapshotUrl(newUrl);
        setImageError(false);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.log('Snapshot error:', error.message);
      // Try alternative endpoint
      try {
        const altResponse = await axios.get(`${API_URL}/api/ezviz/camera/${camera.serial}/snapshot`);
        if (altResponse.data?.image_url) {
          setSnapshotUrl(altResponse.data.image_url + '&t=' + Date.now());
          setImageError(false);
          setLastUpdate(new Date());
        }
      } catch (e) {
        // Silent fail for periodic updates
      }
    } finally {
      setLoading(false);
    }
  };

  // Start live mode (periodic snapshots)
  const startLive = () => {
    setIsLive(true);
    fetchSnapshot(true);
    
    // Update every 5 seconds
    intervalRef.current = setInterval(() => {
      fetchSnapshot(false);
    }, 5000);
  };

  // Stop live mode
  const stopLive = () => {
    setIsLive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format last update time
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((new Date() - lastUpdate) / 1000);
    if (seconds < 5) return 'Ora';
    if (seconds < 60) return `${seconds}s fa`;
    return `${Math.floor(seconds / 60)}m fa`;
  };

  // Update the "time ago" display
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (isLive) {
      const timer = setInterval(() => forceUpdate(n => n + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isLive]);
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-red-500/30 transition-all duration-300">
      {/* Image Area */}
      <div className="aspect-video bg-slate-900 relative">
        {snapshotUrl && !imageError ? (
          <img 
            src={snapshotUrl} 
            alt={camera?.name}
            className="w-full h-full object-cover cursor-pointer"
            onError={() => setImageError(true)}
            onClick={isLive ? stopLive : startLive}
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer"
            onClick={startLive}
          >
            <Camera size={48} className="text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Clicca per visualizzare</p>
          </div>
        )}
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
          </div>
        )}
        
        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-red-500 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white mr-1 animate-ping"></span>
              LIVE
            </Badge>
          </div>
        )}
        
        {/* Status badge (when not live) */}
        {!isLive && (
          <div className="absolute top-2 left-2 z-20">
            <Badge variant={isOnline ? "default" : "destructive"} className={isOnline ? "bg-green-500" : ""}>
              <span className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-white' : 'bg-red-300'}`}></span>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </Badge>
          </div>
        )}
        
        {/* Model */}
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <span className="text-xs bg-black/50 px-2 py-1 rounded text-white">{camera?.model || 'Camera'}</span>
        </div>
        
        {/* Last update time */}
        {isLive && lastUpdate && (
          <div className="absolute bottom-2 left-2 z-20">
            <span className="text-xs bg-black/70 px-2 py-1 rounded text-white">
              Aggiornato: {formatLastUpdate()}
            </span>
          </div>
        )}
        
        {/* Play overlay */}
        {!isLive && !loading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={startLive}
          >
            <div className="bg-red-500/80 rounded-full p-3">
              <Play size={24} className="text-white ml-1" />
            </div>
          </div>
        )}
        
        {/* Stop button */}
        {isLive && (
          <div 
            className="absolute bottom-2 right-2 cursor-pointer z-20"
            onClick={stopLive}
          >
            <div className="bg-red-500/80 rounded-full p-2 hover:bg-red-600">
              <X size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white truncate">{camera?.name || 'Camera'}</h3>
            <p className="text-xs text-slate-400">{camera?.serial || ''}</p>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2 mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className={`flex-1 text-xs ${isLive ? 'border-red-500 text-red-400 hover:bg-red-500/20' : 'border-green-500/50 text-green-400 hover:bg-green-500/20'}`}
            onClick={isLive ? stopLive : startLive}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                Caricamento...
              </>
            ) : isLive ? (
              <>
                <X size={12} className="mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play size={12} className="mr-1" />
                Live
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 text-xs border-slate-500/50 text-slate-400 hover:bg-slate-500/20"
            onClick={openEzvizApp}
          >
            <ExternalLink size={12} className="mr-1" />
            App
          </Button>
        </div>
      </div>
    </div>
  );
}; 

// Main Dashboard Component
export default function SmartBuildingDashboard({ onNavigate, manutenzioni = [], elettrodomestici = [], currentUser }) {
  const [activeTab, setActiveTab] = useState('clima');
  const [smartThingsDevices, setSmartThingsDevices] = useState([]);
  const [devicesByRoom, setDevicesByRoom] = useState([]);
  const [ezvizCameras, setEzvizCameras] = useState([]);
  const [ezvizToken, setEzvizToken] = useState(null);
  const [weather, setWeather] = useState(null);
  const [climaData, setClimaData] = useState(null); // Dati sensore temperatura SmartThings
  const [systemStatus, setSystemStatus] = useState({ ok: 0, attenzione: 0, critici: 0, totali: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [matterportTags, setMatterportTags] = useState([]);
  
  // Get Matterport space ID based on user - memoized to update when user changes
  const matterportSpaceId = useMemo(() => {
    // If user has assigned space, use it
    if (currentUser?.matterport_space_id) {
      console.log("Using user's Matterport space:", currentUser.matterport_space_id);
      return currentUser.matterport_space_id;
    }
    // Fallback to env variable or default
    const fallbackId = process.env.REACT_APP_MATTERPORT_SPACE_ID || "j1r4zUjanif";
    console.log("Using fallback Matterport space:", fallbackId);
    return fallbackId;
  }, [currentUser?.matterport_space_id]);
  
  // Check if user has MPSKIN URL configured
  const mpskinUrl = useMemo(() => {
    if (currentUser?.mpskin_url) {
      console.log("Using user's MPSKIN URL:", currentUser.mpskin_url);
      return currentUser.mpskin_url;
    }
    return null;
  }, [currentUser?.mpskin_url]);
  
  const matterportRef = useRef(null);
  
  // State per dialog storico sensori
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState(null);

  // Apri storico sensore
  const handleShowHistory = (device) => {
    setSelectedDeviceForHistory(device);
    setHistoryDialogOpen(true);
  };

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
      // Fetch SmartThings devices WITH STATES AND SENSORS
      const devicesRes = await axios.get(`${API_URL}/api/smartthings/devices-with-sensors`);
      const devices = devicesRes.data.devices || [];
      const sensorValues = devicesRes.data.sensors || {};
      const deviceStates = devicesRes.data.states || {};
      
      // Enrich devices with sensor data
      const enrichedDevices = devices.map(d => ({
        ...d,
        switchState: deviceStates[d.id] || null,
        sensorData: sensorValues[d.id] || null
      }));
      setSmartThingsDevices(enrichedDevices);
      
      // Also fetch devices grouped by room
      try {
        const devicesByRoomRes = await axios.get(`${API_URL}/api/smartthings/devices-by-room`);
        setDevicesByRoom(devicesByRoomRes.data.rooms || []);
        
        // Start with all rooms COLLAPSED
        const collapsed = {};
        (devicesByRoomRes.data.rooms || []).forEach(room => {
          collapsed[room.roomName] = false; // false = collapsed
        });
        setExpandedRooms(collapsed);
      } catch (e) {
        console.log('Devices by room not available:', e.message);
      }
      
      // Fetch clima data from SmartThings sensor (Temperatura living)
      try {
        const climaRes = await axios.get(`${API_URL}/api/smartthings/clima`);
        setClimaData(climaRes.data);
      } catch (e) {
        console.log('Clima sensor not available:', e.message);
      }
      
      // Fetch Ezviz cameras and token (may fail)
      try {
        const [camerasRes, tokenRes] = await Promise.all([
          axios.get(`${API_URL}/api/ezviz/cameras`),
          axios.get(`${API_URL}/api/ezviz/access-token`).catch(() => null)
        ]);
        setEzvizCameras(camerasRes.data.cameras || []);
        if (tokenRes?.data?.accessToken) {
          setEzvizToken(tokenRes.data.accessToken);
        }
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
    d.name.toLowerCase().includes('temp ') ||
    d.name.toLowerCase().includes('aria') ||
    d.capabilities?.includes('temperatureMeasurement') ||
    d.sensorData?.temperature != null  // Include devices with temperature data from eWeLink
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

          {/* Main Content - Matterport/MPSKIN + Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {/* 3D Viewer - MPSKIN or Matterport based on user config */}
            {mpskinUrl ? (
              /* MPSKIN Iframe Viewer */
              <div className="relative bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden" style={{ height: '400px' }}>
                <iframe
                  src={`${mpskinUrl}${mpskinUrl.includes('?') ? '&' : '?'}play=1`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  allow="xr-spatial-tracking"
                  title="MPSKIN Tour"
                  className="w-full h-full"
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600/80 text-white text-xs rounded flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  MPSKIN Tour
                </div>
              </div>
            ) : (
              /* Native Matterport Viewer */
              <MatterportViewer
                ref={matterportRef}
                spaceId={matterportSpaceId}
                onSdkReady={(sdk) => {
                  console.log("Matterport SDK pronto per l'uso", sdk);
                }}
                onTagsLoaded={(tags) => {
                  console.log("Mattertags caricati:", tags);
                  setMatterportTags(tags);
                }}
                className="bg-slate-900/50 border border-slate-800 rounded-xl"
              />
            )}

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
                  {/* Sensori Temperatura - Card grande con tutti i sensori */}
                  <Card className="md:col-span-2 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-green-400/70 flex items-center gap-2">
                          <Thermometer size={16} />
                          Sensori Temperatura
                          {climaData?.online && (
                            <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                              LIVE
                            </Badge>
                          )}
                        </CardTitle>
                        <span className="text-xs text-slate-500">{climaDevices.length} sensori attivi</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[1,2,3,4,5,6].map(i => (
                            <Skeleton key={i} className="h-24 bg-slate-800/50 rounded-xl" />
                          ))}
                        </div>
                      ) : climaDevices.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {climaDevices.slice(0, 6).map((device, idx) => {
                            // Mappa nomi descrittivi per i sensori
                            const sensorNames = {
                              'switchTemperatureSensor': 'Living Room',
                              'c2c-humidity': idx === 0 ? 'Camera Letto' : idx === 1 ? 'Studio' : 'Esterno',
                              '[room a/c] Samsung': 'Condizionatore',
                              'SNZB-02D': idx === 0 ? 'Soggiorno' : idx === 1 ? 'Cucina' : 'Bagno'
                            };
                            
                            // Usa nome personalizzato o quello del dispositivo
                            let displayName = device.name;
                            if (sensorNames[device.name]) {
                              displayName = sensorNames[device.name];
                            } else if (device.name?.includes('SNZB') || device.name?.includes('c2c-')) {
                              displayName = `Sensore ${idx + 1}`;
                            }
                            
                            return (
                              <div 
                                key={device.id}
                                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-green-500/30 transition-all cursor-pointer group"
                                onClick={() => handleShowHistory(device)}
                                data-testid={`sensor-${device.id}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs text-slate-400 truncate max-w-[100px]" title={displayName}>
                                      {displayName}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-cyan-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowHistory(device);
                                    }}
                                  >
                                    <BarChart3 size={12} />
                                  </Button>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-bold text-green-400">
                                    {device.sensorData?.temperature != null ? Number(device.sensorData.temperature).toFixed(1) : '--'}
                                  </span>
                                  <span className="text-sm text-green-400/70">°C</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Droplets size={12} className="text-cyan-400" />
                                  <span className="text-xs text-cyan-400">
                                    {device.sensorData?.humidity != null ? Number(device.sensorData.humidity) : '--'}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Thermometer size={48} className="mx-auto text-slate-600 mb-2" />
                          <p className="text-sm text-slate-500">Nessun sensore temperatura trovato</p>
                        </div>
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
                      Dispositivi ({smartThingsDevices.length}) {devicesByRoom.length > 0 ? `- ${devicesByRoom.length} Stanze` : ''}
                    </h3>
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                      <Wifi size={12} className="mr-1" /> {domoticaDevices.length > 0 ? 'Connesso' : 'eWeLink'}
                    </Badge>
                  </div>
                  
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 bg-slate-800 rounded-xl" />
                      ))}
                    </div>
                  ) : devicesByRoom.length > 0 ? (
                    // Stanze in colonne verticali (SmartThings mode)
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
                                  <DeviceCard key={device.id} device={device} onShowHistory={handleShowHistory} />
                                ))}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  ) : domoticaDevices.length > 0 ? (
                    // Modalita eWeLink - mostra dispositivi senza stanze
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {domoticaDevices.map(device => (
                        <DeviceCard 
                          key={device.id} 
                          device={device} 
                          onShowHistory={handleShowHistory}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardContent className="py-12 text-center">
                        <Wifi size={48} className="mx-auto text-slate-600 mb-4" />
                        <p className="text-slate-400">Nessun dispositivo domotica trovato</p>
                        <p className="text-sm text-slate-500 mt-2">
                          I sensori temperatura sono visibili nel tab Clima
                        </p>
                      </CardContent>
                    </Card>
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
                        <CameraCard key={camera.id} camera={camera} ezvizToken={ezvizToken} />
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

      {/* Dialog Storico Sensori */}
      <SensorHistoryDialog
        device={selectedDeviceForHistory}
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
      />
    </div>
  );
}
