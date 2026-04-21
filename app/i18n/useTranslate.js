'use client';
import { useState, useEffect, useRef, useMemo } from 'react';

const CACHE_KEY = 'maretrek_translation_cache_v1';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

// Carica cache da localStorage
function loadCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // Pulisci entries vecchie
    const now = Date.now();
    const cleaned = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v && v.ts && (now - v.ts) < CACHE_MAX_AGE_MS) {
        cleaned[k] = v;
      }
    });
    return cleaned;
  } catch (e) {
    return {};
  }
}

function saveCache(cache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Storage pieno: reset
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }
}

function cacheKey(text, lang) {
  return `${lang}::${text}`;
}

// Traduce un singolo testo con cache
async function translateText(text, targetLang, sourceLang = 'it', cache) {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  if (targetLang === sourceLang) return text;

  const key = cacheKey(text, targetLang);
  if (cache[key]?.translated) {
    return cache[key].translated;
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang })
    });
    const data = await res.json();
    const translated = data?.translatedText || text;
    cache[key] = { translated, ts: Date.now() };
    return translated;
  } catch (e) {
    console.warn('Translation failed:', e);
    return text;
  }
}

/**
 * Hook per tradurre on-demand una lista di oggetti (esperienze).
 * @param {Array} items - array di oggetti con campi da tradurre
 * @param {string} targetLang - codice lingua target (es: 'en', 'fr')
 * @param {Array<string>} fields - campi stringa da tradurre
 * @param {Array<string>} arrayFields - campi array-of-string da tradurre (es: itinerary_stops)
 */
export function useTranslatedItems(items, targetLang, fields = ['name', 'description'], arrayFields = []) {
  const [translated, setTranslated] = useState(items);
  const [isTranslating, setIsTranslating] = useState(false);
  const cacheRef = useRef(null);

  useEffect(() => {
    if (!cacheRef.current) {
      cacheRef.current = loadCache();
    }

    if (!items || items.length === 0) {
      setTranslated(items);
      return;
    }

    // Se la lingua è italiana, mostra originale
    if (!targetLang || targetLang === 'it') {
      setTranslated(items);
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    // Applica subito i valori in cache (render ottimistico)
    const withCache = items.map(item => {
      const out = { ...item };
      fields.forEach(f => {
        if (item[f]) {
          const c = cacheRef.current[cacheKey(item[f], targetLang)];
          if (c?.translated) out[f] = c.translated;
        }
      });
      arrayFields.forEach(af => {
        if (Array.isArray(item[af])) {
          out[af] = item[af].map(s => {
            if (!s) return s;
            const c = cacheRef.current[cacheKey(s, targetLang)];
            return c?.translated || s;
          });
        }
      });
      return out;
    });
    setTranslated(withCache);

    // Traduci in background solo le entries mancanti
    (async () => {
      const result = [];
      for (const item of items) {
        if (cancelled) return;
        const out = { ...item };
        for (const f of fields) {
          if (item[f]) {
            out[f] = await translateText(item[f], targetLang, 'it', cacheRef.current);
          }
        }
        for (const af of arrayFields) {
          if (Array.isArray(item[af])) {
            const arr = [];
            for (const s of item[af]) {
              if (s) arr.push(await translateText(s, targetLang, 'it', cacheRef.current));
              else arr.push(s);
            }
            out[af] = arr;
          }
        }
        result.push(out);
      }
      if (!cancelled) {
        saveCache(cacheRef.current);
        setTranslated(result);
        setIsTranslating(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, targetLang]);

  return { translated, isTranslating };
}

/**
 * Hook per tradurre un singolo oggetto (es. dettaglio esperienza).
 */
export function useTranslatedItem(item, targetLang, fields = ['name', 'description'], arrayFields = []) {
  const items = useMemo(() => (item ? [item] : []), [item]);
  const { translated, isTranslating } = useTranslatedItems(items, targetLang, fields, arrayFields);
  return { translated: translated[0] || item, isTranslating };
}
