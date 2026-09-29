"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/live/language-switcher";
import { useLanguage } from "@/lib/live/use-language";

function HeaderTagline() {
  const { language } = useLanguage();
  return (
    <span className="mt-2 block whitespace-nowrap text-[13px] leading-snug text-bone/68 sm:text-sm md:text-[15px]">
      {language === "it" ? "Strumento per sessioni collaborative strutturate" : "Tool for structured collaborative sessions"}
    </span>
  );
}

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
      <div className={compact ? "mx-auto w-full max-w-md" : "mx-auto w-full max-w-7xl"}>
        <header aria-label={claim} className="mb-8 flex items-center justify-between border-b border-bone/10 pb-6">
          <Link href={homeHref} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
            <Image src="/ritual-logo-white.svg" alt="Ritual" width={516} height={128} priority className="h-auto w-28 sm:w-32 md:w-36" />
            <Suspense fallback={null}>
              <HeaderTagline />
            </Suspense>
          </Link>
          <div className="flex items-center gap-4">
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
