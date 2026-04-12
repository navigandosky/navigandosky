'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Navigation, Clock, MapPin } from 'lucide-react';

export default function GPSAnalyticsDashboard({ analytics, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Distanza Percorsa',
      value: `${analytics?.total_distance || 0} km`,
      icon: MapPin,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Velocità Massima',
      value: `${analytics?.max_speed || 0} km/h`,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100'
    },
    {
      label: 'Velocità Media',
      value: `${analytics?.avg_speed || 0} km/h`,
      icon: Navigation,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      label: 'Tempo Navigazione',
      value: `${Math.floor((analytics?.total_time || 0) / 60)}h ${(analytics?.total_time || 0) % 60}m`,
      icon: Clock,
      color: 'text-amber-600 bg-amber-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
