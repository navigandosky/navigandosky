'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import ParticipantsPopup from './ParticipantsPopup';

// Fix icone Leaflet per Next.js
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const api = async (path, opts = {}) => {
  const { method = 'GET', body } = opts;
  const cfg = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) cfg.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, cfg);
  return res.json();
};

export default function FleetMap({ 
  devices = [], 
  center = [40.9, 9.5], 
  zoom = 10, 
  selectedDate, 
  showRoute = false,
  routeData = [],
  selectedDevice = null
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [deviceBookings, setDeviceBookings] = useState({});
  const [loadingBookings, setLoadingBookings] = useState({});
  const [routes, setRoutes] = useState({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Carica prenotazioni per ogni dispositivo
  useEffect(() => {
    if (!isMounted || devices.length === 0) return;

    devices.forEach(device => {
      const bKey = device.uniqueKey || device.imei;
      if (device.resource?.id && !deviceBookings[bKey]) {
        loadBookingsForDevice(device);
      }
    });
  }, [devices, isMounted, selectedDate]);

  // Carica rotta storica se richiesto
  useEffect(() => {
    if (!isMounted || !showRoute) {
      setRoutes({});
      return;
    }

    // Se abbiamo routeData dal parent (selectedDevice), usalo
    if (routeData && routeData.length > 0 && selectedDevice?.imei) {
      const rKey = selectedDevice.uniqueKey || selectedDevice.imei;
      setRoutes({ [rKey]: routeData });
      return;
    }

    // Altrimenti carica per tutti i dispositivi
    devices.forEach(device => {
      const rKey = device.uniqueKey || device.imei;
      if (device.imei && !routes[rKey]) {
        loadRouteForDevice(device);
      }
    });
  }, [devices, isMounted, showRoute, selectedDate, routeData, selectedDevice]);

  const loadBookingsForDevice = async (device) => {
    if (!device.resource?.id) return;
    const bKey = device.uniqueKey || device.imei;

    setLoadingBookings(prev => ({ ...prev, [bKey]: true }));

    try {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      const data = await api(`bookings/by-resource?resource_id=${device.resource.id}&date=${date}`);
      setDeviceBookings(prev => ({ ...prev, [bKey]: data }));
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoadingBookings(prev => ({ ...prev, [bKey]: false }));
    }
  };

  const loadRouteForDevice = async (device) => {
    try {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      const data = await api(`gps/analytics/${device.imei}?date=${date}`);
      
      if (data.route && data.route.length > 0) {
        const rKey = device.uniqueKey || device.imei;
        setRoutes(prev => ({ ...prev, [rKey]: data.route }));
      }
    } catch (error) {
      console.error('Error loading route:', error);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Caricamento mappa...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      scrollWheelZoom={true}
    >
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Rotte storiche */}
      {showRoute && Object.entries(routes).map(([rKey, route]) => {
        if (!route || route.length < 2) return null;
        
        const positions = route
          .map(p => [p.lat ?? p.latitude, p.lng ?? p.longitude])
          .filter(pos => pos[0] != null && pos[1] != null);
        
        if (positions.length < 2) return null;
        
        return (
          <Polyline
            key={`route-${rKey}`}
            positions={positions}
            pathOptions={{
              color: '#10b981',
              weight: 4,
              opacity: 0.8,
              smoothFactor: 1.5,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        );
      })}

      {/* Marker dispositivi */}
      {devices.map(device => {
        const lat = device.lat ?? device.latitude;
        const lng = device.lng ?? device.longitude;
        if (!lat || !lng) return null;

        const bookingsKey = device.uniqueKey || device.imei;
        const bookings = deviceBookings[bookingsKey];
        const loading = loadingBookings[bookingsKey];

        return (
          <Marker key={device.uniqueKey || device.imei} position={[lat, lng]}>
            <Popup maxWidth={450} className="custom-popup">
              <ParticipantsPopup 
                device={device}
                bookings={bookings}
                loading={loading}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
