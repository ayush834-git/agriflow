"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DICTIONARIES, type SupportedLang } from "./dictionaries";

type I18nContextType = {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  dict: typeof DICTIONARIES["en"];
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("agriflow:lang") as SupportedLang;
    if (saved && (saved === "en" || saved === "hi" || saved === "te")) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem("agriflow:lang", newLang);
  };

  const dict = DICTIONARIES[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
