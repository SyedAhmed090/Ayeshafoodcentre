"use client";

import { createContext, useContext } from "react";
import { en } from "@/lib/i18n/en";
import { staffTexts, type StaffTexts } from "@/lib/i18n";

const Ctx = createContext<StaffTexts>(en);

/** Set by the counter and rider layouts from Settings.staffLang. */
export function StaffTextProvider({ lang, children }: { lang: string; children: React.ReactNode }) {
  return <Ctx value={staffTexts(lang)}>{children}</Ctx>;
}

export const useT = () => useContext(Ctx);
