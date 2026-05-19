'use client';
import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Award } from 'lucide-react';
import { useLanguage } from '@/app/i18n/LanguageContext';

const fmtPrice = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0);

// Palette colori per il grafico (compatibili con dark/light mode)
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

/**
 * Dialog popup con grafico a torta delle provvigioni ripartite per esperienza venduta.
 * Considera solo prenotazioni CONFERMATE per coerenza con il calcolo provvigioni.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - bookings: array di prenotazioni
 *  - experiences: array di esperienze (per fallback nomi/prezzi)
 *  - agencyDiscountPct: numero (es. 15 per 15%)
 *  - totalCommission: totale per riferimento (opzionale)
 */
export default function CommissionPieChart({ open, onClose, bookings = [], experiences = [], agencyDiscountPct = 0, totalCommission = 0 }) {
  // Hook traduzioni (con fallback se fuori dal provider)
  let t = (k) => k;
  try { t = useLanguage().t; } catch (e) { /* outside provider */ }
  // Calcola la provvigione per esperienza
  const data = useMemo(() => {
    const map = new Map();
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
    for (const b of confirmed) {
      const seats = Number(b.seats) || 0;
      let b2cUnit = Number(b.b2c_price ?? b.price_b2c ?? 0) || 0;
      if (!b2cUnit) {
        const exp = experiences.find(e => e.id === b.experience_id);
        if (exp) {
          const slotDate = (b.slot_datetime || '').split('T')[0];
          let chosen = null;
          if (slotDate && Array.isArray(exp.price_tiers)) {
            chosen = exp.price_tiers.find(t => (!t.start_date || slotDate >= t.start_date) && (!t.end_date || slotDate <= t.end_date));
          }
          b2cUnit = Number(chosen?.price_b2c ?? exp.price_b2c) || 0;
        }
      }
      if (!b2cUnit && seats && b.total_amount) b2cUnit = Number(b.total_amount) / seats;
      const b2cTotal = b2cUnit * seats;
      const commission = b2cTotal * (Number(agencyDiscountPct) / 100);
      const expName = b.experience_name || (experiences.find(e => e.id === b.experience_id)?.name) || 'Sconosciuta';
      const cur = map.get(expName) || { name: expName, value: 0, count: 0, seats: 0, b2cTotal: 0 };
      cur.value += commission;
      cur.count += 1;
      cur.seats += seats;
      cur.b2cTotal += b2cTotal;
      map.set(expName, cur);
    }
    // Ordina per provvigione decrescente
    return Array.from(map.values())
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [bookings, experiences, agencyDiscountPct]);

  const grandTotal = data.reduce((s, d) => s + d.value, 0);
  const totalBookings = data.reduce((s, d) => s + d.count, 0);
  const totalSeats = data.reduce((s, d) => s + d.seats, 0);

  // Tooltip personalizzato
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const pct = grandTotal > 0 ? (d.value / grandTotal) * 100 : 0;
    return (
      <div className="bg-white border-2 border-purple-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-bold text-purple-900 mb-1">{d.name}</div>
        <div className="space-y-0.5 text-xs">
          <div>Provvigione: <span className="font-semibold text-emerald-700">{fmtPrice(d.value)}</span></div>
          <div>Percentuale: <span className="font-semibold">{pct.toFixed(1)}%</span></div>
          <div>Prenotazioni: <span className="font-semibold">{d.count}</span></div>
          <div>Posti venduti: <span className="font-semibold">{d.seats}</span></div>
          <div>Volume B2C: <span className="font-semibold">{fmtPrice(d.b2cTotal)}</span></div>
        </div>
      </div>
    );
  };

  // Label sulle fette (mostra % solo se >= 5%)
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontWeight="bold" fontSize="13">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            {t('b2b_commission_chart_title')}
          </DialogTitle>
          <DialogDescription>
            {t('b2b_commission_chart_subtitle')} <strong>{t('b2b_commission_confirmed')}</strong>
            {agencyDiscountPct > 0 && <span> ({t('b2b_commission_agency_discount')}: <strong>{agencyDiscountPct}%</strong>)</span>}
          </DialogDescription>
        </DialogHeader>

        {data.length === 0 ? (
          <div className="py-12 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">{t('b2b_no_commission_data')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('b2b_no_commission_hint')} <strong>{t('b2b_status_confirmed')}</strong>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            {/* Grafico */}
            <div className="flex flex-col items-center">
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={45}
                      paddingAngle={2}
                      label={renderLabel}
                      labelLine={false}
                    >
                      {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-2">
                <p className="text-xs text-muted-foreground">{t('b2b_total_commissions')}</p>
                <p className="text-2xl font-bold text-purple-700">{fmtPrice(grandTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalBookings} {t('b2b_bookings').toLowerCase()} · {totalSeats} {t('b2b_col_seats').toLowerCase()}
                </p>
              </div>
            </div>

            {/* Tabella dettaglio */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('b2b_chart_detail_per_exp')}</h3>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {data.map((d, i) => {
                  const pct = grandTotal > 0 ? (d.value / grandTotal) * 100 : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-100 transition">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={d.name}>{d.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.count} {t('b2b_bookings').toLowerCase()} · {d.seats} {t('b2b_col_seats').toLowerCase()} · {fmtPrice(d.b2cTotal)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-emerald-700 text-sm">{fmtPrice(d.value)}</div>
                        <Badge variant="secondary" className="text-[10px] mt-0.5">{pct.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
