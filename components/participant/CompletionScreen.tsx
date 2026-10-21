"use client";

import { useLocale } from "@/lib/i18n/useLocale";

export function CompletionScreen({ hasReport = false }: { hasReport?: boolean }) {
  const { messages } = useLocale();
  const body = hasReport ? messages.participant.completionBody : messages.participant.completionBodyNoReport;

  return (
    <section className="max-w-xl">
      <h1 className="font-heading text-3xl font-semibold leading-tight text-bone sm:text-4xl">{messages.participant.completionTitle}</h1>
      <p className="mt-4 whitespace-pre-line text-base leading-7 text-bone/62">{body}</p>
    </section>
  );
}
