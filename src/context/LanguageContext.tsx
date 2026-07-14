import React, { createContext, useContext, useState, useEffect } from "react";
import { TranslationKeys, translations, languages } from "../lib/translations";

type Language = "en" | "ar";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("pref_lang");
    return (saved === "en" || saved === "ar" ? saved : "en") as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("pref_lang", lang);
  };

  const dir = languages[language].dir;
  const isRtl = dir === "rtl";

  useEffect(() => {
    // Dynamically update document direction and language attribute
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    
    // Add/remove font class on document body for Arabic font rendering
    if (language === "ar") {
      document.body.classList.add("font-arabic");
      document.body.classList.remove("font-sans");
    } else {
      document.body.classList.add("font-sans");
      document.body.classList.remove("font-arabic");
    }
  }, [language, dir]);

  const t = (key: keyof TranslationKeys): string => {
    return translations[language][key] || translations["en"][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
