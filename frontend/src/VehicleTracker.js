import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Car,
  MapPin,
  Navigation,
  Battery,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Satellite,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Gauge,
  Compass,
  Settings,
  ChevronRight,
  Loader2,
  Map as MapIcon,
  History,
  Route
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Vehicle Card Component
const VehicleCard = ({ vehicle, isSelected, onClick, onShowDetails }) => {
  const isMoving = vehicle.moving;
  const isConnected = vehicle.is_connected;
  const isPowered = vehicle.is_power_on;
  const hasGPS = vehicle.has_GPS;

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
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
    <div className="space-y-6">
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

          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Vehicles Grid */}
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

      {/* Vehicle Detail Dialog */}
      <VehicleDetailDialog
        vehicle={detailVehicle}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
