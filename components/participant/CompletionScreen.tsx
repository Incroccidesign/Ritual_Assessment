"use client";

import { Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function CompletionScreen() {
  const { messages } = useLocale();

  return (
    <Card>
      <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.participant.completionTitle}</h1>
      <p className="mt-4 text-base leading-7 text-bone/62">{messages.participant.completionBody}</p>
    </Card>
  );
}
