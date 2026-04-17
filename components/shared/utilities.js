import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { Ship, Compass, Anchor } from 'lucide-react';

// ============ CONSTANTS ============
export const LOGO_URL = 'https://customer-assets.emergentagent.com/job_7d8a5623-84c4-4dc5-8737-98643d255bb4/artifacts/cdzklcx8_logo%20maretrek_1.jpg';
export const HERO_IMG = 'https://images.unsplash.com/photo-1557207773-caf19e055e40?w=1920&q=80';
export const TYPE_LABELS = { 
  GITA_GOMMONE: 'Gita in Gommone', 
  GITA_BARCA: 'Gita in Barca', 
  VISITA_GUIDATA: 'Visita Guidata', 
  NOLEGGIO_NATANTE: 'Noleggio Natante' 
};
export const TYPE_ICONS = { 
  GITA_GOMMONE: Ship, 
  GITA_BARCA: Ship, 
  VISITA_GUIDATA: Compass, 
  NOLEGGIO_NATANTE: Anchor 
};
export const TYPE_COLORS = { 
  GITA_GOMMONE: 'bg-sky-100 text-sky-800 border-sky-200', 
  GITA_BARCA: 'bg-blue-100 text-blue-800 border-blue-200', 
  VISITA_GUIDATA: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
  NOLEGGIO_NATANTE: 'bg-amber-100 text-amber-800 border-amber-200' 
};
export const GANTT_COLORS = { 
  GITA_GOMMONE: 'bg-sky-50 border-sky-300 text-sky-900', 
  GITA_BARCA: 'bg-blue-50 border-blue-300 text-blue-900', 
  VISITA_GUIDATA: 'bg-emerald-50 border-emerald-300 text-emerald-900', 
  NOLEGGIO_NATANTE: 'bg-amber-50 border-amber-300 text-amber-900' 
};
export const LANG_MAP = { 
  IT: 'Italiano', 
  EN: 'English', 
  FR: 'Francais', 
  DE: 'Deutsch' 
};
export const BOAT_TYPE_LABELS = { 
  GOMMONE: 'Gommone', 
  NATANTE: 'Natante', 
  IMBARCAZIONE: 'Imbarcazione', 
  GOMMONE_SKIPPER: 'Gommone con Skipper', 
  BARCA_SKIPPER: 'Barca con Skipper', 
  BARCA_VELA_SKIPPER: 'Barca a Vela con Skipper', 
  BARCA: 'Barca' 
};

// ============ API HELPER ============
export const api = async (path, opts = {}) => {
  const { method = 'GET', body } = opts;
  const cfg = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) cfg.body = JSON.stringify(body);
  const res = await fetch(`/api/${path}`, cfg);
  return res.json();
};

// Wrapper per toast che filtra messaggi generici
export const safeToastError = (message) => {
  if (!message || message === '1 error' || message === '1' || message === 'error') {
    console.error('Toast generico bloccato:', message);
    return; // Non mostrare toast generici
  }
  toast.error(message);
};

// ============ FORMAT HELPERS ============
export function fmtDate(d) { 
  try { 
    return format(parseISO(d), 'EEE d MMM yyyy', { locale: it }); 
  } catch { 
    return d || ''; 
  } 
}

export function fmtTime(d) { 
  try { 
    return format(parseISO(d), 'HH:mm'); 
  } catch { 
    return ''; 
  } 
}

export function fmtDateTime(d) { 
  try { 
    return format(parseISO(d), "EEE d MMM yyyy 'alle' HH:mm", { locale: it }); 
  } catch { 
    return d || ''; 
  } 
}

export function fmtPrice(p) { 
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p || 0); 
}

// Helper: Determina la fascia di prezzo attiva per una data specifica
export function getPriceTierForDate(experience, date) {
  if (!experience?.price_tiers || experience.price_tiers.length === 0) {
    return null;
  }
  
  const dateStr = typeof date === 'string' ? date.split('T')[0] : format(date, 'yyyy-MM-dd');
  
  for (const tier of experience.price_tiers) {
    if (!tier.start_date || !tier.end_date) continue;
    if (dateStr >= tier.start_date && dateStr <= tier.end_date) {
      return tier;
    }
  }
  
  return null;
}
