"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

export function PublicHeader({
  onSignIn,
  onSignUp,
  activeAuthMode,
  className
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  activeAuthMode?: "sign-in" | "sign-up";
  className?: string;
}) {
  const { messages, href } = useLocale();

  return <header className={cn("z-20 flex w-full items-center justify-between gap-4", className)}>
    <Link href={href("/")} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
      <Image src="/ritual-logo-white.svg" alt="Ritual" width={516} height={128} priority className="h-auto w-24 sm:w-28" />
    </Link>
    <div className="flex max-w-[15rem] flex-wrap items-center justify-end gap-2 sm:max-w-none sm:flex-nowrap sm:gap-3">
      <button type="button" aria-pressed={activeAuthMode === "sign-in"} onClick={onSignIn} className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint",
        activeAuthMode === "sign-in" ? "border border-bone bg-bone px-3 text-night" : activeAuthMode ? "border border-transparent px-3 text-bone/60 hover:text-bone" : "px-2 text-bone/78 hover:text-bone"
      )}>
        {messages.home.secondary}
      </button>
      <button type="button" aria-pressed={activeAuthMode === "sign-up"} onClick={onSignUp} className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint",
        activeAuthMode === "sign-up" ? "border border-bone bg-bone px-3 text-night sm:px-4" : activeAuthMode ? "border border-transparent px-3 text-bone/60 hover:text-bone sm:px-4" : "border border-bone/45 px-3 text-bone hover:bg-bone/10 sm:px-4"
      )}>
        {messages.auth.signUp}
      </button>
      <Suspense fallback={null}><LanguageSwitcher variant="dropdown" /></Suspense>
    </div>
  </header>;
}
