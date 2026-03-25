import { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageContext";

export default function LanguageSelector() {
  const { lang, changeLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div ref={ref} className="relative" data-testid="language-selector">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
        data-testid="language-selector-btn"
        title={current.label}
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="text-xs font-medium text-gray-600 uppercase hidden sm:inline">{current.code}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { changeLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                lang === l.code ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
              data-testid={`lang-option-${l.code}`}
            >
              <span className="text-lg leading-none">{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
