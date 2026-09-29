"use client";

import { languages } from "@/lib/live/i18n";
import { useLanguage } from "@/lib/live/use-language";
import { cn } from "@/lib/live/utils";

export function LanguageSwitcher() {
  const { language, switchLanguage } = useLanguage();

  return (
    <div className="flex rounded-md border border-bone/10 bg-night/50 p-1">
      {languages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => switchLanguage(item)}
          className={cn(
            "h-8 min-w-10 rounded px-2 text-xs font-semibold transition",
            language === item ? "bg-bone text-night" : "text-bone/52 hover:text-bone"
          )}
          aria-pressed={language === item}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
