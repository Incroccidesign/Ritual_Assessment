"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ritual-ui";
import { signOutDesigner } from "@/lib/auth/designerAuth";
import { supabase } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/useLocale";

export function AccountDeletionDialog({ onClose }: { onClose: () => void }) {
  const { messages, href } = useLocale();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  async function deleteAccount() {
    if (!supabase || confirmation !== "DELETE" || pending) return;
    setPending(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(messages.auth.signInError);
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });
      if (!response.ok) throw new Error(await response.text());
      await signOutDesigner();
      router.replace(href("/?account-deleted=1"));
    } catch (deletionError) {
      setError(deletionError instanceof Error ? deletionError.message : messages.account.deletionError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020611]/[0.94] p-5 backdrop-blur-[64px]" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg rounded-lg border border-orange/35 bg-[#10131a] p-6 shadow-live">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-orange">{messages.account.dangerZone}</p>
            <h2 id="delete-account-title" className="mt-3 font-heading text-2xl font-semibold text-bone">{messages.account.deleteTitle}</h2>
          </div>
          <button type="button" aria-label={messages.account.close} disabled={pending} onClick={onClose} className="rounded-md p-2 text-bone/55 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint disabled:opacity-50">
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-bone/62">{messages.account.deleteBody}</p>
        <div className="mt-5 space-y-4 border-t border-orange/20 pt-5">
          <Field label={messages.account.deleteConfirmLabel}>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} autoComplete="off" />
          </Field>
          {error ? <p className="text-sm text-orange">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="danger" disabled={confirmation !== "DELETE" || pending} onClick={() => void deleteAccount()}>
              {pending ? messages.app.loading : messages.account.deleteConfirmAction}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>{messages.common.cancel}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
