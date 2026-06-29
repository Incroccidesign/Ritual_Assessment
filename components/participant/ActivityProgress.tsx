"use client";

import { ProgressRail } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function ActivityProgress({ current, total }: { current: number; total: number }) {
  const { messages } = useLocale();

  return (
    <div className="mb-5 space-y-2">
      <ProgressRail total={total} current={current} />
      <p className="text-sm text-bone/48">
        {messages.participant.progress.replace("{current}", String(current + 1)).replace("{total}", String(total))}
      </p>
    </div>
  );
}
