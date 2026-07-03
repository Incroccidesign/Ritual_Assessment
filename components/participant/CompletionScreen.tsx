"use client";

import { Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function CompletionScreen({ hasReport = false }: { hasReport?: boolean }) {
  const { messages } = useLocale();
  const body = hasReport ? messages.participant.completionBody : messages.participant.completionBodyNoReport;

  return (
    <Card>
      <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.participant.completionTitle}</h1>
      <p className="mt-4 whitespace-pre-line text-base leading-7 text-bone/62">{body}</p>
    </Card>
  );
}
