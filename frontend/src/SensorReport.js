import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Thermometer,
  Droplets,
  Zap,
  Battery,
  Activity,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BarChart3,
  LineChart as LineChartIcon,
  Settings,
  Play,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Sensor type configurations
const SENSOR_TYPES = {
  temperature: {
    name: "Temperatura",
    icon: Thermometer,
    unit: "°C",
    color: "#ef4444",
    gradient: ["#fca5a5", "#ef4444"],
    thresholds: { low: 18, high: 25 }
  },
  humidity: {
    name: "Umidità",
    icon: Droplets,
    unit: "%",
    color: "#06b6d4",
    gradient: ["#a5f3fc", "#06b6d4"],
    thresholds: { low: 30, high: 60 }
  },
  power: {
    name: "Potenza",
    icon: Zap,
    unit: "W",
    color: "#eab308",
    gradient: ["#fef08a", "#eab308"],
    thresholds: { low: 0, high: 1000 }
  },
  energy: {
    name: "Energia",
    icon: Activity,
    unit: "kWh",
    color: "#22c55e",
    gradient: ["#bbf7d0", "#22c55e"],
    thresholds: { low: 0, high: 100 }
  },
  battery: {
    name: "Batteria",
    icon: Battery,
    unit: "%",
    color: "#8b5cf6",
    gradient: ["#ddd6fe", "#8b5cf6"],
    thresholds: { low: 20, high: 80 }
  }
};

// Time period options
const TIME_PERIODS = [
  { value: "1", label: "Ultima ora" },
  { value: "6", label: "Ultime 6 ore" },
  { value: "12", label: "Ultime 12 ore" },
  { value: "24", label: "Ultime 24 ore" },
  { value: "48", label: "Ultimi 2 giorni" },
  { value: "168", label: "Ultima settimana" },
  { value: "720", label: "Ultimo mese" }
];

// Interval options
const INTERVAL_OPTIONS = [
  { value: "minute", label: "Minuti" },
  { value: "hour", label: "Ore" },
  { value: "day", label: "Giorni" }
];

// Device name mapping - fallback for technical names
const DEVICE_NAME_MAP = {
  "SNZB-02D": "Sensore Temperatura/Umidità",
  "c2c-humidity": "Sensore Umidità",
  "c2c-switch": "Interruttore Smart",
  "switchTemperatureSensor": "Sensore Temperatura Aria"
};

// Helper to get friendly device name
const getFriendlyDeviceName = (deviceName) => {
  if (!deviceName) return "Sensore";
  
  // Check if it's a technical name that needs mapping
  if (DEVICE_NAME_MAP[deviceName]) {
    return DEVICE_NAME_MAP[deviceName];
  }
  
  // If it starts with technical prefixes, try to clean it up
  if (deviceName.startsWith("c2c-") || deviceName.startsWith("switch")) {
    return deviceName
      .replace("c2c-", "")
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  // Return as-is if it looks like a real name
  return deviceName;
};

// Sensor Card Component
const SensorCard = ({ sensor, onClick, isSelected }) => {
  const config = SENSOR_TYPES[sensor.sensor_type] || SENSOR_TYPES.temperature;
  const Icon = config.icon;
  
  // Determine trend
  const getTrend = () => {
    if (sensor.avg > sensor.current_value) return { icon: TrendingDown, color: "text-blue-500", label: "In calo" };
    if (sensor.avg < sensor.current_value) return { icon: TrendingUp, color: "text-red-500", label: "In aumento" };
    return { icon: Minus, color: "text-gray-500", label: "Stabile" };
  };
  
  const trend = getTrend();
  const TrendIcon = trend.icon;
  
  // Value status
  const getValueStatus = () => {
    const value = sensor.current_value;
    if (value < config.thresholds.low) return "text-blue-500";
    if (value > config.thresholds.high) return "text-orange-500";
    return "text-green-500";
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-cyan-500 bg-cyan-500/10' : 'hover:bg-slate-50'
      }`}
      onClick={() => onClick(sensor)}
      data-testid={`sensor-card-${sensor.device_id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <p className="font-medium text-sm truncate max-w-[150px]" title={sensor.device_name}>
                {getFriendlyDeviceName(sensor.device_name)}
              </p>
              <p className="text-xs text-gray-500">{config.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getValueStatus()}`}>
              {sensor.current_value !== null ? sensor.current_value : "--"}
              <span className="text-sm font-normal text-gray-500">{config.unit}</span>
            </p>
            <div className="flex items-center gap-1 justify-end text-xs">
              <TrendIcon className={`h-3 w-3 ${trend.color}`} />
              <span className={trend.color}>{trend.label}</span>
            </div>
          </div>
        </div>
        
        {/* Mini stats */}
        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Min</p>
            <p className="text-sm font-medium text-blue-600">{sensor.min}{config.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Media</p>
            <p className="text-sm font-medium">{sensor.avg}{config.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Max</p>
            <p className="text-sm font-medium text-red-600">{sensor.max}{config.unit}</p>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{sensor.readings_count} letture</span>
          <span>
            <Clock className="h-3 w-3 inline mr-1" />
            {new Date(sensor.last_update).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Chart Component
const SensorChart = ({ data, sensorType, title }) => {
  const config = SENSOR_TYPES[sensorType] || SENSOR_TYPES.temperature;
  
  if (!data || data.labels?.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nessun dato disponibile</p>
          <p className="text-sm">Avvia la raccolta dati per visualizzare i grafici</p>
        </div>
      </div>
    );
  }

  // Format data for recharts
  const chartData = data.labels.map((label, index) => ({
    time: label.split('T')[1] || label, // Show only time part if available
    fullTime: label,
    avg: data.datasets.avg[index],
    min: data.datasets.min[index],
    max: data.datasets.max[index]
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${sensorType}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value.substring(0, 5)}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `${value}${config.unit}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value, name) => [`${value}${config.unit}`, name === 'avg' ? 'Media' : name === 'min' ? 'Min' : 'Max']}
            labelFormatter={(label, payload) => payload[0]?.payload?.fullTime || label}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="avg"
            stroke={config.color}
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
  );
};

export default function SensorReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState("24");
  const [interval, setInterval] = useState("hour");
  const [activeTab, setActiveTab] = useState("overview");

  // Load report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sensors/report?hours=${timePeriod}`);
      setReport(response.data);
      
      // Auto-select first sensor if none selected
      if (!selectedSensor && response.data.sensors?.length > 0) {
        const firstSensor = response.data.sensors[0];
        setSelectedSensor(firstSensor);
        loadChartData(firstSensor.device_id, firstSensor.sensor_type);
      }
    } catch (error) {
      console.error("Error loading report:", error);
      // If no data, show empty state
      setReport({ sensors: [], generated_at: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  // Load chart data for selected sensor
  const loadChartData = async (deviceId, sensorType) => {
    setChartLoading(true);
    try {
      const response = await axios.get(
        `${API}/sensors/chart-data/${deviceId}?sensor_type=${sensorType}&hours=${timePeriod}&interval=${interval}`
      );
      setChartData(response.data);
    } catch (error) {
      console.error("Error loading chart data:", error);
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  };

  // Collect sensor data now
  const collectData = async () => {
    setCollecting(true);
    try {
      const response = await axios.post(`${API}/sensors/collect`);
      toast.success(`Raccolte ${response.data.readings_stored} letture!`);
      await loadReport();
    } catch (error) {
      console.error("Error collecting data:", error);
      toast.error("Errore nella raccolta dati");
    } finally {
      setCollecting(false);
    }
  };

  // Handle sensor selection
  const handleSensorSelect = (sensor) => {
    setSelectedSensor(sensor);
    loadChartData(sensor.device_id, sensor.sensor_type);
  };

  // Initial load
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Reload chart when interval changes
  useEffect(() => {
    if (selectedSensor) {
      loadChartData(selectedSensor.device_id, selectedSensor.sensor_type);
    }
  }, [interval]);

  // Group sensors by type
  const groupedSensors = report?.sensors?.reduce((acc, sensor) => {
    const type = sensor.sensor_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(sensor);
    return acc;
  }, {}) || {};

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Caricamento report sensori...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sensor-report">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Report Sensori
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Storico e analisi dei valori dei sensori
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time period selector */}
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Interval selector */}
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-[120px]">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map(i => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Refresh button */}
          <Button variant="outline" onClick={loadReport} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          
          {/* Collect data button */}
          <Button onClick={collectData} disabled={collecting}>
            {collecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Raccogli Ora
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {(!report?.sensors || report.sensors.length === 0) && (
        <Card className="p-12 text-center">
          <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Nessun Dato Storico</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Non ci sono ancora letture dei sensori nel database. 
            Clicca "Raccogli Ora" per iniziare a raccogliere dati dai tuoi sensori SmartThings.
          </p>
          <Button onClick={collectData} disabled={collecting} size="lg">
            {collecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Avvia Raccolta Dati
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Suggerimento: Per dati continui, configura una raccolta automatica ogni 5 minuti
          </p>
        </Card>
      )}

      {/* Main content */}
      {report?.sensors?.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="temperature" className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Temperatura
            </TabsTrigger>
            <TabsTrigger value="humidity" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Umidità
            </TabsTrigger>
            {groupedSensors.power && (
              <TabsTrigger value="power" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Potenza
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sensor Cards */}
              <div className="lg:col-span-1">
                <h3 className="font-medium mb-3 text-gray-700">Sensori Attivi</h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {report.sensors.map((sensor, idx) => (
                      <SensorCard
                        key={`${sensor.device_id}-${sensor.sensor_type}-${idx}`}
                        sensor={sensor}
                        onClick={handleSensorSelect}
                        isSelected={selectedSensor?.device_id === sensor.device_id && selectedSensor?.sensor_type === sensor.sensor_type}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Chart */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <LineChartIcon className="h-5 w-5 text-blue-600" />
                          {selectedSensor ? (
                            <>
                              {selectedSensor.device_name} - {SENSOR_TYPES[selectedSensor.sensor_type]?.name || selectedSensor.sensor_type}
                            </>
                          ) : (
                            "Seleziona un sensore"
                          )}
                        </CardTitle>
                        <CardDescription>
                          {TIME_PERIODS.find(p => p.value === timePeriod)?.label} - Intervallo: {INTERVAL_OPTIONS.find(i => i.value === interval)?.label}
                        </CardDescription>
                      </div>
                      {chartLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SensorChart 
                      data={chartData}
                      sensorType={selectedSensor?.sensor_type || 'temperature'}
                      title={selectedSensor?.device_name}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Temperature Tab */}
          <TabsContent value="temperature" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSensors.temperature?.map((sensor, idx) => (
                <SensorCard
                  key={`temp-${sensor.device_id}-${idx}`}
                  sensor={sensor}
                  onClick={handleSensorSelect}
                  isSelected={selectedSensor?.device_id === sensor.device_id}
                />
              ))}
            </div>
            {selectedSensor?.sensor_type === 'temperature' && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Andamento Temperatura - {selectedSensor.device_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SensorChart data={chartData} sensorType="temperature" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Humidity Tab */}
          <TabsContent value="humidity" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSensors.humidity?.map((sensor, idx) => (
                <SensorCard
                  key={`hum-${sensor.device_id}-${idx}`}
                  sensor={sensor}
                  onClick={handleSensorSelect}
                  isSelected={selectedSensor?.device_id === sensor.device_id}
                />
              ))}
            </div>
            {selectedSensor?.sensor_type === 'humidity' && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Andamento Umidità - {selectedSensor.device_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SensorChart data={chartData} sensorType="humidity" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Power Tab */}
          <TabsContent value="power" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSensors.power?.map((sensor, idx) => (
                <SensorCard
                  key={`pow-${sensor.device_id}-${idx}`}
                  sensor={sensor}
                  onClick={handleSensorSelect}
                  isSelected={selectedSensor?.device_id === sensor.device_id}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Info footer */}
      {report && (
        <div className="text-xs text-gray-400 flex items-center justify-between">
          <span>
            Report generato: {new Date(report.generated_at).toLocaleString('it-IT')}
          </span>
          <span>
            {report.sensors?.length || 0} sensori monitorati
          </span>
        </div>
      )}
    </div>
  );
}
