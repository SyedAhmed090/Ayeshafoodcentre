// The staff screens' words in the language the owner picked in Settings (Settings.staffLang).
import { en, type StaffKey } from "@/lib/i18n/en";
import { ur } from "@/lib/i18n/ur";

export type StaffTexts = Record<StaffKey, string>;
export const STAFF_LANGS = { en: "English", ur: "اردو (Urdu)" } as const;
export const staffTexts = (lang: string): StaffTexts => (lang === "ur" ? ur : en);
export { fmt } from "@/lib/i18n/en";
