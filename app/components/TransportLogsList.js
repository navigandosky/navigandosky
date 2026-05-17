'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Calendar, Users, Anchor } from 'lucide-react';

/**
 * Lista dei "Registri Trasportati" filtrabili.
 * Riutilizzabile da:
 * - Calendario Admin (resourceId + date specifici)
 * - Mappa GPS (resourceId, ultimi N giorni)
 * - Pannello globale (company_id)
 */
export default function TransportLogsList({ resourceId, date, companyId, limit = 30 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resourceId) params.set('resource_id', resourceId);
      if (date) params.set('date', date);
      if (companyId) params.set('company_id', companyId);
      const res = await fetch(`/api/transport-logs?${params}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data.slice(0, limit) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [resourceId, date, companyId]);

  const downloadPdf = (log) => {
    // Prima preferenza: pdf_data salvato (data URI)
    if (log.pdf_data) {
      const a = document.createElement('a');
      a.href = log.pdf_data;
      a.download = `RegistroTrasportati_${log.resource_name}_${log.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // Fallback: rigenera dal client
    regeneratePdf(log);
  };

  const regeneratePdf = async (log) => {
    try {
      const { downloadTransportLogPdf } = await import('@/app/lib/transportLogPdf');
      let company = null;
      if (log.company_id) {
        try { company = await fetch(`/api/companies/${log.company_id}`).then(r => r.json()); } catch {}
      }
      await downloadTransportLogPdf({
        resource: { name: log.resource_name, id: log.resource_id },
        skipper: { full_name: log.skipper_name, phone: log.skipper_phone },
        date: log.date,
        bookings: log.bookings_snapshot || [],
        company: company || {},
      });
    } catch (e) {
      alert('Errore generazione PDF: ' + e.message);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Caricamento registri...</div>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <FileText className="w-8 h-8 mx-auto opacity-40 mb-2" />
          Nessun registro trasportati disponibile
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-white hover:bg-slate-50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(log.date).toLocaleDateString('it-IT')}
              </Badge>
              {log.status === 'CLOSED' && <Badge className="bg-green-600 text-xs">Chiuso</Badge>}
            </div>
            <div className="font-semibold text-sm mt-1 flex items-center gap-2">
              <Anchor className="w-3 h-3 text-blue-600" />
              {log.resource_name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Skipper: <strong>{log.skipper_name}</strong> · <Users className="w-3 h-3 inline" /> {log.total_passengers || 0} pax · {log.total_bookings || 0} prenotazioni
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => downloadPdf(log)}>
            <Download className="w-3 h-3 mr-1" /> PDF
          </Button>
        </div>
      ))}
    </div>
  );
}
