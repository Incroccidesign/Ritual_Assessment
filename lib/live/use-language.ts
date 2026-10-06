"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getMessages, Language } from "@/lib/live/i18n";
import { normalizeLocale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/useLocale";

export function useLanguage() {
  const params = useSearchParams();
  const { locale, setLocale, href: localeHref } = useLocale();
  // `lang` remains accepted in existing QR and bookmarked Live links. The
  // platform locale is otherwise the only source of truth.
  const effectiveLocale = normalizeLocale(params.get("locale") ?? params.get("lang") ?? locale);
  const language: Language = effectiveLocale === "it" ? "it" : "en";
  const messages = getMessages(language);

  return useMemo(
    () => ({
      language,
      locale: effectiveLocale,
      messages,
      switchLanguage: setLocale,
      href: localeHref
    }),
    [effectiveLocale, language, localeHref, messages, setLocale]
  );
}
