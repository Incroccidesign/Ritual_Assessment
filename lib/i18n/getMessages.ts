import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import it from "@/messages/it.json";
import { Locale } from "@/types/locale";
import { defaultLocale, normalizeLocale } from "@/lib/i18n/config";

export const dictionaries = { en, fr, it } as const;

export type Messages = typeof en;

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[normalizeLocale(locale)] as Messages;
}
