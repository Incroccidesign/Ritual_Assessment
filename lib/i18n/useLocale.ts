"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale, localeDirection, localeNames, locales, normalizeLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/getMessages";
import { Locale } from "@/types/locale";

const storageKey = "ritual-assessment-locale";
const localeChangeEvent = "ritual-assessment-locale-change";

function readBrowserLocale() {
  const params = new URLSearchParams(window.location.search);
  const queryLocale = params.get("locale");
  return queryLocale ? normalizeLocale(queryLocale) : normalizeLocale(window.localStorage.getItem(storageKey));
}

export function useLocale() {
  const router = useRouter();
  const [storedLocale, setStoredLocale] = useState<Locale | null>(null);
  const locale = storedLocale ?? defaultLocale;
  const messages = getMessages(locale);

  useEffect(() => {
    setStoredLocale(readBrowserLocale());

    function handleLocaleChange(event: Event) {
      const nextLocale = event instanceof CustomEvent ? normalizeLocale(event.detail) : readBrowserLocale();
      setStoredLocale(nextLocale);
    }

    window.addEventListener(localeChangeEvent, handleLocaleChange);
    window.addEventListener("popstate", handleLocaleChange);
    window.addEventListener("storage", handleLocaleChange);

    return () => {
      window.removeEventListener(localeChangeEvent, handleLocaleChange);
      window.removeEventListener("popstate", handleLocaleChange);
      window.removeEventListener("storage", handleLocaleChange);
    };
  }, []);

  useEffect(() => {
    if (storedLocale === null) return;
    window.localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  }, [locale, storedLocale]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      const query = new URLSearchParams(window.location.search);
      query.set("locale", nextLocale);
      setStoredLocale(nextLocale);
      window.localStorage.setItem(storageKey, nextLocale);
      window.dispatchEvent(new CustomEvent(localeChangeEvent, { detail: nextLocale }));
      router.replace(`${window.location.pathname}?${query.toString()}`);
    },
    [router]
  );

  const href = useCallback(
    (target: string) => {
      const [path, query = ""] = target.split("?");
      const nextQuery = new URLSearchParams(query);
      nextQuery.set("locale", locale);
      const serialized = nextQuery.toString();
      return serialized ? `${path}?${serialized}` : path;
    },
    [locale]
  );

  return useMemo(
    () => ({
      locale,
      direction: localeDirection(locale),
      messages,
      localeNames,
      locales,
      setLocale,
      href
    }),
    [href, locale, messages, setLocale]
  );
}
