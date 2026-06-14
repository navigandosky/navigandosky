'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Script from 'next/script';

export default function PayIntegrationPage() {
  const params = useParams();
  const search = useSearchParams();
  const checkoutId = params?.checkoutId;
  const token = search.get('t');

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const cardMounted = useRef(false);

  useEffect(() => {
    if (!checkoutId || !token) {
      setError('Link non valido: parametri mancanti.');
      setLoading(false);
      return;
    }
    fetch(`/api/sumup/pay-integration-info?checkout_id=${encodeURIComponent(checkoutId)}&t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Errore caricamento dati pagamento');
        setInfo(data);
        if (data.already_paid) setPaymentDone(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [checkoutId, token]);

  useEffect(() => {
    if (!info || !info.checkout_id) return;
    if (info.already_paid || paymentDone) return;
    if (!sdkReady) return;
    if (cardMounted.current) return;
    if (typeof window === 'undefined' || !window.SumUpCard) return;

    cardMounted.current = true;
    try {
      window.SumUpCard.mount({
        id: 'sumup-card',
        checkoutId: info.checkout_id,
        locale: 'it-IT',
        showFooter: false,
        showSubmitButton: true,
        onResponse: async (type, body) => {
          if (type === 'success' || (body && body.status === 'PAID')) {
            setPaying(true);
            try {
              let attempts = 0;
              while (attempts < 5) {
                const r = await fetch('/api/sumup/confirm-integration-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ checkout_id: checkoutId, token }),
                });
                if (r.ok) {
                  setPaymentDone(true);
                  setPaying(false);
                  return;
                }
                if (r.status === 402) {
                  const d = await r.json();
                  setPaymentError(`Pagamento ${d.status || 'fallito'}. Riprova.`);
                  setPaying(false);
                  return;
                }
                attempts++;
                await new Promise((res) => setTimeout(res, 1500));
              }
              setPaymentError('Verifica del pagamento in corso. Aggiorna la pagina tra qualche secondo.');
              setPaying(false);
            } catch (e) {
              setPaymentError(e.message);
              setPaying(false);
            }
          }
          if (type === 'error' || type === 'invalid') {
            setPaymentError('Pagamento rifiutato. Verifica i dati della carta o riprova.');
          }
        },
      });
    } catch (e) {
      console.error('SumUpCard.mount error:', e);
      setError('Impossibile inizializzare il modulo di pagamento.');
      cardMounted.current = false;
    }
  }, [info, sdkReady, paymentDone, checkoutId, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Errore</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (paymentDone || info?.already_paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-emerald-700 mb-3">Pagamento Confermato</h1>
          <p className="text-slate-600 mb-1">Riferimento</p>
          <p className="text-lg font-semibold text-slate-800 mb-4">{info?.booking_ref}</p>
          <p className="text-slate-600">
            Grazie {info?.customer_name || ''}! Il pagamento è stato registrato correttamente.
          </p>
        </div>
      </div>
    );
  }

  const currencySymbol = info?.currency === 'EUR' ? '€' : (info?.currency || '€');

  return (
    <>
      <Script
        src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-6">
            {info?.company_logo ? (
              <img src={info.company_logo} alt={info?.company_name} className="h-16 mx-auto mb-2 object-contain" />
            ) : (
              <h2 className="text-2xl font-bold text-slate-800">{info?.company_name || 'Maretrek'}</h2>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <h1 className="text-lg font-bold text-slate-800 mb-3">Pagamento sicuro</h1>
            <div className="space-y-2 text-sm">
              {info?.booking_ref && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Riferimento</span>
                  <span className="font-mono font-semibold text-slate-800">{info.booking_ref}</span>
                </div>
              )}
              {info?.description && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Causale</span>
                  <span className="font-medium text-slate-800 text-right max-w-[60%]">{info.description}</span>
                </div>
              )}
              {info?.customer_name && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Cliente</span>
                  <span className="font-medium text-slate-800">{info.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-700 font-semibold">Importo</span>
                <span className="text-2xl font-bold text-blue-700">
                  {currencySymbol} {Number(info?.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">💳 Paga con carta</h2>
              <div className="flex gap-1">
                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">Visa</span>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">Mastercard</span>
              </div>
            </div>
            {!sdkReady && (
              <div className="py-8 text-center text-slate-500 text-sm">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2"></div>
                <div>Caricamento modulo carta...</div>
              </div>
            )}
            <div id="sumup-card"></div>
            {paying && (
              <div className="mt-4 text-center text-sm text-slate-600">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-2 align-middle"></div>
                Verifica pagamento in corso...
              </div>
            )}
            {paymentError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {paymentError}
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 px-4 pb-6">
            <p className="mb-1">🔒 Pagamento sicuro processato da SumUp</p>
            <p>I dati della carta non vengono memorizzati sui nostri server.</p>
          </div>
        </div>
      </div>
    </>
  );
}
