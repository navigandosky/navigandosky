'use client';
import { useEffect, useState } from 'react';

let MapContainer, TileLayer, Marker, Popup, L;

export default function FleetMap({ devices = [], center = [40.9, 9.5], zoom = 10 }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Carica leaflet solo client-side
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet'),
        import('leaflet')
      ]).then(([reactLeaflet, leaflet]) => {
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        L = leaflet.default;

        // Fix icone
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setIsReady(true);
      });
    }
  }, []);

  if (!isReady || typeof window === 'undefined') {
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
    >
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {devices.map(device => {
        if (!device.lat || !device.lng) return null;
        return (
          <Marker key={device.imei} position={[device.lat, device.lng]}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-sm mb-2">
                  {device.resource?.name || `Dispositivo ${device.imei}`}
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IMEI:</span>
                    <span className="font-mono">{device.imei}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stato:</span>
                    <span className={device.moving ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                      {device.moving ? '🟢 In Movimento' : '⚪ Fermo'}
                    </span>
                  </div>
                  {device.speed !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Velocità:</span>
                      <span>{device.speed} km/h</span>
                    </div>
                  )}
                  {device.timestamp_position && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aggiornato:</span>
                      <span>{new Date(device.timestamp_position).toLocaleTimeString('it-IT')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
