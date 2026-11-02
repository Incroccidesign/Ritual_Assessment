import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import it from "@/messages/it.json";
import bg from "@/messages/bg.json";
import de from "@/messages/de.json";
import pl from "@/messages/pl.json";
import ptPT from "@/messages/pt-PT.json";
import tr from "@/messages/tr.json";
import { Locale } from "@/types/locale";
import { defaultLocale, normalizeLocale } from "@/lib/i18n/config";

export type Messages = typeof en;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const dictionaries: Partial<Record<Locale, DeepPartial<Messages>>> = {
  bg,
  de,
  pl,
  "pt-PT": ptPT,
  tr
};

function mergeMessages(base: Messages, override: DeepPartial<Messages>): Messages {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseValue = merged[key];
    merged[key] =
      value && typeof value === "object" && !Array.isArray(value) && baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)
        ? mergeMessages(baseValue as Messages, value as DeepPartial<Messages>)
        : value;
  }
  return merged as Messages;
}

export function getMessages(locale: Locale = defaultLocale): Messages {
  const normalized = normalizeLocale(locale);
  if (normalized === "en" || normalized === "fr" || normalized === "it") return { en, fr, it }[normalized] as Messages;
  return mergeMessages(en, dictionaries[normalized] ?? {});
}
