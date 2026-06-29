"use client";

import { RankedItem } from "@/types/activity";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function RankingContextPanel({ ranking }: { ranking: RankedItem[] }) {
  const { messages } = useLocale();
  if (!ranking.length) return null;

  return (
    <SubtlePanel>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">{messages.activities.framing.rankingContext}</p>
      <ol className="mt-4 space-y-2">
        {ranking.map((item) => (
          <li key={item.sourceItemId} className="flex gap-3 rounded-md border border-bone/10 bg-night/45 px-4 py-3">
            <span className="text-mint">{item.rank}.</span>
            <span className="text-bone/78">{item.label}</span>
          </li>
        ))}
      </ol>
    </SubtlePanel>
  );
}
