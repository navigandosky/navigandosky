import { createContext, useContext, useState, useCallback } from "react";
import it from "./translations/it";
import en from "./translations/en";
import fr from "./translations/fr";
import es from "./translations/es";

const translations = { it, en, fr, es };

const languages = [
  { code: "it", flag: "\u{1F1EE}\u{1F1F9}", label: "Italiano" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", label: "Fran\u00E7ais" },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "Espa\u00F1ol" },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("smartdomo_lang") || "it";
  });

  const changeLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      localStorage.setItem("smartdomo_lang", newLang);
    }
  }, []);

  const t = translations[lang] || translations.it;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export { languages, translations };
export default LanguageContext;
