"use client";

import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const { locale, locales, localeNames, setLocale } = useLocale();

  return (
    <div className="flex rounded-md border border-bone/10 bg-night/55 p-1">
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          title={localeNames[item]}
          onClick={() => setLocale(item)}
          className={cn(
            "min-h-8 rounded px-3 text-xs font-semibold uppercase tracking-[0.08em] transition",
            locale === item ? "bg-bone text-night" : "text-bone/58 hover:text-bone"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
