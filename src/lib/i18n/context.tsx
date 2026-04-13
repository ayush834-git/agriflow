"use client";

import React, { createContext, useContext, useState } from "react";
import { DICTIONARIES, type SupportedLang } from "./dictionaries";

type I18nContextType = {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  dict: typeof DICTIONARIES["en"];
};

const I18nContext = createContext<I18nContextType | null>(null);

function getInitialLanguage(): SupportedLang {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = localStorage.getItem("agriflow:lang");

  if (saved === "en" || saved === "hi" || saved === "te" || saved === "kn") {
    return saved;
  }

  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(() => getInitialLanguage());

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
