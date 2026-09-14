"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import { signOutDesigner } from "@/lib/auth/designerAuth";
import { supabase } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/useLocale";

export function AccountDeletionCard() {
  const { messages, href } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
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
    <Card className="border-orange/35">
      <p className="eyebrow text-orange">{messages.account.dangerZone}</p>
      <h2 className="mt-3 font-heading text-2xl font-semibold text-bone">{messages.account.deleteTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-bone/62">{messages.account.deleteBody}</p>
      {!open ? (
        <Button type="button" variant="danger" className="mt-5" onClick={() => setOpen(true)}>
          {messages.account.deleteAction}
        </Button>
      ) : (
        <div className="mt-5 space-y-4 border-t border-orange/20 pt-5">
          <Field label={messages.account.deleteConfirmLabel}>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          {error ? <p className="text-sm text-orange">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="danger" disabled={confirmation !== "DELETE" || pending} onClick={() => void deleteAccount()}>
              {pending ? messages.app.loading : messages.account.deleteConfirmAction}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { setOpen(false); setConfirmation(""); setError(null); }}>
              {messages.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
