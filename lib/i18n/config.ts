import { Locale, TextDirection } from "@/types/locale";

export const locales: Locale[] = ["en", "fr", "it", "bg", "pl", "tr", "de", "pt-PT"];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  it: "Italiano",
  bg: "Български",
  pl: "Polski",
  tr: "Türkçe",
  de: "Deutsch",
  "pt-PT": "Português (Portugal)"
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = value?.toLowerCase();
  if (normalized === "pt-pt" || normalized === "pt_pt") return "pt-PT";
  return locales.find((locale) => locale.toLowerCase() === normalized) ?? defaultLocale;
}

export function localeDirection(locale: Locale): TextDirection {
  return locale === "en" || locale === "fr" || locale === "it" || locale === "bg" || locale === "pl" || locale === "tr" || locale === "de" || locale === "pt-PT" ? "ltr" : "rtl";
}
