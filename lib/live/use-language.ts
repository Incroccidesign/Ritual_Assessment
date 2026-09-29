"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { defaultLanguage, getMessages, Language, normalizeLanguage, withLang } from "@/lib/live/i18n";

const storageKey = "ritual-language";

export function useLanguage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryLanguage = params.get("lang");
  const [storedLanguage] = useState<Language | null>(() =>
    typeof window === "undefined" ? null : normalizeLanguage(window.localStorage.getItem(storageKey))
  );
  const language = queryLanguage ? normalizeLanguage(queryLanguage) : storedLanguage ?? defaultLanguage;
  const messages = getMessages(language);

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const switchLanguage = useCallback((nextLanguage: Language) => {
    const query = new URLSearchParams(params.toString());
    query.set("lang", nextLanguage);
    router.replace(`${pathname}?${query.toString()}`);
  }, [params, pathname, router]);

  return useMemo(
    () => ({
      language,
      messages,
      switchLanguage,
      href: (target: string) => withLang(target, language)
    }),
    [language, messages, switchLanguage]
  );
}
