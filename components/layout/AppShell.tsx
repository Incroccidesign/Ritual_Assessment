"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  compact = false,
  wide = false,
  showHeaderDivider = true,
  showLanguageSwitcher = true,
  headerAction,
  logoHref
}: {
  children: React.ReactNode;
  compact?: boolean;
  wide?: boolean;
  showHeaderDivider?: boolean;
  showLanguageSwitcher?: boolean;
  headerAction?: React.ReactNode;
  logoHref?: string;
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
          <Link href={logoHref ?? href("/")} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
            <Image src="/ritual-logo-white.svg" alt="Ritual" width={516} height={128} priority className="h-auto w-24 sm:w-28 md:w-32" />
          </Link>
          <div className="flex items-center gap-3">
            {showLanguageSwitcher ? (
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
            ) : null}
            {headerAction}
          </div>
        </header>
        {children}
        <LegalFooter />
      </div>
    </main>
  );
}
