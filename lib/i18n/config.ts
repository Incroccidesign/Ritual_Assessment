import { Locale, TextDirection } from "@/types/locale";

export const locales: Locale[] = ["en", "fr", "it"];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Francais",
  it: "Italiano"
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "fr" || value === "it" || value === "en" ? value : defaultLocale;
}

export function localeDirection(locale: Locale): TextDirection {
  return locale === "en" || locale === "fr" || locale === "it" ? "ltr" : "rtl";
}
