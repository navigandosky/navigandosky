'use client';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function SpeedChart({ route = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || route.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Pulisci canvas
    ctx.clearRect(0, 0, width, height);

    // Trova max speed per scala
    const maxSpeed = Math.max(...route.map(p => p.speed || 0), 10);
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Sfondo
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // Griglia
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Linee orizzontali
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Labels velocità
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const speed = Math.round(maxSpeed - (maxSpeed / 5) * i);
      ctx.fillText(`${speed} km/h`, padding - 5, y + 4);
    }

    // Disegna grafico velocità
    if (route.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      route.forEach((point, i) => {
        const x = padding + (graphWidth / (route.length - 1)) * i;
        const y = padding + graphHeight - (point.speed / maxSpeed) * graphHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Area sotto la curva
      ctx.lineTo(width - padding, padding + graphHeight);
      ctx.lineTo(padding, padding + graphHeight);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();

      // Punti
      route.forEach((point, i) => {
        const x = padding + (graphWidth / (route.length - 1)) * i;
        const y = padding + graphHeight - (point.speed / maxSpeed) * graphHeight;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = point.speed > maxSpeed * 0.7 ? '#ef4444' : '#3b82f6';
        ctx.fill();
      });
    }

    // Asse X (tempo)
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    const showLabels = Math.min(5, route.length);
    for (let i = 0; i < showLabels; i++) {
      const idx = Math.floor((route.length - 1) / (showLabels - 1)) * i;
      const point = route[idx];
      if (point && point.timestamp) {
        const x = padding + (graphWidth / (route.length - 1)) * idx;
        const time = new Date(point.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(time, x, height - padding + 20);
      }
    }

  }, [route]);

  if (route.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Grafico Velocità
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <p className="text-sm">Nessun dato disponibile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Grafico Velocità nel Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={250}
          className="w-full h-auto"
        />
      </CardContent>
    </Card>
  );
}
