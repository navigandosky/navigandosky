'use client';
import { Users, Calendar, Clock, Ship, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ParticipantsPopup({ device, bookings, loading }) {
  const resource = device.resource;
  
  if (loading) {
    return (
      <div className="p-4 min-w-[320px]">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalPassengers = bookings?.total_passengers || 0;
  const bookingsList = bookings?.bookings || [];

  return (
    <div className="p-4 min-w-[350px] max-w-[400px]">
      {/* Header Dispositivo */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" />
              {resource?.name || device.name || `Dispositivo ${device.imei}`}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">IMEI: {device.imei}</p>
          </div>
          <Badge className={device.moving ? 'bg-green-500' : 'bg-gray-500'}>
            {device.moving ? '🟢 In Movimento' : '⚪ Fermo'}
          </Badge>
        </div>
        
        {/* Info GPS */}
        <div className="grid grid-cols-2 gap-2 text-xs mt-3 p-2 bg-gray-50 rounded">
          <div>
            <span className="text-gray-600">Velocità:</span>
            <span className="ml-1 font-semibold">{device.speed || 0} km/h</span>
          </div>
          <div>
            <span className="text-gray-600">Satelliti:</span>
            <span className="ml-1 font-semibold">{device.satellites || 0}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-3 mb-3"></div>

      {/* Prenotazioni del Giorno */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          Passeggeri Oggi
          {totalPassengers > 0 && (
            <Badge variant="outline" className="ml-auto">
              {totalPassengers} {totalPassengers === 1 ? 'persona' : 'persone'}
            </Badge>
          )}
        </h4>

        {bookingsList.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nessuna prenotazione oggi</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {bookingsList.map((booking, idx) => (
              <div key={booking.id || idx} className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{booking.booking_ref}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {booking.seats} {booking.seats === 1 ? 'posto' : 'posti'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {booking.slot_time ? new Date(booking.slot_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                  <span className="truncate">
                    {booking.experience_name}
                  </span>
                </div>

                {booking.seat_assignments && booking.seat_assignments.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-1">Posti Assegnati:</p>
                    <div className="flex flex-wrap gap-1">
                      {booking.seat_assignments.map((seat, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {seat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {resource && (
        <div className="border-t pt-3 mt-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Tipo Imbarcazione:</span>
              <span className="font-medium">{resource.boat_type || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Capacità Totale:</span>
              <span className="font-medium">{resource.capacity || 0} posti</span>
            </div>
            <div className="flex justify-between">
              <span>Occupazione Oggi:</span>
              <span className={`font-medium ${totalPassengers > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {totalPassengers}/{resource.capacity || 0} ({resource.capacity > 0 ? Math.round((totalPassengers / resource.capacity) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {device.timestamp_position && (
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
          Ultimo aggiornamento: {new Date(device.timestamp_position).toLocaleString('it-IT')}
        </div>
      )}
    </div>
  );
}
