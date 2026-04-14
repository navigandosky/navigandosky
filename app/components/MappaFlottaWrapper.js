'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Map as MapIcon, Calendar, TrendingUp, Route } from 'lucide-react';
import { toast } from 'sonner';
import GPSAnalyticsDashboard from './GPSAnalyticsDashboard';
import SpeedChart from './SpeedChart';

// Import dinamico del componente mappa
const FleetMap = dynamic(() => import('./FleetMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

// Import componenti helper
const DevicesList = dynamic(() => import('./DevicesList'), { ssr: false });

const api = async (path, opts = {}) => {
  const { method = 'GET', body } = opts;
  const cfg = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) cfg.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, cfg);
  return res.json();
};

export default function MappaFlottaWrapper() {
  const [devices, setDevices] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Nuove funzionalità
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showRoute, setShowRoute] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    loadFleet();
    const interval = setInterval(loadFleet, 30000);
    return () => clearInterval(interval);
  }, [isMounted, selectedDate]);

  useEffect(() => {
    if (selectedDevice && selectedDevice.imei) {
      loadAnalytics(selectedDevice.imei);
    }
  }, [selectedDevice, selectedDate]);

  const loadFleet = async () => {
    try {
      const [gpsData, resData] = await Promise.all([
        api('gps/devices').catch(() => []),
        api('resources').catch(() => [])
      ]);
      
      const enriched = (Array.isArray(gpsData) ? gpsData : []).map(device => {
        const resource = (resData || []).find(r => r.gps_imei === device.imei);
        return { ...device, resource };
      });
      
      setDevices(enriched);
      setResources(resData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading fleet:', error);
      setLoading(false);
      // Non mostrare toast per errori GPS - è una condizione normale se GPS non è configurato
    }
  };

  const loadAnalytics = async (imei) => {
    setLoadingAnalytics(true);
    try {
      const data = await api(`gps/analytics/${imei}?date=${selectedDate}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const filteredDevices = useMemo(() => {
    if (filter === 'moving') return devices.filter(d => d.moving);
    if (filter === 'stopped') return devices.filter(d => !d.moving);
    return devices;
  }, [devices, filter]);

  const mapCenter = useMemo(() => {
    if (filteredDevices.length > 0 && filteredDevices[0].lat && filteredDevices[0].lng) {
      return [filteredDevices[0].lat, filteredDevices[0].lng];
    }
    return [40.9, 9.5];
  }, [filteredDevices]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mappa Flotta GPS Real-Time</h2>
          <p className="text-sm text-muted-foreground">Tracking equipaggio, passeggeri e analytics avanzate</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-[150px]"
            />
          </div>

          {/* Toggle rotta */}
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white">
            <Route className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="show-route" className="text-sm cursor-pointer">Mostra Rotta</Label>
            <Switch 
              id="show-route"
              checked={showRoute}
              onCheckedChange={setShowRoute}
            />
          </div>

          {/* Refresh */}
          <Button onClick={loadFleet} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {selectedDevice && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">
              Analytics: {selectedDevice.resource?.name || selectedDevice.name}
            </h3>
            <span className="text-sm text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          
          <GPSAnalyticsDashboard analytics={analytics} loading={loadingAnalytics} />
          
          {analytics && analytics.route && analytics.route.length > 0 && (
            <SpeedChart route={analytics.route} />
          )}
          
          {/* Messaggio quando toggle attivo ma nessun dato */}
          {showRoute && selectedDevice && analytics && (!analytics.route || analytics.route.length === 0) && (
            <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
              <div className="flex items-start gap-3">
                <Route className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 mb-1">Nessuna Rotta Disponibile</h4>
                  <p className="text-sm text-amber-800">
                    Non ci sono dati GPS per il <strong>{new Date(selectedDate).toLocaleDateString('it-IT')}</strong>.
                    Il dispositivo potrebbe essere stato fermo o i dati non sono disponibili per questa data.
                  </p>
                  <p className="text-xs text-amber-700 mt-2">
                    💡 Suggerimento: Verifica su Balin.app quali date hanno dati disponibili e seleziona una data con attività GPS registrata.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mappa */}
      <div className="grid grid-cols-4 gap-4 h-[600px]">
        <div className="col-span-1 overflow-y-auto border rounded-lg bg-white">
          <DevicesList 
            devices={filteredDevices} 
            filter={filter}
            onFilterChange={setFilter}
            onSelectDevice={setSelectedDevice}
            selectedDevice={selectedDevice}
          />
        </div>
        
        <div className="col-span-3 border rounded-lg overflow-hidden bg-gray-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Caricamento mappa GPS...</p>
              </div>
            </div>
          )}
          
          {!loading && filteredDevices.length > 0 && (
            <FleetMap 
              devices={filteredDevices}
              center={mapCenter}
              zoom={10}
              selectedDate={selectedDate}
              showRoute={showRoute}
              routeData={analytics?.route || []}
              selectedDevice={selectedDevice}
            />
          )}
          
          {!loading && filteredDevices.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">Nessun Dispositivo GPS</p>
              <p className="text-sm text-muted-foreground mb-4">Configura il campo "GPS IMEI" nelle risorse tipo Imbarcazione</p>
              <Button variant="outline" onClick={loadFleet}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Ricarica
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
