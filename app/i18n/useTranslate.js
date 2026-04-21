'use client';
import { useState, useEffect, useRef, useMemo } from 'react';

const CACHE_KEY = 'maretrek_translation_cache_v1';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function loadCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const now = Date.now();
    const cleaned = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v && v.ts && (now - v.ts) < CACHE_MAX_AGE_MS) cleaned[k] = v;
    });
    return cleaned;
  } catch (e) { return {}; }
}

function saveCache(cache) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch (e) { try { localStorage.removeItem(CACHE_KEY); } catch (_) {} }
}

function cacheKey(text, lang) { return `${lang}::${text}`; }

// Singleton cache condiviso (evita loadCache multipli)
let globalCache = null;
function getCache() {
  if (!globalCache) globalCache = loadCache();
  return globalCache;
}

async function translateTextApi(text, targetLang, sourceLang = 'it') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  if (targetLang === sourceLang) return text;
  const cache = getCache();
  const key = cacheKey(text, targetLang);
  if (cache[key]?.translated) return cache[key].translated;

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

function applyCachedTranslations(items, targetLang, fields, arrayFields) {
  if (!targetLang || targetLang === 'it') return items;
  const cache = getCache();
  let anyChange = false;
  const result = items.map(item => {
    let changed = false;
    const out = { ...item };
    fields.forEach(f => {
      const v = item[f];
      if (v && typeof v === 'string') {
        const c = cache[cacheKey(v, targetLang)];
        if (c?.translated && c.translated !== v) {
          out[f] = c.translated;
          changed = true;
        }
      }
    });
    arrayFields.forEach(af => {
      if (Array.isArray(item[af])) {
        let arrChanged = false;
        const arr = item[af].map(s => {
          if (!s) return s;
          const c = cache[cacheKey(s, targetLang)];
          if (c?.translated && c.translated !== s) { arrChanged = true; return c.translated; }
          return s;
        });
        if (arrChanged) { out[af] = arr; changed = true; }
      }
    });
    if (changed) { anyChange = true; return out; }
    return item; // stessa reference se niente è cambiato
  });
  return anyChange ? result : items;
}

/**
 * Hook per tradurre on-demand una lista di oggetti.
 */
export function useTranslatedItems(items, targetLang, fields = ['name', 'description'], arrayFields = []) {
  // Hash stabile degli items basato su ID (evita re-render su nuove reference con stessi dati)
  const itemsHash = useMemo(() => {
    if (!items || items.length === 0) return '';
    return items.map(it => it?.id || JSON.stringify(it)).join('|');
  }, [items]);

  const [translated, setTranslated] = useState(() => applyCachedTranslations(items || [], targetLang, fields, arrayFields));
  const [isTranslating, setIsTranslating] = useState(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    const myRun = ++runIdRef.current;
    if (!items || items.length === 0) {
      setTranslated(items || []);
      setIsTranslating(false);
      return;
    }
    if (!targetLang || targetLang === 'it') {
      setTranslated(items);
      setIsTranslating(false);
      return;
    }

    // Render ottimistico con cache
    const cached = applyCachedTranslations(items, targetLang, fields, arrayFields);
    setTranslated(cached);

    // Verifica se ci sono testi mancanti in cache
    const cache = getCache();
    const needsFetch = items.some(it => {
      for (const f of fields) {
        if (it[f] && !cache[cacheKey(it[f], targetLang)]) return true;
      }
      for (const af of arrayFields) {
        if (Array.isArray(it[af])) {
          for (const s of it[af]) {
            if (s && !cache[cacheKey(s, targetLang)]) return true;
          }
        }
      }
      return false;
    });

    if (!needsFetch) {
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);
    (async () => {
      for (const item of items) {
        if (myRun !== runIdRef.current) return;
        for (const f of fields) {
          if (item[f]) await translateTextApi(item[f], targetLang);
        }
        for (const af of arrayFields) {
          if (Array.isArray(item[af])) {
            for (const s of item[af]) {
              if (s) await translateTextApi(s, targetLang);
            }
          }
        }
      }
      if (myRun !== runIdRef.current) return;
      saveCache(getCache());
      const finalTranslated = applyCachedTranslations(items, targetLang, fields, arrayFields);
      setTranslated(finalTranslated);
      setIsTranslating(false);
    })();

    return () => { /* runIdRef invalida il fetch in corso */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsHash, targetLang]);

  return { translated, isTranslating };
}

/**
 * Hook per tradurre un singolo oggetto.
 */
export function useTranslatedItem(item, targetLang, fields = ['name', 'description'], arrayFields = []) {
  const items = useMemo(() => (item ? [item] : []), [item?.id]);
  const { translated, isTranslating } = useTranslatedItems(items, targetLang, fields, arrayFields);
  return { translated: translated[0] || item, isTranslating };
}
