'use client';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS } from './utilities';
import { Ship } from 'lucide-react';

export function TypeBadge({ type }) {
  const Icon = TYPE_ICONS[type] || Ship;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[type] || 'bg-gray-100'}`}>
      <Icon className="w-3 h-3" />
      {TYPE_LABELS[type] || type}
    </span>
  );
}

export function StatusBadge({ status }) {
  const c = { 
    OPEN: 'bg-green-100 text-green-800', 
    FULL: 'bg-red-100 text-red-800', 
    CANCELLED: 'bg-gray-100 text-gray-600', 
    CONFIRMED: 'bg-green-100 text-green-800', 
    PENDING: 'bg-yellow-100 text-yellow-800', 
    REFUNDED: 'bg-gray-100 text-gray-600', 
    WAITING: 'bg-blue-100 text-blue-800', 
    NOTIFIED: 'bg-amber-100 text-amber-800', 
    CONVERTED: 'bg-green-100 text-green-800', 
    EXPIRED: 'bg-gray-100 text-gray-600' 
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100'}`}>{status}</span>;
}

export function AvailabilityBar({ booked, max }) {
  const pct = max > 0 ? (booked / max) * 100 : 0;
  const avail = max - booked;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{avail} posti</span>
    </div>
  );
}
