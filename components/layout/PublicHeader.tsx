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
  className
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  className?: string;
}) {
  const { messages, href } = useLocale();

  return <header className={cn("z-20 flex w-full items-center justify-between gap-4", className)}>
    <Link href={href("/")} className="block py-1 focus:outline-none focus:ring-2 focus:ring-mint">
      <Image src="/ritual-logo-white.svg" alt="Ritual" width={516} height={128} priority className="h-auto w-24 sm:w-28" />
    </Link>
    <div className="flex max-w-[15rem] flex-wrap items-center justify-end gap-2 sm:max-w-none sm:flex-nowrap sm:gap-3">
      <button type="button" onClick={onSignIn} className="inline-flex min-h-10 items-center justify-center px-2 text-sm font-semibold text-bone/78 transition hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint">
        {messages.home.secondary}
      </button>
      <button type="button" onClick={onSignUp} className="inline-flex min-h-10 items-center justify-center rounded-md border border-bone/45 px-3 text-sm font-semibold text-bone transition hover:bg-bone/10 focus:outline-none focus:ring-2 focus:ring-mint sm:px-4">
        {messages.auth.signUp}
      </button>
      <Suspense fallback={null}><LanguageSwitcher variant="dropdown" /></Suspense>
    </div>
  </header>;
}
