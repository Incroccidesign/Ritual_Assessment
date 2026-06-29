"use client";

import { Activity } from "@/types/activity";
import { Button, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function ActivityIntro({ activity, onStart }: { activity: Activity; onStart: () => void }) {
  const { messages } = useLocale();

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">{messages.participant.intro}</p>
      <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight text-bone">{activity.title}</h1>
      <p className="mt-5 text-xl leading-8 text-bone/76">{activity.prompt}</p>
      <Button type="button" className="mt-7 w-full min-h-14 text-base" onClick={onStart}>
        {messages.participant.startActivity}
      </Button>
    </Card>
  );
}
