"use client";

import Link from "next/link";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  compact = false,
  wide = false,
  showHeaderDivider = true,
  headerAction
}: {
  children: React.ReactNode;
  compact?: boolean;
  wide?: boolean;
  showHeaderDivider?: boolean;
  headerAction?: React.ReactNode;
}) {
  const { href, direction } = useLocale();

  return (
    <main dir={direction} className={compact ? "min-h-screen px-4 py-5" : "min-h-screen px-5 pb-8 pt-8 md:px-10"}>
      <div
        className={
          compact
            ? "route-page-fade mx-auto w-full max-w-md"
            : wide
              ? "route-page-fade mx-auto w-full max-w-[92rem]"
              : "route-page-fade mx-auto w-full max-w-7xl"
        }
      >
        <header
          className={cn(
            "relative z-10 mb-8 flex items-center justify-between gap-5 pb-6",
            showHeaderDivider && "border-b border-bone/10"
          )}
        >
          <Link href={href("/")} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
            <img src="/ritual-logo-white.svg" alt="Ritual" className="h-auto w-28 sm:w-32 md:w-36" />
          </Link>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
            {headerAction}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
