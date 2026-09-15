"use client";

import Link from "next/link";
import { useState } from "react";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import { LEGAL_DOCUMENT_VERSION } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/useLocale";
import { Button, Card } from "@/components/ritual-ui";

export function LegalAcceptanceGate({ onAccepted }: { onAccepted: () => void }) {
  const { href, locale } = useLocale();
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
      setError(locale === "it" ? "Non è stato possibile registrare l’accettazione. Riprova." : "We could not record your acceptance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <Card className="mx-auto mt-[12vh] w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Ritual</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-bone">
          {locale === "it" ? "Prima di continuare" : "Before you continue"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-bone/68">
          {locale === "it"
            ? "Per usare Ritual come organizzatore o collaboratore, conferma i Termini di servizio e l’Accordo sul trattamento dei dati."
            : "To use Ritual as an organizer or collaborator, confirm the Terms of Service and the Data Processing Agreement."}
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-bone/10 bg-night/45 p-4 text-sm leading-6 text-bone/75">
          <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-[#6ef2c2]" />
          <span>
            {locale === "it" ? "Ho letto e accetto i " : "I have read and accept the "}
            <Link href={href("/terms")} target="_blank" className="text-mint underline underline-offset-2">{locale === "it" ? "Termini di servizio" : "Terms of Service"}</Link>
            {locale === "it" ? " e l’" : " and the "}
            <Link href={href("/data-processing")} target="_blank" className="text-mint underline underline-offset-2">{locale === "it" ? "Accordo sul trattamento dei dati" : "Data Processing Agreement"}</Link>
            .
          </span>
        </label>
        <p className="mt-3 text-xs text-bone/45">{locale === "it" ? "Versione" : "Version"} {LEGAL_DOCUMENT_VERSION}</p>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
        <Button type="button" className="mt-6 w-full" disabled={!checked || saving} onClick={() => void accept()}>
          {saving ? (locale === "it" ? "Salvataggio..." : "Saving...") : (locale === "it" ? "Accetta e continua" : "Accept and continue")}
        </Button>
      </Card>
    </main>
  );
}
