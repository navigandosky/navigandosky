'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'maretrek_language';
const STORAGE_SOURCE_KEY = 'maretrek_language_source'; // 'manual' | 'auto'
const SUPPORTED = Object.keys(translations); // ['it','en','fr','de','es']

// Mappa codici lingua del browser (es. "it-IT", "es-ES") → codici app
function browserLangToAppLang() {
  if (typeof navigator === 'undefined') return null;
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || navigator.userLanguage].filter(Boolean);
  for (const raw of candidates) {
    const code = String(raw).toLowerCase().split('-')[0];
    if (SUPPORTED.includes(code)) return code;
  }
  return null;
}

// Chiede al backend (/api/geo) la lingua basata sull'IP/nazione
async function detectLanguageFromIP() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('/api/geo', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.language && SUPPORTED.includes(d.language)) return d.language;
    return null;
  } catch (e) {
    return null;
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('it');
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Lingua salvata manualmente dall'utente: PRIORITÀ MASSIMA
        const saved = localStorage.getItem(STORAGE_KEY);
        const source = localStorage.getItem(STORAGE_SOURCE_KEY);
        if (saved && SUPPORTED.includes(saved) && source === 'manual') {
          if (!cancelled) setLanguage(saved);
          return;
        }

        // 2) Prova rilevamento dal browser (più veloce e affidabile)
        const browserLang = browserLangToAppLang();
        if (browserLang) {
          if (!cancelled) setLanguage(browserLang);
          localStorage.setItem(STORAGE_KEY, browserLang);
          localStorage.setItem(STORAGE_SOURCE_KEY, 'auto');
          return;
        }

        // 3) Fallback: rilevamento geografico tramite IP (server-side)
        const ipLang = await detectLanguageFromIP();
        if (ipLang) {
          if (!cancelled) setLanguage(ipLang);
          localStorage.setItem(STORAGE_KEY, ipLang);
          localStorage.setItem(STORAGE_SOURCE_KEY, 'auto');
          return;
        }

        // 4) Se nessun metodo funziona, usa la lingua già salvata (anche se auto) o italiano
        if (saved && SUPPORTED.includes(saved)) {
          if (!cancelled) setLanguage(saved);
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const changeLanguage = (lang) => {
    if (!SUPPORTED.includes(lang)) return;
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(STORAGE_SOURCE_KEY, 'manual');
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.it[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, detecting }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
