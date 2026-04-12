'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

export default function DevicesList({ devices = [], filter = 'all', onFilterChange, onSelectDevice, selectedDevice }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Flotta ({devices.length})</h3>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Filtri */}
      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => onFilterChange('all')} className="flex-1">Tutti</Button>
        <Button variant={filter === 'moving' ? 'default' : 'outline'} size="sm" onClick={() => onFilterChange('moving')} className="flex-1">In moto</Button>
        <Button variant={filter === 'stopped' ? 'default' : 'outline'} size="sm" onClick={() => onFilterChange('stopped')} className="flex-1">Fermi</Button>
      </div>
      
      {/* Lista */}
      <div className="space-y-2">
        {devices.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nessun dispositivo GPS configurato</p>
        )}
        {devices.map(d => (
          <Card key={d.imei} className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedDevice?.imei === d.imei ? 'border-primary border-2' : ''}`} onClick={() => onSelectDevice(d)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{d.resource?.name || d.name}</p>
                  <p className="text-xs text-muted-foreground">IMEI: {d.imei?.slice(-6)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={d.moving ? 'bg-green-500' : 'bg-gray-500'}>
                    {d.moving ? 'In moto' : 'Fermo'}
                  </Badge>
                  <span className="text-xs font-medium">{d.speed || 0} km/h</span>
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-xs flex-wrap">
                {d.has_GPS && <Badge variant="outline" className="text-green-600 border-green-600">GPS</Badge>}
                {d.is_power_on && <Badge variant="outline" className="text-blue-600 border-blue-600">PWR</Badge>}
                {d.is_connected && <Badge variant="outline" className="text-purple-600 border-purple-600">NET</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
