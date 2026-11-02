"use client";

import Link from "next/link";
import { useState } from "react";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import { LEGAL_DOCUMENT_VERSION } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/useLocale";
import { Button, Card } from "@/components/ritual-ui";

export function LegalAcceptanceGate({ onAccepted }: { onAccepted: () => void }) {
  const { href, messages } = useLocale();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!checked || saving) return;
    try {
      setSaving(true);
      setError(null);
      await recordLegalAcceptance();
      onAccepted();
    } catch {
      setError(messages.auth.acceptanceGateError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <Card className="mx-auto mt-[12vh] w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Ritual</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-bone">
          {messages.auth.acceptanceGateTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-bone/68">
          {messages.auth.acceptanceGateBody}
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-bone/10 bg-night/45 p-4 text-sm leading-6 text-bone/75">
          <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-[#6ef2c2]" />
          <span>
            {messages.auth.legalAcceptancePrefix}{" "}
            <Link href={href("/terms")} target="_blank" className="text-mint underline underline-offset-2">{messages.auth.terms}</Link>
            {" "}{messages.auth.legalAcceptanceJoin}{" "}
            <Link href={href("/data-processing")} target="_blank" className="text-mint underline underline-offset-2">{messages.auth.dataProcessingAgreement}</Link>
            .
          </span>
        </label>
        <p className="mt-3 text-xs text-bone/45">{messages.auth.acceptanceGateVersion} {LEGAL_DOCUMENT_VERSION}</p>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
        <Button type="button" className="mt-6 w-full" disabled={!checked || saving} onClick={() => void accept()}>
          {saving ? messages.auth.acceptanceGateSaving : messages.auth.acceptanceGateAction}
        </Button>
      </Card>
    </main>
  );
}
