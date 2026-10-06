"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function AppShell({
  children,
  compact = false,
  claim = "Sessioni strutturate live",
  homeHref = "/"
}: {
  children: React.ReactNode;
  compact?: boolean;
  claim?: string;
  homeHref?: string;
}) {
  return (
    <main className={compact ? "live-experience min-h-screen px-4 py-5" : "live-experience min-h-screen px-5 pb-6 pt-8 md:px-10"}>
      <div className={compact ? "route-page-fade mx-auto w-full max-w-md" : "route-page-fade mx-auto w-full max-w-7xl"}>
        <header aria-label={claim} className="relative z-10 mb-8 flex items-center justify-between gap-5 border-b border-bone/10 pb-6">
          <Link href={homeHref} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
            <Image src="/ritual-logo-white.svg" alt="Ritual" width={516} height={128} priority className="h-auto w-24 sm:w-28 md:w-32" />
          </Link>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
