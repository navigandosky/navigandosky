import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Car,
  MapPin,
  Navigation,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Satellite,
  Clock,
  RefreshCw,
  AlertCircle,
  Gauge,
  Compass,
  Settings,
  ChevronRight,
  Loader2,
  Map as MapIcon,
  Route,
  List,
  Maximize2,
  Minimize2,
  History,
  Calendar,
  Play,
  Square,
  ChevronLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "./i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom vehicle icons
const createVehicleIcon = (isMoving, isConnected) => {
  const color = isMoving ? '#3b82f6' : (isConnected ? '#22c55e' : '#6b7280');
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8A3 3 0 0 0 2 12.5V16c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <path d="M9 17h6"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    </div>`,
    className: 'vehicle-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Map bounds fitter component
const MapBoundsFitter = ({ vehicles, tripPositions }) => {
  const map = useMap();
  
  useEffect(() => {
    const points = [];
    
    // Add vehicle positions
    if (vehicles && vehicles.length > 0) {
      vehicles.filter(v => v.lat && v.lng).forEach(v => {
        points.push([v.lat, v.lng]);
      });
    }
    
    // Add trip positions
    if (tripPositions && tripPositions.length > 0) {
      tripPositions.forEach(p => {
        if (p.lat && p.lng) {
          points.push([p.lat, p.lng]);
        }
      });
    }
    
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [vehicles, tripPositions, map]);
  
  return null;
};

// Trip History Panel Component
const TripHistoryPanel = ({ vehicle, authToken, onShowOnMap }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expanded, setExpanded] = useState(true);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start, stop;
    
    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        stop = now;
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        stop = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        stop = now;
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        stop = now;
        break;
      case 'custom':
        if (customStart && customEnd) {
          start = new Date(customStart);
          stop = new Date(customEnd);
          stop.setHours(23, 59, 59);
        } else {
          return null;
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        stop = now;
    }
    
    return { start: start.getTime(), stop: stop.getTime() };
  }, [dateRange, customStart, customEnd]);

  const loadTrips = useCallback(async () => {
    if (!vehicle?.imei) return;
    
    const range = getDateRange();
    if (!range) {
      toast.error("Seleziona un intervallo di date valido");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/balin/device/${vehicle.imei}/trips`, {
        params: {
          token: authToken,
          start: range.start,
          stop: range.stop
        }
      });
      
      const tripData = response.data.data || [];
      setTrips(tripData);
      
      if (tripData.length === 0) {
        toast.info("Nessun viaggio trovato nel periodo selezionato");
      } else {
        toast.success(`${tripData.length} punti viaggio trovati`);
        // Auto-show on map
        onShowOnMap(tripData);
      }
    } catch (err) {
      console.error("Error loading trips:", err);
      if (err.response?.status === 400) {
        toast.error(err.response.data?.detail || "Errore nel caricamento viaggi");
      } else {
        toast.error("Errore nel caricamento dello storico viaggi");
      }
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [vehicle, authToken, getDateRange, onShowOnMap]);

  // Format timestamp to readable date
  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get trip type label
  const getTripTypeLabel = (type) => {
    const types = {
      4: { label: 'Partenza', color: 'bg-green-500' },
      5: { label: 'Sosta', color: 'bg-red-500' }
    };
    return types[type] || { label: 'Punto', color: 'bg-gray-500' };
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div 
        className="p-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-sm text-gray-700">Storico Percorsi</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {expanded && (
        <div className="p-3 space-y-3">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <Label className="text-xs">Periodo</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="yesterday">Ieri</SelectItem>
                <SelectItem value="week">Ultimi 7 giorni</SelectItem>
                <SelectItem value="month">Ultimi 30 giorni</SelectItem>
                <SelectItem value="custom">Personalizzato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom Date Inputs */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Da</Label>
                <Input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">A</Label>
                <Input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
          
          {/* Load Button */}
          <Button 
            onClick={loadTrips} 
            disabled={loading}
            className="w-full h-8 text-sm bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Route className="h-4 w-4 mr-2" />
            )}
            Carica Percorso
          </Button>
          
          {/* Trip List */}
          {trips.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs text-gray-500 font-medium">
                {trips.length} tappe trovate
              </div>
              {trips.map((trip, index) => {
                const typeInfo = getTripTypeLabel(trip.type);
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                    <div className="flex-1">
                      <span className="font-medium">{typeInfo.label}</span>
                      <span className="text-gray-500 ml-2">
                        {formatTimestamp(trip.timestamp)}
                      </span>
                    </div>
                    {trip.speed > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {trip.speed} km/h
                      </Badge>
                    )}
                    {trip.odometer && (
                      <Badge variant="outline" className="text-xs">
                        {(trip.odometer / 1000).toFixed(1)} km
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Clear Button */}
          {trips.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => {
                setTrips([]);
                onShowOnMap([]);
              }}
              className="w-full h-8 text-sm"
            >
              <Square className="h-3 w-3 mr-2" />
              Nascondi Percorso
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Vehicle Card Component (compact for sidebar)
const VehicleCard = ({ vehicle, isSelected, onClick, onShowDetails, compact = false }) => {
  const isMoving = vehicle.moving;
  const isConnected = vehicle.is_connected;
  const isPowered = vehicle.is_power_on;
  const hasGPS = vehicle.has_GPS;

  if (compact) {
    return (
      <div 
        className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 ${isSelected ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'bg-white border border-gray-200'}`}
        onClick={() => onClick(vehicle)}
        data-testid={`vehicle-card-${vehicle.imei}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isMoving ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Car className={`h-4 w-4 ${isMoving ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{vehicle.name || `Veicolo ${vehicle.numeric_label}`}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isMoving ? "default" : "secondary"} className={`text-xs ${isMoving ? "bg-blue-500" : ""}`}>
                {isMoving ? "In movimento" : "Fermo"}
              </Badge>
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" />
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : ''}`}
      onClick={() => onClick(vehicle)}
      data-testid={`vehicle-card-${vehicle.imei}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isMoving ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Car className={`h-5 w-5 ${isMoving ? 'text-blue-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <CardTitle className="text-base">{vehicle.name || `Veicolo ${vehicle.numeric_label}`}</CardTitle>
              <CardDescription className="text-xs">IMEI: {vehicle.imei}</CardDescription>
            </div>
          </div>
          <Badge variant={isMoving ? "default" : "secondary"} className={isMoving ? "bg-blue-500" : ""}>
            {isMoving ? "In movimento" : "Fermo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Indicators */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${isConnected ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "Online" : "Offline"}
          </Badge>
          <Badge variant="outline" className={`text-xs ${isPowered ? 'bg-green-50 text-green-700 border-green-300' : 'bg-yellow-50 text-yellow-700 border-yellow-300'}`}>
            {isPowered ? <Power className="h-3 w-3 mr-1" /> : <PowerOff className="h-3 w-3 mr-1" />}
            {isPowered ? "Alimentato" : "Batteria"}
          </Badge>
          <Badge variant="outline" className={`text-xs ${hasGPS ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
            <Satellite className="h-3 w-3 mr-1" />
            {hasGPS ? `${vehicle.satellites} sat` : "No GPS"}
          </Badge>
        </div>

        {/* Location Info */}
        {vehicle.lat && vehicle.lng && (
          <div className="bg-gray-50 p-2 rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="text-gray-600">
                {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}
              </span>
            </div>
            {vehicle.speed !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">{vehicle.speed} km/h</span>
                {vehicle.heading !== undefined && (
                  <>
                    <Compass className="h-4 w-4 text-orange-500 ml-2" />
                    <span className="text-gray-600">{vehicle.heading}°</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last Update */}
        {vehicle.last_position_formatted && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Ultimo aggiornamento: {vehicle.last_position_formatted}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              if (vehicle.lat && vehicle.lng) {
                window.open(`https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`, '_blank');
              }
            }}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Mappa
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(vehicle);
            }}
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            Dettagli
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Vehicle Detail Dialog
const VehicleDetailDialog = ({ vehicle, open, onOpenChange }) => {
  if (!vehicle) return null;

  const odometerKm = vehicle.odometer ? (vehicle.odometer / 1000).toFixed(1) : 0;
  const altitudeM = vehicle.altitude || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-emerald-600" />
            {vehicle.name || `Veicolo ${vehicle.numeric_label}`}
          </DialogTitle>
          <DialogDescription>
            Dettagli e informazioni del localizzatore GPS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identification */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Identificazione</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">IMEI:</span>
                <span className="ml-2 font-mono">{vehicle.imei}</span>
              </div>
              <div>
                <span className="text-gray-500">Seriale:</span>
                <span className="ml-2 font-mono">{vehicle.serial}</span>
              </div>
              <div>
                <span className="text-gray-500">Etichetta:</span>
                <span className="ml-2">{vehicle.numeric_label}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Stato</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant={vehicle.moving ? "default" : "secondary"} className={vehicle.moving ? "bg-blue-500" : ""}>
                {vehicle.moving ? "In movimento" : "Fermo"}
              </Badge>
              <Badge variant="outline" className={vehicle.is_connected ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                {vehicle.is_connected ? "Online" : "Offline"}
              </Badge>
              <Badge variant="outline" className={vehicle.is_power_on ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}>
                {vehicle.is_power_on ? "Alimentato" : "Batteria"}
              </Badge>
              <Badge variant="outline" className={vehicle.has_GPS ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                GPS: {vehicle.has_GPS ? "OK" : "No"}
              </Badge>
            </div>
            {vehicle.last_trip_change_formatted && (
              <p className="text-xs text-gray-500 mt-2">
                {vehicle.moving ? "In viaggio da:" : "Fermo da:"} {vehicle.last_trip_change_formatted}
              </p>
            )}
          </div>

          {/* Position */}
          {vehicle.lat && vehicle.lng && (
            <div className="bg-emerald-50 p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm text-emerald-700">Posizione</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Latitudine:</span>
                  <span className="ml-2 font-mono">{vehicle.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Longitudine:</span>
                  <span className="ml-2 font-mono">{vehicle.lng.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Altitudine:</span>
                  <span className="ml-2">{altitudeM} m</span>
                </div>
                <div>
                  <span className="text-gray-500">Satelliti:</span>
                  <span className="ml-2">{vehicle.satellites}</span>
                </div>
                <div>
                  <span className="text-gray-500">Velocità:</span>
                  <span className="ml-2">{vehicle.speed} km/h</span>
                </div>
                <div>
                  <span className="text-gray-500">Direzione:</span>
                  <span className="ml-2">{vehicle.heading}°</span>
                </div>
              </div>
              {vehicle.last_position_formatted && (
                <p className="text-xs text-emerald-600 mt-2">
                  Ultimo aggiornamento: {vehicle.last_position_formatted}
                </p>
              )}
              <Button 
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.open(`https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`, '_blank')}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Apri in Google Maps
              </Button>
            </div>
          )}

          {/* Odometer */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Contachilometri</h4>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{odometerKm}</span>
              <span className="text-gray-500">km</span>
            </div>
          </div>

          {/* Activation Date */}
          {vehicle.timestamp_activation && (
            <div className="text-xs text-gray-500 text-center">
              Attivato il: {new Date(vehicle.timestamp_activation).toLocaleDateString('it-IT')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export default function VehicleTracker({ authToken }) {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [mapExpanded, setMapExpanded] = useState(false);
  const [tripPositions, setTripPositions] = useState([]);

  const loadVehicles = useCallback(async () => {
    try {
      setError(null);
      const response = await axios.get(`${API}/balin/devices`, {
        params: { token: authToken }
      });
      setVehicles(response.data.devices || []);
    } catch (err) {
      console.error("Error loading vehicles:", err);
      if (err.response?.status === 400) {
        setError("Balin GPS non configurato. Vai in Setup → Integrazioni per configurarlo.");
      } else if (err.response?.status === 401) {
        setError(err.response.data?.detail || "Errore autenticazione Balin");
      } else {
        setError("Errore nel caricamento dei veicoli");
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadVehicles();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadVehicles, 30000);
    return () => clearInterval(interval);
  }, [loadVehicles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
    toast.success("Posizioni aggiornate");
  };

  const handleShowDetails = (vehicle) => {
    setDetailVehicle(vehicle);
    setDetailDialogOpen(true);
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setTripPositions([]); // Clear previous trip when selecting new vehicle
  };

  const handleShowTripsOnMap = useCallback((trips) => {
    setTripPositions(trips);
  }, []);

  // Calculate map center
  const mapCenter = useMemo(() => {
    // If we have trip positions, center on them
    if (tripPositions.length > 0) {
      const validTrips = tripPositions.filter(p => p.lat && p.lng);
      if (validTrips.length > 0) {
        const avgLat = validTrips.reduce((sum, p) => sum + p.lat, 0) / validTrips.length;
        const avgLng = validTrips.reduce((sum, p) => sum + p.lng, 0) / validTrips.length;
        return [avgLat, avgLng];
      }
    }
    
    const validVehicles = vehicles.filter(v => v.lat && v.lng);
    if (validVehicles.length === 0) return [41.9028, 12.4964]; // Rome default
    if (selectedVehicle?.lat && selectedVehicle?.lng) {
      return [selectedVehicle.lat, selectedVehicle.lng];
    }
    const avgLat = validVehicles.reduce((sum, v) => sum + v.lat, 0) / validVehicles.length;
    const avgLng = validVehicles.reduce((sum, v) => sum + v.lng, 0) / validVehicles.length;
    return [avgLat, avgLng];
  }, [vehicles, selectedVehicle, tripPositions]);

  // Create polyline positions from trip data
  const tripPolylinePositions = useMemo(() => {
    return tripPositions
      .filter(p => p.lat && p.lng)
      .map(p => [p.lat, p.lng]);
  }, [tripPositions]);

  // Summary stats
  const totalVehicles = vehicles.length;
  const movingVehicles = vehicles.filter(v => v.moving).length;
  const onlineVehicles = vehicles.filter(v => v.is_connected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">Caricamento veicoli...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Configurazione Necessaria</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.href = '#proprieta'}>
            <Settings className="h-4 w-4 mr-2" />
            Vai a Setup
          </Button>
        </Card>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md p-6 text-center">
          <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nessun Veicolo</h3>
          <p className="text-gray-600 mb-4">
            Non sono stati trovati veicoli collegati al tuo account Balin.
          </p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="h-6 w-6 text-emerald-600" />
            Veicoli GPS
          </h2>
          <p className="text-gray-500">Monitoraggio posizione in tempo reale</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="flex gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Car className="h-3 w-3 mr-1" />
              {totalVehicles} veicoli
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-300">
              <Navigation className="h-3 w-3 mr-1" />
              {movingVehicles} in movimento
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-300">
              <Wifi className="h-3 w-3 mr-1" />
              {onlineVehicles} online
            </Badge>
          </div>

          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('map')}
              className={viewMode === 'map' ? 'bg-emerald-600' : ''}
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Mappa
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-emerald-600' : ''}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
          </div>

          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className={`flex gap-4 ${mapExpanded ? 'h-[calc(100vh-180px)]' : 'h-[550px]'}`}>
          {/* Sidebar with vehicle list and trip history */}
          {!mapExpanded && (
            <div className="w-80 flex flex-col gap-3 overflow-hidden">
              {/* Vehicle List */}
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="p-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-sm text-gray-700">Lista Veicoli</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.imei}
                      vehicle={vehicle}
                      isSelected={selectedVehicle?.imei === vehicle.imei}
                      onClick={handleVehicleSelect}
                      onShowDetails={handleShowDetails}
                      compact
                    />
                  ))}
                </div>
              </div>
              
              {/* Trip History Panel - shows when vehicle is selected */}
              {selectedVehicle && (
                <TripHistoryPanel 
                  vehicle={selectedVehicle}
                  authToken={authToken}
                  onShowOnMap={handleShowTripsOnMap}
                />
              )}
            </div>
          )}

          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden border shadow-sm relative">
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBoundsFitter vehicles={vehicles} tripPositions={tripPositions} />
              
              {/* Vehicle Markers */}
              {vehicles.filter(v => v.lat && v.lng).map((vehicle) => (
                <Marker
                  key={vehicle.imei}
                  position={[vehicle.lat, vehicle.lng]}
                  icon={createVehicleIcon(vehicle.moving, vehicle.is_connected)}
                  eventHandlers={{
                    click: () => handleVehicleSelect(vehicle)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-base mb-2">{vehicle.name || `Veicolo ${vehicle.numeric_label}`}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-2">
                          <Badge variant={vehicle.moving ? "default" : "secondary"} className={`text-xs ${vehicle.moving ? "bg-blue-500" : ""}`}>
                            {vehicle.moving ? "In movimento" : "Fermo"}
                          </Badge>
                        </p>
                        <p><strong>Velocità:</strong> {vehicle.speed} km/h</p>
                        <p><strong>Direzione:</strong> {vehicle.heading}°</p>
                        {vehicle.last_position_formatted && (
                          <p className="text-xs text-gray-500">
                            Aggiornato: {vehicle.last_position_formatted}
                          </p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleShowDetails(vehicle)}
                      >
                        Dettagli
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Trip Polyline */}
              {tripPolylinePositions.length > 1 && (
                <Polyline 
                  positions={tripPolylinePositions}
                  pathOptions={{ 
                    color: '#3b82f6', 
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '10, 5'
                  }}
                />
              )}
              
              {/* Trip Point Markers */}
              {tripPositions.filter(p => p.lat && p.lng).map((point, index) => {
                const isStart = point.type === 4;
                const isStop = point.type === 5;
                const color = isStart ? '#22c55e' : (isStop ? '#ef4444' : '#3b82f6');
                
                return (
                  <CircleMarker
                    key={`trip-${index}`}
                    center={[point.lat, point.lng]}
                    radius={isStart || isStop ? 8 : 4}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">
                          {isStart ? '🟢 Partenza' : (isStop ? '🔴 Sosta' : '📍 Punto')}
                        </p>
                        <p>{new Date(point.timestamp).toLocaleString('it-IT')}</p>
                        {point.speed > 0 && <p>Velocità: {point.speed} km/h</p>}
                        {point.odometer && <p>Km: {(point.odometer / 1000).toFixed(1)}</p>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
            
            {/* Trip Legend */}
            {tripPositions.length > 0 && (
              <div className="absolute bottom-3 left-3 z-[1000] bg-white rounded-lg shadow-md p-2 text-xs">
                <div className="font-semibold mb-1">Legenda Percorso</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Partenza</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Sosta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-blue-500" style={{ borderStyle: 'dashed' }} />
                  <span>Percorso</span>
                </div>
              </div>
            )}
            
            {/* Expand/Collapse button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-3 right-3 z-[1000] bg-white shadow-md"
              onClick={() => setMapExpanded(!mapExpanded)}
            >
              {mapExpanded ? (
                <><Minimize2 className="h-4 w-4 mr-1" /> Riduci</>
              ) : (
                <><Maximize2 className="h-4 w-4 mr-1" /> Espandi</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* List View (Grid) */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.imei}
              vehicle={vehicle}
              isSelected={selectedVehicle?.imei === vehicle.imei}
              onClick={setSelectedVehicle}
              onShowDetails={handleShowDetails}
            />
          ))}
        </div>
      )}

      {/* Vehicle Detail Dialog */}
      <VehicleDetailDialog
        vehicle={detailVehicle}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
