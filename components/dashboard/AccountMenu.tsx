"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { AccountDeletionDialog } from "@/components/dashboard/AccountDeletionDialog";
import { Designer, signOutDesigner } from "@/lib/auth/designerAuth";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

export function AccountMenu({ designer }: { designer: Designer }) {
  const { locale, locales, localeNames, messages, setLocale, href } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function signOut() {
    await signOutDesigner();
    router.replace(href("/"));
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button type="button" aria-label={messages.account.menuLabel} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="inline-flex size-11 items-center justify-center rounded-full border border-bone/15 bg-bone text-night shadow-live transition hover:bg-mint focus:outline-none focus:ring-2 focus:ring-mint">
          <UserRound size={23} strokeWidth={2.1} />
        </button>
        {open ? (
          <div role="menu" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-lg border border-bone/15 bg-night p-2 shadow-live">
            <p className="truncate px-3 py-2 text-xs font-semibold text-bone/70">{designer.email}</p>
            <div className="my-1 border-t border-bone/10" />
            <div className="px-3 pb-2 pt-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-bone/48">{messages.account.language}</p>
              <div className="mt-2 flex gap-1">
                {locales.map((item) => (
                  <button key={item} type="button" role="menuitemradio" aria-checked={locale === item} onClick={() => setLocale(item)} className={cn("min-h-8 flex-1 rounded px-2 text-xs font-semibold transition", locale === item ? "bg-bone text-night" : "bg-bone/5 text-bone/65 hover:bg-bone/10 hover:text-bone")}>
                    {localeNames[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="my-1 border-t border-bone/10" />
            <button type="button" role="menuitem" onClick={() => void signOut()} className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-bone/78 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint">
              {messages.auth.signOut}
            </button>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); setDeletionOpen(true); }} className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-orange transition hover:bg-orange/10 focus:outline-none focus:ring-2 focus:ring-orange">
              {messages.account.deleteAction}
            </button>
          </div>
        ) : null}
      </div>
      {deletionOpen ? <AccountDeletionDialog onClose={() => setDeletionOpen(false)} /> : null}
    </>
  );
}
