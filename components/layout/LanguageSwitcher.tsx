"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";
import { cn } from "@/lib/utils/cn";

type LanguageSwitcherProps = {
  variant?: "default" | "minimal" | "dropdown";
};

export function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const { locale, locales, localeNames, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isMinimal = variant === "minimal";
  useDismissiblePopover(open, popoverRef, () => setOpen(false));

  if (variant === "dropdown") {
    return (
      <div ref={popoverRef} className="relative">
        <button
          type="button"
          aria-label="Language"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-10 items-center gap-1 px-2 text-sm font-semibold text-bone/78 transition hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint"
        >
          {locale.toUpperCase()}
          <ChevronDown aria-hidden="true" size={15} className={cn("transition", open && "rotate-180")} />
        </button>
        {open ? (
          <div role="menu" className="ritual-popover-surface absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-28 rounded-md border p-1">
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLocale(item);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-9 w-full items-center rounded px-3 text-left text-sm font-semibold transition hover:bg-bone/10",
                  locale === item ? "text-bone" : "text-bone/65"
                )}
              >
                {localeNames[item]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex", isMinimal ? "items-center gap-1" : "rounded-md border border-bone/10 bg-night/55 p-1")}>
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          title={localeNames[item]}
          onClick={() => setLocale(item)}
          className={cn(
            isMinimal
              ? "min-h-9 border-b-2 border-transparent px-2 text-xs font-semibold uppercase tracking-[0.08em] text-bone/60 transition hover:text-bone"
              : "min-h-8 rounded px-3 text-xs font-semibold uppercase tracking-[0.08em] transition",
            locale === item && (isMinimal ? "border-bone text-bone" : "bg-bone text-night")
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
