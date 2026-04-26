'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Anchor, MapPin, Phone, Mail, Ship, ArrowRight, ArrowLeft } from 'lucide-react';

const fmtPrice = (p) => p?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) || '€ 0,00';

export default function PostiBarcaPage() {
  const router = useRouter();
  const [marinas, setMarinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marinas?is_active=true')
      .then(r => r.json())
      .then(data => { setMarinas(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Anchor className="w-12 h-12 mx-auto text-primary animate-pulse mb-2" />
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1561641129-8e9d54d05322?w=1920&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-blue-900/60 flex items-center">
          <div className="container mx-auto px-6">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
            <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <Anchor className="w-12 h-12" /> Posti Barca
            </h1>
            <p className="text-xl text-white/90">Trova il porto perfetto per la tua imbarcazione in Sardegna</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marinas.map(m => (
            <Card key={m.id} className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group border-2 hover:border-primary"
                  onClick={() => router.push(`/posti-barca/${m.slug}`)}>
              <div className="relative h-56 overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100">
                {m.cover_image ? (
                  <img src={m.cover_image} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Anchor className="w-20 h-20 text-primary/30" /></div>
                )}
                {m.total_berths > 0 && (
                  <Badge className="absolute top-3 right-3 bg-white text-primary font-semibold">
                    <Ship className="w-3 h-3 mr-1" />{m.total_berths} posti
                  </Badge>
                )}
              </div>
              <CardContent className="p-5">
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{m.name}</h3>
                {m.location && <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{m.location}</p>}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{m.short_description || m.description}</p>
                <div className="flex items-center justify-between">
                  {m.pricing?.annual?.length > 0 ? (
                    <span className="text-xs text-muted-foreground">Da <strong className="text-primary">{fmtPrice(m.pricing.annual[0]?.price)}</strong>/anno</span>
                  ) : (
                    <Badge variant="outline" className="text-xs">Listino in arrivo</Badge>
                  )}
                  <Button size="sm" variant="ghost" className="group-hover:bg-primary group-hover:text-white">
                    Scopri <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {marinas.length === 0 && (
          <div className="text-center py-20">
            <Anchor className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nessuna marina disponibile al momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
