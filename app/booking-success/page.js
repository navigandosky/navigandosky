'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Loader2, Download, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100">
      <BookingSuccessContent />
    </div>
  );
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref') || '';
  const provider = searchParams?.get('provider') || '';
  const sessionId = searchParams?.get('session_id') || '';
  const bookingIdQ = searchParams?.get('booking_id') || '';
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [experience, setExperience] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Se redirect da Stripe: verifica subito la sessione (lato server aggiorna il booking)
  useEffect(() => {
    if (provider === 'stripe' && sessionId) {
      const verify = async () => {
        try {
          const qs = new URLSearchParams({ session_id: sessionId });
          if (bookingIdQ) qs.set('booking_id', bookingIdQ);
          const res = await fetch(`/api/stripe/verify-session?${qs}`, { cache: 'no-store' });
          await res.json();
        } catch (e) {
          console.error('Errore verifica sessione Stripe:', e);
        }
      };
      verify();
    }
  }, [provider, sessionId, bookingIdQ]);

  useEffect(() => {
    // Se manca ref ma abbiamo booking_id (caso Stripe), carica direttamente per id
    if (!ref && !bookingIdQ) {
      setLoading(false);
      setError('Riferimento prenotazione mancante.');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 8; // ~24s totali

    const fetchBooking = async () => {
      try {
        let b = null;
        if (ref) {
          const res = await fetch(`/api/bookings?booking_ref=${encodeURIComponent(ref)}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('Booking non trovato');
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.bookings || []);
          b = list.find((x) => x.booking_ref === ref) || list[0];
        } else if (bookingIdQ) {
          const res = await fetch(`/api/bookings/${bookingIdQ}`, { cache: 'no-store' });
          if (res.ok) b = await res.json();
        }
        if (!b) throw new Error('Booking non trovato');
        if (cancelled) return;
        setBooking(b);
        setLoading(false);

        // Carica experience e company (per il voucher PDF) - una sola volta
        if (b.experience_id && !experience) {
          fetch(`/api/experiences/${b.experience_id}`).then(r => r.ok ? r.json() : null).then(setExperience).catch(() => {});
        }
        if (b.company_id && !company) {
          fetch(`/api/companies/${b.company_id}`).then(r => r.ok ? r.json() : null).then(setCompany).catch(() => {});
        }

        // Se il webhook non ha ancora aggiornato, fai polling fino a PAID o esaurimento tentativi
        if (b.payment_status !== 'PAID' && b.status !== 'CONFIRMED' && attempts < MAX_ATTEMPTS) {
          setPolling(true);
          attempts += 1;
          setTimeout(fetchBooking, 3000);
        } else {
          setPolling(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Errore nel recupero della prenotazione');
        setLoading(false);
      }
    };

    fetchBooking();
    return () => { cancelled = true; };
  }, [ref]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto" />
            <p className="text-muted-foreground">Caricamento prenotazione...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">Prenotazione non trovata</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-xs text-muted-foreground">Riferimento: <code className="bg-muted px-2 py-1 rounded">{ref || '—'}</code></p>
            <Button onClick={() => (window.location.href = '/')} className="w-full">
              <Home className="w-4 h-4 mr-2" /> Torna alla home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = booking?.payment_status === 'PAID' || booking?.status === 'CONFIRMED';
  const isPending = !isPaid;

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="overflow-hidden shadow-xl">
        <div className={`p-8 text-center ${isPaid ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'} text-white`}>
          {isPaid ? (
            <>
              <CheckCircle2 className="w-20 h-20 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Pagamento ricevuto!</h1>
              <p className="opacity-90">La tua prenotazione è stata confermata.</p>
            </>
          ) : (
            <>
              <Clock className="w-20 h-20 mx-auto mb-4 animate-pulse" />
              <h1 className="text-3xl font-bold mb-2">Pagamento in elaborazione</h1>
              <p className="opacity-90">
                {polling
                  ? 'Stiamo verificando il pagamento con SumUp...'
                  : 'Stiamo aspettando la conferma da SumUp. Riceverai un\'email appena il pagamento sarà confermato.'}
              </p>
            </>
          )}
        </div>

        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-2xl">{booking?.experience_name || 'Prenotazione'}</CardTitle>
            <Badge variant={isPaid ? 'default' : 'secondary'} className={isPaid ? 'bg-emerald-600' : 'bg-amber-500 text-white'}>
              {isPaid ? 'PAGATO' : booking?.payment_status || 'IN ATTESA'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Riferimento</div>
              <div className="font-semibold font-mono">{booking?.booking_ref}</div>
            </div>
            {booking?.slot_date && (
              <div>
                <div className="text-muted-foreground text-xs">Data</div>
                <div className="font-semibold">{new Date(booking.slot_date).toLocaleDateString('it-IT')}</div>
              </div>
            )}
            {booking?.customer_name && (
              <div>
                <div className="text-muted-foreground text-xs">Cliente</div>
                <div className="font-semibold">{booking.customer_name}</div>
              </div>
            )}
            {typeof booking?.seats === 'number' && (
              <div>
                <div className="text-muted-foreground text-xs">Partecipanti</div>
                <div className="font-semibold">{booking.seats}</div>
              </div>
            )}
            <div className="col-span-2 pt-2 border-t">
              <div className="text-muted-foreground text-xs">Totale</div>
              <div className="font-bold text-2xl text-cyan-700">
                {Number(booking?.total_amount || 0).toFixed(2)} {booking?.currency || 'EUR'}
              </div>
            </div>
          </div>

          {isPaid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
              ✉️ Abbiamo inviato il voucher di conferma a <strong>{booking?.customer_email}</strong>.
              Controlla anche la cartella SPAM.
            </div>
          )}

          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              ⏳ Il pagamento è stato registrato su SumUp. La conferma definitiva e l'email con il voucher
              arriveranno entro pochi secondi. Puoi chiudere questa pagina in sicurezza.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={() => (window.location.href = '/')} variant="outline" className="flex-1">
              <Home className="w-4 h-4 mr-2" /> Torna alla home
            </Button>
            {booking?.id && (
              <Button
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const { downloadVoucherPdf } = await import('@/app/lib/voucherPdf');
                    // Carica al volo experience e company se non già presenti
                    let exp = experience;
                    let comp = company;
                    if (!exp && booking.experience_id) {
                      const r = await fetch(`/api/experiences/${booking.experience_id}`);
                      if (r.ok) exp = await r.json();
                    }
                    if (!comp && booking.company_id) {
                      const r = await fetch(`/api/companies/${booking.company_id}`);
                      if (r.ok) comp = await r.json();
                    }
                    downloadVoucherPdf(booking, exp, comp, { type: isPaid ? 'FINAL' : 'PROVISIONAL' });
                    toast.success('Voucher scaricato');
                  } catch (err) {
                    console.error('voucher pdf error', err);
                    toast.error('Errore generazione voucher');
                  } finally {
                    setDownloading(false);
                  }
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                disabled={downloading}
              >
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Scarica Voucher
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
