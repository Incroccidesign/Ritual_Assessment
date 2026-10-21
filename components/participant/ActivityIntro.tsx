"use client";

import { Activity } from "@/types/activity";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function ActivityIntro({ activity, onStart }: { activity: Activity; onStart: () => void }) {
  const { messages } = useLocale();

  return (
    <section>
      <h1 className="max-w-[18ch] font-heading text-3xl font-semibold leading-[1.08] text-bone sm:text-4xl">{activity.title}</h1>
      <p className="mt-4 text-lg leading-7 text-bone/70">{activity.prompt}</p>
      <Button type="button" className="mt-7 w-full min-h-14 text-base" onClick={onStart}>
        {messages.participant.startActivity}
      </Button>
    </section>
  );
}
