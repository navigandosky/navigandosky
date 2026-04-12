'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { RefreshCw, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    loadFleet();
    const interval = setInterval(loadFleet, 30000);
    return () => clearInterval(interval);
  }, [isMounted]);

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
      toast.error('Errore caricamento flotta GPS');
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mappa Flotta GPS</h2>
          <p className="text-sm text-muted-foreground">Tracking real-time delle imbarcazioni tramite Balin.app</p>
        </div>
        <Button onClick={loadFleet} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

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
